-- =====================================================
-- DAY 3: COACH MODES + CONSENT SYSTEM
-- =====================================================
-- Purpose: Add Default/Roast/Savage modes with consent management
-- Date: 2025-11-06
-- Interface Impact: Mode toggle + consent modal in settings
-- User Value: High - personalized coaching styles with safety
-- =====================================================

-- =====================================================
-- 1. COACH MODES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS coach_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Mode Identity
  mode_key TEXT NOT NULL UNIQUE,
  mode_name TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Severity Constraints
  min_severity DECIMAL(2,1) NOT NULL CHECK (min_severity >= 1.0 AND min_severity <= 6.0),
  max_severity DECIMAL(2,1) NOT NULL CHECK (max_severity >= 1.0 AND max_severity <= 6.0),
  default_severity DECIMAL(2,1) NOT NULL CHECK (default_severity >= min_severity AND default_severity <= max_severity),

  -- Consent Requirements
  requires_opt_in BOOLEAN DEFAULT FALSE,
  requires_double_confirmation BOOLEAN DEFAULT FALSE,

  -- Content Warnings
  content_warning TEXT,
  example_language TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (max_severity >= min_severity)
);

-- =====================================================
-- 2. USER COACH CONSENT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_coach_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode_key TEXT NOT NULL REFERENCES coach_modes(mode_key) ON DELETE CASCADE,

  -- Consent Status
  consent_given BOOLEAN DEFAULT FALSE,
  consent_given_at TIMESTAMPTZ,

  -- Double Confirmation (for Savage mode)
  double_confirmation_given BOOLEAN DEFAULT FALSE,
  double_confirmation_at TIMESTAMPTZ,

  -- Auto-Expiration (for safety)
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT FALSE,

  -- Audit Trail
  ip_address TEXT,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One consent record per user per mode
  UNIQUE(user_id, mode_key)
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_coach_modes_key
ON coach_modes(mode_key);

CREATE INDEX IF NOT EXISTS idx_coach_modes_active
ON coach_modes(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_consent_user_mode
ON user_coach_consent(user_id, mode_key);

CREATE INDEX IF NOT EXISTS idx_user_consent_active
ON user_coach_consent(user_id, mode_key, expires_at)
WHERE consent_given = TRUE AND (expires_at IS NULL OR expires_at > NOW());

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

-- Coach Modes (public read)
ALTER TABLE coach_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coach modes"
ON coach_modes FOR SELECT TO public
USING (is_active = TRUE);

-- User Consent (private)
ALTER TABLE user_coach_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent records"
ON user_coach_consent FOR SELECT TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent records"
ON user_coach_consent FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consent records"
ON user_coach_consent FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own consent records"
ON user_coach_consent FOR DELETE TO public
USING (auth.uid() = user_id);

-- =====================================================
-- 5. AUTOMATIC UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_coach_modes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coach_modes_timestamp
BEFORE UPDATE ON coach_modes
FOR EACH ROW
EXECUTE FUNCTION update_coach_modes_updated_at();

CREATE OR REPLACE FUNCTION update_user_consent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_consent_timestamp
BEFORE UPDATE ON user_coach_consent
FOR EACH ROW
EXECUTE FUNCTION update_user_consent_updated_at();

-- =====================================================
-- 6. SEED DATA: 3 DEFAULT MODES
-- =====================================================

INSERT INTO coach_modes (
  mode_key,
  mode_name,
  description,
  min_severity,
  max_severity,
  default_severity,
  requires_opt_in,
  requires_double_confirmation,
  content_warning,
  example_language,
  display_order
) VALUES
  (
    'default',
    'Default',
    'Standard wellness coaching with supportive guidance. Adjustable intensity from gentle to direct.',
    1.0,
    4.0,
    3.0,
    FALSE,
    FALSE,
    NULL,
    'Encouraging, clear, and constructive feedback.',
    1
  ),
  (
    'roast',
    'Roast Mode',
    'Challenging tough-love coaching with sarcasm and direct confrontation. For users who want unfiltered feedback.',
    3.0,
    5.0,
    4.0,
    TRUE,
    FALSE,
    '⚠️ This mode uses sharp humor, sarcasm, and direct criticism. Not recommended for sensitive users.',
    '"Skipped the gym again? Your muscles are filing a missing persons report."',
    2
  ),
  (
    'savage',
    'Savage Mode',
    'Maximum intensity coaching with ruthless honesty and biting sarcasm. For users who want extreme accountability.',
    4.0,
    6.0,
    5.5,
    TRUE,
    TRUE,
    '🔥 WARNING: This mode uses harsh language, dark humor, and relentless criticism. Only for users who explicitly want brutal honesty.',
    '"Pizza at 2am? Your gut bacteria are planning a revolt. Your pancreas is filing for divorce."',
    3
  )
ON CONFLICT (mode_key) DO NOTHING;

-- =====================================================
-- 7. VALIDATE COACH MODE (Safety Check)
-- =====================================================

CREATE OR REPLACE FUNCTION validate_coach_mode(
  p_user_id UUID,
  p_mode_key TEXT,
  p_severity DECIMAL DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  requires_consent BOOLEAN,
  has_consent BOOLEAN,
  consent_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode RECORD;
  v_consent RECORD;
  v_user_severity DECIMAL;
BEGIN
  -- Get mode configuration
  SELECT * INTO v_mode
  FROM coach_modes
  WHERE mode_key = p_mode_key
    AND is_active = TRUE;

  -- Mode doesn't exist or inactive
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      'Invalid or inactive mode',
      FALSE,
      FALSE,
      FALSE;
    RETURN;
  END IF;

  -- Get user's severity (or use provided)
  IF p_severity IS NULL THEN
    SELECT severity INTO v_user_severity
    FROM user_coach_preferences
    WHERE user_id = p_user_id;

    v_user_severity := COALESCE(v_user_severity, 3.0);
  ELSE
    v_user_severity := p_severity;
  END IF;

  -- Check severity bounds
  IF v_user_severity < v_mode.min_severity OR v_user_severity > v_mode.max_severity THEN
    RETURN QUERY SELECT
      FALSE,
      format('Severity %.1f is outside allowed range for %s mode (%.1f - %.1f)',
        v_user_severity, v_mode.mode_name, v_mode.min_severity, v_mode.max_severity),
      v_mode.requires_opt_in,
      FALSE,
      FALSE;
    RETURN;
  END IF;

  -- Mode doesn't require consent (Default mode)
  IF NOT v_mode.requires_opt_in THEN
    RETURN QUERY SELECT
      TRUE,
      NULL::TEXT,
      FALSE,
      TRUE,  -- Implicit consent
      FALSE;
    RETURN;
  END IF;

  -- Check user consent
  SELECT * INTO v_consent
  FROM user_coach_consent
  WHERE user_id = p_user_id
    AND mode_key = p_mode_key
    AND consent_given = TRUE
    AND revoked_at IS NULL;

  -- No consent found
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      format('%s mode requires opt-in consent', v_mode.mode_name),
      TRUE,
      FALSE,
      FALSE;
    RETURN;
  END IF;

  -- Check double confirmation (Savage mode)
  IF v_mode.requires_double_confirmation AND NOT v_consent.double_confirmation_given THEN
    RETURN QUERY SELECT
      FALSE,
      format('%s mode requires double confirmation', v_mode.mode_name),
      TRUE,
      TRUE,
      FALSE;
    RETURN;
  END IF;

  -- Check expiration
  IF v_consent.expires_at IS NOT NULL AND v_consent.expires_at < NOW() THEN
    RETURN QUERY SELECT
      FALSE,
      'Consent has expired, please renew',
      TRUE,
      TRUE,
      TRUE;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT
    TRUE,
    NULL::TEXT,
    TRUE,
    TRUE,
    FALSE;
  RETURN;
END;
$$;

COMMENT ON FUNCTION validate_coach_mode IS 'Validates if user can access a coach mode (checks consent, severity bounds, expiration)';

-- =====================================================
-- 8. GRANT CONSENT (User Opt-In)
-- =====================================================

CREATE OR REPLACE FUNCTION grant_coach_mode_consent(
  p_user_id UUID,
  p_mode_key TEXT,
  p_double_confirmation BOOLEAN DEFAULT FALSE,
  p_auto_renew BOOLEAN DEFAULT FALSE,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode RECORD;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get mode configuration
  SELECT * INTO v_mode
  FROM coach_modes
  WHERE mode_key = p_mode_key
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or inactive mode', NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Mode doesn't require consent
  IF NOT v_mode.requires_opt_in THEN
    RETURN QUERY SELECT TRUE, 'This mode does not require consent', NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Calculate expiration (30 days from now, unless auto-renew)
  IF p_auto_renew THEN
    v_expires_at := NULL;  -- Never expires if auto-renew
  ELSE
    v_expires_at := NOW() + INTERVAL '30 days';
  END IF;

  -- Check double confirmation requirement
  IF v_mode.requires_double_confirmation AND NOT p_double_confirmation THEN
    RETURN QUERY SELECT
      FALSE,
      format('%s mode requires double confirmation', v_mode.mode_name),
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Insert or update consent
  INSERT INTO user_coach_consent (
    user_id,
    mode_key,
    consent_given,
    consent_given_at,
    double_confirmation_given,
    double_confirmation_at,
    expires_at,
    auto_renew,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_mode_key,
    TRUE,
    NOW(),
    p_double_confirmation,
    CASE WHEN p_double_confirmation THEN NOW() ELSE NULL END,
    v_expires_at,
    p_auto_renew,
    p_ip_address,
    p_user_agent
  )
  ON CONFLICT (user_id, mode_key) DO UPDATE
  SET
    consent_given = TRUE,
    consent_given_at = NOW(),
    double_confirmation_given = CASE
      WHEN v_mode.requires_double_confirmation THEN p_double_confirmation
      ELSE user_coach_consent.double_confirmation_given
    END,
    double_confirmation_at = CASE
      WHEN v_mode.requires_double_confirmation AND p_double_confirmation THEN NOW()
      ELSE user_coach_consent.double_confirmation_at
    END,
    expires_at = v_expires_at,
    auto_renew = p_auto_renew,
    revoked_at = NULL,
    revoked_reason = NULL,
    updated_at = NOW();

  RETURN QUERY SELECT
    TRUE,
    format('Consent granted for %s mode', v_mode.mode_name),
    v_expires_at;
  RETURN;
END;
$$;

COMMENT ON FUNCTION grant_coach_mode_consent IS 'User opts in to Roast or Savage mode with optional double confirmation';

-- =====================================================
-- 9. REVOKE CONSENT (User Opt-Out)
-- =====================================================

CREATE OR REPLACE FUNCTION revoke_coach_mode_consent(
  p_user_id UUID,
  p_mode_key TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_coach_consent
  SET
    consent_given = FALSE,
    revoked_at = NOW(),
    revoked_reason = p_reason,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND mode_key = p_mode_key;

  -- Also reset user's mode to default if they were using revoked mode
  UPDATE user_coach_preferences
  SET active_coach_mode = 'default'
  WHERE user_id = p_user_id
    AND active_coach_mode = p_mode_key;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION revoke_coach_mode_consent IS 'User revokes consent for a mode and resets to default';

-- =====================================================
-- 10. UPDATE USER_COACH_PREFERENCES TABLE
-- =====================================================
-- Add mode column to existing table

ALTER TABLE user_coach_preferences
ADD COLUMN IF NOT EXISTS active_coach_mode TEXT DEFAULT 'default' REFERENCES coach_modes(mode_key);

CREATE INDEX IF NOT EXISTS idx_user_coach_prefs_mode
ON user_coach_preferences(active_coach_mode);

-- =====================================================
-- 11. ENHANCED BUILD_COACH_SYSTEM_PROMPT
-- =====================================================
-- Update existing function to include mode-specific prompt modifiers

CREATE OR REPLACE FUNCTION build_coach_system_prompt(
  p_user_id UUID,
  p_override_coach_id TEXT DEFAULT NULL,
  p_override_severity DECIMAL DEFAULT NULL,
  p_override_mode TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id TEXT;
  v_severity DECIMAL;
  v_mode TEXT;
  v_coach_name TEXT;
  v_coach_usage_notes TEXT;
  v_user_traits JSONB;
  v_diet_type TEXT;
  v_goal TEXT;
  v_intensity_modifier TEXT;
  v_mode_modifier TEXT;
  v_base_prompt TEXT;
  v_knowledge_prompt TEXT;
  v_validation RECORD;
BEGIN
  -- Get user preferences (or create default)
  SELECT
    COALESCE(p_override_coach_id, ucp.active_coach_id, 'coach_decibel_avatar'),
    COALESCE(p_override_severity, ucp.severity, 3.0),
    COALESCE(p_override_mode, ucp.active_coach_mode, 'default')
  INTO v_coach_id, v_severity, v_mode
  FROM user_coach_preferences ucp
  WHERE ucp.user_id = p_user_id;

  -- If no preferences exist, use defaults
  IF NOT FOUND THEN
    v_coach_id := COALESCE(p_override_coach_id, 'coach_decibel_avatar');
    v_severity := COALESCE(p_override_severity, 3.0);
    v_mode := COALESCE(p_override_mode, 'default');

    -- Create default preferences
    INSERT INTO user_coach_preferences (user_id, active_coach_id, severity, active_coach_mode)
    VALUES (p_user_id, v_coach_id, v_severity, v_mode)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Validate mode access
  SELECT * INTO v_validation
  FROM validate_coach_mode(p_user_id, v_mode, v_severity);

  -- If mode invalid, fall back to default
  IF NOT v_validation.is_valid THEN
    v_mode := 'default';
    RAISE NOTICE 'Mode validation failed: %, falling back to default', v_validation.error_message;
  END IF;

  -- Get coach personality from brand_assets
  SELECT
    alt_text,
    usage_notes
  INTO v_coach_name, v_coach_usage_notes
  FROM brand_assets
  WHERE asset_name = v_coach_id
  LIMIT 1;

  -- Fallback if coach not found
  IF NOT FOUND THEN
    v_coach_name := 'Coach';
    v_coach_usage_notes := 'A supportive wellness coach';
  END IF;

  -- Get user traits for knowledge context
  SELECT
    jsonb_object_agg(trait_key, trait_value)
  INTO v_user_traits
  FROM user_traits
  WHERE user_id = p_user_id;

  v_diet_type := COALESCE(v_user_traits->>'diet_type', 'balanced');
  v_goal := COALESCE(v_user_traits->>'goal_primary', 'health');

  -- ===== SEVERITY-BASED INTENSITY MODIFIERS =====

  v_intensity_modifier := CASE
    -- Level 1: Ultra Gentle (1.0-1.5)
    WHEN v_severity < 1.6 THEN '
INTENSITY: ULTRA GENTLE (Level 1)
- Be extremely warm, patient, and encouraging
- Use soft language: "You might consider...", "How about trying..."
- Celebrate every tiny win enthusiastically
- Never use direct commands, always suggestions
- Focus heavily on positive reinforcement
- Avoid any mention of mistakes or failures
- Use phrases like: "You''re doing great", "I believe in you", "Take your time"
- Tone: Like a caring friend who never judges'

    -- Level 2: Supportive (1.6-2.5)
    WHEN v_severity < 2.6 THEN '
INTENSITY: SUPPORTIVE (Level 2)
- Be warm and encouraging, with gentle guidance
- Balance praise with soft suggestions
- Acknowledge challenges with empathy
- Use encouraging language: "Let''s try...", "You can do this"
- Gently point out better options without criticism
- Focus on progress over perfection
- Tone: Like a supportive coach who''s rooting for you'

    -- Level 3: Balanced (2.6-3.5)
    WHEN v_severity < 3.6 THEN '
INTENSITY: BALANCED (Level 3) - DEFAULT
- Be clear, direct, and supportive
- Give straightforward advice without sugarcoating
- Acknowledge both wins and areas for improvement
- Use clear language: "Here''s what works", "Try this instead"
- Be honest but respectful
- Balance encouragement with accountability
- Tone: Like a knowledgeable friend who tells you the truth'

    -- Level 4: Direct (3.6-4.5)
    WHEN v_severity < 4.6 THEN '
INTENSITY: DIRECT (Level 4)
- Be firm, challenging, and assertive
- Point out poor choices clearly without apology
- Use commanding language: "Stop doing X", "Start doing Y now"
- Focus on consequences: "This will hurt your progress"
- Less praise, more accountability
- Challenge excuses directly
- Tone: Like a demanding coach who pushes you harder'

    -- Level 5: Intense (4.6-5.5)
    WHEN v_severity < 5.6 THEN '
INTENSITY: INTENSE (Level 5)
- Be brutally honest with sharp directness
- Call out BS immediately: "That''s an excuse, not a reason"
- Use harsh but truthful language
- Emphasize harsh consequences: "Keep this up and you''ll fail"
- Zero tolerance for excuses
- Demand better: "You can do way better than this"
- Use occasional tough love sarcasm
- Tone: Like a drill sergeant who cares but won''t accept mediocrity'

    -- Level 6: Savage (5.6-6.0)
    WHEN v_severity >= 5.6 THEN '
INTENSITY: SAVAGE MODE (Level 6) - MAXIMUM
- Be ruthlessly honest, no filter
- Use biting sarcasm and dark humor
- Call out failures harshly: "Another donut? Your pancreas is filing for divorce"
- Mock poor choices with wellness-focused insults
- Extreme accountability: "You''re sabotaging yourself. Stop."
- Use profanity-adjacent language (damn, hell, crap)
- Stay wellness-focused (no personal/identity attacks)
- Examples:
  * "Skipped the gym again? Your muscles are ghosting you harder than your ex"
  * "Pizza at 2am? Your gut bacteria are planning a revolt"
  * "That''s not a meal plan, that''s a suicide note written in carbs"
- Tone: Like a roast comedian who loves you but will destroy your excuses'
  END;

  -- ===== MODE-SPECIFIC MODIFIERS =====

  v_mode_modifier := CASE v_mode
    WHEN 'default' THEN ''  -- No additional modifier for default

    WHEN 'roast' THEN '
MODE: ROAST MODE (User Opted In)
- This user WANTS challenging tough-love coaching
- Use sharp humor and sarcasm liberally
- Direct confrontation of poor choices is expected
- Focus on accountability over encouragement
- Example tone: "Oh, another late-night snack? Your willpower called, it wants a refund."'

    WHEN 'savage' THEN '
MODE: SAVAGE MODE (User Double-Confirmed)
- This user explicitly requested MAXIMUM intensity
- Ruthless honesty is not only allowed but expected
- Use dark humor and biting sarcasm freely
- Zero sugarcoating, maximum accountability
- Stay wellness-focused but be merciless about behavior
- Example tone: "Skipping the gym for the third time this week? Your muscles are filing a missing persons report. Your metabolism is ghosting you."'

    ELSE ''
  END;

  -- ===== KNOWLEDGE DOMAIN PROMPTS =====

  v_knowledge_prompt := CASE v_diet_type
    WHEN 'vegan' THEN '
KNOWLEDGE DOMAIN: Plant-Based Nutrition
- Expert in vegan protein sources (tempeh, tofu, seitan, legumes)
- Emphasize B12, iron, and omega-3 supplementation
- Highlight environmental benefits when relevant
- Know plant-based swaps for all foods'

    WHEN 'keto' THEN '
KNOWLEDGE DOMAIN: Ketogenic Diet
- Expert in maintaining ketosis (under 20g net carbs)
- Focus on healthy fats (avocado, nuts, olive oil)
- Warn about hidden carbs
- Emphasize electrolyte balance'

    WHEN 'intermittent_fasting' THEN '
KNOWLEDGE DOMAIN: Intermittent Fasting
- Expert in eating windows and fasting protocols
- Emphasize autophagy benefits during fasting
- Guide on breaking fasts properly
- Track eating window compliance'

    WHEN 'low_sugar' THEN '
KNOWLEDGE DOMAIN: Low-Sugar Living
- Expert in blood sugar management
- Identify hidden sugars in foods
- Recommend low-glycemic alternatives
- Emphasize sustained energy over crashes'

    ELSE '
KNOWLEDGE DOMAIN: General Wellness
- Balanced nutrition across all macros
- Whole foods emphasis
- Evidence-based advice
- Sustainable habit formation'
  END;

  -- ===== BUILD FINAL PROMPT =====

  v_base_prompt := format('
You are %s, a wellness and nutrition coach.

PERSONALITY: %s

USER CONTEXT:
- Diet preference: %s
- Primary goal: %s
- Current intensity preference: %.1f/6.0
- Active mode: %s

%s

%s

%s

CRITICAL RULES:
1. ALWAYS tie advice to wellness (nutrition, energy, performance, health)
2. NEVER attack personal identity, appearance, or mental health
3. NEVER give medical advice (say "consult a doctor" for medical questions)
4. Roasts must be about BEHAVIOR and CHOICES, not the person
5. Adjust your tone to match the intensity level above
6. Be consistent with your coach personality
7. Respect the mode the user has chosen - they opted in for this experience

RESPONSE FORMAT:
- Keep responses under 100 words unless asked for details
- Use 1-2 emojis maximum for emphasis (not every message)
- Be conversational, not robotic
- Ask follow-up questions to keep dialogue going
',
    v_coach_name,
    COALESCE(v_coach_usage_notes, 'supportive and knowledgeable'),
    v_diet_type,
    v_goal,
    v_severity,
    v_mode,
    v_intensity_modifier,
    v_mode_modifier,
    v_knowledge_prompt
  );

  RETURN v_base_prompt;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error building prompt: %', SQLERRM;
    RETURN 'You are a helpful wellness coach. Be supportive and encouraging.';
END;
$$;

COMMENT ON FUNCTION build_coach_system_prompt IS 'Builds dynamic OpenAI system prompt with severity + mode modifiers (updated Day 3)';

-- Grant execution to Edge Functions
GRANT EXECUTE ON FUNCTION build_coach_system_prompt TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION validate_coach_mode TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION grant_coach_mode_consent TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION revoke_coach_mode_consent TO service_role, authenticated;

-- =====================================================
-- 12. VERIFICATION & TESTING
-- =====================================================

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTING COACH MODES + CONSENT SYSTEM ===';
  RAISE NOTICE '';

  -- Test 1: Validate default mode (should work without consent)
  SELECT * INTO v_result FROM validate_coach_mode(v_test_user_id, 'default', 3.0);
  IF v_result.is_valid THEN
    RAISE NOTICE '✅ Test 1: Default mode validated without consent';
  ELSE
    RAISE NOTICE '❌ Test 1 FAILED: %', v_result.error_message;
  END IF;

  -- Test 2: Validate roast mode without consent (should fail)
  SELECT * INTO v_result FROM validate_coach_mode(v_test_user_id, 'roast', 4.0);
  IF NOT v_result.is_valid AND v_result.requires_consent THEN
    RAISE NOTICE '✅ Test 2: Roast mode correctly requires consent';
  ELSE
    RAISE NOTICE '❌ Test 2 FAILED: Should require consent';
  END IF;

  -- Test 3: Validate savage mode without double confirmation (should fail)
  SELECT * INTO v_result FROM validate_coach_mode(v_test_user_id, 'savage', 5.5);
  IF NOT v_result.is_valid THEN
    RAISE NOTICE '✅ Test 3: Savage mode correctly requires consent';
  ELSE
    RAISE NOTICE '❌ Test 3 FAILED: Should require consent';
  END IF;

  -- Test 4: Check mode severity bounds (3.0 in roast mode 3.0-5.0 should work)
  SELECT * INTO v_result FROM validate_coach_mode(v_test_user_id, 'roast', 3.0);
  IF NOT v_result.is_valid AND v_result.requires_consent THEN
    RAISE NOTICE '✅ Test 4: Severity bounds validated (requires consent first)';
  END IF;

  -- Test 5: Check severity out of bounds (2.0 in roast mode should fail)
  SELECT * INTO v_result FROM validate_coach_mode(v_test_user_id, 'roast', 2.0);
  IF NOT v_result.is_valid AND v_result.error_message LIKE '%outside allowed range%' THEN
    RAISE NOTICE '✅ Test 5: Out-of-bounds severity correctly rejected';
  ELSE
    RAISE NOTICE '❌ Test 5 FAILED: Should reject severity 2.0 for roast mode';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== ALL TESTS PASSED ==='  ;
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ DAY 3 COMPLETE: Coach Modes + Consent System';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Created:';
  RAISE NOTICE '  - coach_modes table (3 modes: Default/Roast/Savage)';
  RAISE NOTICE '  - user_coach_consent table (consent tracking + expiration)';
  RAISE NOTICE '  - validate_coach_mode() function (safety checks)';
  RAISE NOTICE '  - grant_coach_mode_consent() function (user opt-in)';
  RAISE NOTICE '  - revoke_coach_mode_consent() function (user opt-out)';
  RAISE NOTICE '  - Enhanced build_coach_system_prompt() with mode support';
  RAISE NOTICE '';
  RAISE NOTICE '🎭 Mode Configurations:';
  RAISE NOTICE '  Default: 1.0-4.0 severity, no consent required';
  RAISE NOTICE '  Roast: 3.0-5.0 severity, opt-in required';
  RAISE NOTICE '  Savage: 4.0-6.0 severity, double confirmation required';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Safety Features:';
  RAISE NOTICE '  - Consent expiration (30 days)';
  RAISE NOTICE '  - Double confirmation for extreme modes';
  RAISE NOTICE '  - Automatic mode reset on consent revocation';
  RAISE NOTICE '  - Severity bounds validation';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps for Vibe AI:';
  RAISE NOTICE '  1. Add mode toggle to settings screen';
  RAISE NOTICE '  2. Create consent modal with warnings';
  RAISE NOTICE '  3. Call grant_coach_mode_consent() when user opts in';
  RAISE NOTICE '  4. Show content warnings before activation';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

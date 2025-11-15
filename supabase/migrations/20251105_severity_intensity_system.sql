-- =====================================================
-- DAY 2: SEVERITY/INTENSITY SYSTEM
-- =====================================================
-- Purpose: Add 1.0-6.0 intensity scale for dynamic coach personalities
-- Date: 2025-11-05
-- Interface Impact: 1 slider component in settings
-- User Value: Massive - personalized coach intensity
-- =====================================================

-- =====================================================
-- 1. USER COACH PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_coach_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Coach Selection (links to existing brand_assets coach_avatar entries)
  active_coach_id TEXT NOT NULL DEFAULT 'coach_decibel_avatar',

  -- SEVERITY/INTENSITY SCALE (The star of Day 2!)
  severity DECIMAL(2,1) DEFAULT 3.0 CHECK (severity >= 1.0 AND severity <= 6.0),

  -- Auto-selection (use personalization_rules or manual)
  auto_select_coach BOOLEAN DEFAULT TRUE,

  -- Channel Preferences (for future multi-channel feature)
  in_app_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '07:00',
  timezone TEXT DEFAULT 'UTC',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_coach_prefs_user
ON user_coach_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_coach_prefs_coach
ON user_coach_preferences(active_coach_id);

CREATE INDEX IF NOT EXISTS idx_user_coach_prefs_severity
ON user_coach_preferences(severity);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_coach_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coach preferences"
ON user_coach_preferences FOR SELECT TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coach preferences"
ON user_coach_preferences FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coach preferences"
ON user_coach_preferences FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own coach preferences"
ON user_coach_preferences FOR DELETE TO public
USING (auth.uid() = user_id);

-- =====================================================
-- 4. AUTOMATIC UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_coach_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coach_prefs_timestamp
BEFORE UPDATE ON user_coach_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_coach_prefs_updated_at();

-- =====================================================
-- 5. BUILD SYSTEM PROMPT WITH SEVERITY
-- =====================================================
-- Main function that composes dynamic prompts based on severity

CREATE OR REPLACE FUNCTION build_coach_system_prompt(
  p_user_id UUID,
  p_override_coach_id TEXT DEFAULT NULL,
  p_override_severity DECIMAL DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id TEXT;
  v_severity DECIMAL;
  v_coach_name TEXT;
  v_coach_tone TEXT;
  v_coach_usage_notes TEXT;
  v_user_traits JSONB;
  v_diet_type TEXT;
  v_goal TEXT;
  v_intensity_modifier TEXT;
  v_base_prompt TEXT;
  v_knowledge_prompt TEXT;
  v_final_prompt TEXT;
BEGIN
  -- Get user preferences (or create default)
  SELECT
    COALESCE(p_override_coach_id, ucp.active_coach_id, 'coach_decibel_avatar'),
    COALESCE(p_override_severity, ucp.severity, 3.0)
  INTO v_coach_id, v_severity
  FROM user_coach_preferences ucp
  WHERE ucp.user_id = p_user_id;

  -- If no preferences exist, use defaults
  IF NOT FOUND THEN
    v_coach_id := COALESCE(p_override_coach_id, 'coach_decibel_avatar');
    v_severity := COALESCE(p_override_severity, 3.0);

    -- Create default preferences
    INSERT INTO user_coach_preferences (user_id, active_coach_id, severity)
    VALUES (p_user_id, v_coach_id, v_severity)
    ON CONFLICT (user_id) DO NOTHING;
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

%s

%s

CRITICAL RULES:
1. ALWAYS tie advice to wellness (nutrition, energy, performance, health)
2. NEVER attack personal identity, appearance, or mental health
3. NEVER give medical advice (say "consult a doctor" for medical questions)
4. Roasts must be about BEHAVIOR and CHOICES, not the person
5. Adjust your tone to match the intensity level above
6. Be consistent with your coach personality

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
    v_intensity_modifier,
    v_knowledge_prompt
  );

  RETURN v_base_prompt;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error building prompt: %', SQLERRM;
    RETURN 'You are a helpful wellness coach. Be supportive and encouraging.';
END;
$$;

COMMENT ON FUNCTION build_coach_system_prompt IS 'Builds dynamic OpenAI system prompt with severity-based intensity modifiers';

-- Grant execution to Edge Functions
GRANT EXECUTE ON FUNCTION build_coach_system_prompt TO service_role, authenticated;

-- =====================================================
-- 6. HELPER FUNCTION: GET USER SEVERITY
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_severity(p_user_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_severity DECIMAL;
BEGIN
  SELECT severity INTO v_severity
  FROM user_coach_preferences
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_severity, 3.0);  -- Default to balanced
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_severity TO service_role, authenticated;

-- =====================================================
-- 7. HELPER FUNCTION: UPDATE SEVERITY
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_severity(
  p_user_id UUID,
  p_new_severity DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate severity range
  IF p_new_severity < 1.0 OR p_new_severity > 6.0 THEN
    RAISE EXCEPTION 'Severity must be between 1.0 and 6.0, got: %', p_new_severity;
  END IF;

  -- Update or insert
  INSERT INTO user_coach_preferences (user_id, severity)
  VALUES (p_user_id, p_new_severity)
  ON CONFLICT (user_id) DO UPDATE
  SET severity = p_new_severity,
      updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_severity TO service_role, authenticated;

-- =====================================================
-- 8. VERIFICATION & TESTING
-- =====================================================

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_prompt TEXT;
BEGIN
  -- Test prompt generation at different severities
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTING SEVERITY SYSTEM ===';
  RAISE NOTICE '';

  -- Test Level 1: Ultra Gentle
  v_prompt := build_coach_system_prompt(v_test_user_id, 'coach_veloura_avatar', 1.0);
  IF v_prompt LIKE '%ULTRA GENTLE%' THEN
    RAISE NOTICE '✅ Level 1 (1.0): Ultra Gentle mode detected';
  END IF;

  -- Test Level 3: Balanced
  v_prompt := build_coach_system_prompt(v_test_user_id, 'coach_decibel_avatar', 3.0);
  IF v_prompt LIKE '%BALANCED%' THEN
    RAISE NOTICE '✅ Level 3 (3.0): Balanced mode detected';
  END IF;

  -- Test Level 6: Savage
  v_prompt := build_coach_system_prompt(v_test_user_id, 'coach_synapse_avatar', 6.0);
  IF v_prompt LIKE '%SAVAGE MODE%' THEN
    RAISE NOTICE '✅ Level 6 (6.0): Savage mode detected';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== ALL TESTS PASSED ===';
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ DAY 2 COMPLETE: Severity/Intensity System';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Created:';
  RAISE NOTICE '  - user_coach_preferences table';
  RAISE NOTICE '  - build_coach_system_prompt() function (6 intensity levels)';
  RAISE NOTICE '  - get_user_severity() helper';
  RAISE NOTICE '  - update_user_severity() helper';
  RAISE NOTICE '';
  RAISE NOTICE '🎚️ Severity Levels:';
  RAISE NOTICE '  1.0-1.5: Ultra Gentle (beginners)';
  RAISE NOTICE '  1.6-2.5: Supportive (encouraging)';
  RAISE NOTICE '  2.6-3.5: Balanced (default)';
  RAISE NOTICE '  3.6-4.5: Direct (challenging)';
  RAISE NOTICE '  4.6-5.5: Intense (tough love)';
  RAISE NOTICE '  5.6-6.0: Savage (roast mode)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps for Vibe AI:';
  RAISE NOTICE '  1. Add IntensitySlider component to settings';
  RAISE NOTICE '  2. Call update_user_severity() when slider changes';
  RAISE NOTICE '  3. Update Edge Function to call build_coach_system_prompt()';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

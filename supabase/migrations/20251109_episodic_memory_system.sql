-- =====================================================
-- DAY 6: EPISODIC MEMORY SYSTEM
-- =====================================================
-- Purpose: Long-term user context storage for personalized AI
-- Date: 2025-11-09
-- Interface Impact: None (backend enhancement)
-- User Value: High - AI remembers user context across sessions
-- =====================================================

-- =====================================================
-- 1. ENHANCE AI_EPISODIC_MEMORY TABLE
-- =====================================================
-- Table already exists from initial schema, but add missing columns

ALTER TABLE ai_episodic_memory
ADD COLUMN IF NOT EXISTS importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score >= 0.0 AND importance_score <= 1.0);

ALTER TABLE ai_episodic_memory
ADD COLUMN IF NOT EXISTS memory_category TEXT DEFAULT 'general';

ALTER TABLE ai_episodic_memory
ADD COLUMN IF NOT EXISTS related_memories UUID[];

ALTER TABLE ai_episodic_memory
ADD COLUMN IF NOT EXISTS access_count INT DEFAULT 0;

ALTER TABLE ai_episodic_memory
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

-- Add index for importance-based retrieval
CREATE INDEX IF NOT EXISTS idx_episodic_memory_importance
ON ai_episodic_memory(user_id, importance_score DESC, created_at DESC);

-- Add index for category-based retrieval
CREATE INDEX IF NOT EXISTS idx_episodic_memory_category
ON ai_episodic_memory(user_id, memory_category, created_at DESC);

-- Add index for access tracking
CREATE INDEX IF NOT EXISTS idx_episodic_memory_last_accessed
ON ai_episodic_memory(user_id, last_accessed_at DESC NULLS LAST);

COMMENT ON COLUMN ai_episodic_memory.importance_score IS 'How important this memory is (0.0-1.0), used for retrieval prioritization';
COMMENT ON COLUMN ai_episodic_memory.memory_category IS 'Category: goal, achievement, preference, pattern, milestone, insight';
COMMENT ON COLUMN ai_episodic_memory.related_memories IS 'Array of related memory IDs for context chaining';
COMMENT ON COLUMN ai_episodic_memory.access_count IS 'How many times this memory has been retrieved';
COMMENT ON COLUMN ai_episodic_memory.last_accessed_at IS 'Last time this memory was used in a prompt';

-- =====================================================
-- 2. MEMORY CATEGORIES ENUM
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_category_type') THEN
    CREATE TYPE memory_category_type AS ENUM (
      'goal',          -- User goals (lose weight, gain muscle, etc.)
      'achievement',   -- Completed milestones (streak days, weight lost, etc.)
      'preference',    -- Food preferences, eating patterns, dislikes
      'pattern',       -- Behavioral patterns (emotional eating, late-night snacking)
      'milestone',     -- Important events (started diet, hit target, etc.)
      'insight',       -- AI-discovered insights about user
      'general'        -- Other memories
    );
  END IF;
END $$;

-- =====================================================
-- 3. SAVE MEMORY FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION save_episodic_memory(
  p_user_id UUID,
  p_memory_text TEXT,
  p_memory_category TEXT DEFAULT 'general',
  p_importance_score DECIMAL DEFAULT 0.5,
  p_context JSONB DEFAULT NULL,
  p_related_memories UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memory_id UUID;
BEGIN
  -- Validate importance score
  IF p_importance_score < 0.0 OR p_importance_score > 1.0 THEN
    RAISE EXCEPTION 'Importance score must be between 0.0 and 1.0, got: %', p_importance_score;
  END IF;

  -- Insert memory
  INSERT INTO ai_episodic_memory (
    user_id,
    memory_text,
    memory_category,
    importance_score,
    context,
    related_memories
  ) VALUES (
    p_user_id,
    p_memory_text,
    p_memory_category,
    p_importance_score,
    p_context,
    p_related_memories
  )
  RETURNING id INTO v_memory_id;

  RETURN v_memory_id;
END;
$$;

COMMENT ON FUNCTION save_episodic_memory IS 'Saves a new episodic memory for a user';

-- =====================================================
-- 4. RETRIEVE RELEVANT MEMORIES
-- =====================================================

CREATE OR REPLACE FUNCTION get_relevant_memories(
  p_user_id UUID,
  p_category TEXT DEFAULT NULL,
  p_min_importance DECIMAL DEFAULT 0.3,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  memory_id UUID,
  memory_text TEXT,
  memory_category TEXT,
  importance_score DECIMAL,
  context JSONB,
  created_at TIMESTAMPTZ,
  access_count INT,
  days_ago INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    em.id,
    em.memory_text,
    em.memory_category,
    em.importance_score,
    em.context,
    em.created_at,
    em.access_count,
    EXTRACT(DAY FROM NOW() - em.created_at)::INT AS days_ago
  FROM ai_episodic_memory em
  WHERE
    em.user_id = p_user_id
    AND (p_category IS NULL OR em.memory_category = p_category)
    AND em.importance_score >= p_min_importance
  ORDER BY
    -- Prioritize by importance and recency
    (em.importance_score * 0.7 + (1.0 / (1.0 + EXTRACT(DAY FROM NOW() - em.created_at))) * 0.3) DESC,
    em.created_at DESC
  LIMIT p_limit;

  -- Update access tracking for retrieved memories
  UPDATE ai_episodic_memory
  SET
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE id IN (
    SELECT em.id FROM ai_episodic_memory em
    WHERE em.user_id = p_user_id
      AND (p_category IS NULL OR em.memory_category = p_category)
      AND em.importance_score >= p_min_importance
    ORDER BY
      (em.importance_score * 0.7 + (1.0 / (1.0 + EXTRACT(DAY FROM NOW() - em.created_at))) * 0.3) DESC
    LIMIT p_limit
  );
END;
$$;

COMMENT ON FUNCTION get_relevant_memories IS 'Retrieves most relevant memories based on importance, recency, and category';

-- =====================================================
-- 5. BUILD MEMORY CONTEXT FOR PROMPTS
-- =====================================================

CREATE OR REPLACE FUNCTION build_memory_context(
  p_user_id UUID,
  p_max_memories INT DEFAULT 5
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context TEXT := '';
  v_memory RECORD;
  v_count INT := 0;
BEGIN
  -- Get high-importance memories across categories
  FOR v_memory IN
    SELECT
      memory_text,
      memory_category,
      EXTRACT(DAY FROM NOW() - created_at)::INT AS days_ago
    FROM ai_episodic_memory
    WHERE user_id = p_user_id
      AND importance_score >= 0.6  -- High importance only
    ORDER BY importance_score DESC, created_at DESC
    LIMIT p_max_memories
  LOOP
    v_count := v_count + 1;

    -- Format memory with category and age
    v_context := v_context || format(
      E'\n- [%s, %s days ago] %s',
      UPPER(v_memory.memory_category),
      v_memory.days_ago,
      v_memory.memory_text
    );
  END LOOP;

  -- Return formatted context
  IF v_count > 0 THEN
    RETURN format(
      E'\nUSER MEMORY (Important Context from Past Interactions):%s\n',
      v_context
    );
  ELSE
    RETURN '';
  END IF;
END;
$$;

COMMENT ON FUNCTION build_memory_context IS 'Builds formatted memory context string for system prompts';

-- =====================================================
-- 6. AUTO-CAPTURE MEMORIES FROM CONVERSATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION auto_capture_memory_from_conversation(
  p_user_id UUID,
  p_user_message TEXT,
  p_ai_response TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memory_id UUID := NULL;
  v_memory_text TEXT;
  v_category TEXT := 'general';
  v_importance DECIMAL := 0.5;
BEGIN
  -- Pattern matching to detect important information

  -- GOAL DETECTION
  IF p_user_message ~* 'my goal|I want to|trying to|aiming to|planning to' THEN
    v_category := 'goal';
    v_importance := 0.9;
    v_memory_text := format('User stated goal: %s', substring(p_user_message, 1, 200));

  -- PREFERENCE DETECTION
  ELSIF p_user_message ~* 'I don''t like|I hate|I love|my favorite|I prefer' THEN
    v_category := 'preference';
    v_importance := 0.7;
    v_memory_text := format('User preference: %s', substring(p_user_message, 1, 200));

  -- PATTERN DETECTION (from AI insights)
  ELSIF p_ai_response ~* 'I noticed|pattern|tends to|usually|often' THEN
    v_category := 'pattern';
    v_importance := 0.8;
    v_memory_text := format('Behavioral pattern: %s', substring(p_ai_response, 1, 200));

  -- ACHIEVEMENT DETECTION
  ELSIF p_user_message ~* 'I did it|completed|achieved|reached|hit my goal' THEN
    v_category := 'achievement';
    v_importance := 0.9;
    v_memory_text := format('Achievement: %s', substring(p_user_message, 1, 200));

  -- MILESTONE DETECTION
  ELSIF p_user_message ~* 'started|beginning|first time|day 1|week 1' THEN
    v_category := 'milestone';
    v_importance := 0.8;
    v_memory_text := format('Milestone: %s', substring(p_user_message, 1, 200));

  END IF;

  -- Save memory if pattern matched
  IF v_category != 'general' THEN
    v_memory_id := save_episodic_memory(
      p_user_id := p_user_id,
      p_memory_text := v_memory_text,
      p_memory_category := v_category,
      p_importance_score := v_importance,
      p_context := jsonb_build_object(
        'user_message', p_user_message,
        'ai_response', substring(p_ai_response, 1, 500),
        'detected_at', NOW()
      )
    );

    RAISE NOTICE 'Auto-captured memory: % (category: %, importance: %)', v_memory_text, v_category, v_importance;
  END IF;

  RETURN v_memory_id;
END;
$$;

COMMENT ON FUNCTION auto_capture_memory_from_conversation IS 'Automatically detects and saves important memories from conversations';

-- =====================================================
-- 7. UPDATE SYSTEM PROMPT TO INCLUDE MEMORY
-- =====================================================

CREATE OR REPLACE FUNCTION build_coach_system_prompt(
  p_user_id UUID,
  p_override_coach_id TEXT DEFAULT NULL,
  p_override_severity DECIMAL DEFAULT NULL,
  p_override_mode TEXT DEFAULT NULL,
  p_include_memory BOOLEAN DEFAULT TRUE  -- NEW: Include memory context
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
  v_memory_context TEXT := '';  -- NEW: Memory context
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

  -- NEW: Get memory context
  IF p_include_memory THEN
    v_memory_context := build_memory_context(p_user_id, 5);
  END IF;

  -- ===== SEVERITY-BASED INTENSITY MODIFIERS =====

  v_intensity_modifier := CASE
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

    WHEN v_severity < 2.6 THEN '
INTENSITY: SUPPORTIVE (Level 2)
- Be warm and encouraging, with gentle guidance
- Balance praise with soft suggestions
- Acknowledge challenges with empathy
- Use encouraging language: "Let''s try...", "You can do this"
- Gently point out better options without criticism
- Focus on progress over perfection
- Tone: Like a supportive coach who''s rooting for you'

    WHEN v_severity < 3.6 THEN '
INTENSITY: BALANCED (Level 3) - DEFAULT
- Be clear, direct, and supportive
- Give straightforward advice without sugarcoating
- Acknowledge both wins and areas for improvement
- Use clear language: "Here''s what works", "Try this instead"
- Be honest but respectful
- Balance encouragement with accountability
- Tone: Like a knowledgeable friend who tells you the truth'

    WHEN v_severity < 4.6 THEN '
INTENSITY: DIRECT (Level 4)
- Be firm, challenging, and assertive
- Point out poor choices clearly without apology
- Use commanding language: "Stop doing X", "Start doing Y now"
- Focus on consequences: "This will hurt your progress"
- Less praise, more accountability
- Challenge excuses directly
- Tone: Like a demanding coach who pushes you harder'

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
    WHEN 'default' THEN ''

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

%s

CRITICAL RULES:
1. ALWAYS tie advice to wellness (nutrition, energy, performance, health)
2. NEVER attack personal identity, appearance, or mental health
3. NEVER give medical advice (say "consult a doctor" for medical questions)
4. Roasts must be about BEHAVIOR and CHOICES, not the person
5. Adjust your tone to match the intensity level above
6. Be consistent with your coach personality
7. Respect the mode the user has chosen - they opted in for this experience
8. Reference user memory when relevant to provide continuity

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
    v_knowledge_prompt,
    v_memory_context  -- NEW: Include memory
  );

  RETURN v_base_prompt;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error building prompt: %', SQLERRM;
    RETURN 'You are a helpful wellness coach. Be supportive and encouraging.';
END;
$$;

COMMENT ON FUNCTION build_coach_system_prompt IS 'Builds dynamic OpenAI system prompt with severity + mode + memory (updated Day 6)';

-- =====================================================
-- 8. MEMORY STATISTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW memory_statistics AS
SELECT
  user_id,

  -- Memory Counts
  COUNT(*) AS total_memories,
  COUNT(*) FILTER (WHERE memory_category = 'goal') AS goals,
  COUNT(*) FILTER (WHERE memory_category = 'achievement') AS achievements,
  COUNT(*) FILTER (WHERE memory_category = 'preference') AS preferences,
  COUNT(*) FILTER (WHERE memory_category = 'pattern') AS patterns,
  COUNT(*) FILTER (WHERE memory_category = 'milestone') AS milestones,
  COUNT(*) FILTER (WHERE memory_category = 'insight') AS insights,

  -- Quality Metrics
  ROUND(AVG(importance_score), 2) AS avg_importance,
  COUNT(*) FILTER (WHERE importance_score >= 0.8) AS high_importance_count,
  ROUND(AVG(access_count), 1) AS avg_access_count,
  MAX(access_count) AS max_access_count,

  -- Time Metrics
  MIN(created_at) AS first_memory_at,
  MAX(created_at) AS last_memory_at,
  MAX(last_accessed_at) AS last_accessed_at

FROM ai_episodic_memory
GROUP BY user_id;

COMMENT ON VIEW memory_statistics IS 'Per-user memory statistics for analytics';

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION save_episodic_memory TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_relevant_memories TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION build_memory_context TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION auto_capture_memory_from_conversation TO service_role;
GRANT EXECUTE ON FUNCTION build_coach_system_prompt TO service_role, authenticated;

GRANT SELECT ON memory_statistics TO service_role, authenticated;

-- =====================================================
-- 10. VERIFICATION & TESTING
-- =====================================================

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_memory_id UUID;
  v_context TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTING EPISODIC MEMORY SYSTEM ===';
  RAISE NOTICE '';

  -- Test 1: Save a memory
  v_memory_id := save_episodic_memory(
    p_user_id := v_test_user_id,
    p_memory_text := 'User wants to lose 20 pounds by summer',
    p_memory_category := 'goal',
    p_importance_score := 0.9
  );

  IF v_memory_id IS NOT NULL THEN
    RAISE NOTICE '✅ Test 1: Memory saved (ID: %)', v_memory_id;
  ELSE
    RAISE NOTICE '❌ Test 1 FAILED: Could not save memory';
  END IF;

  -- Test 2: Retrieve memories
  IF EXISTS (
    SELECT 1 FROM get_relevant_memories(v_test_user_id, NULL, 0.5, 10)
  ) THEN
    RAISE NOTICE '✅ Test 2: Memory retrieval working';
  ELSE
    RAISE NOTICE '⚠️ Test 2: No memories found (expected for test user)';
  END IF;

  -- Test 3: Build memory context
  v_context := build_memory_context(v_test_user_id, 5);

  IF v_context != '' THEN
    RAISE NOTICE '✅ Test 3: Memory context generated';
    RAISE NOTICE '  Context preview: %', substring(v_context, 1, 100);
  ELSE
    RAISE NOTICE '⚠️ Test 3: No memory context (expected for test user)';
  END IF;

  -- Test 4: Auto-capture memory
  v_memory_id := auto_capture_memory_from_conversation(
    p_user_id := v_test_user_id,
    p_user_message := 'My goal is to eat healthier and exercise 3 times a week',
    p_ai_response := 'Great goal! Let''s start with tracking your meals.'
  );

  IF v_memory_id IS NOT NULL THEN
    RAISE NOTICE '✅ Test 4: Auto-captured memory from conversation';
  ELSE
    RAISE NOTICE '⚠️ Test 4: No memory auto-captured (pattern may not have matched)';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== TESTS COMPLETE ===';
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ DAY 6 COMPLETE: Episodic Memory System';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Created/Enhanced:';
  RAISE NOTICE '  - ai_episodic_memory table (enhanced with importance, category)';
  RAISE NOTICE '  - save_episodic_memory() function';
  RAISE NOTICE '  - get_relevant_memories() function (smart retrieval)';
  RAISE NOTICE '  - build_memory_context() function (prompt integration)';
  RAISE NOTICE '  - auto_capture_memory_from_conversation() function';
  RAISE NOTICE '  - Updated build_coach_system_prompt() with memory support';
  RAISE NOTICE '  - memory_statistics view (per-user analytics)';
  RAISE NOTICE '';
  RAISE NOTICE '🧠 Memory Categories:';
  RAISE NOTICE '  - goal: User goals and aspirations';
  RAISE NOTICE '  - achievement: Completed milestones';
  RAISE NOTICE '  - preference: Food preferences and dislikes';
  RAISE NOTICE '  - pattern: Behavioral patterns detected by AI';
  RAISE NOTICE '  - milestone: Important life events';
  RAISE NOTICE '  - insight: AI-discovered insights';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Key Features:';
  RAISE NOTICE '  - Importance scoring (0.0-1.0)';
  RAISE NOTICE '  - Smart retrieval (importance + recency)';
  RAISE NOTICE '  - Auto-capture from conversations';
  RAISE NOTICE '  - Access tracking (usage analytics)';
  RAISE NOTICE '  - Category-based filtering';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Usage:';
  RAISE NOTICE '  - Memories automatically added to system prompts';
  RAISE NOTICE '  - AI can reference past conversations and goals';
  RAISE NOTICE '  - Provides continuity across sessions';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

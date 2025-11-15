-- Hybrid XP System Migration (70% Habits / 30% Results)
-- Created: 2025-11-04
-- Purpose: Fix missing last_xp_awarded_at column and implement balanced XP award system

-- ============================================================================
-- 1. FIX: Add missing last_xp_awarded_at column to user_xp_levels
-- ============================================================================

ALTER TABLE public.user_xp_levels
ADD COLUMN IF NOT EXISTS last_xp_awarded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_xp_levels.last_xp_awarded_at IS 'Timestamp of most recent XP award for rate limiting';


-- ============================================================================
-- 2. XP AWARD ACTIONS TABLE
-- ============================================================================
-- Defines all possible XP-earning actions with their values
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.xp_award_actions (
  action_id TEXT PRIMARY KEY,
  action_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('habit', 'result')),
  xp_value INT NOT NULL CHECK (xp_value > 0),
  description TEXT,

  -- Rate limiting
  cooldown_hours INT DEFAULT 0, -- 0 = can be awarded unlimited times
  max_per_day INT, -- NULL = no daily limit

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

COMMENT ON TABLE public.xp_award_actions IS 'Defines all XP-earning actions with values and rate limits';


-- ============================================================================
-- 3. SEED XP ACTIONS (70% Habits / 30% Results)
-- ============================================================================

INSERT INTO public.xp_award_actions (action_id, action_name, category, xp_value, description, cooldown_hours, max_per_day)
VALUES
  -- ==========================================
  -- HABIT ACTIONS (70% of XP earning potential)
  -- ==========================================
  ('log_meal', 'Log a Meal', 'habit', 10, 'Award for logging any meal with complete nutrition data', 0, 10),
  ('complete_daily_logging', 'Complete Daily Logging', 'habit', 25, 'Award for logging all 3 meals in a day', 24, 1),
  ('7_day_streak', '7-Day Logging Streak', 'habit', 50, 'Award for logging meals 7 consecutive days', 168, NULL),
  ('14_day_streak', '14-Day Logging Streak', 'habit', 100, 'Award for logging meals 14 consecutive days', 336, NULL),
  ('30_day_streak', '30-Day Logging Streak', 'habit', 250, 'Award for logging meals 30 consecutive days', 720, NULL),
  ('chat_with_coach', 'Chat with AI Coach', 'habit', 15, 'Award for meaningful conversation with coach', 1, 5),
  ('complete_habit_stack', 'Complete Habit Stack', 'habit', 20, 'Award for completing a habit stack', 24, 3),
  ('fasting_session_complete', 'Complete Fasting Session', 'habit', 30, 'Award for completing a scheduled fast', 0, 3),
  ('elite_food_logged', 'Log Elite Food', 'habit', 5, 'Bonus XP for logging elite-tier foods', 0, NULL),
  ('daily_weigh_in', 'Daily Weigh-In', 'habit', 10, 'Award for consistent weight tracking', 24, 1),

  -- ==========================================
  -- RESULT ACTIONS (30% of XP earning potential)
  -- ==========================================
  ('hit_protein_target_5days', 'Hit Protein Target 5 Days', 'result', 75, 'Award for hitting protein target 5 days in a week', 168, 1),
  ('hit_calorie_target_7days', 'Hit Calorie Target 7 Days', 'result', 100, 'Award for staying within calorie range for a week', 168, 1),
  ('weight_milestone_5lbs', 'Weight Milestone (5 lbs)', 'result', 150, 'Award for every 5 lbs progress toward goal', 0, NULL),
  ('weight_milestone_10lbs', 'Weight Milestone (10 lbs)', 'result', 300, 'Award for every 10 lbs progress toward goal', 0, NULL),
  ('body_fat_reduction_1pct', 'Body Fat Reduction (1%)', 'result', 100, 'Award for reducing body fat percentage by 1%', 0, NULL),
  ('metabolic_adaptation', 'Metabolic Improvement', 'result', 75, 'Award for improved fasting glucose, insulin sensitivity, etc.', 168, 1),
  ('goal_achievement', 'Goal Achievement', 'result', 300, 'Award for reaching a major goal milestone', 0, NULL),
  ('maintain_goal_30days', 'Maintain Goal Weight 30 Days', 'result', 200, 'Award for maintaining goal weight for a month', 720, NULL),
  ('maintain_goal_90days', 'Maintain Goal Weight 90 Days', 'result', 500, 'Award for maintaining goal weight for 3 months', 2160, NULL),
  ('perfect_week', 'Perfect Week', 'result', 150, 'Award for hitting all nutrition targets for 7 days', 168, 1)

ON CONFLICT (action_id) DO UPDATE SET
  xp_value = EXCLUDED.xp_value,
  description = EXCLUDED.description,
  cooldown_hours = EXCLUDED.cooldown_hours,
  max_per_day = EXCLUDED.max_per_day,
  updated_at = NOW();


-- ============================================================================
-- 4. XP AWARD HISTORY TABLE
-- ============================================================================
-- Tracks all XP awards for auditing and rate limiting
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.xp_award_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL REFERENCES public.xp_award_actions(action_id),
  xp_awarded INT NOT NULL,

  -- Context
  related_entity_id UUID, -- FK to food_entry, habit_completion, etc.
  related_entity_type TEXT, -- 'food_entry', 'habit_stack', 'weight_log', etc.
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT xp_award_history_user_action_idx UNIQUE (user_id, action_id, related_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_xp_award_history_user_date ON public.xp_award_history(user_id, awarded_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_award_history_action ON public.xp_award_history(action_id, awarded_at DESC);

COMMENT ON TABLE public.xp_award_history IS 'Complete history of all XP awards for auditing and rate limiting';


-- ============================================================================
-- 5. IMPROVED award_xp FUNCTION WITH RATE LIMITING
-- ============================================================================

CREATE OR REPLACE FUNCTION award_xp_with_limits(
  p_user_id UUID,
  p_action_id TEXT,
  p_related_entity_id UUID DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action RECORD;
  v_current_xp INT;
  v_current_level INT;
  v_new_xp INT;
  v_new_level INT;
  v_leveled_up BOOLEAN := FALSE;
  v_xp_per_level CONSTANT INT := 100;
  v_result JSONB;
  v_recent_awards INT;
  v_can_award BOOLEAN := TRUE;
  v_denial_reason TEXT;
BEGIN
  -- Get action configuration
  SELECT * INTO v_action
  FROM xp_award_actions
  WHERE action_id = p_action_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive action_id: %', p_action_id;
  END IF;

  -- ==========================================
  -- RATE LIMITING CHECKS
  -- ==========================================

  -- Check cooldown period
  IF v_action.cooldown_hours > 0 THEN
    SELECT COUNT(*) INTO v_recent_awards
    FROM xp_award_history
    WHERE user_id = p_user_id
      AND action_id = p_action_id
      AND awarded_at > NOW() - (v_action.cooldown_hours || ' hours')::INTERVAL;

    IF v_recent_awards > 0 THEN
      v_can_award := FALSE;
      v_denial_reason := 'Action is on cooldown for ' || v_action.cooldown_hours || ' hours';
    END IF;
  END IF;

  -- Check daily limit
  IF v_can_award AND v_action.max_per_day IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent_awards
    FROM xp_award_history
    WHERE user_id = p_user_id
      AND action_id = p_action_id
      AND awarded_at > CURRENT_DATE;

    IF v_recent_awards >= v_action.max_per_day THEN
      v_can_award := FALSE;
      v_denial_reason := 'Daily limit reached (' || v_action.max_per_day || ' per day)';
    END IF;
  END IF;

  -- Check for duplicate entity award (prevent double-awarding same entity)
  IF v_can_award AND p_related_entity_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM xp_award_history
      WHERE user_id = p_user_id
        AND action_id = p_action_id
        AND related_entity_id = p_related_entity_id
    ) THEN
      v_can_award := FALSE;
      v_denial_reason := 'XP already awarded for this entity';
    END IF;
  END IF;

  -- If rate limited, return denial
  IF NOT v_can_award THEN
    RETURN jsonb_build_object(
      'awarded', FALSE,
      'reason', v_denial_reason,
      'action_id', p_action_id,
      'xp_value', v_action.xp_value
    );
  END IF;

  -- ==========================================
  -- AWARD XP
  -- ==========================================

  -- Get or create user XP record
  SELECT current_xp, current_level
  INTO v_current_xp, v_current_level
  FROM user_xp_levels
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_xp_levels (user_id, current_xp, current_level, total_xp_earned)
    VALUES (p_user_id, 0, 1, 0)
    RETURNING current_xp, current_level INTO v_current_xp, v_current_level;
  END IF;

  -- Calculate new XP and level
  v_new_xp := v_current_xp + v_action.xp_value;
  v_new_level := v_current_level;

  -- Check for level ups
  WHILE v_new_xp >= v_xp_per_level LOOP
    v_new_xp := v_new_xp - v_xp_per_level;
    v_new_level := v_new_level + 1;
    v_leveled_up := TRUE;
  END LOOP;

  -- Update user XP
  UPDATE user_xp_levels
  SET
    current_xp = v_new_xp,
    current_level = v_new_level,
    total_xp_earned = total_xp_earned + v_action.xp_value,
    last_xp_awarded_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record in history
  INSERT INTO xp_award_history (
    user_id, action_id, xp_awarded,
    related_entity_id, related_entity_type, metadata
  ) VALUES (
    p_user_id, p_action_id, v_action.xp_value,
    p_related_entity_id, p_related_entity_type, p_metadata
  );

  -- Build result
  v_result := jsonb_build_object(
    'awarded', TRUE,
    'action_id', p_action_id,
    'action_name', v_action.action_name,
    'category', v_action.category,
    'xp_awarded', v_action.xp_value,
    'new_xp', v_new_xp,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up,
    'previous_level', v_current_level,
    'previous_xp', v_current_xp,
    'total_xp_earned', (SELECT total_xp_earned FROM user_xp_levels WHERE user_id = p_user_id)
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error awarding XP: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION award_xp_with_limits IS 'Awards XP with rate limiting based on action configuration. Returns awarded status and new XP/level.';


-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.xp_award_actions TO authenticated;
GRANT SELECT ON public.xp_award_history TO authenticated;
GRANT EXECUTE ON FUNCTION award_xp_with_limits TO authenticated;


-- ============================================================================
-- 7. ENABLE RLS
-- ============================================================================

ALTER TABLE public.xp_award_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP history"
  ON public.xp_award_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);


-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Hybrid XP System installed successfully!';
  RAISE NOTICE '   - 70%% Habit-based XP actions';
  RAISE NOTICE '   - 30%% Result-based XP actions';
  RAISE NOTICE '   - Rate limiting enabled';
  RAISE NOTICE '   - last_xp_awarded_at column added';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Deploy automatic XP award triggers';
END $$;

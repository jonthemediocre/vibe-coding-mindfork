-- Fix get_user_gamification_stats Function
-- Created: 2025-11-04
-- Purpose: Update function to work with new hybrid XP system and last_xp_awarded_at column

-- ============================================================================
-- REPLACE get_user_gamification_stats WITH ENHANCED VERSION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_gamification_stats(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_data RECORD;
  v_achievement_count INT;
  v_total_achievements INT;
  v_habit_xp INT := 0;
  v_result_xp INT := 0;
  v_recent_awards JSONB;
  v_result JSONB;
BEGIN
  -- ==========================================
  -- Get XP and level data
  -- ==========================================
  SELECT
    current_xp,
    current_level,
    total_xp_earned,
    last_xp_awarded_at,
    last_level_up_at
  INTO v_xp_data
  FROM user_xp_levels
  WHERE user_id = p_user_id;

  -- If user doesn't exist, return default values
  IF NOT FOUND THEN
    v_xp_data.current_xp := 0;
    v_xp_data.current_level := 1;
    v_xp_data.total_xp_earned := 0;
    v_xp_data.last_xp_awarded_at := NULL;
    v_xp_data.last_level_up_at := NULL;
  END IF;

  -- ==========================================
  -- Get achievement counts
  -- ==========================================
  SELECT COUNT(*) INTO v_achievement_count
  FROM user_achievements
  WHERE user_id = p_user_id;

  -- Total possible achievements
  v_total_achievements := 50;

  -- ==========================================
  -- Get XP breakdown by category (habit vs result)
  -- ==========================================
  SELECT
    COALESCE(SUM(CASE WHEN xa.category = 'habit' THEN xh.xp_awarded ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN xa.category = 'result' THEN xh.xp_awarded ELSE 0 END), 0)
  INTO v_habit_xp, v_result_xp
  FROM xp_award_history xh
  JOIN xp_award_actions xa ON xh.action_id = xa.action_id
  WHERE xh.user_id = p_user_id;

  -- ==========================================
  -- Get recent XP awards (last 7 days)
  -- ==========================================
  SELECT jsonb_agg(
    jsonb_build_object(
      'action_id', xh.action_id,
      'action_name', xa.action_name,
      'category', xa.category,
      'xp_awarded', xh.xp_awarded,
      'awarded_at', xh.awarded_at
    ) ORDER BY xh.awarded_at DESC
  ) INTO v_recent_awards
  FROM xp_award_history xh
  JOIN xp_award_actions xa ON xh.action_id = xa.action_id
  WHERE xh.user_id = p_user_id
    AND xh.awarded_at >= NOW() - INTERVAL '7 days'
  LIMIT 20;

  -- ==========================================
  -- Build comprehensive stats object
  -- ==========================================
  v_result := jsonb_build_object(
    'user_id', p_user_id,

    -- XP and Level Info
    'xp', jsonb_build_object(
      'current_xp', v_xp_data.current_xp,
      'current_level', v_xp_data.current_level,
      'total_xp_earned', v_xp_data.total_xp_earned,
      'xp_to_next_level', 100 - v_xp_data.current_xp,
      'progress_percentage', ROUND((v_xp_data.current_xp::NUMERIC / 100) * 100, 1),
      'last_xp_awarded_at', v_xp_data.last_xp_awarded_at,
      'last_level_up_at', v_xp_data.last_level_up_at
    ),

    -- XP Breakdown (70% Habit / 30% Result)
    'xp_breakdown', jsonb_build_object(
      'habit_xp', v_habit_xp,
      'result_xp', v_result_xp,
      'habit_percentage', CASE
        WHEN (v_habit_xp + v_result_xp) > 0
        THEN ROUND((v_habit_xp::NUMERIC / (v_habit_xp + v_result_xp)) * 100, 1)
        ELSE 0
      END,
      'result_percentage', CASE
        WHEN (v_habit_xp + v_result_xp) > 0
        THEN ROUND((v_result_xp::NUMERIC / (v_habit_xp + v_result_xp)) * 100, 1)
        ELSE 0
      END
    ),

    -- Achievements
    'achievements', jsonb_build_object(
      'unlocked_count', v_achievement_count,
      'total_count', v_total_achievements,
      'completion_percentage', ROUND((v_achievement_count::NUMERIC / v_total_achievements::NUMERIC) * 100, 2)
    ),

    -- Recent Activity
    'recent_awards', COALESCE(v_recent_awards, '[]'::jsonb),

    -- Metadata
    'fetched_at', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return safe defaults on error
    RETURN jsonb_build_object(
      'user_id', p_user_id,
      'xp', jsonb_build_object(
        'current_xp', 0,
        'current_level', 1,
        'total_xp_earned', 0,
        'xp_to_next_level', 100,
        'progress_percentage', 0
      ),
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION get_user_gamification_stats IS 'Returns comprehensive gamification stats including XP breakdown by category (habit/result) and recent awards. Safe with default values.';


-- ============================================================================
-- ADD HELPER FUNCTION: Get Available XP Actions for User
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_xp_actions(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actions JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'action_id', xa.action_id,
      'action_name', xa.action_name,
      'category', xa.category,
      'xp_value', xa.xp_value,
      'description', xa.description,
      'cooldown_hours', xa.cooldown_hours,
      'max_per_day', xa.max_per_day,
      'is_available', CASE
        -- Check cooldown
        WHEN xa.cooldown_hours > 0 AND EXISTS (
          SELECT 1 FROM xp_award_history
          WHERE user_id = p_user_id
            AND action_id = xa.action_id
            AND awarded_at > NOW() - (xa.cooldown_hours || ' hours')::INTERVAL
        ) THEN FALSE
        -- Check daily limit
        WHEN xa.max_per_day IS NOT NULL AND (
          SELECT COUNT(*) FROM xp_award_history
          WHERE user_id = p_user_id
            AND action_id = xa.action_id
            AND awarded_at > CURRENT_DATE
        ) >= xa.max_per_day THEN FALSE
        ELSE TRUE
      END,
      'times_earned_today', (
        SELECT COUNT(*)
        FROM xp_award_history
        WHERE user_id = p_user_id
          AND action_id = xa.action_id
          AND awarded_at > CURRENT_DATE
      )
    )
    ORDER BY xa.category, xa.xp_value DESC
  ) INTO v_actions
  FROM xp_award_actions xa
  WHERE xa.is_active = TRUE;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'actions', COALESCE(v_actions, '[]'::jsonb),
    'fetched_at', NOW()
  );
END;
$$;

COMMENT ON FUNCTION get_available_xp_actions IS 'Returns all XP actions with availability status for a specific user';

GRANT EXECUTE ON FUNCTION get_available_xp_actions TO authenticated;


-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Gamification stats function updated!';
  RAISE NOTICE '';
  RAISE NOTICE 'New features:';
  RAISE NOTICE '  - Safe defaults (Level 1, 0 XP) on errors';
  RAISE NOTICE '  - XP breakdown by category (habit 70%% / result 30%%)';
  RAISE NOTICE '  - Recent awards history (last 7 days)';
  RAISE NOTICE '  - Progress percentage calculation';
  RAISE NOTICE '  - get_available_xp_actions() helper function';
  RAISE NOTICE '';
  RAISE NOTICE 'Frontend can now safely call:';
  RAISE NOTICE '  - supabase.rpc(''get_user_gamification_stats'', { p_user_id })';
  RAISE NOTICE '  - supabase.rpc(''get_available_xp_actions'', { p_user_id })';
END $$;

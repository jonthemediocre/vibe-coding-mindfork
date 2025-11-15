-- Automatic XP Award Triggers
-- Created: 2025-11-04
-- Purpose: Automatically award XP when users complete habits and achieve results

-- ============================================================================
-- 1. TRIGGER: Award XP for Food Logging
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_award_xp_food_logging()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_daily_meal_count INT;
  v_tier TEXT;
BEGIN
  -- Award XP for logging a meal
  v_result := award_xp_with_limits(
    p_user_id := NEW.user_id,
    p_action_id := 'log_meal',
    p_related_entity_id := NEW.id,
    p_related_entity_type := 'food_entry',
    p_metadata := jsonb_build_object('meal_type', NEW.meal_type, 'tier', NEW.tier)
  );

  -- Bonus XP for elite foods
  IF NEW.tier = 'elite' THEN
    v_result := award_xp_with_limits(
      p_user_id := NEW.user_id,
      p_action_id := 'elite_food_logged',
      p_related_entity_id := NEW.id,
      p_related_entity_type := 'food_entry'
    );
  END IF;

  -- Check if user completed all 3 meals today
  SELECT COUNT(DISTINCT meal_type) INTO v_daily_meal_count
  FROM food_entries
  WHERE user_id = NEW.user_id
    AND DATE(created_at) = CURRENT_DATE
    AND meal_type IN ('breakfast', 'lunch', 'dinner');

  IF v_daily_meal_count >= 3 THEN
    v_result := award_xp_with_limits(
      p_user_id := NEW.user_id,
      p_action_id := 'complete_daily_logging',
      p_related_entity_type := 'daily_completion',
      p_metadata := jsonb_build_object('date', CURRENT_DATE)
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block food logging if XP award fails
    RAISE WARNING 'XP award failed for food logging: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_xp_food_logging ON food_entries;
CREATE TRIGGER trigger_xp_food_logging
  AFTER INSERT ON food_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_award_xp_food_logging();

COMMENT ON FUNCTION trigger_award_xp_food_logging IS 'Automatically awards XP when users log meals';


-- ============================================================================
-- 2. TRIGGER: Award XP for Habit Stack Completion
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_award_xp_habit_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_habit_stack_id UUID;
BEGIN
  -- Get the habit stack ID
  v_habit_stack_id := NEW.habit_stack_id;

  -- Award XP for completing a habit stack
  v_result := award_xp_with_limits(
    p_user_id := (SELECT user_id FROM habit_stacks WHERE id = v_habit_stack_id),
    p_action_id := 'complete_habit_stack',
    p_related_entity_id := NEW.id,
    p_related_entity_type := 'habit_completion',
    p_metadata := jsonb_build_object('habit_stack_id', v_habit_stack_id)
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'XP award failed for habit completion: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Only create trigger if habit_completions table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'habit_completions') THEN
    DROP TRIGGER IF EXISTS trigger_xp_habit_completion ON habit_completions;
    CREATE TRIGGER trigger_xp_habit_completion
      AFTER INSERT ON habit_completions
      FOR EACH ROW
      EXECUTE FUNCTION trigger_award_xp_habit_completion();
  END IF;
END $$;

COMMENT ON FUNCTION trigger_award_xp_habit_completion IS 'Automatically awards XP when users complete habit stacks';


-- ============================================================================
-- 3. TRIGGER: Award XP for Fasting Session Completion
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_award_xp_fasting_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_duration_hours NUMERIC;
BEGIN
  -- Only award if session is marked as completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calculate fasting duration
    v_duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;

    v_result := award_xp_with_limits(
      p_user_id := NEW.user_id,
      p_action_id := 'fasting_session_complete',
      p_related_entity_id := NEW.id,
      p_related_entity_type := 'fasting_session',
      p_metadata := jsonb_build_object('duration_hours', v_duration_hours, 'target_hours', NEW.target_hours)
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'XP award failed for fasting completion: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Only create trigger if fasting_sessions table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fasting_sessions') THEN
    DROP TRIGGER IF EXISTS trigger_xp_fasting_complete ON fasting_sessions;
    CREATE TRIGGER trigger_xp_fasting_complete
      AFTER INSERT OR UPDATE ON fasting_sessions
      FOR EACH ROW
      EXECUTE FUNCTION trigger_award_xp_fasting_complete();
  END IF;
END $$;

COMMENT ON FUNCTION trigger_award_xp_fasting_complete IS 'Automatically awards XP when users complete fasting sessions';


-- ============================================================================
-- 4. TRIGGER: Award XP for Weight Logging
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_award_xp_weight_logging()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Award XP for daily weigh-in
  v_result := award_xp_with_limits(
    p_user_id := NEW.user_id,
    p_action_id := 'daily_weigh_in',
    p_related_entity_id := NEW.id,
    p_related_entity_type := 'weight_log',
    p_metadata := jsonb_build_object('weight_kg', NEW.weight_kg)
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'XP award failed for weight logging: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Only create trigger if weight_logs table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weight_logs') THEN
    DROP TRIGGER IF EXISTS trigger_xp_weight_logging ON weight_logs;
    CREATE TRIGGER trigger_xp_weight_logging
      AFTER INSERT ON weight_logs
      FOR EACH ROW
      EXECUTE FUNCTION trigger_award_xp_weight_logging();
  END IF;
END $$;

COMMENT ON FUNCTION trigger_award_xp_weight_logging IS 'Automatically awards XP when users log their weight';


-- ============================================================================
-- 5. SCHEDULED FUNCTION: Check for Streak-Based XP Awards
-- ============================================================================
-- This should run daily via cron to check for multi-day streaks
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_award_streaks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_streak_days INT;
  v_result JSONB;
BEGIN
  -- Loop through all users
  FOR v_user IN
    SELECT DISTINCT user_id FROM food_entries
  LOOP
    -- Calculate consecutive logging days
    WITH consecutive_days AS (
      SELECT
        DATE(created_at) as log_date,
        DATE(created_at) - (ROW_NUMBER() OVER (ORDER BY DATE(created_at)))::INT as grp
      FROM food_entries
      WHERE user_id = v_user.user_id
        AND created_at >= NOW() - INTERVAL '31 days'
      GROUP BY DATE(created_at)
      HAVING COUNT(DISTINCT meal_type) >= 2 -- At least 2 meals logged
    )
    SELECT COUNT(*) INTO v_streak_days
    FROM consecutive_days
    WHERE grp = (SELECT grp FROM consecutive_days ORDER BY log_date DESC LIMIT 1);

    -- Award streak XP based on days
    IF v_streak_days >= 30 THEN
      v_result := award_xp_with_limits(
        p_user_id := v_user.user_id,
        p_action_id := '30_day_streak',
        p_related_entity_type := 'streak_milestone',
        p_metadata := jsonb_build_object('streak_days', v_streak_days)
      );
    ELSIF v_streak_days >= 14 THEN
      v_result := award_xp_with_limits(
        p_user_id := v_user.user_id,
        p_action_id := '14_day_streak',
        p_related_entity_type := 'streak_milestone',
        p_metadata := jsonb_build_object('streak_days', v_streak_days)
      );
    ELSIF v_streak_days >= 7 THEN
      v_result := award_xp_with_limits(
        p_user_id := v_user.user_id,
        p_action_id := '7_day_streak',
        p_related_entity_type := 'streak_milestone',
        p_metadata := jsonb_build_object('streak_days', v_streak_days)
      );
    END IF;
  END LOOP;

END;
$$;

COMMENT ON FUNCTION check_and_award_streaks IS 'Daily cron job to check and award XP for multi-day streaks';


-- ============================================================================
-- 6. SCHEDULED FUNCTION: Check for Result-Based XP Awards
-- ============================================================================
-- Weekly check for nutrition targets, weight milestones, etc.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_award_weekly_results()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_protein_days INT;
  v_calorie_days INT;
  v_result JSONB;
BEGIN
  -- Loop through all users with profiles
  FOR v_user IN
    SELECT id as user_id FROM auth.users
  LOOP
    -- Check protein target achievement (5+ days in past week)
    SELECT COUNT(DISTINCT DATE(fe.created_at)) INTO v_protein_days
    FROM food_entries fe
    JOIN user_profiles up ON fe.user_id = up.user_id
    WHERE fe.user_id = v_user.user_id
      AND DATE(fe.created_at) >= CURRENT_DATE - INTERVAL '7 days'
      AND (
        SELECT SUM(fe2.protein_g)
        FROM food_entries fe2
        WHERE fe2.user_id = fe.user_id
          AND DATE(fe2.created_at) = DATE(fe.created_at)
      ) >= up.daily_protein_g;

    IF v_protein_days >= 5 THEN
      v_result := award_xp_with_limits(
        p_user_id := v_user.user_id,
        p_action_id := 'hit_protein_target_5days',
        p_related_entity_type := 'weekly_achievement',
        p_metadata := jsonb_build_object('protein_days', v_protein_days)
      );
    END IF;

    -- Check calorie target achievement (7 days)
    SELECT COUNT(DISTINCT DATE(fe.created_at)) INTO v_calorie_days
    FROM food_entries fe
    JOIN user_profiles up ON fe.user_id = up.user_id
    WHERE fe.user_id = v_user.user_id
      AND DATE(fe.created_at) >= CURRENT_DATE - INTERVAL '7 days'
      AND (
        SELECT SUM(fe2.calories)
        FROM food_entries fe2
        WHERE fe2.user_id = fe.user_id
          AND DATE(fe2.created_at) = DATE(fe.created_at)
      ) BETWEEN (up.daily_calories * 0.9) AND (up.daily_calories * 1.1);

    IF v_calorie_days >= 7 THEN
      v_result := award_xp_with_limits(
        p_user_id := v_user.user_id,
        p_action_id := 'hit_calorie_target_7days',
        p_related_entity_type := 'weekly_achievement',
        p_metadata := jsonb_build_object('calorie_days', v_calorie_days)
      );
    END IF;

    -- Check for perfect week (all targets hit)
    IF v_protein_days >= 7 AND v_calorie_days >= 7 THEN
      v_result := award_xp_with_limits(
        p_user_id := v_user.user_id,
        p_action_id := 'perfect_week',
        p_related_entity_type := 'weekly_achievement',
        p_metadata := jsonb_build_object('week_start', CURRENT_DATE - INTERVAL '7 days')
      );
    END IF;
  END LOOP;

END;
$$;

COMMENT ON FUNCTION check_and_award_weekly_results IS 'Weekly cron job to check and award XP for nutrition target achievements';


-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Automatic XP triggers installed!';
  RAISE NOTICE '';
  RAISE NOTICE 'Instant triggers (on user action):';
  RAISE NOTICE '  - Food logging → log_meal XP';
  RAISE NOTICE '  - Elite food → bonus XP';
  RAISE NOTICE '  - Daily completion → complete_daily_logging XP';
  RAISE NOTICE '  - Habit completion → complete_habit_stack XP';
  RAISE NOTICE '  - Fasting complete → fasting_session_complete XP';
  RAISE NOTICE '  - Weight logging → daily_weigh_in XP';
  RAISE NOTICE '';
  RAISE NOTICE 'Scheduled checks (cron jobs needed):';
  RAISE NOTICE '  - Daily: check_and_award_streaks() for 7/14/30 day streaks';
  RAISE NOTICE '  - Weekly: check_and_award_weekly_results() for protein/calorie targets';
  RAISE NOTICE '';
  RAISE NOTICE 'Setup cron jobs in Supabase dashboard:';
  RAISE NOTICE '  SELECT cron.schedule(''daily-streak-check'', ''0 2 * * *'', $$SELECT check_and_award_streaks()$$);';
  RAISE NOTICE '  SELECT cron.schedule(''weekly-results-check'', ''0 3 * * 1'', $$SELECT check_and_award_weekly_results()$$);';
END $$;

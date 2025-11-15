-- Gamification Functions Migration
-- Created: 2025-11-04
-- Purpose: Add XP system, achievement unlocking, and habit streak management

-- ============================================================================
-- 1. XP AWARD FUNCTION
-- ============================================================================
-- Awards XP to a user and handles level-ups
-- Returns: JSONB with new_xp, new_level, leveled_up, xp_added
-- ============================================================================

CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_xp_amount INT,
  p_action_type TEXT DEFAULT 'general'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_xp INT;
  v_current_level INT;
  v_new_xp INT;
  v_new_level INT;
  v_leveled_up BOOLEAN := FALSE;
  v_xp_per_level CONSTANT INT := 100;
  v_result JSONB;
BEGIN
  -- Validate input
  IF p_xp_amount <= 0 THEN
    RAISE EXCEPTION 'XP amount must be positive';
  END IF;

  -- Get current XP and level, or create new record if doesn't exist
  SELECT current_xp, current_level
  INTO v_current_xp, v_current_level
  FROM user_xp_levels
  WHERE user_id = p_user_id;

  -- If user doesn't exist in xp table, create them
  IF NOT FOUND THEN
    INSERT INTO user_xp_levels (user_id, current_xp, current_level, total_xp_earned)
    VALUES (p_user_id, 0, 1, 0)
    RETURNING current_xp, current_level INTO v_current_xp, v_current_level;
  END IF;

  -- Add XP
  v_new_xp := v_current_xp + p_xp_amount;
  v_new_level := v_current_level;

  -- Check for level ups (can level up multiple times)
  WHILE v_new_xp >= v_xp_per_level LOOP
    v_new_xp := v_new_xp - v_xp_per_level;
    v_new_level := v_new_level + 1;
    v_leveled_up := TRUE;
  END LOOP;

  -- Update user XP record
  UPDATE user_xp_levels
  SET
    current_xp = v_new_xp,
    current_level = v_new_level,
    total_xp_earned = total_xp_earned + p_xp_amount,
    last_xp_awarded_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Build result object
  v_result := jsonb_build_object(
    'new_xp', v_new_xp,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up,
    'xp_added', p_xp_amount,
    'action_type', p_action_type,
    'previous_level', v_current_level,
    'previous_xp', v_current_xp
  );

  -- Log the XP award (optional: create xp_history table if you want detailed logs)
  -- INSERT INTO xp_history (user_id, xp_amount, action_type, created_at)
  -- VALUES (p_user_id, p_xp_amount, p_action_type, NOW());

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error awarding XP: %', SQLERRM;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION award_xp IS 'Awards XP to a user and handles automatic level-ups. Returns JSONB with XP/level changes.';


-- ============================================================================
-- 2. ACHIEVEMENT CHECK AND UNLOCK TRIGGER FUNCTION
-- ============================================================================
-- Checks for achievement unlocks based on food entries
-- Called after INSERT/UPDATE on food_entries table
-- ============================================================================

CREATE OR REPLACE FUNCTION check_achievement_unlock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_elite_streak INT;
  v_total_complete_logs INT;
  v_had_soot BOOLEAN;
  v_achievement_unlocked BOOLEAN := FALSE;
  v_achievement_id TEXT;
BEGIN
  -- Get user_id from the food entry
  v_user_id := NEW.user_id;

  -- ========================================
  -- Achievement 1: 5-Day Elite Streak
  -- ========================================
  -- Check if user has 5 consecutive days of all elite foods
  SELECT COUNT(DISTINCT DATE(created_at))
  INTO v_elite_streak
  FROM food_entries
  WHERE user_id = v_user_id
    AND tier = 'elite'
    AND created_at >= NOW() - INTERVAL '5 days'
    AND created_at <= NOW()
    AND NOT EXISTS (
      -- Ensure no non-elite foods on those days
      SELECT 1 FROM food_entries fe2
      WHERE fe2.user_id = v_user_id
        AND DATE(fe2.created_at) = DATE(food_entries.created_at)
        AND fe2.tier != 'elite'
    );

  -- If 5-day streak achieved, unlock achievement
  IF v_elite_streak >= 5 THEN
    v_achievement_id := 'pink_fire_5_day_elite';

    INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
    VALUES (v_user_id, v_achievement_id, NOW())
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    RETURNING achievement_id INTO v_achievement_id;

    -- If row was inserted (not conflicted), award XP
    IF FOUND THEN
      PERFORM award_xp(v_user_id, 50, 'achievement_unlock:' || v_achievement_id);
      v_achievement_unlocked := TRUE;
    END IF;
  END IF;

  -- ========================================
  -- Achievement 2: 100 Complete Food Logs
  -- ========================================
  -- Check total number of complete food entries
  SELECT COUNT(*)
  INTO v_total_complete_logs
  FROM food_entries
  WHERE user_id = v_user_id
    AND food_name IS NOT NULL
    AND tier IS NOT NULL;

  IF v_total_complete_logs >= 100 THEN
    v_achievement_id := 'brain_smart_100_logs';

    INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
    VALUES (v_user_id, v_achievement_id, NOW())
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    RETURNING achievement_id INTO v_achievement_id;

    IF FOUND THEN
      PERFORM award_xp(v_user_id, 100, 'achievement_unlock:' || v_achievement_id);
      v_achievement_unlocked := TRUE;
    END IF;
  END IF;

  -- ========================================
  -- Achievement 3: Recovery from Soot Food
  -- ========================================
  -- Check if user had a soot food and then logged elite/good food after
  IF NEW.tier IN ('elite', 'good') THEN
    SELECT EXISTS(
      SELECT 1 FROM food_entries
      WHERE user_id = v_user_id
        AND tier = 'soot'
        AND created_at < NEW.created_at
        AND created_at >= NOW() - INTERVAL '24 hours'
    ) INTO v_had_soot;

    IF v_had_soot THEN
      v_achievement_id := 'recovered_from_soot';

      INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
      VALUES (v_user_id, v_achievement_id, NOW())
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id INTO v_achievement_id;

      IF FOUND THEN
        PERFORM award_xp(v_user_id, 25, 'achievement_unlock:' || v_achievement_id);
        v_achievement_unlocked := TRUE;
      END IF;
    END IF;
  END IF;

  -- Return the trigger row (required for AFTER trigger)
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the food entry insert/update
    RAISE WARNING 'Error checking achievements: %', SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_achievement_unlock IS 'Trigger function that checks and unlocks achievements based on food entry patterns';

-- Create the trigger on food_entries table
DROP TRIGGER IF EXISTS trigger_check_achievements ON food_entries;

CREATE TRIGGER trigger_check_achievements
  AFTER INSERT OR UPDATE ON food_entries
  FOR EACH ROW
  EXECUTE FUNCTION check_achievement_unlock();

COMMENT ON TRIGGER trigger_check_achievements ON food_entries IS 'Automatically checks for achievement unlocks after food entries are created/updated';


-- ============================================================================
-- 3. HABIT STREAK UPDATE FUNCTION
-- ============================================================================
-- Calculates and updates current and longest streaks for a habit stack
-- Should be called after habit completions are inserted
-- ============================================================================

CREATE OR REPLACE FUNCTION update_habit_streak(
  p_habit_stack_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_streak INT := 0;
  v_longest_streak INT := 0;
  v_temp_streak INT := 0;
  v_last_date DATE;
  v_current_date DATE;
  v_completion_record RECORD;
  v_result JSONB;
BEGIN
  -- Validate input
  IF p_habit_stack_id IS NULL THEN
    RAISE EXCEPTION 'Habit stack ID cannot be null';
  END IF;

  -- Get all completion dates ordered by date descending
  v_current_date := CURRENT_DATE;
  v_last_date := NULL;

  -- Calculate current streak (consecutive days from today backwards)
  FOR v_completion_record IN
    SELECT DISTINCT DATE(completed_at) as completion_date
    FROM habit_completions
    WHERE habit_stack_id = p_habit_stack_id
    ORDER BY completion_date DESC
  LOOP
    -- First iteration
    IF v_last_date IS NULL THEN
      -- Check if most recent completion is today or yesterday
      IF v_completion_record.completion_date = v_current_date THEN
        v_current_streak := 1;
        v_last_date := v_completion_record.completion_date;
      ELSIF v_completion_record.completion_date = v_current_date - INTERVAL '1 day' THEN
        v_current_streak := 1;
        v_last_date := v_completion_record.completion_date;
      ELSE
        -- Streak is broken, no current streak
        EXIT;
      END IF;
    ELSE
      -- Check if this date is consecutive with last date
      IF v_completion_record.completion_date = v_last_date - INTERVAL '1 day' THEN
        v_current_streak := v_current_streak + 1;
        v_last_date := v_completion_record.completion_date;
      ELSE
        -- Streak broken, stop counting current streak
        EXIT;
      END IF;
    END IF;
  END LOOP;

  -- Calculate longest streak ever
  v_temp_streak := 0;
  v_last_date := NULL;

  FOR v_completion_record IN
    SELECT DISTINCT DATE(completed_at) as completion_date
    FROM habit_completions
    WHERE habit_stack_id = p_habit_stack_id
    ORDER BY completion_date DESC
  LOOP
    IF v_last_date IS NULL THEN
      v_temp_streak := 1;
      v_last_date := v_completion_record.completion_date;
    ELSIF v_completion_record.completion_date = v_last_date - INTERVAL '1 day' THEN
      v_temp_streak := v_temp_streak + 1;
      v_last_date := v_completion_record.completion_date;
    ELSE
      -- Streak broken, save if it's the longest
      IF v_temp_streak > v_longest_streak THEN
        v_longest_streak := v_temp_streak;
      END IF;
      -- Start new streak
      v_temp_streak := 1;
      v_last_date := v_completion_record.completion_date;
    END IF;
  END LOOP;

  -- Check final temp streak
  IF v_temp_streak > v_longest_streak THEN
    v_longest_streak := v_temp_streak;
  END IF;

  -- Update the habit_stacks table
  UPDATE habit_stacks
  SET
    current_streak = v_current_streak,
    longest_streak = GREATEST(longest_streak, v_longest_streak),
    updated_at = NOW()
  WHERE id = p_habit_stack_id;

  -- Build result
  v_result := jsonb_build_object(
    'habit_stack_id', p_habit_stack_id,
    'current_streak', v_current_streak,
    'longest_streak', GREATEST(
      (SELECT longest_streak FROM habit_stacks WHERE id = p_habit_stack_id),
      v_longest_streak
    ),
    'updated_at', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating habit streak: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION update_habit_streak IS 'Calculates and updates current and longest streaks for a habit stack based on completion history';


-- ============================================================================
-- 4. HELPER FUNCTION: Get User Gamification Stats
-- ============================================================================
-- Convenience function to fetch all gamification data for a user
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
  v_result JSONB;
BEGIN
  -- Get XP and level data
  SELECT current_xp, current_level, total_xp_earned, last_xp_awarded_at
  INTO v_xp_data
  FROM user_xp_levels
  WHERE user_id = p_user_id;

  -- If user doesn't exist, return default values
  IF NOT FOUND THEN
    v_xp_data.current_xp := 0;
    v_xp_data.current_level := 1;
    v_xp_data.total_xp_earned := 0;
    v_xp_data.last_xp_awarded_at := NULL;
  END IF;

  -- Get achievement counts
  SELECT COUNT(*) INTO v_achievement_count
  FROM user_achievements
  WHERE user_id = p_user_id;

  -- Get total possible achievements (you can expand this based on your achievements table)
  v_total_achievements := 50; -- Update this based on your total achievements

  -- Build comprehensive stats object
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'xp', jsonb_build_object(
      'current_xp', v_xp_data.current_xp,
      'current_level', v_xp_data.current_level,
      'total_xp_earned', v_xp_data.total_xp_earned,
      'xp_to_next_level', 100 - v_xp_data.current_xp,
      'last_xp_awarded_at', v_xp_data.last_xp_awarded_at
    ),
    'achievements', jsonb_build_object(
      'unlocked_count', v_achievement_count,
      'total_count', v_total_achievements,
      'completion_percentage', ROUND((v_achievement_count::NUMERIC / v_total_achievements::NUMERIC) * 100, 2)
    ),
    'fetched_at', NOW()
  );

  RETURN v_result;

END;
$$;

COMMENT ON FUNCTION get_user_gamification_stats IS 'Returns comprehensive gamification statistics for a user including XP, level, and achievements';


-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for XP queries
CREATE INDEX IF NOT EXISTS idx_user_xp_levels_user_id ON user_xp_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_levels_level ON user_xp_levels(current_level DESC);

-- Indexes for achievement queries
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- Indexes for food entries (for achievement checks)
CREATE INDEX IF NOT EXISTS idx_food_entries_user_tier_date ON food_entries(user_id, tier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, created_at DESC);

-- Indexes for habit completions (for streak calculations)
CREATE INDEX IF NOT EXISTS idx_habit_completions_stack_date ON habit_completions(habit_stack_id, completed_at DESC);


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION award_xp TO authenticated;
GRANT EXECUTE ON FUNCTION update_habit_streak TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_gamification_stats TO authenticated;

-- Note: check_achievement_unlock runs as SECURITY DEFINER and is triggered automatically

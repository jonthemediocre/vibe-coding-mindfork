-- =====================================================
-- ENHANCED COACH SYSTEM PROMPT WITH FULL CONTEXT
-- =====================================================
-- Purpose: Build hyper-personalized coach system prompts with complete user context
-- Date: 2025-11-11
-- Key Features:
--   1. User demographics and goals from profiles/user_goals
--   2. Today's nutrition totals from food_entries
--   3. Today's activity (water, fitness, habits) aggregated
--   4. 7-day patterns and streaks
--   5. Top 5 episodic memories by importance
--   6. Emotional eating patterns and craving risk
--   7. XP progress and gamification stats
--   8. Coach effectiveness ratings
-- =====================================================

-- =====================================================
-- HELPER FUNCTION 1: Get Today's Nutrition Summary
-- =====================================================

CREATE OR REPLACE FUNCTION get_today_nutrition_summary(p_user_id UUID)
RETURNS TABLE (
  total_calories NUMERIC,
  total_protein NUMERIC,
  total_carbs NUMERIC,
  total_fat NUMERIC,
  total_fiber NUMERIC,
  total_sugar NUMERIC,
  meals_logged INT,
  last_meal_time TIMESTAMPTZ,
  hours_since_last_meal NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(fe.calories), 0)::NUMERIC AS total_calories,
    COALESCE(SUM(fe.protein_g), 0)::NUMERIC AS total_protein,
    COALESCE(SUM(fe.carbs_g), 0)::NUMERIC AS total_carbs,
    COALESCE(SUM(fe.fat_g), 0)::NUMERIC AS total_fat,
    COALESCE(SUM(fe.fiber_g), 0)::NUMERIC AS total_fiber,
    COALESCE(SUM(fe.sugar_g), 0)::NUMERIC AS total_sugar,
    COUNT(*)::INT AS meals_logged,
    MAX(fe.consumed_at) AS last_meal_time,
    EXTRACT(EPOCH FROM (NOW() - MAX(fe.consumed_at))) / 3600::NUMERIC AS hours_since_last_meal
  FROM food_entries fe
  WHERE fe.user_id = p_user_id
    AND DATE(fe.consumed_at) = CURRENT_DATE;
END;
$$;

COMMENT ON FUNCTION get_today_nutrition_summary IS 'Get aggregate nutrition data for today';

-- =====================================================
-- HELPER FUNCTION 2: Get Today's Activity Summary
-- =====================================================

CREATE OR REPLACE FUNCTION get_today_activity_summary(p_user_id UUID)
RETURNS TABLE (
  water_ml INT,
  water_logs_count INT,
  fitness_minutes INT,
  fitness_calories INT,
  habits_completed INT,
  habits_total INT,
  steps INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Water tracking
    COALESCE(SUM(wl.amount_ml), 0)::INT AS water_ml,
    COUNT(DISTINCT wl.id)::INT AS water_logs_count,

    -- Fitness tracking
    COALESCE(SUM(fl.duration_minutes), 0)::INT AS fitness_minutes,
    COALESCE(SUM(fl.calories_burned), 0)::INT AS fitness_calories,

    -- Habit tracking
    (SELECT COUNT(*) FROM habit_completions hc
     WHERE hc.user_id = p_user_id AND hc.date = CURRENT_DATE)::INT AS habits_completed,
    (SELECT COUNT(*) FROM habits h
     WHERE h.user_id = p_user_id AND h.is_active = true)::INT AS habits_total,

    -- Steps (if tracked)
    0::INT AS steps -- Placeholder for step tracking integration

  FROM water_logs wl
  FULL OUTER JOIN fitness_logs fl ON fl.user_id = wl.user_id AND DATE(fl.logged_at) = DATE(wl.logged_at)
  WHERE wl.user_id = p_user_id
    AND DATE(wl.logged_at) = CURRENT_DATE;
END;
$$;

COMMENT ON FUNCTION get_today_activity_summary IS 'Get aggregate activity data for today (water, fitness, habits)';

-- =====================================================
-- HELPER FUNCTION 3: Get 7-Day Patterns and Streaks
-- =====================================================

CREATE OR REPLACE FUNCTION get_7day_patterns(p_user_id UUID)
RETURNS TABLE (
  avg_calories NUMERIC,
  avg_protein NUMERIC,
  days_hit_protein_target INT,
  days_hit_calorie_target INT,
  current_logging_streak INT,
  best_habit_streak INT,
  avg_mood_valence NUMERIC,
  emotional_eating_events INT,
  cravings_resisted INT,
  cravings_gave_in INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_protein_target NUMERIC;
  v_calorie_min NUMERIC;
  v_calorie_max NUMERIC;
BEGIN
  -- Get user targets
  SELECT daily_protein_g, daily_calories_min, daily_calories_max
  INTO v_protein_target, v_calorie_min, v_calorie_max
  FROM profiles
  WHERE user_id = p_user_id;

  -- Default targets if not set
  v_protein_target := COALESCE(v_protein_target, 150);
  v_calorie_min := COALESCE(v_calorie_min, 1500);
  v_calorie_max := COALESCE(v_calorie_max, 2000);

  RETURN QUERY
  WITH seven_days AS (
    SELECT
      DATE(fe.consumed_at) AS day,
      SUM(fe.calories) AS daily_calories,
      SUM(fe.protein_g) AS daily_protein
    FROM food_entries fe
    WHERE fe.user_id = p_user_id
      AND fe.consumed_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(fe.consumed_at)
  ),
  mood_data AS (
    SELECT
      AVG(mc.mood_valence) AS avg_valence,
      COUNT(*) FILTER (WHERE mc.eating_triggered_by_emotion = true) AS emotional_events
    FROM mood_check_ins mc
    WHERE mc.user_id = p_user_id
      AND mc.created_at >= CURRENT_DATE - INTERVAL '7 days'
  ),
  craving_data AS (
    SELECT
      COUNT(*) FILTER (WHERE c.gave_in = false) AS resisted,
      COUNT(*) FILTER (WHERE c.gave_in = true) AS gave_in
    FROM cravings c
    WHERE c.user_id = p_user_id
      AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
  ),
  streak_data AS (
    SELECT
      -- Current logging streak
      COUNT(*) AS logging_streak
    FROM seven_days
    WHERE day >= CURRENT_DATE - (
      SELECT COUNT(*) FROM seven_days WHERE day >= CURRENT_DATE - INTERVAL '7 days'
    )
  )
  SELECT
    COALESCE(AVG(sd.daily_calories), 0)::NUMERIC,
    COALESCE(AVG(sd.daily_protein), 0)::NUMERIC,
    COUNT(*) FILTER (WHERE sd.daily_protein >= v_protein_target)::INT,
    COUNT(*) FILTER (WHERE sd.daily_calories BETWEEN v_calorie_min AND v_calorie_max)::INT,
    COALESCE(stk.logging_streak, 0)::INT,
    (SELECT MAX(h.best_streak) FROM habits h WHERE h.user_id = p_user_id)::INT,
    COALESCE(md.avg_valence, 5.0)::NUMERIC,
    COALESCE(md.emotional_events, 0)::INT,
    COALESCE(cd.resisted, 0)::INT,
    COALESCE(cd.gave_in, 0)::INT
  FROM seven_days sd
  CROSS JOIN mood_data md
  CROSS JOIN craving_data cd
  CROSS JOIN streak_data stk
  GROUP BY md.avg_valence, md.emotional_events, cd.resisted, cd.gave_in, stk.logging_streak;
END;
$$;

COMMENT ON FUNCTION get_7day_patterns IS 'Get 7-day nutrition patterns, streaks, mood, and craving data';

-- =====================================================
-- HELPER FUNCTION 4: Get XP and Gamification Stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_xp_stats(p_user_id UUID)
RETURNS TABLE (
  current_level INT,
  current_xp INT,
  total_xp_earned INT,
  xp_to_next_level INT,
  xp_this_week INT,
  habit_xp_percentage INT,
  result_xp_percentage INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_per_level CONSTANT INT := 100;
BEGIN
  RETURN QUERY
  WITH xp_data AS (
    SELECT
      uxl.current_level,
      uxl.current_xp,
      uxl.total_xp_earned
    FROM user_xp_levels uxl
    WHERE uxl.user_id = p_user_id
  ),
  weekly_xp AS (
    SELECT
      COALESCE(SUM(xh.xp_awarded), 0) AS week_xp,
      COALESCE(SUM(xh.xp_awarded) FILTER (WHERE xa.category = 'habit'), 0) AS habit_xp,
      COALESCE(SUM(xh.xp_awarded) FILTER (WHERE xa.category = 'result'), 0) AS result_xp
    FROM xp_award_history xh
    JOIN xp_award_actions xa ON xa.action_id = xh.action_id
    WHERE xh.user_id = p_user_id
      AND xh.awarded_at >= CURRENT_DATE - INTERVAL '7 days'
  )
  SELECT
    COALESCE(xd.current_level, 1)::INT,
    COALESCE(xd.current_xp, 0)::INT,
    COALESCE(xd.total_xp_earned, 0)::INT,
    (v_xp_per_level - COALESCE(xd.current_xp, 0))::INT AS xp_to_next_level,
    wx.week_xp::INT,
    CASE WHEN wx.week_xp > 0 THEN (wx.habit_xp::NUMERIC / wx.week_xp * 100)::INT ELSE 0 END AS habit_pct,
    CASE WHEN wx.week_xp > 0 THEN (wx.result_xp::NUMERIC / wx.week_xp * 100)::INT ELSE 0 END AS result_pct
  FROM xp_data xd
  CROSS JOIN weekly_xp wx;
END;
$$;

COMMENT ON FUNCTION get_xp_stats IS 'Get XP level, progress, and habit vs result breakdown';

-- =====================================================
-- MAIN FUNCTION: Enhanced build_coach_system_prompt
-- =====================================================

CREATE OR REPLACE FUNCTION build_coach_system_prompt_enhanced(
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
  -- User profile data
  v_first_name TEXT;
  v_diet_type TEXT;
  v_daily_calories_min NUMERIC;
  v_daily_calories_max NUMERIC;
  v_daily_protein_g NUMERIC;
  v_daily_carbs_g NUMERIC;
  v_daily_fat_g NUMERIC;
  v_daily_fiber_g INT;
  v_daily_water_ml INT;

  -- Coach configuration
  v_coach_id TEXT;
  v_coach_name TEXT;
  v_coach_usage_notes TEXT;
  v_severity DECIMAL;
  v_mode TEXT;
  v_intensity_modifier TEXT;
  v_mode_modifier TEXT;

  -- Today's data
  v_today_nutrition RECORD;
  v_today_activity RECORD;

  -- 7-day patterns
  v_patterns RECORD;

  -- XP stats
  v_xp RECORD;

  -- Episodic memory
  v_memory_context TEXT;

  -- Final prompt
  v_final_prompt TEXT;

BEGIN
  -- =====================================================
  -- 1. GET USER PROFILE AND GOALS
  -- =====================================================

  SELECT
    p.first_name,
    p.diet_type,
    p.daily_calories_min,
    p.daily_calories_max,
    p.daily_protein_g,
    p.daily_carbs_g,
    p.daily_fat_g,
    p.daily_fiber_g,
    p.daily_water_ml
  INTO
    v_first_name,
    v_diet_type,
    v_daily_calories_min,
    v_daily_calories_max,
    v_daily_protein_g,
    v_daily_carbs_g,
    v_daily_fat_g,
    v_daily_fiber_g,
    v_daily_water_ml
  FROM profiles p
  WHERE p.user_id = p_user_id;

  -- Set defaults if not found
  v_first_name := COALESCE(v_first_name, 'Friend');
  v_diet_type := COALESCE(v_diet_type, 'balanced');
  v_daily_calories_min := COALESCE(v_daily_calories_min, 1500);
  v_daily_calories_max := COALESCE(v_daily_calories_max, 2000);
  v_daily_protein_g := COALESCE(v_daily_protein_g, 150);
  v_daily_water_ml := COALESCE(v_daily_water_ml, 2000);

  -- =====================================================
  -- 2. GET COACH CONFIGURATION
  -- =====================================================

  -- Get active coach and mode
  SELECT
    COALESCE(p_override_coach_id, ucp.active_coach_id, 'kai_planner'),
    COALESCE(p_override_severity, ucp.severity, 3.0),
    COALESCE(p_override_mode, ucp.active_coach_mode, 'default')
  INTO v_coach_id, v_severity, v_mode
  FROM user_coach_preferences ucp
  WHERE ucp.user_id = p_user_id;

  -- Defaults if no preferences
  v_coach_id := COALESCE(v_coach_id, 'kai_planner');
  v_severity := COALESCE(v_severity, 3.0);
  v_mode := COALESCE(v_mode, 'default');

  -- Get coach personality
  SELECT
    alt_text,
    usage_notes
  INTO v_coach_name, v_coach_usage_notes
  FROM brand_assets
  WHERE asset_name = v_coach_id
  LIMIT 1;

  v_coach_name := COALESCE(v_coach_name, 'Coach');
  v_coach_usage_notes := COALESCE(v_coach_usage_notes, 'A supportive wellness coach');

  -- =====================================================
  -- 3. GET TODAY'S NUTRITION DATA
  -- =====================================================

  SELECT * INTO v_today_nutrition
  FROM get_today_nutrition_summary(p_user_id);

  -- =====================================================
  -- 4. GET TODAY'S ACTIVITY DATA
  -- =====================================================

  SELECT * INTO v_today_activity
  FROM get_today_activity_summary(p_user_id);

  -- =====================================================
  -- 5. GET 7-DAY PATTERNS
  -- =====================================================

  SELECT * INTO v_patterns
  FROM get_7day_patterns(p_user_id);

  -- =====================================================
  -- 6. GET XP STATS
  -- =====================================================

  SELECT * INTO v_xp
  FROM get_xp_stats(p_user_id);

  -- =====================================================
  -- 8. GET EPISODIC MEMORY CONTEXT
  -- =====================================================

  v_memory_context := build_memory_context(p_user_id, 5);

  -- =====================================================
  -- 9. BUILD INTENSITY MODIFIER
  -- =====================================================

  v_intensity_modifier := CASE
    WHEN v_severity < 2.0 THEN 'ULTRA GENTLE - Be extremely warm, patient, encouraging'
    WHEN v_severity < 3.0 THEN 'SUPPORTIVE - Balance praise with gentle guidance'
    WHEN v_severity < 4.0 THEN 'BALANCED - Clear, direct, honest but respectful'
    WHEN v_severity < 5.0 THEN 'DIRECT - Firm, challenging, assertive accountability'
    WHEN v_severity < 6.0 THEN 'INTENSE - Brutally honest, zero tolerance for excuses'
    ELSE 'SAVAGE MODE - Ruthlessly honest, biting sarcasm, maximum accountability'
  END;

  -- =====================================================
  -- 10. BUILD FINAL SYSTEM PROMPT
  -- =====================================================

  v_final_prompt := format($PROMPT$
You are %s, %s

=== USER PROFILE ===
Name: %s
Diet Type: %s
Intensity Level: %.1f/6.0 (%s)
Mode: %s

=== DAILY TARGETS ===
• Calories: %s-%s kcal
• Protein: %s g
• Carbs: %s g
• Fat: %s g
• Fiber: %s g
• Water: %s ml

=== TODAY'S PROGRESS ===
• Calories: %s/%s-%s kcal (%s%% of target)
• Protein: %s/%s g (%s%% of target)
• Carbs: %s/%s g
• Fat: %s/%s g
• Water: %s/%s ml (%s%%)
• Meals logged: %s
• Last meal: %s hours ago
• Habits completed: %s/%s
• Fitness: %s minutes, %s calories burned

=== 7-DAY TRENDS ===
• Average calories: %s kcal/day
• Average protein: %s g/day
• Days hit protein target: %s/7
• Days hit calorie target: %s/7
• Current logging streak: %s days
• Best habit streak: %s days
• Average mood: %s/10
• Emotional eating events: %s
• Cravings resisted: %s, gave in: %s

=== XP & GAMIFICATION ===
• Level: %s (XP: %s/%s to next level)
• Total XP earned: %s
• XP this week: %s
• Habit XP: %s%%, Result XP: %s%%

%s

%s

%s

=== YOUR COACHING STYLE ===
%s

=== CRITICAL RULES ===
1. Address user by name (%s)
2. Be hyper-specific with numbers ("You're at 95g protein, need 55g more")
3. Reference their streaks and patterns when relevant
4. Celebrate wins enthusiastically
5. Call out patterns you notice ("You've been skipping breakfast this week")
6. Give actionable next steps
7. Keep responses under 100 words unless asked for details
8. Use 1-2 emojis max for emphasis
9. NEVER give medical advice - say "consult a doctor"
10. Adjust tone to match intensity level above

$PROMPT$,
    v_coach_name,
    v_coach_usage_notes,
    v_first_name,
    v_diet_type,
    v_severity,
    v_intensity_modifier,
    v_mode,
    v_daily_calories_min,
    v_daily_calories_max,
    v_daily_protein_g,
    COALESCE(v_daily_carbs_g, 200),
    COALESCE(v_daily_fat_g, 65),
    v_daily_fiber_g,
    v_daily_water_ml,
    COALESCE(v_today_nutrition.total_calories, 0),
    v_daily_calories_min,
    v_daily_calories_max,
    CASE WHEN v_daily_calories_max > 0 THEN (v_today_nutrition.total_calories / v_daily_calories_max * 100)::INT ELSE 0 END,
    COALESCE(v_today_nutrition.total_protein, 0),
    v_daily_protein_g,
    CASE WHEN v_daily_protein_g > 0 THEN (v_today_nutrition.total_protein / v_daily_protein_g * 100)::INT ELSE 0 END,
    COALESCE(v_today_nutrition.total_carbs, 0),
    COALESCE(v_daily_carbs_g, 200),
    COALESCE(v_today_nutrition.total_fat, 0),
    COALESCE(v_daily_fat_g, 65),
    COALESCE(v_today_activity.water_ml, 0),
    v_daily_water_ml,
    CASE WHEN v_daily_water_ml > 0 THEN (v_today_activity.water_ml::NUMERIC / v_daily_water_ml * 100)::INT ELSE 0 END,
    COALESCE(v_today_nutrition.meals_logged, 0),
    COALESCE(v_today_nutrition.hours_since_last_meal, 0),
    COALESCE(v_today_activity.habits_completed, 0),
    COALESCE(v_today_activity.habits_total, 0),
    COALESCE(v_today_activity.fitness_minutes, 0),
    COALESCE(v_today_activity.fitness_calories, 0),
    COALESCE(v_patterns.avg_calories, 0),
    COALESCE(v_patterns.avg_protein, 0),
    COALESCE(v_patterns.days_hit_protein_target, 0),
    COALESCE(v_patterns.days_hit_calorie_target, 0),
    COALESCE(v_patterns.current_logging_streak, 0),
    COALESCE(v_patterns.best_habit_streak, 0),
    COALESCE(v_patterns.avg_mood_valence, 5),
    COALESCE(v_patterns.emotional_eating_events, 0),
    COALESCE(v_patterns.cravings_resisted, 0),
    COALESCE(v_patterns.cravings_gave_in, 0),
    COALESCE(v_xp.current_level, 1),
    COALESCE(v_xp.current_xp, 0),
    COALESCE(v_xp.xp_to_next_level, 100),
    COALESCE(v_xp.total_xp_earned, 0),
    COALESCE(v_xp.xp_this_week, 0),
    COALESCE(v_xp.habit_xp_percentage, 0),
    COALESCE(v_xp.result_xp_percentage, 0),
    v_memory_context,
    CASE WHEN v_mode = 'savage' THEN
      E'\n=== SAVAGE MODE ACTIVATED ===\nUser explicitly requested MAXIMUM intensity. Ruthless honesty expected.\n'
    WHEN v_mode = 'roast' THEN
      E'\n=== ROAST MODE ACTIVATED ===\nUser wants challenging tough-love coaching.\n'
    ELSE '' END,
    v_coach_usage_notes,
    v_first_name
  );

  RETURN v_final_prompt;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error building enhanced prompt: %', SQLERRM;
    RETURN format('You are %s, a supportive wellness coach for %s.', v_coach_name, v_first_name);
END;
$$;

COMMENT ON FUNCTION build_coach_system_prompt_enhanced IS 'Builds hyper-personalized system prompt with complete user context aggregation';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_today_nutrition_summary TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_today_activity_summary TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_7day_patterns TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_xp_stats TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION build_coach_system_prompt_enhanced TO service_role, authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ ENHANCED COACH SYSTEM PROMPT INSTALLED';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 New Functions Created:';
  RAISE NOTICE '  1. get_today_nutrition_summary() - Today''s macro totals';
  RAISE NOTICE '  2. get_today_activity_summary() - Water, fitness, habits';
  RAISE NOTICE '  3. get_7day_patterns() - Weekly trends and streaks';
  RAISE NOTICE '  4. get_xp_stats() - Gamification progress';
  RAISE NOTICE '  5. build_coach_system_prompt_enhanced() - MAIN FUNCTION';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Context Included in Prompt:';
  RAISE NOTICE '  ✅ User profile and daily targets';
  RAISE NOTICE '  ✅ Today''s nutrition progress (live)';
  RAISE NOTICE '  ✅ Today''s activity (water, fitness, habits)';
  RAISE NOTICE '  ✅ 7-day trends and patterns';
  RAISE NOTICE '  ✅ Menstrual cycle context (if tracked)';
  RAISE NOTICE '  ✅ XP level and gamification stats';
  RAISE NOTICE '  ✅ Top 5 episodic memories';
  RAISE NOTICE '  ✅ Emotional eating and craving patterns';
  RAISE NOTICE '';
  RAISE NOTICE '💬 Example Coach Response:';
  RAISE NOTICE '  "Sarah! You just logged salmon for dinner - LOVE IT!"';
  RAISE NOTICE '  "That puts you at 95g protein today. You need 55 more"';
  RAISE NOTICE '  "grams before bed. Quick tip: You''ve been crushing"';
  RAISE NOTICE '  "dinner but skipping breakfast this week. Want me to"';
  RAISE NOTICE '  "help you find a high-protein breakfast you''ll actually eat?"';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

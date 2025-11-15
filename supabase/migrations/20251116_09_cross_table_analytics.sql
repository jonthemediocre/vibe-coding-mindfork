-- ================================================
-- CROSS-TABLE ANALYTICS: Missing High-Value Insights
-- Users would LOVE these but they don't exist yet!
-- ================================================

-- ============================================
-- 1. ENERGY TIMELINE (CRITICAL)
-- Cross-tables: brain_fog_logs + food_entries + mood_check_ins + water_intake + step_tracking
-- ============================================

CREATE OR REPLACE FUNCTION get_energy_timeline(
  target_user_id UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  hour_of_day INTEGER,
  clarity_score NUMERIC,
  meals_eaten INTEGER,
  water_ounces INTEGER,
  steps INTEGER,
  mood_tags TEXT[],
  energy_level INTEGER,
  predicted_energy NUMERIC,
  recommendations TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH hourly_data AS (
    SELECT
      EXTRACT(HOUR FROM timestamp_col)::INTEGER as hour,
      -- Brain fog data
      AVG(bf.clarity_score) as avg_clarity,
      -- Food data
      COUNT(DISTINCT fe.id) as meal_count,
      -- Water data
      COALESCE(SUM(w.amount_oz), 0) as total_water,
      -- Steps (daily aggregate, spread across hours)
      MAX(st.steps) / 24 as hourly_steps,
      -- Mood data
      ARRAY_AGG(DISTINCT m.mood_tags) FILTER (WHERE m.mood_tags IS NOT NULL) as moods,
      AVG(m.energy_level) as avg_energy
    FROM generate_series(0, 23) as gs(hour)
    CROSS JOIN LATERAL (
      SELECT (target_date::TIMESTAMP + (gs.hour || ' hours')::INTERVAL) as timestamp_col
    ) AS ts
    LEFT JOIN brain_fog_logs bf
      ON bf.user_id = target_user_id
      AND bf.log_date = target_date
    LEFT JOIN food_entries fe
      ON fe.user_id = target_user_id
      AND DATE(fe.consumed_at) = target_date
      AND EXTRACT(HOUR FROM fe.consumed_at) = gs.hour
    LEFT JOIN water_intake w
      ON w.user_id = target_user_id
      AND DATE(w.logged_at) = target_date
      AND EXTRACT(HOUR FROM w.logged_at) = gs.hour
    LEFT JOIN step_tracking st
      ON st.user_id = target_user_id
      AND DATE(st.tracked_at) = target_date
    LEFT JOIN mood_check_ins m
      ON m.user_id = target_user_id
      AND DATE(m.created_at) = target_date
      AND EXTRACT(HOUR FROM m.created_at) = gs.hour
    GROUP BY gs.hour, ts.timestamp_col
  )
  SELECT
    h.hour,
    ROUND(COALESCE(h.avg_clarity, 5), 1),
    h.meal_count::INTEGER,
    ROUND(h.total_water)::INTEGER,
    ROUND(COALESCE(h.hourly_steps, 0))::INTEGER,
    COALESCE(h.moods, ARRAY[]::TEXT[]),
    ROUND(COALESCE(h.avg_energy, 5))::INTEGER,
    -- Predicted energy based on patterns
    ROUND(
      COALESCE(h.avg_clarity, 5) * 0.4 +
      CASE WHEN h.meal_count > 0 THEN 3 ELSE 0 END +
      CASE WHEN h.total_water > 8 THEN 2 ELSE 0 END +
      CASE WHEN h.hourly_steps > 200 THEN 1 ELSE 0 END,
      1
    ),
    -- Dynamic recommendations
    ARRAY(
      SELECT recommendation FROM (
        SELECT 'Drink water - only ' || ROUND(h.total_water) || 'oz so far' as recommendation, 1 as priority
        WHERE h.total_water < 8
        UNION ALL
        SELECT 'Eat a meal - it has been ' || h.hour || ' hours', 2
        WHERE h.meal_count = 0 AND h.hour > 12
        UNION ALL
        SELECT 'Take a walk - low movement detected', 3
        WHERE h.hourly_steps < 100 AND h.hour BETWEEN 9 AND 17
        UNION ALL
        SELECT 'Energy crash likely - prep healthy snack', 4
        WHERE h.avg_clarity < 4
      ) AS recs
      ORDER BY priority
      LIMIT 3
    )
  FROM hourly_data h
  ORDER BY h.hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. FOOD → MOOD → BEHAVIOR LOOP (COMPETITIVE MOAT)
-- Cross-tables: food_entries + mood_check_ins + cravings + user_achievements
-- ============================================

CREATE OR REPLACE FUNCTION get_food_mood_behavior_loop(
  target_user_id UUID,
  days_back INTEGER DEFAULT 14
)
RETURNS TABLE(
  trigger_food_type TEXT,
  hours_until_mood_change NUMERIC,
  mood_shift TEXT,
  craving_triggered TEXT,
  behavior_outcome TEXT,
  frequency_count INTEGER,
  avg_calorie_impact INTEGER,
  recommendations TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH food_mood_pairs AS (
    SELECT
      fe.id as food_id,
      fe.consumed_at,
      CASE
        WHEN fe.carbs > fe.protein * 2 THEN 'high_carb'
        WHEN fe.protein > 30 THEN 'high_protein'
        WHEN fe.fat > 20 THEN 'high_fat'
        ELSE 'balanced'
      END as food_type,
      mc.created_at as mood_time,
      mc.mood_tags,
      mc.eating_triggered_by_emotion,
      mc.hunger_level,
      EXTRACT(EPOCH FROM (mc.created_at - fe.consumed_at)) / 3600 as hours_between
    FROM food_entries fe
    JOIN mood_check_ins mc
      ON mc.user_id = fe.user_id
      AND mc.created_at > fe.consumed_at
      AND mc.created_at < fe.consumed_at + INTERVAL '6 hours'
    WHERE fe.user_id = target_user_id
      AND fe.consumed_at > NOW() - (days_back || ' days')::INTERVAL
  ),
  craving_links AS (
    SELECT
      fmp.*,
      c.food_craved,
      c.intensity
    FROM food_mood_pairs fmp
    LEFT JOIN cravings c
      ON c.user_id = target_user_id
      AND c.created_at BETWEEN fmp.consumed_at AND fmp.mood_time + INTERVAL '2 hours'
  )
  SELECT
    cl.food_type,
    ROUND(AVG(cl.hours_between), 1),
    CASE
      WHEN BOOL_OR(cl.eating_triggered_by_emotion) THEN 'negative_shift'
      WHEN AVG(cl.hunger_level) > 7 THEN 'hunger_spike'
      ELSE 'stable'
    END,
    MODE() WITHIN GROUP (ORDER BY cl.food_craved),
    CASE
      WHEN BOOL_OR(cl.eating_triggered_by_emotion) THEN 'emotional_eating'
      WHEN AVG(cl.intensity) > 7 THEN 'strong_craving'
      ELSE 'managed'
    END,
    COUNT(*)::INTEGER,
    0, -- Will calculate calorie impact in future enhancement
    CASE cl.food_type
      WHEN 'high_carb' THEN 'High-carb meals lead to crashes - pair with protein next time'
      WHEN 'high_fat' THEN 'High-fat meals may be affecting energy - try lighter options'
      WHEN 'high_protein' THEN 'Protein keeping you stable - keep it up!'
      ELSE 'Balanced meals working well'
    END
  FROM craving_links cl
  GROUP BY cl.food_type
  HAVING COUNT(*) >= 3 -- At least 3 occurrences to detect pattern
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. SOCIAL ACCOUNTABILITY SCORE (GAMIFICATION)
-- Cross-tables: user_follows + community_posts + user_achievements + challenges + post_likes
-- ============================================

CREATE OR REPLACE FUNCTION get_social_accountability_score(
  target_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH user_stats AS (
    SELECT
      -- Posting behavior
      COUNT(DISTINCT cp.id) as total_posts,
      COUNT(DISTINCT cp.id) FILTER (WHERE cp.created_at > NOW() - INTERVAL '7 days') as posts_last_week,
      -- Engagement
      COUNT(DISTINCT pl.id) as total_likes_received,
      COUNT(DISTINCT pl.user_id) as unique_supporters,
      -- Follower stats
      (SELECT COUNT(*) FROM user_follows WHERE following_id = target_user_id) as follower_count,
      (SELECT COUNT(*) FROM user_follows WHERE follower_id = target_user_id) as following_count
    FROM community_posts cp
    LEFT JOIN post_likes pl ON pl.post_id = cp.id
    WHERE cp.user_id = target_user_id
  ),
  streak_correlation AS (
    SELECT
      -- Streak on posting days
      AVG(us.current_streak) FILTER (WHERE EXISTS (
        SELECT 1 FROM community_posts cp2
        WHERE cp2.user_id = target_user_id
          AND DATE(cp2.created_at) = DATE(us.updated_at)
      )) as avg_streak_when_posting,
      -- Streak on non-posting days
      AVG(us.current_streak) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM community_posts cp2
        WHERE cp2.user_id = target_user_id
          AND DATE(cp2.created_at) = DATE(us.updated_at)
      )) as avg_streak_when_not_posting
    FROM user_streaks us
    WHERE us.user_id = target_user_id
      AND us.updated_at > NOW() - INTERVAL '30 days'
  ),
  top_supporter AS (
    SELECT
      u.user_id,
      COUNT(*) as support_count
    FROM post_likes pl
    JOIN community_posts cp ON cp.id = pl.post_id
    JOIN profiles u ON u.user_id = pl.user_id
    WHERE cp.user_id = target_user_id
    GROUP BY u.user_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT json_build_object(
    'total_posts', COALESCE(us.total_posts, 0),
    'posts_last_week', COALESCE(us.posts_last_week, 0),
    'total_likes_received', COALESCE(us.total_likes_received, 0),
    'unique_supporters', COALESCE(us.unique_supporters, 0),
    'follower_count', COALESCE(us.follower_count, 0),
    'following_count', COALESCE(us.following_count, 0),
    'avg_streak_when_posting', ROUND(COALESCE(sc.avg_streak_when_posting, 0), 1),
    'avg_streak_when_not_posting', ROUND(COALESCE(sc.avg_streak_when_not_posting, 0), 1),
    'posting_boost_multiplier', ROUND(
      COALESCE(sc.avg_streak_when_posting, 0) /
      NULLIF(COALESCE(sc.avg_streak_when_not_posting, 1), 0),
      2
    ),
    'top_supporter_id', ts.user_id,
    'top_supporter_likes', COALESCE(ts.support_count, 0),
    'accountability_score', ROUND(
      (COALESCE(us.total_likes_received, 0) * 0.3) +
      (COALESCE(us.unique_supporters, 0) * 2) +
      (COALESCE(us.posts_last_week, 0) * 5) +
      (COALESCE(sc.avg_streak_when_posting, 0) * 0.5),
      1
    )
  )
  INTO result
  FROM user_stats us
  CROSS JOIN streak_correlation sc
  LEFT JOIN top_supporter ts ON true
  LIMIT 1;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_energy_timeline(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_food_mood_behavior_loop(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_social_accountability_score(UUID) TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Test energy timeline
-- SELECT * FROM get_energy_timeline(auth.uid(), CURRENT_DATE);

-- Test food-mood loop
-- SELECT * FROM get_food_mood_behavior_loop(auth.uid(), 14);

-- Test social accountability
-- SELECT get_social_accountability_score(auth.uid());

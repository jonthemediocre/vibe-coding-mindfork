-- =====================================================
-- COMPLETE DYNAMIC UI SYSTEM - ALL MISSING PIECES
-- =====================================================
-- Purpose: Add all critical functions for production-ready dynamic UI
-- Date: 2025-11-04
-- Components:
--   1. predicate_match() - Rules engine evaluation
--   2. Cache invalidation triggers
--   3. Dashboard performance view
--   4. Trait confidence updates
--   5. AI trait evolution
--   6. Performance monitoring
-- =====================================================

-- =====================================================
-- 1. PREDICATE MATCHING FUNCTION (CRITICAL)
-- =====================================================

CREATE OR REPLACE FUNCTION predicate_match(
  p_user_id UUID,
  p_predicate JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_operator TEXT;
  v_trait_key TEXT;
  v_user_value TEXT;
  v_user_confidence NUMERIC;
  v_expected_value JSONB;
  v_result BOOLEAN;
  v_min_confidence NUMERIC;
BEGIN
  -- Handle NULL or empty predicate (always matches)
  IF p_predicate IS NULL OR p_predicate = '{}'::JSONB THEN
    RETURN TRUE;
  END IF;

  -- Type 1: Simple predicate {"trait": "diet_type", "op": "eq", "value": "vegan"}
  IF p_predicate ? 'trait' AND p_predicate ? 'op' THEN
    v_trait_key := p_predicate->>'trait';
    v_operator := p_predicate->>'op';
    v_expected_value := p_predicate->'value';

    -- Get user's trait value and confidence
    SELECT trait_value, confidence
    INTO v_user_value, v_user_confidence
    FROM user_traits
    WHERE user_id = p_user_id AND trait_key = v_trait_key;

    -- If trait doesn't exist, predicate fails
    IF v_user_value IS NULL THEN
      RETURN FALSE;
    END IF;

    -- Check confidence threshold if specified
    IF p_predicate ? 'min_confidence' THEN
      v_min_confidence := (p_predicate->>'min_confidence')::NUMERIC;
      IF v_user_confidence < v_min_confidence THEN
        RETURN FALSE;
      END IF;
    END IF;

    -- Evaluate operator
    RETURN CASE v_operator
      WHEN 'eq' THEN
        v_user_value = (v_expected_value#>>'{}'::TEXT[])
      WHEN 'ne' THEN
        v_user_value != (v_expected_value#>>'{}'::TEXT[])
      WHEN 'in' THEN
        v_user_value = ANY(
          SELECT jsonb_array_elements_text(v_expected_value)
        )
      WHEN 'not_in' THEN
        v_user_value != ALL(
          SELECT jsonb_array_elements_text(v_expected_value)
        )
      WHEN 'gt' THEN
        (v_user_value::NUMERIC) > (v_expected_value#>>'{}'::TEXT[])::NUMERIC
      WHEN 'gte' THEN
        (v_user_value::NUMERIC) >= (v_expected_value#>>'{}'::TEXT[])::NUMERIC
      WHEN 'lt' THEN
        (v_user_value::NUMERIC) < (v_expected_value#>>'{}'::TEXT[])::NUMERIC
      WHEN 'lte' THEN
        (v_user_value::NUMERIC) <= (v_expected_value#>>'{}'::TEXT[])::NUMERIC
      ELSE
        FALSE
    END;

  -- Type 2: Compound AND {"all": [...]}
  ELSIF p_predicate ? 'all' THEN
    SELECT bool_and(predicate_match(p_user_id, sub_pred))
    INTO v_result
    FROM jsonb_array_elements(p_predicate->'all') sub_pred;
    RETURN COALESCE(v_result, FALSE);

  -- Type 3: Compound OR {"any": [...]}
  ELSIF p_predicate ? 'any' THEN
    SELECT bool_or(predicate_match(p_user_id, sub_pred))
    INTO v_result
    FROM jsonb_array_elements(p_predicate->'any') sub_pred;
    RETURN COALESCE(v_result, FALSE);

  -- Type 4: Negation {"not": {...}}
  ELSIF p_predicate ? 'not' THEN
    RETURN NOT predicate_match(p_user_id, p_predicate->'not');

  ELSE
    -- Unknown predicate format
    RETURN FALSE;
  END IF;
END;
$$;

COMMENT ON FUNCTION predicate_match IS
  'Evaluates a JSONB predicate against user traits. Supports: eq, ne, in, not_in, gt, gte, lt, lte, all, any, not';

-- =====================================================
-- 2. CACHE INVALIDATION TRIGGERS
-- =====================================================

-- Function to invalidate layout cache
CREATE OR REPLACE FUNCTION invalidate_layout_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM user_layout_cache
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on user_traits changes
DROP TRIGGER IF EXISTS trigger_invalidate_cache_on_trait_change ON user_traits;
CREATE TRIGGER trigger_invalidate_cache_on_trait_change
AFTER INSERT OR UPDATE OR DELETE ON user_traits
FOR EACH ROW
EXECUTE FUNCTION invalidate_layout_cache();

COMMENT ON TRIGGER trigger_invalidate_cache_on_trait_change ON user_traits IS
  'Invalidates cached layouts when user traits change';

-- Trigger on user_features changes
DROP TRIGGER IF EXISTS trigger_invalidate_cache_on_feature_change ON user_features;
CREATE TRIGGER trigger_invalidate_cache_on_feature_change
AFTER INSERT OR UPDATE OR DELETE ON user_features
FOR EACH ROW
EXECUTE FUNCTION invalidate_layout_cache();

-- Function to invalidate ALL caches when rules change
CREATE OR REPLACE FUNCTION invalidate_all_layout_caches()
RETURNS TRIGGER AS $$
BEGIN
  -- Rules affect all users, clear entire cache
  TRUNCATE user_layout_cache;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on personalization_rules changes
DROP TRIGGER IF EXISTS trigger_invalidate_all_caches_on_rule_change ON personalization_rules;
CREATE TRIGGER trigger_invalidate_all_caches_on_rule_change
AFTER INSERT OR UPDATE OR DELETE ON personalization_rules
FOR EACH ROW
EXECUTE FUNCTION invalidate_all_layout_caches();

COMMENT ON TRIGGER trigger_invalidate_all_caches_on_rule_change ON personalization_rules IS
  'Clears all cached layouts when rules change (affects all users)';

-- =====================================================
-- 3. DASHBOARD PERFORMANCE - MATERIALIZED VIEW
-- =====================================================

-- Drop if exists
DROP MATERIALIZED VIEW IF EXISTS user_dashboard_metrics CASCADE;

-- Create high-performance dashboard view
CREATE MATERIALIZED VIEW user_dashboard_metrics AS
SELECT
  fe.user_id,
  CURRENT_DATE as metric_date,

  -- Nutrition totals for today
  COALESCE(SUM(fe.calories) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE), 0) as calories_today,
  COALESCE(SUM(fe.protein) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE), 0) as protein_today,
  COALESCE(SUM(fe.carbs) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE), 0) as carbs_today,
  COALESCE(SUM(fe.fat) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE), 0) as fat_today,
  COALESCE(SUM(fe.fiber) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE), 0) as fiber_today,
  COALESCE(COUNT(*) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE), 0) as meals_today,

  -- Meal type breakdown
  COALESCE(COUNT(*) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE AND fe.meal_type = 'breakfast'), 0) as breakfast_count,
  COALESCE(COUNT(*) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE AND fe.meal_type = 'lunch'), 0) as lunch_count,
  COALESCE(COUNT(*) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE AND fe.meal_type = 'dinner'), 0) as dinner_count,
  COALESCE(COUNT(*) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE AND fe.meal_type = 'snack'), 0) as snack_count,

  -- Plant-based protein (for vegans)
  COALESCE(SUM(fe.protein) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE AND fe.is_plant_based = TRUE), 0) as plant_protein_today,

  -- Quality distribution
  COALESCE(COUNT(*) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE AND fe.quality_tier = 'elite'), 0) as elite_meals_today,
  COALESCE(COUNT(*) FILTER (WHERE DATE(fe.consumed_at) = CURRENT_DATE AND fe.quality_tier = 'good'), 0) as good_meals_today,

  -- Carbon savings (for vegan users)
  COALESCE((
    SELECT uem.carbon_saved_kg_today
    FROM user_environmental_metrics uem
    WHERE uem.user_id = fe.user_id
      AND uem.date = CURRENT_DATE
    LIMIT 1
  ), 0) as carbon_saved_today,

  -- Streaks (best current streak)
  COALESCE((
    SELECT MAX(hs.current_streak)
    FROM habit_stacks hs
    WHERE hs.user_id = fe.user_id
  ), 0) as best_streak,

  -- XP and level
  COALESCE((
    SELECT uxp.current_level
    FROM user_xp_levels uxp
    WHERE uxp.user_id = fe.user_id
    LIMIT 1
  ), 1) as current_level,

  COALESCE((
    SELECT uxp.current_xp
    FROM user_xp_levels uxp
    WHERE uxp.user_id = fe.user_id
    LIMIT 1
  ), 0) as current_xp,

  NOW() as last_updated

FROM food_entries fe
GROUP BY fe.user_id;

-- Create unique index on user_id for fast lookups
CREATE UNIQUE INDEX idx_dashboard_metrics_user ON user_dashboard_metrics(user_id);

COMMENT ON MATERIALIZED VIEW user_dashboard_metrics IS
  'Pre-aggregated dashboard metrics for fast queries. Refresh every 5 minutes.';

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_dashboard_metrics;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_dashboard_metrics IS
  'Refreshes dashboard metrics materialized view. Call every 5 minutes via cron.';

-- Grant access
GRANT SELECT ON user_dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_dashboard_metrics TO service_role;

-- =====================================================
-- 4. TRAIT CONFIDENCE UPDATE FUNCTIONS
-- =====================================================

-- Update trait confidence based on evidence
CREATE OR REPLACE FUNCTION update_trait_confidence(
  p_user_id UUID,
  p_trait_key TEXT,
  p_evidence_strength NUMERIC  -- 0.1 = weak, 1.0 = strong evidence
) RETURNS VOID AS $$
BEGIN
  -- Increase confidence, max 1.0
  UPDATE user_traits
  SET
    confidence = LEAST(confidence + (p_evidence_strength * 0.1), 1.0),
    updated_at = NOW()
  WHERE user_id = p_user_id AND trait_key = p_trait_key;

  -- If trait doesn't exist, create it with low confidence
  IF NOT FOUND THEN
    RAISE NOTICE 'Trait % not found for user %, skipping confidence update', p_trait_key, p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_trait_confidence IS
  'Increases trait confidence based on behavioral evidence (0.1-1.0)';

-- Decrease trait confidence (when evidence contradicts)
CREATE OR REPLACE FUNCTION decrease_trait_confidence(
  p_user_id UUID,
  p_trait_key TEXT,
  p_evidence_strength NUMERIC DEFAULT 0.2
) RETURNS VOID AS $$
BEGIN
  UPDATE user_traits
  SET
    confidence = GREATEST(confidence - (p_evidence_strength * 0.1), 0.0),
    updated_at = NOW()
  WHERE user_id = p_user_id AND trait_key = p_trait_key;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION decrease_trait_confidence IS
  'Decreases trait confidence when behavior contradicts the trait';

-- =====================================================
-- 5. AI TRAIT EVOLUTION - BEHAVIORAL DETECTION
-- =====================================================

-- Detect emotional eating pattern
CREATE OR REPLACE FUNCTION detect_emotional_eating_pattern(
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_emotional_meal_count INT;
  v_total_meal_count INT;
  v_risk_level TEXT;
  v_confidence NUMERIC;
BEGIN
  -- Count meals with negative mood in last 7 days
  SELECT
    COUNT(*) FILTER (WHERE mc.mood_before IN ('stressed', 'sad', 'anxious', 'bored')),
    COUNT(*)
  INTO v_emotional_meal_count, v_total_meal_count
  FROM mood_check_ins mc
  WHERE mc.user_id = p_user_id
    AND mc.created_at > NOW() - INTERVAL '7 days'
    AND mc.food_entry_id IS NOT NULL;

  -- Need at least 5 meals to detect pattern
  IF v_total_meal_count < 5 THEN
    RETURN;
  END IF;

  -- Calculate risk level and confidence
  IF v_emotional_meal_count::FLOAT / v_total_meal_count > 0.5 THEN
    v_risk_level := 'high';
    v_confidence := 0.8;
  ELSIF v_emotional_meal_count::FLOAT / v_total_meal_count > 0.3 THEN
    v_risk_level := 'medium';
    v_confidence := 0.6;
  ELSIF v_emotional_meal_count::FLOAT / v_total_meal_count > 0.15 THEN
    v_risk_level := 'low';
    v_confidence := 0.4;
  ELSE
    v_risk_level := 'none';
    v_confidence := 0.9;
  END IF;

  -- Update or insert trait
  INSERT INTO user_traits (user_id, trait_key, trait_value, confidence, source, version)
  VALUES (p_user_id, 'emotional_eating_risk', v_risk_level, v_confidence, 'ai_detection', 1)
  ON CONFLICT (user_id, trait_key)
  DO UPDATE SET
    trait_value = EXCLUDED.trait_value,
    confidence = GREATEST(user_traits.confidence, EXCLUDED.confidence),
    source = 'ai_detection',
    version = user_traits.version + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_emotional_eating_pattern IS
  'AI detection: Analyzes mood check-ins to detect emotional eating patterns';

-- Detect meal timing pattern
CREATE OR REPLACE FUNCTION detect_meal_timing_pattern(
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_night_meals INT;
  v_total_meals INT;
  v_pattern TEXT;
BEGIN
  -- Count meals in last 14 days
  SELECT
    COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM consumed_at) >= 21),  -- After 9pm
    COUNT(*)
  INTO v_night_meals, v_total_meals
  FROM food_entries
  WHERE user_id = p_user_id
    AND consumed_at > NOW() - INTERVAL '14 days';

  IF v_total_meals < 10 THEN
    RETURN;
  END IF;

  -- Classify pattern
  IF v_night_meals::FLOAT / v_total_meals > 0.3 THEN
    v_pattern := 'night_eater';
  ELSE
    v_pattern := 'consistent';
  END IF;

  -- Update trait
  INSERT INTO user_traits (user_id, trait_key, trait_value, confidence, source, version)
  VALUES (p_user_id, 'meal_timing_pattern', v_pattern, 0.6, 'ai_detection', 1)
  ON CONFLICT (user_id, trait_key)
  DO UPDATE SET
    trait_value = EXCLUDED.trait_value,
    confidence = LEAST(user_traits.confidence + 0.1, 0.9),
    version = user_traits.version + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_meal_timing_pattern IS
  'AI detection: Identifies meal timing patterns (night eating, consistent, etc)';

-- Run all AI trait detections for a user
CREATE OR REPLACE FUNCTION run_ai_trait_detection(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_results JSONB;
BEGIN
  -- Run all detection functions
  PERFORM detect_emotional_eating_pattern(p_user_id);
  PERFORM detect_meal_timing_pattern(p_user_id);

  -- Return updated traits
  SELECT jsonb_agg(
    jsonb_build_object(
      'trait_key', trait_key,
      'trait_value', trait_value,
      'confidence', confidence,
      'source', source
    )
  ) INTO v_results
  FROM user_traits
  WHERE user_id = p_user_id AND source = 'ai_detection';

  RETURN COALESCE(v_results, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION run_ai_trait_detection IS
  'Runs all AI trait detection functions for a user. Returns detected traits.';

GRANT EXECUTE ON FUNCTION run_ai_trait_detection TO authenticated;

-- =====================================================
-- 6. PERFORMANCE MONITORING
-- =====================================================

-- Track layout computation performance
CREATE TABLE IF NOT EXISTS layout_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  layout_key TEXT,
  area TEXT,
  computation_time_ms INT,
  cache_hit BOOLEAN,
  rules_evaluated INT,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_layout_perf_measured ON layout_performance_metrics(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_layout_perf_user ON layout_performance_metrics(user_id);

COMMENT ON TABLE layout_performance_metrics IS
  'Tracks performance of layout selection function for monitoring';

-- Enhanced select_ui_layout with performance tracking
CREATE OR REPLACE FUNCTION select_ui_layout_with_metrics(
  p_user_id UUID,
  p_area TEXT DEFAULT 'home',
  p_force_refresh BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_computation_ms INT;
  v_cached_layout JSONB;
  v_cache_age INTERVAL;
  v_cache_hit BOOLEAN := FALSE;
  v_matching_rule RECORD;
  v_layout_key TEXT;
  v_layout JSONB;
  v_final_result JSONB;
  v_rules_evaluated INT := 0;
BEGIN
  v_start_time := clock_timestamp();

  -- Check cache
  IF NOT p_force_refresh THEN
    SELECT layout_json, AGE(NOW(), computed_at)
    INTO v_cached_layout, v_cache_age
    FROM user_layout_cache
    WHERE user_id = p_user_id AND area = p_area;

    IF v_cached_layout IS NOT NULL AND v_cache_age < INTERVAL '5 minutes' THEN
      v_cache_hit := TRUE;
      v_final_result := v_cached_layout;

      -- Quick return for cache hit
      v_end_time := clock_timestamp();
      v_computation_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INT;

      INSERT INTO layout_performance_metrics
        (user_id, layout_key, area, computation_time_ms, cache_hit, rules_evaluated)
      VALUES
        (p_user_id, v_cached_layout->>'layout_key', p_area, v_computation_ms, TRUE, 0);

      RETURN v_final_result;
    END IF;
  END IF;

  -- Evaluate rules
  SELECT effects INTO v_matching_rule
  FROM personalization_rules
  WHERE active = TRUE
    AND predicate_match(p_user_id, predicate)
  ORDER BY priority ASC
  LIMIT 1;

  -- Count rules evaluated (simplified for now - just 1 if match found, 0 otherwise)
  v_rules_evaluated := CASE WHEN v_matching_rule IS NOT NULL THEN 1 ELSE 0 END;

  v_layout_key := COALESCE(v_matching_rule->>'home_layout', 'layout_default');

  -- Get layout
  SELECT components INTO v_layout
  FROM ui_layouts
  WHERE layout_key = v_layout_key AND area = p_area;

  IF v_layout IS NULL THEN
    RAISE EXCEPTION 'Layout not found: %', v_layout_key;
  END IF;

  -- Build result
  v_final_result := jsonb_build_object(
    'layout_key', v_layout_key,
    'area', p_area,
    'components', v_layout,
    'coach_persona', v_matching_rule->>'coach_persona',
    'computed_at', NOW()
  );

  -- Update cache
  INSERT INTO user_layout_cache (user_id, area, layout_json, computed_at)
  VALUES (p_user_id, p_area, v_final_result, NOW())
  ON CONFLICT (user_id, area)
  DO UPDATE SET layout_json = EXCLUDED.layout_json, computed_at = EXCLUDED.computed_at;

  -- Record performance
  v_end_time := clock_timestamp();
  v_computation_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INT;

  INSERT INTO layout_performance_metrics
    (user_id, layout_key, area, computation_time_ms, cache_hit, rules_evaluated)
  VALUES
    (p_user_id, v_layout_key, p_area, v_computation_ms, FALSE, v_rules_evaluated);

  RETURN v_final_result;
END;
$$;

COMMENT ON FUNCTION select_ui_layout_with_metrics IS
  'Enhanced layout selection with performance monitoring';

GRANT EXECUTE ON FUNCTION select_ui_layout_with_metrics TO authenticated;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION predicate_match TO authenticated;
GRANT EXECUTE ON FUNCTION update_trait_confidence TO authenticated;
GRANT EXECUTE ON FUNCTION decrease_trait_confidence TO authenticated;
GRANT EXECUTE ON FUNCTION detect_emotional_eating_pattern TO service_role;
GRANT EXECUTE ON FUNCTION detect_meal_timing_pattern TO service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all functions exist
SELECT
  'Functions Created' as status,
  COUNT(*) FILTER (WHERE proname = 'predicate_match') as predicate_match,
  COUNT(*) FILTER (WHERE proname = 'invalidate_layout_cache') as cache_invalidation,
  COUNT(*) FILTER (WHERE proname = 'refresh_dashboard_metrics') as dashboard_refresh,
  COUNT(*) FILTER (WHERE proname = 'update_trait_confidence') as trait_confidence,
  COUNT(*) FILTER (WHERE proname = 'detect_emotional_eating_pattern') as ai_detection,
  COUNT(*) FILTER (WHERE proname = 'run_ai_trait_detection') as ai_runner,
  COUNT(*) FILTER (WHERE proname = 'select_ui_layout_with_metrics') as perf_monitoring
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace;

-- =====================================================
-- DONE: Dynamic UI System Complete
-- =====================================================

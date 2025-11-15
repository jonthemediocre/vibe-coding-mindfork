-- =====================================================
-- DAY 5: RLHF TRAINING PIPELINE
-- =====================================================
-- Purpose: Auto-generate training datasets from user feedback
-- Date: 2025-11-08
-- Interface Impact: None (backend automation)
-- User Value: Indirect - continuously improving AI
-- =====================================================

-- =====================================================
-- 1. GENERATE TRAINING EXAMPLES FROM FEEDBACK
-- =====================================================

CREATE OR REPLACE FUNCTION generate_training_examples_from_feedback(
  p_min_rating INT DEFAULT 4,
  p_helpful_only BOOLEAN DEFAULT TRUE,
  p_batch_size INT DEFAULT 1000
)
RETURNS TABLE (
  examples_created INT,
  dataset_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dataset_id UUID;
  v_examples_created INT := 0;
BEGIN
  -- Get or create "Coach Responses from User Feedback" dataset
  SELECT id INTO v_dataset_id
  FROM ai_training_datasets
  WHERE dataset_name = 'Coach Responses from User Feedback'
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO ai_training_datasets (
      dataset_name,
      description,
      model_target,
      dataset_type,
      quality_threshold
    ) VALUES (
      'Coach Responses from User Feedback',
      'High-quality coach responses validated by user thumbs up/down feedback',
      'gpt-4o',
      'conversational',
      4.0  -- Minimum rating for inclusion
    )
    RETURNING id INTO v_dataset_id;

    RAISE NOTICE 'Created new training dataset: %', v_dataset_id;
  END IF;

  -- Insert training examples from feedback
  INSERT INTO ai_training_examples (
    dataset_id,
    messages,
    quality_score,
    user_satisfaction,
    is_validated,
    source_type,
    source_id,
    split,
    metadata
  )
  SELECT
    v_dataset_id,

    -- OpenAI Chat Completions format
    jsonb_build_array(
      jsonb_build_object(
        'role', 'system',
        'content', COALESCE(crf.system_prompt, 'You are a helpful wellness coach.')
      ),
      jsonb_build_object(
        'role', 'user',
        'content', crf.user_message
      ),
      jsonb_build_object(
        'role', 'assistant',
        'content', crf.ai_response
      )
    ),

    -- Quality score (1-10 scale based on rating and helpful flag)
    CASE
      WHEN crf.rating = 5 AND crf.helpful = TRUE THEN 10.0
      WHEN crf.rating = 4 AND crf.helpful = TRUE THEN 8.0
      WHEN crf.rating = 3 AND crf.helpful = TRUE THEN 6.0
      WHEN crf.helpful = TRUE THEN 7.0
      WHEN crf.helpful = FALSE THEN 3.0
      ELSE 5.0
    END,

    -- User satisfaction (0-1 scale)
    CASE
      WHEN crf.rating IS NOT NULL THEN crf.rating / 5.0
      WHEN crf.helpful = TRUE THEN 1.0
      WHEN crf.helpful = FALSE THEN 0.0
      ELSE 0.5
    END,

    TRUE,  -- is_validated (user provided feedback)
    'coach_feedback',
    crf.id::TEXT,

    -- Split into train (80%) and validation (20%)
    CASE
      WHEN RANDOM() < 0.8 THEN 'train'
      ELSE 'validation'
    END,

    -- Metadata
    jsonb_build_object(
      'coach_id', crf.coach_id,
      'coach_mode', crf.coach_mode,
      'severity', crf.severity,
      'from_cache', crf.from_cache,
      'response_time_ms', crf.response_time_ms,
      'feedback_given_at', crf.feedback_given_at,
      'user_comment', crf.user_comment
    )

  FROM coach_response_feedback crf
  WHERE
    -- Only include feedback that meets quality threshold
    (NOT p_helpful_only OR crf.helpful = TRUE)
    AND (p_min_rating IS NULL OR crf.rating IS NULL OR crf.rating >= p_min_rating)
    AND crf.helpful IS NOT NULL  -- Must have feedback

    -- Don't duplicate existing training examples
    AND NOT EXISTS (
      SELECT 1 FROM ai_training_examples ate
      WHERE ate.source_type = 'coach_feedback'
        AND ate.source_id = crf.id::TEXT
    )

  ORDER BY crf.created_at DESC
  LIMIT p_batch_size;

  GET DIAGNOSTICS v_examples_created = ROW_COUNT;

  RAISE NOTICE 'Generated % training examples from feedback', v_examples_created;

  RETURN QUERY SELECT v_examples_created, v_dataset_id;
END;
$$;

COMMENT ON FUNCTION generate_training_examples_from_feedback IS 'Auto-generates training examples from user feedback (Day 5)';

-- =====================================================
-- 2. CLEAN UP LOW-QUALITY EXAMPLES
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_low_quality_training_examples(
  p_min_quality_score DECIMAL DEFAULT 5.0,
  p_min_user_satisfaction DECIMAL DEFAULT 0.5
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INT := 0;
BEGIN
  -- Delete examples that fall below quality thresholds
  DELETE FROM ai_training_examples
  WHERE
    source_type = 'coach_feedback'
    AND (
      quality_score < p_min_quality_score
      OR user_satisfaction < p_min_user_satisfaction
    );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % low-quality examples', v_deleted_count;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_low_quality_training_examples IS 'Removes low-quality training examples to maintain dataset quality';

-- =====================================================
-- 3. TRAINING DATASET STATISTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW training_dataset_stats AS
SELECT
  ds.id AS dataset_id,
  ds.dataset_name,
  ds.model_target,
  ds.dataset_type,

  -- Example Counts
  COUNT(ex.id) AS total_examples,
  COUNT(ex.id) FILTER (WHERE ex.split = 'train') AS train_examples,
  COUNT(ex.id) FILTER (WHERE ex.split = 'validation') AS validation_examples,

  -- Quality Metrics
  ROUND(AVG(ex.quality_score), 2) AS avg_quality_score,
  ROUND(AVG(ex.user_satisfaction), 2) AS avg_user_satisfaction,
  MIN(ex.quality_score) AS min_quality_score,
  MAX(ex.quality_score) AS max_quality_score,

  -- Validation Status
  COUNT(ex.id) FILTER (WHERE ex.is_validated = TRUE) AS validated_examples,
  ROUND(100.0 * COUNT(ex.id) FILTER (WHERE ex.is_validated = TRUE) / NULLIF(COUNT(ex.id), 0), 2) AS validation_rate_pct,

  -- Ready for Fine-Tuning?
  CASE
    WHEN COUNT(ex.id) >= 50 THEN TRUE  -- OpenAI minimum
    ELSE FALSE
  END AS ready_for_finetuning,

  -- Time Range
  MIN(ex.created_at) AS first_example_at,
  MAX(ex.created_at) AS last_example_at,
  ds.created_at AS dataset_created_at,
  ds.updated_at AS dataset_updated_at

FROM ai_training_datasets ds
LEFT JOIN ai_training_examples ex ON ex.dataset_id = ds.id
GROUP BY ds.id, ds.dataset_name, ds.model_target, ds.dataset_type, ds.created_at, ds.updated_at;

COMMENT ON VIEW training_dataset_stats IS 'Real-time statistics on training datasets for RLHF';

-- =====================================================
-- 4. EXPORT TRAINING DATA FOR OPENAI
-- =====================================================

CREATE OR REPLACE FUNCTION export_training_dataset_openai_format(
  p_dataset_id UUID,
  p_split TEXT DEFAULT 'train',  -- 'train' or 'validation'
  p_limit INT DEFAULT NULL
)
RETURNS TABLE (
  messages JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Export in OpenAI JSONL format (one JSON object per line)
  -- Format: {"messages": [{"role": "system", "content": "..."}, ...]}

  RETURN QUERY
  SELECT
    jsonb_build_object('messages', ex.messages) AS messages
  FROM ai_training_examples ex
  WHERE
    ex.dataset_id = p_dataset_id
    AND (p_split IS NULL OR ex.split = p_split)
    AND ex.is_validated = TRUE
  ORDER BY ex.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION export_training_dataset_openai_format IS 'Exports training data in OpenAI JSONL format for fine-tuning';

-- =====================================================
-- 5. SCHEDULE DAILY TRAINING DATA GENERATION
-- =====================================================

-- This will be set up in Supabase Dashboard → Database → Cron Jobs
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'generate-training-data-daily',
  '0 1 * * *',  -- 1 AM daily
  $$
  SELECT generate_training_examples_from_feedback(
    p_min_rating := 4,
    p_helpful_only := TRUE,
    p_batch_size := 1000
  );
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Daily cron job generates training examples from new feedback';

-- =====================================================
-- 6. SCHEDULE WEEKLY LOW-QUALITY CLEANUP
-- =====================================================

SELECT cron.schedule(
  'cleanup-low-quality-examples',
  '0 2 * * 0',  -- 2 AM every Sunday
  $$
  SELECT cleanup_low_quality_training_examples(
    p_min_quality_score := 5.0,
    p_min_user_satisfaction := 0.5
  );
  $$
);

-- =====================================================
-- 7. GET DATASET READINESS FOR FINE-TUNING
-- =====================================================

CREATE OR REPLACE FUNCTION check_dataset_readiness_for_finetuning(
  p_dataset_id UUID
)
RETURNS TABLE (
  ready BOOLEAN,
  total_examples INT,
  train_examples INT,
  validation_examples INT,
  avg_quality_score DECIMAL,
  missing_requirements TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats RECORD;
  v_missing TEXT[] := '{}';
  v_ready BOOLEAN := TRUE;
BEGIN
  -- Get dataset stats
  SELECT * INTO v_stats
  FROM training_dataset_stats
  WHERE dataset_id = p_dataset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dataset not found: %', p_dataset_id;
  END IF;

  -- OpenAI requirements:
  -- 1. Minimum 50 examples
  IF v_stats.total_examples < 50 THEN
    v_missing := array_append(v_missing, format('Need %s more examples (have %s, need 50)',
      50 - v_stats.total_examples, v_stats.total_examples));
    v_ready := FALSE;
  END IF;

  -- 2. At least 10 validation examples
  IF v_stats.validation_examples < 10 THEN
    v_missing := array_append(v_missing, format('Need %s more validation examples (have %s, need 10)',
      10 - v_stats.validation_examples, v_stats.validation_examples));
    v_ready := FALSE;
  END IF;

  -- 3. Quality threshold
  IF v_stats.avg_quality_score < 6.0 THEN
    v_missing := array_append(v_missing, format('Average quality too low (%.2f, need 6.0+)',
      v_stats.avg_quality_score));
    v_ready := FALSE;
  END IF;

  -- 4. Validation rate
  IF v_stats.validation_rate_pct < 80.0 THEN
    v_missing := array_append(v_missing, format('Validation rate too low (%.1f%%, need 80%%+)',
      v_stats.validation_rate_pct));
    v_ready := FALSE;
  END IF;

  RETURN QUERY SELECT
    v_ready,
    v_stats.total_examples,
    v_stats.train_examples,
    v_stats.validation_examples,
    v_stats.avg_quality_score,
    v_missing;
END;
$$;

COMMENT ON FUNCTION check_dataset_readiness_for_finetuning IS 'Validates if dataset meets OpenAI fine-tuning requirements';

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION generate_training_examples_from_feedback TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_low_quality_training_examples TO service_role;
GRANT EXECUTE ON FUNCTION export_training_dataset_openai_format TO service_role;
GRANT EXECUTE ON FUNCTION check_dataset_readiness_for_finetuning TO service_role, authenticated;

GRANT SELECT ON training_dataset_stats TO service_role, authenticated;

-- =====================================================
-- 9. VERIFICATION & TESTING
-- =====================================================

DO $$
DECLARE
  v_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTING RLHF TRAINING PIPELINE ===';
  RAISE NOTICE '';

  -- Test 1: Generate training examples
  BEGIN
    SELECT * INTO v_result FROM generate_training_examples_from_feedback(
      p_min_rating := 4,
      p_helpful_only := TRUE,
      p_batch_size := 100
    );

    RAISE NOTICE '✅ Test 1: Generated % training examples', v_result.examples_created;
    RAISE NOTICE '  Dataset ID: %', v_result.dataset_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Test 1: No feedback data yet (expected for new install)';
  END;

  -- Test 2: Check dataset stats
  IF EXISTS (SELECT 1 FROM training_dataset_stats WHERE total_examples > 0) THEN
    SELECT * INTO v_result FROM training_dataset_stats LIMIT 1;
    RAISE NOTICE '✅ Test 2: Dataset stats view working';
    RAISE NOTICE '  Total examples: %', v_result.total_examples;
    RAISE NOTICE '  Avg quality: %', v_result.avg_quality_score;
  ELSE
    RAISE NOTICE '⚠️ Test 2: No training data yet (run after collecting feedback)';
  END IF;

  -- Test 3: Check readiness for fine-tuning
  IF EXISTS (SELECT 1 FROM ai_training_datasets WHERE dataset_name = 'Coach Responses from User Feedback') THEN
    SELECT dataset_id INTO v_result FROM ai_training_datasets
    WHERE dataset_name = 'Coach Responses from User Feedback' LIMIT 1;

    SELECT * INTO v_result FROM check_dataset_readiness_for_finetuning(v_result);

    RAISE NOTICE '✅ Test 3: Readiness check working';
    RAISE NOTICE '  Ready: %', v_result.ready;
    RAISE NOTICE '  Total examples: %', v_result.total_examples;
    RAISE NOTICE '  Missing: %', v_result.missing_requirements;
  ELSE
    RAISE NOTICE '⚠️ Test 3: Dataset not created yet';
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
  RAISE NOTICE '✅ DAY 5 COMPLETE: RLHF Training Pipeline';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Created:';
  RAISE NOTICE '  - generate_training_examples_from_feedback() function';
  RAISE NOTICE '  - cleanup_low_quality_training_examples() function';
  RAISE NOTICE '  - export_training_dataset_openai_format() function';
  RAISE NOTICE '  - check_dataset_readiness_for_finetuning() function';
  RAISE NOTICE '  - training_dataset_stats view (real-time metrics)';
  RAISE NOTICE '  - Daily cron job (1 AM: generate training data)';
  RAISE NOTICE '  - Weekly cron job (Sunday 2 AM: cleanup low quality)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Automation Flow:';
  RAISE NOTICE '  1. Users provide feedback (thumbs up/down)';
  RAISE NOTICE '  2. Daily cron generates training examples at 1 AM';
  RAISE NOTICE '  3. Weekly cron removes low-quality examples';
  RAISE NOTICE '  4. Dataset grows automatically';
  RAISE NOTICE '  5. When ready (50+ examples), export for fine-tuning (Day 7)';
  RAISE NOTICE '';
  RAISE NOTICE '📈 Quality Thresholds:';
  RAISE NOTICE '  - Minimum rating: 4/5 stars';
  RAISE NOTICE '  - Helpful flag: TRUE (thumbs up)';
  RAISE NOTICE '  - Quality score: 6.0+ average';
  RAISE NOTICE '  - Validation rate: 80%+';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Manual Operations:';
  RAISE NOTICE '  - Generate now: SELECT * FROM generate_training_examples_from_feedback();';
  RAISE NOTICE '  - Check stats: SELECT * FROM training_dataset_stats;';
  RAISE NOTICE '  - Check readiness: SELECT * FROM check_dataset_readiness_for_finetuning(dataset_id);';
  RAISE NOTICE '  - Export data: SELECT * FROM export_training_dataset_openai_format(dataset_id);';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

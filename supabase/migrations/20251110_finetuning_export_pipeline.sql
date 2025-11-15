-- =====================================================
-- DAY 7: FINE-TUNING EXPORT PIPELINE
-- =====================================================
-- Purpose: Export training data and create OpenAI fine-tuning jobs
-- Date: 2025-11-10
-- Interface Impact: None (backend automation)
-- User Value: Indirect - continuously improving custom model
-- =====================================================

-- =====================================================
-- 1. EXPORT TRAINING DATA TO OPENAI JSONL FORMAT
-- =====================================================

CREATE OR REPLACE FUNCTION export_training_dataset_openai_jsonl(
  p_dataset_id UUID,
  p_split TEXT DEFAULT 'train',
  p_min_quality_score DECIMAL DEFAULT 6.0,
  p_limit INT DEFAULT NULL
)
RETURNS TABLE (
  jsonl_line TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Export in OpenAI JSONL format
  -- Each line is a JSON object: {"messages": [...]}

  RETURN QUERY
  SELECT
    -- Convert to single-line JSON (no newlines inside)
    jsonb_build_object(
      'messages', ex.messages
    )::TEXT AS jsonl_line
  FROM ai_training_examples ex
  WHERE
    ex.dataset_id = p_dataset_id
    AND (p_split IS NULL OR ex.split = p_split)
    AND ex.is_validated = TRUE
    AND ex.quality_score >= p_min_quality_score
  ORDER BY ex.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION export_training_dataset_openai_jsonl IS 'Exports training data in OpenAI JSONL format for fine-tuning API';

-- =====================================================
-- 2. CREATE FINE-TUNING JOB RECORD
-- =====================================================

CREATE OR REPLACE FUNCTION create_finetuning_job(
  p_dataset_id UUID,
  p_base_model TEXT DEFAULT 'gpt-4o-2024-08-06',
  p_hyperparameters JSONB DEFAULT NULL,
  p_suffix TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
  v_dataset_name TEXT;
  v_train_count INT;
  v_val_count INT;
BEGIN
  -- Get dataset info
  SELECT
    ds.dataset_name,
    COUNT(*) FILTER (WHERE ex.split = 'train'),
    COUNT(*) FILTER (WHERE ex.split = 'validation')
  INTO v_dataset_name, v_train_count, v_val_count
  FROM ai_training_datasets ds
  LEFT JOIN ai_training_examples ex ON ex.dataset_id = ds.id
  WHERE ds.id = p_dataset_id
    AND ex.is_validated = TRUE
    AND ex.quality_score >= 6.0
  GROUP BY ds.id, ds.dataset_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dataset not found or has no validated examples: %', p_dataset_id;
  END IF;

  -- OpenAI requires minimum 10 examples
  IF v_train_count < 10 THEN
    RAISE EXCEPTION 'Not enough training examples: % (need at least 10)', v_train_count;
  END IF;

  -- Create job record
  INSERT INTO ai_finetuning_jobs (
    dataset_id,
    base_model,
    status,
    hyperparameters,
    model_suffix,
    training_file_size_bytes,
    validation_file_size_bytes
  ) VALUES (
    p_dataset_id,
    p_base_model,
    'pending',
    COALESCE(p_hyperparameters, jsonb_build_object(
      'n_epochs', 3,
      'batch_size', 'auto',
      'learning_rate_multiplier', 'auto'
    )),
    COALESCE(p_suffix, format('vibe_%s', EXTRACT(EPOCH FROM NOW())::BIGINT)),
    v_train_count * 500,  -- Rough estimate: 500 bytes per example
    v_val_count * 500
  )
  RETURNING id INTO v_job_id;

  RAISE NOTICE 'Created fine-tuning job: % (dataset: %, train: %, val: %)',
    v_job_id, v_dataset_name, v_train_count, v_val_count;

  RETURN v_job_id;
END;
$$;

COMMENT ON FUNCTION create_finetuning_job IS 'Creates a fine-tuning job record (call OpenAI API separately to start)';

-- =====================================================
-- 3. UPDATE FINE-TUNING JOB STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION update_finetuning_job_status(
  p_job_id UUID,
  p_openai_job_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_fine_tuned_model TEXT DEFAULT NULL,
  p_training_metrics JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_finetuning_jobs
  SET
    openai_job_id = COALESCE(p_openai_job_id, openai_job_id),
    status = COALESCE(p_status, status),
    fine_tuned_model = COALESCE(p_fine_tuned_model, fine_tuned_model),
    training_metrics = COALESCE(p_training_metrics, training_metrics),
    error_message = p_error_message,
    completed_at = CASE
      WHEN p_status IN ('succeeded', 'failed', 'cancelled') THEN NOW()
      ELSE completed_at
    END,
    updated_at = NOW()
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fine-tuning job not found: %', p_job_id;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION update_finetuning_job_status IS 'Updates fine-tuning job status from OpenAI API responses';

-- =====================================================
-- 4. GET LATEST FINE-TUNED MODEL
-- =====================================================

CREATE OR REPLACE FUNCTION get_latest_finetuned_model(
  p_base_model TEXT DEFAULT 'gpt-4o-2024-08-06'
)
RETURNS TABLE (
  model_id TEXT,
  job_id UUID,
  created_at TIMESTAMPTZ,
  training_examples INT,
  avg_quality_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ftj.fine_tuned_model AS model_id,
    ftj.id AS job_id,
    ftj.completed_at AS created_at,
    (
      SELECT COUNT(*)
      FROM ai_training_examples ex
      WHERE ex.dataset_id = ftj.dataset_id
        AND ex.split = 'train'
        AND ex.is_validated = TRUE
    )::INT AS training_examples,
    (
      SELECT ROUND(AVG(ex.quality_score), 2)
      FROM ai_training_examples ex
      WHERE ex.dataset_id = ftj.dataset_id
        AND ex.is_validated = TRUE
    ) AS avg_quality_score
  FROM ai_finetuning_jobs ftj
  WHERE
    ftj.base_model = p_base_model
    AND ftj.status = 'succeeded'
    AND ftj.fine_tuned_model IS NOT NULL
  ORDER BY ftj.completed_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_latest_finetuned_model IS 'Returns the most recent successfully fine-tuned model';

-- =====================================================
-- 5. FINE-TUNING JOB STATISTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW finetuning_job_stats AS
SELECT
  ftj.id AS job_id,
  ftj.base_model,
  ftj.status,
  ftj.fine_tuned_model,

  -- Dataset Info
  ds.dataset_name,
  COUNT(ex.id) FILTER (WHERE ex.split = 'train') AS train_examples,
  COUNT(ex.id) FILTER (WHERE ex.split = 'validation') AS val_examples,
  ROUND(AVG(ex.quality_score) FILTER (WHERE ex.split = 'train'), 2) AS avg_train_quality,

  -- Training Metrics (from OpenAI)
  ftj.training_metrics->>'train_loss' AS final_train_loss,
  ftj.training_metrics->>'train_accuracy' AS final_train_accuracy,
  ftj.training_metrics->>'valid_loss' AS final_val_loss,
  ftj.training_metrics->>'valid_accuracy' AS final_val_accuracy,

  -- Timing
  ftj.created_at AS job_created_at,
  ftj.started_at AS job_started_at,
  ftj.completed_at AS job_completed_at,
  EXTRACT(EPOCH FROM (ftj.completed_at - ftj.started_at))::INT AS training_duration_seconds,

  -- Status
  ftj.error_message

FROM ai_finetuning_jobs ftj
LEFT JOIN ai_training_datasets ds ON ds.id = ftj.dataset_id
LEFT JOIN ai_training_examples ex ON ex.dataset_id = ftj.dataset_id AND ex.is_validated = TRUE
GROUP BY
  ftj.id, ftj.base_model, ftj.status, ftj.fine_tuned_model,
  ds.dataset_name, ftj.training_metrics, ftj.created_at, ftj.started_at,
  ftj.completed_at, ftj.error_message
ORDER BY ftj.created_at DESC;

COMMENT ON VIEW finetuning_job_stats IS 'Statistics and metrics for all fine-tuning jobs';

-- =====================================================
-- 6. CHECK IF FINE-TUNING IS NEEDED
-- =====================================================

CREATE OR REPLACE FUNCTION should_create_finetuning_job(
  p_dataset_id UUID,
  p_min_new_examples INT DEFAULT 100,
  p_min_days_since_last_job INT DEFAULT 30
)
RETURNS TABLE (
  should_finetune BOOLEAN,
  reason TEXT,
  new_examples INT,
  days_since_last_job INT,
  last_job_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_job RECORD;
  v_new_examples INT;
  v_days_since INT;
  v_should_finetune BOOLEAN := FALSE;
  v_reason TEXT := '';
BEGIN
  -- Get last successful fine-tuning job for this dataset
  SELECT *
  INTO v_last_job
  FROM ai_finetuning_jobs
  WHERE dataset_id = p_dataset_id
    AND status = 'succeeded'
  ORDER BY completed_at DESC
  LIMIT 1;

  -- Count new examples since last job
  IF v_last_job.id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_new_examples
    FROM ai_training_examples
    WHERE dataset_id = p_dataset_id
      AND created_at > v_last_job.completed_at
      AND is_validated = TRUE
      AND quality_score >= 6.0;

    v_days_since := EXTRACT(DAY FROM NOW() - v_last_job.completed_at)::INT;
  ELSE
    -- No previous job, count all examples
    SELECT COUNT(*)
    INTO v_new_examples
    FROM ai_training_examples
    WHERE dataset_id = p_dataset_id
      AND is_validated = TRUE
      AND quality_score >= 6.0;

    v_days_since := 999;  -- Large number to trigger first job
  END IF;

  -- Decision logic
  IF v_new_examples >= p_min_new_examples AND v_days_since >= p_min_days_since_last_job THEN
    v_should_finetune := TRUE;
    v_reason := format('Sufficient new data: %s examples, %s days since last job', v_new_examples, v_days_since);
  ELSIF v_new_examples >= p_min_new_examples THEN
    v_should_finetune := FALSE;
    v_reason := format('Wait %s more days (only %s days since last job)', p_min_days_since_last_job - v_days_since, v_days_since);
  ELSIF v_days_since >= p_min_days_since_last_job THEN
    v_should_finetune := FALSE;
    v_reason := format('Need %s more examples (only %s new examples)', p_min_new_examples - v_new_examples, v_new_examples);
  ELSE
    v_should_finetune := FALSE;
    v_reason := format('Need %s more examples and %s more days', p_min_new_examples - v_new_examples, p_min_days_since_last_job - v_days_since);
  END IF;

  RETURN QUERY SELECT
    v_should_finetune,
    v_reason,
    v_new_examples,
    v_days_since,
    v_last_job.id;
END;
$$;

COMMENT ON FUNCTION should_create_finetuning_job IS 'Determines if enough new data exists to warrant a new fine-tuning job';

-- =====================================================
-- 7. SCHEDULE MONTHLY FINE-TUNING CHECK
-- =====================================================

-- This cron job checks if fine-tuning is needed monthly
SELECT cron.schedule(
  'check-finetuning-needed',
  '0 3 1 * *',  -- 3 AM on 1st of each month
  $$
  DO $$
  DECLARE
    v_dataset_id UUID;
    v_check RECORD;
  BEGIN
    -- Get main training dataset
    SELECT id INTO v_dataset_id
    FROM ai_training_datasets
    WHERE dataset_name = 'Coach Responses from User Feedback'
    LIMIT 1;

    IF v_dataset_id IS NULL THEN
      RAISE NOTICE 'Training dataset not found';
      RETURN;
    END IF;

    -- Check if fine-tuning is needed
    SELECT * INTO v_check
    FROM should_create_finetuning_job(v_dataset_id, 100, 30);

    IF v_check.should_finetune THEN
      RAISE NOTICE 'Fine-tuning recommended: %', v_check.reason;
      RAISE NOTICE 'New examples: %, Days since last: %', v_check.new_examples, v_check.days_since_last_job;
      RAISE NOTICE 'ACTION REQUIRED: Create fine-tuning job via Edge Function';
    ELSE
      RAISE NOTICE 'Fine-tuning not needed yet: %', v_check.reason;
    END IF;
  END $$;
  $$
);

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION export_training_dataset_openai_jsonl TO service_role;
GRANT EXECUTE ON FUNCTION create_finetuning_job TO service_role;
GRANT EXECUTE ON FUNCTION update_finetuning_job_status TO service_role;
GRANT EXECUTE ON FUNCTION get_latest_finetuned_model TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION should_create_finetuning_job TO service_role;

GRANT SELECT ON finetuning_job_stats TO service_role, authenticated;

-- =====================================================
-- 9. VERIFICATION & TESTING
-- =====================================================

DO $$
DECLARE
  v_dataset_id UUID;
  v_job_id UUID;
  v_check RECORD;
  v_export_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTING FINE-TUNING EXPORT PIPELINE ===';
  RAISE NOTICE '';

  -- Test 1: Get training dataset
  SELECT id INTO v_dataset_id
  FROM ai_training_datasets
  WHERE dataset_name = 'Coach Responses from User Feedback'
  LIMIT 1;

  IF v_dataset_id IS NOT NULL THEN
    RAISE NOTICE '✅ Test 1: Training dataset found (ID: %)', v_dataset_id;
  ELSE
    RAISE NOTICE '⚠️ Test 1: Training dataset not created yet (run Day 5 first)';
    RETURN;
  END IF;

  -- Test 2: Export training data
  SELECT COUNT(*) INTO v_export_count
  FROM export_training_dataset_openai_jsonl(v_dataset_id, 'train', 6.0, 10);

  IF v_export_count > 0 THEN
    RAISE NOTICE '✅ Test 2: Exported % training examples in JSONL format', v_export_count;
  ELSE
    RAISE NOTICE '⚠️ Test 2: No training data to export (need feedback first)';
  END IF;

  -- Test 3: Check if fine-tuning is needed
  SELECT * INTO v_check
  FROM should_create_finetuning_job(v_dataset_id, 50, 0);  -- Lower threshold for testing

  RAISE NOTICE '✅ Test 3: Fine-tuning check complete';
  RAISE NOTICE '  Should finetune: %', v_check.should_finetune;
  RAISE NOTICE '  Reason: %', v_check.reason;
  RAISE NOTICE '  New examples: %', v_check.new_examples;

  -- Test 4: Create job record (if enough data)
  IF v_check.new_examples >= 10 THEN
    BEGIN
      v_job_id := create_finetuning_job(
        p_dataset_id := v_dataset_id,
        p_base_model := 'gpt-4o-2024-08-06',
        p_suffix := 'test'
      );

      RAISE NOTICE '✅ Test 4: Fine-tuning job created (ID: %)', v_job_id;

      -- Clean up test job
      DELETE FROM ai_finetuning_jobs WHERE id = v_job_id;
      RAISE NOTICE '  (Test job deleted)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Test 4: Could not create job: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '⚠️ Test 4: Not enough data to create job (need 10+, have %)', v_check.new_examples;
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
  RAISE NOTICE '✅ DAY 7 COMPLETE: Fine-Tuning Export Pipeline';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Created:';
  RAISE NOTICE '  - export_training_dataset_openai_jsonl() function';
  RAISE NOTICE '  - create_finetuning_job() function';
  RAISE NOTICE '  - update_finetuning_job_status() function';
  RAISE NOTICE '  - get_latest_finetuned_model() function';
  RAISE NOTICE '  - should_create_finetuning_job() function';
  RAISE NOTICE '  - finetuning_job_stats view';
  RAISE NOTICE '  - Monthly cron job (1st of month, 3 AM)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Fine-Tuning Flow:';
  RAISE NOTICE '  1. Feedback collected daily (Day 4)';
  RAISE NOTICE '  2. Training data generated daily (Day 5)';
  RAISE NOTICE '  3. Monthly check if fine-tuning needed (100+ examples, 30+ days)';
  RAISE NOTICE '  4. If yes: Export JSONL, call OpenAI API (Edge Function)';
  RAISE NOTICE '  5. OpenAI trains model on their GPUs (hours/days)';
  RAISE NOTICE '  6. Update job status with fine-tuned model ID';
  RAISE NOTICE '  7. Use fine-tuned model in chat (replace gpt-4o)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Manual Operations:';
  RAISE NOTICE '  - Check readiness: SELECT * FROM should_create_finetuning_job(dataset_id);';
  RAISE NOTICE '  - Export data: SELECT * FROM export_training_dataset_openai_jsonl(dataset_id);';
  RAISE NOTICE '  - Create job: SELECT create_finetuning_job(dataset_id);';
  RAISE NOTICE '  - Check status: SELECT * FROM finetuning_job_stats;';
  RAISE NOTICE '  - Get latest model: SELECT * FROM get_latest_finetuned_model();';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Edge Function needed to actually call OpenAI API';
  RAISE NOTICE '   (This migration only handles data export and job tracking)';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

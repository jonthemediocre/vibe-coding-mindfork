-- Migration: AI Training Infrastructure
-- Created: 2025-11-03
-- Purpose: Create tables for AI model training, optimization, and continuous learning

-- ============================================================================
-- 1. AI PREDICTIONS & FEEDBACK LOOP (CRITICAL for RLHF)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Prediction metadata
  prediction_type TEXT NOT NULL, -- 'food_suggestion', 'portion_size', 'meal_plan', 'calorie_estimate'
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,

  -- Input and output
  input_data JSONB NOT NULL, -- What data the AI used
  predicted_output JSONB NOT NULL, -- What AI predicted
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- User feedback
  actual_user_choice JSONB, -- What user actually selected
  user_accepted BOOLEAN, -- Did they accept or modify?
  user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating >= 1 AND user_satisfaction_rating <= 5),

  -- Calculated metrics
  prediction_accuracy NUMERIC,
  feedback_delay_seconds INTEGER, -- How long until user gave feedback

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  feedback_received_at TIMESTAMPTZ,

  CONSTRAINT valid_prediction_type CHECK (
    prediction_type IN ('food_suggestion', 'portion_size', 'meal_plan', 'calorie_estimate',
                       'macro_breakdown', 'food_classification', 'coaching_response')
  )
);

-- ============================================================================
-- 2. FOOD PHOTO TRAINING DATA (Critical for Vision AI)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.food_photo_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_entry_id UUID REFERENCES food_entries(id) ON DELETE SET NULL,

  -- Photo data
  photo_url TEXT NOT NULL,
  photo_hash TEXT, -- For deduplication

  -- AI Analysis
  model_version TEXT NOT NULL,
  ai_detected_foods JSONB NOT NULL, -- [{"name": "pizza", "confidence": 0.92}]
  ai_estimated_portions JSONB,
  ai_estimated_calories INTEGER,
  ai_estimated_macros JSONB,
  analysis_time_ms INTEGER,

  -- Ground Truth (User Corrections)
  user_confirmed_foods JSONB,
  user_confirmed_portions JSONB,
  user_confirmed_calories INTEGER,
  user_confirmed_macros JSONB,

  -- Learning Signals
  correction_severity TEXT CHECK (correction_severity IN ('none', 'minor', 'major', 'completely_wrong')),
  user_correction_time_seconds INTEGER,

  -- Image context (auto-detected)
  lighting_quality TEXT CHECK (lighting_quality IN ('poor', 'medium', 'good', 'excellent')),
  image_angle TEXT CHECK (image_angle IN ('top_down', 'side', 'oblique', 'unknown')),
  background_complexity TEXT CHECK (background_complexity IN ('simple', 'cluttered')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  corrected_at TIMESTAMPTZ
);

-- ============================================================================
-- 3. USER BEHAVIOR EVENTS (For Pattern Detection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL, -- 'app_open', 'log_food', 'view_stats', 'skip_meal'
  event_data JSONB,

  -- Temporal context
  time_of_day TIME,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_weekend BOOLEAN,

  -- User state context
  days_into_program INTEGER,
  current_streak INTEGER,
  calories_consumed_today INTEGER,
  mood_tag TEXT,
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),

  -- Session context
  session_id UUID,
  device_type TEXT,
  app_version TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. MODEL PERFORMANCE MONITORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.model_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,

  -- Performance metrics
  average_latency_ms INTEGER,
  p95_latency_ms INTEGER,
  p99_latency_ms INTEGER,
  average_confidence NUMERIC,
  accuracy_rate NUMERIC, -- Based on user feedback

  -- Volume metrics
  predictions_count INTEGER DEFAULT 0,
  corrections_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  -- Time window
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. USER OUTCOME METRICS (Success Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_outcome_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Weight/body composition
  starting_weight_kg NUMERIC,
  current_weight_kg NUMERIC,
  weight_change_kg NUMERIC,

  -- Behavioral outcomes
  avg_daily_logging_frequency NUMERIC, -- Logs per week
  goal_adherence_rate NUMERIC, -- % days hit calorie goal
  meal_timing_consistency NUMERIC,

  -- Engagement
  app_opens_per_week NUMERIC,
  active_days_last_30 INTEGER,
  retention_days INTEGER,

  -- Satisfaction
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  last_satisfaction_rating INTEGER CHECK (last_satisfaction_rating >= 1 AND last_satisfaction_rating <= 5),

  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. A/B TESTING & EXPERIMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name TEXT NOT NULL UNIQUE,
  description TEXT,
  hypothesis TEXT,

  -- Variants
  control_config JSONB,
  variant_configs JSONB, -- Array of variant configurations

  -- Status
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES ai_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(experiment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.experiment_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES ai_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. AI ERROR TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  error_type TEXT NOT NULL,
  model_name TEXT,
  model_version TEXT,

  -- Error details
  input_data JSONB,
  error_message TEXT,
  stack_trace TEXT,

  -- User impact
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_visible BOOLEAN DEFAULT false,
  user_retry_count INTEGER DEFAULT 0,

  -- Resolution
  auto_recovered BOOLEAN DEFAULT false,
  manual_intervention_required BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- AI Predictions
CREATE INDEX idx_predictions_user_type ON ai_predictions(user_id, prediction_type, created_at DESC);
CREATE INDEX idx_predictions_model ON ai_predictions(model_name, model_version);
CREATE INDEX idx_predictions_feedback ON ai_predictions(user_accepted, feedback_received_at) WHERE feedback_received_at IS NOT NULL;

-- Photo Training Data
CREATE INDEX idx_photo_training_user ON food_photo_training_data(user_id, created_at DESC);
CREATE INDEX idx_photo_training_model ON food_photo_training_data(model_version);
CREATE INDEX idx_photo_training_corrections ON food_photo_training_data(correction_severity) WHERE correction_severity IS NOT NULL;
CREATE INDEX idx_photo_training_hash ON food_photo_training_data(photo_hash) WHERE photo_hash IS NOT NULL;

-- Behavior Events
CREATE INDEX idx_behavior_user_time ON user_behavior_events(user_id, created_at DESC);
CREATE INDEX idx_behavior_event_type ON user_behavior_events(event_type, created_at DESC);
CREATE INDEX idx_behavior_session ON user_behavior_events(session_id);

-- Model Performance
CREATE INDEX idx_performance_model_time ON model_performance_logs(model_name, model_version, measured_at DESC);

-- User Outcomes
CREATE INDEX idx_outcomes_user_time ON user_outcome_metrics(user_id, measured_at DESC);

-- Experiments
CREATE INDEX idx_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX idx_assignments_user ON experiment_assignments(user_id);
CREATE INDEX idx_outcomes_experiment ON experiment_outcomes(experiment_id, metric_name);

-- AI Errors
CREATE INDEX idx_errors_type_time ON ai_errors(error_type, created_at DESC);
CREATE INDEX idx_errors_model ON ai_errors(model_name, model_version);
CREATE INDEX idx_errors_unresolved ON ai_errors(resolved_at) WHERE resolved_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_photo_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_outcome_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_outcomes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users view own predictions" ON ai_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own photo training" ON food_photo_training_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own behavior" ON user_behavior_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own outcomes" ON user_outcome_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own assignments" ON experiment_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own experiment outcomes" ON experiment_outcomes FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update (for backend AI services)
CREATE POLICY "Service role full access predictions" ON ai_predictions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access photo training" ON food_photo_training_data FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access behavior" ON user_behavior_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access outcomes" ON user_outcome_metrics FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ai_predictions IS
  'Captures AI predictions and user feedback for RLHF (Reinforcement Learning from Human Feedback)';

COMMENT ON TABLE food_photo_training_data IS
  'Training data for food photo recognition AI - captures predictions vs ground truth';

COMMENT ON TABLE user_behavior_events IS
  'Event stream of user behaviors for pattern detection and personalization';

COMMENT ON TABLE model_performance_logs IS
  'Production monitoring metrics for AI models';

COMMENT ON TABLE user_outcome_metrics IS
  'User success metrics - the ultimate AI training signal';

COMMENT ON TABLE ai_experiments IS
  'A/B testing framework for AI model variants';

COMMENT ON TABLE ai_errors IS
  'Error tracking for AI model failures and edge cases';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- This migration creates the infrastructure for:
-- 1. Continuous AI learning from user feedback
-- 2. Food photo recognition model improvement
-- 3. User behavior pattern detection
-- 4. Model performance monitoring
-- 5. A/B testing for AI improvements
-- 6. Error tracking for robustness
--
-- These tables enable the AI to:
-- - Learn what users actually want (not just what they say)
-- - Improve photo recognition accuracy over time
-- - Personalize recommendations based on behavior patterns
-- - Monitor and optimize model performance
-- - Run experiments to test improvements
-- - Identify and fix edge cases
--
-- PRIVACY NOTE: All tables have RLS enabled. User data is only accessible
-- to the user themselves and service role (for AI training pipelines).
--

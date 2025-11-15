# AI Training & Optimization Schema Analysis
**Generated**: 2025-11-03
**Purpose**: Identify data needed for AI self-improvement and model optimization

## 🧠 AI Training Data Requirements

For your app's AI to continuously learn and optimize, you need to capture:

### 1. **User Feedback Loops** (Critical for RLHF - Reinforcement Learning from Human Feedback)

Every AI interaction should capture:
- What the AI predicted/suggested
- What the user actually did
- Whether the user was satisfied
- Implicit feedback (time spent, actions taken)

```sql
-- AI Predictions & User Responses
CREATE TABLE ai_predictions (
  id UUID PRIMARY KEY,
  user_id UUID,
  prediction_type TEXT, -- 'food_suggestion', 'portion_size', 'meal_plan', 'calorie_estimate', 'macro_breakdown'
  model_version TEXT,
  input_data JSONB, -- What data the AI used
  predicted_output JSONB, -- What AI predicted
  confidence_score NUMERIC,
  actual_user_choice JSONB, -- What user actually selected
  user_accepted BOOLEAN, -- Did they accept or modify?
  user_satisfaction_rating INTEGER, -- 1-5 if explicitly asked
  prediction_accuracy NUMERIC, -- Calculated later
  created_at TIMESTAMPTZ,
  feedback_received_at TIMESTAMPTZ
);
```

### 2. **Food Photo Recognition Training Data**

Capture every photo analysis for continuous model improvement:

```sql
-- Already suggested, but with more detail:
CREATE TABLE food_photo_training_data (
  id UUID PRIMARY KEY,
  user_id UUID,
  photo_url TEXT NOT NULL,
  photo_hash TEXT, -- Dedupe identical photos

  -- AI Analysis
  model_version TEXT,
  ai_detected_foods JSONB, -- [{"name": "pizza", "confidence": 0.92}, ...]
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
  correction_severity TEXT, -- 'none', 'minor', 'major', 'completely_wrong'
  user_correction_time_seconds INTEGER, -- How long to correct

  -- Context for better training
  lighting_quality TEXT, -- 'poor', 'medium', 'good' (auto-detected)
  image_angle TEXT, -- 'top_down', 'side', 'oblique'
  background_complexity TEXT, -- 'simple', 'cluttered'

  created_at TIMESTAMPTZ,
  corrected_at TIMESTAMPTZ
);

-- Index for finding similar corrections
CREATE INDEX idx_photo_training_ai_detected
  ON food_photo_training_data USING gin(ai_detected_foods);
```

### 3. **User Behavior Patterns** (For Personalization)

Track behavioral data to personalize AI responses:

```sql
CREATE TABLE user_behavior_events (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type TEXT, -- 'app_open', 'log_food', 'view_stats', 'skip_meal', 'binge', 'exercise'
  event_data JSONB,

  -- Temporal context
  time_of_day TIME,
  day_of_week INTEGER,
  is_weekend BOOLEAN,

  -- User state context
  days_into_program INTEGER,
  current_streak INTEGER,
  calories_consumed_today INTEGER,
  mood_tag TEXT,
  stress_level INTEGER,

  -- Device/session context
  session_id UUID,
  device_type TEXT,
  app_version TEXT,

  created_at TIMESTAMPTZ
);

-- Time-series index for pattern detection
CREATE INDEX idx_behavior_user_time
  ON user_behavior_events(user_id, created_at);
```

### 4. **A/B Testing & Experiment Tracking**

Test different AI strategies and measure outcomes:

```sql
CREATE TABLE ai_experiments (
  id UUID PRIMARY KEY,
  experiment_name TEXT,
  description TEXT,
  model_variant TEXT, -- 'control', 'variant_a', 'variant_b'
  hypothesis TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN
);

CREATE TABLE experiment_assignments (
  id UUID PRIMARY KEY,
  experiment_id UUID REFERENCES ai_experiments(id),
  user_id UUID,
  variant TEXT,
  assigned_at TIMESTAMPTZ
);

CREATE TABLE experiment_outcomes (
  id UUID PRIMARY KEY,
  experiment_id UUID,
  user_id UUID,
  metric_name TEXT, -- 'retention_day_7', 'avg_logging_frequency', 'goal_achievement_rate'
  metric_value NUMERIC,
  measured_at TIMESTAMPTZ
);
```

### 5. **Model Performance Metrics** (Production Monitoring)

Track model performance in production:

```sql
CREATE TABLE model_performance_logs (
  id UUID PRIMARY KEY,
  model_name TEXT, -- 'food_classifier', 'calorie_estimator', 'meal_recommender'
  model_version TEXT,

  -- Performance metrics
  average_latency_ms INTEGER,
  p95_latency_ms INTEGER,
  average_confidence NUMERIC,
  accuracy_rate NUMERIC, -- Based on user feedback

  -- Volume metrics
  predictions_count INTEGER,
  corrections_count INTEGER,

  -- Time window
  measured_at TIMESTAMPTZ,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ
);
```

### 6. **User Outcomes & Success Metrics** (The Ultimate Training Signal)

Track whether AI recommendations lead to user success:

```sql
CREATE TABLE user_outcome_metrics (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Weight/body composition
  starting_weight_kg NUMERIC,
  current_weight_kg NUMERIC,
  weight_change_kg NUMERIC,

  -- Behavioral outcomes
  avg_daily_logging_frequency NUMERIC, -- Days logged per week
  goal_adherence_rate NUMERIC, -- % days hit calorie goal
  meal_timing_consistency NUMERIC, -- How consistent meal times are

  -- Health markers (if available)
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  cholesterol_total NUMERIC,
  glucose_fasting NUMERIC,

  -- Engagement
  app_opens_per_week NUMERIC,
  active_days_last_30 INTEGER,
  retention_days INTEGER,

  -- Satisfaction
  nps_score INTEGER, -- Net Promoter Score
  last_satisfaction_rating INTEGER,

  measured_at TIMESTAMPTZ
);

-- Track progress over time
CREATE INDEX idx_outcome_user_time
  ON user_outcome_metrics(user_id, measured_at);
```

### 7. **Feature Importance & Attribution**

Track which data features matter most for predictions:

```sql
CREATE TABLE feature_importance_log (
  id UUID PRIMARY KEY,
  model_name TEXT,
  model_version TEXT,
  feature_name TEXT,
  importance_score NUMERIC, -- SHAP value or similar
  sample_size INTEGER,
  calculated_at TIMESTAMPTZ
);
```

### 8. **User Nutrition Knowledge Level**

Track user expertise to adjust AI explanations:

```sql
ALTER TABLE profiles
  ADD COLUMN nutrition_literacy_level TEXT, -- 'beginner', 'intermediate', 'advanced', 'expert'
  ADD COLUMN prefers_detailed_explanations BOOLEAN DEFAULT true,
  ADD COLUMN technical_terms_ok BOOLEAN DEFAULT false;

CREATE TABLE nutrition_quiz_results (
  id UUID PRIMARY KEY,
  user_id UUID,
  quiz_type TEXT,
  score NUMERIC,
  questions_answered INTEGER,
  topics_weak JSONB, -- ["macros", "micronutrients"]
  topics_strong JSONB,
  taken_at TIMESTAMPTZ
);
```

### 9. **Error & Edge Case Tracking**

Capture failures to improve robustness:

```sql
CREATE TABLE ai_errors (
  id UUID PRIMARY KEY,
  error_type TEXT, -- 'photo_analysis_failed', 'timeout', 'low_confidence', 'api_error'
  model_name TEXT,
  model_version TEXT,

  -- Error context
  input_data JSONB,
  error_message TEXT,
  stack_trace TEXT,

  -- User impact
  user_id UUID,
  user_visible BOOLEAN, -- Did user see an error?
  user_retry_count INTEGER,

  -- Resolution
  auto_recovered BOOLEAN,
  manual_intervention_required BOOLEAN,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ
);
```

### 10. **Embeddings & Vector Storage**

For semantic search and similarity matching:

```sql
-- Already partially exists, but enhance it:
ALTER TABLE food_entries
  ADD COLUMN food_embedding VECTOR(1536), -- OpenAI embedding dimension
  ADD COLUMN embedding_model_version TEXT;

-- Enable vector similarity search
CREATE INDEX ON food_entries USING ivfflat (food_embedding vector_cosine_ops);

-- User preference embeddings
CREATE TABLE user_preference_embeddings (
  id UUID PRIMARY KEY,
  user_id UUID,
  preference_type TEXT, -- 'food_taste', 'cuisine', 'diet_philosophy'
  embedding VECTOR(1536),
  updated_at TIMESTAMPTZ
);
```

### 11. **Contextual Data for Better Predictions**

Capture context that affects food choices:

```sql
-- Weather context (affects food cravings)
CREATE TABLE context_snapshots (
  id UUID PRIMARY KEY,
  user_id UUID,
  food_entry_id UUID,

  -- Environmental
  weather_temp_c NUMERIC,
  weather_condition TEXT, -- 'sunny', 'rainy', 'snowy'
  season TEXT,

  -- Personal state
  sleep_hours_last_night NUMERIC,
  exercise_today_minutes INTEGER,
  stress_level INTEGER,
  hunger_level INTEGER,

  -- Social
  eating_alone BOOLEAN,
  special_occasion TEXT, -- 'birthday', 'holiday', 'date', null

  created_at TIMESTAMPTZ
);
```

### 12. **Conversation Memory** (For Coach AI)

Track conversation history for context-aware coaching:

```sql
-- Extend existing coach messages
ALTER TABLE ai_coaching_messages
  ADD COLUMN conversation_id UUID,
  ADD COLUMN message_embedding VECTOR(1536),
  ADD COLUMN user_satisfaction_implicit NUMERIC, -- Based on response time, length, etc.
  ADD COLUMN topic_tags JSONB, -- ["motivation", "nutrition_question", "accountability"]
  ADD COLUMN conversation_turn INTEGER; -- Turn number in conversation

CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY,
  conversation_id UUID,
  user_id UUID,
  coach_id TEXT,

  -- Summary
  topic TEXT,
  user_goals_discussed JSONB,
  action_items JSONB,
  sentiment TEXT, -- 'positive', 'neutral', 'frustrated', 'motivated'

  -- Metadata
  message_count INTEGER,
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);
```

---

## 🎯 Priority AI Training Tables

### MUST HAVE (Implement Immediately)
1. **ai_predictions** - Core feedback loop
2. **food_photo_training_data** - Photo recognition improvement
3. **user_behavior_events** - Behavioral patterns
4. **model_performance_logs** - Production monitoring

### SHOULD HAVE (Implement Soon)
5. **user_outcome_metrics** - Success tracking
6. **ai_experiments** - A/B testing
7. **ai_errors** - Error tracking

### NICE TO HAVE (Future)
8. **context_snapshots** - Environmental factors
9. **feature_importance_log** - Model interpretability
10. **conversation_summaries** - Coach AI memory

---

## 📊 Data Flow for AI Training

```
User Action → Event Capture → Feature Engineering → Model Training → Deployment → Performance Monitoring → User Feedback → Repeat
```

**Key Insight**: Every user interaction is a potential training example!

---

Would you like me to create migrations for these AI training tables?

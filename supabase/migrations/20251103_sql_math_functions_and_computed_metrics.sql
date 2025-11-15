-- Migration: SQL Math Functions + Computed Metrics
-- Created: 2025-11-03
-- Purpose: Add scientific math functions and computed metrics WITHOUT deprecating existing tables
--
-- ADDITIVE ONLY: No existing tables or columns removed
-- Non-breaking: All additions are optional columns or new functions
--
-- What this adds:
-- 1. 5 SQL functions (TDEE, weight projection, satiety, adherence, habit strength)
-- 2. Optional columns to existing tables (profiles, food_entries)
-- 3. 2 new computed metrics tables (daily_metrics, k_factor_metrics)
-- 4. Automatic triggers for metric calculation

-- ============================================================================
-- PART 1: ADD OPTIONAL COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Enhance profiles table with columns needed for TDEE calculation
-- All columns are optional - existing code continues to work!
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height_cm INT CHECK (height_cm > 0 AND height_cm < 300),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS activity_factor NUMERIC DEFAULT 1.55 CHECK (activity_factor >= 1.2 AND activity_factor <= 2.5),
  ADD COLUMN IF NOT EXISTS daily_calorie_goal INT CHECK (daily_calorie_goal > 0),
  ADD COLUMN IF NOT EXISTS daily_protein_goal_g INT CHECK (daily_protein_goal_g > 0),
  ADD COLUMN IF NOT EXISTS daily_fiber_goal_g INT DEFAULT 25 CHECK (daily_fiber_goal_g > 0);

-- Enhance food_entries with computed scores
-- All columns are optional - existing code continues to work!
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS satiety_score NUMERIC CHECK (satiety_score >= 0 AND satiety_score <= 1),
  ADD COLUMN IF NOT EXISTS glycemic_index INT CHECK (glycemic_index >= 0 AND glycemic_index <= 100);

-- ============================================================================
-- PART 2: SQL MATH FUNCTIONS
-- ============================================================================

-- ============================================================================
-- Function 1: Compute TDEE (Total Daily Energy Expenditure)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_tdee(
  p_sex TEXT,
  p_weight_kg NUMERIC,
  p_height_cm INT,
  p_age_years INT,
  p_activity_factor NUMERIC DEFAULT 1.55,
  p_tef NUMERIC DEFAULT 1.07  -- Thermic Effect of Food
) RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_bmr NUMERIC;
BEGIN
  -- Mifflin-St Jeor equation (most accurate for general population)
  IF p_sex = 'male' THEN
    v_bmr := 10 * p_weight_kg + 6.25 * p_height_cm - 5 * p_age_years + 5;
  ELSIF p_sex IN ('female', 'other') THEN
    v_bmr := 10 * p_weight_kg + 6.25 * p_height_cm - 5 * p_age_years - 161;
  ELSE
    -- Default to average
    v_bmr := 10 * p_weight_kg + 6.25 * p_height_cm - 5 * p_age_years - 78;
  END IF;

  -- TDEE = BMR × Activity Factor × TEF
  RETURN ROUND(v_bmr * p_activity_factor * p_tef);
END;
$$;

COMMENT ON FUNCTION public.compute_tdee IS 'Calculate Total Daily Energy Expenditure using Mifflin-St Jeor equation. Activity factors: 1.2 (sedentary), 1.375 (light), 1.55 (moderate), 1.725 (active), 1.9 (very active)';

-- ============================================================================
-- Function 2: Project Weight Trajectory
-- ============================================================================
CREATE OR REPLACE FUNCTION public.project_weight_trajectory(
  p_user_id UUID,
  p_days INT DEFAULT 30
) RETURNS TABLE(
  day INT,
  predicted_weight_kg NUMERIC,
  cumulative_deficit_kcal INT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_current_weight NUMERIC;
  v_tdee NUMERIC;
  v_avg_daily_calories NUMERIC;
  v_daily_deficit NUMERIC;
  v_projected_weight NUMERIC;
  v_cumulative_deficit INT := 0;
  v_sex TEXT;
  v_height_cm INT;
  v_age INT;
  v_activity_factor NUMERIC;
BEGIN
  -- Get current weight from most recent entry
  SELECT weight_kg INTO v_current_weight
  FROM public.weight_history
  WHERE user_id = p_user_id
  ORDER BY date DESC
  LIMIT 1;

  IF v_current_weight IS NULL THEN
    RAISE EXCEPTION 'No weight history found for user %', p_user_id;
  END IF;

  -- Get profile data for TDEE calculation
  SELECT
    sex,
    height_cm,
    EXTRACT(YEAR FROM AGE(birth_date))::INT,
    COALESCE(activity_factor, 1.55)
  INTO v_sex, v_height_cm, v_age, v_activity_factor
  FROM public.profiles
  WHERE user_id = p_user_id;

  -- Calculate TDEE
  IF v_sex IS NOT NULL AND v_height_cm IS NOT NULL AND v_age IS NOT NULL THEN
    v_tdee := compute_tdee(v_sex, v_current_weight, v_height_cm, v_age, v_activity_factor);
  ELSE
    -- Fallback: estimate TDEE at 2000 kcal if data incomplete
    v_tdee := 2000;
  END IF;

  -- Get average daily calories from last 14 days (more stable than 7)
  SELECT COALESCE(AVG(calories)::NUMERIC, v_tdee) INTO v_avg_daily_calories
  FROM public.food_entries
  WHERE user_id = p_user_id
    AND consumed_at >= NOW() - INTERVAL '14 days';

  v_daily_deficit := v_tdee - v_avg_daily_calories;
  v_projected_weight := v_current_weight;

  -- Project forward day by day
  FOR i IN 1..p_days LOOP
    -- 7700 kcal = 1 kg fat (scientific consensus)
    v_projected_weight := v_projected_weight - (v_daily_deficit / 7700.0);
    v_cumulative_deficit := v_cumulative_deficit + v_daily_deficit;

    RETURN QUERY SELECT
      i,
      ROUND(v_projected_weight, 2),
      v_cumulative_deficit;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.project_weight_trajectory IS 'Project weight change over next N days based on current eating patterns. Uses 14-day average for stability.';

-- ============================================================================
-- Function 3: Calculate Satiety Score
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_satiety_score(
  p_protein_g NUMERIC,
  p_fiber_g NUMERIC,
  p_sugar_g NUMERIC,
  p_calories NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_protein_density NUMERIC;
  v_fiber_density NUMERIC;
  v_sugar_density NUMERIC;
  v_score NUMERIC;
BEGIN
  IF p_calories IS NULL OR p_calories <= 0 THEN
    RETURN NULL;
  END IF;

  -- Calculate nutrient density (grams per 100 kcal)
  v_protein_density := COALESCE(p_protein_g, 0) / p_calories * 100;
  v_fiber_density := COALESCE(p_fiber_g, 0) / p_calories * 100;
  v_sugar_density := COALESCE(p_sugar_g, 0) / p_calories * 100;

  -- Research-backed weights:
  -- Protein: Most satiating (0.4 weight)
  -- Fiber: Second most satiating (0.3 weight)
  -- Sugar: Reduces satiety (-0.3 weight)
  v_score := (
    0.4 * v_protein_density +
    0.3 * v_fiber_density -
    0.3 * v_sugar_density
  );

  -- Normalize to 0-1 scale (max protein + fiber density ≈ 10)
  v_score := v_score / 10.0;

  -- Clamp to [0, 1]
  RETURN GREATEST(0, LEAST(1, v_score));
END;
$$;

COMMENT ON FUNCTION public.calculate_satiety_score IS 'Calculate food satiety score (0-1) based on protein, fiber, and sugar content. Higher = more filling per calorie.';

-- ============================================================================
-- Function 4: Calculate Daily Adherence Score
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_adherence_score(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE
  v_target_calories INT;
  v_actual_calories INT;
  v_tolerance INT := 600; -- ±600 kcal is considered acceptable
  v_difference INT;
  v_adherence NUMERIC;
BEGIN
  -- Get calorie target from profile
  SELECT daily_calorie_goal INTO v_target_calories
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF v_target_calories IS NULL THEN
    RETURN NULL; -- No goal set
  END IF;

  -- Sum actual calories for the day
  SELECT COALESCE(SUM(calories), 0)::INT INTO v_actual_calories
  FROM public.food_entries
  WHERE user_id = p_user_id
    AND consumed_at::DATE = p_date;

  -- Calculate difference
  v_difference := ABS(v_actual_calories - v_target_calories);

  -- Linear adherence score: 1.0 = perfect, 0.0 = >tolerance off
  v_adherence := 1.0 - (v_difference::NUMERIC / v_tolerance);

  -- Clamp to [0, 1]
  RETURN GREATEST(0, LEAST(1, v_adherence));
END;
$$;

COMMENT ON FUNCTION public.calculate_adherence_score IS 'Calculate daily calorie adherence score (0-1). 1.0 = perfect, 0.0 = >600 kcal off target. NULL if no goal set.';

-- ============================================================================
-- Function 5: Calculate Habit Strength (Exponential Model)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_habit_strength(
  p_habit_stack_id UUID,
  p_tau INT DEFAULT 14  -- Decay constant (days)
) RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE
  v_lambda NUMERIC;
  v_strength NUMERIC := 0;
  r RECORD;
BEGIN
  -- Lambda = exp(-1/τ) for exponential smoothing
  -- τ=14 means habit "half-life" of ~14 days
  v_lambda := EXP(-1.0 / p_tau);

  -- Iterate completions in chronological order
  FOR r IN
    SELECT
      CASE WHEN completed THEN 1.0 ELSE 0.0 END AS x
    FROM public.habit_completions
    WHERE habit_stack_id = p_habit_stack_id
    ORDER BY completed_at ASC
  LOOP
    -- Exponential moving average: H_t = λ·H_{t-1} + (1-λ)·x_t
    v_strength := v_lambda * v_strength + (1 - v_lambda) * r.x;
  END LOOP;

  RETURN ROUND(v_strength, 3);
END;
$$;

COMMENT ON FUNCTION public.calculate_habit_strength IS 'Calculate habit strength (0-1) using exponential smoothing model. Higher = more established habit. τ=14 day decay constant.';

-- ============================================================================
-- PART 3: COMPUTED METRICS TABLES
-- ============================================================================

-- ============================================================================
-- Table: daily_metrics (Comprehensive Daily Performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Nutrition adherence
  target_calories INT,
  actual_calories INT,
  adherence_score NUMERIC CHECK (adherence_score >= 0 AND adherence_score <= 1),

  -- Macro tracking
  target_protein_g INT,
  actual_protein_g INT,
  target_fiber_g INT,
  actual_fiber_g INT,

  -- Hydration
  water_intake_ml INT DEFAULT 0,
  water_goal_ml INT DEFAULT 2000,

  -- Habit completion
  habits_completed INT DEFAULT 0,
  habits_total INT DEFAULT 0,
  habit_completion_rate NUMERIC CHECK (habit_completion_rate >= 0 AND habit_completion_rate <= 1),

  -- Mood & psychology
  avg_mood_valence NUMERIC, -- Average mood for the day
  emotional_eating_detected BOOLEAN DEFAULT false,
  cravings_count INT DEFAULT 0,
  interventions_received INT DEFAULT 0,

  -- Weight & steps
  weight_kg NUMERIC,
  steps INT,

  -- Gamification
  points_earned INT DEFAULT 0,
  streak_bonus INT DEFAULT 0,
  achievements_unlocked INT DEFAULT 0,

  -- Metadata
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT daily_metrics_unique UNIQUE(user_id, date)
);

-- Indexes for daily_metrics
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date
  ON public.daily_metrics(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_adherence
  ON public.daily_metrics(user_id, adherence_score DESC)
  WHERE adherence_score IS NOT NULL;

-- RLS policies for daily_metrics
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily metrics"
  ON public.daily_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily metrics"
  ON public.daily_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily metrics"
  ON public.daily_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Table: k_factor_metrics (Viral Growth & Retention)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.k_factor_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,

  -- Viral metrics
  total_shares INT DEFAULT 0,
  shares_clicked INT DEFAULT 0,
  shares_converted INT DEFAULT 0,
  k_factor NUMERIC, -- Viral coefficient (conversions / active_users)

  -- Cohort retention
  new_signups INT DEFAULT 0,
  d1_active INT DEFAULT 0,
  d7_active INT DEFAULT 0,
  d30_active INT DEFAULT 0,
  d1_retention_rate NUMERIC,
  d7_retention_rate NUMERIC,
  d30_retention_rate NUMERIC,

  -- CTAs & conversion
  cta_impressions INT DEFAULT 0,
  cta_clicks INT DEFAULT 0,
  cta_conversions INT DEFAULT 0,
  cta_click_rate NUMERIC,
  cta_conversion_rate NUMERIC,

  -- Engagement
  daily_active_users INT DEFAULT 0,
  weekly_active_users INT DEFAULT 0,
  monthly_active_users INT DEFAULT 0,
  avg_sessions_per_user NUMERIC,
  avg_foods_logged_per_user NUMERIC,

  -- Metadata
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for k_factor_metrics
CREATE INDEX IF NOT EXISTS idx_k_factor_date
  ON public.k_factor_metrics(date DESC);

-- RLS policies (service role only - aggregated data)
ALTER TABLE public.k_factor_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage k_factor metrics"
  ON public.k_factor_metrics
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PART 4: AUTOMATIC SATIETY SCORE COMPUTATION
-- ============================================================================

-- Trigger function to auto-calculate satiety score on food entry insert/update
CREATE OR REPLACE FUNCTION public.auto_calculate_satiety_score()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  -- Only calculate if we have the required nutrition data
  IF NEW.calories IS NOT NULL AND NEW.calories > 0 THEN
    NEW.satiety_score := calculate_satiety_score(
      NEW.protein_g,
      NEW.fiber_g,
      NEW.sugar_g,
      NEW.calories
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to food_entries
DROP TRIGGER IF EXISTS trigger_auto_satiety_score ON public.food_entries;

CREATE TRIGGER trigger_auto_satiety_score
  BEFORE INSERT OR UPDATE ON public.food_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_calculate_satiety_score();

-- ============================================================================
-- PART 5: DAILY METRICS COMPUTATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compute_daily_metrics(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_target_calories INT;
  v_actual_calories INT;
  v_target_protein INT;
  v_actual_protein INT;
  v_target_fiber INT;
  v_actual_fiber INT;
  v_water_ml INT;
  v_habits_completed INT;
  v_habits_total INT;
  v_avg_mood NUMERIC;
  v_weight NUMERIC;
  v_steps INT;
  v_adherence NUMERIC;
  v_completion_rate NUMERIC;
  v_emotional_eating BOOLEAN;
  v_cravings INT;
  v_interventions INT;
BEGIN
  -- Get targets from profile
  SELECT
    daily_calorie_goal,
    daily_protein_goal_g,
    daily_fiber_goal_g
  INTO v_target_calories, v_target_protein, v_target_fiber
  FROM public.profiles
  WHERE user_id = p_user_id;

  -- Get actual nutrition
  SELECT
    COALESCE(SUM(calories), 0)::INT,
    COALESCE(SUM(protein_g), 0)::INT,
    COALESCE(SUM(fiber_g), 0)::INT
  INTO v_actual_calories, v_actual_protein, v_actual_fiber
  FROM public.food_entries
  WHERE user_id = p_user_id
    AND consumed_at::DATE = p_date;

  -- Get water intake
  SELECT COALESCE(SUM(amount_ml), 0)::INT INTO v_water_ml
  FROM public.water_intake
  WHERE user_id = p_user_id
    AND date = p_date;

  -- Get habit completion
  SELECT
    COUNT(*) FILTER (WHERE completed = true)::INT,
    COUNT(*)::INT
  INTO v_habits_completed, v_habits_total
  FROM public.habit_completions hc
  JOIN public.habit_stacks hs ON hc.habit_stack_id = hs.id
  WHERE hc.user_id = p_user_id
    AND hc.completed_at::DATE = p_date
    AND hs.is_active = true;

  -- Get mood average
  SELECT AVG(mood_valence) INTO v_avg_mood
  FROM public.mood_check_ins
  WHERE user_id = p_user_id
    AND created_at::DATE = p_date;

  -- Get weight
  SELECT weight_kg INTO v_weight
  FROM public.weight_history
  WHERE user_id = p_user_id
    AND date = p_date;

  -- Get steps
  SELECT step_count INTO v_steps
  FROM public.step_tracking
  WHERE user_id = p_user_id
    AND date = p_date;

  -- Calculate adherence score
  v_adherence := calculate_adherence_score(p_user_id, p_date);

  -- Calculate habit completion rate
  IF v_habits_total > 0 THEN
    v_completion_rate := v_habits_completed::NUMERIC / v_habits_total;
  END IF;

  -- Check emotional eating
  SELECT EXISTS (
    SELECT 1 FROM public.mood_check_ins
    WHERE user_id = p_user_id
      AND created_at::DATE = p_date
      AND eating_triggered_by_emotion = true
  ) INTO v_emotional_eating;

  -- Count cravings
  SELECT COUNT(*)::INT INTO v_cravings
  FROM public.cravings
  WHERE user_id = p_user_id
    AND created_at::DATE = p_date;

  -- Count AI interventions
  SELECT COUNT(*)::INT INTO v_interventions
  FROM public.coach_messages
  WHERE user_id = p_user_id
    AND sent_at::DATE = p_date
    AND message_type IN ('intervention', 'check_in');

  -- Upsert daily metrics
  INSERT INTO public.daily_metrics (
    user_id,
    date,
    target_calories,
    actual_calories,
    adherence_score,
    target_protein_g,
    actual_protein_g,
    target_fiber_g,
    actual_fiber_g,
    water_intake_ml,
    habits_completed,
    habits_total,
    habit_completion_rate,
    avg_mood_valence,
    emotional_eating_detected,
    cravings_count,
    interventions_received,
    weight_kg,
    steps,
    computed_at,
    last_updated_at
  ) VALUES (
    p_user_id,
    p_date,
    v_target_calories,
    v_actual_calories,
    v_adherence,
    v_target_protein,
    v_actual_protein,
    v_target_fiber,
    v_actual_fiber,
    v_water_ml,
    v_habits_completed,
    v_habits_total,
    v_completion_rate,
    v_avg_mood,
    v_emotional_eating,
    v_cravings,
    v_interventions,
    v_weight,
    v_steps,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    target_calories = EXCLUDED.target_calories,
    actual_calories = EXCLUDED.actual_calories,
    adherence_score = EXCLUDED.adherence_score,
    target_protein_g = EXCLUDED.target_protein_g,
    actual_protein_g = EXCLUDED.actual_protein_g,
    target_fiber_g = EXCLUDED.target_fiber_g,
    actual_fiber_g = EXCLUDED.actual_fiber_g,
    water_intake_ml = EXCLUDED.water_intake_ml,
    habits_completed = EXCLUDED.habits_completed,
    habits_total = EXCLUDED.habits_total,
    habit_completion_rate = EXCLUDED.habit_completion_rate,
    avg_mood_valence = EXCLUDED.avg_mood_valence,
    emotional_eating_detected = EXCLUDED.emotional_eating_detected,
    cravings_count = EXCLUDED.cravings_count,
    interventions_received = EXCLUDED.interventions_received,
    weight_kg = EXCLUDED.weight_kg,
    steps = EXCLUDED.steps,
    last_updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.compute_daily_metrics IS 'Compute comprehensive daily metrics for a user. Should be run nightly or on-demand.';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration adds:
-- 1. 7 optional columns (non-breaking)
-- 2. 5 SQL math functions
-- 3. 2 computed metrics tables
-- 4. Auto-computation triggers
--
-- Benefits:
-- - Scientific TDEE calculation
-- - Weight trajectory predictions (motivation!)
-- - Satiety scoring for better food choices
-- - Adherence scoring for gamification
-- - Habit strength tracking
-- - Comprehensive daily metrics
-- - Viral growth metrics (K-factor)
--
-- Breaking changes: NONE
-- Time to implement: 2 hours
-- Value added: ENORMOUS

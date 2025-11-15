-- Migration: Psychology & Core Tracking (TIER 1 - CRITICAL)
-- Created: 2025-11-03
-- Purpose: Add 7 essential tables for psychology-driven AI coaching and core health tracking
--
-- Tables created:
-- 1. water_intake - Daily water consumption tracking
-- 2. weight_history - Weight progress over time
-- 3. mood_check_ins - Emotional state tracking (emotional eating detection)
-- 4. cravings - Craving tracking and intervention
-- 5. thought_records - CBT methodology (cognitive behavioral therapy)
-- 6. habit_completions - Companion to existing habit_stacks table
-- 7. lapses - Relapse prevention and recovery tracking

-- ============================================================================
-- 1. WATER INTAKE TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.water_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Water tracking
  date DATE NOT NULL,
  amount_ml INTEGER NOT NULL,

  -- Context
  time_of_day TIME,
  beverage_type TEXT DEFAULT 'water', -- 'water', 'tea', 'coffee', 'other'

  -- Goals
  daily_goal_ml INTEGER DEFAULT 2000,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT water_intake_amount_positive CHECK (amount_ml > 0)
);

-- Indexes for water_intake
CREATE INDEX IF NOT EXISTS idx_water_intake_user_date ON public.water_intake(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_water_intake_created_at ON public.water_intake(created_at DESC);

-- RLS policies for water_intake
ALTER TABLE public.water_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own water intake"
  ON public.water_intake FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water intake"
  ON public.water_intake FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own water intake"
  ON public.water_intake FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own water intake"
  ON public.water_intake FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. WEIGHT HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Weight measurement
  weight_kg NUMERIC NOT NULL,
  date DATE NOT NULL,
  time_of_day TIME,

  -- Context
  measurement_context TEXT, -- 'morning_empty_stomach', 'after_meal', 'before_bed', 'after_workout'
  notes TEXT,

  -- Trend analysis (calculated by app/AI)
  trend_direction TEXT, -- 'increasing', 'decreasing', 'stable'
  days_since_last_measurement INTEGER,
  change_from_last_kg NUMERIC,

  -- Goal tracking
  distance_from_goal_kg NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT weight_history_weight_positive CHECK (weight_kg > 0),
  CONSTRAINT weight_history_user_date_unique UNIQUE(user_id, date, time_of_day)
);

-- Indexes for weight_history
CREATE INDEX IF NOT EXISTS idx_weight_history_user_date ON public.weight_history(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_history_created_at ON public.weight_history(created_at DESC);

-- RLS policies for weight_history
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weight history"
  ON public.weight_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight history"
  ON public.weight_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight history"
  ON public.weight_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight history"
  ON public.weight_history FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. MOOD CHECK-INS (Emotional Eating Detection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mood_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Mood dimensions (research-backed psychology scales)
  mood_valence INTEGER NOT NULL, -- 1-10: negative to positive
  mood_arousal INTEGER NOT NULL, -- 1-10: calm to excited
  mood_tags TEXT[], -- ['stressed', 'anxious', 'happy', 'bored', 'tired', 'excited', 'sad', 'angry']

  -- Emotional eating indicators
  eating_triggered_by_emotion BOOLEAN DEFAULT false,
  emotional_state_description TEXT,
  coping_mechanism_used TEXT, -- 'food', 'exercise', 'meditation', 'talking', 'none'

  -- Context (critical for AI prediction)
  trigger_event TEXT, -- 'work_stress', 'argument', 'celebration', 'loneliness', 'boredom', 'social_pressure'
  location TEXT, -- 'home', 'work', 'restaurant', 'car', 'gym', 'outside'
  with_people TEXT[], -- 'alone', 'family', 'friends', 'colleagues', 'strangers'

  -- Physiological state
  hunger_level INTEGER, -- 1-10: not hungry to starving
  energy_level INTEGER, -- 1-10: exhausted to energized
  stress_level INTEGER, -- 1-10: calm to very stressed

  -- Timing relative to meals
  before_meal BOOLEAN DEFAULT false,
  after_meal BOOLEAN DEFAULT false,
  food_entry_id UUID REFERENCES public.food_entries(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT mood_check_ins_valence_range CHECK (mood_valence BETWEEN 1 AND 10),
  CONSTRAINT mood_check_ins_arousal_range CHECK (mood_arousal BETWEEN 1 AND 10),
  CONSTRAINT mood_check_ins_hunger_range CHECK (hunger_level IS NULL OR hunger_level BETWEEN 1 AND 10),
  CONSTRAINT mood_check_ins_energy_range CHECK (energy_level IS NULL OR energy_level BETWEEN 1 AND 10),
  CONSTRAINT mood_check_ins_stress_range CHECK (stress_level IS NULL OR stress_level BETWEEN 1 AND 10)
);

-- Indexes for mood_check_ins
CREATE INDEX IF NOT EXISTS idx_mood_check_ins_user_created ON public.mood_check_ins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_check_ins_food_entry ON public.mood_check_ins(food_entry_id);
CREATE INDEX IF NOT EXISTS idx_mood_check_ins_emotional_eating ON public.mood_check_ins(user_id, eating_triggered_by_emotion, created_at DESC);

-- RLS policies for mood_check_ins
ALTER TABLE public.mood_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mood check-ins"
  ON public.mood_check_ins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mood check-ins"
  ON public.mood_check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mood check-ins"
  ON public.mood_check_ins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mood check-ins"
  ON public.mood_check_ins FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. CRAVINGS (Predictive Intervention)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cravings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Craving details
  craved_food TEXT NOT NULL,
  craving_intensity INTEGER NOT NULL, -- 1-10
  craving_type TEXT, -- 'specific_food', 'general_sweet', 'general_salty', 'general_savory', 'texture', 'temperature'

  -- Context (CRITICAL for AI prediction)
  time_since_last_meal_hours NUMERIC,
  calories_consumed_today INTEGER,
  sleep_hours_last_night NUMERIC,
  stress_level INTEGER, -- 1-10
  location TEXT,
  activity TEXT, -- 'watching_tv', 'working', 'socializing', 'exercising', 'relaxing', 'commuting'

  -- Response and outcome
  gave_in BOOLEAN,
  delay_minutes INTEGER, -- How long did they resist before giving in?
  substitution_used TEXT, -- 'healthy_snack', 'water', 'walk', 'distraction', 'none'

  -- Satisfaction/regret (critical for learning)
  satisfaction_if_ate INTEGER, -- 1-10: how satisfied if they gave in
  regret_level INTEGER, -- 1-10: how much regret

  -- AI intervention tracking
  coach_intervention_received BOOLEAN DEFAULT false,
  intervention_type TEXT, -- 'distraction_suggestion', 'substitution_idea', 'emotional_support', 'education'
  intervention_helpful BOOLEAN,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  CONSTRAINT cravings_intensity_range CHECK (craving_intensity BETWEEN 1 AND 10),
  CONSTRAINT cravings_stress_range CHECK (stress_level IS NULL OR stress_level BETWEEN 1 AND 10),
  CONSTRAINT cravings_satisfaction_range CHECK (satisfaction_if_ate IS NULL OR satisfaction_if_ate BETWEEN 1 AND 10),
  CONSTRAINT cravings_regret_range CHECK (regret_level IS NULL OR regret_level BETWEEN 1 AND 10)
);

-- Indexes for cravings
CREATE INDEX IF NOT EXISTS idx_cravings_user_created ON public.cravings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cravings_gave_in ON public.cravings(user_id, gave_in, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cravings_intervention ON public.cravings(coach_intervention_received, intervention_helpful);

-- RLS policies for cravings
ALTER TABLE public.cravings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cravings"
  ON public.cravings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cravings"
  ON public.cravings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cravings"
  ON public.cravings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cravings"
  ON public.cravings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. THOUGHT RECORDS (CBT Methodology)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.thought_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- CBT framework (standard thought record format)
  situation TEXT NOT NULL, -- "Saw donut at work"
  automatic_thought TEXT NOT NULL, -- "I deserve this, I've been good"
  cognitive_distortion TEXT[], -- ['all_or_nothing', 'emotional_reasoning', 'should_statements', 'catastrophizing', 'overgeneralization']
  emotion TEXT, -- 'guilt', 'shame', 'pride', 'anxiety', 'sadness', 'anger', 'joy'
  emotion_intensity INTEGER, -- 1-10

  -- Behavioral response
  behavior TEXT, -- 'ate_donut', 'walked_away', 'ate_half', 'delayed_decision', 'sought_support'
  consequence TEXT, -- 'felt_guilty_later', 'felt_proud', 'felt_neutral', 'gained_confidence'

  -- Reframing (AI coach helps with this)
  alternative_thought TEXT, -- "One donut won't ruin my progress"
  reframe_helpful BOOLEAN,
  emotion_after_reframe INTEGER, -- 1-10: emotion intensity after reframing

  -- Coach interaction
  coach_suggested_reframe TEXT,
  user_modified_reframe TEXT, -- User's personalized version
  reframe_quality_rating INTEGER, -- 1-10: how helpful was the reframe

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT thought_records_emotion_intensity_range CHECK (emotion_intensity IS NULL OR emotion_intensity BETWEEN 1 AND 10),
  CONSTRAINT thought_records_emotion_after_range CHECK (emotion_after_reframe IS NULL OR emotion_after_reframe BETWEEN 1 AND 10),
  CONSTRAINT thought_records_quality_range CHECK (reframe_quality_rating IS NULL OR reframe_quality_rating BETWEEN 1 AND 10)
);

-- Indexes for thought_records
CREATE INDEX IF NOT EXISTS idx_thought_records_user_created ON public.thought_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thought_records_distortions ON public.thought_records USING GIN(cognitive_distortion);
CREATE INDEX IF NOT EXISTS idx_thought_records_helpful ON public.thought_records(user_id, reframe_helpful, created_at DESC);

-- RLS policies for thought_records
ALTER TABLE public.thought_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thought records"
  ON public.thought_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own thought records"
  ON public.thought_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own thought records"
  ON public.thought_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own thought records"
  ON public.thought_records FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. HABIT COMPLETIONS (Companion to existing habit_stacks table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_stack_id UUID NOT NULL REFERENCES public.habit_stacks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Completion details
  completed BOOLEAN NOT NULL,
  difficulty_rating INTEGER, -- 1-10: how hard was it?
  satisfaction_rating INTEGER, -- 1-10: how satisfied with completing it?

  -- Context
  time_of_day TIME,
  mood_before TEXT, -- 'positive', 'negative', 'neutral', 'stressed', 'energized'
  mood_after TEXT,

  -- Notes and learning
  notes TEXT,
  barriers_encountered TEXT[], -- ['no_time', 'forgot', 'too_tired', 'distracted', 'not_motivated']

  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT habit_completions_difficulty_range CHECK (difficulty_rating IS NULL OR difficulty_rating BETWEEN 1 AND 10),
  CONSTRAINT habit_completions_satisfaction_range CHECK (satisfaction_rating IS NULL OR satisfaction_rating BETWEEN 1 AND 10)
);

-- Indexes for habit_completions
CREATE INDEX IF NOT EXISTS idx_habit_completions_stack ON public.habit_completions(habit_stack_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date ON public.habit_completions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_habit_completions_completed ON public.habit_completions(user_id, completed, completed_at DESC);

-- RLS policies for habit_completions
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit completions"
  ON public.habit_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habit completions"
  ON public.habit_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habit completions"
  ON public.habit_completions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habit completions"
  ON public.habit_completions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. LAPSES (Relapse Prevention & Recovery)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lapses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Lapse classification
  lapse_type TEXT NOT NULL, -- 'overeating', 'binge', 'skipped_logging', 'abandoned_plan', 'excessive_restriction'
  severity TEXT, -- 'minor', 'moderate', 'major'

  -- What happened
  trigger_description TEXT,
  foods_consumed JSONB, -- Array of {food_name, calories, amount}
  estimated_calories INTEGER,

  -- Emotional state during lapse
  emotions_during TEXT[], -- ['guilt', 'shame', 'relief', 'anger', 'sadness', 'stress']
  thoughts_during TEXT, -- Free-form description of thoughts

  -- Recovery tracking (CRITICAL for preventing full relapse)
  recovery_action TEXT, -- 'got_back_on_track', 'talked_to_coach', 'talked_to_friend', 'journaled', 'gave_up_temporarily'
  recovery_time_hours INTEGER, -- How long until they got back on track?

  -- AI intervention effectiveness
  coach_helped_recovery BOOLEAN,
  intervention_type TEXT, -- 'compassionate_reframe', 'action_plan', 'distraction', 'education', 'accountability'

  -- Learning and prevention
  what_learned TEXT, -- User's reflection
  prevention_plan TEXT, -- Plan for next time this trigger occurs

  -- Timing
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recovered_at TIMESTAMPTZ,

  CONSTRAINT lapses_severity_valid CHECK (severity IN ('minor', 'moderate', 'major'))
);

-- Indexes for lapses
CREATE INDEX IF NOT EXISTS idx_lapses_user_occurred ON public.lapses(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lapses_severity ON public.lapses(user_id, severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lapses_recovery ON public.lapses(user_id, recovered_at);
CREATE INDEX IF NOT EXISTS idx_lapses_coach_intervention ON public.lapses(coach_helped_recovery, intervention_type);

-- RLS policies for lapses
ALTER TABLE public.lapses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lapses"
  ON public.lapses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lapses"
  ON public.lapses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lapses"
  ON public.lapses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lapses"
  ON public.lapses FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration creates 7 critical tables for psychology-driven AI coaching:
--
-- 1. water_intake (2 indexes, 4 RLS policies)
-- 2. weight_history (2 indexes, 4 RLS policies)
-- 3. mood_check_ins (3 indexes, 4 RLS policies)
-- 4. cravings (3 indexes, 4 RLS policies)
-- 5. thought_records (3 indexes, 4 RLS policies)
-- 6. habit_completions (3 indexes, 4 RLS policies)
-- 7. lapses (4 indexes, 4 RLS policies)
--
-- Total: 7 tables, 20 indexes, 28 RLS policies
--
-- AI Training Value:
-- - mood_check_ins → Predict emotional eating 24hrs in advance
-- - cravings → Intervene before user gives in
-- - thought_records → Personalize CBT reframes
-- - habit_completions → Predict adherence likelihood
-- - lapses → Prevent relapse spirals
-- - weight_history → Track progress and motivate users
-- - water_intake → Basic health tracking users expect
--
-- These tables provide the competitive advantage for a psychology-driven AI coach!

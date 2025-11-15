-- =====================================================
-- DYNAMIC PERSONALIZATION INFRASTRUCTURE
-- =====================================================
-- Purpose: Enable adaptive UI/UX based on user onboarding & needs
-- Examples:
--   - Vegan users → carbon footprint metrics
--   - Muscle builders → protein/lean mass goals
--   - Intermittent fasting → fasting timer components
--
-- Architecture: Server-driven UI with rules engine
-- =====================================================

-- =====================================================
-- 1. USER TRAITS & PREFERENCES
-- =====================================================
-- Declarative user characteristics learned from onboarding or AI inference

CREATE TABLE IF NOT EXISTS public.user_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trait_key TEXT NOT NULL,         -- 'diet_type', 'goal_primary', 'ethics_carbon', 'fasting_window'
  trait_value TEXT NOT NULL,       -- 'vegan', 'hypertrophy', 'high', '16:8'
  confidence NUMERIC DEFAULT 1.0,  -- 0.0-1.0 certainty
  source TEXT DEFAULT 'onboarding', -- 'onboarding', 'inference', 'coach', 'user_edit'
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  -- Prevent duplicate trait keys per user
  CONSTRAINT user_traits_unique UNIQUE(user_id, trait_key)
);

CREATE INDEX IF NOT EXISTS idx_user_traits_user_key
  ON public.user_traits(user_id, trait_key);

CREATE INDEX IF NOT EXISTS idx_user_traits_key_value
  ON public.user_traits(trait_key, trait_value);

COMMENT ON TABLE public.user_traits IS 'User characteristics for dynamic personalization';
COMMENT ON COLUMN public.user_traits.confidence IS '0.0-1.0 certainty (0.5 = uncertain, 1.0 = explicit user selection)';

-- =====================================================
-- 2. FEATURE FLAGS & EXPERIMENTS
-- =====================================================
-- Per-user feature gating and A/B testing

CREATE TABLE IF NOT EXISTS public.user_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,       -- 'carbon_metric', 'hypertrophy_goal_pack', 'fasting_coach'
  enabled BOOLEAN DEFAULT FALSE,
  variant TEXT DEFAULT 'control',  -- 'control', 'variant_a', 'variant_b'
  meta JSONB DEFAULT '{}',         -- Feature-specific config
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  CONSTRAINT user_features_unique UNIQUE(user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_user_features_user
  ON public.user_features(user_id);

CREATE INDEX IF NOT EXISTS idx_user_features_key_enabled
  ON public.user_features(feature_key, enabled);

COMMENT ON TABLE public.user_features IS 'Per-user feature flags and A/B test variants';

-- =====================================================
-- 3. GOAL TEMPLATES
-- =====================================================
-- Reusable goal configurations for different user types

CREATE TABLE IF NOT EXISTS public.goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,        -- 'goal_cut_weight', 'goal_gain_muscle', 'goal_lower_carbon'
  title TEXT NOT NULL,
  description TEXT,
  params JSONB DEFAULT '{}',       -- Macro targets, weekly progression, deload rules
  eligibility JSONB DEFAULT '{}',  -- Predicate spec for who can use this goal
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_goal_templates_key
  ON public.goal_templates(key);

COMMENT ON TABLE public.goal_templates IS 'Reusable goal configurations (e.g., cutting, bulking, vegan ethics)';

-- =====================================================
-- 4. UI COMPONENT REGISTRY
-- =====================================================
-- Server-driven UI component definitions

CREATE TABLE IF NOT EXISTS public.ui_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,        -- 'card_carbon_savings', 'macro_dial', 'fasting_timer'
  kind TEXT NOT NULL,              -- 'card', 'chart', 'form', 'list', 'cta'
  props_schema JSONB DEFAULT '{}', -- JSON schema for client validation
  data_query TEXT,                 -- SQL query or view name to hydrate props
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  CONSTRAINT ui_components_kind_check CHECK (kind IN ('card', 'chart', 'form', 'list', 'cta', 'modal', 'widget'))
);

CREATE INDEX IF NOT EXISTS idx_ui_components_key
  ON public.ui_components(key);

CREATE INDEX IF NOT EXISTS idx_ui_components_kind
  ON public.ui_components(kind);

COMMENT ON TABLE public.ui_components IS 'Registry of UI components for server-driven rendering';

-- =====================================================
-- 5. UI LAYOUTS
-- =====================================================
-- Declarative screen layouts composed of components

CREATE TABLE IF NOT EXISTS public.ui_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,        -- 'layout_vegan_focus', 'layout_hypertrophy', 'layout_weight_loss'
  area TEXT NOT NULL,              -- 'home', 'coach_inbox', 'meal_logger', 'progress'
  components JSONB NOT NULL,       -- Array of {component_key, props_overrides, position}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ui_layouts_key
  ON public.ui_layouts(key);

CREATE INDEX IF NOT EXISTS idx_ui_layouts_area
  ON public.ui_layouts(area);

COMMENT ON TABLE public.ui_layouts IS 'Declarative screen layouts for different user types';

-- =====================================================
-- 6. PERSONALIZATION RULES ENGINE
-- =====================================================
-- Simple, explainable rules mapping traits → UI/features/goals

CREATE TABLE IF NOT EXISTS public.personalization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority INT DEFAULT 100,        -- Lower = evaluated earlier
  predicate JSONB NOT NULL,        -- {"all": [{"trait": "diet_type", "op": "eq", "value": "vegan"}]}
  effects JSONB NOT NULL,          -- {"enable_features": ["carbon_metric"], "layout": "layout_vegan_focus"}
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_personalization_rules_priority
  ON public.personalization_rules(priority) WHERE active = TRUE;

COMMENT ON TABLE public.personalization_rules IS 'Rules engine for dynamic personalization';
COMMENT ON COLUMN public.personalization_rules.predicate IS 'JSON predicate: {"all"|"any"|"not": [...conditions]}';
COMMENT ON COLUMN public.personalization_rules.effects IS 'Actions: {"enable_features": [...], "layout": "...", "add_goals": [...]}';

-- =====================================================
-- ENVIRONMENTAL IMPACT TRACKING (for vegan users)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_environmental_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Carbon footprint
  carbon_saved_kg_co2 NUMERIC DEFAULT 0,
  vs_average_american_diet_carbon NUMERIC,  -- Baseline comparison

  -- Water footprint
  water_saved_liters NUMERIC DEFAULT 0,
  vs_average_american_diet_water NUMERIC,

  -- Animal welfare
  animals_saved_count NUMERIC DEFAULT 0,

  -- Gamification equivalents
  equivalent_trees_planted INT,
  equivalent_miles_not_driven NUMERIC,

  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_environmental_metrics_unique UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_environmental_metrics_user_date
  ON public.user_environmental_metrics(user_id, date DESC);

COMMENT ON TABLE public.user_environmental_metrics IS 'Environmental impact tracking for vegan/plant-based users';

-- Add carbon footprint to food entries
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS carbon_footprint_kg_co2 NUMERIC,
  ADD COLUMN IF NOT EXISTS is_plant_based BOOLEAN;

COMMENT ON COLUMN public.food_entries.carbon_footprint_kg_co2 IS 'Carbon footprint in kg CO2 equivalent';
COMMENT ON COLUMN public.food_entries.is_plant_based IS 'True if food is 100% plant-based (vegan)';

-- =====================================================
-- MUSCLE BUILDING ENHANCEMENTS
-- =====================================================

-- Add muscle-specific fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_lean_body_mass_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS current_body_fat_percentage NUMERIC;

-- Add muscle-specific metrics to daily_metrics
ALTER TABLE public.daily_metrics
  ADD COLUMN IF NOT EXISTS protein_per_kg_bodyweight NUMERIC,
  ADD COLUMN IF NOT EXISTS strength_training_sessions INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progressive_overload_met BOOLEAN;

COMMENT ON COLUMN public.profiles.target_lean_body_mass_kg IS 'Goal lean body mass for muscle building';
COMMENT ON COLUMN public.daily_metrics.protein_per_kg_bodyweight IS 'Daily protein intake divided by body weight';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Evaluate JSON predicate against user traits
CREATE OR REPLACE FUNCTION public.predicate_match(
  p_user_id UUID,
  p_predicate JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
  v_condition JSONB;
  v_trait_value TEXT;
  v_expected_value TEXT;
  v_op TEXT;
  v_all_match BOOLEAN := TRUE;
  v_any_match BOOLEAN := FALSE;
BEGIN
  -- Handle "all" operator (AND)
  IF p_predicate ? 'all' THEN
    FOR v_condition IN SELECT * FROM jsonb_array_elements(p_predicate->'all')
    LOOP
      v_trait_value := (
        SELECT trait_value FROM public.user_traits
        WHERE user_id = p_user_id
          AND trait_key = v_condition->>'trait'
        LIMIT 1
      );

      v_expected_value := v_condition->>'value';
      v_op := COALESCE(v_condition->>'op', 'eq');

      IF v_op = 'eq' AND v_trait_value != v_expected_value THEN
        RETURN FALSE;
      ELSIF v_op = 'neq' AND v_trait_value = v_expected_value THEN
        RETURN FALSE;
      ELSIF v_op = 'in' AND NOT (v_trait_value = ANY(ARRAY(SELECT jsonb_array_elements_text(v_condition->'value')))) THEN
        RETURN FALSE;
      END IF;
    END LOOP;
    RETURN TRUE;
  END IF;

  -- Handle "any" operator (OR)
  IF p_predicate ? 'any' THEN
    FOR v_condition IN SELECT * FROM jsonb_array_elements(p_predicate->'any')
    LOOP
      v_trait_value := (
        SELECT trait_value FROM public.user_traits
        WHERE user_id = p_user_id
          AND trait_key = v_condition->>'trait'
        LIMIT 1
      );

      v_expected_value := v_condition->>'value';
      v_op := COALESCE(v_condition->>'op', 'eq');

      IF v_op = 'eq' AND v_trait_value = v_expected_value THEN
        RETURN TRUE;
      ELSIF v_op = 'in' AND v_trait_value = ANY(ARRAY(SELECT jsonb_array_elements_text(v_condition->'value'))) THEN
        RETURN TRUE;
      END IF;
    END LOOP;
    RETURN FALSE;
  END IF;

  -- Handle "not" operator
  IF p_predicate ? 'not' THEN
    RETURN NOT public.predicate_match(p_user_id, p_predicate->'not');
  END IF;

  -- Default: true (no predicates = always match)
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.predicate_match IS 'Evaluate JSON predicate against user traits';

-- Main function: compute UI layout for user
CREATE OR REPLACE FUNCTION public.select_ui_layout(
  p_user_id UUID,
  p_area TEXT DEFAULT 'home'
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_rule RECORD;
  v_enabled_features TEXT[] := '{}';
  v_chosen_layout TEXT := NULL;
  v_effects JSONB;
  v_layout_json JSONB;
BEGIN
  -- Iterate through rules in priority order
  FOR v_rule IN
    SELECT * FROM public.personalization_rules
    WHERE active = TRUE
    ORDER BY priority
  LOOP
    -- Check if rule matches user
    IF public.predicate_match(p_user_id, v_rule.predicate) THEN
      v_effects := v_rule.effects;

      -- Accumulate enabled features
      IF v_effects ? 'enable_features' THEN
        v_enabled_features := v_enabled_features || ARRAY(
          SELECT jsonb_array_elements_text(v_effects->'enable_features')
        );
      END IF;

      -- Pick first matching layout for this area
      IF v_effects ? 'layout' AND v_chosen_layout IS NULL THEN
        v_chosen_layout := v_effects->>'layout';
      END IF;
    END IF;
  END LOOP;

  -- Fallback to default layout if none selected
  IF v_chosen_layout IS NULL THEN
    SELECT key INTO v_chosen_layout
    FROM public.ui_layouts
    WHERE area = p_area
    ORDER BY key
    LIMIT 1;
  END IF;

  -- Get layout details
  SELECT jsonb_build_object(
    'key', key,
    'area', area,
    'components', components
  ) INTO v_layout_json
  FROM public.ui_layouts
  WHERE key = v_chosen_layout;

  -- Return complete UI config
  RETURN jsonb_build_object(
    'features', v_enabled_features,
    'layout', v_layout_json
  );
END;
$$;

COMMENT ON FUNCTION public.select_ui_layout IS 'Compute dynamic UI layout based on user traits and rules';

-- =====================================================
-- SEED DATA: DEFAULT RULES
-- =====================================================

-- Rule 1: Vegan users get carbon tracking
INSERT INTO public.personalization_rules (name, priority, predicate, effects) VALUES
(
  'Vegan Carbon Tracking',
  10,
  '{"all": [{"trait": "diet_type", "op": "eq", "value": "vegan"}]}'::jsonb,
  '{"enable_features": ["carbon_metric", "environmental_dashboard"], "layout": "layout_vegan_focus"}'::jsonb
),
-- Rule 2: Muscle builders get protein tracking
(
  'Muscle Building Focus',
  20,
  '{"any": [
    {"trait": "goal_primary", "op": "eq", "value": "hypertrophy"},
    {"trait": "goal_primary", "op": "eq", "value": "muscle_gain"}
  ]}'::jsonb,
  '{"enable_features": ["protein_tracking", "lean_mass_goal", "progressive_overload"], "layout": "layout_hypertrophy"}'::jsonb
),
-- Rule 3: Intermittent fasters get fasting timer
(
  'Intermittent Fasting',
  30,
  '{"all": [{"trait": "eating_pattern", "op": "eq", "value": "intermittent_fasting"}]}'::jsonb,
  '{"enable_features": ["fasting_timer", "fasting_coach"], "add_goals": ["goal_fasting_adherence"]}'::jsonb
),
-- Rule 4: Weight loss default
(
  'Weight Loss Default',
  100,
  '{"any": [
    {"trait": "goal_primary", "op": "eq", "value": "weight_loss"},
    {"trait": "goal_primary", "op": "eq", "value": "fat_loss"}
  ]}'::jsonb,
  '{"layout": "layout_weight_loss"}'::jsonb
);

-- =====================================================
-- SEED DATA: UI COMPONENTS
-- =====================================================

INSERT INTO public.ui_components (key, kind, props_schema, data_query) VALUES
(
  'card_carbon_savings',
  'card',
  '{"type": "object", "properties": {"carbon_saved_kg": {"type": "number"}, "trees_equivalent": {"type": "number"}}}'::jsonb,
  'SELECT carbon_saved_kg_co2, equivalent_trees_planted FROM user_environmental_metrics WHERE user_id = $1 ORDER BY date DESC LIMIT 1'
),
(
  'card_protein_progress',
  'card',
  '{"type": "object", "properties": {"protein_g": {"type": "number"}, "target_g": {"type": "number"}, "per_kg": {"type": "number"}}}'::jsonb,
  'SELECT actual_protein_g, target_protein_g, protein_per_kg_bodyweight FROM daily_metrics WHERE user_id = $1 ORDER BY date DESC LIMIT 1'
),
(
  'card_adherence_score',
  'card',
  '{"type": "object", "properties": {"score": {"type": "number"}, "streak": {"type": "number"}}}'::jsonb,
  'SELECT adherence_score, current_streak FROM daily_metrics JOIN user_streaks USING(user_id) WHERE user_id = $1 ORDER BY date DESC LIMIT 1'
),
(
  'widget_fasting_timer',
  'widget',
  '{"type": "object", "properties": {"fasting_start": {"type": "string"}, "target_hours": {"type": "number"}}}'::jsonb,
  NULL -- Client-side timer
),
(
  'chart_weight_trajectory',
  'chart',
  '{"type": "object", "properties": {"data": {"type": "array"}}}'::jsonb,
  'SELECT * FROM project_weight_trajectory($1, 30)'
);

-- =====================================================
-- SEED DATA: UI LAYOUTS
-- =====================================================

INSERT INTO public.ui_layouts (key, area, components) VALUES
(
  'layout_vegan_focus',
  'home',
  '[
    {"component_key": "card_carbon_savings", "position": 1},
    {"component_key": "card_adherence_score", "position": 2},
    {"component_key": "chart_weight_trajectory", "position": 3}
  ]'::jsonb
),
(
  'layout_hypertrophy',
  'home',
  '[
    {"component_key": "card_protein_progress", "position": 1},
    {"component_key": "card_adherence_score", "position": 2},
    {"component_key": "chart_weight_trajectory", "position": 3}
  ]'::jsonb
),
(
  'layout_weight_loss',
  'home',
  '[
    {"component_key": "card_adherence_score", "position": 1},
    {"component_key": "chart_weight_trajectory", "position": 2}
  ]'::jsonb
);

-- =====================================================
-- SEED DATA: GOAL TEMPLATES
-- =====================================================

INSERT INTO public.goal_templates (key, title, description, params, eligibility) VALUES
(
  'goal_cut_weight',
  'Cut Weight',
  'Lose fat while preserving muscle',
  '{"calorie_deficit": 500, "protein_multiplier": 2.2, "weekly_loss_kg": 0.5}'::jsonb,
  '{"any": [{"trait": "goal_primary", "op": "eq", "value": "weight_loss"}]}'::jsonb
),
(
  'goal_gain_muscle',
  'Build Muscle',
  'Gain lean mass with minimal fat',
  '{"calorie_surplus": 300, "protein_multiplier": 2.0, "weekly_gain_kg": 0.25}'::jsonb,
  '{"any": [{"trait": "goal_primary", "op": "eq", "value": "muscle_gain"}]}'::jsonb
),
(
  'goal_lower_carbon',
  'Lower Carbon Footprint',
  'Reduce environmental impact through diet',
  '{"target_carbon_reduction_pct": 50, "plant_based_meals_per_day": 2}'::jsonb,
  '{"all": [{"trait": "ethics_carbon", "op": "in", "value": ["high", "medium"]}]}'::jsonb
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.user_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_environmental_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_traits_select ON public.user_traits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_traits_insert ON public.user_traits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_traits_update ON public.user_traits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY user_features_select ON public.user_features
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_environmental_metrics_select ON public.user_environmental_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Public read access to templates, components, layouts, rules
ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY goal_templates_select_all ON public.goal_templates
  FOR SELECT USING (true);

CREATE POLICY ui_components_select_all ON public.ui_components
  FOR SELECT USING (true);

CREATE POLICY ui_layouts_select_all ON public.ui_layouts
  FOR SELECT USING (true);

CREATE POLICY personalization_rules_select_all ON public.personalization_rules
  FOR SELECT USING (true);

-- =====================================================
-- TRIGGERS: AUTO-UPDATE TIMESTAMPS
-- =====================================================

CREATE TRIGGER trigger_user_traits_updated_at
  BEFORE UPDATE ON public.user_traits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_user_features_updated_at
  BEFORE UPDATE ON public.user_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- DONE
-- =====================================================
-- Schema supports:
-- ✅ Dynamic UI based on user traits
-- ✅ Feature gating and A/B testing
-- ✅ Vegan carbon tracking
-- ✅ Muscle building metrics
-- ✅ Intermittent fasting support
-- ✅ Server-driven UI (no app rebuild needed!)
-- =====================================================

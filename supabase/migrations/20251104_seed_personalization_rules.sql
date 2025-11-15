-- =====================================================
-- SEED PERSONALIZATION RULES - 4 EXAMPLE PERSONAS
-- =====================================================
-- Purpose: Insert example personalization rules for testing
-- Date: 2025-11-04
-- Personas:
--   1. Vegan Carbon-Conscious
--   2. Muscle Builder (Hypertrophy Focus)
--   3. Intermittent Faster
--   4. Emotional Eating Support
-- =====================================================

-- =====================================================
-- 1. VEGAN CARBON-CONSCIOUS LAYOUT
-- =====================================================

INSERT INTO personalization_rules (name, priority, predicate, effects, active)
VALUES (
  'Vegan Carbon Focus Layout',
  10,  -- Highest priority (identity-based)
  '{
    "all": [
      {"trait": "diet_type", "op": "eq", "value": "vegan"},
      {"trait": "ethics_carbon", "op": "in", "value": ["high", "medium"]}
    ]
  }'::JSONB,
  '{
    "home_layout": "layout_vegan_focus",
    "coach_persona": "coach_verdant_avatar",
    "enable_features": ["carbon_metric", "plant_protein_tracking"],
    "primary_color": "#22C55E"
  }'::JSONB,
  TRUE
) ON CONFLICT (name) DO UPDATE
  SET predicate = EXCLUDED.predicate,
      effects = EXCLUDED.effects,
      active = EXCLUDED.active;

-- =====================================================
-- 2. MUSCLE BUILDER LAYOUT
-- =====================================================

INSERT INTO personalization_rules (name, priority, predicate, effects, active)
VALUES (
  'Muscle Builder Focus Layout',
  30,  -- Medium priority (goal-based)
  '{
    "all": [
      {"trait": "goal_primary", "op": "in", "value": ["hypertrophy", "performance"]},
      {"trait": "personality_type", "op": "eq", "value": "analytical"}
    ]
  }'::JSONB,
  '{
    "home_layout": "layout_muscle_builder",
    "coach_persona": "coach_aetheris_avatar",
    "enable_features": ["detailed_macro_charts", "body_measurements", "protein_optimization"],
    "primary_color": "#4DD0E1"
  }'::JSONB,
  TRUE
) ON CONFLICT (name) DO UPDATE
  SET predicate = EXCLUDED.predicate,
      effects = EXCLUDED.effects,
      active = EXCLUDED.active;

-- =====================================================
-- 3. INTERMITTENT FASTING LAYOUT
-- =====================================================

INSERT INTO personalization_rules (name, priority, predicate, effects, active)
VALUES (
  'Intermittent Fasting Layout',
  20,  -- Medium-high priority (diet-based)
  '{
    "trait": "diet_type", "op": "eq", "value": "intermittent_fasting"
  }'::JSONB,
  '{
    "home_layout": "layout_if_focus",
    "coach_persona": "coach_aetheris_avatar",
    "enable_features": ["fasting_timer", "eating_window_countdown", "autophagy_tracker"],
    "primary_color": "#9C27B0"
  }'::JSONB,
  TRUE
) ON CONFLICT (name) DO UPDATE
  SET predicate = EXCLUDED.predicate,
      effects = EXCLUDED.effects,
      active = EXCLUDED.active;

-- =====================================================
-- 4. EMOTIONAL EATING SUPPORT LAYOUT
-- =====================================================

INSERT INTO personalization_rules (name, priority, predicate, effects, active)
VALUES (
  'Emotional Eating Support Layout',
  15,  -- High priority (behavioral)
  '{
    "all": [
      {"trait": "emotional_eating_risk", "op": "in", "value": ["high", "medium"]},
      {"trait": "emotional_eating_risk", "min_confidence": 0.6}
    ]
  }'::JSONB,
  '{
    "home_layout": "layout_emotional_support",
    "coach_persona": "coach_veloura_avatar",
    "enable_features": ["mood_check_in", "coping_strategies", "emotional_eating_streak"],
    "primary_color": "#F5A9C8"
  }'::JSONB,
  TRUE
) ON CONFLICT (name) DO UPDATE
  SET predicate = EXCLUDED.predicate,
      effects = EXCLUDED.effects,
      active = EXCLUDED.active;

-- =====================================================
-- 5. DEFAULT FALLBACK LAYOUT
-- =====================================================

INSERT INTO personalization_rules (name, priority, predicate, effects, active)
VALUES (
  'Default Layout (Fallback)',
  100,  -- Lowest priority (always matches)
  '{}'::JSONB,  -- Empty predicate = always true
  '{
    "home_layout": "layout_default",
    "coach_persona": "coach_decibel_avatar",
    "enable_features": ["basic_meal_log", "basic_stats"],
    "primary_color": "#FF5252"
  }'::JSONB,
  TRUE
) ON CONFLICT (name) DO UPDATE
  SET predicate = EXCLUDED.predicate,
      effects = EXCLUDED.effects,
      active = EXCLUDED.active;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
  name,
  priority,
  predicate->>'trait' as simple_trait,
  effects->>'home_layout' as layout,
  effects->>'coach_persona' as coach,
  active
FROM personalization_rules
ORDER BY priority;

-- =====================================================
-- DONE: 5 Personalization Rules Seeded
-- =====================================================

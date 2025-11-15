-- =====================================================
-- SEED: ADDITIONAL BRAND ASSETS - Food Quality Badges & Cat Coach
-- =====================================================
-- Purpose: Add food quality rating badges + additional coach persona
-- Date: 2025-11-03
-- =====================================================

-- =====================================================
-- 1. FOOD QUALITY RATING BADGES (for food recommendations)
-- =====================================================

INSERT INTO public.brand_assets (
  asset_name,
  asset_type,
  asset_category,
  file_url,
  alt_text,
  file_format,
  usage_context,
  usage_notes,
  is_active
) VALUES
-- Pink Fire - Elite/Best Choice
(
  'badge_pink_fire_elite',
  'icon',
  'food_quality_rating',
  'file:///path/to/pink_fire_elite_badge.png',
  'Pink fire brain badge - Elite food choice',
  'png',
  ARRAY['food_recommendations', 'food_entries', 'meal_planning'],
  'ELITE TIER - Use for foods with optimal nutrition: high protein, high fiber, low sugar, low calorie density. Perfect alignment with user goals. Show on food entries and recommendations.',
  TRUE
),
-- Green Good - Solid Choice
(
  'badge_green_good',
  'icon',
  'food_quality_rating',
  'file:///path/to/good_solid_choice_badge.png',
  'Green leaf badge - Good solid food choice',
  'png',
  ARRAY['food_recommendations', 'food_entries', 'meal_planning'],
  'GOOD TIER - Nutritionally sound foods: decent protein/fiber, moderate calories. Not perfect but solid choice. Most everyday healthy foods.',
  TRUE
),
-- Yellow Caution - Watch It
(
  'badge_yellow_caution',
  'icon',
  'food_quality_rating',
  'file:///path/to/caution_okay_but_watch_badge.png',
  'Yellow caution badge - Okay but watch portion',
  'png',
  ARRAY['food_recommendations', 'food_entries', 'meal_planning'],
  'CAUTION TIER - Foods to watch: higher sugar, moderate to high calories. Not banned but portion control important. Show yellow warning.',
  TRUE
),
-- Red Heavy - High Risk
(
  'badge_red_heavy',
  'icon',
  'food_quality_rating',
  'file:///path/to/heavy_high_risk_badge.png',
  'Red hamburger bomb badge - Heavy high calorie/risk food',
  'png',
  ARRAY['food_recommendations', 'food_entries', 'emotional_eating_detection'],
  'HEAVY TIER - High calorie, low nutrition density foods. Not forbidden but flag for emotional eating check-in. Show red warning with supportive message.',
  TRUE
),
-- Grey Soot - Worst Category
(
  'badge_grey_soot',
  'icon',
  'food_quality_rating',
  'file:///path/to/soot_worst_category_badge.png',
  'Grey burnt brain badge - Nutritionally empty food',
  'png',
  ARRAY['food_recommendations', 'food_entries', 'emotional_eating_detection'],
  'SOOT TIER - Nutritionally empty, ultra-processed. Trigger mood check-in. Not shaming - supportive: "I see you logged this. How are you feeling?"',
  TRUE
),
-- Blue Brain Smart - Cognition First
(
  'badge_blue_brain_smart',
  'icon',
  'achievement_badge',
  'file:///path/to/brain_smart_cognition_badge.png',
  'Blue diamond brain badge - Cognitive achievement',
  'png',
  ARRAY['achievements', 'gamification', 'nutrition_knowledge'],
  'COGNITION-FIRST badge - Awarded for learning nutrition knowledge, understanding macros, mastering food logging. Part of "Brain Smart" achievement series.',
  TRUE
);

-- =====================================================
-- 2. ADDITIONAL COACH PERSONA - Coach Aetheris (Cat)
-- =====================================================

INSERT INTO public.brand_assets (
  asset_name,
  asset_type,
  asset_category,
  file_url,
  alt_text,
  file_format,
  usage_context,
  usage_notes,
  is_active
) VALUES
(
  'coach_aetheris_avatar',
  'coach_avatar',
  'coach_persona',
  'file:///path/to/coach_aetheris_cat.png',
  'Coach Aetheris - Cyberpunk cat character with pink and teal hair, tech-focused analytical coach',
  'png',
  ARRAY['coach_chat', 'coach_selection', 'data_driven_users'],
  'Use for ANALYTICAL/DATA-DRIVEN users who want quantified self approach. Tech-savvy, shows charts and trends, data-first coaching. Personality: Analytical, precise, uses data visualization, appeals to engineers/scientists. "Let me show you the data..."',
  TRUE
);

-- =====================================================
-- 3. ADDITIONAL LOGO VARIATIONS
-- =====================================================

-- Mind Forked Logo (Brain + Fork visual)
INSERT INTO public.brand_assets (
  asset_name,
  asset_type,
  asset_category,
  file_url,
  alt_text,
  file_format,
  usage_context,
  usage_notes,
  is_active
) VALUES
(
  'logo_mind_forked_visual',
  'logo',
  'primary_logo',
  'file:///path/to/mind_forked_brain_fork_logo.png',
  'MindFork logo - Pink brain in shape of M with fork',
  'png',
  ARRAY['splash_screen', 'marketing', 'social_media'],
  'Full visual logo with brain/fork imagery. Use for marketing materials, social media, splash screens. More playful than simple MF icon.',
  TRUE
);

-- =====================================================
-- 4. ADD FOOD QUALITY RATING SYSTEM TO FOOD ENTRIES
-- =====================================================

-- Add quality tier column to food_entries
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS quality_tier TEXT CHECK (quality_tier IN ('elite', 'good', 'caution', 'heavy', 'soot'));

COMMENT ON COLUMN public.food_entries.quality_tier IS 'Food quality rating: elite (pink fire), good (green), caution (yellow), heavy (red), soot (grey)';

-- =====================================================
-- 5. FUNCTION: Calculate Food Quality Tier
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_food_quality_tier(
  p_calories NUMERIC,
  p_protein_g NUMERIC,
  p_fiber_g NUMERIC,
  p_sugar_g NUMERIC,
  p_saturated_fat_g NUMERIC
) RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  v_protein_density NUMERIC;
  v_fiber_density NUMERIC;
  v_sugar_density NUMERIC;
  v_sat_fat_density NUMERIC;
  v_score NUMERIC := 0;
BEGIN
  -- Avoid division by zero
  IF p_calories = 0 OR p_calories IS NULL THEN
    RETURN 'soot'; -- No calorie info = worst category
  END IF;

  -- Calculate nutrient densities (per 100 calories)
  v_protein_density := (p_protein_g / p_calories) * 100;
  v_fiber_density := (p_fiber_g / p_calories) * 100;
  v_sugar_density := (p_sugar_g / p_calories) * 100;
  v_sat_fat_density := (p_saturated_fat_g / p_calories) * 100;

  -- Scoring system (research-backed thresholds)
  -- High protein density (+2 points)
  IF v_protein_density > 10 THEN v_score := v_score + 2;
  ELSIF v_protein_density > 5 THEN v_score := v_score + 1;
  END IF;

  -- High fiber density (+2 points)
  IF v_fiber_density > 5 THEN v_score := v_score + 2;
  ELSIF v_fiber_density > 2 THEN v_score := v_score + 1;
  END IF;

  -- Low sugar density (+1 point)
  IF v_sugar_density < 5 THEN v_score := v_score + 1;
  -- High sugar density (-2 points)
  ELSIF v_sugar_density > 15 THEN v_score := v_score - 2;
  ELSIF v_sugar_density > 10 THEN v_score := v_score - 1;
  END IF;

  -- Low saturated fat (+1 point)
  IF v_sat_fat_density < 2 THEN v_score := v_score + 1;
  -- High saturated fat (-1 point)
  ELSIF v_sat_fat_density > 5 THEN v_score := v_score - 1;
  END IF;

  -- Calorie density penalty (>200 kcal/100g = energy dense)
  IF p_calories > 200 THEN v_score := v_score - 1; END IF;

  -- Map score to tier
  IF v_score >= 4 THEN RETURN 'elite';     -- Pink fire
  ELSIF v_score >= 2 THEN RETURN 'good';   -- Green
  ELSIF v_score >= 0 THEN RETURN 'caution'; -- Yellow
  ELSIF v_score >= -2 THEN RETURN 'heavy';  -- Red
  ELSE RETURN 'soot';                       -- Grey
  END IF;
END;
$$;

COMMENT ON FUNCTION public.calculate_food_quality_tier IS 'Calculate food quality tier based on nutrient density';

-- =====================================================
-- 6. TRIGGER: Auto-Calculate Quality Tier on Food Entry
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_calculate_quality_tier()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.quality_tier := public.calculate_food_quality_tier(
    NEW.calories,
    NEW.protein_g,
    NEW.fiber_g,
    NEW.sugar_g,
    NEW.saturated_fat_g
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_quality_tier
  BEFORE INSERT OR UPDATE ON public.food_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_calculate_quality_tier();

-- =====================================================
-- 7. ACHIEVEMENT DEFINITIONS - Food Quality Based
-- =====================================================

INSERT INTO public.achievement_definitions (
  achievement_key,
  title,
  description,
  icon_url,
  rarity,
  unlock_criteria,
  xp_reward,
  category
) VALUES
-- Elite Streak Achievement
(
  'pink_fire_5_day_elite',
  'Pink Fire Streak',
  '5 days of only elite-tier foods',
  'badge_pink_fire_elite',
  'epic',
  '{"type": "quality_streak", "tier": "elite", "days": 5}'::jsonb,
  500,
  'nutrition'
),
-- Cognition First Achievement
(
  'brain_smart_100_logs',
  'Brain Smart',
  'Logged 100 foods with full nutrition data',
  'badge_blue_brain_smart',
  'rare',
  '{"type": "food_logs_complete", "count": 100}'::jsonb,
  300,
  'nutrition'
),
-- Recovery Achievement (logged soot tier but recovered)
(
  'recovered_from_soot',
  'Phoenix Rising',
  'Logged soot-tier food but next 3 meals were elite/good',
  'badge_grey_soot',
  'common',
  '{"type": "recovery_pattern", "from": "soot", "to": ["elite", "good"], "count": 3}'::jsonb,
  100,
  'nutrition'
);

-- =====================================================
-- 8. ADD COACH PERSONA RECOMMENDATION RULES
-- =====================================================

-- Analytical users get Coach Aetheris
INSERT INTO public.personalization_rules (
  name,
  priority,
  predicate,
  effects,
  active
) VALUES
(
  'Coach Aetheris for Analytical Users',
  5,
  '{"any": [
    {"trait": "personality_type", "op": "eq", "value": "analytical"},
    {"trait": "profession", "op": "in", "value": ["engineer", "scientist", "data_analyst"]},
    {"trait": "learning_style", "op": "eq", "value": "data_driven"}
  ]}'::jsonb,
  '{"recommended_coach": "coach_aetheris_avatar", "coach_message_style": "analytical_data_focused"}'::jsonb,
  TRUE
);

-- =====================================================
-- DONE: Food quality system + additional assets seeded
-- =====================================================

-- Example usage:
-- SELECT quality_tier FROM food_entries WHERE user_id = 'xxx' ORDER BY consumed_at DESC LIMIT 10;
-- SELECT calculate_food_quality_tier(350, 25, 8, 5, 3); -- Returns 'elite'
-- SELECT * FROM brand_assets WHERE asset_category = 'food_quality_rating';

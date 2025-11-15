-- =====================================================
-- SEED: BRAND ASSETS - COACH PERSONAS & APP ICONS
-- =====================================================
-- Purpose: Populate brand_assets with MindFork coach personas
-- Date: 2025-11-03
-- =====================================================

-- =====================================================
-- 1. APP ICONS & LOGOS
-- =====================================================

INSERT INTO public.brand_assets (
  asset_name,
  asset_type,
  asset_category,
  file_url,
  alt_text,
  file_format,
  dimensions_width,
  dimensions_height,
  usage_context,
  usage_notes,
  is_active
) VALUES
(
  'app_icon_primary',
  'logo',
  'primary_logo',
  'file:///apps/mobile/ios/MindFork/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png',
  'MindFork app icon - MF text on pink background',
  'png',
  1024,
  1024,
  ARRAY['app_icon', 'splash_screen', 'marketing'],
  'Primary app icon - simple, memorable MF branding',
  TRUE
);

-- =====================================================
-- 2. COACH PERSONA AVATARS
-- =====================================================

-- Coach Decibel: Loud, Motivational, High Energy
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
  'coach_decibel_avatar',
  'coach_avatar',
  'coach_persona',
  'file:///assets/screenshots/android/assets_coaches_coach_decibel.png',
  'Coach Decibel - Pink and red rooster character with megaphone, energetic and loud motivational coach',
  'png',
  ARRAY['coach_chat', 'coach_selection', 'notifications'],
  'Use for users who want HIGH ENERGY motivation, loud encouragement, drill sergeant style (but positive). Perfect for athletes, competitive types. Personality: LOUD, energetic, celebratory, uses ALL CAPS for emphasis',
  TRUE
);

-- Coach Synapse: Science-Based, Edgy, Roast Mode
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
  'coach_synapse_avatar',
  'coach_avatar',
  'coach_persona',
  'file:///assets/screenshots/android/assets_coaches_coach_synapse.png',
  'Coach Synapse - Skull character with brain made of fruits, wearing headphones, edgy science-based coach',
  'png',
  ARRAY['coach_chat', 'coach_selection', 'roast_mode'],
  'Use for users who want TOUGH LOVE, roast mode, direct feedback, science-backed reasoning. Perfect for users who requested roast mode, analytical types. Personality: Direct, uses science/data, occasional sarcasm, calls out excuses',
  TRUE
);

-- Coach Veloura: Supportive, Gentle, Empathetic
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
  'coach_veloura_avatar',
  'coach_avatar',
  'coach_persona',
  'file:///assets/screenshots/android/assets_coaches_coach_veloura.png',
  'Coach Veloura - Blonde duck character with heart pendant and pink jacket, warm and empathetic coach',
  'png',
  ARRAY['coach_chat', 'coach_selection', 'emotional_support'],
  'Use for users who need EMOTIONAL SUPPORT, gentle encouragement, empathy. Perfect for emotional eaters, users struggling with self-compassion. Personality: Warm (9/10), validating, acknowledges feelings, celebrates small wins',
  TRUE
);

-- Coach Verdant: Plant-Based Expert, Vegan Focus
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
  'coach_verdant_avatar',
  'coach_avatar',
  'coach_persona',
  'file:///assets/screenshots/android/assets_coaches_coach_verdant.png',
  'Coach Verdant - Bird character with binocular eyes showing vegetables, plant-based nutrition expert',
  'png',
  ARRAY['coach_chat', 'coach_selection', 'vegan_users'],
  'Use for VEGAN/VEGETARIAN users. Expert in plant-based nutrition, environmental impact, compassionate eating. Personality: Knowledgeable about plant nutrition, emphasizes environmental benefits, supportive of ethical eating',
  TRUE
);

-- =====================================================
-- 3. BADGE ASSETS (from your screenshots)
-- =====================================================

INSERT INTO public.brand_assets (
  asset_name, asset_type, asset_category, file_url, alt_text, file_format,
  usage_context, usage_notes, is_active
) VALUES
(
  'badge_soot_grey',
  'icon',
  'achievement_badge',
  'file:///assets/screenshots/android/assets_badges_soot_grey_badge.png',
  'Grey achievement badge',
  'png',
  ARRAY['achievements', 'gamification'],
  'Grey badge - locked state or basic achievement',
  TRUE
),
(
  'badge_good_green',
  'icon',
  'achievement_badge',
  'file:///assets/screenshots/android/assets_badges_good_green_badge.png',
  'Green achievement badge',
  'png',
  ARRAY['achievements', 'gamification'],
  'Green badge - plant-based achievements, environmental milestones',
  TRUE
),
(
  'badge_pink_brain',
  'icon',
  'achievement_badge',
  'file:///assets/screenshots/android/assets_badges_pink_brain_badge.png',
  'Pink brain achievement badge',
  'png',
  ARRAY['achievements', 'gamification'],
  'Pink brain badge - learning achievements, knowledge milestones',
  TRUE
),
(
  'badge_brain_smart',
  'icon',
  'achievement_badge',
  'file:///assets/screenshots/android/assets_badges_brain_smart_badge.png',
  'Smart brain achievement badge',
  'png',
  ARRAY['achievements', 'gamification'],
  'Smart brain badge - advanced learning, mastery achievements',
  TRUE
),
(
  'badge_yellow_caution',
  'icon',
  'achievement_badge',
  'file:///assets/screenshots/android/assets_badges_yellow_caution_badge.png',
  'Yellow caution achievement badge',
  'png',
  ARRAY['achievements', 'gamification'],
  'Yellow caution badge - challenge achievements, warning-related milestones',
  TRUE
),
(
  'badge_red_hamburger_bomb',
  'icon',
  'achievement_badge',
  'file:///assets/screenshots/android/assets_badges_heavy_red_hamburger_bomb_badge.png',
  'Red hamburger bomb achievement badge',
  'png',
  ARRAY['achievements', 'gamification', 'challenges'],
  'Red bomb badge - intense challenges, hardcore achievements',
  TRUE
);

-- =====================================================
-- 4. COACH PERSONA TRAIT MAPPING (for personalization)
-- =====================================================

-- Create coach persona preference mapping
-- This connects user traits → recommended coach persona

COMMENT ON COLUMN public.brand_assets.usage_notes IS 'For coach avatars: describes personality, tone, ideal user type';

-- Add coach persona recommendations to personalization_rules
INSERT INTO public.personalization_rules (
  name,
  priority,
  predicate,
  effects,
  active
) VALUES
-- Vegan users get Coach Verdant
(
  'Coach Verdant for Vegans',
  5,
  '{"all": [{"trait": "diet_type", "op": "eq", "value": "vegan"}]}'::jsonb,
  '{"recommended_coach": "coach_verdant_avatar", "coach_message_style": "plant_based_expert"}'::jsonb,
  TRUE
),
-- Users who opted for roast mode get Coach Synapse
(
  'Coach Synapse for Roast Mode',
  5,
  '{"all": [{"trait": "coach_tone_preference", "op": "eq", "value": "roast"}]}'::jsonb,
  '{"recommended_coach": "coach_synapse_avatar", "coach_message_style": "tough_love"}'::jsonb,
  TRUE
),
-- Users needing emotional support get Coach Veloura
(
  'Coach Veloura for Emotional Support',
  5,
  '{"any": [
    {"trait": "needs_emotional_support", "op": "eq", "value": "high"},
    {"trait": "emotional_eating_detected", "op": "eq", "value": "true"}
  ]}'::jsonb,
  '{"recommended_coach": "coach_veloura_avatar", "coach_message_style": "empathetic"}'::jsonb,
  TRUE
),
-- High-energy users get Coach Decibel
(
  'Coach Decibel for High Energy',
  5,
  '{"any": [
    {"trait": "personality_type", "op": "eq", "value": "extroverted"},
    {"trait": "motivation_style", "op": "eq", "value": "high_energy"}
  ]}'::jsonb,
  '{"recommended_coach": "coach_decibel_avatar", "coach_message_style": "energetic_motivator"}'::jsonb,
  TRUE
);

-- =====================================================
-- 5. HELPER FUNCTION: Get Coach Persona for User
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_recommended_coach(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_rule RECORD;
  v_recommended_coach TEXT := 'coach_veloura_avatar'; -- Default to supportive coach
  v_message_style TEXT := 'empathetic';
BEGIN
  -- Iterate through coach persona rules
  FOR v_rule IN
    SELECT * FROM public.personalization_rules
    WHERE active = TRUE
      AND effects ? 'recommended_coach'
    ORDER BY priority
  LOOP
    -- Check if rule matches user
    IF public.predicate_match(p_user_id, v_rule.predicate) THEN
      v_recommended_coach := v_rule.effects->>'recommended_coach';
      v_message_style := v_rule.effects->>'coach_message_style';
      EXIT; -- Use first matching coach
    END IF;
  END LOOP;

  -- Get coach asset details
  RETURN (
    SELECT jsonb_build_object(
      'asset_name', asset_name,
      'file_url', file_url,
      'alt_text', alt_text,
      'personality', usage_notes,
      'message_style', v_message_style
    )
    FROM public.brand_assets
    WHERE asset_name = v_recommended_coach
  );
END;
$$;

COMMENT ON FUNCTION public.get_recommended_coach IS 'Get recommended coach persona based on user traits';

-- =====================================================
-- DONE: Coach personas + badges seeded
-- Ready for dynamic coach selection!
-- =====================================================

-- Example usage:
-- SELECT get_recommended_coach('user-id-here');
-- Returns: {"asset_name": "coach_veloura_avatar", "file_url": "...", "personality": "...", "message_style": "empathetic"}

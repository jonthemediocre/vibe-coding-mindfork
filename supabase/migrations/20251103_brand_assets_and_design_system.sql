-- Migration: Brand Assets & Design System
-- Created: 2025-11-03
-- Purpose: Store brand guidelines, assets, colors, and design tokens in Supabase
--          so sandbox AI can access everything needed to build consistent UI/UX
--
-- Tables created:
-- 1. brand_assets - Logos, images, coach avatars, icons
-- 2. design_tokens - Colors, typography, spacing, shadows
-- 3. ui_components - Pre-built component specs
-- 4. brand_voice_guidelines - Tone, messaging, copy guidelines

-- ============================================================================
-- 1. BRAND ASSETS (Images, Logos, Icons)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Asset identification
  asset_name TEXT NOT NULL UNIQUE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'icon', 'coach_avatar', 'illustration', 'pattern', 'photo', 'video')),
  asset_category TEXT, -- 'primary_logo', 'coach_persona', 'onboarding', 'celebration', 'empty_state'

  -- Asset details
  file_url TEXT NOT NULL, -- Supabase Storage URL or external CDN
  thumbnail_url TEXT,
  alt_text TEXT, -- Accessibility description

  -- File metadata
  file_format TEXT, -- 'svg', 'png', 'jpg', 'webp', 'mp4'
  file_size_bytes BIGINT,
  dimensions_width INT,
  dimensions_height INT,

  -- Usage context
  usage_context TEXT[], -- ['onboarding_screen', 'chat_avatar', 'achievement_badge']
  usage_notes TEXT, -- "Use for supportive coach persona"

  -- Variants
  has_dark_mode_variant BOOLEAN DEFAULT false,
  dark_mode_url TEXT,
  has_variations BOOLEAN DEFAULT false, -- Multiple sizes/colors available

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for brand_assets
CREATE INDEX IF NOT EXISTS idx_brand_assets_type ON public.brand_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_brand_assets_category ON public.brand_assets(asset_category);

-- RLS policies (public read for AI access)
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view brand assets"
  ON public.brand_assets FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage brand assets"
  ON public.brand_assets
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. DESIGN TOKENS (Colors, Typography, Spacing, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.design_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Token identification
  token_name TEXT NOT NULL UNIQUE, -- 'color-primary', 'font-size-heading-1', 'spacing-md'
  token_category TEXT NOT NULL CHECK (token_category IN ('color', 'typography', 'spacing', 'shadow', 'radius', 'animation')),
  token_subcategory TEXT, -- 'primary', 'semantic', 'body', 'heading'

  -- Token value
  token_value TEXT NOT NULL, -- '#3B82F6', '16px', '8px', '0 2px 4px rgba(0,0,0,0.1)'
  token_value_ios TEXT, -- Platform-specific values if needed
  token_value_android TEXT,

  -- Usage & description
  usage_description TEXT, -- "Primary brand color - use for CTAs and key actions"
  usage_examples TEXT[], -- ['Button background', 'Active tab indicator']

  -- Accessibility
  wcag_contrast_ratio NUMERIC, -- For colors: contrast ratio for accessibility
  wcag_level TEXT CHECK (wcag_level IN ('AAA', 'AA', 'A', 'FAIL')),

  -- Variants
  light_mode_value TEXT,
  dark_mode_value TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for design_tokens
CREATE INDEX IF NOT EXISTS idx_design_tokens_category ON public.design_tokens(token_category);

-- RLS policies
ALTER TABLE public.design_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view design tokens"
  ON public.design_tokens FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage design tokens"
  ON public.design_tokens
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. UI COMPONENTS (Pre-built Component Specifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ui_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Component identification
  component_name TEXT NOT NULL UNIQUE, -- 'PrimaryButton', 'FoodCard', 'MoodSlider'
  component_category TEXT NOT NULL CHECK (component_category IN ('button', 'input', 'card', 'modal', 'navigation', 'chart', 'list')),

  -- Component spec
  description TEXT NOT NULL,
  props_schema JSONB, -- {width: 'full|auto', variant: 'primary|secondary', size: 'sm|md|lg'}
  default_props JSONB,

  -- Styling
  tailwind_classes TEXT, -- "bg-blue-500 text-white rounded-lg px-4 py-3"
  custom_styles JSONB, -- Platform-specific styles if needed

  -- Code example
  code_example_react_native TEXT,
  code_example_web TEXT,

  -- Design tokens used
  uses_design_tokens TEXT[], -- ['color-primary', 'spacing-md', 'font-size-body']

  -- Usage
  usage_notes TEXT,
  accessibility_notes TEXT, -- "Ensure label is present for screen readers"

  -- Preview
  preview_image_url TEXT,
  figma_link TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ui_components
CREATE INDEX IF NOT EXISTS idx_ui_components_category ON public.ui_components(component_category);

-- RLS policies
ALTER TABLE public.ui_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view UI components"
  ON public.ui_components FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage UI components"
  ON public.ui_components
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. BRAND VOICE GUIDELINES (Tone, Messaging, Copy)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_voice_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Guideline identification
  guideline_name TEXT NOT NULL UNIQUE, -- 'supportive_coach_tone', 'roast_mode_tone', 'error_messages'
  guideline_category TEXT NOT NULL CHECK (guideline_category IN ('tone', 'messaging', 'copy_templates', 'personality', 'values')),

  -- Content
  description TEXT NOT NULL,
  dos TEXT[], -- ["Use encouraging language", "Acknowledge small wins"]
  donts TEXT[], -- ["Don't shame users", "Avoid medical advice"]

  -- Examples
  good_examples TEXT[], -- ["You're doing amazing! 3 days in a row 🔥"]
  bad_examples TEXT[], -- ["You failed again", "That's a terrible choice"]

  -- Copy templates
  template_variations JSONB, -- {"supportive": "Great job {action}!", "roast": "Really? {action}? Come on."}

  -- Context
  usage_context TEXT[], -- ['coach_messages', 'achievement_notifications', 'error_states']
  target_audience TEXT, -- 'all_users', 'new_users', 'struggling_users', 'high_performers'

  -- Tone spectrum
  tone_warmth INT CHECK (tone_warmth BETWEEN 1 AND 10), -- 1=cold/direct, 10=warm/empathetic
  tone_formality INT CHECK (tone_formality BETWEEN 1 AND 10), -- 1=casual, 10=formal
  tone_humor INT CHECK (tone_humor BETWEEN 1 AND 10), -- 1=serious, 10=playful

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for brand_voice_guidelines
CREATE INDEX IF NOT EXISTS idx_brand_voice_category ON public.brand_voice_guidelines(guideline_category);

-- RLS policies
ALTER TABLE public.brand_voice_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view brand voice guidelines"
  ON public.brand_voice_guidelines FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage brand voice guidelines"
  ON public.brand_voice_guidelines
  USING (auth.role() = 'service_role');

-- ============================================================================
-- SEED DATA: Brand Assets
-- ============================================================================

-- Logos
INSERT INTO public.brand_assets (asset_name, asset_type, asset_category, file_url, alt_text, usage_context, usage_notes) VALUES
('mindfork_primary_logo', 'logo', 'primary_logo', 'https://placeholder.url/mindfork-logo.svg', 'MindFork logo', ARRAY['splash_screen', 'header', 'email'], 'Primary logo - use on light backgrounds'),
('mindfork_icon', 'icon', 'app_icon', 'https://placeholder.url/mindfork-icon.png', 'MindFork app icon', ARRAY['app_launcher', 'notifications'], '1024x1024 app icon'),
('mindfork_wordmark', 'logo', 'wordmark', 'https://placeholder.url/mindfork-wordmark.svg', 'MindFork wordmark', ARRAY['onboarding', 'marketing'], 'Wordmark for promotional materials');

-- Coach Avatars
INSERT INTO public.brand_assets (asset_name, asset_type, asset_category, file_url, alt_text, usage_context, usage_notes) VALUES
('coach_avatar_supportive', 'coach_avatar', 'coach_persona', 'https://placeholder.url/coach-supportive.png', 'Supportive AI coach avatar', ARRAY['chat', 'coach_messages'], 'Warm, empathetic coach persona'),
('coach_avatar_roast', 'coach_avatar', 'coach_persona', 'https://placeholder.url/coach-roast.png', 'Roast mode AI coach avatar', ARRAY['chat', 'roast_mode'], 'Playful, challenging coach persona');

-- Illustrations
INSERT INTO public.brand_assets (asset_name, asset_type, asset_category, file_url, alt_text, usage_context, usage_notes) VALUES
('onboarding_welcome', 'illustration', 'onboarding', 'https://placeholder.url/welcome.svg', 'Welcome illustration', ARRAY['onboarding_screen_1'], 'First screen welcoming users'),
('empty_state_no_foods', 'illustration', 'empty_state', 'https://placeholder.url/empty-foods.svg', 'No food logs yet', ARRAY['food_log_empty'], 'Show when user has no food entries'),
('celebration_streak', 'illustration', 'celebration', 'https://placeholder.url/celebration.svg', 'Streak celebration', ARRAY['achievement_modal'], 'Confetti celebration for streaks');

ON CONFLICT (asset_name) DO NOTHING;

-- ============================================================================
-- SEED DATA: Design Tokens (Colors)
-- ============================================================================

-- Primary Brand Colors
INSERT INTO public.design_tokens (token_name, token_category, token_subcategory, token_value, light_mode_value, dark_mode_value, usage_description, wcag_level) VALUES
('color-primary', 'color', 'primary', '#3B82F6', '#3B82F6', '#60A5FA', 'Primary brand color - CTAs and key actions', 'AA'),
('color-primary-dark', 'color', 'primary', '#2563EB', '#2563EB', '#3B82F6', 'Primary dark variant', 'AAA'),
('color-primary-light', 'color', 'primary', '#DBEAFE', '#DBEAFE', '#1E40AF', 'Primary light variant - backgrounds', 'AA');

-- Semantic Colors
INSERT INTO public.design_tokens (token_name, token_category, token_subcategory, token_value, usage_description, wcag_level) VALUES
('color-success', 'color', 'semantic', '#10B981', 'Success states - achievements, completed actions', 'AA'),
('color-warning', 'color', 'semantic', '#F59E0B', 'Warning states - approaching limits', 'AA'),
('color-error', 'color', 'semantic', '#EF4444', 'Error states - failed actions, destructive', 'AA'),
('color-info', 'color', 'semantic', '#3B82F6', 'Informational messages', 'AA');

-- Grayscale
INSERT INTO public.design_tokens (token_name, token_category, token_subcategory, token_value, light_mode_value, dark_mode_value, usage_description) VALUES
('color-gray-50', 'color', 'grayscale', '#F9FAFB', '#F9FAFB', '#111827', 'Lightest gray - backgrounds'),
('color-gray-900', 'color', 'grayscale', '#111827', '#111827', '#F9FAFB', 'Darkest gray - text'),
('color-text-primary', 'color', 'text', '#111827', '#111827', '#F9FAFB', 'Primary text color'),
('color-text-secondary', 'color', 'text', '#6B7280', '#6B7280', '#9CA3AF', 'Secondary text color');

-- Typography
INSERT INTO public.design_tokens (token_name, token_category, token_subcategory, token_value, usage_description) VALUES
('font-size-xs', 'typography', 'size', '12px', 'Extra small text - captions'),
('font-size-sm', 'typography', 'size', '14px', 'Small text - body secondary'),
('font-size-base', 'typography', 'size', '16px', 'Base text - body primary'),
('font-size-lg', 'typography', 'size', '18px', 'Large text - subheadings'),
('font-size-xl', 'typography', 'size', '20px', 'Extra large - headings'),
('font-size-2xl', 'typography', 'size', '24px', 'Heading level 2'),
('font-size-3xl', 'typography', 'size', '30px', 'Heading level 1'),
('font-weight-normal', 'typography', 'weight', '400', 'Normal text weight'),
('font-weight-medium', 'typography', 'weight', '500', 'Medium weight - emphasis'),
('font-weight-semibold', 'typography', 'weight', '600', 'Semi-bold - subheadings'),
('font-weight-bold', 'typography', 'weight', '700', 'Bold - headings');

-- Spacing
INSERT INTO public.design_tokens (token_name, token_category, token_value, usage_description) VALUES
('spacing-xs', 'spacing', '4px', 'Extra small spacing'),
('spacing-sm', 'spacing', '8px', 'Small spacing'),
('spacing-md', 'spacing', '16px', 'Medium spacing - default'),
('spacing-lg', 'spacing', '24px', 'Large spacing'),
('spacing-xl', 'spacing', '32px', 'Extra large spacing'),
('spacing-2xl', 'spacing', '48px', 'Section spacing');

-- Border Radius
INSERT INTO public.design_tokens (token_name, token_category, token_value, usage_description) VALUES
('radius-sm', 'radius', '4px', 'Small radius - buttons, inputs'),
('radius-md', 'radius', '8px', 'Medium radius - cards'),
('radius-lg', 'radius', '12px', 'Large radius - modals'),
('radius-full', 'radius', '9999px', 'Full radius - pills, avatars');

-- Shadows
INSERT INTO public.design_tokens (token_name, token_category, token_value, usage_description) VALUES
('shadow-sm', 'shadow', '0 1px 2px 0 rgba(0, 0, 0, 0.05)', 'Small shadow - subtle elevation'),
('shadow-md', 'shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 'Medium shadow - cards'),
('shadow-lg', 'shadow', '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 'Large shadow - modals'),
('shadow-xl', 'shadow', '0 20px 25px -5px rgba(0, 0, 0, 0.1)', 'Extra large shadow - popovers');

ON CONFLICT (token_name) DO NOTHING;

-- ============================================================================
-- SEED DATA: UI Components
-- ============================================================================

INSERT INTO public.ui_components (component_name, component_category, description, props_schema, tailwind_classes, code_example_react_native, usage_notes) VALUES
('PrimaryButton', 'button', 'Main call-to-action button',
'{"variant": "primary|secondary|outline", "size": "sm|md|lg", "disabled": "boolean"}'::jsonb,
'bg-blue-500 text-white rounded-lg font-semibold active:bg-blue-600',
'<Pressable className="bg-blue-500 px-6 py-3 rounded-lg">\n  <Text className="text-white font-semibold text-center">Button Text</Text>\n</Pressable>',
'Use for primary actions like "Save", "Continue", "Start"'),

('FoodCard', 'card', 'Card displaying food entry with nutrition info',
'{"food": "object", "onPress": "function", "showNutrition": "boolean"}'::jsonb,
'bg-white rounded-lg p-4 shadow-md border border-gray-200',
'<View className="bg-white rounded-lg p-4 shadow-md">\n  <Text className="font-semibold text-lg">{food.name}</Text>\n  <Text className="text-gray-600">{food.calories} cal</Text>\n</View>',
'Display food entries in daily log'),

('MoodSlider', 'input', 'Emoji mood slider from 😢 to 😁',
'{"value": "1-10", "onChange": "function"}'::jsonb,
'flex-row items-center justify-between',
'<View className="flex-row items-center justify-between">\n  <Text>😢</Text>\n  <Slider value={mood} onValueChange={setMood} />\n  <Text>😁</Text>\n</View>',
'Use for mood check-ins - quick and intuitive'),

('ProgressRing', 'chart', 'Circular progress indicator for calories/macros',
'{"progress": "0-1", "label": "string", "color": "string"}'::jsonb,
'',
'<Svg width={100} height={100}>\n  <Circle ... />\n  <Text>{progress}%</Text>\n</Svg>',
'Show daily calorie progress visually');

ON CONFLICT (component_name) DO NOTHING;

-- ============================================================================
-- SEED DATA: Brand Voice Guidelines
-- ============================================================================

INSERT INTO public.brand_voice_guidelines (
  guideline_name, guideline_category, description, dos, donts, good_examples, bad_examples, tone_warmth, tone_formality, tone_humor
) VALUES
('supportive_coach_tone', 'tone', 'Default supportive coaching tone - empathetic, encouraging, non-judgmental',
ARRAY[
  'Use encouraging language',
  'Acknowledge effort and progress',
  'Normalize struggles (everyone has them!)',
  'Ask open-ended questions',
  'Celebrate small wins',
  'Use emojis sparingly for warmth (💙, 🌟, 🔥)'
],
ARRAY[
  'Never shame or guilt users',
  'Avoid absolute statements (never say "always" or "never")',
  'Don''t give medical advice',
  'Avoid comparing users to others',
  'Don''t minimize their struggles'
],
ARRAY[
  'You''re doing amazing! 3 days in a row 🔥',
  'That''s totally normal - we all have tough days. What''s one small thing you can do right now?',
  'I noticed you''re building a great streak. How does it feel?'
],
ARRAY[
  'You failed again',
  'You should know better',
  'Everyone else can do this, why can''t you?'
],
8, 3, 4),

('roast_mode_tone', 'tone', 'Playful roast mode - direct, challenging, but still supportive underneath',
ARRAY[
  'Be direct and honest',
  'Use playful challenges',
  'Call out excuses (gently)',
  'Set clear expectations',
  'Still celebrate wins (just more directly)'
],
ARRAY[
  'Never attack identity or body',
  'Avoid genuine meanness',
  'Don''t use language that triggers shame',
  'No comparisons to others'
],
ARRAY[
  'Really? Ice cream at 10pm? We both know you''re not hungry. What''s actually going on?',
  'Third "I''ll start tomorrow" this week. Real talk: What''s the actual barrier?',
  'Caught you! You ate 2 hours ago. Talk to me - what triggered this?'
],
ARRAY[
  'You''re fat and lazy',
  'You''ll never lose weight',
  'You have no self-control'
],
6, 2, 7),

('achievement_messages', 'messaging', 'Messages for achievements and milestones',
ARRAY[
  'Be specific about what they achieved',
  'Connect achievement to their goal',
  'Use celebration emojis',
  'Make it feel special'
],
ARRAY[
  'Don''t overdo it (save big celebrations for big wins)',
  'Avoid generic "good job" messages'
],
ARRAY[
  '🎉 7-day streak! You just proved you can build lasting habits.',
  '🔥 First 5 pounds lost! That''s real progress.',
  '⭐ 30 days of food logging! You''re in the top 10% of users.'
],
ARRAY[
  'Good job',
  'Nice work'
],
9, 3, 6),

('error_messages', 'copy_templates', 'User-friendly error messages',
ARRAY[
  'Be helpful and actionable',
  'Explain what happened',
  'Offer a solution',
  'Maintain friendly tone even in errors'
],
ARRAY[
  'Don''t blame the user',
  'Avoid technical jargon',
  'Don''t just say "Error"'
],
ARRAY[
  'Couldn''t save that photo. Check your internet connection and try again?',
  'Hmm, we lost connection. Your food log is saved offline - it''ll sync when you''re back online.',
  'Oops! Couldn''t load your history. Pull down to refresh?'
],
ARRAY[
  'Error: 500 Internal Server Error',
  'Failed to save',
  'Network error'
],
7, 3, 5);

ON CONFLICT (guideline_name) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION: Get All Brand Assets for Sandbox AI
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_brand_system()
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'assets', (SELECT jsonb_agg(row_to_json(ba)) FROM brand_assets ba WHERE is_active = true),
    'tokens', (SELECT jsonb_agg(row_to_json(dt)) FROM design_tokens dt WHERE is_active = true),
    'components', (SELECT jsonb_agg(row_to_json(uc)) FROM ui_components uc WHERE is_active = true),
    'voice', (SELECT jsonb_agg(row_to_json(bv)) FROM brand_voice_guidelines bv WHERE is_active = true)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_brand_system IS 'Returns complete brand system (assets, tokens, components, voice) as JSON for sandbox AI to use when building UI/UX';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration creates a complete brand system in Supabase:
--
-- 1. brand_assets (logos, coach avatars, illustrations)
-- 2. design_tokens (colors, typography, spacing, shadows)
-- 3. ui_components (pre-built component specs with code)
-- 4. brand_voice_guidelines (tone, messaging, copy templates)
--
-- Sandbox AI can query these tables to build consistent, on-brand UI/UX
-- without needing access to Figma, style guides, or brand docs!
--
-- Query: SELECT get_brand_system(); -- Returns everything as JSON

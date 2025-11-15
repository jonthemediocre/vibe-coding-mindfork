-- ============================================================================
-- BRAND ASSETS & DESIGN SYSTEM (Fixed - No ui_components conflict)
-- ============================================================================
-- Purpose: Store brand guidelines, assets, colors in Supabase
-- Note: ui_components already exists from personalization migration
-- ============================================================================

-- ============================================================================
-- 1. BRAND ASSETS (Images, Logos, Icons)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Asset identification
  asset_name TEXT NOT NULL UNIQUE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'icon', 'coach_avatar', 'illustration', 'pattern', 'photo', 'video')),
  asset_category TEXT,

  -- Asset details
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,

  -- File metadata
  file_format TEXT,
  file_size_bytes BIGINT,
  dimensions_width INT,
  dimensions_height INT,

  -- Usage context
  usage_context TEXT[],
  usage_notes TEXT,

  -- Variants
  has_dark_mode_variant BOOLEAN DEFAULT false,
  dark_mode_url TEXT,
  has_variations BOOLEAN DEFAULT false,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_assets_type ON public.brand_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_brand_assets_category ON public.brand_assets(asset_category);

ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_assets_select ON public.brand_assets
  FOR SELECT USING (is_active = true);

CREATE POLICY brand_assets_manage ON public.brand_assets
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. DESIGN TOKENS (Colors, Typography, Spacing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.design_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Token identification
  token_name TEXT NOT NULL UNIQUE,
  token_category TEXT NOT NULL CHECK (token_category IN ('color', 'typography', 'spacing', 'shadow', 'radius', 'animation')),
  token_subcategory TEXT,

  -- Token value
  token_value TEXT NOT NULL,
  token_value_ios TEXT,
  token_value_android TEXT,

  -- Usage & description
  usage_description TEXT,
  usage_examples TEXT[],

  -- Accessibility
  wcag_contrast_ratio NUMERIC,
  wcag_level TEXT CHECK (wcag_level IN ('AAA', 'AA', 'A', 'FAIL')),

  -- Variants
  light_mode_value TEXT,
  dark_mode_value TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_tokens_category ON public.design_tokens(token_category);

ALTER TABLE public.design_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY design_tokens_select ON public.design_tokens
  FOR SELECT USING (is_active = true);

CREATE POLICY design_tokens_manage ON public.design_tokens
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. EXTEND EXISTING ui_components TABLE
-- ============================================================================
-- Add brand-specific columns to existing ui_components table

ALTER TABLE public.ui_components
  ADD COLUMN IF NOT EXISTS tailwind_classes TEXT,
  ADD COLUMN IF NOT EXISTS code_example_react_native TEXT,
  ADD COLUMN IF NOT EXISTS accessibility_notes TEXT,
  ADD COLUMN IF NOT EXISTS preview_image_url TEXT;

-- ============================================================================
-- 4. BRAND VOICE GUIDELINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_voice_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Guideline identification
  guideline_name TEXT NOT NULL UNIQUE,
  guideline_category TEXT NOT NULL CHECK (guideline_category IN ('tone', 'messaging', 'copy_templates', 'personality', 'values')),

  -- Content
  description TEXT NOT NULL,
  dos TEXT[],
  donts TEXT[],

  -- Examples
  good_examples TEXT[],
  bad_examples TEXT[],

  -- Copy templates
  template_variations JSONB,

  -- Context
  usage_context TEXT[],
  target_audience TEXT,

  -- Tone spectrum
  tone_warmth INT CHECK (tone_warmth BETWEEN 1 AND 10),
  tone_formality INT CHECK (tone_formality BETWEEN 1 AND 10),
  tone_humor INT CHECK (tone_humor BETWEEN 1 AND 10),

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_voice_category ON public.brand_voice_guidelines(guideline_category);

ALTER TABLE public.brand_voice_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_voice_select ON public.brand_voice_guidelines
  FOR SELECT USING (is_active = true);

CREATE POLICY brand_voice_manage ON public.brand_voice_guidelines
  USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTION: Get Complete Brand System
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_brand_system()
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'assets', (SELECT jsonb_agg(row_to_json(a)) FROM (SELECT * FROM public.brand_assets WHERE is_active = true) a),
    'tokens', (SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.design_tokens WHERE is_active = true) t),
    'components', (SELECT jsonb_agg(row_to_json(c)) FROM (SELECT * FROM public.ui_components) c),
    'voice', (SELECT jsonb_agg(row_to_json(v)) FROM (SELECT * FROM public.brand_voice_guidelines WHERE is_active = true) v)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_brand_system IS 'Get complete brand system as JSON for AI consumption';

-- ============================================================================
-- SEED DATA: DESIGN TOKENS
-- ============================================================================

INSERT INTO public.design_tokens (token_name, token_category, token_subcategory, token_value, usage_description, wcag_contrast_ratio, wcag_level) VALUES
-- Primary colors
('color-primary', 'color', 'primary', '#3B82F6', 'Primary brand color - use for CTAs and key actions', 4.5, 'AA'),
('color-primary-hover', 'color', 'primary', '#2563EB', 'Hover state for primary elements', 7.0, 'AAA'),
('color-primary-light', 'color', 'primary', '#DBEAFE', 'Light background for primary-themed sections', 12.0, 'AAA'),

-- Semantic colors
('color-success', 'color', 'semantic', '#10B981', 'Success states, positive feedback', 4.5, 'AA'),
('color-warning', 'color', 'semantic', '#F59E0B', 'Warning states, caution', 4.5, 'AA'),
('color-error', 'color', 'semantic', '#EF4444', 'Error states, destructive actions', 4.5, 'AA'),
('color-info', 'color', 'semantic', '#3B82F6', 'Informational messages', 4.5, 'AA'),

-- Neutral colors
('color-background', 'color', 'neutral', '#FFFFFF', 'Main background color', NULL, NULL),
('color-surface', 'color', 'neutral', '#F9FAFB', 'Card/surface background', NULL, NULL),
('color-border', 'color', 'neutral', '#E5E7EB', 'Default border color', NULL, NULL),
('color-text-primary', 'color', 'neutral', '#111827', 'Primary text color', 15.0, 'AAA'),
('color-text-secondary', 'color', 'neutral', '#6B7280', 'Secondary text, less emphasis', 7.0, 'AAA'),

-- Typography
('font-size-xs', 'typography', 'size', '12px', 'Extra small text - captions, labels', NULL, NULL),
('font-size-sm', 'typography', 'size', '14px', 'Small text - secondary content', NULL, NULL),
('font-size-base', 'typography', 'size', '16px', 'Base body text', NULL, NULL),
('font-size-lg', 'typography', 'size', '18px', 'Large body text', NULL, NULL),
('font-size-xl', 'typography', 'size', '20px', 'Extra large text', NULL, NULL),
('font-size-2xl', 'typography', 'size', '24px', 'Heading 3', NULL, NULL),
('font-size-3xl', 'typography', 'size', '30px', 'Heading 2', NULL, NULL),
('font-size-4xl', 'typography', 'size', '36px', 'Heading 1', NULL, NULL),

-- Font weights
('font-weight-normal', 'typography', 'weight', '400', 'Normal text weight', NULL, NULL),
('font-weight-medium', 'typography', 'weight', '500', 'Medium emphasis', NULL, NULL),
('font-weight-semibold', 'typography', 'weight', '600', 'Semibold headings', NULL, NULL),
('font-weight-bold', 'typography', 'weight', '700', 'Bold headings', NULL, NULL),

-- Spacing
('spacing-xs', 'spacing', 'size', '4px', 'Extra small spacing', NULL, NULL),
('spacing-sm', 'spacing', 'size', '8px', 'Small spacing', NULL, NULL),
('spacing-md', 'spacing', 'size', '16px', 'Medium spacing - default', NULL, NULL),
('spacing-lg', 'spacing', 'size', '24px', 'Large spacing', NULL, NULL),
('spacing-xl', 'spacing', 'size', '32px', 'Extra large spacing', NULL, NULL),
('spacing-2xl', 'spacing', 'size', '48px', 'Section spacing', NULL, NULL),

-- Border radius
('radius-none', 'radius', 'size', '0px', 'No rounding', NULL, NULL),
('radius-sm', 'radius', 'size', '4px', 'Small rounding', NULL, NULL),
('radius-md', 'radius', 'size', '8px', 'Medium rounding - default', NULL, NULL),
('radius-lg', 'radius', 'size', '12px', 'Large rounding', NULL, NULL),
('radius-full', 'radius', 'size', '9999px', 'Fully rounded (pills, avatars)', NULL, NULL),

-- Shadows
('shadow-sm', 'shadow', 'elevation', '0 1px 2px rgba(0,0,0,0.05)', 'Subtle shadow', NULL, NULL),
('shadow-md', 'shadow', 'elevation', '0 4px 6px rgba(0,0,0,0.1)', 'Medium shadow - cards', NULL, NULL),
('shadow-lg', 'shadow', 'elevation', '0 10px 15px rgba(0,0,0,0.1)', 'Large shadow - modals', NULL, NULL);

-- ============================================================================
-- SEED DATA: BRAND VOICE GUIDELINES
-- ============================================================================

INSERT INTO public.brand_voice_guidelines (
  guideline_name, guideline_category, description, dos, donts,
  good_examples, bad_examples, template_variations, usage_context, target_audience,
  tone_warmth, tone_formality, tone_humor
) VALUES
(
  'supportive_coach_tone',
  'tone',
  'Default coaching tone - warm, encouraging, never shaming',
  ARRAY['Use encouraging language', 'Acknowledge small wins', 'Frame setbacks as learning', 'Be specific with praise'],
  ARRAY['Never shame users', 'Avoid medical advice', 'Do not use food morality (good/bad)', 'No guilt-tripping'],
  ARRAY['You logged 3 days in a row - that consistency is building real change!', 'I notice you hit your protein goal 5/7 days. What helped?'],
  ARRAY['You failed again', 'That was a bad choice', 'You should be ashamed'],
  '{"supportive": "Amazing work on {action}! Keep it up!", "gentle": "I noticed {action}. How did that feel?"}'::jsonb,
  ARRAY['coach_messages', 'achievement_notifications', 'check_ins'],
  'all_users',
  9, 3, 4
),
(
  'roast_mode_tone',
  'tone',
  'Optional tough-love coaching mode for users who requested it',
  ARRAY['Be direct but not cruel', 'Use humor', 'Focus on actions not character', 'Always include path forward'],
  ARRAY['Never attack personal worth', 'No body shaming', 'Avoid triggering language'],
  ARRAY['Really? Pizza at 2am? Come on, you know better. Tomorrow we do better.', 'Skipped the gym again? Your muscles are filing a missing person report.'],
  ARRAY['You''re worthless', 'You''ll never lose weight', 'Give up already'],
  '{"roast": "Really? {action}? Come on. You got this.", "tough_love": "Look, {action} happened. Now what?"}'::jsonb,
  ARRAY['coach_messages', 'habit_reminders'],
  'high_performers',
  4, 2, 8
),
(
  'achievement_messages',
  'messaging',
  'Celebrating user milestones and achievements',
  ARRAY['Make it specific', 'Connect to larger goal', 'Encourage sharing', 'Use appropriate emoji'],
  ARRAY['Avoid comparison to others', 'No minimizing achievements'],
  ARRAY['7-day streak! You just proved you can build lasting habits 🔥', 'First 5lbs down! Your consistency is paying off 🎉'],
  ARRAY['Only 5lbs? That''s nothing', 'Other people lost more'],
  '{"milestone": "{milestone_name} unlocked! {specific_praise}", "streak": "{streak_days} days strong! {encouragement}"}'::jsonb,
  ARRAY['achievement_notifications', 'progress_celebrations'],
  'all_users',
  10, 2, 7
),
(
  'error_messages',
  'messaging',
  'Handling errors gracefully and guiding recovery',
  ARRAY['Explain what happened', 'Provide clear next steps', 'Maintain calm tone', 'Offer help'],
  ARRAY['Don''t blame user', 'Avoid technical jargon', 'No panic language'],
  ARRAY['Couldn''t save that entry. Check your connection and try again.', 'Photo didn''t upload. Tap to retry or enter details manually.'],
  ARRAY['ERROR: Connection failed', 'Something went wrong', 'Fatal error occurred'],
  '{"connection": "Couldn''t connect. {action_to_fix}", "validation": "Hmm, {what_wrong}. {how_to_fix}"}'::jsonb,
  ARRAY['error_states', 'validation_messages'],
  'all_users',
  6, 4, 2
);

-- ============================================================================
-- SEED DATA: UI COMPONENT EXAMPLES (extends existing ui_components)
-- ============================================================================

UPDATE public.ui_components SET
  tailwind_classes = 'bg-blue-500 text-white rounded-lg px-6 py-3 font-semibold',
  code_example_react_native = E'<Pressable className="bg-blue-500 rounded-lg px-6 py-3">\n  <Text className="text-white font-semibold">Log Food</Text>\n</Pressable>',
  accessibility_notes = 'Ensure button has accessible label. Use accessibilityLabel prop.'
WHERE key = 'PrimaryButton';

-- ============================================================================
-- DONE
-- ============================================================================
-- Brand system complete:
-- ✅ 38 design tokens (colors, typography, spacing, shadows)
-- ✅ 4 voice guidelines (supportive, roast, achievement, error)
-- ✅ Brand assets table ready for logo/image URLs
-- ✅ Helper function to get complete brand system as JSON
-- =====================================================

-- Coach Avatar System Migration
-- Created: 2025-11-04
-- Purpose: Add avatar support for cyberpunk nutrition coaches

-- ============================================================================
-- 1. CREATE STORAGE BUCKET (Run this in Supabase Dashboard if doesn't exist)
-- ============================================================================

-- Create public storage bucket for coach avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-avatars',
  'coach-avatars',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON BUCKET coach-avatars IS 'Public storage for coach profile avatars';


-- ============================================================================
-- 2. ADD AVATAR_URL COLUMN TO COACHES TABLE
-- ============================================================================

ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.coaches.avatar_url IS 'Public URL to coach profile avatar image';


-- ============================================================================
-- 3. CREATE AVATAR VARIANTS TABLE (Optional - For Future Mood System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coach_avatar_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL,
  mood TEXT NOT NULL CHECK (mood IN ('neutral', 'happy', 'motivated', 'serious', 'thinking', 'celebrating')),
  avatar_url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign key constraint (soft - coach_id may not exist in coaches table yet)
  CONSTRAINT fk_coach_avatar_coach_id
    FOREIGN KEY (coach_id)
    REFERENCES public.coaches(coach_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coach_avatar_variants_coach_id
  ON public.coach_avatar_variants(coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_avatar_variants_mood
  ON public.coach_avatar_variants(mood);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_avatar_variants_default
  ON public.coach_avatar_variants(coach_id)
  WHERE is_default = TRUE;

COMMENT ON TABLE public.coach_avatar_variants IS 'Optional: Store multiple avatar moods per coach for dynamic personality expression';


-- ============================================================================
-- 4. HELPER FUNCTION: Get Coach Avatar URL
-- ============================================================================

CREATE OR REPLACE FUNCTION get_coach_avatar(
  p_coach_id TEXT,
  p_mood TEXT DEFAULT 'neutral'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avatar_url TEXT;
BEGIN
  -- Try to get mood-specific avatar variant
  SELECT avatar_url INTO v_avatar_url
  FROM coach_avatar_variants
  WHERE coach_id = p_coach_id
    AND mood = p_mood
  LIMIT 1;

  -- Fall back to default avatar from coaches table
  IF v_avatar_url IS NULL THEN
    SELECT avatar_url INTO v_avatar_url
    FROM coaches
    WHERE coach_id = p_coach_id;
  END IF;

  -- Return NULL if no avatar found
  RETURN v_avatar_url;
END;
$$;

COMMENT ON FUNCTION get_coach_avatar IS 'Get coach avatar URL with optional mood variant. Falls back to default avatar.';

GRANT EXECUTE ON FUNCTION get_coach_avatar TO authenticated, anon;


-- ============================================================================
-- 5. SEED AVATAR URLS (Update after uploading images to Storage)
-- ============================================================================

-- NOTE: Replace 'lxajnrofkgpwdpodjvkm' with your actual Supabase project ID
-- These URLs assume you uploaded the images to coach-avatars bucket

DO $$
DECLARE
  v_project_id TEXT := 'lxajnrofkgpwdpodjvkm';
  v_base_url TEXT;
BEGIN
  v_base_url := 'https://' || v_project_id || '.supabase.co/storage/v1/object/public/coach-avatars/';

  -- Update coaches with cyberpunk avatar URLs
  -- (Only update if coach exists)

  UPDATE coaches
  SET avatar_url = v_base_url || 'owl-nutritionist.png'
  WHERE coach_id = 'synapse' AND avatar_url IS NULL;

  UPDATE coaches
  SET avatar_url = v_base_url || 'cat-doctor.png'
  WHERE coach_id = 'vetra' AND avatar_url IS NULL;

  UPDATE coaches
  SET avatar_url = v_base_url || 'racing-horse.png'
  WHERE coach_id = 'veloura' AND avatar_url IS NULL;

  UPDATE coaches
  SET avatar_url = v_base_url || 'glam-duck.png'
  WHERE coach_id = 'aetheris' AND avatar_url IS NULL;

  UPDATE coaches
  SET avatar_url = v_base_url || 'rooster-commander.png'
  WHERE coach_id = 'decibel' AND avatar_url IS NULL;

  UPDATE coaches
  SET avatar_url = v_base_url || 'skull-dj.png'
  WHERE coach_id = 'maya-rival' AND avatar_url IS NULL;

  -- Fallback: Use owl for Verdant if no specific avatar exists
  UPDATE coaches
  SET avatar_url = v_base_url || 'owl-nutritionist.png'
  WHERE coach_id = 'verdant' AND avatar_url IS NULL;

  RAISE NOTICE 'Coach avatars updated successfully';
END $$;


-- ============================================================================
-- 6. ENABLE RLS ON AVATAR VARIANTS TABLE
-- ============================================================================

ALTER TABLE public.coach_avatar_variants ENABLE ROW LEVEL SECURITY;

-- Anyone can view coach avatars (public)
CREATE POLICY "Coach avatar variants are publicly viewable"
  ON public.coach_avatar_variants
  FOR SELECT
  TO public
  USING (TRUE);

-- Only admins can insert/update/delete (you can adjust this)
CREATE POLICY "Only admins can manage coach avatar variants"
  ON public.coach_avatar_variants
  FOR ALL
  TO authenticated
  USING (
    -- Check if user has admin role (adjust based on your auth system)
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );


-- ============================================================================
-- 7. STORAGE POLICIES (Run this in Supabase Dashboard or via API)
-- ============================================================================

-- Allow public to read coach avatars
CREATE POLICY "Coach avatars are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'coach-avatars');

-- Allow authenticated users to upload avatars (adjust based on needs)
CREATE POLICY "Authenticated users can upload coach avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'coach-avatars');


-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Coach avatar system installed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Upload avatar images to Supabase Storage bucket: coach-avatars';
  RAISE NOTICE '2. Image names:';
  RAISE NOTICE '   - owl-nutritionist.png (Synapse)';
  RAISE NOTICE '   - cat-doctor.png (Vetra)';
  RAISE NOTICE '   - racing-horse.png (Veloura)';
  RAISE NOTICE '   - glam-duck.png (Aetheris)';
  RAISE NOTICE '   - rooster-commander.png (Decibel)';
  RAISE NOTICE '   - skull-dj.png (Maya-Rival)';
  RAISE NOTICE '3. Verify avatar URLs in coaches table';
  RAISE NOTICE '4. Test in frontend with CoachAvatar component';
END $$;

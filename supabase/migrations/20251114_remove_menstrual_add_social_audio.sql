-- =====================================================
-- MIGRATION: Remove Menstrual Tracking + Add Social & Audio Features
-- =====================================================
-- Purpose: Remove menstrual cycle tracking and add audio interactions + social features
-- Date: 2025-11-14
-- Priority: P0 Critical
-- =====================================================

-- =====================================================
-- SECTION 1: REMOVE MENSTRUAL TRACKING
-- =====================================================

-- Drop functions that depend on menstrual_cycle_tracking
DROP FUNCTION IF EXISTS should_show_cycle_adjustments(UUID);
DROP FUNCTION IF EXISTS get_cycle_adjusted_targets(UUID);

-- Drop views that depend on menstrual_cycle_tracking
DROP VIEW IF EXISTS v_cycle_targets_today;

-- Drop the menstrual_cycle_tracking table
DROP TABLE IF EXISTS public.menstrual_cycle_tracking CASCADE;

-- =====================================================
-- SECTION 2: AUDIO INTERACTIONS (Voice Memos/Journaling)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audio_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Audio metadata
  audio_url TEXT NOT NULL,
  duration_seconds INT,
  file_size_bytes BIGINT,

  -- Transcription
  transcript TEXT,
  transcription_model TEXT DEFAULT 'whisper-1',
  transcription_confidence NUMERIC(3,2) CHECK (transcription_confidence BETWEEN 0 AND 1),

  -- AI analysis
  ai_summary TEXT,
  detected_emotions JSONB DEFAULT '[]'::jsonb, -- ["anxious", "hopeful"]
  detected_topics JSONB DEFAULT '[]'::jsonb, -- ["food_craving", "stress_trigger"]
  sentiment_score NUMERIC(3,2) CHECK (sentiment_score BETWEEN -1 AND 1), -- -1 to 1

  -- Context
  interaction_type TEXT CHECK (interaction_type IN ('voice_journal', 'coach_conversation', 'food_logging', 'quick_note')),
  coach_id TEXT REFERENCES coaches(id),
  related_meal_id UUID, -- Could reference food_entries if exists

  -- Metadata
  is_favorite BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audio_interactions
CREATE INDEX IF NOT EXISTS idx_audio_interactions_user_created
  ON public.audio_interactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audio_interactions_type
  ON public.audio_interactions(user_id, interaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audio_interactions_coach
  ON public.audio_interactions(coach_id, created_at DESC)
  WHERE coach_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audio_interactions_favorites
  ON public.audio_interactions(user_id, created_at DESC)
  WHERE is_favorite = true;

-- Full-text search on transcripts
CREATE INDEX IF NOT EXISTS idx_audio_interactions_transcript_search
  ON public.audio_interactions USING gin(to_tsvector('english', transcript))
  WHERE transcript IS NOT NULL;

-- RLS for audio_interactions
ALTER TABLE public.audio_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own audio interactions"
  ON public.audio_interactions
  FOR ALL
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_audio_interactions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audio_interactions_updated_at
  BEFORE UPDATE ON public.audio_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_audio_interactions_timestamp();

-- =====================================================
-- SECTION 3: SOCIAL FEATURES
-- =====================================================

-- User Follows (Follow system for social features)
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent self-follows and duplicate follows
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  UNIQUE(follower_id, following_id)
);

-- Indexes for user_follows
CREATE INDEX IF NOT EXISTS idx_user_follows_follower
  ON public.user_follows(follower_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_follows_following
  ON public.user_follows(following_id, created_at DESC);

-- RLS for user_follows
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follows"
  ON public.user_follows
  FOR SELECT
  USING (true); -- Public read for social features

CREATE POLICY "Users can create own follows"
  ON public.user_follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows"
  ON public.user_follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- Community Posts (Share progress, achievements, meals)
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  image_urls JSONB DEFAULT '[]'::jsonb, -- ["https://...", "https://..."]

  -- Post type and metadata
  post_type TEXT CHECK (post_type IN ('progress_update', 'achievement', 'meal_share', 'motivation', 'question', 'celebration')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),

  -- Related entities
  related_achievement_id UUID, -- Could reference achievements table if exists
  related_meal_id UUID, -- Could reference food_entries if exists
  related_challenge_id UUID, -- Could reference challenges if exists

  -- Engagement metrics
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  share_count INT DEFAULT 0,

  -- Moderation
  is_flagged BOOLEAN DEFAULT false,
  flag_count INT DEFAULT 0,
  moderation_status TEXT DEFAULT 'active' CHECK (moderation_status IN ('active', 'under_review', 'hidden', 'removed')),

  -- Metadata
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Indexes for community_posts
CREATE INDEX IF NOT EXISTS idx_community_posts_user_created
  ON public.community_posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_type_created
  ON public.community_posts(post_type, created_at DESC)
  WHERE deleted_at IS NULL AND moderation_status = 'active';

CREATE INDEX IF NOT EXISTS idx_community_posts_visibility
  ON public.community_posts(visibility, created_at DESC)
  WHERE deleted_at IS NULL AND moderation_status = 'active';

-- Full-text search on posts
CREATE INDEX IF NOT EXISTS idx_community_posts_content_search
  ON public.community_posts USING gin(to_tsvector('english', content))
  WHERE deleted_at IS NULL;

-- RLS for community_posts
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view public/follower posts"
  ON public.community_posts
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND moderation_status = 'active'
    AND (
      visibility = 'public'
      OR user_id = auth.uid()
      OR (
        visibility = 'followers'
        AND EXISTS (
          SELECT 1 FROM public.user_follows
          WHERE follower_id = auth.uid() AND following_id = community_posts.user_id
        )
      )
    )
  );

CREATE POLICY "Users create own posts"
  ON public.community_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own posts"
  ON public.community_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own posts"
  ON public.community_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_audio_interactions_timestamp(); -- Reuse same function

-- Post Likes (Like system for community posts)
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate likes
  UNIQUE(post_id, user_id)
);

-- Indexes for post_likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post
  ON public.post_likes(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_likes_user
  ON public.post_likes(user_id, created_at DESC);

-- RLS for post_likes
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view all likes"
  ON public.post_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users create own likes"
  ON public.post_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own likes"
  ON public.post_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- SECTION 4: HELPER FUNCTIONS
-- =====================================================

-- Function to increment like_count on community_posts
CREATE OR REPLACE FUNCTION increment_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET like_count = like_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_likes_count_update
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_like_count();

-- Function to get user's follower count
CREATE OR REPLACE FUNCTION get_follower_count(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COUNT(*)::INT
  FROM public.user_follows
  WHERE following_id = p_user_id;
$$;

-- Function to get user's following count
CREATE OR REPLACE FUNCTION get_following_count(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COUNT(*)::INT
  FROM public.user_follows
  WHERE follower_id = p_user_id;
$$;

-- Function to check if user A follows user B
CREATE OR REPLACE FUNCTION is_following(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_follows
    WHERE follower_id = p_follower_id AND following_id = p_following_id
  );
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_interactions TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION get_follower_count TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_following_count TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_following TO authenticated, service_role;

-- =====================================================
-- SECTION 5: SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  REMOVED:';
  RAISE NOTICE '  • menstrual_cycle_tracking table';
  RAISE NOTICE '  • v_cycle_targets_today view';
  RAISE NOTICE '  • get_cycle_adjusted_targets() function';
  RAISE NOTICE '  • should_show_cycle_adjustments() function';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ADDED:';
  RAISE NOTICE '  1. audio_interactions - Voice journaling & memos';
  RAISE NOTICE '  2. user_follows - Follow system';
  RAISE NOTICE '  3. community_posts - Social sharing';
  RAISE NOTICE '  4. post_likes - Like system';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Social Features:';
  RAISE NOTICE '  • get_follower_count(user_id)';
  RAISE NOTICE '  • get_following_count(user_id)';
  RAISE NOTICE '  • is_following(follower_id, following_id)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security:';
  RAISE NOTICE '  • All tables have RLS enabled';
  RAISE NOTICE '  • Post visibility: public/followers/private';
  RAISE NOTICE '  • Moderation system for community posts';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

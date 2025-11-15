-- ================================================
-- AUDIO FEATURES: Voice Journaling
-- Voice-based emotional tracking and insights
-- ================================================

-- Audio interactions table for voice journaling
CREATE TABLE IF NOT EXISTS audio_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL, -- Supabase Storage URL
  transcript TEXT,
  duration_seconds INTEGER,
  emotion_detected TEXT, -- 'happy', 'stressed', 'motivated', etc.
  ai_summary TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_interactions_user ON audio_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_interactions_favorite ON audio_interactions(user_id, is_favorite);

-- Enable full-text search on transcripts
CREATE INDEX IF NOT EXISTS idx_audio_interactions_transcript_search
  ON audio_interactions
  USING GIN(to_tsvector('english', transcript));

-- Enable RLS
ALTER TABLE audio_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own audio interactions" ON audio_interactions;
CREATE POLICY "Users can view own audio interactions"
  ON audio_interactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own audio interactions" ON audio_interactions;
CREATE POLICY "Users can insert own audio interactions"
  ON audio_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own audio interactions" ON audio_interactions;
CREATE POLICY "Users can update own audio interactions"
  ON audio_interactions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own audio interactions" ON audio_interactions;
CREATE POLICY "Users can delete own audio interactions"
  ON audio_interactions FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================
-- RPC function to search audio transcripts
-- ================================================

CREATE OR REPLACE FUNCTION search_audio_transcripts(
  target_user_id UUID,
  search_query TEXT,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  audio_url TEXT,
  transcript TEXT,
  ai_summary TEXT,
  emotion_detected TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai.id,
    ai.audio_url,
    ai.transcript,
    ai.ai_summary,
    ai.emotion_detected,
    ai.created_at,
    ts_rank(to_tsvector('english', ai.transcript), plainto_tsquery('english', search_query)) as rank
  FROM audio_interactions ai
  WHERE ai.user_id = target_user_id
    AND to_tsvector('english', ai.transcript) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, ai.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_audio_transcripts(UUID, TEXT, INTEGER) TO authenticated;

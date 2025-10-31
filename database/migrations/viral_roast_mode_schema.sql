-- VIRAL ROAST MODE DATABASE SCHEMA
-- Captures roast moments from text/voice/calls and tracks virality
-- Run this in your Supabase SQL Editor

-- Create roast_moments table
CREATE TABLE IF NOT EXISTS roast_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id VARCHAR(50) NOT NULL,
  coach_name VARCHAR(100) NOT NULL,
  roast_level INTEGER NOT NULL CHECK (roast_level >= 1 AND roast_level <= 10),
  roast_text TEXT NOT NULL,
  user_prompt TEXT,
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('text', 'voice', 'call', 'sms')),
  transcript TEXT,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_viral_candidate BOOLEAN DEFAULT false,
  share_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  CONSTRAINT roast_text_not_empty CHECK (length(roast_text) > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roast_moments_user_id ON roast_moments(user_id);
CREATE INDEX IF NOT EXISTS idx_roast_moments_coach_id ON roast_moments(coach_id);
CREATE INDEX IF NOT EXISTS idx_roast_moments_created_at ON roast_moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roast_moments_viral ON roast_moments(is_viral_candidate, share_count DESC);
CREATE INDEX IF NOT EXISTS idx_roast_moments_roast_level ON roast_moments(roast_level);

-- Create roast_shares tracking table
CREATE TABLE IF NOT EXISTS roast_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roast_moment_id UUID NOT NULL REFERENCES roast_moments(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'tiktok', 'twitter', 'facebook', etc.
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewer_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_roast_shares_moment_id ON roast_shares(roast_moment_id);
CREATE INDEX IF NOT EXISTS idx_roast_shares_platform ON roast_shares(platform);

-- Enable RLS
ALTER TABLE roast_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roast_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roast_moments
CREATE POLICY "Users can view their own roast moments"
  ON roast_moments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roast moments"
  ON roast_moments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roast moments"
  ON roast_moments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view viral roast moments"
  ON roast_moments
  FOR SELECT
  TO authenticated
  USING (is_viral_candidate = true);

-- RLS Policies for roast_shares
CREATE POLICY "Users can view shares of their roast moments"
  ON roast_shares
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roast_moments
      WHERE roast_moments.id = roast_shares.roast_moment_id
      AND roast_moments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert shares"
  ON roast_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to increment share count
CREATE OR REPLACE FUNCTION increment_roast_share_count(
  roast_id UUID,
  platform_name VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
  -- Increment share count in roast_moments
  UPDATE roast_moments
  SET share_count = share_count + 1
  WHERE id = roast_id;

  -- Insert share record
  INSERT INTO roast_shares (roast_moment_id, platform)
  VALUES (roast_id, platform_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_roast_view_count(
  roast_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE roast_moments
  SET view_count = view_count + 1
  WHERE id = roast_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_roast_share_count(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_roast_view_count(UUID) TO authenticated;

-- Function to get top roasters (leaderboard)
CREATE OR REPLACE FUNCTION get_top_roasters(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  total_roasts BIGINT,
  viral_moments BIGINT,
  total_shares BIGINT,
  top_roast_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rm.user_id,
    COUNT(*)::BIGINT as total_roasts,
    SUM(CASE WHEN rm.is_viral_candidate THEN 1 ELSE 0 END)::BIGINT as viral_moments,
    SUM(rm.share_count)::BIGINT as total_shares,
    MAX(rm.roast_level) as top_roast_level
  FROM roast_moments rm
  GROUP BY rm.user_id
  ORDER BY viral_moments DESC, total_shares DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_top_roasters(INTEGER) TO authenticated;

-- Add comments
COMMENT ON TABLE roast_moments IS 'Captures viral-worthy roast moments from AI coaches for social sharing';
COMMENT ON TABLE roast_shares IS 'Tracks when and where roast moments are shared on social media';
COMMENT ON COLUMN roast_moments.is_viral_candidate IS 'Auto-detected viral potential based on roast quality and level';
COMMENT ON COLUMN roast_moments.source_type IS 'Where the roast came from: text chat, voice message, phone call, or SMS';
COMMENT ON COLUMN roast_moments.audio_url IS 'Original audio recording URL for voice/call roasts';

-- Create view for viral roast leaderboard
CREATE OR REPLACE VIEW viral_roast_leaderboard AS
SELECT
  rm.id,
  rm.user_id,
  rm.coach_name,
  rm.roast_level,
  rm.roast_text,
  rm.share_count,
  rm.view_count,
  rm.created_at,
  (rm.share_count * 10 + rm.view_count) as virality_score
FROM roast_moments rm
WHERE rm.is_viral_candidate = true
ORDER BY virality_score DESC, rm.created_at DESC
LIMIT 100;

GRANT SELECT ON viral_roast_leaderboard TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Viral Roast Mode database schema created successfully!';
  RAISE NOTICE '📊 Tables: roast_moments, roast_shares';
  RAISE NOTICE '🔥 Functions: increment_roast_share_count, increment_roast_view_count, get_top_roasters';
  RAISE NOTICE '📈 View: viral_roast_leaderboard';
END $$;

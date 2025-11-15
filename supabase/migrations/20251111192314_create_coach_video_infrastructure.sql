-- Create storage bucket for coach video audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-videos',
  'coach-videos',
  true,
  10485760,
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Create table to track video generation jobs
CREATE TABLE IF NOT EXISTS coach_video_jobs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  coach_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  audio_url TEXT,
  video_url TEXT,
  error_message TEXT,
  error_type TEXT,
  did_talk_id TEXT,
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coach_video_jobs_user_id ON coach_video_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_video_jobs_status ON coach_video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_coach_video_jobs_created_at ON coach_video_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE coach_video_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own jobs
CREATE POLICY "Users can read own video jobs"
  ON coach_video_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access to video jobs"
  ON coach_video_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coach_video_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coach_video_jobs_updated_at
  BEFORE UPDATE ON coach_video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_coach_video_jobs_updated_at();

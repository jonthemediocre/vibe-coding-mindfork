-- ============================================
-- MOOD CHECK-INS TABLE
-- Emotional eating detection and mood tracking
-- ============================================

CREATE TABLE IF NOT EXISTS mood_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL, -- 'stressed', 'happy', 'anxious', 'calm', 'motivated', 'sad'
  hunger_level INTEGER CHECK (hunger_level BETWEEN 1 AND 10),
  was_emotional_eating BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_check_ins_user ON mood_check_ins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_check_ins_emotional ON mood_check_ins(user_id, was_emotional_eating, created_at);

-- Enable RLS
ALTER TABLE mood_check_ins ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own check-ins
DROP POLICY IF EXISTS "Users can view their own mood check-ins" ON mood_check_ins;
CREATE POLICY "Users can view their own mood check-ins"
  ON mood_check_ins FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own check-ins
DROP POLICY IF EXISTS "Users can insert their own mood check-ins" ON mood_check_ins;
CREATE POLICY "Users can insert their own mood check-ins"
  ON mood_check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own check-ins
DROP POLICY IF EXISTS "Users can update their own mood check-ins" ON mood_check_ins;
CREATE POLICY "Users can update their own mood check-ins"
  ON mood_check_ins FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own check-ins
DROP POLICY IF EXISTS "Users can delete their own mood check-ins" ON mood_check_ins;
CREATE POLICY "Users can delete their own mood check-ins"
  ON mood_check_ins FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RPC: GET EMOTIONAL EATING STREAK
-- ============================================

CREATE OR REPLACE FUNCTION get_emotional_eating_streak(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE;
  had_non_emotional_day BOOLEAN;
BEGIN
  -- Start from today and count backwards
  check_date := CURRENT_DATE;

  LOOP
    -- Check if user had any check-ins on this date without emotional eating
    SELECT EXISTS(
      SELECT 1
      FROM mood_check_ins
      WHERE user_id = target_user_id
        AND DATE(created_at) = check_date
        AND was_emotional_eating = false
    ) INTO had_non_emotional_day;

    -- If no check-in or had emotional eating, break streak
    IF NOT had_non_emotional_day THEN
      EXIT;
    END IF;

    -- Increment streak and check previous day
    current_streak := current_streak + 1;
    check_date := check_date - INTERVAL '1 day';

    -- Safety: Don't check more than 365 days back
    IF current_streak > 365 THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: GET MOOD INSIGHTS (bonus)
-- ============================================

CREATE OR REPLACE FUNCTION get_mood_insights(
  target_user_id UUID,
  days_back INTEGER DEFAULT 7
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'most_common_mood', (
      SELECT mood
      FROM mood_check_ins
      WHERE user_id = target_user_id
        AND created_at > NOW() - (days_back || ' days')::INTERVAL
      GROUP BY mood
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ),
    'emotional_eating_rate', (
      SELECT ROUND(
        AVG(CASE WHEN was_emotional_eating THEN 1.0 ELSE 0.0 END)::NUMERIC,
        2
      )
      FROM mood_check_ins
      WHERE user_id = target_user_id
        AND created_at > NOW() - (days_back || ' days')::INTERVAL
    ),
    'avg_hunger_level', (
      SELECT ROUND(AVG(hunger_level)::NUMERIC, 1)
      FROM mood_check_ins
      WHERE user_id = target_user_id
        AND created_at > NOW() - (days_back || ' days')::INTERVAL
    ),
    'total_check_ins', (
      SELECT COUNT(*)
      FROM mood_check_ins
      WHERE user_id = target_user_id
        AND created_at > NOW() - (days_back || ' days')::INTERVAL
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_emotional_eating_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mood_insights(UUID, INTEGER) TO authenticated;

-- ============================================
-- VERIFY ALL TABLES/FUNCTIONS EXIST
-- ============================================

-- SELECT 'mood_check_ins table' as item,
-- CASE WHEN EXISTS (
--   SELECT 1 FROM information_schema.tables
--   WHERE table_name = 'mood_check_ins'
-- ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
-- UNION ALL
-- SELECT 'get_emotional_eating_streak function' as item,
-- CASE WHEN EXISTS (
--   SELECT 1 FROM information_schema.routines
--   WHERE routine_name = 'get_emotional_eating_streak'
-- ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
-- UNION ALL
-- SELECT 'get_mood_insights function' as item,
-- CASE WHEN EXISTS (
--   SELECT 1 FROM information_schema.routines
--   WHERE routine_name = 'get_mood_insights'
-- ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

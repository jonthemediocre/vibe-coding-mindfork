-- ================================================
-- BRAIN FOG TRACKER FEATURE
-- High-ROI Gen Z Male Feature (Nootropics Trend)
-- ================================================

-- Create brain_fog_logs table
CREATE TABLE IF NOT EXISTS brain_fog_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clarity_score INTEGER NOT NULL CHECK (clarity_score >= 0 AND clarity_score <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure one entry per user per day
  UNIQUE(user_id, log_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_brain_fog_user_date ON brain_fog_logs(user_id, log_date DESC);

-- Enable RLS
ALTER TABLE brain_fog_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own brain fog logs" ON brain_fog_logs;
CREATE POLICY "Users can view their own brain fog logs"
  ON brain_fog_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own brain fog logs" ON brain_fog_logs;
CREATE POLICY "Users can insert their own brain fog logs"
  ON brain_fog_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own brain fog logs" ON brain_fog_logs;
CREATE POLICY "Users can update their own brain fog logs"
  ON brain_fog_logs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own brain fog logs" ON brain_fog_logs;
CREATE POLICY "Users can delete their own brain fog logs"
  ON brain_fog_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================
-- BRAIN FOG CORRELATION ANALYTICS
-- Analyzes correlation between nutrition and mental clarity
-- ================================================

-- Function to calculate brain fog correlation with nutrition
CREATE OR REPLACE FUNCTION get_brain_fog_correlation(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  avg_clarity NUMERIC,
  low_clarity_days INTEGER,
  high_clarity_days INTEGER,
  protein_correlation TEXT,
  carb_correlation TEXT,
  meal_timing_correlation TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_data AS (
    SELECT
      bf.log_date,
      bf.clarity_score,
      COALESCE(SUM(fe.protein), 0) as daily_protein,
      COALESCE(SUM(fe.carbs), 0) as daily_carbs,
      COALESCE(COUNT(fe.id), 0) as meals_logged
    FROM brain_fog_logs bf
    LEFT JOIN food_entries fe ON bf.user_id = fe.user_id
      AND bf.log_date = DATE(fe.created_at)
    WHERE bf.user_id = p_user_id
      AND bf.log_date >= CURRENT_DATE - p_days
    GROUP BY bf.log_date, bf.clarity_score
  ),
  stats AS (
    SELECT
      ROUND(AVG(clarity_score), 1) as avg_clarity,
      COUNT(*) FILTER (WHERE clarity_score < 5) as low_days,
      COUNT(*) FILTER (WHERE clarity_score >= 7) as high_days,
      AVG(daily_protein) FILTER (WHERE clarity_score >= 7) as high_protein,
      AVG(daily_protein) FILTER (WHERE clarity_score < 5) as low_protein,
      AVG(daily_carbs) FILTER (WHERE clarity_score >= 7) as high_carbs,
      AVG(daily_carbs) FILTER (WHERE clarity_score < 5) as low_carbs,
      AVG(meals_logged) FILTER (WHERE clarity_score >= 7) as high_meals,
      AVG(meals_logged) FILTER (WHERE clarity_score < 5) as low_meals
    FROM daily_data
  )
  SELECT
    avg_clarity,
    low_days::INTEGER,
    high_days::INTEGER,
    CASE
      WHEN high_protein > low_protein + 20 THEN 'High protein days = better focus'
      WHEN low_protein > high_protein + 20 THEN 'Low protein days = brain fog'
      ELSE 'No strong protein correlation yet'
    END as protein_correlation,
    CASE
      WHEN high_carbs > low_carbs + 50 THEN 'High carb days = better energy'
      WHEN low_carbs > high_carbs + 50 THEN 'Low carb days = brain fog'
      ELSE 'No strong carb correlation yet'
    END as carb_correlation,
    CASE
      WHEN high_meals > low_meals + 1 THEN 'More meals = better clarity'
      WHEN low_meals > high_meals + 1 THEN 'Skipping meals = brain fog'
      ELSE 'Meal timing shows no pattern yet'
    END as meal_timing_correlation
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_brain_fog_correlation(UUID, INTEGER) TO authenticated;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Check if table exists
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'brain_fog_logs';

-- Check if function exists
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public' AND routine_name = 'get_brain_fog_correlation';

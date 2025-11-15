-- ================================================
-- COMPONENT VARIANT TELEMETRY
-- Backend analytics for user permutation system
-- NEVER exposed to users - analytics dashboard only
-- ================================================

-- Component variant telemetry (backend analytics only)
CREATE TABLE IF NOT EXISTS component_variant_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL, -- 'home_screen_widgets', 'food_swap_framing', etc.
  variant_id TEXT NOT NULL, -- 'genz_male_muscle_savage', 'standard', etc.
  user_permutation TEXT NOT NULL, -- 'genz_male_muscle_savage_standard_competitive'
  session_id TEXT, -- Optional: group by session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast aggregation
CREATE INDEX IF NOT EXISTS idx_component_telemetry_component
  ON component_variant_telemetry(component_id, variant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_component_telemetry_user
  ON component_variant_telemetry(user_id, created_at);

-- Enable RLS (users should NOT query this directly)
ALTER TABLE component_variant_telemetry ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can insert (backend only)
DROP POLICY IF EXISTS "Service role can insert variant telemetry" ON component_variant_telemetry;
CREATE POLICY "Service role can insert variant telemetry"
  ON component_variant_telemetry
  FOR INSERT
  WITH CHECK (true);

-- Policy: No direct user access (analytics dashboard only)
DROP POLICY IF EXISTS "No user access to telemetry" ON component_variant_telemetry;
CREATE POLICY "No user access to telemetry"
  ON component_variant_telemetry
  FOR SELECT
  USING (false);

-- ================================================
-- RPC function to analyze variant performance
-- ================================================

CREATE OR REPLACE FUNCTION get_variant_performance_report(
  target_component_id TEXT,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
  variant_id TEXT,
  unique_users BIGINT,
  total_views BIGINT,
  engagement_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cvt.variant_id,
    COUNT(DISTINCT cvt.user_id)::BIGINT as unique_users,
    COUNT(*)::BIGINT as total_views,
    -- Engagement calculated as: (users who returned) / (unique users)
    ROUND(
      (COUNT(DISTINCT CASE
        WHEN cvt.user_id IN (
          SELECT user_id
          FROM component_variant_telemetry cvt2
          WHERE cvt2.component_id = target_component_id
            AND cvt2.created_at > cvt.created_at + INTERVAL '1 day'
        )
        THEN cvt.user_id
      END)::DECIMAL / NULLIF(COUNT(DISTINCT cvt.user_id), 0)),
      3
    ) as engagement_rate
  FROM component_variant_telemetry cvt
  WHERE cvt.component_id = target_component_id
    AND cvt.created_at BETWEEN start_date AND end_date
  GROUP BY cvt.variant_id
  ORDER BY unique_users DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission (service/admin only)
GRANT EXECUTE ON FUNCTION get_variant_performance_report(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

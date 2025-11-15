-- ================================================
-- HIGH PRIORITY: AI Observability & Cost Tracking
-- Track every AI call for cost monitoring and optimization
-- ================================================

-- AI Telemetry table for tracking every AI call
CREATE TABLE IF NOT EXISTS ai_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL, -- 'nutrition_coach', 'food_recognition', 'voice_tts', etc.
  model TEXT NOT NULL, -- 'gpt-4o', 'claude-sonnet-3-5', 'gpt-4o-transcribe'
  tokens_used INTEGER NOT NULL,
  estimated_cost_usd DECIMAL(10, 6) NOT NULL,
  latency_ms INTEGER NOT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast aggregation queries
CREATE INDEX IF NOT EXISTS idx_ai_telemetry_feature ON ai_telemetry(feature, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_telemetry_user ON ai_telemetry(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_telemetry_date ON ai_telemetry(created_at);

-- Enable Row Level Security
ALTER TABLE ai_telemetry ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own telemetry
DROP POLICY IF EXISTS "Users can view their own AI usage" ON ai_telemetry;
CREATE POLICY "Users can view their own AI usage"
  ON ai_telemetry
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert (backend only)
DROP POLICY IF EXISTS "Service role can insert telemetry" ON ai_telemetry;
CREATE POLICY "Service role can insert telemetry"
  ON ai_telemetry
  FOR INSERT
  WITH CHECK (true);

-- ================================================
-- Daily Cost Rollup Function
-- ================================================

-- RPC function to get daily cost breakdown by feature
CREATE OR REPLACE FUNCTION get_daily_cost_report(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  feature TEXT,
  total_calls BIGINT,
  total_tokens BIGINT,
  total_cost_usd DECIMAL,
  avg_latency_ms INTEGER,
  success_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai_telemetry.feature,
    COUNT(*)::BIGINT as total_calls,
    SUM(tokens_used)::BIGINT as total_tokens,
    ROUND(SUM(estimated_cost_usd)::DECIMAL, 2) as total_cost_usd,
    ROUND(AVG(latency_ms))::INTEGER as avg_latency_ms,
    ROUND(AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END), 3) as success_rate
  FROM ai_telemetry
  WHERE DATE(created_at) = target_date
  GROUP BY ai_telemetry.feature
  ORDER BY total_cost_usd DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to check if daily budget is exceeded
CREATE OR REPLACE FUNCTION check_daily_budget(budget_limit_usd DECIMAL DEFAULT 100.0)
RETURNS JSON AS $$
DECLARE
  daily_cost DECIMAL;
  exceeded BOOLEAN;
BEGIN
  SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO daily_cost
  FROM ai_telemetry
  WHERE DATE(created_at) = CURRENT_DATE;

  exceeded := daily_cost > budget_limit_usd;

  RETURN json_build_object(
    'daily_cost_usd', ROUND(daily_cost, 2),
    'budget_limit_usd', budget_limit_usd,
    'budget_exceeded', exceeded,
    'remaining_budget_usd', ROUND(budget_limit_usd - daily_cost, 2)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_daily_cost_report(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION check_daily_budget(DECIMAL) TO authenticated;

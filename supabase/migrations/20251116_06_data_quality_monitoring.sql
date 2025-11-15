-- ================================================
-- DATA QUALITY MONITORING
-- Automated health checks for data integrity
-- ================================================

-- Data quality alerts table
CREATE TABLE IF NOT EXISTS data_quality_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'no_meals_24h', 'macro_drift', 'missing_profiles', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  message TEXT NOT NULL,
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_quality_alerts_unresolved ON data_quality_alerts(resolved, created_at);

-- Enable RLS (admin/service role only)
ALTER TABLE data_quality_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage alerts" ON data_quality_alerts;
CREATE POLICY "Service role can manage alerts"
  ON data_quality_alerts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ================================================
-- RPC function to check data quality
-- ================================================

CREATE OR REPLACE FUNCTION check_data_quality()
RETURNS JSON AS $$
DECLARE
  alerts JSON;
  meal_count INTEGER;
  profile_count INTEGER;
  total_users INTEGER;
BEGIN
  -- Check: No meal logs in last 24 hours
  SELECT COUNT(*) INTO meal_count
  FROM food_entries
  WHERE created_at > NOW() - INTERVAL '24 hours';

  IF meal_count = 0 THEN
    INSERT INTO data_quality_alerts (alert_type, severity, message)
    VALUES ('no_meals_24h', 'critical', 'No meal logs in the last 24 hours')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Check: Users without profiles
  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM profiles;

  IF profile_count < total_users THEN
    INSERT INTO data_quality_alerts (alert_type, severity, message, metadata)
    VALUES (
      'missing_profiles',
      'high',
      'Some users are missing profile data',
      json_build_object('total_users', total_users, 'profiles', profile_count)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Return all unresolved alerts
  SELECT json_agg(row_to_json(data_quality_alerts))
  INTO alerts
  FROM data_quality_alerts
  WHERE resolved = false
  ORDER BY created_at DESC;

  RETURN COALESCE(alerts, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission (service role only via RLS)
GRANT EXECUTE ON FUNCTION check_data_quality() TO authenticated;

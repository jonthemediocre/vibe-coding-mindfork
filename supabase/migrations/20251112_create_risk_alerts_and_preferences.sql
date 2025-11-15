-- =====================================================
-- MIGRATION: Risk Alerts + User Preferences Tables
-- =====================================================
-- Purpose: Create tables for predictive risk alerts and user notification preferences
-- Date: 2025-11-12
-- Priority: P1 Critical
-- =====================================================

-- =====================================================
-- 1. RISK ALERTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Alert classification
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  risk_score NUMERIC NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),

  -- Alert content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recommendation TEXT,

  -- Context and evidence
  contributing_factors JSONB DEFAULT '{}'::jsonb,
  evidence JSONB DEFAULT '{}'::jsonb,

  -- User interaction
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  action_taken TEXT, -- What user did in response

  -- Effectiveness tracking
  was_helpful BOOLEAN,
  prevented_issue BOOLEAN,

  -- Metadata
  triggered_by TEXT, -- 'system', 'manual', 'scheduled_check'
  expires_at TIMESTAMPTZ, -- Alert auto-dismisses after this
  priority INT DEFAULT 0, -- Higher = more important

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_alert_type CHECK (
    alert_type IN (
      'craving_risk_high',
      'emotional_eating_pattern',
      'perfect_storm',
      'logging_streak_risk',
      'protein_deficit_pattern',
      'sleep_deprivation_warning',
      'menstrual_cycle_heads_up',
      'dehydration_risk',
      'exercise_avoidance_pattern',
      'goal_drift_warning'
    )
  ),
  CONSTRAINT valid_severity CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 10)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_alerts_user_created
  ON public.risk_alerts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_active
  ON public.risk_alerts(user_id, dismissed, severity, created_at DESC)
  WHERE dismissed = false;

CREATE INDEX IF NOT EXISTS idx_risk_alerts_type
  ON public.risk_alerts(user_id, alert_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_expires
  ON public.risk_alerts(expires_at)
  WHERE expires_at IS NOT NULL AND dismissed = false;

-- RLS Policies
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own risk alerts" ON public.risk_alerts;
CREATE POLICY "Users can view own risk alerts"
  ON public.risk_alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own risk alerts" ON public.risk_alerts;
CREATE POLICY "Users can insert own risk alerts"
  ON public.risk_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own risk alerts" ON public.risk_alerts;
CREATE POLICY "Users can update own risk alerts"
  ON public.risk_alerts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all alerts" ON public.risk_alerts;
CREATE POLICY "Service role can manage all alerts"
  ON public.risk_alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_risk_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_risk_alerts_updated_at ON public.risk_alerts;
CREATE TRIGGER trigger_risk_alerts_updated_at
  BEFORE UPDATE ON public.risk_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_alerts_updated_at();

-- Comments
COMMENT ON TABLE public.risk_alerts IS
  'Predictive alerts for health/nutrition risks based on user patterns';

COMMENT ON COLUMN public.risk_alerts.alert_type IS
  'Type of risk: craving_risk_high, emotional_eating_pattern, perfect_storm, etc.';

COMMENT ON COLUMN public.risk_alerts.severity IS
  'Severity level: low, medium, high, critical';

COMMENT ON COLUMN public.risk_alerts.risk_score IS
  'Calculated risk score 0-100 based on pattern analysis';

COMMENT ON COLUMN public.risk_alerts.contributing_factors IS
  'JSONB: {sleep_hours: 5.2, stress_level: 8, cycle_phase: "luteal", ...}';

-- =====================================================
-- 2. USER PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Quiet hours (do not disturb)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME, -- e.g., '22:00:00'
  quiet_hours_end TIME,   -- e.g., '07:00:00'
  quiet_hours_timezone TEXT DEFAULT 'UTC',

  -- Alert frequency
  alert_frequency TEXT DEFAULT 'realtime',

  -- Notification channels
  allow_push_notifications BOOLEAN DEFAULT true,
  allow_email_notifications BOOLEAN DEFAULT false,
  allow_sms_notifications BOOLEAN DEFAULT false,
  allow_in_app_notifications BOOLEAN DEFAULT true,

  -- Alert type preferences
  alert_preferences JSONB DEFAULT '{
    "craving_risk": true,
    "emotional_eating": true,
    "perfect_storm": true,
    "logging_streak": true,
    "protein_deficit": true,
    "sleep_warning": true,
    "menstrual_cycle": true,
    "dehydration": true,
    "exercise_avoidance": true,
    "goal_drift": true
  }'::jsonb,

  -- Severity thresholds (minimum severity to notify)
  min_severity_push TEXT DEFAULT 'medium',
  min_severity_email TEXT DEFAULT 'high',
  min_severity_sms TEXT DEFAULT 'critical',

  -- Additional preferences (extensible)
  preferences JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_alert_frequency CHECK (
    alert_frequency IN ('realtime', 'hourly', 'daily', 'never')
  ),
  CONSTRAINT valid_min_severity_push CHECK (
    min_severity_push IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT valid_min_severity_email CHECK (
    min_severity_email IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT valid_min_severity_sms CHECK (
    min_severity_sms IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT quiet_hours_valid CHECK (
    (quiet_hours_enabled = false) OR
    (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
  )
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_preferences_quiet_hours
  ON public.user_preferences(user_id, quiet_hours_enabled)
  WHERE quiet_hours_enabled = true;

-- RLS Policies
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all preferences" ON public.user_preferences;
CREATE POLICY "Service role can manage all preferences"
  ON public.user_preferences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trigger_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_alerts_updated_at(); -- Reuse same function

-- Comments
COMMENT ON TABLE public.user_preferences IS
  'User preferences for notifications, alerts, and quiet hours';

COMMENT ON COLUMN public.user_preferences.quiet_hours_start IS
  'Start time for do-not-disturb (e.g., 22:00:00 for 10pm)';

COMMENT ON COLUMN public.user_preferences.quiet_hours_end IS
  'End time for do-not-disturb (e.g., 07:00:00 for 7am)';

COMMENT ON COLUMN public.user_preferences.alert_frequency IS
  'How often to receive alerts: realtime, hourly, daily, never';

COMMENT ON COLUMN public.user_preferences.alert_preferences IS
  'JSONB map of alert types to enabled/disabled boolean';

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Check if user is in quiet hours
CREATE OR REPLACE FUNCTION is_quiet_hours(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_prefs RECORD;
  v_current_time TIME;
  v_is_quiet BOOLEAN := false;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM user_preferences
  WHERE user_id = p_user_id;

  -- If no preferences or quiet hours disabled, not quiet time
  IF NOT FOUND OR NOT v_prefs.quiet_hours_enabled THEN
    RETURN false;
  END IF;

  -- Get current time in user's timezone
  v_current_time := (NOW() AT TIME ZONE v_prefs.quiet_hours_timezone)::TIME;

  -- Check if current time is within quiet hours
  -- Handle wrap-around (e.g., 22:00 to 07:00)
  IF v_prefs.quiet_hours_start <= v_prefs.quiet_hours_end THEN
    -- Normal range (e.g., 09:00 to 17:00)
    v_is_quiet := v_current_time >= v_prefs.quiet_hours_start
                  AND v_current_time < v_prefs.quiet_hours_end;
  ELSE
    -- Wrap-around range (e.g., 22:00 to 07:00)
    v_is_quiet := v_current_time >= v_prefs.quiet_hours_start
                  OR v_current_time < v_prefs.quiet_hours_end;
  END IF;

  RETURN v_is_quiet;
END;
$$;

COMMENT ON FUNCTION is_quiet_hours IS
  'Check if user is currently in quiet hours (do not disturb)';

-- Auto-dismiss expired alerts
CREATE OR REPLACE FUNCTION auto_dismiss_expired_alerts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dismissed_count INT;
BEGIN
  UPDATE risk_alerts
  SET
    dismissed = true,
    dismissed_at = NOW(),
    dismissed_reason = 'auto_expired'
  WHERE dismissed = false
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS v_dismissed_count = ROW_COUNT;

  RETURN v_dismissed_count;
END;
$$;

COMMENT ON FUNCTION auto_dismiss_expired_alerts IS
  'Auto-dismiss alerts that have passed their expiration time';

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_quiet_hours TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auto_dismiss_expired_alerts TO service_role;

-- =====================================================
-- 4. SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ RISK ALERTS + USER PREFERENCES CREATED';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables Created:';
  RAISE NOTICE '  1. risk_alerts - Predictive health/nutrition alerts';
  RAISE NOTICE '  2. user_preferences - Notification preferences & quiet hours';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Functions Created:';
  RAISE NOTICE '  - is_quiet_hours(user_id) → Check DND status';
  RAISE NOTICE '  - auto_dismiss_expired_alerts() → Cleanup job';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS Policies: Owner-only access';
  RAISE NOTICE '✅ Indexes: Optimized for alert queries';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test Commands:';
  RAISE NOTICE '  -- Insert alert';
  RAISE NOTICE '  INSERT INTO risk_alerts (user_id, alert_type, severity,';
  RAISE NOTICE '    risk_score, title, message)';
  RAISE NOTICE '  VALUES (auth.uid(), ''craving_risk_high'', ''high'', 87,';
  RAISE NOTICE '    ''High Craving Risk Detected'', ''You have 87%% craving risk...'');';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Set preferences';
  RAISE NOTICE '  INSERT INTO user_preferences (user_id, quiet_hours_enabled,';
  RAISE NOTICE '    quiet_hours_start, quiet_hours_end)';
  RAISE NOTICE '  VALUES (auth.uid(), true, ''22:00'', ''07:00'')';
  RAISE NOTICE '  ON CONFLICT (user_id) DO UPDATE';
  RAISE NOTICE '  SET quiet_hours_enabled = true;';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Check if in quiet hours';
  RAISE NOTICE '  SELECT is_quiet_hours(auth.uid());';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

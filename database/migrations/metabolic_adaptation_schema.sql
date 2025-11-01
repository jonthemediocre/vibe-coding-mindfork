-- =====================================================================
-- METABOLIC ADAPTATION SYSTEM
-- =====================================================================
-- Implements MacroFactor-style adaptive algorithm with MindFork personality
--
-- Features:
-- - Tracks daily weight + food intake
-- - Calculates trend weight (7-day EMA)
-- - Detects metabolic adaptation (slowdown/speedup)
-- - Auto-adjusts calorie targets with AI coach explanations
--
-- Usage:
-- 1. User logs food daily → food_entries table (already exists)
-- 2. User logs weight daily → metabolic_tracking table (new)
-- 3. Weekly cron checks for adaptation → metabolic_adaptations table (new)
-- 4. Coach sends personalized explanation → coach_messages table (already exists)
-- =====================================================================

-- =====================================================================
-- TABLE: metabolic_tracking
-- =====================================================================
-- Stores daily weight, intake, and calculated metabolic metrics
-- =====================================================================
CREATE TABLE IF NOT EXISTS metabolic_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Raw inputs (user-provided data)
  weight_lb DECIMAL(5,1),           -- Daily weigh-in (raw weight)
  intake_kcal INTEGER,               -- Total calories logged this day

  -- Calculated values (algorithm outputs)
  trend_weight_lb DECIMAL(5,1),      -- 7-day EMA smoothed weight (removes daily noise)
  estimated_ee_kcal INTEGER,         -- Estimated Energy Expenditure (calculated TDEE)
  kcal_per_lb DECIMAL(5,1) DEFAULT 3500.0,  -- Personalized energy/weight ratio (starts at 3500)

  -- Quality metrics
  weighins_this_week INTEGER DEFAULT 0,     -- Count of weigh-ins in current week
  adherence_score DECIMAL(3,2),             -- Logging adherence (0.00 to 1.00)
  days_logged INTEGER DEFAULT 0,            -- Days with complete food logs

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, date),
  CHECK (weight_lb IS NULL OR weight_lb > 0),
  CHECK (intake_kcal IS NULL OR intake_kcal > 0),
  CHECK (adherence_score IS NULL OR (adherence_score >= 0 AND adherence_score <= 1))
);

-- Indexes for performance
CREATE INDEX idx_metabolic_tracking_user_date ON metabolic_tracking(user_id, date DESC);
CREATE INDEX idx_metabolic_tracking_user_recent ON metabolic_tracking(user_id, created_at DESC)
  WHERE created_at > NOW() - INTERVAL '90 days';

-- =====================================================================
-- TABLE: metabolic_adaptations
-- =====================================================================
-- Records detected metabolic adaptations and calorie adjustments
-- =====================================================================
CREATE TABLE IF NOT EXISTS metabolic_adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Adaptation classification
  adaptation_type TEXT NOT NULL CHECK (adaptation_type IN (
    'deficit_stall',      -- Weight loss slowed despite consistent deficit
    'surplus_slow',       -- Weight gain slowed despite consistent surplus
    'stable'              -- No significant adaptation detected
  )),
  adaptation_magnitude DECIMAL(4,2) NOT NULL,  -- Percentage change (e.g., -0.12 = 12% metabolic slowdown)

  -- What changed (calories & energy expenditure)
  old_daily_calories INTEGER NOT NULL,         -- Previous calorie target
  new_daily_calories INTEGER NOT NULL,         -- New calorie target (adjusted)
  calorie_adjustment INTEGER GENERATED ALWAYS AS (new_daily_calories - old_daily_calories) STORED,

  old_ee_kcal INTEGER NOT NULL,                -- Previous estimated energy expenditure
  new_ee_kcal INTEGER NOT NULL,                -- New estimated energy expenditure
  ee_change_pct DECIMAL(5,2) GENERATED ALWAYS AS (
    ROUND(((new_ee_kcal - old_ee_kcal)::DECIMAL / NULLIF(old_ee_kcal, 0)) * 100, 2)
  ) STORED,

  -- Weight trend data
  week_start_weight_lb DECIMAL(5,1),           -- Trend weight at start of week
  week_end_weight_lb DECIMAL(5,1),             -- Trend weight at end of week
  weight_change_lb DECIMAL(5,2) GENERATED ALWAYS AS (week_end_weight_lb - week_start_weight_lb) STORED,
  weight_change_rate_lb_per_day DECIMAL(5,3),  -- Average daily weight change

  -- Coach communication
  coach_id TEXT NOT NULL,                      -- Which coach explained it (synapse, vetra, etc.)
  coach_message TEXT NOT NULL,                 -- Personalized explanation from coach
  user_acknowledged BOOLEAN DEFAULT false,     -- Did user read the explanation?
  user_acknowledged_at TIMESTAMPTZ,

  -- Data quality
  data_points_used INTEGER NOT NULL,           -- How many days of data informed this decision
  confidence_score DECIMAL(3,2),               -- Algorithm confidence (0.00 to 1.00)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (adaptation_magnitude >= -1.0 AND adaptation_magnitude <= 1.0),
  CHECK (new_daily_calories >= 1200 AND new_daily_calories <= 5000),
  CHECK (data_points_used >= 7),
  CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- Indexes for queries
CREATE INDEX idx_metabolic_adaptations_user ON metabolic_adaptations(user_id, detected_at DESC);
CREATE INDEX idx_metabolic_adaptations_unacknowledged ON metabolic_adaptations(user_id, user_acknowledged)
  WHERE user_acknowledged = false;
CREATE INDEX idx_metabolic_adaptations_recent ON metabolic_adaptations(detected_at DESC)
  WHERE detected_at > NOW() - INTERVAL '90 days';

-- =====================================================================
-- VIEW: user_metabolic_summary
-- =====================================================================
-- Quick summary of user's recent metabolic data
-- =====================================================================
CREATE OR REPLACE VIEW user_metabolic_summary AS
SELECT
  mt.user_id,

  -- Most recent data
  (SELECT weight_lb FROM metabolic_tracking WHERE user_id = mt.user_id AND weight_lb IS NOT NULL ORDER BY date DESC LIMIT 1) as current_weight_lb,
  (SELECT trend_weight_lb FROM metabolic_tracking WHERE user_id = mt.user_id AND trend_weight_lb IS NOT NULL ORDER BY date DESC LIMIT 1) as current_trend_weight_lb,
  (SELECT estimated_ee_kcal FROM metabolic_tracking WHERE user_id = mt.user_id AND estimated_ee_kcal IS NOT NULL ORDER BY date DESC LIMIT 1) as current_ee_kcal,

  -- 30-day stats
  COUNT(DISTINCT mt.date) FILTER (WHERE mt.date > CURRENT_DATE - INTERVAL '30 days') as days_tracked_30d,
  AVG(mt.adherence_score) FILTER (WHERE mt.date > CURRENT_DATE - INTERVAL '30 days') as avg_adherence_30d,
  AVG(mt.intake_kcal) FILTER (WHERE mt.date > CURRENT_DATE - INTERVAL '30 days') as avg_intake_30d,

  -- 7-day stats
  COUNT(DISTINCT mt.date) FILTER (WHERE mt.date > CURRENT_DATE - INTERVAL '7 days') as days_tracked_7d,
  AVG(mt.weight_lb) FILTER (WHERE mt.date > CURRENT_DATE - INTERVAL '7 days') as avg_weight_7d,

  -- Last adaptation
  (SELECT detected_at FROM metabolic_adaptations WHERE user_id = mt.user_id ORDER BY detected_at DESC LIMIT 1) as last_adaptation_date,
  (SELECT adaptation_type FROM metabolic_adaptations WHERE user_id = mt.user_id ORDER BY detected_at DESC LIMIT 1) as last_adaptation_type,
  (SELECT calorie_adjustment FROM metabolic_adaptations WHERE user_id = mt.user_id ORDER BY detected_at DESC LIMIT 1) as last_calorie_adjustment

FROM metabolic_tracking mt
GROUP BY mt.user_id;

-- =====================================================================
-- FUNCTION: update_metabolic_tracking_timestamp
-- =====================================================================
-- Auto-update updated_at timestamp on row changes
-- =====================================================================
CREATE OR REPLACE FUNCTION update_metabolic_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for metabolic_tracking
CREATE TRIGGER trigger_metabolic_tracking_timestamp
  BEFORE UPDATE ON metabolic_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_metabolic_tracking_timestamp();

-- Trigger for metabolic_adaptations
CREATE TRIGGER trigger_metabolic_adaptations_timestamp
  BEFORE UPDATE ON metabolic_adaptations
  FOR EACH ROW
  EXECUTE FUNCTION update_metabolic_tracking_timestamp();

-- =====================================================================
-- FUNCTION: calculate_trend_weight_ema
-- =====================================================================
-- Calculate 7-day Exponential Moving Average for weight trend
-- =====================================================================
CREATE OR REPLACE FUNCTION calculate_trend_weight_ema(
  p_user_id UUID,
  p_halflife_days INTEGER DEFAULT 7
)
RETURNS TABLE(date DATE, trend_weight_lb DECIMAL(5,1)) AS $$
DECLARE
  v_alpha DECIMAL(10,8);
  v_prev_trend DECIMAL(5,1);
  v_first_weight DECIMAL(5,1);
BEGIN
  -- Calculate EMA alpha factor
  v_alpha := 1 - EXP(LN(0.5) / p_halflife_days);

  -- Get first non-null weight as starting point
  SELECT mt.weight_lb INTO v_first_weight
  FROM metabolic_tracking mt
  WHERE mt.user_id = p_user_id AND mt.weight_lb IS NOT NULL
  ORDER BY mt.date ASC
  LIMIT 1;

  IF v_first_weight IS NULL THEN
    RETURN;  -- No data for this user
  END IF;

  -- Calculate EMA iteratively
  FOR rec IN (
    SELECT mt.date, mt.weight_lb
    FROM metabolic_tracking mt
    WHERE mt.user_id = p_user_id
    ORDER BY mt.date ASC
  ) LOOP
    IF v_prev_trend IS NULL THEN
      -- First data point
      v_prev_trend := COALESCE(rec.weight_lb, v_first_weight);
    ELSE
      -- EMA formula: new_trend = alpha * current_weight + (1 - alpha) * prev_trend
      v_prev_trend := v_alpha * COALESCE(rec.weight_lb, v_prev_trend) + (1 - v_alpha) * v_prev_trend;
    END IF;

    date := rec.date;
    trend_weight_lb := ROUND(v_prev_trend, 1);
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================================
-- RLS (Row Level Security) Policies
-- =====================================================================

-- Enable RLS
ALTER TABLE metabolic_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE metabolic_adaptations ENABLE ROW LEVEL SECURITY;

-- metabolic_tracking policies
CREATE POLICY "Users can view own metabolic tracking"
  ON metabolic_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metabolic tracking"
  ON metabolic_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metabolic tracking"
  ON metabolic_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own metabolic tracking"
  ON metabolic_tracking FOR DELETE
  USING (auth.uid() = user_id);

-- metabolic_adaptations policies
CREATE POLICY "Users can view own adaptations"
  ON metabolic_adaptations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert adaptations"
  ON metabolic_adaptations FOR INSERT
  WITH CHECK (true);  -- Service role can insert for any user

CREATE POLICY "Users can acknowledge adaptations"
  ON metabolic_adaptations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- SAMPLE DATA (for testing - remove in production)
-- =====================================================================
-- Uncomment to insert test data for development

/*
-- Test user: deficit stall scenario
INSERT INTO metabolic_tracking (user_id, date, weight_lb, intake_kcal, adherence_score) VALUES
  ('test-user-id', CURRENT_DATE - INTERVAL '28 days', 180.0, 1800, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '27 days', 179.8, 1850, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '26 days', 179.5, 1750, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '25 days', 179.2, 1820, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '24 days', 179.0, 1800, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '23 days', 178.7, 1790, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '22 days', 178.5, 1810, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '21 days', 178.3, 1800, 0.86),
  ('test-user-id', CURRENT_DATE - INTERVAL '20 days', 178.2, 1820, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '19 days', 178.0, 1790, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '18 days', 177.9, 1800, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '17 days', 177.8, 1810, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '16 days', 177.7, 1800, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '15 days', 177.6, 1820, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '14 days', 177.5, 1800, 0.71),  -- Adaptation starts
  ('test-user-id', CURRENT_DATE - INTERVAL '13 days', 177.5, 1800, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '12 days', 177.4, 1810, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '11 days', 177.4, 1790, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '10 days', 177.3, 1800, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '9 days', 177.3, 1820, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '8 days', 177.2, 1800, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '7 days', 177.2, 1800, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '6 days', 177.1, 1810, 0.86),
  ('test-user-id', CURRENT_DATE - INTERVAL '5 days', 177.1, 1800, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '4 days', 177.0, 1790, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '3 days', 177.0, 1800, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '2 days', 176.9, 1820, 1.0),
  ('test-user-id', CURRENT_DATE - INTERVAL '1 day', 176.9, 1800, 1.0),
  ('test-user-id', CURRENT_DATE, 176.8, 1800, 1.0);
*/

-- =====================================================================
-- COMMENTS
-- =====================================================================
COMMENT ON TABLE metabolic_tracking IS 'Daily weight and intake tracking for metabolic adaptation algorithm';
COMMENT ON TABLE metabolic_adaptations IS 'Detected metabolic adaptations with calorie adjustments and coach explanations';
COMMENT ON COLUMN metabolic_tracking.trend_weight_lb IS 'Smoothed weight using 7-day EMA to remove daily noise (water, food, etc)';
COMMENT ON COLUMN metabolic_tracking.estimated_ee_kcal IS 'Calculated energy expenditure based on intake vs weight change';
COMMENT ON COLUMN metabolic_adaptations.adaptation_type IS 'deficit_stall = metabolism slowed during weight loss, surplus_slow = metabolism increased during bulk';
COMMENT ON COLUMN metabolic_adaptations.adaptation_magnitude IS 'Percentage change in metabolic rate (negative = slowdown, positive = speedup)';
COMMENT ON FUNCTION calculate_trend_weight_ema IS 'Exponential Moving Average calculation for trend weight (removes daily fluctuations)';

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================

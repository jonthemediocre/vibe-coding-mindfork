-- ================================================
-- MEDIUM PRIORITY: A/B Testing & Experiments
-- Systematic testing framework for feature variants
-- ================================================

-- Experiments table for A/B testing
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'home_wl_widget', 'bro_theme_test', etc.
  variants JSONB NOT NULL, -- ['control', 'variant_a', 'variant_b']
  allocation JSONB NOT NULL, -- {'control': 0.5, 'variant_a': 0.5}
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User experiment assignments
CREATE TABLE IF NOT EXISTS user_experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, experiment_id)
);

-- Experiment events (conversions, retention, etc.)
CREATE TABLE IF NOT EXISTS experiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'retention_7d', 'meal_logged', 'coach_engaged'
  event_value DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_experiments ON user_experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events ON experiment_events(experiment_id, variant, event_type);

-- Enable RLS
ALTER TABLE user_experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own assignments" ON user_experiment_assignments;
CREATE POLICY "Users can view their own assignments"
  ON user_experiment_assignments
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert assignments" ON user_experiment_assignments;
CREATE POLICY "Service can insert assignments"
  ON user_experiment_assignments
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert events" ON experiment_events;
CREATE POLICY "Service can insert events"
  ON experiment_events
  FOR INSERT
  WITH CHECK (true);

-- ================================================
-- RPC function to get variant for user
-- ================================================

CREATE OR REPLACE FUNCTION get_experiment_variant(target_user_id UUID, experiment_name TEXT)
RETURNS TEXT AS $$
DECLARE
  experiment_record RECORD;
  assignment TEXT;
  random_val DECIMAL;
  cumulative DECIMAL := 0;
  variant TEXT;
  allocation_value DECIMAL;
BEGIN
  -- Check if user already has assignment
  SELECT uea.variant INTO assignment
  FROM user_experiment_assignments uea
  JOIN experiments e ON e.id = uea.experiment_id
  WHERE uea.user_id = target_user_id
    AND e.name = experiment_name
    AND e.is_active = true;

  IF assignment IS NOT NULL THEN
    RETURN assignment;
  END IF;

  -- Get experiment
  SELECT * INTO experiment_record
  FROM experiments
  WHERE name = experiment_name
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'control'; -- Default to control if experiment not found
  END IF;

  -- Assign variant based on allocation
  random_val := random();

  FOR variant, allocation_value IN
    SELECT key, value::TEXT::DECIMAL
    FROM jsonb_each(experiment_record.allocation)
  LOOP
    cumulative := cumulative + allocation_value;
    IF random_val < cumulative THEN
      -- Save assignment
      INSERT INTO user_experiment_assignments (user_id, experiment_id, variant)
      VALUES (target_user_id, experiment_record.id, variant);

      RETURN variant;
    END IF;
  END LOOP;

  RETURN 'control';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_experiment_variant(UUID, TEXT) TO authenticated;

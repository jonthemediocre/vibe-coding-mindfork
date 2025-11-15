-- Migration: Create step_tracking table
-- Created: 2025-11-03
-- Purpose: Enable step tracking functionality for StepTrackingService

-- ============================================================================
-- CREATE STEP_TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.step_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  step_count INTEGER NOT NULL DEFAULT 0,
  calories_burned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  -- Ensure one entry per user per day
  CONSTRAINT step_tracking_user_date_unique UNIQUE(user_id, date),

  -- Data validation
  CONSTRAINT step_count_positive CHECK (step_count >= 0),
  CONSTRAINT calories_positive CHECK (calories_burned >= 0)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary query pattern: Get steps for user by date range
CREATE INDEX IF NOT EXISTS idx_step_tracking_user_date
  ON step_tracking(user_id, date);

-- History queries with descending order
CREATE INDEX IF NOT EXISTS idx_step_tracking_user_date_desc
  ON step_tracking(user_id, date DESC);

-- Weekly/monthly aggregations
CREATE INDEX IF NOT EXISTS idx_step_tracking_date
  ON step_tracking(date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE step_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own step data
CREATE POLICY "Users can view own step tracking"
  ON step_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own step data
CREATE POLICY "Users can insert own step tracking"
  ON step_tracking
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own step data
CREATE POLICY "Users can update own step tracking"
  ON step_tracking
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own step data
CREATE POLICY "Users can delete own step tracking"
  ON step_tracking
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_step_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER step_tracking_updated_at
  BEFORE UPDATE ON step_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_step_tracking_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE step_tracking IS
  'Tracks daily step counts and calories burned for user activity monitoring';

COMMENT ON COLUMN step_tracking.date IS
  'Date of step tracking (YYYY-MM-DD), unique per user per day';

COMMENT ON COLUMN step_tracking.step_count IS
  'Total steps for the day from health integrations';

COMMENT ON COLUMN step_tracking.calories_burned IS
  'Estimated calories burned from step activity';

COMMENT ON INDEX idx_step_tracking_user_date IS
  'CRITICAL: Primary index for step tracking queries by user and date range';

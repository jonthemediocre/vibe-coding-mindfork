-- Migration: Add Profile Tracking Preferences
-- Created: 2025-11-03
-- Purpose: Add nutrition goals and activity tracking preferences to profiles

-- ============================================================================
-- ADD NUTRITION GOAL COLUMNS
-- ============================================================================

ALTER TABLE public.profiles
  -- Additional nutrition goals (fiber, sodium, sugar)
  ADD COLUMN IF NOT EXISTS daily_fiber_g INTEGER,
  ADD COLUMN IF NOT EXISTS daily_sodium_mg INTEGER,
  ADD COLUMN IF NOT EXISTS daily_sugar_g INTEGER;

-- ============================================================================
-- ADD ACTIVITY TRACKING PREFERENCES
-- ============================================================================

ALTER TABLE public.profiles
  -- Step tracking goals and sync
  ADD COLUMN IF NOT EXISTS step_goal INTEGER DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS activity_sync_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_step_sync_at TIMESTAMPTZ;

-- ============================================================================
-- DATA VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure positive nutrition goals
ALTER TABLE profiles
  ADD CONSTRAINT daily_fiber_positive CHECK (daily_fiber_g IS NULL OR daily_fiber_g > 0),
  ADD CONSTRAINT daily_sodium_positive CHECK (daily_sodium_mg IS NULL OR daily_sodium_mg > 0),
  ADD CONSTRAINT daily_sugar_positive CHECK (daily_sugar_g IS NULL OR daily_sugar_g > 0),
  ADD CONSTRAINT step_goal_positive CHECK (step_goal IS NULL OR step_goal > 0);

-- Reasonable limits (prevent typos/errors)
ALTER TABLE profiles
  ADD CONSTRAINT daily_fiber_reasonable CHECK (daily_fiber_g IS NULL OR daily_fiber_g <= 200),
  ADD CONSTRAINT daily_sodium_reasonable CHECK (daily_sodium_mg IS NULL OR daily_sodium_mg <= 10000),
  ADD CONSTRAINT daily_sugar_reasonable CHECK (daily_sugar_g IS NULL OR daily_sugar_g <= 500),
  ADD CONSTRAINT step_goal_reasonable CHECK (step_goal IS NULL OR step_goal <= 100000);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Activity sync status
CREATE INDEX IF NOT EXISTS idx_profiles_activity_sync
  ON profiles(activity_sync_enabled, last_step_sync_at)
  WHERE activity_sync_enabled = true;

-- ============================================================================
-- DEFAULT VALUES FOR EXISTING USERS
-- ============================================================================

-- Set reasonable defaults for existing users based on common recommendations
UPDATE profiles
SET
  daily_fiber_g = COALESCE(daily_fiber_g, 30),  -- Recommended daily fiber
  daily_sodium_mg = COALESCE(daily_sodium_mg, 2300),  -- FDA recommended limit
  daily_sugar_g = COALESCE(daily_sugar_g, 50),  -- WHO recommendation (~10% of calories)
  step_goal = COALESCE(step_goal, 10000)  -- Common fitness goal
WHERE
  onboarding_completed = true
  AND (daily_fiber_g IS NULL OR daily_sodium_mg IS NULL OR daily_sugar_g IS NULL OR step_goal IS NULL);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN profiles.daily_fiber_g IS
  'Daily fiber goal in grams (recommended: 25-35g/day)';

COMMENT ON COLUMN profiles.daily_sodium_mg IS
  'Daily sodium limit in milligrams (FDA recommends <2300mg/day)';

COMMENT ON COLUMN profiles.daily_sugar_g IS
  'Daily added sugar limit in grams (WHO recommends <50g/day)';

COMMENT ON COLUMN profiles.step_goal IS
  'Daily step count goal (default: 10,000 steps)';

COMMENT ON COLUMN profiles.activity_sync_enabled IS
  'Whether to automatically sync activity data from health apps';

COMMENT ON COLUMN profiles.last_step_sync_at IS
  'Timestamp of last successful step data sync from health integration';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- This migration adds:
-- 1. Nutrition goal tracking for fiber, sodium, and sugar
-- 2. Step tracking preferences and sync status
--
-- Benefits:
-- - Users can set personalized nutrition goals beyond calories/macros
-- - Step tracking is integrated with user preferences
-- - Health app sync status is tracked
--
-- Backward Compatibility:
-- - All columns are nullable or have defaults
-- - Existing users get sensible defaults based on WHO/FDA recommendations
-- - No breaking changes to existing functionality
--

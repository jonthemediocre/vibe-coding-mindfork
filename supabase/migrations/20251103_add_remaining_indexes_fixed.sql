-- Migration: Add Remaining Performance Indexes (Fixed)
-- Created: 2025-11-03
-- Purpose: Add the remaining indexes from the original migration, fixed for actual schema

-- ============================================================================
-- FIXED INDEXES - Adjusted for actual schema
-- ============================================================================

-- food_entries: Most common query pattern - (user_id, created_at DESC)
-- Original had WHERE deleted_at IS NULL, but that column doesn't exist
-- Using logged_at instead of created_at as it's more relevant for food entries
CREATE INDEX IF NOT EXISTS idx_food_entries_user_created_at
  ON food_entries(user_id, logged_at DESC);

-- fasting_sessions: History queries - (user_id, start_time DESC)
-- This might already exist but we'll try to create it
CREATE INDEX IF NOT EXISTS idx_fasting_sessions_user_start_time
  ON fasting_sessions(user_id, start_time DESC);

-- profiles: User profile lookup - (user_id)
-- Original had WHERE deleted_at IS NULL, but that column doesn't exist
-- user_id should already be primary key, but adding index for safety
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON profiles(user_id);

-- food_entries: Date range queries for analytics - (user_id, DATE(logged_at))
-- Original used created_at::date which isn't immutable
-- Using DATE() function which is immutable
CREATE INDEX IF NOT EXISTS idx_food_entries_user_date
  ON food_entries(user_id, DATE(logged_at));

-- favorite_foods: Recency ordering - (user_id, created_at DESC)
-- This might already exist but we'll try to create it
CREATE INDEX IF NOT EXISTS idx_favorite_foods_user_created
  ON favorite_foods(user_id, created_at DESC);

-- ============================================================================
-- SKIPPED INDEXES - Tables don't exist
-- ============================================================================
-- step_tracking table doesn't exist in this schema, so skipping:
-- - idx_step_tracking_user_date
-- - idx_step_tracking_user_date_desc

-- ============================================================================
-- INDEX COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_food_entries_user_created_at IS
  'CRITICAL: Most frequently used index for food entry retrieval with date ordering.';

COMMENT ON INDEX idx_profiles_user_id IS
  'MEDIUM: User profile lookup optimization.';

COMMENT ON INDEX idx_food_entries_user_date IS
  'HIGH: Supports daily aggregation queries for analytics efficiently.';

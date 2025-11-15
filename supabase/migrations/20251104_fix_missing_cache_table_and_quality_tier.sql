-- =====================================================
-- FIX MISSING user_layout_cache TABLE AND quality_tier COLUMN
-- =====================================================
-- Purpose: Create missing dependencies for dynamic UI system
-- Date: 2025-11-04
-- Fixes:
--   1. Missing user_layout_cache table (blocking personalization rules)
--   2. Missing quality_tier column (blocking dashboard materialized view)
-- =====================================================

-- =====================================================
-- 1. CREATE user_layout_cache TABLE
-- =====================================================
-- Purpose: Cache computed layouts to avoid repeated rule evaluation
-- TTL: 5 minutes (enforced by select_ui_layout function)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_layout_cache (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area TEXT NOT NULL CHECK (area IN ('home', 'profile', 'meal_detail', 'stats', 'social')),
  layout_json JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, area)
);

-- Index for cache invalidation queries
CREATE INDEX IF NOT EXISTS idx_user_layout_cache_computed_at
ON user_layout_cache(computed_at DESC);

-- RLS Policies
ALTER TABLE user_layout_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cached layouts"
ON user_layout_cache FOR SELECT TO public
USING (auth.uid() = user_id);

CREATE POLICY "System can insert cached layouts"
ON user_layout_cache FOR INSERT TO public
WITH CHECK (true);  -- Allow system to insert for any user

CREATE POLICY "System can update cached layouts"
ON user_layout_cache FOR UPDATE TO public
USING (true);  -- Allow system to update any cache

CREATE POLICY "System can delete cached layouts"
ON user_layout_cache FOR DELETE TO public
USING (true);  -- Allow system to delete any cache

COMMENT ON TABLE user_layout_cache IS 'Caches computed UI layouts to avoid repeated rule evaluation. TTL: 5 minutes.';

-- =====================================================
-- 2. ADD quality_tier COLUMN TO food_entries
-- =====================================================
-- Purpose: Support dashboard materialized view aggregations
-- Values: elite, good, caution, heavy, soot
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_entries'
    AND column_name = 'quality_tier'
  ) THEN
    ALTER TABLE food_entries
    ADD COLUMN quality_tier TEXT
    CHECK (quality_tier IN ('elite', 'good', 'caution', 'heavy', 'soot'));

    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_food_entries_quality_tier
    ON food_entries(quality_tier)
    WHERE quality_tier IS NOT NULL;

    COMMENT ON COLUMN food_entries.quality_tier IS 'Food quality classification: elite, good, caution, heavy, soot';
  END IF;
END $$;

-- =====================================================
-- 3. GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_layout_cache TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify table created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_layout_cache') as column_count
FROM information_schema.tables
WHERE table_name = 'user_layout_cache';

-- Verify column added
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'food_entries'
  AND column_name = 'quality_tier';

-- =====================================================
-- DONE: Missing Dependencies Created
-- =====================================================

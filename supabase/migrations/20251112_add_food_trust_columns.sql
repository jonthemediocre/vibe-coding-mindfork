-- =====================================================
-- MIGRATION: Add Food Trust Columns + Backfill
-- =====================================================
-- Purpose: Add trust tracking columns to food_entries for AI guess validation
-- Date: 2025-11-12
-- Priority: CRITICAL (P1) - Blocks food verification features
-- =====================================================

-- =====================================================
-- 1. ADD TRUST COLUMNS TO food_entries
-- =====================================================

ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS trust_level TEXT,
  ADD COLUMN IF NOT EXISTS trust_source TEXT,
  ADD COLUMN IF NOT EXISTS trust_score NUMERIC,
  ADD COLUMN IF NOT EXISTS trust_note TEXT,
  ADD COLUMN IF NOT EXISTS ai_guess JSONB;

-- =====================================================
-- 2. ADD CONSTRAINTS
-- =====================================================

-- Valid trust levels
ALTER TABLE public.food_entries
  ADD CONSTRAINT valid_trust_level CHECK (
    trust_level IS NULL OR trust_level IN (
      'verified',           -- User confirmed AI guess is correct
      'ai_guess',           -- AI prediction, not yet verified
      'user_unverified',    -- User entered manually, no AI involved
      'user_corrected',     -- User fixed AI guess
      'low_confidence',     -- AI guess with low confidence (<0.6)
      'flagged'             -- Flagged for review (mismatch detected)
    )
  );

-- Valid trust sources
ALTER TABLE public.food_entries
  ADD CONSTRAINT valid_trust_source CHECK (
    trust_source IS NULL OR trust_source IN (
      'barcode',      -- Scanned barcode lookup
      'photo_ai',     -- AI vision analysis from photo
      'usda',         -- USDA FoodData Central
      'manual',       -- User typed manually
      'search',       -- Selected from search results
      'cache',        -- Retrieved from food_catalog_cache
      'openfoodfacts' -- Open Food Facts database
    )
  );

-- Trust score range 0-1
ALTER TABLE public.food_entries
  ADD CONSTRAINT trust_score_range CHECK (
    trust_score IS NULL OR (trust_score >= 0 AND trust_score <= 1)
  );

-- =====================================================
-- 3. CREATE INDEXES FOR TRUST COLUMNS
-- =====================================================

-- Filter by trust level (for review queues)
CREATE INDEX IF NOT EXISTS idx_food_entries_trust_level
  ON public.food_entries(user_id, trust_level, created_at DESC)
  WHERE trust_level IS NOT NULL;

-- Find low confidence entries
CREATE INDEX IF NOT EXISTS idx_food_entries_low_confidence
  ON public.food_entries(user_id, trust_score, created_at DESC)
  WHERE trust_score IS NOT NULL AND trust_score < 0.6;

-- Find flagged entries
CREATE INDEX IF NOT EXISTS idx_food_entries_flagged
  ON public.food_entries(user_id, created_at DESC)
  WHERE trust_level = 'flagged';

-- Track trust sources
CREATE INDEX IF NOT EXISTS idx_food_entries_trust_source
  ON public.food_entries(trust_source, created_at DESC)
  WHERE trust_source IS NOT NULL;

-- =====================================================
-- 4. BACKFILL LEGACY ROWS WITH DEFAULTS
-- =====================================================

-- Strategy: Infer trust level from existing data_source column
UPDATE public.food_entries
SET
  trust_level = CASE
    -- If barcode or USDA, high confidence
    WHEN data_source IN ('barcode', 'usda') THEN 'verified'
    -- If AI photo analysis, mark as AI guess
    WHEN data_source = 'ai' THEN 'ai_guess'
    -- If manual or search, user entered
    WHEN data_source IN ('manual', 'search') THEN 'user_unverified'
    -- Default for null data_source
    ELSE 'user_unverified'
  END,
  trust_source = COALESCE(
    data_source,
    'manual' -- Default if data_source is null
  ),
  trust_score = CASE
    WHEN data_source IN ('barcode', 'usda') THEN 0.95
    WHEN data_source = 'search' THEN 0.85
    WHEN data_source = 'ai' THEN 0.70
    WHEN data_source = 'manual' THEN 0.50
    ELSE 0.50
  END,
  trust_note = 'Backfilled from legacy data_source column'
WHERE trust_level IS NULL; -- Only update rows that haven't been migrated

-- =====================================================
-- 5. UPDATE RLS POLICIES
-- =====================================================

-- Drop and recreate RLS policies to ensure they work with new columns

-- Existing policies should already cover these columns since they're
-- part of the food_entries table, but we'll explicitly verify:

-- Verify RLS is enabled
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own food entries (including trust data)
-- This policy should already exist, but we recreate it to be explicit

DROP POLICY IF EXISTS "Users can view own food entries" ON public.food_entries;
CREATE POLICY "Users can view own food entries"
  ON public.food_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only insert their own food entries
DROP POLICY IF EXISTS "Users can insert own food entries" ON public.food_entries;
CREATE POLICY "Users can insert own food entries"
  ON public.food_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own food entries
DROP POLICY IF EXISTS "Users can update own food entries" ON public.food_entries;
CREATE POLICY "Users can update own food entries"
  ON public.food_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own food entries
DROP POLICY IF EXISTS "Users can delete own food entries" ON public.food_entries;
CREATE POLICY "Users can delete own food entries"
  ON public.food_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. ADD COLUMN COMMENTS
-- =====================================================

COMMENT ON COLUMN public.food_entries.trust_level IS
  'Trust level of nutrition data: verified, ai_guess, user_unverified, user_corrected, low_confidence, flagged';

COMMENT ON COLUMN public.food_entries.trust_source IS
  'Source of nutrition data: barcode, photo_ai, usda, manual, search, cache, openfoodfacts';

COMMENT ON COLUMN public.food_entries.trust_score IS
  'Confidence score 0-1: How confident we are in the nutrition data accuracy';

COMMENT ON COLUMN public.food_entries.trust_note IS
  'Optional note about trust status (e.g., "User confirmed via barcode scan")';

COMMENT ON COLUMN public.food_entries.ai_guess IS
  'Original AI prediction before user verification (JSONB): {name, calories, protein_g, carbs_g, fat_g, confidence}';

-- =====================================================
-- 7. CREATE HELPER VIEW FOR TRUST ANALYTICS
-- =====================================================

CREATE OR REPLACE VIEW food_trust_analytics AS
SELECT
  user_id,
  trust_level,
  trust_source,
  COUNT(*) AS entry_count,
  ROUND(AVG(trust_score), 3) AS avg_trust_score,
  COUNT(*) FILTER (WHERE trust_score < 0.6) AS low_confidence_count,
  COUNT(*) FILTER (WHERE trust_level = 'flagged') AS flagged_count,
  MIN(created_at) AS first_entry_at,
  MAX(created_at) AS latest_entry_at
FROM public.food_entries
WHERE trust_level IS NOT NULL
GROUP BY user_id, trust_level, trust_source;

COMMENT ON VIEW food_trust_analytics IS
  'Per-user analytics on food entry trust levels and sources';

-- Grant access to view
GRANT SELECT ON food_trust_analytics TO authenticated;

-- RLS for view (inherits from food_entries)
ALTER VIEW food_trust_analytics SET (security_invoker = true);

-- =====================================================
-- 8. VERIFICATION QUERY
-- =====================================================

DO $$
DECLARE
  v_total_entries INT;
  v_with_trust INT;
  v_backfilled INT;
BEGIN
  -- Count total food entries
  SELECT COUNT(*) INTO v_total_entries FROM public.food_entries;

  -- Count entries with trust data
  SELECT COUNT(*) INTO v_with_trust
  FROM public.food_entries
  WHERE trust_level IS NOT NULL;

  -- Count backfilled entries
  SELECT COUNT(*) INTO v_backfilled
  FROM public.food_entries
  WHERE trust_note LIKE '%Backfilled%';

  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ TRUST COLUMNS MIGRATION COMPLETE';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Migration Stats:';
  RAISE NOTICE '  Total food entries: %', v_total_entries;
  RAISE NOTICE '  Entries with trust data: % (%.1f%%)',
    v_with_trust,
    CASE WHEN v_total_entries > 0 THEN (v_with_trust::NUMERIC / v_total_entries * 100) ELSE 0 END;
  RAISE NOTICE '  Backfilled from legacy: %', v_backfilled;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Columns Added:';
  RAISE NOTICE '  - trust_level (verified, ai_guess, user_unverified, etc.)';
  RAISE NOTICE '  - trust_source (barcode, photo_ai, usda, manual, etc.)';
  RAISE NOTICE '  - trust_score (0-1 confidence)';
  RAISE NOTICE '  - trust_note (optional text)';
  RAISE NOTICE '  - ai_guess (JSONB for AI predictions)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Indexes Created:';
  RAISE NOTICE '  - idx_food_entries_trust_level';
  RAISE NOTICE '  - idx_food_entries_low_confidence';
  RAISE NOTICE '  - idx_food_entries_flagged';
  RAISE NOTICE '  - idx_food_entries_trust_source';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS Policies Updated';
  RAISE NOTICE '✅ Backfill Complete (legacy data migrated)';
  RAISE NOTICE '✅ Analytics View Created: food_trust_analytics';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test with:';
  RAISE NOTICE '  INSERT INTO food_entries (user_id, food_name, calories,';
  RAISE NOTICE '    trust_level, trust_source, trust_score)';
  RAISE NOTICE '  VALUES (auth.uid(), ''Apple'', 95, ''verified'', ''barcode'', 0.98);';
  RAISE NOTICE '';
  RAISE NOTICE '  SELECT * FROM food_trust_analytics WHERE user_id = auth.uid();';
  RAISE NOTICE '';
END $$;

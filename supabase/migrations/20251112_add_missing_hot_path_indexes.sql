-- =====================================================
-- MIGRATION: Add Missing Hot Path Indexes
-- =====================================================
-- Purpose: Add critical performance indexes for daily query hot paths
-- Date: 2025-11-12
-- Priority: P2 Performance
-- Target: < 50ms for typical daily queries on dev dataset
-- =====================================================

-- =====================================================
-- 1. WATER LOGS: Add logged_at DESC index
-- =====================================================
-- Missing from base tables migration, needed for get_today_activity_summary()

CREATE INDEX IF NOT EXISTS idx_water_logs_user_logged_at
  ON public.water_logs(user_id, logged_at DESC);

COMMENT ON INDEX idx_water_logs_user_logged_at IS
  'Optimizes daily water intake queries by user and timestamp (used in coach prompt)';

-- =====================================================
-- 2. BRAND ASSETS: Add asset_name lookup index
-- =====================================================
-- Critical for coach avatar and brand asset lookups

CREATE INDEX IF NOT EXISTS idx_brand_assets_asset_name
  ON public.brand_assets(asset_name);

COMMENT ON INDEX idx_brand_assets_asset_name IS
  'Optimizes coach selection and brand asset lookups by name';

-- =====================================================
-- 3. VERIFY EXISTING CRITICAL INDEXES
-- =====================================================

-- Verify food_entries hot path indexes exist
DO $$
BEGIN
  -- food_entries(user_id, consumed_at DESC)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'food_entries'
      AND indexname = 'idx_food_entries_consumed_at'
  ) THEN
    RAISE NOTICE '⚠️  Missing idx_food_entries_consumed_at - creating now';
    CREATE INDEX idx_food_entries_consumed_at
      ON public.food_entries(user_id, consumed_at DESC)
      WHERE consumed_at IS NOT NULL;
  END IF;

  -- fitness_logs(user_id, logged_at DESC) - should exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'fitness_logs'
      AND indexname = 'idx_fitness_logs_user_logged'
  ) THEN
    RAISE WARNING '⚠️  Missing idx_fitness_logs_user_logged';
  ELSE
    RAISE NOTICE '✅ fitness_logs hot path index exists';
  END IF;

  -- mood_check_ins(user_id, created_at DESC) - should exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'mood_check_ins'
      AND indexname = 'idx_mood_check_ins_user_created'
  ) THEN
    RAISE WARNING '⚠️  Missing idx_mood_check_ins_user_created';
  ELSE
    RAISE NOTICE '✅ mood_check_ins hot path index exists';
  END IF;

  -- cravings(user_id, created_at DESC) - should exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'cravings'
      AND indexname = 'idx_cravings_user_created'
  ) THEN
    RAISE WARNING '⚠️  Missing idx_cravings_user_created';
  ELSE
    RAISE NOTICE '✅ cravings hot path index exists';
  END IF;

  -- habit_completions(user_id, date) - should exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'habit_completions'
      AND indexname = 'idx_habit_completions_date'
  ) THEN
    RAISE WARNING '⚠️  Missing idx_habit_completions_date';
  ELSE
    RAISE NOTICE '✅ habit_completions hot path index exists';
  END IF;

  -- xp_award_history(user_id, awarded_at DESC) - should exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'xp_award_history'
      AND indexname = 'idx_xp_award_history_user_date'
  ) THEN
    RAISE WARNING '⚠️  Missing idx_xp_award_history_user_date';
  ELSE
    RAISE NOTICE '✅ xp_award_history hot path index exists';
  END IF;
END $$;

-- =====================================================
-- 4. ANALYZE TABLES FOR QUERY PLANNER
-- =====================================================

ANALYZE public.water_logs;
ANALYZE public.brand_assets;
ANALYZE public.food_entries;
ANALYZE public.fitness_logs;
ANALYZE public.mood_check_ins;
ANALYZE public.cravings;
ANALYZE public.habit_completions;
ANALYZE public.xp_award_history;

-- =====================================================
-- 5. SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ HOT PATH INDEXES ADDED';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Indexes Created:';
  RAISE NOTICE '  1. idx_water_logs_user_logged_at';
  RAISE NOTICE '  2. idx_brand_assets_asset_name';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tables Analyzed for Query Planner';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Performance Target: < 50ms for daily queries';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test Query Performance:';
  RAISE NOTICE '  EXPLAIN ANALYZE';
  RAISE NOTICE '  SELECT * FROM water_logs';
  RAISE NOTICE '  WHERE user_id = auth.uid()';
  RAISE NOTICE '    AND logged_at >= CURRENT_DATE';
  RAISE NOTICE '';
  RAISE NOTICE '  EXPLAIN ANALYZE';
  RAISE NOTICE '  SELECT * FROM brand_assets';
  RAISE NOTICE '  WHERE asset_name = ''kai_planner'';';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

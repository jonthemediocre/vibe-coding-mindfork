-- =====================================================
-- MIGRATION: Food Catalog Cache
-- =====================================================
-- Purpose: Cache nutrition data from external sources (USDA, OpenFoodFacts, barcode scans)
-- Date: 2025-11-12
-- Priority: P1 Critical
-- =====================================================

-- =====================================================
-- 1. FOOD CATALOG CACHE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.food_catalog_cache (
  upc TEXT PRIMARY KEY, -- UPC/EAN barcode or unique identifier

  -- Basic info
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,

  -- Serving info
  serving_size_g NUMERIC,
  serving_size_description TEXT, -- "1 cup", "100g", "1 medium apple"

  -- Nutrition data (complete payload)
  nutrition JSONB NOT NULL,

  -- Source tracking
  source TEXT NOT NULL,
  source_id TEXT, -- External ID (e.g., USDA FDC ID, OFF product ID)
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Data quality
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  -- Usage tracking
  times_accessed INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- Freshness
  last_verified_at TIMESTAMPTZ,
  data_version INT DEFAULT 1,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_source CHECK (
    source IN ('usda', 'openfoodfacts', 'manual', 'barcode_scan', 'ai_verified', 'user_contributed')
  )
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

-- Primary lookup by UPC (covered by PRIMARY KEY)

-- Search by name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_food_catalog_name
  ON public.food_catalog_cache USING GIN (to_tsvector('english', name));

-- Search by brand
CREATE INDEX IF NOT EXISTS idx_food_catalog_brand
  ON public.food_catalog_cache(brand)
  WHERE brand IS NOT NULL;

-- Find by source
CREATE INDEX IF NOT EXISTS idx_food_catalog_source
  ON public.food_catalog_cache(source, created_at DESC);

-- Find stale entries (need re-verification)
CREATE INDEX IF NOT EXISTS idx_food_catalog_stale
  ON public.food_catalog_cache(last_verified_at NULLS FIRST)
  WHERE last_verified_at < NOW() - INTERVAL '90 days' OR last_verified_at IS NULL;

-- Find popular items
CREATE INDEX IF NOT EXISTS idx_food_catalog_popular
  ON public.food_catalog_cache(times_accessed DESC, last_accessed_at DESC)
  WHERE times_accessed > 10;

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

ALTER TABLE public.food_catalog_cache ENABLE ROW LEVEL SECURITY;

-- Public read access (cache is shared across all users)
DROP POLICY IF EXISTS "Public read access to food catalog" ON public.food_catalog_cache;
CREATE POLICY "Public read access to food catalog"
  ON public.food_catalog_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role can manage catalog" ON public.food_catalog_cache;
CREATE POLICY "Service role can manage catalog"
  ON public.food_catalog_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can contribute (with approval)
DROP POLICY IF EXISTS "Users can contribute to catalog" ON public.food_catalog_cache;
CREATE POLICY "Users can contribute to catalog"
  ON public.food_catalog_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (source = 'user_contributed');

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_food_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_food_catalog_updated_at ON public.food_catalog_cache;
CREATE TRIGGER trigger_food_catalog_updated_at
  BEFORE UPDATE ON public.food_catalog_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_food_catalog_updated_at();

-- Auto-increment access count
CREATE OR REPLACE FUNCTION increment_food_catalog_access()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be called by the get_food_by_upc function
  -- Not as a row-level trigger to avoid overhead
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. UPSERT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION upsert_food_catalog(
  p_upc TEXT,
  p_name TEXT,
  p_brand TEXT DEFAULT NULL,
  p_serving_size_g NUMERIC DEFAULT NULL,
  p_nutrition JSONB DEFAULT NULL,
  p_source TEXT DEFAULT 'manual',
  p_source_id TEXT DEFAULT NULL,
  p_confidence_score NUMERIC DEFAULT 0.5
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_upc TEXT;
BEGIN
  -- Validate inputs
  IF p_upc IS NULL OR p_name IS NULL OR p_nutrition IS NULL THEN
    RAISE EXCEPTION 'upc, name, and nutrition are required';
  END IF;

  -- Upsert the catalog entry
  INSERT INTO public.food_catalog_cache (
    upc, name, brand, serving_size_g, nutrition,
    source, source_id, confidence_score
  )
  VALUES (
    p_upc, p_name, p_brand, p_serving_size_g, p_nutrition,
    p_source, p_source_id, p_confidence_score
  )
  ON CONFLICT (upc) DO UPDATE SET
    name = EXCLUDED.name,
    brand = COALESCE(EXCLUDED.brand, food_catalog_cache.brand),
    serving_size_g = COALESCE(EXCLUDED.serving_size_g, food_catalog_cache.serving_size_g),
    nutrition = EXCLUDED.nutrition,
    source = EXCLUDED.source,
    source_id = COALESCE(EXCLUDED.source_id, food_catalog_cache.source_id),
    confidence_score = EXCLUDED.confidence_score,
    data_version = food_catalog_cache.data_version + 1,
    updated_at = NOW()
  RETURNING upc INTO v_upc;

  -- Return the UPC as a pseudo-UUID (convert to UUID for consistency)
  RETURN gen_random_uuid(); -- Return success indicator
END;
$$;

COMMENT ON FUNCTION upsert_food_catalog IS
  'Insert or update food catalog entry by UPC. Returns success UUID.';

-- =====================================================
-- 6. GET FOOD BY UPC FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_food_by_upc(p_upc TEXT)
RETURNS TABLE (
  upc TEXT,
  name TEXT,
  brand TEXT,
  serving_size_g NUMERIC,
  nutrition JSONB,
  source TEXT,
  confidence_score NUMERIC,
  times_accessed INT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Increment access counter
  UPDATE public.food_catalog_cache
  SET
    times_accessed = times_accessed + 1,
    last_accessed_at = NOW()
  WHERE food_catalog_cache.upc = p_upc;

  -- Return the food data
  RETURN QUERY
  SELECT
    fc.upc,
    fc.name,
    fc.brand,
    fc.serving_size_g,
    fc.nutrition,
    fc.source,
    fc.confidence_score,
    fc.times_accessed
  FROM public.food_catalog_cache fc
  WHERE fc.upc = p_upc;
END;
$$;

COMMENT ON FUNCTION get_food_by_upc IS
  'Get food nutrition data by UPC. Increments access count.';

-- =====================================================
-- 7. SEARCH FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION search_food_catalog(
  p_search_term TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  upc TEXT,
  name TEXT,
  brand TEXT,
  serving_size_g NUMERIC,
  nutrition JSONB,
  source TEXT,
  confidence_score NUMERIC,
  relevance REAL
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.upc,
    fc.name,
    fc.brand,
    fc.serving_size_g,
    fc.nutrition,
    fc.source,
    fc.confidence_score,
    ts_rank(
      to_tsvector('english', fc.name || ' ' || COALESCE(fc.brand, '')),
      plainto_tsquery('english', p_search_term)
    ) AS relevance
  FROM public.food_catalog_cache fc
  WHERE to_tsvector('english', fc.name || ' ' || COALESCE(fc.brand, ''))
        @@ plainto_tsquery('english', p_search_term)
  ORDER BY relevance DESC, fc.times_accessed DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_food_catalog IS
  'Full-text search of food catalog by name and brand';

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION upsert_food_catalog TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_food_by_upc TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_food_catalog TO authenticated, service_role;

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON TABLE public.food_catalog_cache IS
  'Cached nutrition data from USDA, OpenFoodFacts, and barcode scans';

COMMENT ON COLUMN public.food_catalog_cache.upc IS
  'UPC/EAN barcode or unique identifier (primary key)';

COMMENT ON COLUMN public.food_catalog_cache.nutrition IS
  'JSONB: {calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, ...}';

COMMENT ON COLUMN public.food_catalog_cache.source IS
  'Data source: usda, openfoodfacts, manual, barcode_scan, ai_verified, user_contributed';

COMMENT ON COLUMN public.food_catalog_cache.confidence_score IS
  'How confident we are in this data (0-1). Higher = more reliable.';

COMMENT ON COLUMN public.food_catalog_cache.times_accessed IS
  'Number of times this item has been looked up (popularity metric)';

-- =====================================================
-- 10. SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ FOOD CATALOG CACHE CREATED';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Table Created: food_catalog_cache';
  RAISE NOTICE '  - Caches nutrition data from external sources';
  RAISE NOTICE '  - Shared across all users (public read)';
  RAISE NOTICE '  - Tracks usage and popularity';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Functions Created:';
  RAISE NOTICE '  1. upsert_food_catalog(upc, name, nutrition, ...)';
  RAISE NOTICE '  2. get_food_by_upc(upc) → nutrition data + increment access';
  RAISE NOTICE '  3. search_food_catalog(term) → full-text search';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS: Public read, service role full access';
  RAISE NOTICE '✅ Indexes: UPC (PK), name (GIN), brand, source, popularity';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test Commands:';
  RAISE NOTICE '  -- Add to cache';
  RAISE NOTICE '  SELECT upsert_food_catalog(';
  RAISE NOTICE '    ''012345678901'', ''Apple'', ''Granny Smith'', 182,';
  RAISE NOTICE '    ''{"calories": 95, "protein_g": 0.5, "carbs_g": 25}''::jsonb,';
  RAISE NOTICE '    ''usda'', ''123456'', 0.98';
  RAISE NOTICE '  );';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Lookup by UPC';
  RAISE NOTICE '  SELECT * FROM get_food_by_upc(''012345678901'');';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Search';
  RAISE NOTICE '  SELECT * FROM search_food_catalog(''apple'');';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

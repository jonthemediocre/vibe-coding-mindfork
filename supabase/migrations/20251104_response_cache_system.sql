-- =====================================================
-- DAY 1: AI RESPONSE CACHING SYSTEM
-- =====================================================
-- Purpose: Cache OpenAI responses to reduce costs and improve speed
-- Date: 2025-11-04
-- Expected Savings: 50-70% reduction in API calls
-- Interface Impact: ZERO (pure backend optimization)
-- =====================================================

-- =====================================================
-- 1. RESPONSE CACHE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache Key
  query_hash TEXT NOT NULL UNIQUE,

  -- Request Data
  query_text TEXT NOT NULL,
  coach_id TEXT,  -- Which coach persona was used
  mode TEXT,  -- 'default', 'roast', 'savage' (for future use)
  severity DECIMAL(2,1),  -- Severity level used (for future use)

  -- Response Data
  response_text TEXT NOT NULL,
  model_used TEXT DEFAULT 'gpt-4o',

  -- Cost Tracking
  tokens_used INT DEFAULT 0,
  cost_cents DECIMAL(10,4) DEFAULT 0.0,

  -- Performance Tracking
  hit_count INT DEFAULT 0,
  last_hit_at TIMESTAMPTZ,

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 2. INDEXES FOR FAST LOOKUPS
-- =====================================================

-- Primary cache lookup index
CREATE INDEX IF NOT EXISTS idx_ai_cache_query_hash
ON ai_response_cache(query_hash);

-- Active cache entries (not expired)
CREATE INDEX IF NOT EXISTS idx_ai_cache_active
ON ai_response_cache(expires_at)
WHERE expires_at > NOW();

-- Coach-specific cache analysis
CREATE INDEX IF NOT EXISTS idx_ai_cache_coach
ON ai_response_cache(coach_id)
WHERE coach_id IS NOT NULL;

-- Performance analysis (most hit cached queries)
CREATE INDEX IF NOT EXISTS idx_ai_cache_hit_count
ON ai_response_cache(hit_count DESC);

-- Cost analysis (most expensive queries)
CREATE INDEX IF NOT EXISTS idx_ai_cache_cost
ON ai_response_cache(cost_cents DESC);

-- =====================================================
-- 3. CACHE RETRIEVAL FUNCTION
-- =====================================================
-- Check if we have a cached response before calling OpenAI

CREATE OR REPLACE FUNCTION get_cached_response(
  p_query_text TEXT,
  p_coach_id TEXT DEFAULT NULL,
  p_mode TEXT DEFAULT 'default',
  p_severity DECIMAL DEFAULT 3.0
)
RETURNS TABLE (
  response_text TEXT,
  cache_hit BOOLEAN,
  tokens_saved INT,
  cost_saved_cents DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_cache_record RECORD;
BEGIN
  -- Generate cache key (query + coach + mode + severity)
  v_hash := MD5(
    p_query_text ||
    COALESCE(p_coach_id, 'default') ||
    COALESCE(p_mode, 'default') ||
    COALESCE(p_severity::TEXT, '3.0')
  );

  -- Try to find cached response
  SELECT
    arc.response_text,
    arc.tokens_used,
    arc.cost_cents
  INTO v_cache_record
  FROM ai_response_cache arc
  WHERE arc.query_hash = v_hash
    AND arc.expires_at > NOW();

  IF FOUND THEN
    -- Cache HIT - update stats
    UPDATE ai_response_cache
    SET
      hit_count = hit_count + 1,
      last_hit_at = NOW()
    WHERE query_hash = v_hash;

    -- Return cached response with savings info
    RETURN QUERY SELECT
      v_cache_record.response_text,
      TRUE as cache_hit,
      v_cache_record.tokens_used as tokens_saved,
      v_cache_record.cost_cents as cost_saved_cents;
  ELSE
    -- Cache MISS - return null
    RETURN QUERY SELECT
      NULL::TEXT as response_text,
      FALSE as cache_hit,
      0 as tokens_saved,
      0.0::DECIMAL as cost_saved_cents;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_cached_response IS 'Check cache before calling OpenAI. Returns cached response if available, null if cache miss.';

-- =====================================================
-- 4. CACHE STORAGE FUNCTION
-- =====================================================
-- Save OpenAI response to cache after API call

CREATE OR REPLACE FUNCTION cache_response(
  p_query_text TEXT,
  p_response_text TEXT,
  p_coach_id TEXT DEFAULT NULL,
  p_mode TEXT DEFAULT 'default',
  p_severity DECIMAL DEFAULT 3.0,
  p_model_used TEXT DEFAULT 'gpt-4o',
  p_tokens_used INT DEFAULT 0,
  p_cost_cents DECIMAL DEFAULT 0.0,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  -- Generate same cache key as get_cached_response
  v_hash := MD5(
    p_query_text ||
    COALESCE(p_coach_id, 'default') ||
    COALESCE(p_mode, 'default') ||
    COALESCE(p_severity::TEXT, '3.0')
  );

  -- Insert or update cache entry
  INSERT INTO ai_response_cache (
    query_hash,
    query_text,
    coach_id,
    mode,
    severity,
    response_text,
    model_used,
    tokens_used,
    cost_cents,
    metadata,
    hit_count,
    last_hit_at
  ) VALUES (
    v_hash,
    p_query_text,
    p_coach_id,
    p_mode,
    p_severity,
    p_response_text,
    p_model_used,
    p_tokens_used,
    p_cost_cents,
    p_metadata,
    0,  -- Initial hit count
    NULL  -- No hits yet
  )
  ON CONFLICT (query_hash) DO UPDATE
  SET
    response_text = EXCLUDED.response_text,  -- Update with latest response
    tokens_used = EXCLUDED.tokens_used,
    cost_cents = EXCLUDED.cost_cents,
    model_used = EXCLUDED.model_used,
    expires_at = NOW() + INTERVAL '7 days',  -- Refresh expiration
    metadata = EXCLUDED.metadata;
END;
$$;

COMMENT ON FUNCTION cache_response IS 'Save OpenAI response to cache. Call this after successful API response.';

-- =====================================================
-- 5. CACHE CLEANUP FUNCTION
-- =====================================================
-- Remove expired cache entries (run via cron)

CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TABLE (
  deleted_count BIGINT,
  tokens_freed INT,
  cost_freed_cents DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count BIGINT;
  v_tokens_freed INT;
  v_cost_freed DECIMAL;
BEGIN
  -- Calculate stats before deletion
  SELECT
    COUNT(*),
    COALESCE(SUM(tokens_used), 0),
    COALESCE(SUM(cost_cents), 0)
  INTO v_deleted_count, v_tokens_freed, v_cost_freed
  FROM ai_response_cache
  WHERE expires_at <= NOW();

  -- Delete expired entries
  DELETE FROM ai_response_cache
  WHERE expires_at <= NOW();

  -- Return cleanup stats
  RETURN QUERY SELECT
    v_deleted_count,
    v_tokens_freed,
    v_cost_freed;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_cache IS 'Remove expired cache entries. Run daily via cron job.';

-- =====================================================
-- 6. CACHE ANALYTICS VIEW
-- =====================================================
-- Monitor cache performance and cost savings

CREATE OR REPLACE VIEW cache_analytics AS
SELECT
  -- Overall Stats
  COUNT(*) as total_cached_queries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_cache_entries,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,

  -- Hit Stats
  COALESCE(SUM(hit_count), 0) as total_cache_hits,
  COALESCE(AVG(hit_count), 0) as avg_hits_per_entry,
  COALESCE(MAX(hit_count), 0) as max_hits_single_entry,

  -- Cost Savings
  COALESCE(SUM(hit_count * tokens_used), 0) as total_tokens_saved,
  COALESCE(SUM(hit_count * cost_cents), 0) as total_cost_saved_cents,

  -- Model Distribution
  JSONB_OBJECT_AGG(
    COALESCE(model_used, 'unknown'),
    COUNT(*)
  ) FILTER (WHERE model_used IS NOT NULL) as models_used,

  -- Coach Distribution
  JSONB_OBJECT_AGG(
    COALESCE(coach_id, 'default'),
    COUNT(*)
  ) FILTER (WHERE coach_id IS NOT NULL) as coaches_cached,

  -- Cache Health
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE hit_count > 0) / NULLIF(COUNT(*), 0),
    2
  ) as cache_utilization_pct,

  -- Recent Activity
  MAX(created_at) as last_cached_at,
  MAX(last_hit_at) as last_cache_hit_at
FROM ai_response_cache;

COMMENT ON VIEW cache_analytics IS 'Real-time cache performance metrics and cost savings analysis';

-- =====================================================
-- 7. COACH-SPECIFIC CACHE PERFORMANCE VIEW
-- =====================================================

CREATE OR REPLACE VIEW coach_cache_performance AS
SELECT
  COALESCE(coach_id, 'default') as coach,
  COUNT(*) as cached_queries,
  SUM(hit_count) as total_hits,
  ROUND(AVG(hit_count), 2) as avg_hits_per_query,
  SUM(hit_count * tokens_used) as tokens_saved,
  SUM(hit_count * cost_cents) as cost_saved_cents,
  ROUND(
    100.0 * SUM(hit_count * cost_cents) / NULLIF(SUM(cost_cents + (hit_count * cost_cents)), 0),
    2
  ) as cost_reduction_pct
FROM ai_response_cache
WHERE expires_at > NOW()
GROUP BY coach_id
ORDER BY cost_saved_cents DESC;

COMMENT ON VIEW coach_cache_performance IS 'Cache performance breakdown by coach persona';

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Cache functions need to be callable by Edge Functions (service_role)
GRANT EXECUTE ON FUNCTION get_cached_response TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION cache_response TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_cache TO service_role;

-- Views should be readable by service_role for monitoring
GRANT SELECT ON cache_analytics TO service_role;
GRANT SELECT ON coach_cache_performance TO service_role;

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Test cache functions work
DO $$
DECLARE
  v_cache_result RECORD;
BEGIN
  -- Test cache miss
  SELECT * INTO v_cache_result
  FROM get_cached_response('Test query', 'coach_decibel_avatar', 'default', 3.0);

  IF v_cache_result.cache_hit THEN
    RAISE EXCEPTION 'Cache should be empty - found unexpected hit';
  END IF;

  -- Test cache storage
  PERFORM cache_response(
    'Test query',
    'Test response',
    'coach_decibel_avatar',
    'default',
    3.0,
    'gpt-4o',
    100,
    0.15,
    '{"test": true}'::JSONB
  );

  -- Test cache hit
  SELECT * INTO v_cache_result
  FROM get_cached_response('Test query', 'coach_decibel_avatar', 'default', 3.0);

  IF NOT v_cache_result.cache_hit THEN
    RAISE EXCEPTION 'Cache should have hit after storage';
  END IF;

  RAISE NOTICE '✅ Cache system tests passed';
END $$;

-- Display cache analytics
SELECT * FROM cache_analytics;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ DAY 1 COMPLETE: AI Response Caching System';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Created:';
  RAISE NOTICE '  - ai_response_cache table';
  RAISE NOTICE '  - 5 performance indexes';
  RAISE NOTICE '  - get_cached_response() function';
  RAISE NOTICE '  - cache_response() function';
  RAISE NOTICE '  - cleanup_expired_cache() function';
  RAISE NOTICE '  - 2 analytics views';
  RAISE NOTICE '';
  RAISE NOTICE '💰 Expected Savings: 50-70% API cost reduction';
  RAISE NOTICE '⚡ Expected Speed: 10-100x faster for cached queries';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '  1. Update Edge Function to use get_cached_response()';
  RAISE NOTICE '  2. Call cache_response() after OpenAI responses';
  RAISE NOTICE '  3. Monitor cache_analytics view';
  RAISE NOTICE '  4. Set up daily cron for cleanup_expired_cache()';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

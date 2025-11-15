-- ============================================
-- VARIANT EXPANSION ANALYTICS
-- Identify which user permutations need custom variants
-- Week 3 planning: Data-driven variant prioritization
-- ============================================

-- ============================================
-- RPC FUNCTION: Get Underserved Segments
-- Finds user permutations stuck on 'standard' fallback with high user counts
-- ============================================

CREATE OR REPLACE FUNCTION get_underserved_segments()
RETURNS TABLE(
  user_permutation TEXT,
  unique_users BIGINT,
  total_interactions BIGINT,
  avg_session_mins DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cvt.user_permutation,
    COUNT(DISTINCT cvt.user_id)::BIGINT as unique_users,
    COUNT(*)::BIGINT as total_interactions,
    ROUND(AVG(
      EXTRACT(EPOCH FROM (cvt.created_at - LAG(cvt.created_at) OVER (PARTITION BY cvt.user_id ORDER BY cvt.created_at)))/60
    ), 2) as avg_session_mins
  FROM component_variant_telemetry cvt
  WHERE cvt.variant_id = 'standard'
    AND cvt.created_at > NOW() - INTERVAL '14 days'
    AND cvt.user_permutation != 'viral_share_event'
  GROUP BY cvt.user_permutation
  HAVING COUNT(DISTINCT cvt.user_id) > 100
  ORDER BY unique_users DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC FUNCTION: Compare Engagement
-- Compares engagement between fallback and personalized users
-- ============================================

CREATE OR REPLACE FUNCTION compare_engagement()
RETURNS TABLE(
  segment TEXT,
  users BIGINT,
  avg_sessions DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH fallback_engagement AS (
    SELECT
      COUNT(DISTINCT user_id)::BIGINT as users,
      AVG(session_count) as avg_sessions_per_user
    FROM (
      SELECT
        user_id,
        COUNT(*) as session_count
      FROM component_variant_telemetry
      WHERE variant_id = 'standard'
        AND created_at > NOW() - INTERVAL '14 days'
        AND component_id != 'viral_share'
      GROUP BY user_id
    ) sub
  ),
  personalized_engagement AS (
    SELECT
      COUNT(DISTINCT user_id)::BIGINT as users,
      AVG(session_count) as avg_sessions_per_user
    FROM (
      SELECT
        user_id,
        COUNT(*) as session_count
      FROM component_variant_telemetry
      WHERE variant_id != 'standard'
        AND created_at > NOW() - INTERVAL '14 days'
        AND component_id != 'viral_share'
      GROUP BY user_id
    ) sub
  )
  SELECT
    'Fallback Users'::TEXT as segment,
    f.users,
    ROUND(f.avg_sessions_per_user, 2) as avg_sessions
  FROM fallback_engagement f
  UNION ALL
  SELECT
    'Personalized Users'::TEXT as segment,
    p.users,
    ROUND(p.avg_sessions_per_user, 2) as avg_sessions
  FROM personalized_engagement p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC FUNCTION: Calculate Variant ROI
-- Calculates potential impact of building custom variants
-- ============================================

CREATE OR REPLACE FUNCTION calculate_variant_roi()
RETURNS TABLE(
  user_permutation TEXT,
  user_count BIGINT,
  current_engagement DECIMAL,
  potential_engagement DECIMAL,
  engagement_gap DECIMAL,
  total_impact_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH permutation_stats AS (
    SELECT
      cvt.user_permutation,
      COUNT(DISTINCT cvt.user_id)::BIGINT as user_count,
      AVG(interaction_count) as avg_interactions
    FROM (
      SELECT
        user_id,
        user_permutation,
        COUNT(*) as interaction_count
      FROM component_variant_telemetry
      WHERE variant_id = 'standard'
        AND created_at > NOW() - INTERVAL '14 days'
        AND component_id != 'viral_share'
      GROUP BY user_id, user_permutation
    ) sub
    GROUP BY sub.user_permutation
  ),
  benchmark AS (
    SELECT AVG(interaction_count) as avg_personalized_interactions
    FROM (
      SELECT
        user_id,
        COUNT(*) as interaction_count
      FROM component_variant_telemetry
      WHERE variant_id != 'standard'
        AND created_at > NOW() - INTERVAL '14 days'
        AND component_id != 'viral_share'
      GROUP BY user_id
    ) sub
  )
  SELECT
    ps.user_permutation,
    ps.user_count,
    ROUND(ps.avg_interactions, 2) as current_engagement,
    ROUND(b.avg_personalized_interactions, 2) as potential_engagement,
    ROUND(b.avg_personalized_interactions - ps.avg_interactions, 2) as engagement_gap,
    ROUND((b.avg_personalized_interactions - ps.avg_interactions) * ps.user_count, 0) as total_impact_score
  FROM permutation_stats ps
  CROSS JOIN benchmark b
  WHERE ps.user_count > 100
  ORDER BY total_impact_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC FUNCTION: Get Variant Performance
-- Shows which variants are performing best
-- ============================================

CREATE OR REPLACE FUNCTION get_variant_performance()
RETURNS TABLE(
  component_id TEXT,
  variant_id TEXT,
  unique_users BIGINT,
  total_views BIGINT,
  views_per_user DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cvt.component_id,
    cvt.variant_id,
    COUNT(DISTINCT cvt.user_id)::BIGINT as unique_users,
    COUNT(*)::BIGINT as total_views,
    ROUND(COUNT(*)::DECIMAL / COUNT(DISTINCT cvt.user_id), 2) as views_per_user
  FROM component_variant_telemetry cvt
  WHERE cvt.created_at > NOW() - INTERVAL '14 days'
    AND cvt.component_id != 'viral_share'
  GROUP BY cvt.component_id, cvt.variant_id
  ORDER BY views_per_user DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_underserved_segments() TO authenticated;
GRANT EXECUTE ON FUNCTION compare_engagement() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_variant_roi() TO authenticated;
GRANT EXECUTE ON FUNCTION get_variant_performance() TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test underserved segments
-- SELECT * FROM get_underserved_segments();

-- Test engagement comparison
-- SELECT * FROM compare_engagement();

-- Test variant ROI calculation
-- SELECT * FROM calculate_variant_roi();

-- Test variant performance
-- SELECT * FROM get_variant_performance();

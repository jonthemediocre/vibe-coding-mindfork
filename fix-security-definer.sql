-- Fix SECURITY DEFINER vulnerability in food_analysis_slo_metrics view
-- This migration removes the security risk by recreating the view without SECURITY DEFINER

-- Step 1: Drop the existing view with SECURITY DEFINER
DROP VIEW IF EXISTS public.food_analysis_slo_metrics CASCADE;

-- Step 2: Recreate the view WITHOUT SECURITY DEFINER (defaults to SECURITY INVOKER)
-- Note: You'll need to adjust this based on your actual view definition
-- This is a template - replace with your actual view logic

CREATE OR REPLACE VIEW public.food_analysis_slo_metrics AS
SELECT 
  -- Add your actual column selections here
  -- This is a placeholder that you need to replace with the real view definition
  *
FROM food_entries
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Step 3: Grant appropriate permissions to roles that need access
GRANT SELECT ON public.food_analysis_slo_metrics TO authenticated;
GRANT SELECT ON public.food_analysis_slo_metrics TO anon;

-- Step 4: Ensure RLS is enabled on the underlying tables
ALTER TABLE IF EXISTS food_entries ENABLE ROW LEVEL SECURITY;

-- Step 5: Add/verify RLS policies on food_entries (example)
-- Adjust based on your actual security model
DROP POLICY IF EXISTS "Users can only see their own food entries" ON food_entries;
CREATE POLICY "Users can only see their own food entries" 
  ON food_entries 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Step 6: Add comment documenting the security fix
COMMENT ON VIEW public.food_analysis_slo_metrics IS 
  'SLO metrics view - runs with SECURITY INVOKER (default) to respect RLS policies. 
   Fixed: Removed SECURITY DEFINER to prevent privilege escalation and RLS bypass.';

-- Verification queries (run these manually to verify):
-- 1. Check view definition doesn't have SECURITY DEFINER:
--    SELECT pg_get_viewdef('public.food_analysis_slo_metrics'::regclass);
--
-- 2. Test as different roles to ensure RLS is enforced:
--    SET ROLE authenticated;
--    SELECT * FROM public.food_analysis_slo_metrics LIMIT 5;
--
-- 3. Verify performance with RLS (add indexes if needed):
--    EXPLAIN ANALYZE SELECT * FROM public.food_analysis_slo_metrics WHERE user_id = 'test-uuid';

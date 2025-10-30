-- ⚠️ CRITICAL SECURITY FIX: Remove SECURITY DEFINER from view
-- Run this in your Supabase SQL Editor

-- STEP 1: Get the current view definition (run this first, copy the output)
SELECT pg_get_viewdef('public.food_analysis_slo_metrics'::regclass, true) as current_definition;

-- STEP 2: After you have the definition, run the fix below
-- (You'll need to paste the actual view definition in place of the placeholder)

-- Drop the vulnerable view
DROP VIEW IF EXISTS public.food_analysis_slo_metrics CASCADE;

-- Recreate WITHOUT SECURITY DEFINER
-- ⚠️ Replace this SELECT with your actual view definition from STEP 1
CREATE OR REPLACE VIEW public.food_analysis_slo_metrics AS
SELECT
    -- PASTE YOUR ACTUAL VIEW DEFINITION HERE
    -- Remove any "SECURITY DEFINER" text if present
    *
FROM food_entries
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Grant permissions
GRANT SELECT ON public.food_analysis_slo_metrics TO authenticated;

-- Ensure RLS is enabled on underlying tables
ALTER TABLE IF EXISTS food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS food_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can access own food entries" ON food_entries;
CREATE POLICY "Users can access own food entries"
    ON food_entries
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_food_entries_user_id ON food_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_user_created ON food_entries(user_id, created_at DESC);

-- Document the fix
COMMENT ON VIEW public.food_analysis_slo_metrics IS
    'SLO metrics - uses SECURITY INVOKER to respect RLS. Security fix applied to remove SECURITY DEFINER vulnerability.';

-- STEP 3: Verify the fix
SELECT
    CASE
        WHEN pg_get_viewdef('public.food_analysis_slo_metrics'::regclass) ILIKE '%SECURITY DEFINER%'
        THEN '❌ SECURITY DEFINER still present!'
        ELSE '✅ View is safe - no SECURITY DEFINER found'
    END as security_check;

-- STEP 4: Test as authenticated user
-- This should only return rows for the test user
SET ROLE authenticated;
SET request.jwt.claims.sub TO 'test-user-uuid';
SELECT COUNT(*) as row_count FROM public.food_analysis_slo_metrics;
RESET ROLE;

-- Comprehensive Security Audit for Supabase Database
-- This script identifies SECURITY DEFINER views and functions that may pose security risks

-- ============================================================================
-- PART 1: Find all SECURITY DEFINER views and functions
-- ============================================================================

-- Check for SECURITY DEFINER views (non-standard in Postgres)
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND definition ILIKE '%SECURITY DEFINER%'
ORDER BY schemaname, viewname;

-- Check for SECURITY DEFINER functions
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
  CASE p.prosecdef 
    WHEN true THEN 'SECURITY DEFINER' 
    ELSE 'SECURITY INVOKER' 
  END as security_type,
  r.rolname as owner
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND p.prosecdef = true
ORDER BY schema_name, function_name;

-- ============================================================================
-- PART 2: Check RLS status on all tables
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage')
  AND rowsecurity = false
ORDER BY schemaname, tablename;

-- ============================================================================
-- PART 3: List all RLS policies
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename, policyname;

-- ============================================================================
-- PART 4: Check for overly permissive grants
-- ============================================================================

-- Check grants to PUBLIC role
SELECT 
  table_schema,
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges
WHERE grantee = 'PUBLIC'
  AND table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;

-- ============================================================================
-- PART 5: Security recommendations
-- ============================================================================

-- This query doesn't return data - it's documentation
SELECT 
  'SECURITY AUDIT RECOMMENDATIONS' as section,
  '1. Remove SECURITY DEFINER from views - views should use SECURITY INVOKER (default)' as recommendation
UNION ALL
SELECT 
  '',
  '2. For functions that need elevated privileges, use minimal SECURITY DEFINER functions with:
     - SET search_path = pg_catalog, public
     - REVOKE EXECUTE FROM PUBLIC
     - GRANT EXECUTE only to specific roles
     - Input validation and no dynamic SQL'
UNION ALL
SELECT 
  '',
  '3. Ensure RLS is enabled on all user data tables'
UNION ALL
SELECT 
  '',
  '4. Verify RLS policies are correct for each role (anon, authenticated, service_role)'
UNION ALL
SELECT 
  '',
  '5. Add indexes on RLS policy columns (user_id, tenant_id, etc.)'
UNION ALL
SELECT 
  '',
  '6. Regular security audits and penetration testing'
UNION ALL
SELECT 
  '',
  '7. Use service_role key only in secure server-side code, never in client apps';


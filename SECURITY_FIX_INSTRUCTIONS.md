# 🔒 CRITICAL SECURITY FIX: SECURITY DEFINER Vulnerability

## Issue Summary

The view `public.food_analysis_slo_metrics` is using `SECURITY DEFINER`, which:
- ⚠️ **Bypasses Row Level Security (RLS)**
- ⚠️ **Allows privilege escalation** 
- ⚠️ **Exposes data beyond intended permissions**

## Immediate Actions Required

### Step 1: Audit Your Database (5 minutes)

Run the security audit to identify all SECURITY DEFINER issues:

```bash
# In your Supabase SQL Editor, run:
cat security-audit.sql
```

This will show:
- All SECURITY DEFINER views and functions
- Tables without RLS enabled
- All RLS policies
- Overly permissive grants

### Step 2: Get the Current View Definition (2 minutes)

In Supabase SQL Editor, run:

```sql
SELECT pg_get_viewdef('public.food_analysis_slo_metrics'::regclass, true);
```

Copy the output - you'll need it for Step 3.

### Step 3: Apply the Fix (10 minutes)

1. **Backup first** (in Supabase dashboard):
   - Go to Database → Backups
   - Create a manual backup before making changes

2. **Drop and recreate the view WITHOUT SECURITY DEFINER**:

```sql
-- Drop the vulnerable view
DROP VIEW IF EXISTS public.food_analysis_slo_metrics CASCADE;

-- Recreate with SECURITY INVOKER (default - safer)
CREATE OR REPLACE VIEW public.food_analysis_slo_metrics AS
-- PASTE YOUR VIEW DEFINITION HERE (from Step 2)
-- Remove any "SECURITY DEFINER" text if present
SELECT ...;  -- Your actual view logic

-- Grant permissions to appropriate roles
GRANT SELECT ON public.food_analysis_slo_metrics TO authenticated;

-- Add documentation
COMMENT ON VIEW public.food_analysis_slo_metrics IS 
  'SLO metrics - uses SECURITY INVOKER to respect RLS policies';
```

### Step 4: Ensure RLS is Properly Configured (10 minutes)

```sql
-- Enable RLS on underlying tables
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_analysis ENABLE ROW LEVEL SECURITY;

-- Create/verify RLS policies
-- Example: Users can only see their own data
DROP POLICY IF EXISTS "Users can only access own food data" ON food_entries;
CREATE POLICY "Users can only access own food data" 
  ON food_entries 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Add indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_food_entries_user_id ON food_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_food_analysis_user_id ON food_analysis(user_id);
```

### Step 5: Test the Fix (10 minutes)

```sql
-- Test 1: Verify no SECURITY DEFINER
SELECT pg_get_viewdef('public.food_analysis_slo_metrics'::regclass);
-- Should NOT contain "SECURITY DEFINER"

-- Test 2: Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claims.sub TO 'test-user-id';
SELECT * FROM public.food_analysis_slo_metrics LIMIT 5;
-- Should only see rows for that user

-- Test 3: Performance check
EXPLAIN ANALYZE 
SELECT * FROM public.food_analysis_slo_metrics 
WHERE user_id = 'test-user-id';
-- Should use index and be fast

-- Reset role
RESET ROLE;
```

### Step 6: Deploy and Monitor (ongoing)

1. **Deploy to production** (after testing in dev/staging)
2. **Monitor query performance** - watch for slow queries
3. **Review access logs** - check for anomalies
4. **Schedule regular security audits** - run `security-audit.sql` monthly

## Alternative: If You Need Elevated Access

If the view **truly needs** elevated privileges (rare), use this pattern instead:

```sql
-- Create a minimal SECURITY DEFINER function
CREATE OR REPLACE FUNCTION get_slo_metrics_internal()
RETURNS TABLE (...column definitions...)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Minimal, audited logic here
  -- Validate all inputs
  -- No dynamic SQL
  RETURN QUERY
  SELECT ... FROM food_entries ...;
END;
$$;

-- Lock down the function
REVOKE EXECUTE ON FUNCTION get_slo_metrics_internal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_slo_metrics_internal() TO authenticated;

-- Create an INVOKER view that calls the function
CREATE OR REPLACE VIEW public.food_analysis_slo_metrics AS
SELECT * FROM get_slo_metrics_internal();

GRANT SELECT ON public.food_analysis_slo_metrics TO authenticated;
```

## Validation Checklist

- [ ] Backed up database before changes
- [ ] Retrieved current view definition
- [ ] Dropped and recreated view without SECURITY DEFINER
- [ ] Verified RLS is enabled on underlying tables
- [ ] Created appropriate RLS policies
- [ ] Added indexes on RLS columns
- [ ] Tested as multiple roles (anon, authenticated)
- [ ] Verified no unexpected data exposure
- [ ] Checked query performance
- [ ] Documented the changes
- [ ] Scheduled regular security audits

## Need Help?

If you encounter issues:
1. Check Supabase logs for errors
2. Verify RLS policies match your security model
3. Test in development environment first
4. Consider consulting a database security expert for complex cases

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security Best Practices](https://www.postgresql.org/docs/current/ddl-priv.html)
- [OWASP Database Security](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html)

---

**Priority: CRITICAL** 🔴  
**Impact: High** - Potential data exposure and privilege escalation  
**Effort: Medium** - ~30-45 minutes with testing  
**Risk: Low** - Safe to fix with proper testing and backup

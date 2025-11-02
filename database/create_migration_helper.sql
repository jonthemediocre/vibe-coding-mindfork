-- This is a helper function that needs to be run FIRST in Supabase Dashboard
-- It allows us to execute migrations programmatically

CREATE OR REPLACE FUNCTION public.execute_migration_sql(migration_sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE migration_sql;
  RETURN json_build_object('success', true, 'message', 'Migration executed successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

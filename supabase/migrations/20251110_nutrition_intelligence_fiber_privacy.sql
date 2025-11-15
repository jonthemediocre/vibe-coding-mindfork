-- ============================================
-- Nutrition Intelligence Migration
-- Adds fiber tracking + privacy compliance fields
-- ============================================

-- 1. Add fiber column to food_entries (if not exists)
ALTER TABLE food_entries ADD COLUMN IF NOT EXISTS fiber NUMERIC DEFAULT 0;

-- 2. Add fiber column to meal_logs (if separate table exists)
-- Skipped: meal_logs table does not exist in current schema
-- ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS fiber NUMERIC DEFAULT 0;

-- 3. Create index for efficient fiber queries
CREATE INDEX IF NOT EXISTS idx_food_entries_fiber ON food_entries(fiber) WHERE fiber > 0;

-- 4. Add privacy compliance fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_consent_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_purposes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_deletion_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_deletion_requested_date TIMESTAMPTZ;

-- 5. Create data_access_log table for CHD compliance (WA/NV/CT laws)
CREATE TABLE IF NOT EXISTS public.data_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('read', 'write', 'delete', 'export')),
  data_category TEXT NOT NULL,
  accessed_by TEXT NOT NULL,
  vendor_name TEXT,
  purpose TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Index for auditing
CREATE INDEX IF NOT EXISTS idx_data_access_log_user_id ON data_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_log_timestamp ON data_access_log(timestamp DESC);

-- RLS Policies for data access log
ALTER TABLE data_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own access logs" ON data_access_log;
CREATE POLICY "Users can view their own access logs" ON data_access_log
  FOR SELECT USING (auth.uid() = user_id);

-- 6. Create function to log data access (for CHD compliance)
CREATE OR REPLACE FUNCTION log_data_access(
  p_user_id UUID,
  p_access_type TEXT,
  p_data_category TEXT,
  p_accessed_by TEXT,
  p_vendor_name TEXT DEFAULT NULL,
  p_purpose TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO data_access_log (
    user_id,
    access_type,
    data_category,
    accessed_by,
    vendor_name,
    purpose
  ) VALUES (
    p_user_id,
    p_access_type,
    p_data_category,
    p_accessed_by,
    p_vendor_name,
    p_purpose
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to handle data deletion requests (GDPR/CHD right to deletion)
CREATE OR REPLACE FUNCTION request_data_deletion(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Mark deletion request
  UPDATE profiles
  SET
    data_deletion_requested = TRUE,
    data_deletion_requested_date = NOW()
  WHERE user_id = p_user_id;

  -- Log the deletion request
  PERFORM log_data_access(
    p_user_id,
    'delete',
    'all',
    'user',
    NULL,
    'gdpr_deletion_request'
  );

  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'Data deletion request submitted. Your data will be deleted within 30 days.',
    'requested_at', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION log_data_access TO authenticated;
GRANT EXECUTE ON FUNCTION request_data_deletion TO authenticated;

-- 9. Update daily_summaries to include fiber
-- Skipped: daily_summaries table does not exist in current schema
-- ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS total_fiber NUMERIC DEFAULT 0;

-- 10. Create view for nutrition intelligence (satiety analysis)
CREATE OR REPLACE VIEW user_nutrition_with_satiety AS
SELECT
  fe.user_id,
  fe.meal_type,
  fe.logged_at::DATE as log_date,
  SUM(fe.calories) as total_calories,
  SUM(fe.protein) as total_protein,
  SUM(fe.carbs) as total_carbs,
  SUM(fe.fat) as total_fats,
  SUM(fe.fiber) as total_fiber,
  ROUND(
    (SUM(fe.protein) / NULLIF(SUM(fe.calories), 0) * 100 * 0.6) +
    (SUM(fe.fiber) / NULLIF(SUM(fe.calories), 0) * 100 * 0.4)
  ) as satiety_score,
  COUNT(*) as meal_count
FROM food_entries fe
WHERE fe.logged_at >= NOW() - INTERVAL '30 days'
GROUP BY fe.user_id, fe.meal_type, fe.logged_at::DATE;

-- Grant access to the view
GRANT SELECT ON user_nutrition_with_satiety TO authenticated;

-- ============================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================

-- Check if fiber column exists
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'food_entries' AND column_name = 'fiber';

-- Check if privacy fields exist
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- AND column_name IN ('data_consent_given', 'data_consent_date', 'data_purposes');

-- Check if data_access_log table exists
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'data_access_log';

-- Check if functions exist
-- SELECT routine_name
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN ('log_data_access', 'request_data_deletion');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

-- If all verification queries return results, migration succeeded!
-- You should see:
-- ✅ fiber column in food_entries
-- ✅ data_consent_given, data_consent_date, data_purposes in profiles
-- ✅ data_access_log table
-- ✅ log_data_access and request_data_deletion functions

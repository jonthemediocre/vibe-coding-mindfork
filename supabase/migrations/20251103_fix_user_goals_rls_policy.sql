-- =====================================================
-- FIX: USER GOALS RLS POLICY FOR INSERTS
-- =====================================================
-- Purpose: Add missing INSERT policy for user_goals table
-- Date: 2025-11-03
-- Issue: Row-level security violation on INSERT
-- =====================================================

-- Drop the existing incomplete policy
DROP POLICY IF EXISTS "Users can manage own goals" ON public.user_goals;

-- Create separate policies for better control
-- Policy 1: Allow users to insert their own goals
CREATE POLICY "Users can insert own goals"
  ON public.user_goals
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Allow users to select their own goals
CREATE POLICY "Users can view own goals"
  ON public.user_goals
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- Policy 3: Allow users to update their own goals
CREATE POLICY "Users can update own goals"
  ON public.user_goals
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Allow users to delete their own goals
CREATE POLICY "Users can delete own goals"
  ON public.user_goals
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Verify policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_goals'
ORDER BY policyname;

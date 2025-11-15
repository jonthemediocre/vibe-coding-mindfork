-- ============================================================================
-- Fix Multiple Missing Tables and Issues
-- Created: 2025-11-06
-- Purpose:
--   1. Create activity_logs table for fitness tracking
--   2. Add user_id column to recipes table
--   3. Fix challenge_participants infinite recursion RLS policy
-- ============================================================================

-- ============================================================================
-- 1. CREATE: activity_logs table
-- Purpose: Track user's fitness/exercise activities
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_name TEXT NOT NULL,
    category TEXT, -- 'cardio', 'strength', 'flexibility', 'sports', etc.
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    distance_km NUMERIC CHECK (distance_km >= 0),
    calories_burned INTEGER NOT NULL CHECK (calories_burned >= 0),
    notes TEXT,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_logged_at ON public.activity_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON public.activity_logs(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON public.activity_logs(category);

-- RLS Policies
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view own activity logs" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert own activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own activity logs" ON public.activity_logs;
CREATE POLICY "Users can update own activity logs" ON public.activity_logs
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own activity logs" ON public.activity_logs;
CREATE POLICY "Users can delete own activity logs" ON public.activity_logs
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_activity_logs_updated_at ON public.activity_logs;
CREATE TRIGGER set_activity_logs_updated_at
    BEFORE UPDATE ON public.activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.activity_logs IS 'User fitness and exercise activity tracking';

-- ============================================================================
-- 2. FIX: recipes table - Add user_id column
-- ============================================================================

-- Add user_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'recipes'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.recipes
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);

        RAISE NOTICE 'Added user_id column to recipes table';
    ELSE
        RAISE NOTICE 'user_id column already exists in recipes table';
    END IF;
END $$;

-- Update RLS policies for recipes to use user_id if needed
DROP POLICY IF EXISTS "Users can view own recipes" ON public.recipes;
CREATE POLICY "Users can view own recipes" ON public.recipes
    FOR SELECT USING (
        user_id IS NULL OR -- Public recipes
        auth.uid() = user_id -- Own recipes
    );

DROP POLICY IF EXISTS "Users can insert own recipes" ON public.recipes;
CREATE POLICY "Users can insert own recipes" ON public.recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recipes" ON public.recipes;
CREATE POLICY "Users can update own recipes" ON public.recipes
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recipes" ON public.recipes;
CREATE POLICY "Users can delete own recipes" ON public.recipes
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 3. FIX: challenge_participants infinite recursion RLS policy
-- Purpose: Fix error code 42P17 (infinite recursion in RLS policy)
-- ============================================================================

-- Drop all existing policies on challenge_participants
DROP POLICY IF EXISTS "Users can view own challenge participations" ON public.challenge_participants;
DROP POLICY IF EXISTS "Users can view challenge participants" ON public.challenge_participants;
DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
DROP POLICY IF EXISTS "Users can leave challenges" ON public.challenge_participants;
DROP POLICY IF EXISTS "challenge_participants_select_policy" ON public.challenge_participants;
DROP POLICY IF EXISTS "challenge_participants_insert_policy" ON public.challenge_participants;
DROP POLICY IF EXISTS "challenge_participants_delete_policy" ON public.challenge_participants;

-- Create simple, non-recursive policies
-- Policy 1: Users can view all participants in challenges they're part of
CREATE POLICY "Users can view challenge participants" ON public.challenge_participants
    FOR SELECT USING (
        -- User can see participants if they are a participant in the same challenge
        challenge_id IN (
            SELECT challenge_id
            FROM public.challenge_participants
            WHERE user_id = auth.uid()
        )
    );

-- Policy 2: Users can insert themselves into challenges
CREATE POLICY "Users can join challenges" ON public.challenge_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can delete their own participations
CREATE POLICY "Users can leave challenges" ON public.challenge_participants
    FOR DELETE USING (auth.uid() = user_id);

-- Note: No UPDATE policy needed - participations are insert/delete only

COMMENT ON TABLE public.challenge_participants IS 'Tracks which users are participating in which challenges';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's weekly activity summary
CREATE OR REPLACE FUNCTION public.get_weekly_activity_summary(
    p_user_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days'
)
RETURNS TABLE (
    total_activities INTEGER,
    total_minutes INTEGER,
    total_calories INTEGER,
    total_distance_km NUMERIC,
    activities_by_category JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_activities,
        SUM(duration_minutes)::INTEGER as total_minutes,
        SUM(calories_burned)::INTEGER as total_calories,
        SUM(distance_km)::NUMERIC as total_distance_km,
        JSONB_OBJECT_AGG(
            COALESCE(category, 'uncategorized'),
            activity_count
        ) as activities_by_category
    FROM (
        SELECT
            category,
            COUNT(*)::INTEGER as activity_count
        FROM public.activity_logs
        WHERE user_id = p_user_id
            AND logged_at >= p_start_date
        GROUP BY category
    ) cat_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_weekly_activity_summary IS 'Get user activity summary for the past week';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Check activity_logs table exists and has data
-- SELECT COUNT(*) FROM public.activity_logs;

-- Check recipes has user_id column
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'recipes' AND column_name = 'user_id';

-- Check challenge_participants policies
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'challenge_participants';

-- Test activity summary function
-- SELECT * FROM public.get_weekly_activity_summary(auth.uid());

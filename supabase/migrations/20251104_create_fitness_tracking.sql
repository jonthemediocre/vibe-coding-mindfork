-- =====================================================
-- Fitness Tracking Migration
-- Created: 2025-11-04
-- Description: Comprehensive fitness tracking schema
--              with activity logs and body measurements
-- =====================================================

-- =====================================================
-- TABLE: fitness_logs
-- Description: Tracks user fitness activities and workouts
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fitness_logs (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User relationship
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Activity details
    activity_type TEXT NOT NULL CHECK (
        activity_type IN (
            'walking',
            'running',
            'cycling',
            'weights',
            'yoga',
            'swimming',
            'other'
        )
    ),

    -- Workout metrics (all must be positive)
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    calories_burned INTEGER CHECK (calories_burned IS NULL OR calories_burned > 0),
    distance_km NUMERIC(10, 2) CHECK (distance_km IS NULL OR distance_km > 0),

    -- Additional context
    notes TEXT,

    -- Timestamps
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add helpful comment
COMMENT ON TABLE public.fitness_logs IS 'Stores user fitness activity logs including duration, calories, and distance';
COMMENT ON COLUMN public.fitness_logs.activity_type IS 'Type of fitness activity: walking, running, cycling, weights, yoga, swimming, or other';
COMMENT ON COLUMN public.fitness_logs.duration_minutes IS 'Duration of activity in minutes (must be positive)';
COMMENT ON COLUMN public.fitness_logs.calories_burned IS 'Estimated calories burned during activity (optional, must be positive)';
COMMENT ON COLUMN public.fitness_logs.distance_km IS 'Distance covered in kilometers (optional, must be positive)';
COMMENT ON COLUMN public.fitness_logs.logged_at IS 'Timestamp when the activity occurred (user-specified)';

-- =====================================================
-- TABLE: body_measurements
-- Description: Tracks user body measurements over time
-- =====================================================
CREATE TABLE IF NOT EXISTS public.body_measurements (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User relationship
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Body metrics (all must be positive)
    weight_kg NUMERIC(6, 2) CHECK (weight_kg IS NULL OR weight_kg > 0),
    body_fat_percentage NUMERIC(5, 2) CHECK (
        body_fat_percentage IS NULL OR
        (body_fat_percentage >= 0 AND body_fat_percentage <= 100)
    ),
    muscle_mass_kg NUMERIC(6, 2) CHECK (muscle_mass_kg IS NULL OR muscle_mass_kg > 0),
    waist_cm NUMERIC(6, 2) CHECK (waist_cm IS NULL OR waist_cm > 0),
    chest_cm NUMERIC(6, 2) CHECK (chest_cm IS NULL OR chest_cm > 0),

    -- Timestamps
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add helpful comments
COMMENT ON TABLE public.body_measurements IS 'Stores user body measurements over time for tracking physical progress';
COMMENT ON COLUMN public.body_measurements.weight_kg IS 'Body weight in kilograms (optional, must be positive)';
COMMENT ON COLUMN public.body_measurements.body_fat_percentage IS 'Body fat percentage (optional, must be between 0-100)';
COMMENT ON COLUMN public.body_measurements.muscle_mass_kg IS 'Muscle mass in kilograms (optional, must be positive)';
COMMENT ON COLUMN public.body_measurements.waist_cm IS 'Waist circumference in centimeters (optional, must be positive)';
COMMENT ON COLUMN public.body_measurements.chest_cm IS 'Chest circumference in centimeters (optional, must be positive)';
COMMENT ON COLUMN public.body_measurements.measured_at IS 'Timestamp when measurements were taken (user-specified)';

-- =====================================================
-- INDEXES: Performance optimization
-- =====================================================

-- Fitness logs indexes
CREATE INDEX idx_fitness_logs_user_id ON public.fitness_logs(user_id);
CREATE INDEX idx_fitness_logs_logged_at ON public.fitness_logs(logged_at DESC);
CREATE INDEX idx_fitness_logs_user_logged ON public.fitness_logs(user_id, logged_at DESC);
CREATE INDEX idx_fitness_logs_activity_type ON public.fitness_logs(activity_type);

-- Body measurements indexes
CREATE INDEX idx_body_measurements_user_id ON public.body_measurements(user_id);
CREATE INDEX idx_body_measurements_measured_at ON public.body_measurements(measured_at DESC);
CREATE INDEX idx_body_measurements_user_measured ON public.body_measurements(user_id, measured_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE public.fitness_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: fitness_logs
-- =====================================================

-- SELECT: Users can view their own fitness logs
CREATE POLICY "Users can view own fitness logs"
    ON public.fitness_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- INSERT: Users can create their own fitness logs
CREATE POLICY "Users can create own fitness logs"
    ON public.fitness_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own fitness logs
CREATE POLICY "Users can update own fitness logs"
    ON public.fitness_logs
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own fitness logs
CREATE POLICY "Users can delete own fitness logs"
    ON public.fitness_logs
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES: body_measurements
-- =====================================================

-- SELECT: Users can view their own body measurements
CREATE POLICY "Users can view own body measurements"
    ON public.body_measurements
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- INSERT: Users can create their own body measurements
CREATE POLICY "Users can create own body measurements"
    ON public.body_measurements
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own body measurements
CREATE POLICY "Users can update own body measurements"
    ON public.body_measurements
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own body measurements
CREATE POLICY "Users can delete own body measurements"
    ON public.body_measurements
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- GRANTS: Ensure authenticated users have access
-- =====================================================

-- Grant table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;

-- Grant sequence usage (for id generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Summary:
-- ✓ Created fitness_logs table with 7 activity types
-- ✓ Created body_measurements table with 5 metrics
-- ✓ Added CHECK constraints for data validation
-- ✓ Added foreign keys with CASCADE delete
-- ✓ Created performance indexes
-- ✓ Enabled Row Level Security
-- ✓ Created CRUD policies for both tables
-- ✓ Granted appropriate permissions
-- =====================================================

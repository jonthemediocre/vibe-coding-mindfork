-- ============================================================================
-- Create Base Tables (Must Run First)
-- Created: 2025-01-01 (Backdated to run before other migrations)
-- Purpose: Create all base tables that other migrations depend on
-- ============================================================================

-- Ensure set_updated_at function exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE: planned_meals
-- Purpose: Meal planning and scheduling
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.planned_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_name TEXT NOT NULL,
    meal_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'snack'
    planned_date DATE NOT NULL,
    planned_time TIME,
    notes TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planned_meals_user_id ON public.planned_meals(user_id);
CREATE INDEX IF NOT EXISTS idx_planned_meals_date ON public.planned_meals(planned_date);
CREATE INDEX IF NOT EXISTS idx_planned_meals_user_date ON public.planned_meals(user_id, planned_date);

ALTER TABLE public.planned_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own planned meals" ON public.planned_meals;
CREATE POLICY "Users can view own planned meals" ON public.planned_meals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own planned meals" ON public.planned_meals;
CREATE POLICY "Users can insert own planned meals" ON public.planned_meals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own planned meals" ON public.planned_meals;
CREATE POLICY "Users can update own planned meals" ON public.planned_meals
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own planned meals" ON public.planned_meals;
CREATE POLICY "Users can delete own planned meals" ON public.planned_meals
    FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_planned_meals_updated_at ON public.planned_meals;
CREATE TRIGGER set_planned_meals_updated_at
    BEFORE UPDATE ON public.planned_meals
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLE: water_logs
-- Purpose: Track user's daily water intake
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.water_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_id ON public.water_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_water_logs_date ON public.water_logs(date);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON public.water_logs(user_id, date);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own water logs" ON public.water_logs;
CREATE POLICY "Users can view own water logs" ON public.water_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own water logs" ON public.water_logs;
CREATE POLICY "Users can insert own water logs" ON public.water_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own water logs" ON public.water_logs;
CREATE POLICY "Users can update own water logs" ON public.water_logs
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own water logs" ON public.water_logs;
CREATE POLICY "Users can delete own water logs" ON public.water_logs
    FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_water_logs_updated_at ON public.water_logs;
CREATE TRIGGER set_water_logs_updated_at
    BEFORE UPDATE ON public.water_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLE: habits
-- Purpose: Define user habits and track their progress
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily',
    target_count INTEGER DEFAULT 1,
    reminder_time TIME,
    is_active BOOLEAN NOT NULL DEFAULT true,
    streak_count INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    total_completions INTEGER NOT NULL DEFAULT 0,
    last_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_is_active ON public.habits(is_active);
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON public.habits(user_id, is_active);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own habits" ON public.habits;
CREATE POLICY "Users can view own habits" ON public.habits
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own habits" ON public.habits;
CREATE POLICY "Users can insert own habits" ON public.habits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own habits" ON public.habits;
CREATE POLICY "Users can update own habits" ON public.habits
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own habits" ON public.habits;
CREATE POLICY "Users can delete own habits" ON public.habits
    FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_habits_updated_at ON public.habits;
CREATE TRIGGER set_habits_updated_at
    BEFORE UPDATE ON public.habits
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLE: habit_completions
-- Purpose: Track individual habit completion events
-- ============================================================================

-- Drop if exists with wrong schema
DROP TABLE IF EXISTS public.habit_completions CASCADE;

CREATE TABLE public.habit_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(habit_id, date)
);

CREATE INDEX idx_habit_completions_habit_id ON public.habit_completions(habit_id);
CREATE INDEX idx_habit_completions_user_id ON public.habit_completions(user_id);
CREATE INDEX idx_habit_completions_date ON public.habit_completions(date);

ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own habit completions" ON public.habit_completions;
CREATE POLICY "Users can view own habit completions" ON public.habit_completions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own habit completions" ON public.habit_completions;
CREATE POLICY "Users can insert own habit completions" ON public.habit_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own habit completions" ON public.habit_completions;
CREATE POLICY "Users can delete own habit completions" ON public.habit_completions
    FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.planned_meals IS 'User meal planning and scheduling';
COMMENT ON TABLE public.water_logs IS 'Daily water intake tracking';
COMMENT ON TABLE public.habits IS 'User-defined habits to track';
COMMENT ON TABLE public.habit_completions IS 'Individual habit completion events';

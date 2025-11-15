-- ================================================
-- CRITICAL: Core Profile Fields
-- Coach style, dietary preferences, health goals
-- ================================================

-- Add coach_style column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS coach_style TEXT DEFAULT 'balanced';

-- Add check constraint for valid coach styles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'coach_style_check'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT coach_style_check
    CHECK (coach_style IN ('gentle', 'balanced', 'savage', 'technical'));
  END IF;
END $$;

-- Add dietary_preferences array column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[] DEFAULT ARRAY['standard'];

-- Add health_goals array column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS health_goals TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add age and gender if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS age INTEGER;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Create index on user_id for faster profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

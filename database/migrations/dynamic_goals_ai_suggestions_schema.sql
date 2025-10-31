-- =====================================================
-- DYNAMIC GOALS & AI SUGGESTION SYSTEM
-- =====================================================
--
-- Sophisticated goal tracking with AI-powered suggestions
-- Behavior pattern detection and progressive goal unlocking
--
-- Features:
-- - 7 goal categories (weight, nutrition, fitness, habits, health, fasting, wellness)
-- - AI-detected behavior patterns (sedentary, low protein, late eating, etc.)
-- - Smart goal suggestions with confidence scores
-- - Progress tracking with streaks and milestones
-- - Points and gamification
-- - Goal notifications and celebrations
--
-- NON-DESTRUCTIVE: All additions, zero changes to existing tables
--
-- =====================================================

-- =====================================================
-- TABLE: goals
-- =====================================================
-- Core goal tracking table

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Goal details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'weight_management',
    'nutrition',
    'fitness',
    'habits',
    'health_metrics',
    'fasting',
    'mental_wellness'
  )),
  difficulty VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (difficulty IN (
    'easy', 'medium', 'hard', 'expert'
  )),

  -- Status and progress
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'completed', 'paused', 'failed', 'archived'
  )),
  progress FLOAT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_value FLOAT,        -- e.g., current weight, current steps
  target_value FLOAT,         -- e.g., target weight, target steps

  -- Frequency and duration
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (frequency IN (
    'daily', 'weekly', 'monthly', 'one_time', 'custom'
  )),
  frequency_count INTEGER DEFAULT 1,      -- e.g., 3 times per week
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  target_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,

  -- AI suggestion metadata
  is_ai_suggested BOOLEAN DEFAULT FALSE,
  suggestion_reason TEXT,
  unlocked_by UUID,                       -- Goal ID that unlocked this
  unlock_conditions TEXT[],               -- Array of conditions

  -- Tracking
  streak_days INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  times_completed INTEGER DEFAULT 0,     -- For recurring goals

  -- Rewards and motivation
  points_value INTEGER DEFAULT 10,
  celebration_message TEXT,

  -- Custom fields (flexible JSON)
  custom_data JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(category);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_is_ai_suggested ON goals(is_ai_suggested) WHERE is_ai_suggested = TRUE;

-- =====================================================
-- TABLE: goal_progress_entries
-- =====================================================
-- Individual progress tracking entries

CREATE TABLE IF NOT EXISTS goal_progress_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Progress data
  value FLOAT NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Source
  source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual', 'automatic', 'ai_detected'
  )),
  source_metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress_entries(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_user_id ON goal_progress_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_recorded_at ON goal_progress_entries(recorded_at DESC);

-- =====================================================
-- TABLE: user_behavior_patterns
-- =====================================================
-- AI-detected behavior patterns for goal suggestions

CREATE TABLE IF NOT EXISTS user_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pattern details
  pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN (
    'sedentary_detected',
    'good_nutrition_streak',
    'missing_macros',
    'consistent_logging',
    'low_protein',
    'high_sodium',
    'skipping_meals',
    'late_night_eating',
    'weekend_slipping',
    'fasting_ready',
    'plateau_detected'
  )),

  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')),

  -- Data that supports this pattern
  supporting_data JSONB NOT NULL,

  -- When detected
  first_detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  detection_count INTEGER DEFAULT 1,

  -- Has AI suggested a goal for this pattern?
  goal_suggested BOOLEAN DEFAULT FALSE,
  goal_suggestion_id UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_user_id ON user_behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_type ON user_behavior_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_suggested ON user_behavior_patterns(goal_suggested) WHERE goal_suggested = FALSE;

-- =====================================================
-- TABLE: goal_suggestions
-- =====================================================
-- AI-generated goal suggestions

CREATE TABLE IF NOT EXISTS goal_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Suggestion details
  suggested_goal JSONB NOT NULL,         -- Partial goal object
  reason TEXT NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 10),

  -- Context that led to suggestion
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
    'behavior_pattern',
    'achievement',
    'time_based',
    'health_risk'
  )),
  trigger_data JSONB,

  -- User interaction
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'dismissed', 'expired'
  )),
  presented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,

  -- Display
  notification_sent BOOLEAN DEFAULT FALSE,
  display_priority INTEGER NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goal_suggestions_user_id ON goal_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_suggestions_status ON goal_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_goal_suggestions_priority ON goal_suggestions(display_priority DESC);
CREATE INDEX IF NOT EXISTS idx_goal_suggestions_pending ON goal_suggestions(user_id, status) WHERE status = 'pending';

-- =====================================================
-- TABLE: goal_milestones
-- =====================================================
-- Achievement milestones for goals

CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Milestone details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  threshold FLOAT NOT NULL,              -- e.g., 50 for 50% progress

  -- Status
  achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMP WITH TIME ZONE,

  -- Reward
  points_awarded INTEGER DEFAULT 0,
  badge_id VARCHAR(50),
  celebration_shown BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_user_id ON goal_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_achieved ON goal_milestones(achieved) WHERE achieved = FALSE;

-- =====================================================
-- TABLE: goal_notifications
-- =====================================================
-- Notifications related to goals

CREATE TABLE IF NOT EXISTS goal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES goal_suggestions(id) ON DELETE CASCADE,

  -- Notification details
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'goal_unlocked',
    'goal_achieved',
    'milestone_reached',
    'streak_milestone',
    'suggestion_available',
    'goal_reminder',
    'goal_at_risk'
  )),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  action_label VARCHAR(50),
  action_route VARCHAR(200),

  -- Priority
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low', 'medium', 'high'
  )),

  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goal_notifications_user_id ON goal_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_notifications_read ON goal_notifications(read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_goal_notifications_priority ON goal_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_goal_notifications_created ON goal_notifications(created_at DESC);

-- =====================================================
-- TABLE: goal_templates
-- =====================================================
-- Predefined goal templates

CREATE TABLE IF NOT EXISTS goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) NOT NULL,

  title VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(50),

  -- Default values
  default_target_value FLOAT,
  default_frequency VARCHAR(20) NOT NULL,
  default_frequency_count INTEGER DEFAULT 1,

  -- Unlock conditions
  requires_goals UUID[],                 -- Template IDs that must be completed first
  min_days_active INTEGER,
  min_streak INTEGER,

  -- Tags for filtering
  tags TEXT[],

  -- Is this goal visible to all, or unlocked based on conditions?
  always_visible BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goal_templates_category ON goal_templates(category);
CREATE INDEX IF NOT EXISTS idx_goal_templates_difficulty ON goal_templates(difficulty);
CREATE INDEX IF NOT EXISTS idx_goal_templates_visible ON goal_templates(always_visible) WHERE always_visible = TRUE;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_templates ENABLE ROW LEVEL SECURITY;

-- Goals: Users can only see and manage their own goals
CREATE POLICY "goals_select_own" ON goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "goals_insert_own" ON goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update_own" ON goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_delete_own" ON goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Goal progress: Users can only see and manage their own progress
CREATE POLICY "goal_progress_select_own" ON goal_progress_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "goal_progress_insert_own" ON goal_progress_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Behavior patterns: Users can only see their own patterns
CREATE POLICY "behavior_patterns_select_own" ON user_behavior_patterns
  FOR SELECT
  USING (auth.uid() = user_id);

-- Goal suggestions: Users can only see their own suggestions
CREATE POLICY "goal_suggestions_select_own" ON goal_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "goal_suggestions_update_own" ON goal_suggestions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Goal milestones: Users can only see their own milestones
CREATE POLICY "goal_milestones_select_own" ON goal_milestones
  FOR SELECT
  USING (auth.uid() = user_id);

-- Goal notifications: Users can only see their own notifications
CREATE POLICY "goal_notifications_select_own" ON goal_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "goal_notifications_update_own" ON goal_notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Goal templates: Public read
CREATE POLICY "goal_templates_select_all" ON goal_templates
  FOR SELECT
  USING (true);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- FUNCTION: update_goal_progress
-- -----------------------------------------------------
-- Updates goal progress and calculates streaks

CREATE OR REPLACE FUNCTION update_goal_progress(
  p_goal_id UUID,
  p_value FLOAT,
  p_notes TEXT DEFAULT NULL,
  p_source VARCHAR(20) DEFAULT 'manual'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_target_value FLOAT;
  v_new_progress FLOAT;
BEGIN
  -- Get goal details
  SELECT user_id, target_value
  INTO v_user_id, v_target_value
  FROM goals
  WHERE id = p_goal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found';
  END IF;

  -- Insert progress entry
  INSERT INTO goal_progress_entries (goal_id, user_id, value, notes, source)
  VALUES (p_goal_id, v_user_id, p_value, p_notes, p_source);

  -- Calculate new progress
  IF v_target_value IS NOT NULL AND v_target_value > 0 THEN
    v_new_progress := LEAST(100, (p_value / v_target_value) * 100);
  ELSE
    v_new_progress := p_value;
  END IF;

  -- Update goal
  UPDATE goals
  SET
    current_value = p_value,
    progress = v_new_progress,
    updated_at = NOW(),
    last_checked_at = NOW()
  WHERE id = p_goal_id;

  -- Check for completion
  IF v_new_progress >= 100 THEN
    UPDATE goals
    SET
      status = 'completed',
      completed_date = NOW(),
      times_completed = times_completed + 1
    WHERE id = p_goal_id AND status = 'active';
  END IF;

END;
$$;

-- -----------------------------------------------------
-- FUNCTION: calculate_goal_streak
-- -----------------------------------------------------
-- Calculates current streak for a goal

CREATE OR REPLACE FUNCTION calculate_goal_streak(
  p_goal_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_streak INTEGER := 0;
  v_last_date DATE;
  v_current_date DATE;
  v_entry RECORD;
BEGIN
  v_current_date := CURRENT_DATE;

  -- Get progress entries in reverse chronological order
  FOR v_entry IN
    SELECT DATE(recorded_at) as entry_date
    FROM goal_progress_entries
    WHERE goal_id = p_goal_id
    ORDER BY recorded_at DESC
  LOOP
    -- Check if this entry is consecutive
    IF v_last_date IS NULL THEN
      -- First entry
      IF v_entry.entry_date = v_current_date OR v_entry.entry_date = v_current_date - 1 THEN
        v_streak := 1;
        v_last_date := v_entry.entry_date;
      ELSE
        -- Gap detected, streak broken
        EXIT;
      END IF;
    ELSE
      -- Check if consecutive day
      IF v_entry.entry_date = v_last_date - 1 THEN
        v_streak := v_streak + 1;
        v_last_date := v_entry.entry_date;
      ELSE
        -- Gap detected, streak broken
        EXIT;
      END IF;
    END IF;
  END LOOP;

  -- Update goal with new streak
  UPDATE goals
  SET
    streak_days = v_streak,
    best_streak = GREATEST(best_streak, v_streak)
  WHERE id = p_goal_id;

  RETURN v_streak;
END;
$$;

-- -----------------------------------------------------
-- FUNCTION: check_goal_milestones
-- -----------------------------------------------------
-- Checks and awards milestones for a goal

CREATE OR REPLACE FUNCTION check_goal_milestones(
  p_goal_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_progress FLOAT;
  v_streak INTEGER;
  v_user_id UUID;
  v_milestones_achieved INTEGER := 0;
BEGIN
  -- Get goal details
  SELECT progress, streak_days, user_id
  INTO v_progress, v_streak, v_user_id
  FROM goals
  WHERE id = p_goal_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Check progress milestones
  FOR i IN 25, 50, 75, 100 LOOP
    IF v_progress >= i THEN
      -- Check if milestone already achieved
      IF NOT EXISTS (
        SELECT 1 FROM goal_milestones
        WHERE goal_id = p_goal_id
        AND threshold = i
        AND achieved = TRUE
      ) THEN
        -- Award milestone
        INSERT INTO goal_milestones (goal_id, user_id, title, description, threshold, achieved, achieved_at, points_awarded)
        VALUES (
          p_goal_id,
          v_user_id,
          i || '% Complete',
          'Reached ' || i || '% progress on your goal',
          i,
          TRUE,
          NOW(),
          i / 10  -- 25% = 2.5 points, 100% = 10 points
        )
        ON CONFLICT DO NOTHING;

        v_milestones_achieved := v_milestones_achieved + 1;
      END IF;
    END IF;
  END LOOP;

  -- Check streak milestones
  FOR i IN 7, 14, 30, 60, 90 LOOP
    IF v_streak >= i THEN
      IF NOT EXISTS (
        SELECT 1 FROM goal_milestones
        WHERE goal_id = p_goal_id
        AND title = i || ' Day Streak'
        AND achieved = TRUE
      ) THEN
        INSERT INTO goal_milestones (goal_id, user_id, title, description, threshold, achieved, achieved_at, points_awarded)
        VALUES (
          p_goal_id,
          v_user_id,
          i || ' Day Streak',
          'Maintained a ' || i || ' day streak',
          i,
          TRUE,
          NOW(),
          i / 5  -- 7 days = 1.4 points, 90 days = 18 points
        )
        ON CONFLICT DO NOTHING;

        v_milestones_achieved := v_milestones_achieved + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_milestones_achieved;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- Auto-calculate streak after progress entry
CREATE OR REPLACE FUNCTION trigger_update_streak_on_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM calculate_goal_streak(NEW.goal_id);
  PERFORM check_goal_milestones(NEW.goal_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_streak_on_progress
AFTER INSERT ON goal_progress_entries
FOR EACH ROW
EXECUTE FUNCTION trigger_update_streak_on_progress();

-- =====================================================
-- VIEWS
-- =====================================================

-- -----------------------------------------------------
-- VIEW: user_goal_analytics
-- -----------------------------------------------------
-- Analytics summary per user

CREATE OR REPLACE VIEW user_goal_analytics AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE status = 'active') as active_goals,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_goals,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_goals,
  AVG(progress) FILTER (WHERE status = 'active') as avg_progress,
  MAX(streak_days) as longest_current_streak,
  MAX(best_streak) as longest_ever_streak,
  SUM(points_value) FILTER (WHERE status = 'completed') as total_points_earned,
  COUNT(DISTINCT category) as categories_active
FROM goals
GROUP BY user_id;

-- -----------------------------------------------------
-- VIEW: pending_goal_suggestions
-- -----------------------------------------------------
-- Pending suggestions not yet expired

CREATE OR REPLACE VIEW pending_goal_suggestions AS
SELECT
  gs.*,
  up.pattern_type,
  up.confidence as pattern_confidence
FROM goal_suggestions gs
LEFT JOIN user_behavior_patterns up ON up.goal_suggestion_id = gs.id
WHERE gs.status = 'pending'
AND (gs.expires_at IS NULL OR gs.expires_at > NOW())
ORDER BY gs.display_priority DESC, gs.created_at DESC;

-- =====================================================
-- SEED DATA (GOAL TEMPLATES)
-- =====================================================

-- Weight Management Templates
INSERT INTO goal_templates (category, difficulty, title, description, default_frequency, default_frequency_count, always_visible, tags)
VALUES
  ('weight_management', 'easy', 'Track Weight Daily', 'Weigh yourself every morning and log it', 'daily', 1, TRUE, ARRAY['tracking', 'consistency']),
  ('weight_management', 'medium', 'Lose 1 lb Per Week', 'Sustainable weight loss through calorie deficit', 'weekly', 1, TRUE, ARRAY['weight_loss', 'calories']),
  ('weight_management', 'hard', 'Reach Target Weight', 'Achieve your goal weight', 'one_time', 1, TRUE, ARRAY['weight_loss', 'milestone'])
ON CONFLICT DO NOTHING;

-- Nutrition Templates
INSERT INTO goal_templates (category, difficulty, title, description, default_frequency, default_frequency_count, always_visible, tags)
VALUES
  ('nutrition', 'easy', 'Log 3 Meals Daily', 'Track breakfast, lunch, and dinner every day', 'daily', 3, TRUE, ARRAY['tracking', 'consistency']),
  ('nutrition', 'medium', 'Hit Protein Target', 'Meet your daily protein goal', 'daily', 1, TRUE, ARRAY['macros', 'protein']),
  ('nutrition', 'hard', 'Master Macro Tracking', 'Hit all macro targets within 5g', 'daily', 1, FALSE, ARRAY['macros', 'advanced'])
ON CONFLICT DO NOTHING;

-- Fitness Templates
INSERT INTO goal_templates (category, difficulty, title, description, default_frequency, default_frequency_count, always_visible, tags)
VALUES
  ('fitness', 'easy', 'Walk 5,000 Steps', 'Get at least 5,000 steps per day', 'daily', 1, TRUE, ARRAY['steps', 'walking']),
  ('fitness', 'medium', 'Walk 10,000 Steps', 'Reach the gold standard of 10K steps', 'daily', 1, TRUE, ARRAY['steps', 'walking']),
  ('fitness', 'hard', 'Strength Train 3x/Week', 'Build muscle with resistance training', 'weekly', 3, TRUE, ARRAY['strength', 'muscle'])
ON CONFLICT DO NOTHING;

-- Habits Templates
INSERT INTO goal_templates (category, difficulty, title, description, default_frequency, default_frequency_count, always_visible, tags)
VALUES
  ('habits', 'easy', 'Drink 8 Glasses of Water', 'Stay hydrated throughout the day', 'daily', 1, TRUE, ARRAY['hydration', 'wellness']),
  ('habits', 'medium', 'Stop Eating by 8 PM', 'Finish dinner before 8pm for better sleep', 'daily', 1, TRUE, ARRAY['timing', 'sleep']),
  ('habits', 'medium', 'Meal Prep on Sundays', 'Prepare meals for the week ahead', 'weekly', 1, TRUE, ARRAY['planning', 'consistency'])
ON CONFLICT DO NOTHING;

-- Fasting Templates
INSERT INTO goal_templates (category, difficulty, title, description, default_frequency, default_frequency_count, always_visible, tags)
VALUES
  ('fasting', 'easy', '12:12 Fasting Window', 'Fast for 12 hours overnight', 'daily', 1, TRUE, ARRAY['fasting', 'beginner']),
  ('fasting', 'medium', '16:8 Intermittent Fasting', 'Fast for 16 hours, eat within 8 hours', 'daily', 1, TRUE, ARRAY['fasting', 'intermediate']),
  ('fasting', 'hard', '20:4 Warrior Diet', 'Fast for 20 hours with 4-hour eating window', 'daily', 1, FALSE, ARRAY['fasting', 'advanced'])
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE goals IS 'User goals with progress tracking, streaks, and rewards';
COMMENT ON TABLE goal_progress_entries IS 'Individual progress entries for goals';
COMMENT ON TABLE user_behavior_patterns IS 'AI-detected behavior patterns for smart goal suggestions';
COMMENT ON TABLE goal_suggestions IS 'AI-generated goal suggestions based on user behavior';
COMMENT ON TABLE goal_milestones IS 'Achievement milestones and rewards for goals';
COMMENT ON TABLE goal_notifications IS 'Goal-related notifications and alerts';
COMMENT ON TABLE goal_templates IS 'Predefined goal templates for easy goal creation';

COMMENT ON FUNCTION update_goal_progress IS 'Updates goal progress and checks for completion';
COMMENT ON FUNCTION calculate_goal_streak IS 'Calculates current and best streak for a goal';
COMMENT ON FUNCTION check_goal_milestones IS 'Checks and awards milestones based on progress and streaks';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

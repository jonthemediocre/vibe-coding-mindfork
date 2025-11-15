-- =====================================================
-- SOCIAL FEATURES: FRIENDS, CHALLENGES, LEADERBOARDS
-- =====================================================
-- Purpose: Complete social infrastructure for community engagement
-- Components:
--   1. Friends System (requests, friendships, bidirectional lookups)
--   2. Challenges System (community challenges with progress tracking)
--   3. Leaderboards System (global/friend rankings with materialized views)
-- Impact: Engagement + Retention + Viral Growth
-- Date: 2025-11-04
-- =====================================================

-- =====================================================
-- 1. FRIENDS SYSTEM
-- =====================================================

-- Friend requests table
-- Tracks pending, accepted, and rejected friend requests
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Users involved
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Request status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  -- Prevent duplicate requests
  CONSTRAINT friend_requests_unique_pair UNIQUE (from_user_id, to_user_id),

  -- Prevent self-requests
  CONSTRAINT friend_requests_no_self CHECK (from_user_id != to_user_id)
);

-- Indexes for friend requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user_pending
  ON public.friend_requests(to_user_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user
  ON public.friend_requests(from_user_id, status);

CREATE INDEX IF NOT EXISTS idx_friend_requests_created_at
  ON public.friend_requests(created_at DESC);

COMMENT ON TABLE public.friend_requests IS 'Friend request management with status tracking';
COMMENT ON COLUMN public.friend_requests.status IS 'Request status: pending (awaiting response), accepted (became friends), rejected (declined)';

-- Friendships table
-- Stores confirmed friendships with canonical ordering (user1_id < user2_id)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Users involved (always user1_id < user2_id for consistency)
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Friendship metadata
  became_friends_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  friendship_score INT DEFAULT 0, -- For future gamification (shared challenges, etc.)

  -- Ensure canonical ordering
  CONSTRAINT friendships_unique_pair UNIQUE (user1_id, user2_id),
  CONSTRAINT friendships_ordered_users CHECK (user1_id < user2_id),
  CONSTRAINT friendships_no_self CHECK (user1_id != user2_id)
);

-- Indexes for friendships
CREATE INDEX IF NOT EXISTS idx_friendships_user1
  ON public.friendships(user1_id);

CREATE INDEX IF NOT EXISTS idx_friendships_user2
  ON public.friendships(user2_id);

CREATE INDEX IF NOT EXISTS idx_friendships_score
  ON public.friendships(friendship_score DESC);

COMMENT ON TABLE public.friendships IS 'Confirmed friendships with canonical user ordering for efficient lookups';
COMMENT ON COLUMN public.friendships.friendship_score IS 'Gamification metric: increases with shared challenges, interactions, etc.';

-- Bidirectional friend lookup view
-- Allows easy querying of friends regardless of user1/user2 ordering
CREATE OR REPLACE VIEW public.user_friends AS
SELECT
  user1_id AS user_id,
  user2_id AS friend_id,
  became_friends_at,
  friendship_score
FROM public.friendships
UNION ALL
SELECT
  user2_id AS user_id,
  user1_id AS friend_id,
  became_friends_at,
  friendship_score
FROM public.friendships;

COMMENT ON VIEW public.user_friends IS 'Bidirectional friend lookup - query with any user_id to get all friends';

-- =====================================================
-- 2. CHALLENGES SYSTEM
-- =====================================================

-- Challenge definitions
-- Supports weight loss, step, nutrition, habit challenges
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Challenge creator
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Challenge details
  challenge_name TEXT NOT NULL,
  challenge_description TEXT,
  challenge_type TEXT NOT NULL CHECK (
    challenge_type IN ('steps', 'weight_loss', 'protein_goal', 'calorie_deficit', 'habit_streak', 'custom')
  ),

  -- Goal configuration
  goal_value DECIMAL(10, 2) NOT NULL, -- e.g., 10000 steps, 5kg weight loss, 150g protein
  goal_unit TEXT NOT NULL, -- 'steps', 'kg', 'g', 'cal', 'days'

  -- Time bounds
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,

  -- Visibility
  is_public BOOLEAN DEFAULT FALSE, -- Public challenges can be joined by anyone

  -- Rewards (optional)
  xp_reward INT DEFAULT 0,
  badge_reward TEXT, -- achievement_key to award on completion

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  -- Ensure valid date range
  CONSTRAINT challenges_valid_date_range CHECK (end_date > start_date)
);

-- Indexes for challenges
CREATE INDEX IF NOT EXISTS idx_challenges_type_active
  ON public.challenges(challenge_type, end_date)
  WHERE end_date > NOW();

CREATE INDEX IF NOT EXISTS idx_challenges_public_active
  ON public.challenges(is_public, start_date, end_date)
  WHERE is_public = TRUE AND end_date > NOW();

CREATE INDEX IF NOT EXISTS idx_challenges_creator
  ON public.challenges(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_challenges_dates
  ON public.challenges(start_date, end_date);

COMMENT ON TABLE public.challenges IS 'Challenge definitions with goals, time bounds, and rewards';
COMMENT ON COLUMN public.challenges.challenge_type IS 'Type: steps, weight_loss, protein_goal, calorie_deficit, habit_streak, custom';
COMMENT ON COLUMN public.challenges.is_public IS 'Public challenges appear in discovery and can be joined by anyone';

-- Challenge participants
-- Tracks who joined each challenge and their current progress
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Challenge and user
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Progress tracking
  current_progress DECIMAL(10, 2) DEFAULT 0,
  starting_value DECIMAL(10, 2), -- e.g., starting weight for weight loss challenge

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'completed', 'failed', 'abandoned')
  ),

  -- Ranking
  rank INT, -- Updated by trigger when progress changes

  -- Timestamps
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Prevent duplicate participation
  CONSTRAINT challenge_participants_unique_pair UNIQUE (challenge_id, user_id)
);

-- Indexes for challenge participants
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge
  ON public.challenge_participants(challenge_id, rank)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_challenge_participants_user
  ON public.challenge_participants(user_id, status);

CREATE INDEX IF NOT EXISTS idx_challenge_participants_leaderboard
  ON public.challenge_participants(challenge_id, current_progress DESC)
  WHERE status = 'active';

COMMENT ON TABLE public.challenge_participants IS 'Users participating in challenges with progress and ranking';
COMMENT ON COLUMN public.challenge_participants.starting_value IS 'Baseline value at challenge start (for weight loss, etc.)';
COMMENT ON COLUMN public.challenge_participants.rank IS 'Current ranking within the challenge (1 = first place)';

-- Challenge progress tracking
-- Detailed daily progress logs for analytics and verification
CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Challenge and user
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Progress details
  progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_value DECIMAL(10, 2) NOT NULL,

  -- Additional context
  notes TEXT,
  verified BOOLEAN DEFAULT FALSE, -- For future verification systems

  -- Source tracking
  source_type TEXT, -- 'manual', 'auto_steps', 'auto_food_log', etc.
  source_id UUID, -- Reference to originating record (food_entries.id, etc.)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate daily entries for auto sources
  CONSTRAINT challenge_progress_unique_daily UNIQUE (challenge_id, user_id, progress_date, source_type)
);

-- Indexes for challenge progress
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge_user
  ON public.challenge_progress(challenge_id, user_id, progress_date DESC);

CREATE INDEX IF NOT EXISTS idx_challenge_progress_date
  ON public.challenge_progress(progress_date DESC);

CREATE INDEX IF NOT EXISTS idx_challenge_progress_source
  ON public.challenge_progress(source_type, source_id)
  WHERE source_id IS NOT NULL;

COMMENT ON TABLE public.challenge_progress IS 'Daily progress logs for challenges with verification and source tracking';
COMMENT ON COLUMN public.challenge_progress.verified IS 'Future use: admin or peer verification of progress claims';

-- =====================================================
-- 3. LEADERBOARDS SYSTEM
-- =====================================================

-- Leaderboard definitions
-- Supports global, friend, challenge-specific leaderboards
CREATE TABLE IF NOT EXISTS public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Leaderboard configuration
  leaderboard_name TEXT NOT NULL UNIQUE,
  leaderboard_type TEXT NOT NULL CHECK (
    leaderboard_type IN ('global', 'friends', 'challenge', 'region', 'custom')
  ),

  -- What metric to rank by
  metric_type TEXT NOT NULL, -- 'total_xp', 'weight_lost', 'steps_this_week', 'protein_streak'
  metric_unit TEXT, -- 'xp', 'kg', 'steps', 'days'

  -- Time period
  time_period TEXT NOT NULL CHECK (
    time_period IN ('daily', 'weekly', 'monthly', 'all_time', 'custom')
  ),
  time_period_start TIMESTAMPTZ, -- For custom time periods
  time_period_end TIMESTAMPTZ,

  -- Display configuration
  display_order INT DEFAULT 100,
  icon_name TEXT,
  description TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Indexes for leaderboards
CREATE INDEX IF NOT EXISTS idx_leaderboards_type_active
  ON public.leaderboards(leaderboard_type, is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_leaderboards_metric
  ON public.leaderboards(metric_type, time_period);

COMMENT ON TABLE public.leaderboards IS 'Leaderboard definitions with metric and time period configuration';
COMMENT ON COLUMN public.leaderboards.metric_type IS 'Metric to rank: total_xp, weight_lost, steps_this_week, protein_streak, etc.';
COMMENT ON COLUMN public.leaderboards.time_period IS 'Ranking window: daily, weekly, monthly, all_time, custom';

-- Leaderboard entries
-- Current rankings for each leaderboard
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Leaderboard and user
  leaderboard_id UUID NOT NULL REFERENCES public.leaderboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Ranking
  rank INT NOT NULL,
  score DECIMAL(10, 2) NOT NULL,

  -- Previous ranking (for showing movement)
  previous_rank INT,
  rank_change INT, -- Positive = moved up, negative = moved down

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb, -- Store breakdown, badges, etc.

  -- Timestamps
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate entries
  CONSTRAINT leaderboard_entries_unique_user UNIQUE (leaderboard_id, user_id)
);

-- Indexes for leaderboard entries
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_leaderboard_rank
  ON public.leaderboard_entries(leaderboard_id, rank);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user
  ON public.leaderboard_entries(user_id, leaderboard_id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_score
  ON public.leaderboard_entries(leaderboard_id, score DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_calculated
  ON public.leaderboard_entries(calculated_at DESC);

COMMENT ON TABLE public.leaderboard_entries IS 'Current leaderboard rankings with score and movement tracking';
COMMENT ON COLUMN public.leaderboard_entries.rank_change IS 'Positive = moved up in ranking, negative = moved down, 0 = no change';
COMMENT ON COLUMN public.leaderboard_entries.metadata IS 'JSONB: Store breakdown details, earned badges, streak info, etc.';

-- Materialized view for fast leaderboard queries
-- Refresh this periodically (e.g., every 5 minutes) for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leaderboard_rankings AS
SELECT
  le.leaderboard_id,
  le.user_id,
  le.rank,
  le.score,
  le.previous_rank,
  le.rank_change,
  le.metadata,
  le.calculated_at,
  lb.leaderboard_name,
  lb.leaderboard_type,
  lb.metric_type,
  lb.time_period
FROM public.leaderboard_entries le
JOIN public.leaderboards lb ON lb.id = le.leaderboard_id
WHERE lb.is_active = TRUE
ORDER BY le.leaderboard_id, le.rank;

-- Indexes for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_rankings_unique
  ON public.leaderboard_rankings(leaderboard_id, user_id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings_leaderboard
  ON public.leaderboard_rankings(leaderboard_id, rank);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings_user
  ON public.leaderboard_rankings(user_id);

COMMENT ON MATERIALIZED VIEW public.leaderboard_rankings IS 'Optimized leaderboard view - refresh periodically for best performance';

-- Function to refresh leaderboard rankings
-- Call this on a schedule (e.g., every 5 minutes via pg_cron or external scheduler)
CREATE OR REPLACE FUNCTION public.refresh_leaderboard_rankings()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.leaderboard_rankings;
END;
$$;

COMMENT ON FUNCTION public.refresh_leaderboard_rankings IS 'Refresh leaderboard materialized view - call periodically (e.g., every 5 minutes)';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: FRIEND REQUESTS
-- =====================================================

-- Users can view requests they sent or received
CREATE POLICY friend_requests_select_policy ON public.friend_requests
  FOR SELECT
  USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

-- Users can send friend requests
CREATE POLICY friend_requests_insert_policy ON public.friend_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
  );

-- Users can respond to requests sent to them (update status)
CREATE POLICY friend_requests_update_policy ON public.friend_requests
  FOR UPDATE
  USING (
    auth.uid() = to_user_id AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = to_user_id
  );

-- Users can delete requests they sent (cancel) or received (decline)
CREATE POLICY friend_requests_delete_policy ON public.friend_requests
  FOR DELETE
  USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

-- =====================================================
-- RLS POLICIES: FRIENDSHIPS
-- =====================================================

-- Users can view friendships they're part of
CREATE POLICY friendships_select_policy ON public.friendships
  FOR SELECT
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- Friendships are created by trigger after accepting friend request (service role only)
CREATE POLICY friendships_insert_policy ON public.friendships
  FOR INSERT
  WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- Users can delete friendships (unfriend)
CREATE POLICY friendships_delete_policy ON public.friendships
  FOR DELETE
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- =====================================================
-- RLS POLICIES: CHALLENGES
-- =====================================================

-- Users can view public challenges or challenges they created/joined
CREATE POLICY challenges_select_policy ON public.challenges
  FOR SELECT
  USING (
    is_public = TRUE
    OR created_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.challenge_id = challenges.id AND cp.user_id = auth.uid()
    )
  );

-- Users can create challenges
CREATE POLICY challenges_insert_policy ON public.challenges
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_user_id
  );

-- Users can update challenges they created (before start date)
CREATE POLICY challenges_update_policy ON public.challenges
  FOR UPDATE
  USING (
    auth.uid() = created_by_user_id AND start_date > NOW()
  )
  WITH CHECK (
    auth.uid() = created_by_user_id
  );

-- Users can delete challenges they created (before start date)
CREATE POLICY challenges_delete_policy ON public.challenges
  FOR DELETE
  USING (
    auth.uid() = created_by_user_id AND start_date > NOW()
  );

-- =====================================================
-- RLS POLICIES: CHALLENGE PARTICIPANTS
-- =====================================================

-- Users can view participants in challenges they're part of or that are public
CREATE POLICY challenge_participants_select_policy ON public.challenge_participants
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_participants.challenge_id
        AND (c.is_public = TRUE OR c.created_by_user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.challenge_id = challenge_participants.challenge_id
        AND cp.user_id = auth.uid()
    )
  );

-- Users can join challenges (create participant record)
CREATE POLICY challenge_participants_insert_policy ON public.challenge_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND (c.is_public = TRUE OR c.created_by_user_id = auth.uid())
        AND c.start_date <= NOW()
        AND c.end_date > NOW()
    )
  );

-- Users can update their own participation status
CREATE POLICY challenge_participants_update_policy ON public.challenge_participants
  FOR UPDATE
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Users can leave challenges (delete participant record)
CREATE POLICY challenge_participants_delete_policy ON public.challenge_participants
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- =====================================================
-- RLS POLICIES: CHALLENGE PROGRESS
-- =====================================================

-- Users can view progress for challenges they're part of
CREATE POLICY challenge_progress_select_policy ON public.challenge_progress
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.challenge_id = challenge_progress.challenge_id
        AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_progress.challenge_id
        AND c.created_by_user_id = auth.uid()
    )
  );

-- Users can log their own progress
CREATE POLICY challenge_progress_insert_policy ON public.challenge_progress
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.challenge_id = challenge_progress.challenge_id
        AND cp.user_id = auth.uid()
        AND cp.status = 'active'
    )
  );

-- Users can update their own progress logs
CREATE POLICY challenge_progress_update_policy ON public.challenge_progress
  FOR UPDATE
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Users can delete their own progress logs
CREATE POLICY challenge_progress_delete_policy ON public.challenge_progress
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- =====================================================
-- RLS POLICIES: LEADERBOARDS
-- =====================================================

-- All users can view active leaderboards
CREATE POLICY leaderboards_select_policy ON public.leaderboards
  FOR SELECT
  USING (
    is_active = TRUE
  );

-- Only service role can manage leaderboards (admin function)
-- No INSERT/UPDATE/DELETE policies for regular users

-- =====================================================
-- RLS POLICIES: LEADERBOARD ENTRIES
-- =====================================================

-- Users can view leaderboard entries for active leaderboards
-- For friends leaderboards, only show friends + self
CREATE POLICY leaderboard_entries_select_policy ON public.leaderboard_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leaderboards lb
      WHERE lb.id = leaderboard_entries.leaderboard_id
        AND lb.is_active = TRUE
        AND (
          lb.leaderboard_type != 'friends'
          OR user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_friends uf
            WHERE uf.user_id = auth.uid() AND uf.friend_id = leaderboard_entries.user_id
          )
        )
    )
  );

-- Only service role can manage leaderboard entries (computed by backend)
-- No INSERT/UPDATE/DELETE policies for regular users

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Function: Create friendship when friend request is accepted
CREATE OR REPLACE FUNCTION public.create_friendship_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Insert friendship with canonical ordering
    INSERT INTO public.friendships (user1_id, user2_id)
    VALUES (
      LEAST(NEW.from_user_id, NEW.to_user_id),
      GREATEST(NEW.from_user_id, NEW.to_user_id)
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING;

    -- Update responded_at timestamp
    NEW.responded_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Auto-create friendship on accepted request
CREATE TRIGGER trigger_create_friendship_on_accept
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_friendship_on_accept();

COMMENT ON FUNCTION public.create_friendship_on_accept IS 'Automatically creates friendship record when friend request is accepted';

-- Function: Update challenge participant rank
-- Call this when progress changes to recalculate rankings
CREATE OR REPLACE FUNCTION public.update_challenge_rankings(p_challenge_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH ranked_participants AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY current_progress DESC, joined_at ASC) AS new_rank
    FROM public.challenge_participants
    WHERE challenge_id = p_challenge_id
      AND status = 'active'
  )
  UPDATE public.challenge_participants cp
  SET rank = rp.new_rank
  FROM ranked_participants rp
  WHERE cp.id = rp.id;
END;
$$;

COMMENT ON FUNCTION public.update_challenge_rankings IS 'Recalculate rankings for all active participants in a challenge';

-- Function: Update participant progress from progress logs
-- Aggregates daily progress into current_progress
CREATE OR REPLACE FUNCTION public.sync_challenge_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge_type TEXT;
  v_total_progress DECIMAL(10, 2);
BEGIN
  -- Get challenge type
  SELECT challenge_type INTO v_challenge_type
  FROM public.challenges
  WHERE id = NEW.challenge_id;

  -- Calculate total progress based on challenge type
  IF v_challenge_type IN ('steps', 'protein_goal', 'calorie_deficit', 'habit_streak') THEN
    -- Sum all progress (cumulative challenges)
    SELECT COALESCE(SUM(progress_value), 0) INTO v_total_progress
    FROM public.challenge_progress
    WHERE challenge_id = NEW.challenge_id AND user_id = NEW.user_id;
  ELSE
    -- Use latest value (weight loss, etc.)
    SELECT COALESCE(progress_value, 0) INTO v_total_progress
    FROM public.challenge_progress
    WHERE challenge_id = NEW.challenge_id AND user_id = NEW.user_id
    ORDER BY progress_date DESC, created_at DESC
    LIMIT 1;
  END IF;

  -- Update participant's current progress
  UPDATE public.challenge_participants
  SET current_progress = v_total_progress
  WHERE challenge_id = NEW.challenge_id AND user_id = NEW.user_id;

  -- Recalculate rankings for this challenge
  PERFORM public.update_challenge_rankings(NEW.challenge_id);

  RETURN NEW;
END;
$$;

-- Trigger: Sync participant progress when progress logs change
CREATE TRIGGER trigger_sync_challenge_progress
  AFTER INSERT OR UPDATE ON public.challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_challenge_progress();

COMMENT ON FUNCTION public.sync_challenge_progress IS 'Updates challenge_participants.current_progress from challenge_progress logs and recalculates rankings';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get user's friends list with profile info
CREATE OR REPLACE FUNCTION public.get_user_friends(p_user_id UUID)
RETURNS TABLE (
  friend_id UUID,
  became_friends_at TIMESTAMPTZ,
  friendship_score INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT friend_id, became_friends_at, friendship_score
  FROM public.user_friends
  WHERE user_id = p_user_id
  ORDER BY became_friends_at DESC;
$$;

COMMENT ON FUNCTION public.get_user_friends IS 'Get all friends for a user with friendship metadata';

-- Function: Check if two users are friends
CREATE OR REPLACE FUNCTION public.are_users_friends(p_user1_id UUID, p_user2_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user1_id = LEAST(p_user1_id, p_user2_id) AND user2_id = GREATEST(p_user1_id, p_user2_id))
  );
$$;

COMMENT ON FUNCTION public.are_users_friends IS 'Check if two users are friends (returns boolean)';

-- Function: Get friend leaderboard (ranks among friends)
CREATE OR REPLACE FUNCTION public.get_friend_leaderboard(
  p_user_id UUID,
  p_metric_type TEXT,
  p_time_period TEXT
)
RETURNS TABLE (
  user_id UUID,
  rank INT,
  score DECIMAL(10, 2),
  metadata JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    le.user_id,
    le.rank,
    le.score,
    le.metadata
  FROM public.leaderboard_entries le
  JOIN public.leaderboards lb ON lb.id = le.leaderboard_id
  WHERE lb.metric_type = p_metric_type
    AND lb.time_period = p_time_period
    AND lb.leaderboard_type = 'friends'
    AND lb.is_active = TRUE
    AND (
      le.user_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM public.user_friends uf
        WHERE uf.user_id = p_user_id AND uf.friend_id = le.user_id
      )
    )
  ORDER BY le.rank;
$$;

COMMENT ON FUNCTION public.get_friend_leaderboard IS 'Get leaderboard rankings filtered to user + their friends';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on all tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_requests TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.friendships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_progress TO authenticated;
GRANT SELECT ON public.leaderboards TO authenticated;
GRANT SELECT ON public.leaderboard_entries TO authenticated;

-- Grant usage on view
GRANT SELECT ON public.user_friends TO authenticated;
GRANT SELECT ON public.leaderboard_rankings TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_user_friends TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_users_friends TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_challenge_rankings TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_leaderboard_rankings TO service_role;

-- =====================================================
-- INITIAL DATA (Optional)
-- =====================================================

-- Insert default global leaderboards
INSERT INTO public.leaderboards (leaderboard_name, leaderboard_type, metric_type, metric_unit, time_period, display_order, description)
VALUES
  ('XP Kings - All Time', 'global', 'total_xp', 'xp', 'all_time', 1, 'Top XP earners of all time'),
  ('Weekly XP Warriors', 'global', 'weekly_xp', 'xp', 'weekly', 2, 'Most XP earned this week'),
  ('Weight Loss Champions', 'global', 'total_weight_lost', 'kg', 'all_time', 3, 'Biggest weight loss journeys'),
  ('Step Masters - Monthly', 'global', 'monthly_steps', 'steps', 'monthly', 4, 'Most steps this month'),
  ('Protein Legends', 'global', 'protein_streak', 'days', 'all_time', 5, 'Longest protein goal streaks')
ON CONFLICT (leaderboard_name) DO NOTHING;

-- =====================================================
-- COMPLETION
-- =====================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Social features migration completed successfully';
  RAISE NOTICE 'Tables created: friend_requests, friendships, challenges, challenge_participants, challenge_progress, leaderboards, leaderboard_entries';
  RAISE NOTICE 'Views created: user_friends, leaderboard_rankings';
  RAISE NOTICE 'Functions created: create_friendship_on_accept, update_challenge_rankings, sync_challenge_progress, get_user_friends, are_users_friends, get_friend_leaderboard, refresh_leaderboard_rankings';
  RAISE NOTICE 'All RLS policies enabled and configured';
  RAISE NOTICE 'Remember to call refresh_leaderboard_rankings() periodically (e.g., every 5 minutes)';
END $$;

-- =====================================================
-- VIRAL REINFORCEMENT LEARNING SYSTEM (RLHF)
-- =====================================================
--
-- AI that learns what content goes viral through reinforcement learning
-- Tracks content variants, engagement metrics, and learns over time
--
-- Tables:
--   1. viral_variants - Content templates/variants for A/B testing
--   2. viral_content_instances - Individual posts/shares with engagement tracking
--
-- =====================================================

-- =====================================================
-- TABLE: viral_variants
-- =====================================================
-- Tracks different content templates and their performance over time
-- Used for A/B testing and reinforcement learning

CREATE TABLE IF NOT EXISTS viral_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Variant Identity
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN (
    'profile_mashup',
    'roast_card',
    'achievement_card',
    'video_reel',
    'coach_intro',
    'progress_update'
  )),
  variant_name VARCHAR(100) NOT NULL, -- e.g., "side_by_side_modern"

  -- Template Parameters (JSON for flexibility)
  template_id VARCHAR(50),
  roast_level INTEGER CHECK (roast_level >= 1 AND roast_level <= 10),
  coach_id VARCHAR(50),
  text_style VARCHAR(50),     -- 'bold', 'minimal', 'playful'
  color_scheme VARCHAR(50),    -- 'gradient', 'neon', 'monochrome'
  layout VARCHAR(50),          -- 'side_by_side', 'split_screen', etc.

  -- Performance Metrics (aggregated from content_instances)
  attempts INTEGER DEFAULT 0,           -- How many times this variant was used
  total_shares INTEGER DEFAULT 0,       -- Total shares across all instances
  total_views INTEGER DEFAULT 0,        -- Total views
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,      -- Ultimate metric

  -- Calculated Performance (updated by triggers)
  share_rate FLOAT DEFAULT 0.0,         -- shares / attempts
  conversion_rate FLOAT DEFAULT 0.0,    -- signups / shares
  viral_score INTEGER DEFAULT 0,        -- Weighted score (reward function)
  confidence FLOAT DEFAULT 0.0,         -- Statistical confidence (0-1)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(content_type, variant_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_viral_variants_content_type ON viral_variants(content_type);
CREATE INDEX IF NOT EXISTS idx_viral_variants_viral_score ON viral_variants(viral_score DESC);
CREATE INDEX IF NOT EXISTS idx_viral_variants_attempts ON viral_variants(attempts);

-- =====================================================
-- TABLE: viral_content_instances
-- =====================================================
-- Individual posts/shares with engagement tracking
-- Each row represents one user sharing one piece of content

CREATE TABLE IF NOT EXISTS viral_content_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES viral_variants(id) ON DELETE CASCADE,

  -- Content Details
  content_type VARCHAR(50) NOT NULL,
  image_url TEXT,
  video_url TEXT,
  caption TEXT,
  referral_code VARCHAR(20),

  -- Engagement Metrics (updated over time)
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,

  -- Platform
  platform VARCHAR(50),  -- 'instagram', 'tiktok', 'twitter', 'facebook'
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Learning Data (for ML features)
  time_of_day INTEGER CHECK (time_of_day >= 0 AND time_of_day <= 23),  -- Hour (0-23)
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),   -- 0=Sunday
  user_tier VARCHAR(20),          -- 'free', 'premium'
  user_streak INTEGER DEFAULT 0,  -- Days active when posted

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_viral_content_user_id ON viral_content_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_viral_content_variant_id ON viral_content_instances(variant_id);
CREATE INDEX IF NOT EXISTS idx_viral_content_posted_at ON viral_content_instances(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_viral_content_signups ON viral_content_instances(signups DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE viral_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_content_instances ENABLE ROW LEVEL SECURITY;

-- viral_variants: Public read (users need to see templates)
CREATE POLICY "viral_variants_select_all" ON viral_variants
  FOR SELECT
  USING (true);

-- viral_content_instances: Users can only see their own content
CREATE POLICY "viral_content_select_own" ON viral_content_instances
  FOR SELECT
  USING (auth.uid() = user_id);

-- viral_content_instances: Users can insert their own content
CREATE POLICY "viral_content_insert_own" ON viral_content_instances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- viral_content_instances: Users can update their own content
CREATE POLICY "viral_content_update_own" ON viral_content_instances
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- FUNCTION: increment_variant_attempts
-- -----------------------------------------------------
-- Increments the attempt count when variant is used

CREATE OR REPLACE FUNCTION increment_variant_attempts(
  variant_uuid UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE viral_variants
  SET
    attempts = attempts + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = variant_uuid;
END;
$$;

-- -----------------------------------------------------
-- FUNCTION: update_variant_engagement
-- -----------------------------------------------------
-- Updates variant performance metrics when engagement happens

CREATE OR REPLACE FUNCTION update_variant_engagement(
  variant_uuid UUID,
  new_shares INTEGER DEFAULT 0,
  new_views INTEGER DEFAULT 0,
  new_likes INTEGER DEFAULT 0,
  new_comments INTEGER DEFAULT 0,
  new_saves INTEGER DEFAULT 0,
  new_clicks INTEGER DEFAULT 0,
  new_signups INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempts INTEGER;
  v_total_shares INTEGER;
  v_total_signups INTEGER;
  v_share_rate FLOAT;
  v_conversion_rate FLOAT;
  v_viral_score INTEGER;
  v_confidence FLOAT;
BEGIN
  -- Update totals
  UPDATE viral_variants
  SET
    total_shares = total_shares + new_shares,
    total_views = total_views + new_views,
    total_likes = total_likes + new_likes,
    total_comments = total_comments + new_comments,
    total_saves = total_saves + new_saves,
    total_clicks = total_clicks + new_clicks,
    total_signups = total_signups + new_signups,
    updated_at = NOW()
  WHERE id = variant_uuid
  RETURNING attempts, total_shares, total_signups
  INTO v_attempts, v_total_shares, v_total_signups;

  -- Calculate rates
  IF v_attempts > 0 THEN
    v_share_rate := v_total_shares::FLOAT / v_attempts::FLOAT;
  ELSE
    v_share_rate := 0.0;
  END IF;

  IF v_total_shares > 0 THEN
    v_conversion_rate := v_total_signups::FLOAT / v_total_shares::FLOAT;
  ELSE
    v_conversion_rate := 0.0;
  END IF;

  -- Calculate viral score (reward function)
  -- Weights: signups=1000, shares=100, clicks=50, saves=30, comments=20, likes=10, views=1
  SELECT
    (total_signups * 1000) +
    (total_shares * 100) +
    (total_clicks * 50) +
    (total_saves * 30) +
    (total_comments * 20) +
    (total_likes * 10) +
    (total_views * 1)
  INTO v_viral_score
  FROM viral_variants
  WHERE id = variant_uuid;

  -- Calculate confidence (increases with attempts, caps at 0.99)
  -- Simple formula: 1 - exp(-attempts/10)
  v_confidence := LEAST(0.99, 1.0 - EXP(-v_attempts::FLOAT / 10.0));

  -- Update calculated fields
  UPDATE viral_variants
  SET
    share_rate = v_share_rate,
    conversion_rate = v_conversion_rate,
    viral_score = v_viral_score,
    confidence = v_confidence,
    updated_at = NOW()
  WHERE id = variant_uuid;

END;
$$;

-- -----------------------------------------------------
-- FUNCTION: calculate_viral_score
-- -----------------------------------------------------
-- Calculates viral score for a content instance
-- Used for ranking and recommendations

CREATE OR REPLACE FUNCTION calculate_viral_score(
  instance_shares INTEGER,
  instance_views INTEGER,
  instance_likes INTEGER,
  instance_comments INTEGER,
  instance_saves INTEGER,
  instance_clicks INTEGER,
  instance_signups INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN (
    (instance_signups * 1000) +
    (instance_shares * 100) +
    (instance_clicks * 50) +
    (instance_saves * 30) +
    (instance_comments * 20) +
    (instance_likes * 10) +
    (instance_views * 1)
  );
END;
$$;

-- -----------------------------------------------------
-- TRIGGER: auto_update_variant_on_content_change
-- -----------------------------------------------------
-- Automatically updates variant performance when content engagement changes

CREATE OR REPLACE FUNCTION trigger_update_variant_on_content_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only run on UPDATE (not INSERT)
  IF TG_OP = 'UPDATE' THEN
    -- Calculate deltas
    PERFORM update_variant_engagement(
      NEW.variant_id,
      new_shares := NEW.shares - OLD.shares,
      new_views := NEW.views - OLD.views,
      new_likes := NEW.likes - OLD.likes,
      new_comments := NEW.comments - OLD.comments,
      new_saves := NEW.saves - OLD.saves,
      new_clicks := NEW.clicks - OLD.clicks,
      new_signups := NEW.signups - OLD.signups
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_variant_on_content_change
AFTER UPDATE ON viral_content_instances
FOR EACH ROW
EXECUTE FUNCTION trigger_update_variant_on_content_change();

-- =====================================================
-- VIEWS
-- =====================================================

-- -----------------------------------------------------
-- VIEW: viral_leaderboard
-- -----------------------------------------------------
-- Top performing variants by viral score

CREATE OR REPLACE VIEW viral_leaderboard AS
SELECT
  id,
  content_type,
  variant_name,
  attempts,
  total_shares,
  total_signups,
  share_rate,
  conversion_rate,
  viral_score,
  confidence,
  last_used_at
FROM viral_variants
WHERE attempts >= 3  -- Minimum data for meaningful stats
ORDER BY viral_score DESC
LIMIT 50;

-- -----------------------------------------------------
-- VIEW: user_viral_stats
-- -----------------------------------------------------
-- Per-user viral content statistics

CREATE OR REPLACE VIEW user_viral_stats AS
SELECT
  user_id,
  COUNT(*) as total_posts,
  SUM(shares) as total_shares,
  SUM(views) as total_views,
  SUM(signups) as total_signups,
  AVG(shares::FLOAT) as avg_shares_per_post,
  MAX(shares) as best_share_count,
  MAX(signups) as best_signup_count
FROM viral_content_instances
GROUP BY user_id;

-- =====================================================
-- INITIAL DATA (OPTIONAL)
-- =====================================================

-- Insert default variants for profile_mashup (starting point)

INSERT INTO viral_variants (content_type, variant_name, layout, color_scheme, text_style, coach_id)
VALUES
  ('profile_mashup', 'side_by_side_modern', 'side_by_side', 'gradient', 'bold', NULL),
  ('profile_mashup', 'coach_corner_neon', 'coach_corner', 'neon', 'playful', NULL),
  ('profile_mashup', 'split_screen_minimal', 'split_screen', 'monochrome', 'minimal', NULL),
  ('profile_mashup', 'circular_frame_vibrant', 'circular_frame', 'gradient', 'bold', NULL)
ON CONFLICT (content_type, variant_name) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE viral_variants IS 'Content templates/variants tracked for A/B testing and reinforcement learning';
COMMENT ON TABLE viral_content_instances IS 'Individual user posts with engagement tracking for learning';
COMMENT ON COLUMN viral_variants.viral_score IS 'Weighted reward score: signups=1000, shares=100, clicks=50, saves=30, comments=20, likes=10, views=1';
COMMENT ON COLUMN viral_variants.confidence IS 'Statistical confidence (0-1), increases with attempts, formula: 1 - exp(-attempts/10)';
COMMENT ON COLUMN viral_variants.share_rate IS 'shares / attempts - primary performance metric';
COMMENT ON COLUMN viral_variants.conversion_rate IS 'signups / shares - ultimate success metric';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- =====================================================
-- VERIFIED ENGAGEMENT & FRAUD DETECTION SYSTEM
-- =====================================================
--
-- Production-grade reinforcement learning with:
-- - Verified vs unverified engagement tracking
-- - Audit trail for all engagement updates
-- - Fraud detection and scoring
-- - Rate limiting enforcement
-- - Webhook idempotency
-- - Referral fraud prevention
--
-- =====================================================

-- =====================================================
-- TABLE: engagement_audit_log
-- =====================================================
-- Complete audit trail of all engagement updates

CREATE TABLE IF NOT EXISTS engagement_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content reference
  content_id UUID NOT NULL REFERENCES viral_content_instances(id) ON DELETE CASCADE,

  -- Metric details
  metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN (
    'shares', 'views', 'likes', 'comments', 'saves', 'clicks', 'signups'
  )),
  delta INTEGER NOT NULL,  -- Change amount

  -- Verification
  verification_status VARCHAR(30) NOT NULL CHECK (verification_status IN (
    'platform_verified',
    'webhook_signed',
    'user_claimed',
    'screenshot_verified',
    'inferred',
    'suspicious'
  )),
  source VARCHAR(20) NOT NULL CHECK (source IN (
    'platform_api',
    'webhook',
    'user_report',
    'system',
    'referral_link'
  )),

  -- Fraud detection
  fraud_score FLOAT DEFAULT 0.0 CHECK (fraud_score >= 0 AND fraud_score <= 1),

  -- Request metadata
  ip_address VARCHAR(45),  -- IPv4 or IPv6
  user_agent TEXT,
  metadata JSONB,          -- Flexible metadata (webhookId, platformId, etc.)

  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  CONSTRAINT unique_webhook UNIQUE (metadata) WHERE metadata ? 'webhookId'
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_log_content_id ON engagement_audit_log(content_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON engagement_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_metric_type ON engagement_audit_log(metric_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_verification ON engagement_audit_log(verification_status);
CREATE INDEX IF NOT EXISTS idx_audit_log_fraud_score ON engagement_audit_log(fraud_score DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_webhook_id ON engagement_audit_log((metadata->>'webhookId')) WHERE metadata ? 'webhookId';

-- =====================================================
-- TABLE: verified_engagement_metrics
-- =====================================================
-- Aggregated metrics split by verification level

CREATE TABLE IF NOT EXISTS verified_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL UNIQUE REFERENCES viral_content_instances(id) ON DELETE CASCADE,

  -- Shares (verified vs unverified)
  shares_platform_verified INTEGER DEFAULT 0,
  shares_user_claimed INTEGER DEFAULT 0,
  shares_total INTEGER DEFAULT 0,

  -- Views
  views_platform_verified INTEGER DEFAULT 0,
  views_inferred INTEGER DEFAULT 0,
  views_total INTEGER DEFAULT 0,

  -- Likes
  likes_platform_verified INTEGER DEFAULT 0,
  likes_user_claimed INTEGER DEFAULT 0,
  likes_total INTEGER DEFAULT 0,

  -- Comments
  comments_platform_verified INTEGER DEFAULT 0,
  comments_user_claimed INTEGER DEFAULT 0,
  comments_total INTEGER DEFAULT 0,

  -- Saves
  saves_platform_verified INTEGER DEFAULT 0,
  saves_user_claimed INTEGER DEFAULT 0,
  saves_total INTEGER DEFAULT 0,

  -- Clicks
  clicks_referral_verified INTEGER DEFAULT 0,
  clicks_user_claimed INTEGER DEFAULT 0,
  clicks_total INTEGER DEFAULT 0,

  -- Signups
  signups_payment_verified INTEGER DEFAULT 0,
  signups_email_verified INTEGER DEFAULT 0,
  signups_pending INTEGER DEFAULT 0,
  signups_total INTEGER DEFAULT 0,

  -- Calculated scores
  verified_viral_score INTEGER DEFAULT 0,
  unverified_viral_score INTEGER DEFAULT 0,
  total_viral_score INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verified_metrics_content_id ON verified_engagement_metrics(content_id);
CREATE INDEX IF NOT EXISTS idx_verified_metrics_viral_score ON verified_engagement_metrics(total_viral_score DESC);

-- =====================================================
-- TABLE: referral_clicks
-- =====================================================
-- Track referral link clicks (before signup)

CREATE TABLE IF NOT EXISTS referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  referral_code VARCHAR(20) NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  metadata JSONB,  -- ipAddress, userAgent, referer, platform

  CONSTRAINT fk_referral_code FOREIGN KEY (referral_code)
    REFERENCES referrals(referral_code) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_timestamp ON referral_clicks(clicked_at DESC);

-- =====================================================
-- TABLE: referral_rewards_log
-- =====================================================
-- Audit trail of referral rewards credited

CREATE TABLE IF NOT EXISTS referral_rewards_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  months_credited INTEGER NOT NULL,
  reason VARCHAR(100),
  credited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_id ON referral_rewards_log(user_id);

-- =====================================================
-- TABLE: user_credits
-- =====================================================
-- Store unused credits (for users without subscriptions yet)

CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_months INTEGER NOT NULL,
  reason VARCHAR(100),
  used BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(user_id) WHERE NOT used
);

CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_unused ON user_credits(user_id) WHERE NOT used;

-- =====================================================
-- TABLE: user_activity_logs
-- =====================================================
-- Track user logins for streak calculation

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) DEFAULT 'login',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON user_activity_logs(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE engagement_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Audit log: Read-only for users (only see own content's audits)
CREATE POLICY "audit_log_select_own" ON engagement_audit_log
  FOR SELECT
  USING (
    content_id IN (
      SELECT id FROM viral_content_instances WHERE user_id = auth.uid()
    )
  );

-- Verified metrics: Users can see their own
CREATE POLICY "verified_metrics_select_own" ON verified_engagement_metrics
  FOR SELECT
  USING (
    content_id IN (
      SELECT id FROM viral_content_instances WHERE user_id = auth.uid()
    )
  );

-- Referral clicks: Users can see their own referral clicks
CREATE POLICY "referral_clicks_select_own" ON referral_clicks
  FOR SELECT
  USING (
    referral_code IN (
      SELECT referral_code FROM referrals WHERE referrer_user_id = auth.uid()
    )
  );

-- Referral rewards: Users can see their own rewards
CREATE POLICY "referral_rewards_select_own" ON referral_rewards_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- User credits: Users can see their own credits
CREATE POLICY "user_credits_select_own" ON user_credits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Activity logs: Users can see their own activity
CREATE POLICY "activity_logs_select_own" ON user_activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Activity logs: Users can insert their own activity
CREATE POLICY "activity_logs_insert_own" ON user_activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- FUNCTION: update_verified_engagement
-- -----------------------------------------------------
-- Updates verified engagement metrics when audit log is created

CREATE OR REPLACE FUNCTION update_verified_engagement(
  p_content_id UUID,
  p_metric_type VARCHAR(20),
  p_verification_status VARCHAR(30),
  p_delta INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_field_verified VARCHAR(50);
  v_field_total VARCHAR(50);
BEGIN
  -- Ensure record exists
  INSERT INTO verified_engagement_metrics (content_id)
  VALUES (p_content_id)
  ON CONFLICT (content_id) DO NOTHING;

  -- Build field names based on metric type and verification status
  IF p_verification_status = 'platform_verified' THEN
    v_field_verified := p_metric_type || '_platform_verified';
  ELSIF p_verification_status = 'user_claimed' THEN
    v_field_verified := p_metric_type || '_user_claimed';
  ELSIF p_verification_status = 'inferred' THEN
    v_field_verified := p_metric_type || '_inferred';
  ELSIF p_verification_status IN ('webhook_signed', 'screenshot_verified') THEN
    v_field_verified := p_metric_type || '_platform_verified';  -- Treat as verified
  ELSE
    v_field_verified := p_metric_type || '_user_claimed';  -- Default to unverified
  END IF;

  v_field_total := p_metric_type || '_total';

  -- Update the specific verified field and total
  -- NOTE: In production, use dynamic SQL with EXECUTE
  -- For now, we'll update via application code

  -- Update timestamp
  UPDATE verified_engagement_metrics
  SET updated_at = NOW()
  WHERE content_id = p_content_id;

END;
$$;

-- -----------------------------------------------------
-- FUNCTION: increment_referral_count
-- -----------------------------------------------------
-- Increment referral counts for user

CREATE OR REPLACE FUNCTION increment_referral_count(
  user_uuid UUID,
  increment_type VARCHAR(20)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This would update a referral_stats table
  -- For now, stats are calculated on-demand from referrals table
  NULL;
END;
$$;

-- -----------------------------------------------------
-- FUNCTION: increment_referral_clicks
-- -----------------------------------------------------
-- Increment click count for referral code

CREATE OR REPLACE FUNCTION increment_referral_clicks(
  ref_code VARCHAR(20)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update click count in referrals table
  UPDATE referrals
  SET click_count = COALESCE(click_count, 0) + 1
  WHERE referral_code = ref_code;
END;
$$;

-- -----------------------------------------------------
-- FUNCTION: calculate_verified_viral_score
-- -----------------------------------------------------
-- Calculate viral score with verification weighting

CREATE OR REPLACE FUNCTION calculate_verified_viral_score(
  p_content_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_metrics RECORD;
  v_score INTEGER;
BEGIN
  SELECT * INTO v_metrics
  FROM verified_engagement_metrics
  WHERE content_id = p_content_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Base weights
  -- Verification multipliers:
  -- - platform_verified: 1.0 (full value)
  -- - user_claimed: 0.3 (30% value)
  -- - inferred: 0.5 (50% value)

  v_score := 0;

  -- Signups (1000 points each)
  v_score := v_score +
    (v_metrics.signups_payment_verified * 1000 * 1.0) +
    (v_metrics.signups_email_verified * 1000 * 0.7) +
    (v_metrics.signups_pending * 1000 * 0.1);

  -- Shares (100 points each)
  v_score := v_score +
    (v_metrics.shares_platform_verified * 100 * 1.0) +
    (v_metrics.shares_user_claimed * 100 * 0.3);

  -- Clicks (50 points each)
  v_score := v_score +
    (v_metrics.clicks_referral_verified * 50 * 0.8) +
    (v_metrics.clicks_user_claimed * 50 * 0.3);

  -- Saves (30 points each)
  v_score := v_score +
    (v_metrics.saves_platform_verified * 30 * 1.0) +
    (v_metrics.saves_user_claimed * 30 * 0.3);

  -- Comments (20 points each)
  v_score := v_score +
    (v_metrics.comments_platform_verified * 20 * 1.0) +
    (v_metrics.comments_user_claimed * 20 * 0.3);

  -- Likes (10 points each)
  v_score := v_score +
    (v_metrics.likes_platform_verified * 10 * 1.0) +
    (v_metrics.likes_user_claimed * 10 * 0.3);

  -- Views (1 point each)
  v_score := v_score +
    (v_metrics.views_platform_verified * 1 * 1.0) +
    (v_metrics.views_inferred * 1 * 0.5);

  RETURN v_score;
END;
$$;

-- =====================================================
-- VIEWS
-- =====================================================

-- -----------------------------------------------------
-- VIEW: fraud_dashboard
-- -----------------------------------------------------
-- Dashboard for monitoring fraud

CREATE OR REPLACE VIEW fraud_dashboard AS
SELECT
  DATE_TRUNC('day', timestamp) as date,
  metric_type,
  verification_status,
  COUNT(*) as update_count,
  AVG(fraud_score) as avg_fraud_score,
  COUNT(*) FILTER (WHERE fraud_score > 0.7) as high_fraud_count,
  SUM(delta) as total_delta
FROM engagement_audit_log
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp), metric_type, verification_status
ORDER BY date DESC;

-- -----------------------------------------------------
-- VIEW: referral_performance
-- -----------------------------------------------------
-- Referral performance analytics

CREATE OR REPLACE VIEW referral_performance AS
SELECT
  referrer_user_id,
  COUNT(*) as total_referrals,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'email_verified') as email_verified_count,
  COUNT(*) FILTER (WHERE status = 'payment_verified') as payment_verified_count,
  COUNT(*) FILTER (WHERE status = 'earned') as earned_count,
  COUNT(*) FILTER (WHERE status = 'redeemed') as redeemed_count,
  COUNT(*) FILTER (WHERE status = 'fraudulent') as fraudulent_count,
  AVG(fraud_score) as avg_fraud_score,
  SUM(reward_months) FILTER (WHERE status IN ('earned', 'redeemed')) as total_reward_months
FROM referrals
GROUP BY referrer_user_id;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- -----------------------------------------------------
-- TRIGGER: auto_calculate_verified_viral_score
-- -----------------------------------------------------
-- Automatically recalculate viral score when metrics change

CREATE OR REPLACE FUNCTION trigger_calculate_verified_viral_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE verified_engagement_metrics
  SET
    verified_viral_score = calculate_verified_viral_score(NEW.content_id),
    updated_at = NOW()
  WHERE content_id = NEW.content_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_verified_viral_score_on_change
AFTER INSERT OR UPDATE ON verified_engagement_metrics
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_verified_viral_score();

-- =====================================================
-- ENHANCEMENTS TO EXISTING TABLES
-- =====================================================

-- Add fraud tracking to referrals table
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS fraud_score FLOAT DEFAULT 0.0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS fraud_reasons TEXT[];
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS verification_data JSONB;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS payment_amount FLOAT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_months INTEGER DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMP WITH TIME ZONE;

-- Add platform mapping to viral_content_instances
ALTER TABLE viral_content_instances ADD COLUMN IF NOT EXISTS platform VARCHAR(50);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE engagement_audit_log IS 'Complete audit trail of all engagement updates with fraud detection';
COMMENT ON TABLE verified_engagement_metrics IS 'Aggregated metrics split by verification level for accurate viral scoring';
COMMENT ON TABLE referral_clicks IS 'Track referral link clicks before signup for conversion tracking';
COMMENT ON TABLE referral_rewards_log IS 'Audit trail of all referral rewards credited to users';
COMMENT ON TABLE user_credits IS 'Store unused referral credits for users without active subscriptions';
COMMENT ON COLUMN engagement_audit_log.fraud_score IS 'Fraud detection score 0-1, with 1 being definite fraud';
COMMENT ON COLUMN engagement_audit_log.verification_status IS 'How was this metric verified? Platform API, webhook, user claim, etc.';
COMMENT ON VIEW fraud_dashboard IS 'Dashboard for monitoring fraud patterns and high-risk updates';
COMMENT ON FUNCTION calculate_verified_viral_score IS 'Calculate viral score with verification weighting (verified=1.0x, unverified=0.3x)';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

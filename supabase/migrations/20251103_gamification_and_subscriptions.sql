-- =====================================================
-- GAMIFICATION & SUBSCRIPTION SYSTEMS
-- =====================================================
-- Purpose: XP/Levels, Badges, Achievements, Subscription Tiers
-- Impact: Retention (XP/Badges) + Monetization (Tiers) + Viral Growth (Referrals)
-- Date: 2025-11-03
-- =====================================================

-- =====================================================
-- 1. XP & LEVELING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_xp_levels (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INT NOT NULL DEFAULT 1,
  current_xp INT NOT NULL DEFAULT 0,
  xp_to_next_level INT NOT NULL DEFAULT 100,
  total_xp_earned INT NOT NULL DEFAULT 0,

  -- What unlocks at each level
  level_unlocks JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  last_level_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_xp_levels_level
  ON public.user_xp_levels(current_level DESC);

COMMENT ON TABLE public.user_xp_levels IS 'User experience points and leveling system';
COMMENT ON COLUMN public.user_xp_levels.level_unlocks IS 'Features unlocked at each level milestone';

-- XP earning rules
CREATE TABLE IF NOT EXISTS public.xp_earning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL UNIQUE, -- 'log_food', 'complete_habit', 'hit_protein_goal'
  xp_amount INT NOT NULL,
  daily_cap INT, -- Prevent gaming (NULL = no cap)
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.xp_earning_rules IS 'Rules for earning XP from user actions';

-- =====================================================
-- 2. BADGES & ACHIEVEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  achievement_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),

  -- Unlock criteria (JSON predicate)
  unlock_criteria JSONB NOT NULL,

  -- Rewards
  xp_reward INT DEFAULT 0,
  unlocks_feature TEXT, -- Feature key to enable when earned
  unlocks_component TEXT, -- UI component key

  -- Display
  category TEXT, -- 'streak', 'nutrition', 'weight_loss', 'social'
  sort_order INT DEFAULT 100,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievement_definitions_category
  ON public.achievement_definitions(category, sort_order);

CREATE INDEX IF NOT EXISTS idx_achievement_definitions_rarity
  ON public.achievement_definitions(rarity);

COMMENT ON TABLE public.achievement_definitions IS 'Achievement/badge definitions';
COMMENT ON COLUMN public.achievement_definitions.unlock_criteria IS 'JSON: {"type": "streak", "value": 7} or {"type": "weight_lost_kg", "value": 5}';

-- User achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL REFERENCES public.achievement_definitions(achievement_key),

  -- Progress tracking
  progress_current INT DEFAULT 0,
  progress_total INT,
  earned_at TIMESTAMPTZ,

  -- Display preferences
  is_displayed_on_profile BOOLEAN DEFAULT FALSE,
  is_favorited BOOLEAN DEFAULT FALSE,

  -- Social
  shared_to_social BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMPTZ,

  -- Rewards claimed
  xp_reward_claimed BOOLEAN DEFAULT FALSE,
  feature_unlocked BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_achievements_unique UNIQUE(user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON public.user_achievements(user_id, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_achievements_earned
  ON public.user_achievements(earned_at DESC) WHERE earned_at IS NOT NULL;

COMMENT ON TABLE public.user_achievements IS 'User-earned badges and achievements';

-- =====================================================
-- 3. SUBSCRIPTION TIERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  tier_key TEXT PRIMARY KEY,
  tier_name TEXT NOT NULL,
  tier_description TEXT,

  -- Pricing
  monthly_price_cents INT NOT NULL,
  annual_price_cents INT, -- NULL if annual not available
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,

  -- Features
  daily_food_limit INT, -- NULL = unlimited
  daily_ai_message_limit INT,
  daily_photo_analysis_limit INT,
  phone_calls_per_month INT DEFAULT 0,

  -- Feature flags
  features JSONB DEFAULT '{}'::jsonb,
  ui_components_enabled TEXT[],
  analytics_modules_enabled TEXT[],

  -- Support
  priority_level INT DEFAULT 100, -- Lower = higher priority

  -- Marketing
  marketing_tagline TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 100,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_tiers IS 'Subscription tier definitions (free, premium, pro)';
COMMENT ON COLUMN public.subscription_tiers.features IS 'Feature flags: {"carbon_tracking": true, "weight_projection": true}';

-- User subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_key TEXT NOT NULL REFERENCES public.subscription_tiers(tier_key),

  -- Subscription lifecycle
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  renews_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Payment
  payment_provider TEXT DEFAULT 'stripe', -- 'stripe', 'apple', 'google'
  payment_method_id TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Trial
  trial_ends_at TIMESTAMPTZ,
  trial_used BOOLEAN DEFAULT FALSE,

  -- Legacy
  grandfathered BOOLEAN DEFAULT FALSE,
  grandfathered_price_cents INT,

  -- Metadata
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier
  ON public.user_subscriptions(tier_key);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_renews
  ON public.user_subscriptions(renews_at) WHERE canceled_at IS NULL;

COMMENT ON TABLE public.user_subscriptions IS 'User subscription status and payment info';

-- Usage limits tracking
CREATE TABLE IF NOT EXISTS public.subscription_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Daily counts
  food_entries_count INT DEFAULT 0,
  ai_messages_count INT DEFAULT 0,
  photo_analyses_count INT DEFAULT 0,

  -- Warnings sent
  limit_warning_sent BOOLEAN DEFAULT FALSE,
  limit_reached_at TIMESTAMPTZ,

  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT subscription_usage_limits_unique UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_limits_user_date
  ON public.subscription_usage_limits(user_id, date DESC);

COMMENT ON TABLE public.subscription_usage_limits IS 'Track daily usage against subscription limits';

-- =====================================================
-- 4. TIME-BASED UNLOCKS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.time_based_unlocks (
  unlock_key TEXT PRIMARY KEY,
  unlock_day INT NOT NULL, -- Day 7, 30, 90, 180, 365

  -- What unlocks
  feature_key TEXT,
  component_key TEXT,
  achievement_key TEXT,

  -- Celebration
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  celebration_message TEXT,
  icon_url TEXT,

  -- Rewards
  xp_reward INT DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_based_unlocks_day
  ON public.time_based_unlocks(unlock_day);

COMMENT ON TABLE public.time_based_unlocks IS 'Features/achievements unlocked at milestone days';

-- User unlock history
CREATE TABLE IF NOT EXISTS public.user_unlock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlock_key TEXT NOT NULL REFERENCES public.time_based_unlocks(unlock_key),

  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  xp_claimed BOOLEAN DEFAULT FALSE,

  CONSTRAINT user_unlock_history_unique UNIQUE(user_id, unlock_key)
);

CREATE INDEX IF NOT EXISTS idx_user_unlock_history_user
  ON public.user_unlock_history(user_id, unlocked_at DESC);

COMMENT ON TABLE public.user_unlock_history IS 'Track when users hit time-based milestones';

-- =====================================================
-- 5. REFERRAL SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  reward_key TEXT PRIMARY KEY,
  referrals_required INT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('feature_unlock', 'xp_bonus', 'premium_trial', 'achievement')),
  reward_value TEXT NOT NULL, -- Feature key, XP amount, trial days, achievement key

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.referral_rewards IS 'Rewards for referring friends';

-- User referrals
CREATE TABLE IF NOT EXISTS public.user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  referral_code TEXT NOT NULL,
  referred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Milestones (referrer only gets credit if referral sticks!)
  signup_completed BOOLEAN DEFAULT FALSE,
  first_log_completed BOOLEAN DEFAULT FALSE,
  first_week_completed BOOLEAN DEFAULT FALSE,

  -- Rewards
  reward_granted BOOLEAN DEFAULT FALSE,
  reward_key TEXT,
  reward_granted_at TIMESTAMPTZ,

  CONSTRAINT no_self_referral CHECK (referrer_user_id != referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer
  ON public.user_referrals(referrer_user_id, referred_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_referrals_code
  ON public.user_referrals(referral_code);

COMMENT ON TABLE public.user_referrals IS 'Track referrals and rewards';

-- =====================================================
-- 6. FEATURE TRIALS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.feature_trials (
  trial_key TEXT PRIMARY KEY,
  feature_key TEXT NOT NULL,
  trial_duration_days INT NOT NULL,

  -- How to trigger trial
  trigger_condition JSONB,

  -- Messaging
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cta_text TEXT DEFAULT 'Try Premium Free',

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.feature_trials IS 'Premium feature trial definitions';
COMMENT ON COLUMN public.feature_trials.trigger_condition IS 'JSON: {"type": "achievement", "value": "7_day_warrior"}';

-- User feature trials
CREATE TABLE IF NOT EXISTS public.user_feature_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  converted_to_paid BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,

  CONSTRAINT user_feature_trials_unique UNIQUE(user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_user_feature_trials_user
  ON public.user_feature_trials(user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feature_trials_active
  ON public.user_feature_trials(expires_at) WHERE converted_to_paid = FALSE;

COMMENT ON TABLE public.user_feature_trials IS 'Track active premium feature trials';

-- =====================================================
-- 7. ANNIVERSARY MILESTONES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.anniversary_milestones (
  milestone_key TEXT PRIMARY KEY,
  days_since_signup INT NOT NULL UNIQUE,

  milestone_name TEXT NOT NULL, -- "1 Month Champion", "Half-Year Hero"
  celebration_template TEXT NOT NULL,

  -- Stats to include in report card
  stats_to_include TEXT[],

  -- Rewards
  xp_reward INT DEFAULT 0,
  unlocks_badge TEXT,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.anniversary_milestones IS 'Anniversary celebrations (30, 90, 180, 365 days)';

-- User anniversaries
CREATE TABLE IF NOT EXISTS public.user_anniversaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL REFERENCES public.anniversary_milestones(milestone_key),

  reached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stats_snapshot JSONB,

  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  shared_to_social BOOLEAN DEFAULT FALSE,
  xp_claimed BOOLEAN DEFAULT FALSE,

  CONSTRAINT user_anniversaries_unique UNIQUE(user_id, milestone_key)
);

CREATE INDEX IF NOT EXISTS idx_user_anniversaries_user
  ON public.user_anniversaries(user_id, reached_at DESC);

COMMENT ON TABLE public.user_anniversaries IS 'Track when users hit anniversary milestones';

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.user_xp_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_anniversaries ENABLE ROW LEVEL SECURITY;

-- User can view/update their own data
CREATE POLICY user_xp_levels_own ON public.user_xp_levels
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_achievements_own ON public.user_achievements
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_subscriptions_own ON public.user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY subscription_usage_limits_own ON public.subscription_usage_limits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_unlock_history_own ON public.user_unlock_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_referrals_select ON public.user_referrals
  FOR SELECT USING (auth.uid() IN (referrer_user_id, referred_user_id));

CREATE POLICY user_feature_trials_own ON public.user_feature_trials
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_anniversaries_own ON public.user_anniversaries
  FOR ALL USING (auth.uid() = user_id);

-- Public read for definitions
ALTER TABLE public.xp_earning_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_based_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anniversary_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY xp_earning_rules_select_all ON public.xp_earning_rules
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY achievement_definitions_select_all ON public.achievement_definitions
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY subscription_tiers_select_all ON public.subscription_tiers
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY time_based_unlocks_select_all ON public.time_based_unlocks
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY referral_rewards_select_all ON public.referral_rewards
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY feature_trials_select_all ON public.feature_trials
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY anniversary_milestones_select_all ON public.anniversary_milestones
  FOR SELECT USING (is_active = TRUE);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER trigger_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_user_xp_levels_updated_at
  BEFORE UPDATE ON public.user_xp_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- DONE: 16 tables created for gamification + subscriptions
-- =====================================================
-- Next: Seed data migration
-- =====================================================

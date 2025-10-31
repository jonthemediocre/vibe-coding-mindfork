-- NANO-BANANA Referral System Database Schema
-- Run this in your Supabase SQL Editor

-- Add referral_code column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- Create referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'earned', 'redeemed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  earned_at TIMESTAMP WITH TIME ZONE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referrer_user_id, referred_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(reward_status);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals table
CREATE POLICY "Users can view their own referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_user_id);

CREATE POLICY "Users can insert referrals"
  ON referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Anyone can create a referral

CREATE POLICY "System can update referral status"
  ON referrals
  FOR UPDATE
  TO authenticated
  USING (true); -- For now, allow updates (tighten this in production)

-- Function to mark referral as earned when referred user subscribes
CREATE OR REPLACE FUNCTION mark_referral_earned()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user's subscription becomes active, mark referral as earned
  IF NEW.subscription_status = 'active' AND OLD.subscription_status != 'active' THEN
    UPDATE referrals
    SET
      reward_status = 'earned',
      earned_at = NOW()
    WHERE referred_user_id = NEW.user_id
      AND reward_status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically mark referrals as earned
CREATE TRIGGER on_subscription_active
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION mark_referral_earned();

-- Function to get referral stats for a user
CREATE OR REPLACE FUNCTION get_referral_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_referrals', COUNT(*),
    'free_months_earned', COUNT(*) FILTER (WHERE reward_status = 'earned'),
    'pending_referrals', COUNT(*) FILTER (WHERE reward_status = 'pending'),
    'referral_code', (SELECT referral_code FROM profiles WHERE user_id = user_uuid)
  ) INTO stats
  FROM referrals
  WHERE referrer_user_id = user_uuid;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;

-- Add comment
COMMENT ON TABLE referrals IS 'NANO-BANANA viral referral system - tracks user referrals and rewards';
COMMENT ON COLUMN profiles.referral_code IS 'Unique referral code for viral growth (e.g., MINDFK42)';

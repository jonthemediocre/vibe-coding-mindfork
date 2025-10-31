/**
 * NANO-BANANA Service
 *
 * Creates viral social media images combining:
 * - User profile photo
 * - Cool AI coach character
 * - Call-to-action frame
 * - Referral code for earning free months
 *
 * This is IMPERATIVE for viral growth!
 */

import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface NanoBananaConfig {
  userId: string;
  userPhoto: string; // URI or URL
  coachImageUrl: string;
  coachName: string;
  achievementText?: string; // e.g., "Lost 10 lbs in 2 weeks!"
  callToAction?: string; // e.g., "Join me on MindFork!"
  template: 'achievement' | 'progress' | 'coach_intro' | 'milestone';
}

export interface NanoBananaResult {
  imageUri: string; // Local file URI
  shareUrl: string; // URL with referral code
  referralCode: string;
}

/**
 * Generate a unique referral code for the user
 */
export async function generateReferralCode(userId: string): Promise<string> {
  // Check if user already has a referral code
  const { data: existing } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('user_id', userId)
    .single();

  if (existing?.referral_code) {
    return existing.referral_code;
  }

  // Generate new 8-character code (e.g., "MINDFK42")
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const referralCode = `MIND${randomPart}`;

  // Save to profile
  await supabase
    .from('profiles')
    .update({ referral_code: referralCode })
    .eq('user_id', userId);

  return referralCode;
}

/**
 * Track when someone uses a referral code
 */
export async function trackReferralSignup(referrerCode: string, newUserId: string): Promise<void> {
  console.log('[NanoBanana] Tracking referral signup:', { referrerCode, newUserId });

  // Find the referrer
  const { data: referrer } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('referral_code', referrerCode)
    .single();

  if (!referrer) {
    console.warn('[NanoBanana] Referral code not found:', referrerCode);
    return;
  }

  // Create referral record
  await supabase
    .from('referrals')
    .insert({
      referrer_user_id: referrer.user_id,
      referred_user_id: newUserId,
      reward_status: 'pending', // Will be 'earned' after new user pays
      created_at: new Date().toISOString(),
    });

  console.log('[NanoBanana] Referral tracked successfully');
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string): Promise<{
  totalReferrals: number;
  freeMonthsEarned: number;
  pendingReferrals: number;
}> {
  const { data: referrals } = await supabase
    .from('referrals')
    .select('reward_status')
    .eq('referrer_user_id', userId);

  if (!referrals) {
    return { totalReferrals: 0, freeMonthsEarned: 0, pendingReferrals: 0 };
  }

  const totalReferrals = referrals.length;
  const freeMonthsEarned = referrals.filter(r => r.reward_status === 'earned').length;
  const pendingReferrals = referrals.filter(r => r.reward_status === 'pending').length;

  return {
    totalReferrals,
    freeMonthsEarned,
    pendingReferrals,
  };
}

/**
 * Create a viral NANO-BANANA image
 * Combines user photo + coach image + CTA frame
 */
export async function createNanoBananaImage(config: NanoBananaConfig): Promise<NanoBananaResult> {
  console.log('[NanoBanana] Creating viral image:', config.template);

  const referralCode = await generateReferralCode(config.userId);

  // For now, we'll use the OpenAI image generation API
  // In the future, this could use a custom image composition service

  const prompt = buildImagePrompt(config, referralCode);

  // Generate the mashup image using Vibecode's image generation API
  const { generateImage } = await import('../api/image-generation');

  const imageUrl = await generateImage(prompt, {
    size: '1024x1024',
    quality: 'high',
  });

  // Download the generated image locally
  const localUri = await downloadImage(imageUrl);

  // Create share URL with referral code
  const shareUrl = `https://mindfork.app/join?ref=${referralCode}`;

  return {
    imageUri: localUri,
    shareUrl,
    referralCode,
  };
}

/**
 * Build the AI prompt for the NANO-BANANA image
 */
function buildImagePrompt(config: NanoBananaConfig, referralCode: string): string {
  const baseStyle = "professional wellness app promotional image, vibrant colors, modern design, social media ready";

  const templates: Record<typeof config.template, string> = {
    achievement: `${baseStyle}. Split screen showing: LEFT SIDE - proud user celebrating fitness achievement "${config.achievementText || 'Amazing progress!'}". RIGHT SIDE - friendly AI coach character ${config.coachName} cheering them on. Large bold text at bottom: "${config.callToAction || 'Join me on MindFork!'}" with referral code "${referralCode}" in smaller text. Inspirational, shareable design.`,

    progress: `${baseStyle}. Dynamic before/after style layout with AI coach ${config.coachName} mascot in center giving thumbs up. User success story text: "${config.achievementText || 'Transforming with MindFork!'}". Bottom banner: "${config.callToAction || 'Start your journey!'}" with code "${referralCode}". Motivational and eye-catching.`,

    coach_intro: `${baseStyle}. Feature the cool AI coach character ${config.coachName} front and center in an engaging pose. User photo in corner with speech bubble saying "${config.achievementText || 'My AI coach is amazing!'}". Large CTA text: "${config.callToAction || 'Get your AI coach!'}" with referral code "${referralCode}". Fun and inviting.`,

    milestone: `${baseStyle}. Celebration theme with confetti. User achievement badge in center: "${config.achievementText || 'Milestone Achieved!'}". AI coach ${config.coachName} mascot celebrating alongside. Bottom text: "${config.callToAction || 'Join the celebration!'}" with referral code "${referralCode}". Festive and shareable.`,
  };

  return templates[config.template];
}

/**
 * Download an image from URL to local file system
 */
async function downloadImage(url: string): Promise<string> {
  const filename = `nanoBanana_${Date.now()}.jpg`;
  const localUri = `${FileSystem.cacheDirectory}${filename}`;

  const downloadResult = await FileSystem.downloadAsync(url, localUri);

  if (downloadResult.status !== 200) {
    throw new Error('Failed to download NANO-BANANA image');
  }

  return downloadResult.uri;
}

/**
 * Quick share function - generates and shares a NANO-BANANA image
 */
export async function quickShareAchievement(
  userId: string,
  coachName: string,
  achievementText: string,
  userPhotoUri?: string
): Promise<NanoBananaResult> {
  // Get user's coach image
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_coach_id')
    .eq('user_id', userId)
    .single();

  // Get coach image URL (placeholder for now)
  const coachImageUrl = `https://placeholder-coach-image.com/${profile?.active_coach_id || 'default'}.png`;

  return createNanoBananaImage({
    userId,
    userPhoto: userPhotoUri || '',
    coachImageUrl,
    coachName,
    achievementText,
    callToAction: 'Join me on MindFork!',
    template: 'achievement',
  });
}

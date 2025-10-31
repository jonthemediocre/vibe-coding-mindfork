/**
 * VIRAL REINFORCEMENT LEARNING SYSTEM (RLHF)
 *
 * AI that learns what content goes viral through reinforcement learning
 * Rewards: Social shares, engagement, conversions
 * Learns: What templates, roast levels, coaches, timing work best
 * Adapts: Suggestions become smarter over time
 *
 * Starting Point: Profile image + coach mashup (NANO-BANANA)
 */

import { supabase } from '../lib/supabase';
import { generateImage } from '../api/image-generation';
import { generateReferralCode } from './NanoBananaService';

/**
 * Viral Content Types
 */
export type ViralContentType =
  | 'profile_mashup'      // User photo + coach
  | 'roast_card'          // Text roast quote
  | 'achievement_card'    // Before/after stats
  | 'video_reel'          // Video template
  | 'coach_intro'         // Meet my coach
  | 'progress_update';    // Weekly progress

/**
 * Engagement Metrics (Rewards)
 */
export interface EngagementMetrics {
  shares: number;         // Primary reward
  views: number;          // Secondary reward
  likes: number;          // Tertiary reward
  comments: number;       // Engagement depth
  saves: number;          // High intent
  clicks: number;         // Conversion tracking
  signups: number;        // Ultimate goal
}

/**
 * Content Variant (for A/B testing)
 */
export interface ContentVariant {
  id: string;
  content_type: ViralContentType;
  variant_name: string;

  // Template parameters
  template_id?: string;
  roast_level?: number;
  coach_id?: string;
  text_style?: string;
  color_scheme?: string;
  layout?: string;

  // Performance tracking
  attempts: number;       // How many times generated
  shares: number;         // How many times shared
  total_views: number;    // Cumulative views
  total_signups: number;  // Conversions

  // Calculated scores
  share_rate: number;     // shares / attempts
  viral_score: number;    // Weighted engagement
  confidence: number;     // Statistical confidence (0-1)

  created_at: string;
  updated_at: string;
}

/**
 * Viral Content Instance (actual post)
 */
export interface ViralContentInstance {
  id: string;
  user_id: string;
  variant_id: string;
  content_type: ViralContentType;

  // Content details
  image_url: string;
  caption: string;
  referral_code: string;

  // Engagement (updated over time)
  shares: number;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  clicks: number;
  signups: number;

  // Platform
  platform: string;       // 'instagram', 'tiktok', 'twitter'
  posted_at: string;

  // Learning data
  time_of_day: number;    // Hour (0-23)
  day_of_week: number;    // 0-6
  user_tier: string;      // 'free', 'premium'
  user_streak: number;    // Days active
}

/**
 * AI Suggestion (what to post next)
 */
export interface ViralSuggestion {
  content_type: ViralContentType;
  variant_id: string;
  confidence: number;     // 0-1 how confident AI is this will be viral
  predicted_shares: number;
  reason: string;         // Human-readable explanation
  template_params: Record<string, any>;
}

/**
 * REINFORCEMENT LEARNING ENGINE
 */
export class ViralRLEngine {

  /**
   * Calculate viral score (reward function)
   */
  static calculateViralScore(metrics: EngagementMetrics): number {
    // Weighted reward function
    const weights = {
      signups: 1000,    // Ultimate goal
      shares: 100,      // Primary driver
      clicks: 50,       // High intent
      saves: 30,        // Future intent
      comments: 20,     // Engagement
      likes: 10,        // Social proof
      views: 1,         // Awareness
    };

    return (
      metrics.signups * weights.signups +
      metrics.shares * weights.shares +
      metrics.clicks * weights.clicks +
      metrics.saves * weights.saves +
      metrics.comments * weights.comments +
      metrics.likes * weights.likes +
      metrics.views * weights.views
    );
  }

  /**
   * Update variant performance after engagement
   */
  static async updateVariantPerformance(
    variantId: string,
    newMetrics: Partial<EngagementMetrics>
  ): Promise<void> {
    console.log('[ViralRL] Updating variant performance:', variantId);

    // Get current variant
    const { data: variant } = await supabase
      .from('viral_variants')
      .select('*')
      .eq('id', variantId)
      .single();

    if (!variant) return;

    // Update cumulative metrics
    const updatedShares = (variant.shares || 0) + (newMetrics.shares || 0);
    const updatedViews = (variant.total_views || 0) + (newMetrics.views || 0);
    const updatedSignups = (variant.total_signups || 0) + (newMetrics.signups || 0);

    // Recalculate share rate
    const shareRate = variant.attempts > 0 ? updatedShares / variant.attempts : 0;

    // Calculate viral score
    const viralScore = this.calculateViralScore({
      shares: updatedShares,
      views: updatedViews,
      signups: updatedSignups,
      likes: newMetrics.likes || 0,
      comments: newMetrics.comments || 0,
      saves: newMetrics.saves || 0,
      clicks: newMetrics.clicks || 0,
    });

    // Calculate confidence (more attempts = more confidence)
    const confidence = Math.min(0.95, Math.sqrt(variant.attempts / 100));

    // Update variant
    await supabase
      .from('viral_variants')
      .update({
        shares: updatedShares,
        total_views: updatedViews,
        total_signups: updatedSignups,
        share_rate: shareRate,
        viral_score: viralScore,
        confidence: confidence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', variantId);

    console.log('[ViralRL] ✅ Variant updated:', { shareRate, viralScore, confidence });
  }

  /**
   * Get AI suggestion for what to post next (SMART RECOMMENDATIONS)
   */
  static async getSuggestion(userId: string): Promise<ViralSuggestion> {
    console.log('[ViralRL] Getting smart suggestion for user:', userId);

    // Get user's history
    const { data: userPosts } = await supabase
      .from('viral_content_instances')
      .select('*')
      .eq('user_id', userId)
      .order('posted_at', { ascending: false })
      .limit(10);

    // Get all variants sorted by performance
    const { data: variants } = await supabase
      .from('viral_variants')
      .select('*')
      .gte('attempts', 3) // Need minimum data
      .order('viral_score', { ascending: false });

    if (!variants || variants.length === 0) {
      // No data yet - start with profile mashup (bootstrap)
      return {
        content_type: 'profile_mashup',
        variant_id: 'default_profile_mashup',
        confidence: 0.5,
        predicted_shares: 10,
        reason: "Profile mashups are a great way to introduce your AI coach! Let's start here.",
        template_params: {
          layout: 'side_by_side',
          style: 'modern_gradient',
        },
      };
    }

    // EXPLORATION VS EXPLOITATION (epsilon-greedy)
    const exploreRate = 0.2; // 20% of time, try new things
    const shouldExplore = Math.random() < exploreRate;

    let selectedVariant: ContentVariant;

    if (shouldExplore) {
      // EXPLORE: Try variants with low confidence (need more data)
      const lowConfidenceVariants = variants.filter(v => v.confidence < 0.7);
      selectedVariant = lowConfidenceVariants[
        Math.floor(Math.random() * lowConfidenceVariants.length)
      ] || variants[0];

      console.log('[ViralRL] 🔍 EXPLORING new variant');
    } else {
      // EXPLOIT: Use best performing variant
      selectedVariant = variants[0]; // Already sorted by viral_score
      console.log('[ViralRL] 🎯 EXPLOITING top variant');
    }

    // Multi-armed bandit optimization (Thompson Sampling would be even better)
    const confidence = selectedVariant.confidence;
    const predictedShares = Math.round(selectedVariant.share_rate * 100);

    // Generate human-readable reason
    const reason = this.generateSuggestionReason(selectedVariant, userPosts);

    return {
      content_type: selectedVariant.content_type as ViralContentType,
      variant_id: selectedVariant.id,
      confidence,
      predicted_shares: Math.round(selectedVariant.share_rate * 100),
      reason,
      template_params: {
        template_id: selectedVariant.template_id,
        roast_level: selectedVariant.roast_level,
        coach_id: selectedVariant.coach_id,
        text_style: selectedVariant.text_style,
        color_scheme: selectedVariant.color_scheme,
        layout: selectedVariant.layout,
      },
    };
  }

  /**
   * Generate human-readable explanation for suggestion
   */
  private static generateSuggestionReason(
    variant: ContentVariant,
    userHistory?: ViralContentInstance[]
  ): string {
    const shareRate = (variant.share_rate * 100).toFixed(1);
    const confidence = (variant.confidence * 100).toFixed(0);

    const reasons = [
      `This ${variant.content_type.replace('_', ' ')} format has a ${shareRate}% share rate - it's performing great!`,
      `Based on ${variant.attempts} posts, this style gets ${variant.shares} shares on average.`,
      `Users love this ${variant.content_type.replace('_', ' ')} template (${confidence}% confidence).`,
      `This format drove ${variant.total_signups} signups - it converts!`,
    ];

    // Add personalization if user has history
    if (userHistory && userHistory.length > 0) {
      const lastPost = userHistory[0];
      if (lastPost.shares > 5) {
        reasons.push(`Your last post did well! Let's build on that momentum.`);
      } else {
        reasons.push(`Let's try a higher-performing format this time.`);
      }
    }

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  /**
   * Record when content is created (for tracking attempts)
   */
  static async recordAttempt(variantId: string): Promise<void> {
    await supabase.rpc('increment_variant_attempts', { variant_id: variantId });
  }

  /**
   * Get leaderboard of top performing content types
   */
  static async getTopPerformers(limit: number = 10): Promise<ContentVariant[]> {
    const { data } = await supabase
      .from('viral_variants')
      .select('*')
      .gte('attempts', 5) // Minimum sample size
      .order('viral_score', { ascending: false })
      .limit(limit);

    return (data || []) as ContentVariant[];
  }

  /**
   * A/B test two variants head-to-head
   */
  static async runABTest(
    variantA: string,
    variantB: string
  ): Promise<{ winner: string; confidence: number }> {
    const { data: variants } = await supabase
      .from('viral_variants')
      .select('*')
      .in('id', [variantA, variantB]);

    if (!variants || variants.length !== 2) {
      throw new Error('Invalid variant IDs');
    }

    const [a, b] = variants;

    // Simple z-test for proportions (share rate comparison)
    const pA = a.share_rate;
    const pB = b.share_rate;
    const nA = a.attempts;
    const nB = b.attempts;

    // Pooled proportion
    const pPool = (a.shares + b.shares) / (nA + nB);

    // Standard error
    const se = Math.sqrt(pPool * (1 - pPool) * (1/nA + 1/nB));

    // Z-score
    const z = Math.abs(pA - pB) / se;

    // Confidence (approximate)
    const confidence = Math.min(0.99, 1 - Math.exp(-z * z / 2));

    const winner = pA > pB ? variantA : variantB;

    return { winner, confidence };
  }
}

/**
 * PROFILE MASHUP GENERATOR (Starting Point)
 * User profile image + coach image = viral content
 */
export async function generateProfileMashup(
  userId: string,
  userPhotoUri: string,
  coachId: string,
  coachName: string,
  variant?: {
    layout?: 'side_by_side' | 'coach_corner' | 'split_screen' | 'circular_frame';
    style?: 'modern_gradient' | 'bold_contrast' | 'neon' | 'minimal';
    includeStats?: boolean;
  }
): Promise<{ imageUri: string; variantId: string; shareUrl: string }> {
  console.log('[ProfileMashup] Generating viral mashup...');

  const layout = variant?.layout || 'side_by_side';
  const style = variant?.style || 'modern_gradient';
  const includeStats = variant?.includeStats || false;

  // Get or create variant
  const variantId = await getOrCreateVariant('profile_mashup', {
    layout,
    style,
    coach_id: coachId,
  });

  // Record attempt
  await ViralRLEngine.recordAttempt(variantId);

  // Get referral code
  const referralCode = await generateReferralCode(userId);

  // Build AI prompt
  const prompt = buildProfileMashupPrompt(
    coachName,
    referralCode,
    layout,
    style,
    includeStats
  );

  // Generate image
  const imageUrl = await generateImage(prompt, {
    size: '1024x1024',
    quality: 'high',
  });

  // Download locally
  const { default: FileSystem } = await import('expo-file-system');
  const filename = `mashup_${userId}_${Date.now()}.jpg`;
  const localUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.downloadAsync(imageUrl, localUri);

  // Save to database
  await supabase.from('viral_content_instances').insert({
    user_id: userId,
    variant_id: variantId,
    content_type: 'profile_mashup',
    image_url: imageUrl,
    caption: `Me + my AI coach ${coachName}! 🔥 Use code ${referralCode} to get started.`,
    referral_code: referralCode,
    time_of_day: new Date().getHours(),
    day_of_week: new Date().getDay(),
  });

  const shareUrl = `https://mindfork.app/join?ref=${referralCode}`;

  console.log('[ProfileMashup] ✅ Viral mashup created!');

  return {
    imageUri: localUri,
    variantId,
    shareUrl,
  };
}

/**
 * Build AI prompt for profile mashup
 */
function buildProfileMashupPrompt(
  coachName: string,
  referralCode: string,
  layout: string,
  style: string,
  includeStats: boolean
): string {
  const styleDescriptions = {
    modern_gradient: 'Modern gradient background (purple to blue), clean typography, professional aesthetic',
    bold_contrast: 'High contrast black/white with bold neon accents, edgy and eye-catching',
    neon: 'Vibrant neon colors (pink, cyan, yellow), 80s vaporwave aesthetic, futuristic',
    minimal: 'Minimalist design, lots of white space, subtle colors, elegant',
  };

  const layoutDescriptions = {
    side_by_side: 'User on left, coach on right, equal sizing, clean split down the middle',
    coach_corner: 'User photo full frame, coach in bottom right corner as circular overlay',
    split_screen: 'Diagonal split, user upper left, coach lower right, dynamic composition',
    circular_frame: 'Both in circular frames, connected by line, floating on background',
  };

  let prompt = `High-quality viral social media image for wellness app. ${styleDescriptions[style as keyof typeof styleDescriptions]}.

LAYOUT: ${layoutDescriptions[layout as keyof typeof layoutDescriptions]}

USER SIDE:
- Placeholder for user photo (professional, clean crop)
- Text label: "Me"

COACH SIDE:
- ${coachName} (AI coach character - owl, parakeet, turtle, rabbit, phoenix, dolphin, or rival design)
- Text label: "${coachName} - My AI Coach"

BOTTOM BANNER:
- Text: "Join me on MindFork!"
- Referral code: "${referralCode}"
- Small MindFork logo

${includeStats ? `
STATS OVERLAY (subtle):
- "7 days tracked"
- "3 lbs down"
- "5 friends invited"
` : ''}

STYLE NOTES:
- Instagram/TikTok ready (1080x1080)
- Text should be readable on mobile
- Use emojis sparingly (1-2 max)
- Make it look professional but fun
- Emphasize the AI coach connection`;

  return prompt;
}

/**
 * Get or create variant in database
 */
async function getOrCreateVariant(
  contentType: ViralContentType,
  params: Record<string, any>
): Promise<string> {
  // Create variant name from params
  const variantName = `${contentType}_${Object.values(params).join('_')}`;

  // Check if exists
  const { data: existing } = await supabase
    .from('viral_variants')
    .select('id')
    .eq('variant_name', variantName)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new variant
  const { data: newVariant } = await supabase
    .from('viral_variants')
    .insert({
      content_type: contentType,
      variant_name: variantName,
      ...params,
      attempts: 0,
      shares: 0,
      total_views: 0,
      total_signups: 0,
      share_rate: 0,
      viral_score: 0,
      confidence: 0,
    })
    .select('id')
    .single();

  return newVariant!.id;
}

/**
 * Track engagement on a post (REWARD SIGNAL)
 */
export async function trackEngagement(
  contentId: string,
  metrics: Partial<EngagementMetrics>
): Promise<void> {
  console.log('[ViralRL] Tracking engagement:', contentId, metrics);

  // Update content instance
  const updates: Record<string, any> = {};
  if (metrics.shares) updates.shares = supabase.sql`shares + ${metrics.shares}`;
  if (metrics.views) updates.views = supabase.sql`views + ${metrics.views}`;
  if (metrics.likes) updates.likes = supabase.sql`likes + ${metrics.likes}`;
  if (metrics.comments) updates.comments = supabase.sql`comments + ${metrics.comments}`;
  if (metrics.saves) updates.saves = supabase.sql`saves + ${metrics.saves}`;
  if (metrics.clicks) updates.clicks = supabase.sql`clicks + ${metrics.clicks}`;
  if (metrics.signups) updates.signups = supabase.sql`signups + ${metrics.signups}`;

  await supabase
    .from('viral_content_instances')
    .update(updates)
    .eq('id', contentId);

  // Get variant ID and update performance
  const { data: content } = await supabase
    .from('viral_content_instances')
    .select('variant_id')
    .eq('id', contentId)
    .single();

  if (content) {
    await ViralRLEngine.updateVariantPerformance(content.variant_id, metrics);
  }

  console.log('[ViralRL] ✅ Engagement tracked, AI learning...');
}

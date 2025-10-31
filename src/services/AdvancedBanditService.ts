/**
 * TEMPORAL DISCOUNTING & THOMPSON SAMPLING
 *
 * Advanced reinforcement learning components:
 * - Temporal discounting: Recent performance weighted more than old data
 * - Thompson Sampling: Superior to epsilon-greedy for exploration
 * - Contextual bandits: Learn different optima for different contexts
 * - Time-windowed metrics: Only use recent data for decisions
 */

import { supabase } from '../lib/supabase';
import type { ViralContentType, ContentVariant } from './ViralReinforcementLearning';

/**
 * Temporal discount configuration
 */
export interface TemporalConfig {
  halfLifeDays: number;          // Days for value to decay 50%
  minWeight: number;              // Minimum weight for old content (0-1)
  useRecencyBias: boolean;        // Apply recency weighting
}

const DEFAULT_TEMPORAL_CONFIG: TemporalConfig = {
  halfLifeDays: 30,               // 30-day half-life
  minWeight: 0.1,                 // Old content worth at least 10%
  useRecencyBias: true
};

/**
 * Context for contextual bandits
 */
export interface BanditContext {
  userTier: 'free' | 'premium';
  platform: string;               // 'instagram', 'tiktok', etc.
  timeOfDay: number;              // 0-23
  dayOfWeek: number;              // 0-6 (0=Sunday)
  userStreak: number;             // Days active
  userEngagementLevel: 'lurker' | 'regular' | 'power_user';
}

/**
 * Thompson Sampling posterior distribution
 */
interface BetaDistribution {
  alpha: number;    // Success count + 1
  beta: number;     // Failure count + 1
}

/**
 * TEMPORAL DISCOUNTING ENGINE
 */
export class TemporalDiscountEngine {

  /**
   * Calculate temporal discount factor
   */
  static calculateDiscount(
    postAgeSeconds: number,
    config: TemporalConfig = DEFAULT_TEMPORAL_CONFIG
  ): number {
    if (!config.useRecencyBias) {
      return 1.0; // No discounting
    }

    const halfLifeSeconds = config.halfLifeDays * 24 * 60 * 60;

    // Exponential decay: value = e^(-age / halfLife)
    const discount = Math.exp(-postAgeSeconds / halfLifeSeconds);

    // Apply minimum weight floor
    return Math.max(config.minWeight, discount);
  }

  /**
   * Calculate time-windowed viral score
   * Only uses metrics from last N days
   */
  static async calculateTimeWindowedScore(
    variantId: string,
    windowDays: number = 30
  ): Promise<number> {

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    // Get all content instances for this variant within window
    const { data: instances } = await supabase
      .from('viral_content_instances')
      .select('*')
      .eq('variant_id', variantId)
      .gte('created_at', windowStart.toISOString());

    if (!instances || instances.length === 0) {
      return 0;
    }

    // Sum up metrics with temporal discounting
    let totalScore = 0;
    const now = Date.now();

    for (const instance of instances) {
      const postAge = now - new Date(instance.created_at).getTime();
      const discount = this.calculateDiscount(postAge / 1000);

      // Base weights
      const weights = {
        signups: 1000,
        shares: 100,
        clicks: 50,
        saves: 30,
        comments: 20,
        likes: 10,
        views: 1
      };

      // Calculate discounted score for this instance
      const instanceScore = (
        (instance.signups * weights.signups) +
        (instance.shares * weights.shares) +
        (instance.clicks * weights.clicks) +
        (instance.saves * weights.saves) +
        (instance.comments * weights.comments) +
        (instance.likes * weights.likes) +
        (instance.views * weights.views)
      ) * discount;

      totalScore += instanceScore;
    }

    return Math.round(totalScore);
  }

  /**
   * Calculate time-windowed conversion rates
   */
  static async calculateTimeWindowedRates(
    variantId: string,
    windowDays: number = 30
  ): Promise<{
    shareRate: number;
    conversionRate: number;
    attempts: number;
  }> {

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    const { data: instances } = await supabase
      .from('viral_content_instances')
      .select('*')
      .eq('variant_id', variantId)
      .gte('created_at', windowStart.toISOString());

    if (!instances || instances.length === 0) {
      return { shareRate: 0, conversionRate: 0, attempts: 0 };
    }

    const attempts = instances.length;
    const totalShares = instances.reduce((sum, i) => sum + i.shares, 0);
    const totalSignups = instances.reduce((sum, i) => sum + i.signups, 0);

    const shareRate = totalShares / attempts;
    const conversionRate = totalShares > 0 ? totalSignups / totalShares : 0;

    return { shareRate, conversionRate, attempts };
  }

  /**
   * Get seasonality multiplier (boost certain days/times)
   */
  static getSeasonalityMultiplier(
    dayOfWeek: number,
    hourOfDay: number
  ): number {

    // Higher engagement on weekends
    const dayMultipliers: Record<number, number> = {
      0: 1.2,  // Sunday
      1: 0.9,  // Monday
      2: 0.9,  // Tuesday
      3: 1.0,  // Wednesday
      4: 1.0,  // Thursday
      5: 1.1,  // Friday
      6: 1.2   // Saturday
    };

    // Higher engagement evening/night
    let hourMultiplier = 1.0;
    if (hourOfDay >= 18 && hourOfDay <= 23) {
      hourMultiplier = 1.3; // Prime time
    } else if (hourOfDay >= 6 && hourOfDay <= 9) {
      hourMultiplier = 1.1; // Morning commute
    } else if (hourOfDay >= 0 && hourOfDay <= 5) {
      hourMultiplier = 0.7; // Late night (low engagement)
    }

    return (dayMultipliers[dayOfWeek] || 1.0) * hourMultiplier;
  }
}

/**
 * THOMPSON SAMPLING ENGINE
 *
 * Superior to epsilon-greedy:
 * - Probability matching instead of fixed exploration rate
 * - Automatically balances exploration/exploitation
 * - Faster convergence
 * - Better handling of variance
 */
export class ThompsonSamplingEngine {

  /**
   * Get Thompson Sampling suggestion
   *
   * How it works:
   * 1. Model each variant's performance as Beta distribution
   * 2. Sample from each distribution
   * 3. Choose variant with highest sample
   * 4. Naturally explores uncertain variants, exploits good ones
   */
  static async getSuggestion(
    userId: string,
    context?: BanditContext
  ): Promise<{
    variant: ContentVariant;
    sampledValue: number;
    confidence: number;
    reason: string;
  } | null> {

    // Get all variants
    const { data: variants } = await supabase
      .from('viral_variants')
      .select('*')
      .gte('attempts', 1); // Need at least 1 attempt

    if (!variants || variants.length === 0) {
      return null;
    }

    // Apply context filtering if provided
    let filteredVariants = variants;
    if (context) {
      filteredVariants = await this.filterByContext(variants, context);
    }

    if (filteredVariants.length === 0) {
      filteredVariants = variants; // Fallback to all variants
    }

    // Calculate Beta distributions for each variant
    const distributions = await Promise.all(
      filteredVariants.map(async (v) => {
        const posterior = await this.calculatePosterior(v.id);
        return { variant: v, posterior };
      })
    );

    // Sample from each distribution
    const samples = distributions.map(({ variant, posterior }) => {
      const sample = this.sampleBeta(posterior.alpha, posterior.beta);
      return { variant, sample };
    });

    // Choose variant with highest sample
    samples.sort((a, b) => b.sample - a.sample);
    const chosen = samples[0];

    // Calculate confidence (based on posterior variance)
    const posterior = await this.calculatePosterior(chosen.variant.id);
    const confidence = this.calculateConfidence(posterior);

    // Generate reason
    const reason = this.generateThompsonReason(
      chosen.variant,
      chosen.sample,
      confidence
    );

    return {
      variant: chosen.variant as ContentVariant,
      sampledValue: chosen.sample,
      confidence,
      reason
    };
  }

  /**
   * Calculate Beta posterior distribution
   *
   * Uses share rate as success metric:
   * - alpha = number of shares + 1 (prior)
   * - beta = number of non-shares + 1 (prior)
   */
  private static async calculatePosterior(
    variantId: string
  ): Promise<BetaDistribution> {

    // Get time-windowed data (last 30 days)
    const rates = await TemporalDiscountEngine.calculateTimeWindowedRates(
      variantId,
      30
    );

    const shares = Math.round(rates.shareRate * rates.attempts);
    const nonShares = rates.attempts - shares;

    // Beta(alpha, beta) with Jeffrey's prior (0.5, 0.5)
    const alpha = shares + 0.5;
    const beta = nonShares + 0.5;

    return { alpha, beta };
  }

  /**
   * Sample from Beta distribution
   *
   * Uses Gamma distribution approximation:
   * Beta(alpha, beta) = Gamma(alpha) / (Gamma(alpha) + Gamma(beta))
   */
  private static sampleBeta(alpha: number, beta: number): number {
    const gammaA = this.sampleGamma(alpha, 1);
    const gammaB = this.sampleGamma(beta, 1);
    return gammaA / (gammaA + gammaB);
  }

  /**
   * Sample from Gamma distribution
   * Using Marsaglia and Tsang's method
   */
  private static sampleGamma(shape: number, scale: number): number {
    // Simple approximation for now
    // In production, use a proper Gamma sampler library

    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x, v;

      do {
        x = this.sampleNormal(0, 1);
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();
      const xSquared = x * x;

      if (u < 1 - 0.0331 * xSquared * xSquared) {
        return d * v * scale;
      }

      if (Math.log(u) < 0.5 * xSquared + d * (1 - v + Math.log(v))) {
        return d * v * scale;
      }
    }
  }

  /**
   * Sample from standard normal distribution (Box-Muller transform)
   */
  private static sampleNormal(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Calculate confidence from posterior
   */
  private static calculateConfidence(posterior: BetaDistribution): number {
    // Confidence increases with more data (alpha + beta)
    const n = posterior.alpha + posterior.beta;

    // Also consider variance (lower variance = higher confidence)
    const mean = posterior.alpha / n;
    const variance = (posterior.alpha * posterior.beta) / (n * n * (n + 1));

    // Normalize to 0-1 scale
    const sampleConfidence = Math.min(0.99, 1 - Math.exp(-n / 20));
    const varianceConfidence = Math.max(0, 1 - variance * 10);

    return (sampleConfidence + varianceConfidence) / 2;
  }

  /**
   * Filter variants by context (contextual bandits)
   */
  private static async filterByContext(
    variants: any[],
    context: BanditContext
  ): Promise<any[]> {

    // Get historical performance by context
    const filtered: any[] = [];

    for (const variant of variants) {
      // Check if this variant has performed well in this context
      const { data: instances } = await supabase
        .from('viral_content_instances')
        .select('shares, created_at')
        .eq('variant_id', variant.id)
        .eq('user_tier', context.userTier)
        .gte('time_of_day', context.timeOfDay - 2)
        .lte('time_of_day', context.timeOfDay + 2);

      // Include if has data in this context OR is new (exploration)
      if (!instances || instances.length === 0 || instances.length >= 2) {
        filtered.push(variant);
      }
    }

    return filtered.length > 0 ? filtered : variants;
  }

  /**
   * Generate human-readable reason for Thompson Sampling choice
   */
  private static generateThompsonReason(
    variant: any,
    sampledValue: number,
    confidence: number
  ): string {
    if (confidence > 0.8) {
      return `This variant has strong historical performance (${(sampledValue * 100).toFixed(1)}% predicted success rate). High confidence based on ${variant.attempts} previous attempts.`;
    } else if (confidence < 0.4) {
      return `Exploring this variant - limited data (${variant.attempts} attempts) but promising potential. This helps us learn what works best.`;
    } else {
      return `Good balance of performance and exploration. Predicted ${(sampledValue * 100).toFixed(1)}% success rate based on ${variant.attempts} attempts.`;
    }
  }

  /**
   * Update posterior after observing result
   * (This happens automatically via database triggers, but can be called explicitly)
   */
  static async updatePosterior(
    variantId: string,
    success: boolean
  ): Promise<void> {
    // The database triggers handle this automatically
    // when engagement is tracked via VerifiedEngagementTracker

    // This method exists for manual updates if needed
    console.log(`Posterior for variant ${variantId} updated: success=${success}`);
  }
}

/**
 * CONTEXTUAL BANDIT ENGINE
 *
 * Learns different optimal variants for different contexts
 */
export class ContextualBanditEngine {

  /**
   * Get context-aware suggestion
   */
  static async getContextualSuggestion(
    userId: string,
    context: BanditContext
  ): Promise<{
    variant: ContentVariant;
    contextMatch: number;
    reason: string;
  } | null> {

    // Use Thompson Sampling with context filtering
    const suggestion = await ThompsonSamplingEngine.getSuggestion(
      userId,
      context
    );

    if (!suggestion) {
      return null;
    }

    // Calculate context match score
    const contextMatch = await this.calculateContextMatch(
      suggestion.variant.id,
      context
    );

    // Add context to reason
    const contextReason = this.generateContextReason(context, contextMatch);
    const fullReason = `${suggestion.reason}\n\n${contextReason}`;

    return {
      variant: suggestion.variant,
      contextMatch,
      reason: fullReason
    };
  }

  /**
   * Calculate how well variant matches current context
   */
  private static async calculateContextMatch(
    variantId: string,
    context: BanditContext
  ): Promise<number> {

    // Get historical performance in this context
    const { data: contextInstances } = await supabase
      .from('viral_content_instances')
      .select('shares, attempts: id')
      .eq('variant_id', variantId)
      .eq('user_tier', context.userTier)
      .gte('time_of_day', context.timeOfDay - 2)
      .lte('time_of_day', context.timeOfDay + 2)
      .eq('day_of_week', context.dayOfWeek);

    // Get overall performance
    const { data: allInstances } = await supabase
      .from('viral_content_instances')
      .select('shares')
      .eq('variant_id', variantId);

    if (!contextInstances || !allInstances || allInstances.length === 0) {
      return 0.5; // Neutral match
    }

    const contextAvg = contextInstances.reduce((sum, i) => sum + i.shares, 0) / contextInstances.length;
    const overallAvg = allInstances.reduce((sum, i) => sum + i.shares, 0) / allInstances.length;

    if (overallAvg === 0) return 0.5;

    // Match score: how much better in this context vs overall
    const ratio = contextAvg / overallAvg;
    return Math.min(1.0, Math.max(0.0, ratio));
  }

  /**
   * Generate context-aware reason
   */
  private static generateContextReason(
    context: BanditContext,
    match: number
  ): string {
    const timeLabel = this.getTimeLabel(context.timeOfDay);
    const dayLabel = this.getDayLabel(context.dayOfWeek);
    const tierLabel = context.userTier === 'premium' ? 'premium users' : 'free users';

    if (match > 0.7) {
      return `Perfect timing! This variant performs ${((match - 0.5) * 200).toFixed(0)}% better on ${dayLabel} ${timeLabel} for ${tierLabel}.`;
    } else if (match < 0.3) {
      return `Note: This variant typically performs better at different times. Consider posting later for maximum impact.`;
    } else {
      return `Good match for ${dayLabel} ${timeLabel} and ${tierLabel}.`;
    }
  }

  private static getTimeLabel(hour: number): string {
    if (hour >= 6 && hour < 12) return 'mornings';
    if (hour >= 12 && hour < 17) return 'afternoons';
    if (hour >= 17 && hour < 22) return 'evenings';
    return 'nights';
  }

  private static getDayLabel(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'weekdays';
  }
}

/**
 * HELPER: Get current context for user
 */
export async function getCurrentContext(userId: string): Promise<BanditContext> {
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single();

  // Calculate user streak
  const { data: logins } = await supabase
    .from('user_activity_logs')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false})
    .limit(30);

  let streak = 0;
  if (logins) {
    const today = new Date();
    for (const login of logins) {
      const loginDate = new Date(login.created_at);
      const daysDiff = Math.floor((today.getTime() - loginDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }
  }

  const now = new Date();

  return {
    userTier: subscription?.status === 'active' ? 'premium' : 'free',
    platform: 'instagram', // Default, should be set by user
    timeOfDay: now.getHours(),
    dayOfWeek: now.getDay(),
    userStreak: streak,
    userEngagementLevel: streak > 30 ? 'power_user' : streak > 7 ? 'regular' : 'lurker'
  };
}

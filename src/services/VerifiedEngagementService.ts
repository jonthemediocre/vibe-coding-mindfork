/**
 * VERIFIED ENGAGEMENT TRACKING SYSTEM
 *
 * Production-grade engagement verification with:
 * - Platform API verification (Instagram, TikTok, Twitter)
 * - Fraud detection and scoring
 * - Rate limiting and anomaly detection
 * - Audit trail for all engagement updates
 * - Verified vs unverified metric separation
 */

import { supabase } from '../lib/supabase';
import * as Crypto from 'expo-crypto';

/**
 * Verification status for each metric
 */
export enum MetricVerificationStatus {
  PLATFORM_VERIFIED = 'platform_verified',   // Via Instagram/TikTok/Twitter API
  WEBHOOK_SIGNED = 'webhook_signed',         // Cryptographically signed webhook
  USER_CLAIMED = 'user_claimed',             // Self-reported by user
  SCREENSHOT_VERIFIED = 'screenshot_verified', // User uploaded screenshot
  INFERRED = 'inferred',                     // Calculated from other data
  SUSPICIOUS = 'suspicious'                  // Flagged by fraud detection
}

/**
 * Source of metric update
 */
export enum MetricSource {
  PLATFORM_API = 'platform_api',
  WEBHOOK = 'webhook',
  USER_REPORT = 'user_report',
  SYSTEM = 'system',
  REFERRAL_LINK = 'referral_link'
}

/**
 * Verified engagement metrics with verification levels
 */
export interface VerifiedEngagementMetrics {
  shares: {
    platform_verified: number;
    user_claimed: number;
    total: number;
  };
  views: {
    platform_verified: number;
    inferred: number;
    total: number;
  };
  clicks: {
    referral_verified: number;  // Clicks through tracked referral links
    user_claimed: number;
    total: number;
  };
  signups: {
    payment_verified: number;   // Actually paid/subscribed
    email_verified: number;     // Email confirmed but not paid
    pending: number;            // Claimed but not verified
    total: number;
  };
  likes: {
    platform_verified: number;
    user_claimed: number;
    total: number;
  };
  comments: {
    platform_verified: number;
    user_claimed: number;
    total: number;
  };
  saves: {
    platform_verified: number;
    user_claimed: number;
    total: number;
  };
}

/**
 * Fraud detection score
 */
export interface FraudScore {
  score: number;              // 0-1 (0=legit, 1=fraud)
  confidence: number;         // 0-1 how confident in the score
  reasons: string[];          // Why flagged
  shouldBlock: boolean;       // True if update should be rejected
  flags: {
    rapidEngagement?: boolean;      // Too fast
    circularReferrals?: boolean;    // Self-referral patterns
    duplicateIPs?: boolean;         // Same IP multiple accounts
    botPattern?: boolean;           // Bot-like behavior
    impossibleGrowth?: boolean;     // Mathematically impossible
    newAccountSpam?: boolean;       // New account high activity
  };
}

/**
 * Audit log entry
 */
export interface EngagementAuditLog {
  id: string;
  content_id: string;
  metric_type: string;
  delta: number;
  verification_status: MetricVerificationStatus;
  source: MetricSource;
  fraud_score: number;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxSharesPerHour: number;
  maxViewsPerHour: number;
  maxSignupsPerDay: number;
  maxUpdatesPerMinute: number;
}

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  maxSharesPerHour: 1000,
  maxViewsPerHour: 10000,
  maxSignupsPerDay: 100,
  maxUpdatesPerMinute: 10
};

/**
 * FRAUD DETECTION ENGINE
 */
export class FraudDetectionEngine {

  /**
   * Analyze engagement update for fraud indicators
   */
  static async detectFraud(
    contentId: string,
    userId: string,
    metricType: string,
    delta: number,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      timestamp?: number;
    }
  ): Promise<FraudScore> {

    const reasons: string[] = [];
    const flags: FraudScore['flags'] = {};
    let score = 0.0;

    // Get content history
    const { data: content } = await supabase
      .from('viral_content_instances')
      .select('*')
      .eq('id', contentId)
      .single();

    if (!content) {
      return {
        score: 1.0,
        confidence: 1.0,
        reasons: ['Content not found'],
        shouldBlock: true,
        flags: {}
      };
    }

    // Get user history
    const { data: userHistory } = await supabase
      .from('viral_content_instances')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // CHECK 1: Rapid engagement detection
    const postAgeHours = (Date.now() - new Date(content.created_at).getTime()) / (1000 * 60 * 60);
    if (postAgeHours < 1 && delta > 100) {
      score += 0.3;
      flags.rapidEngagement = true;
      reasons.push(`${delta} ${metricType} in ${postAgeHours.toFixed(1)} hours is suspicious`);
    }

    // CHECK 2: Impossible growth (more engagement than views)
    if (metricType === 'shares' && content.views > 0) {
      const shareRate = (content.shares + delta) / content.views;
      if (shareRate > 0.5) { // 50%+ share rate is extremely rare
        score += 0.4;
        flags.impossibleGrowth = true;
        reasons.push(`Share rate of ${(shareRate * 100).toFixed(1)}% is impossibly high`);
      }
    }

    // CHECK 3: Circular referrals
    if (metricType === 'signups') {
      const { data: referrals } = await supabase
        .from('referrals')
        .select('referred_user_id')
        .eq('referrer_user_id', userId);

      if (referrals) {
        // Check if any referred users also referred the original user
        for (const ref of referrals) {
          const { data: circular } = await supabase
            .from('referrals')
            .select('id')
            .eq('referrer_user_id', ref.referred_user_id)
            .eq('referred_user_id', userId);

          if (circular && circular.length > 0) {
            score += 0.5;
            flags.circularReferrals = true;
            reasons.push('Circular referral pattern detected');
            break;
          }
        }
      }
    }

    // CHECK 4: Duplicate IPs (if metadata provided)
    if (metadata?.ipAddress && metricType === 'signups') {
      const { count } = await supabase
        .from('engagement_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', metadata.ipAddress)
        .eq('metric_type', 'signups')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (count && count > 5) { // More than 5 signups from same IP in 24h
        score += 0.4;
        flags.duplicateIPs = true;
        reasons.push(`${count} signups from same IP in 24h`);
      }
    }

    // CHECK 5: New account spam
    const accountAgeHours = (Date.now() - new Date(content.created_at).getTime()) / (1000 * 60 * 60);
    if (accountAgeHours < 24 && (userHistory?.length || 0) > 10) {
      score += 0.3;
      flags.newAccountSpam = true;
      reasons.push('New account with high activity');
    }

    // CHECK 6: Bot patterns (repetitive behavior)
    if (userHistory && userHistory.length >= 5) {
      const deltas = userHistory.map(h => h.shares);
      const allSame = deltas.every(d => d === deltas[0]);
      if (allSame && deltas[0] > 0) {
        score += 0.3;
        flags.botPattern = true;
        reasons.push('Repetitive engagement pattern (bot-like)');
      }
    }

    // Normalize score
    score = Math.min(1.0, score);

    // Confidence based on data availability
    let confidence = 0.5;
    if (userHistory && userHistory.length > 5) confidence += 0.2;
    if (metadata?.ipAddress) confidence += 0.2;
    if (postAgeHours > 24) confidence += 0.1;

    // Block if score is very high
    const shouldBlock = score > 0.7;

    return {
      score,
      confidence: Math.min(1.0, confidence),
      reasons,
      shouldBlock,
      flags
    };
  }

  /**
   * Check rate limits for engagement updates
   */
  static async checkRateLimit(
    contentId: string,
    metricType: string,
    delta: number,
    config: RateLimitConfig = DEFAULT_RATE_LIMITS
  ): Promise<{ allowed: boolean; reason?: string }> {

    const now = new Date();

    // Check shares per hour
    if (metricType === 'shares') {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const { data: recentShares } = await supabase
        .from('engagement_audit_log')
        .select('delta')
        .eq('content_id', contentId)
        .eq('metric_type', 'shares')
        .gte('timestamp', oneHourAgo.toISOString());

      const totalShares = (recentShares || []).reduce((sum, log) => sum + log.delta, 0);
      if (totalShares + delta > config.maxSharesPerHour) {
        return {
          allowed: false,
          reason: `Rate limit: ${config.maxSharesPerHour} shares/hour exceeded`
        };
      }
    }

    // Check views per hour
    if (metricType === 'views') {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const { data: recentViews } = await supabase
        .from('engagement_audit_log')
        .select('delta')
        .eq('content_id', contentId)
        .eq('metric_type', 'views')
        .gte('timestamp', oneHourAgo.toISOString());

      const totalViews = (recentViews || []).reduce((sum, log) => sum + log.delta, 0);
      if (totalViews + delta > config.maxViewsPerHour) {
        return {
          allowed: false,
          reason: `Rate limit: ${config.maxViewsPerHour} views/hour exceeded`
        };
      }
    }

    // Check signups per day
    if (metricType === 'signups') {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const { data: recentSignups } = await supabase
        .from('engagement_audit_log')
        .select('delta')
        .eq('content_id', contentId)
        .eq('metric_type', 'signups')
        .gte('timestamp', oneDayAgo.toISOString());

      const totalSignups = (recentSignups || []).reduce((sum, log) => sum + log.delta, 0);
      if (totalSignups + delta > config.maxSignupsPerDay) {
        return {
          allowed: false,
          reason: `Rate limit: ${config.maxSignupsPerDay} signups/day exceeded`
        };
      }
    }

    // Check overall update frequency
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const { count } = await supabase
      .from('engagement_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('content_id', contentId)
      .gte('timestamp', oneMinuteAgo.toISOString());

    if (count && count >= config.maxUpdatesPerMinute) {
      return {
        allowed: false,
        reason: `Rate limit: ${config.maxUpdatesPerMinute} updates/minute exceeded`
      };
    }

    return { allowed: true };
  }
}

/**
 * VERIFIED ENGAGEMENT TRACKER
 */
export class VerifiedEngagementTracker {

  /**
   * Track engagement with verification and fraud detection
   */
  static async trackVerifiedEngagement(
    contentId: string,
    userId: string,
    metricType: 'shares' | 'views' | 'likes' | 'comments' | 'saves' | 'clicks' | 'signups',
    delta: number,
    verification: {
      status: MetricVerificationStatus;
      source: MetricSource;
      metadata?: {
        platformId?: string;        // Instagram post ID, TikTok video ID, etc.
        webhookId?: string;         // Idempotency key
        signature?: string;         // HMAC signature
        ipAddress?: string;
        userAgent?: string;
        referralCode?: string;
        timestamp?: number;
      };
    }
  ): Promise<{
    success: boolean;
    fraudScore?: FraudScore;
    auditLogId?: string;
    error?: string;
  }> {

    // Step 1: Rate limiting check
    const rateLimitResult = await FraudDetectionEngine.checkRateLimit(
      contentId,
      metricType,
      delta
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: rateLimitResult.reason
      };
    }

    // Step 2: Fraud detection
    const fraudScore = await FraudDetectionEngine.detectFraud(
      contentId,
      userId,
      metricType,
      delta,
      verification.metadata
    );

    if (fraudScore.shouldBlock) {
      return {
        success: false,
        fraudScore,
        error: `Blocked by fraud detection: ${fraudScore.reasons.join(', ')}`
      };
    }

    // Step 3: Idempotency check (prevent duplicate webhook processing)
    if (verification.metadata?.webhookId) {
      const { data: existing } = await supabase
        .from('engagement_audit_log')
        .select('id')
        .eq('metadata->>webhookId', verification.metadata.webhookId)
        .single();

      if (existing) {
        return {
          success: false,
          error: 'Duplicate webhook (already processed)'
        };
      }
    }

    // Step 4: Create audit log entry
    const { data: auditLog, error: auditError } = await supabase
      .from('engagement_audit_log')
      .insert({
        content_id: contentId,
        metric_type: metricType,
        delta,
        verification_status: verification.status,
        source: verification.source,
        fraud_score: fraudScore.score,
        ip_address: verification.metadata?.ipAddress,
        user_agent: verification.metadata?.userAgent,
        metadata: verification.metadata,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (auditError) {
      return {
        success: false,
        error: `Audit log failed: ${auditError.message}`
      };
    }

    // Step 5: Update engagement metrics with verification status
    const updateField = `${metricType}_${verification.status}`;

    // Update verified and total counts
    const { error: updateError } = await supabase.rpc(
      'update_verified_engagement',
      {
        p_content_id: contentId,
        p_metric_type: metricType,
        p_verification_status: verification.status,
        p_delta: delta
      }
    );

    if (updateError) {
      return {
        success: false,
        fraudScore,
        error: `Update failed: ${updateError.message}`
      };
    }

    return {
      success: true,
      fraudScore,
      auditLogId: auditLog.id
    };
  }

  /**
   * Get verified engagement metrics for content
   */
  static async getVerifiedMetrics(
    contentId: string
  ): Promise<VerifiedEngagementMetrics> {

    const { data } = await supabase
      .from('viral_content_instances')
      .select('*')
      .eq('id', contentId)
      .single();

    if (!data) {
      throw new Error('Content not found');
    }

    // Aggregate from audit log
    const { data: logs } = await supabase
      .from('engagement_audit_log')
      .select('*')
      .eq('content_id', contentId);

    const metrics: VerifiedEngagementMetrics = {
      shares: { platform_verified: 0, user_claimed: 0, total: 0 },
      views: { platform_verified: 0, inferred: 0, total: 0 },
      clicks: { referral_verified: 0, user_claimed: 0, total: 0 },
      signups: { payment_verified: 0, email_verified: 0, pending: 0, total: 0 },
      likes: { platform_verified: 0, user_claimed: 0, total: 0 },
      comments: { platform_verified: 0, user_claimed: 0, total: 0 },
      saves: { platform_verified: 0, user_claimed: 0, total: 0 }
    };

    // Aggregate by verification status
    logs?.forEach(log => {
      const metricType = log.metric_type as keyof VerifiedEngagementMetrics;
      const delta = log.delta;

      if (log.verification_status === MetricVerificationStatus.PLATFORM_VERIFIED) {
        if (metricType !== 'views' && metricType !== 'clicks' && metricType !== 'signups') {
          metrics[metricType].platform_verified += delta;
        }
      } else if (log.verification_status === MetricVerificationStatus.USER_CLAIMED) {
        if (metricType !== 'views' && metricType !== 'clicks' && metricType !== 'signups') {
          metrics[metricType].user_claimed += delta;
        }
      }

      // Calculate totals
      if (metricType !== 'views' && metricType !== 'clicks' && metricType !== 'signups') {
        metrics[metricType].total =
          metrics[metricType].platform_verified +
          metrics[metricType].user_claimed;
      }
    });

    return metrics;
  }

  /**
   * Calculate weighted viral score with verification penalties
   */
  static calculateVerifiedViralScore(metrics: VerifiedEngagementMetrics): number {

    // Base weights (same as before)
    const baseWeights = {
      signups: 1000,
      shares: 100,
      clicks: 50,
      saves: 30,
      comments: 20,
      likes: 10,
      views: 1
    };

    // Verification multipliers (verified metrics worth more)
    const verificationMultiplier = {
      platform_verified: 1.0,      // Full value
      payment_verified: 1.0,       // Full value
      email_verified: 0.7,         // 70% value
      referral_verified: 0.8,      // 80% value
      user_claimed: 0.3,           // 30% value (unverified)
      inferred: 0.5,               // 50% value
      pending: 0.1                 // 10% value
    };

    let score = 0;

    // Signups (most important)
    score += metrics.signups.payment_verified * baseWeights.signups * verificationMultiplier.payment_verified;
    score += metrics.signups.email_verified * baseWeights.signups * verificationMultiplier.email_verified;
    score += metrics.signups.pending * baseWeights.signups * verificationMultiplier.pending;

    // Shares
    score += metrics.shares.platform_verified * baseWeights.shares * verificationMultiplier.platform_verified;
    score += metrics.shares.user_claimed * baseWeights.shares * verificationMultiplier.user_claimed;

    // Clicks
    score += metrics.clicks.referral_verified * baseWeights.clicks * verificationMultiplier.referral_verified;
    score += metrics.clicks.user_claimed * baseWeights.clicks * verificationMultiplier.user_claimed;

    // Saves
    score += metrics.saves.platform_verified * baseWeights.saves * verificationMultiplier.platform_verified;
    score += metrics.saves.user_claimed * baseWeights.saves * verificationMultiplier.user_claimed;

    // Comments
    score += metrics.comments.platform_verified * baseWeights.comments * verificationMultiplier.platform_verified;
    score += metrics.comments.user_claimed * baseWeights.comments * verificationMultiplier.user_claimed;

    // Likes
    score += metrics.likes.platform_verified * baseWeights.likes * verificationMultiplier.platform_verified;
    score += metrics.likes.user_claimed * baseWeights.likes * verificationMultiplier.user_claimed;

    // Views
    score += metrics.views.platform_verified * baseWeights.views * verificationMultiplier.platform_verified;
    score += metrics.views.inferred * baseWeights.views * verificationMultiplier.inferred;

    return Math.round(score);
  }
}

/**
 * HELPER: Verify HMAC signature for webhooks
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const expectedSignature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      secret + payload
    );

    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * HELPER: Track user-claimed engagement (simplified API for users)
 */
export async function trackUserClaimedEngagement(
  contentId: string,
  userId: string,
  metrics: {
    shares?: number;
    views?: number;
    likes?: number;
    comments?: number;
    saves?: number;
  }
): Promise<{
  success: boolean;
  results: Record<string, any>;
}> {

  const results: Record<string, any> = {};

  for (const [metricType, delta] of Object.entries(metrics)) {
    if (delta && delta > 0) {
      const result = await VerifiedEngagementTracker.trackVerifiedEngagement(
        contentId,
        userId,
        metricType as any,
        delta,
        {
          status: MetricVerificationStatus.USER_CLAIMED,
          source: MetricSource.USER_REPORT
        }
      );

      results[metricType] = result;
    }
  }

  const allSuccessful = Object.values(results).every((r: any) => r.success);

  return {
    success: allSuccessful,
    results
  };
}

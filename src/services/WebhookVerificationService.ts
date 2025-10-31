/**
 * WEBHOOK VERIFICATION INFRASTRUCTURE
 *
 * Handles incoming webhooks from social media platforms to verify engagement
 * Supports: Instagram, TikTok, Twitter/X, custom platforms
 *
 * Features:
 * - HMAC signature verification
 * - Idempotency protection
 * - Replay attack prevention
 * - Platform-specific parsing
 * - Automatic engagement tracking
 */

import { supabase } from '../lib/supabase';
import {
  VerifiedEngagementTracker,
  MetricVerificationStatus,
  MetricSource,
  verifyWebhookSignature
} from './VerifiedEngagementService';

/**
 * Platform types
 */
export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  TWITTER = 'twitter',
  YOUTUBE = 'youtube',
  FACEBOOK = 'facebook',
  CUSTOM = 'custom'
}

/**
 * Webhook event types
 */
export enum WebhookEventType {
  SHARE = 'share',
  VIEW = 'view',
  LIKE = 'like',
  COMMENT = 'comment',
  SAVE = 'save',
  CLICK = 'click',
  SIGNUP = 'signup'
}

/**
 * Webhook payload (platform-agnostic)
 */
export interface WebhookPayload {
  event_type: WebhookEventType;
  platform: SocialPlatform;
  platform_post_id: string;       // Instagram post ID, TikTok video ID, etc.
  platform_user_id?: string;      // Who engaged
  content_id?: string;            // Our internal content ID (if provided)
  referral_code?: string;         // Extracted from post caption/link
  metrics?: {
    shares?: number;
    views?: number;
    likes?: number;
    comments?: number;
    saves?: number;
  };
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Webhook verification result
 */
interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
  contentId?: string;
  userId?: string;
}

/**
 * WEBHOOK HANDLER
 */
export class WebhookHandler {

  /**
   * Process incoming webhook from social platform
   */
  static async handleWebhook(
    platform: SocialPlatform,
    rawPayload: string,
    signature: string,
    headers: Record<string, string>
  ): Promise<{
    success: boolean;
    error?: string;
    processed?: {
      contentId: string;
      metrics: Record<string, number>;
    };
  }> {

    // Step 1: Get platform secret
    const secret = await this.getPlatformSecret(platform);
    if (!secret) {
      return {
        success: false,
        error: `No webhook secret configured for ${platform}`
      };
    }

    // Step 2: Verify signature
    const signatureValid = await verifyWebhookSignature(
      rawPayload,
      signature,
      secret
    );

    if (!signatureValid) {
      console.error(`Invalid webhook signature from ${platform}`);
      return {
        success: false,
        error: 'Invalid webhook signature'
      };
    }

    // Step 3: Parse payload
    let payload: WebhookPayload;
    try {
      const parsed = JSON.parse(rawPayload);
      payload = await this.parsePlatformPayload(platform, parsed);
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return {
        success: false,
        error: 'Invalid payload format'
      };
    }

    // Step 4: Verify webhook (check timestamp, idempotency, etc.)
    const verification = await this.verifyWebhook(payload, headers);
    if (!verification.valid) {
      return {
        success: false,
        error: verification.reason || 'Webhook verification failed'
      };
    }

    // Step 5: Map to our content
    const { contentId, userId } = verification;
    if (!contentId || !userId) {
      return {
        success: false,
        error: 'Could not map webhook to content'
      };
    }

    // Step 6: Track engagement
    const processedMetrics: Record<string, number> = {};

    if (payload.metrics) {
      for (const [metricType, value] of Object.entries(payload.metrics)) {
        if (value && value > 0) {
          const result = await VerifiedEngagementTracker.trackVerifiedEngagement(
            contentId,
            userId,
            metricType as any,
            value,
            {
              status: MetricVerificationStatus.PLATFORM_VERIFIED,
              source: MetricSource.WEBHOOK,
              metadata: {
                platformId: payload.platform_post_id,
                webhookId: this.generateWebhookId(payload),
                signature,
                timestamp: payload.timestamp
              }
            }
          );

          if (result.success) {
            processedMetrics[metricType] = value;
          } else {
            console.error(`Failed to track ${metricType}:`, result.error);
          }
        }
      }
    }

    return {
      success: true,
      processed: {
        contentId,
        metrics: processedMetrics
      }
    };
  }

  /**
   * Parse platform-specific webhook payload
   */
  private static async parsePlatformPayload(
    platform: SocialPlatform,
    raw: any
  ): Promise<WebhookPayload> {

    switch (platform) {
      case SocialPlatform.INSTAGRAM:
        return this.parseInstagramWebhook(raw);

      case SocialPlatform.TIKTOK:
        return this.parseTikTokWebhook(raw);

      case SocialPlatform.TWITTER:
        return this.parseTwitterWebhook(raw);

      case SocialPlatform.YOUTUBE:
        return this.parseYouTubeWebhook(raw);

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Parse Instagram webhook (Meta Graph API format)
   */
  private static parseInstagramWebhook(raw: any): WebhookPayload {
    // Instagram sends updates in this format:
    // {
    //   object: 'instagram',
    //   entry: [{
    //     id: 'instagram_user_id',
    //     time: 1234567890,
    //     changes: [{
    //       field: 'media',
    //       value: {
    //         media_id: '123456789',
    //         like_count: 45,
    //         comment_count: 12
    //       }
    //     }]
    //   }]
    // }

    const entry = raw.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.media_id) {
      throw new Error('Invalid Instagram webhook: missing media_id');
    }

    return {
      event_type: WebhookEventType.VIEW, // Generic event
      platform: SocialPlatform.INSTAGRAM,
      platform_post_id: value.media_id,
      platform_user_id: entry.id,
      metrics: {
        likes: value.like_count,
        comments: value.comment_count,
        saves: value.saved_count
      },
      timestamp: entry.time * 1000,
      metadata: raw
    };
  }

  /**
   * Parse TikTok webhook
   */
  private static parseTikTokWebhook(raw: any): WebhookPayload {
    // TikTok webhook format:
    // {
    //   event: 'video.published',
    //   video: {
    //     id: 'video_id',
    //     share_count: 123,
    //     view_count: 1234,
    //     like_count: 45
    //   },
    //   timestamp: 1234567890
    // }

    if (!raw.video?.id) {
      throw new Error('Invalid TikTok webhook: missing video id');
    }

    return {
      event_type: this.mapTikTokEvent(raw.event),
      platform: SocialPlatform.TIKTOK,
      platform_post_id: raw.video.id,
      metrics: {
        shares: raw.video.share_count,
        views: raw.video.view_count,
        likes: raw.video.like_count,
        comments: raw.video.comment_count
      },
      timestamp: raw.timestamp * 1000,
      metadata: raw
    };
  }

  /**
   * Parse Twitter/X webhook
   */
  private static parseTwitterWebhook(raw: any): WebhookPayload {
    // Twitter webhook format:
    // {
    //   tweet_id: '123456789',
    //   event_type: 'retweet',
    //   user_id: 'twitter_user_id',
    //   timestamp: 1234567890,
    //   public_metrics: {
    //     retweet_count: 12,
    //     like_count: 45,
    //     reply_count: 3
    //   }
    // }

    if (!raw.tweet_id) {
      throw new Error('Invalid Twitter webhook: missing tweet_id');
    }

    return {
      event_type: this.mapTwitterEvent(raw.event_type),
      platform: SocialPlatform.TWITTER,
      platform_post_id: raw.tweet_id,
      platform_user_id: raw.user_id,
      metrics: {
        shares: raw.public_metrics?.retweet_count,
        likes: raw.public_metrics?.like_count,
        comments: raw.public_metrics?.reply_count
      },
      timestamp: raw.timestamp * 1000,
      metadata: raw
    };
  }

  /**
   * Parse YouTube webhook
   */
  private static parseYouTubeWebhook(raw: any): WebhookPayload {
    // YouTube webhook format (PubSubHubbub):
    // {
    //   video_id: 'abc123',
    //   channel_id: 'channel_id',
    //   published_at: '2024-01-01T00:00:00Z',
    //   statistics: {
    //     viewCount: '1234',
    //     likeCount: '45',
    //     commentCount: '12'
    //   }
    // }

    if (!raw.video_id) {
      throw new Error('Invalid YouTube webhook: missing video_id');
    }

    return {
      event_type: WebhookEventType.VIEW,
      platform: SocialPlatform.YOUTUBE,
      platform_post_id: raw.video_id,
      platform_user_id: raw.channel_id,
      metrics: {
        views: parseInt(raw.statistics?.viewCount || '0'),
        likes: parseInt(raw.statistics?.likeCount || '0'),
        comments: parseInt(raw.statistics?.commentCount || '0')
      },
      timestamp: new Date(raw.published_at).getTime(),
      metadata: raw
    };
  }

  /**
   * Verify webhook is valid (not replay attack, not duplicate, etc.)
   */
  private static async verifyWebhook(
    payload: WebhookPayload,
    headers: Record<string, string>
  ): Promise<WebhookVerificationResult> {

    // Check 1: Timestamp is recent (within 5 minutes)
    const now = Date.now();
    const age = now - payload.timestamp;
    if (age > 5 * 60 * 1000) { // 5 minutes
      return {
        valid: false,
        reason: 'Webhook timestamp too old (possible replay attack)'
      };
    }

    // Check 2: Idempotency - ensure we haven't processed this webhook before
    const webhookId = this.generateWebhookId(payload);
    const { data: existing } = await supabase
      .from('engagement_audit_log')
      .select('id')
      .eq('metadata->>webhookId', webhookId)
      .single();

    if (existing) {
      return {
        valid: false,
        reason: 'Duplicate webhook (already processed)'
      };
    }

    // Check 3: Map platform post to our content
    const mapping = await this.mapPlatformPostToContent(
      payload.platform,
      payload.platform_post_id,
      payload.referral_code
    );

    if (!mapping) {
      return {
        valid: false,
        reason: 'Could not map platform post to our content'
      };
    }

    return {
      valid: true,
      contentId: mapping.contentId,
      userId: mapping.userId
    };
  }

  /**
   * Map platform post ID to our internal content ID
   */
  private static async mapPlatformPostToContent(
    platform: SocialPlatform,
    platformPostId: string,
    referralCode?: string
  ): Promise<{ contentId: string; userId: string } | null> {

    // Strategy 1: Look up by platform post ID (if user stored it)
    const { data: byPlatformId } = await supabase
      .from('viral_content_instances')
      .select('id, user_id')
      .eq('platform', platform)
      .eq('metadata->>platformPostId', platformPostId)
      .single();

    if (byPlatformId) {
      return {
        contentId: byPlatformId.id,
        userId: byPlatformId.user_id
      };
    }

    // Strategy 2: Look up by referral code (extracted from caption/link)
    if (referralCode) {
      const { data: byReferral } = await supabase
        .from('viral_content_instances')
        .select('id, user_id')
        .eq('referral_code', referralCode)
        .single();

      if (byReferral) {
        return {
          contentId: byReferral.id,
          userId: byReferral.user_id
        };
      }
    }

    // Strategy 3: Fuzzy matching by timestamp + platform
    // (Post was created within 1 hour of webhook timestamp)
    const webhookTime = new Date();
    const oneHourBefore = new Date(webhookTime.getTime() - 60 * 60 * 1000);
    const oneHourAfter = new Date(webhookTime.getTime() + 60 * 60 * 1000);

    const { data: byTimestamp } = await supabase
      .from('viral_content_instances')
      .select('id, user_id')
      .eq('platform', platform)
      .gte('posted_at', oneHourBefore.toISOString())
      .lte('posted_at', oneHourAfter.toISOString())
      .order('posted_at', { ascending: false })
      .limit(1)
      .single();

    if (byTimestamp) {
      return {
        contentId: byTimestamp.id,
        userId: byTimestamp.user_id
      };
    }

    return null;
  }

  /**
   * Generate unique webhook ID for idempotency
   */
  private static generateWebhookId(payload: WebhookPayload): string {
    return `${payload.platform}_${payload.platform_post_id}_${payload.timestamp}_${payload.event_type}`;
  }

  /**
   * Get webhook secret for platform
   */
  private static async getPlatformSecret(
    platform: SocialPlatform
  ): Promise<string | null> {
    // In production, store these in environment variables or secure key vault
    const secrets: Record<SocialPlatform, string | undefined> = {
      [SocialPlatform.INSTAGRAM]: process.env.INSTAGRAM_WEBHOOK_SECRET,
      [SocialPlatform.TIKTOK]: process.env.TIKTOK_WEBHOOK_SECRET,
      [SocialPlatform.TWITTER]: process.env.TWITTER_WEBHOOK_SECRET,
      [SocialPlatform.YOUTUBE]: process.env.YOUTUBE_WEBHOOK_SECRET,
      [SocialPlatform.FACEBOOK]: process.env.FACEBOOK_WEBHOOK_SECRET,
      [SocialPlatform.CUSTOM]: process.env.CUSTOM_WEBHOOK_SECRET
    };

    return secrets[platform] || null;
  }

  /**
   * Map TikTok event to our event type
   */
  private static mapTikTokEvent(tiktokEvent: string): WebhookEventType {
    const mapping: Record<string, WebhookEventType> = {
      'video.published': WebhookEventType.VIEW,
      'video.shared': WebhookEventType.SHARE,
      'video.liked': WebhookEventType.LIKE,
      'video.commented': WebhookEventType.COMMENT
    };
    return mapping[tiktokEvent] || WebhookEventType.VIEW;
  }

  /**
   * Map Twitter event to our event type
   */
  private static mapTwitterEvent(twitterEvent: string): WebhookEventType {
    const mapping: Record<string, WebhookEventType> = {
      'retweet': WebhookEventType.SHARE,
      'like': WebhookEventType.LIKE,
      'reply': WebhookEventType.COMMENT,
      'impression': WebhookEventType.VIEW
    };
    return mapping[twitterEvent] || WebhookEventType.VIEW;
  }
}

/**
 * PLATFORM API VERIFICATION
 *
 * Proactively fetch engagement from platform APIs (not just webhooks)
 */
export class PlatformAPIVerifier {

  /**
   * Verify Instagram post engagement via Graph API
   */
  static async verifyInstagramPost(
    accessToken: string,
    mediaId: string
  ): Promise<{
    likes: number;
    comments: number;
    saves: number;
    shares: number;
  } | null> {

    try {
      const response = await fetch(
        `https://graph.instagram.com/${mediaId}?fields=like_count,comments_count,saved_count,shares_count&access_token=${accessToken}`
      );

      if (!response.ok) {
        console.error('Instagram API error:', await response.text());
        return null;
      }

      const data = await response.json();

      return {
        likes: data.like_count || 0,
        comments: data.comments_count || 0,
        saves: data.saved_count || 0,
        shares: data.shares_count || 0
      };
    } catch (error) {
      console.error('Failed to verify Instagram post:', error);
      return null;
    }
  }

  /**
   * Verify TikTok video engagement via TikTok API
   */
  static async verifyTikTokVideo(
    accessToken: string,
    videoId: string
  ): Promise<{
    views: number;
    likes: number;
    comments: number;
    shares: number;
  } | null> {

    try {
      const response = await fetch(
        `https://open-api.tiktok.com/video/query/?video_id=${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        console.error('TikTok API error:', await response.text());
        return null;
      }

      const data = await response.json();
      const video = data.data?.video;

      return {
        views: video?.view_count || 0,
        likes: video?.like_count || 0,
        comments: video?.comment_count || 0,
        shares: video?.share_count || 0
      };
    } catch (error) {
      console.error('Failed to verify TikTok video:', error);
      return null;
    }
  }

  /**
   * Verify Twitter/X post engagement via Twitter API v2
   */
  static async verifyTwitterPost(
    bearerToken: string,
    tweetId: string
  ): Promise<{
    likes: number;
    retweets: number;
    replies: number;
  } | null> {

    try {
      const response = await fetch(
        `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`
          }
        }
      );

      if (!response.ok) {
        console.error('Twitter API error:', await response.text());
        return null;
      }

      const data = await response.json();
      const metrics = data.data?.public_metrics;

      return {
        likes: metrics?.like_count || 0,
        retweets: metrics?.retweet_count || 0,
        replies: metrics?.reply_count || 0
      };
    } catch (error) {
      console.error('Failed to verify Twitter post:', error);
      return null;
    }
  }
}

/**
 * HELPER: Store platform post mapping for future webhook verification
 */
export async function storePlatformPostMapping(
  contentId: string,
  platform: SocialPlatform,
  platformPostId: string,
  platformUrl?: string
): Promise<void> {

  await supabase
    .from('viral_content_instances')
    .update({
      platform,
      metadata: {
        platformPostId,
        platformUrl,
        mappedAt: new Date().toISOString()
      }
    })
    .eq('id', contentId);
}

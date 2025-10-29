import { supabase } from '@/lib/supabase';
import type { ApiResponse } from '../types/models';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

// =====================================================================
// TYPE DEFINITIONS
// =====================================================================

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  tier: 'free' | 'premium' | 'savage';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
  created_at: string;
  updated_at?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'free' | 'premium' | 'savage';
  description: string;
  features: string[];
  limitations?: string[];
  price: {
    monthly: number;
    yearly: number;
  };
  stripe_price_ids: {
    monthly: string;
    yearly: string;
  };
  color: string;
  popular?: boolean;
  webOnly?: boolean;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  type: 'card' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  stripe_invoice_id: string;
  amount_paid: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  pdf_url?: string;
  invoice_date: string;
  created_at: string;
}

export interface UsageMetrics {
  user_id: string;
  period: 'current' | 'lifetime';
  food_photos_count: number;
  food_photos_limit?: number;
  ai_messages_count: number;
  ai_messages_limit?: number;
  meal_plans_count: number;
  analytics_points: number;
  phone_coaching_sessions?: number;
  phone_coaching_limit?: number;
}

export interface CheckoutSession {
  sessionId: string;
  clientSecret: string;
  subscriptionId?: string;
  status: string;
}

// =====================================================================
// SUBSCRIPTION PLANS CONFIGURATION
// =====================================================================

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tier: 'free',
    description: 'Perfect for getting started',
    features: [
      'Basic food logging (5 photos/day)',
      'Simple AI responses (10 messages/day)',
      'Basic nutrition insights',
      'Community access',
      'Mobile app access',
    ],
    limitations: [
      'Limited daily interactions',
      'Basic analytics only',
      'No meal planning',
      'No phone coaching',
    ],
    price: { monthly: 0, yearly: 0 },
    stripe_price_ids: { monthly: '', yearly: '' },
    color: '#9E9E9E',
  },
  {
    id: 'premium',
    name: 'Premium',
    tier: 'premium',
    description: 'Advanced nutrition coaching',
    popular: true,
    features: [
      'Unlimited food logging',
      'Advanced AI conversations',
      'Detailed analytics and trends',
      'Meal planning and recipes',
      'Progress tracking',
      'Priority customer support',
      'Web dashboard access',
    ],
    price: { monthly: 9.99, yearly: 99.99 },
    stripe_price_ids: {
      monthly: ENV.EXPO_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID || '',
      yearly: ENV.EXPO_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID || '',
    },
    color: '#FFA8D2',
  },
  {
    id: 'savage',
    name: 'Savage Mode',
    tier: 'savage',
    description: "Truth Hurts, Results Don't",
    webOnly: true,
    features: [
      'Everything from Premium',
      'Savage Mode AI (web exclusive)',
      'Monthly phone coaching sessions',
      'Advanced meal planning',
      'Custom workout integration',
      'VIP community access',
      'Early feature access',
      'Brutally honest feedback',
    ],
    price: { monthly: 19.99, yearly: 199.99 },
    stripe_price_ids: { monthly: '', yearly: '' },
    color: '#FF6B35',
  },
];

// =====================================================================
// SUBSCRIPTION SERVICE
// =====================================================================

export class SubscriptionService {
  /**
   * Get current subscription for user
   */
  static async getCurrentSubscription(userId: string): Promise<ApiResponse<Subscription>> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned"
        return { error: error.message };
      }

      if (!data) {
        // Return free tier default
        return {
          data: {
            id: 'free-default',
            user_id: userId,
            stripe_subscription_id: '',
            stripe_customer_id: '',
            tier: 'free',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: false,
            created_at: new Date().toISOString(),
          },
        };
      }

      return { data };
    } catch (err) {
      logger.error('Get current subscription error', err);
      return { error: err instanceof Error ? err.message : 'Failed to fetch subscription' };
    }
  }

  /**
   * Get all available subscription plans
   */
  static async getAvailablePlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    try {
      // Return static plans configuration
      return { data: SUBSCRIPTION_PLANS };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch plans' };
    }
  }

  /**
   * Create Stripe checkout session for subscription
   */
  static async createCheckout(
    userId: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<ApiResponse<CheckoutSession>> {
    try {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      if (!plan) {
        return { error: 'Invalid plan selected' };
      }

      const priceId = plan.stripe_price_ids[billingCycle];
      if (!priceId) {
        return { error: 'Price not configured for this plan' };
      }

      // Call Supabase edge function to create Stripe checkout
      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: {
          userId,
          priceId,
          planId,
          billingCycle,
        },
      });

      if (error) {
        logger.error('Create checkout error', error);
        return { error: 'Failed to create checkout session' };
      }

      return { data };
    } catch (err) {
      logger.error('Create checkout exception', err);
      return { error: err instanceof Error ? err.message : 'Failed to create checkout' };
    }
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  static async updateSubscription(
    userId: string,
    newPlanId: string,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<ApiResponse<Subscription>> {
    try {
      const currentSub = await this.getCurrentSubscription(userId);
      if (currentSub.error || !currentSub.data) {
        return { error: 'No active subscription found' };
      }

      const newPlan = SUBSCRIPTION_PLANS.find((p) => p.id === newPlanId);
      if (!newPlan) {
        return { error: 'Invalid plan selected' };
      }

      const newPriceId = newPlan.stripe_price_ids[billingCycle];
      if (!newPriceId) {
        return { error: 'Price not configured' };
      }

      // Call edge function to update subscription
      const { data, error } = await supabase.functions.invoke('stripe-update-subscription', {
        body: {
          userId,
          subscriptionId: currentSub.data.stripe_subscription_id,
          newPriceId,
          newTier: newPlan.tier,
        },
      });

      if (error) {
        logger.error('Update subscription error', error);
        return { error: 'Failed to update subscription' };
      }

      return { data };
    } catch (err) {
      logger.error('Update subscription exception', err);
      return { error: err instanceof Error ? err.message : 'Failed to update subscription' };
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(
    userId: string,
    reason?: string,
    immediately = false
  ): Promise<ApiResponse<Subscription>> {
    try {
      const currentSub = await this.getCurrentSubscription(userId);
      if (currentSub.error || !currentSub.data) {
        return { error: 'No active subscription found' };
      }

      const { data, error } = await supabase.functions.invoke('stripe-cancel-subscription', {
        body: {
          userId,
          subscriptionId: currentSub.data.stripe_subscription_id,
          immediately,
          reason,
        },
      });

      if (error) {
        logger.error('Cancel subscription error', error);
        return { error: 'Failed to cancel subscription' };
      }

      // Update local subscription record
      const { data: updated, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: !immediately,
          canceled_at: immediately ? new Date().toISOString() : null,
          status: immediately ? 'canceled' : 'active',
        })
        .eq('id', currentSub.data.id)
        .select()
        .single();

      if (updateError) {
        logger.error('Update local subscription error', updateError);
      }

      return { data: updated || data };
    } catch (err) {
      logger.error('Cancel subscription exception', err);
      return { error: err instanceof Error ? err.message : 'Failed to cancel subscription' };
    }
  }

  /**
   * Get payment methods for user
   */
  static async getPaymentMethods(userId: string): Promise<ApiResponse<PaymentMethod[]>> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      logger.error('Get payment methods error', err);
      return { error: err instanceof Error ? err.message : 'Failed to fetch payment methods' };
    }
  }

  /**
   * Add payment method
   */
  static async addPaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<ApiResponse<PaymentMethod>> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-attach-payment-method', {
        body: {
          userId,
          paymentMethodId,
        },
      });

      if (error) {
        logger.error('Add payment method error', error);
        return { error: 'Failed to add payment method' };
      }

      // Insert into payment_methods table
      const { data: inserted, error: insertError } = await supabase
        .from('payment_methods')
        .insert({
          user_id: userId,
          stripe_payment_method_id: paymentMethodId,
          type: data.type || 'card',
          last4: data.last4,
          brand: data.brand,
          exp_month: data.exp_month,
          exp_year: data.exp_year,
          is_default: data.is_default || false,
        })
        .select()
        .single();

      if (insertError) {
        logger.error('Insert payment method error', insertError);
        return { error: insertError.message };
      }

      return { data: inserted };
    } catch (err) {
      logger.error('Add payment method exception', err);
      return { error: err instanceof Error ? err.message : 'Failed to add payment method' };
    }
  }

  /**
   * Remove payment method
   */
  static async removePaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<ApiResponse<void>> {
    try {
      // Call edge function to detach from Stripe
      const { error: detachError } = await supabase.functions.invoke(
        'stripe-detach-payment-method',
        {
          body: {
            userId,
            paymentMethodId,
          },
        }
      );

      if (detachError) {
        logger.error('Detach payment method error', detachError);
      }

      // Delete from database
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('stripe_payment_method_id', paymentMethodId)
        .eq('user_id', userId);

      if (error) {
        return { error: error.message };
      }

      return { message: 'Payment method removed successfully' };
    } catch (err) {
      logger.error('Remove payment method exception', err);
      return { error: err instanceof Error ? err.message : 'Failed to remove payment method' };
    }
  }

  /**
   * Get invoices for user
   */
  static async getInvoices(userId: string, limit = 20): Promise<ApiResponse<Invoice[]>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('invoice_date', { ascending: false })
        .limit(limit);

      if (error) {
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      logger.error('Get invoices error', err);
      return { error: err instanceof Error ? err.message : 'Failed to fetch invoices' };
    }
  }

  /**
   * Get usage metrics for user
   */
  static async getUsageMetrics(
    userId: string,
    period: 'current' | 'lifetime' = 'current'
  ): Promise<ApiResponse<UsageMetrics>> {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get current subscription to determine limits
      const currentSub = await this.getCurrentSubscription(userId);
      const tier = currentSub.data?.tier || 'free';

      // Define limits based on tier
      const limits = {
        free: {
          food_photos_limit: 150, // 5 per day * 30 days
          ai_messages_limit: 300, // 10 per day * 30 days
          phone_coaching_limit: 0,
        },
        premium: {
          food_photos_limit: undefined, // unlimited
          ai_messages_limit: undefined, // unlimited
          phone_coaching_limit: undefined, // unlimited
        },
        savage: {
          food_photos_limit: undefined, // unlimited
          ai_messages_limit: undefined, // unlimited
          phone_coaching_limit: undefined, // unlimited
        },
      };

      const tierLimits = limits[tier];

      // Count food photos
      let foodPhotosQuery = supabase
        .from('food_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (period === 'current') {
        foodPhotosQuery = foodPhotosQuery.gte('logged_at', startOfMonth.toISOString());
      }

      const { count: foodPhotosCount, error: foodError } = await foodPhotosQuery;

      if (foodError) {
        logger.error('Count food photos error', foodError);
      }

      // Count AI messages
      let aiMessagesQuery = supabase
        .from('coach_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('role', 'user');

      if (period === 'current') {
        aiMessagesQuery = aiMessagesQuery.gte('created_at', startOfMonth.toISOString());
      }

      const { count: aiMessagesCount, error: messagesError } = await aiMessagesQuery;

      if (messagesError) {
        logger.error('Count AI messages error', messagesError);
      }

      // Count meal plans
      const { count: mealPlansCount, error: mealPlansError } = await supabase
        .from('meal_plans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (mealPlansError) {
        logger.error('Count meal plans error', mealPlansError);
      }

      // Count phone coaching sessions
      const { count: phoneSessionsCount, error: phoneError } = await supabase
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (phoneError) {
        logger.error('Count phone sessions error', phoneError);
      }

      const metrics: UsageMetrics = {
        user_id: userId,
        period,
        food_photos_count: foodPhotosCount || 0,
        food_photos_limit: tierLimits.food_photos_limit,
        ai_messages_count: aiMessagesCount || 0,
        ai_messages_limit: tierLimits.ai_messages_limit,
        meal_plans_count: mealPlansCount || 0,
        analytics_points: (foodPhotosCount || 0) + (aiMessagesCount || 0) * 2,
        phone_coaching_sessions: phoneSessionsCount || 0,
        phone_coaching_limit: tierLimits.phone_coaching_limit,
      };

      return { data: metrics };
    } catch (err) {
      logger.error('Get usage metrics exception', err);
      return { error: err instanceof Error ? err.message : 'Failed to fetch usage metrics' };
    }
  }
}

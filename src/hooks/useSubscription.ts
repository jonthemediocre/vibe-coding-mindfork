import { useState, useEffect, useCallback } from 'react';
import { useStripe, useConfirmPayment } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import {
  SubscriptionService,
  type Subscription,
  type SubscriptionPlan,
  type PaymentMethod,
  type Invoice,
  type UsageMetrics,
  SUBSCRIPTION_PLANS,
} from '../services/SubscriptionService';
import { logger } from '../utils/logger';
import { showAlert } from '../utils/alerts';

const CACHE_KEY = '@mindfork:subscription_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface SubscriptionCache {
  subscription: Subscription;
  timestamp: number;
}

export function useSubscription() {
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { confirmPayment } = useConfirmPayment();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(SUBSCRIPTION_PLANS);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // CACHE MANAGEMENT
  // =========================================================================

  const getCachedSubscription = async (): Promise<Subscription | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { subscription: cachedSub, timestamp }: SubscriptionCache = JSON.parse(cached);
      const now = Date.now();

      if (now - timestamp < CACHE_DURATION) {
        return cachedSub;
      }

      return null;
    } catch (err) {
      logger.error('Get cached subscription error', err);
      return null;
    }
  };

  const cacheSubscription = async (sub: Subscription): Promise<void> => {
    try {
      const cacheData: SubscriptionCache = {
        subscription: sub,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      logger.error('Cache subscription error', err);
    }
  };

  const clearCache = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (err) {
      logger.error('Clear subscription cache error', err);
    }
  };

  // =========================================================================
  // FETCH DATA
  // =========================================================================

  const fetchSubscription = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        setError(null);

        // Try cache first
        if (!forceRefresh) {
          const cached = await getCachedSubscription();
          if (cached) {
            setSubscription(cached);
            setIsLoading(false);
            return;
          }
        }

        const { data, error: fetchError } = await SubscriptionService.getCurrentSubscription(
          user.id
        );

        if (fetchError) {
          throw new Error(fetchError);
        }

        if (data) {
          setSubscription(data);
          await cacheSubscription(data);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch subscription';
        setError(message);
        logger.error('Fetch subscription error', err);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const fetchPaymentMethods = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error: fetchError } = await SubscriptionService.getPaymentMethods(user.id);

      if (fetchError) {
        throw new Error(fetchError);
      }

      setPaymentMethods(data || []);
    } catch (err) {
      logger.error('Fetch payment methods error', err);
    }
  }, [user?.id]);

  const fetchInvoices = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error: fetchError } = await SubscriptionService.getInvoices(user.id);

      if (fetchError) {
        throw new Error(fetchError);
      }

      setInvoices(data || []);
    } catch (err) {
      logger.error('Fetch invoices error', err);
    }
  }, [user?.id]);

  const fetchUsageMetrics = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error: fetchError } = await SubscriptionService.getUsageMetrics(user.id);

      if (fetchError) {
        throw new Error(fetchError);
      }

      setUsageMetrics(data || null);
    } catch (err) {
      logger.error('Fetch usage metrics error', err);
    }
  }, [user?.id]);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchSubscription(true),
        fetchPaymentMethods(),
        fetchInvoices(),
        fetchUsageMetrics(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchSubscription, fetchPaymentMethods, fetchInvoices, fetchUsageMetrics]);

  // =========================================================================
  // SUBSCRIPTION ACTIONS
  // =========================================================================

  const upgradePlan = useCallback(
    async (planId: string, billingCycle: 'monthly' | 'yearly') => {
      if (!user?.id) {
        showAlert.auth('Please sign in to upgrade your plan');
        return { success: false };
      }

      try {
        setIsLoading(true);
        setError(null);

        const plan = plans.find((p) => p.id === planId);
        if (!plan) {
          throw new Error('Invalid plan selected');
        }

        // Create checkout session
        const { data: checkoutData, error: checkoutError } =
          await SubscriptionService.createCheckout(user.id, planId, billingCycle);

        if (checkoutError || !checkoutData) {
          throw new Error(checkoutError || 'Failed to create checkout');
        }

        // Initialize payment sheet
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'MindFork',
          paymentIntentClientSecret: checkoutData.clientSecret,
          customerId: subscription?.stripe_customer_id,
          allowsDelayedPaymentMethods: false,
        });

        if (initError) {
          throw new Error(initError.message);
        }

        // Present payment sheet
        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          if (presentError.code !== 'Canceled') {
            throw new Error(presentError.message);
          }
          return { success: false, canceled: true };
        }

        // Payment successful - refresh subscription
        await clearCache();
        await fetchSubscription(true);

        showAlert.success('Success', 'Subscription upgraded successfully!');
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upgrade plan';
        setError(message);
        showAlert.error('Error', message);
        logger.error('Upgrade plan error', err);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, plans, subscription, initPaymentSheet, presentPaymentSheet, fetchSubscription]
  );

  const updateSubscription = useCallback(
    async (newPlanId: string, billingCycle: 'monthly' | 'yearly') => {
      if (!user?.id) {
        showAlert.auth('Please sign in to update your plan');
        return { success: false };
      }

      try {
        setIsLoading(true);
        setError(null);

        const { data, error: updateError } = await SubscriptionService.updateSubscription(
          user.id,
          newPlanId,
          billingCycle
        );

        if (updateError) {
          throw new Error(updateError);
        }

        if (data) {
          setSubscription(data);
          await cacheSubscription(data);
          showAlert.success('Success', 'Subscription updated successfully!');
          return { success: true };
        }

        return { success: false };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update subscription';
        setError(message);
        showAlert.error('Error', message);
        logger.error('Update subscription error', err);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const cancelSubscription = useCallback(
    async (reason?: string, immediately = false) => {
      if (!user?.id) {
        showAlert.auth('Please sign in to cancel your subscription');
        return { success: false };
      }

      try {
        setIsLoading(true);
        setError(null);

        const { data, error: cancelError } = await SubscriptionService.cancelSubscription(
          user.id,
          reason,
          immediately
        );

        if (cancelError) {
          throw new Error(cancelError);
        }

        if (data) {
          setSubscription(data);
          await cacheSubscription(data);

          const message = immediately
            ? 'Subscription canceled immediately'
            : 'Subscription will cancel at the end of the billing period';

          showAlert.success('Success', message);
          return { success: true };
        }

        return { success: false };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
        setError(message);
        showAlert.error('Error', message);
        logger.error('Cancel subscription error', err);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  // =========================================================================
  // PAYMENT METHOD ACTIONS
  // =========================================================================

  const addPaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      if (!user?.id) return { success: false };

      try {
        setIsLoading(true);

        const { data, error: addError } = await SubscriptionService.addPaymentMethod(
          user.id,
          paymentMethodId
        );

        if (addError) {
          throw new Error(addError);
        }

        if (data) {
          setPaymentMethods((prev) => [data, ...prev]);
          showAlert.success('Success', 'Payment method added successfully');
          return { success: true };
        }

        return { success: false };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add payment method';
        showAlert.error('Error', message);
        logger.error('Add payment method error', err);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const removePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      if (!user?.id) return { success: false };

      try {
        setIsLoading(true);

        const { error: removeError } = await SubscriptionService.removePaymentMethod(
          user.id,
          paymentMethodId
        );

        if (removeError) {
          throw new Error(removeError);
        }

        setPaymentMethods((prev) =>
          prev.filter((pm) => pm.stripe_payment_method_id !== paymentMethodId)
        );

        showAlert.success('Success', 'Payment method removed successfully');
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove payment method';
        showAlert.error('Error', message);
        logger.error('Remove payment method error', err);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  // =========================================================================
  // EFFECTS
  // =========================================================================

  useEffect(() => {
    if (user?.id) {
      fetchSubscription();
      fetchPaymentMethods();
      fetchInvoices();
      fetchUsageMetrics();
    }
  }, [user?.id]);

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    // State
    subscription,
    plans,
    paymentMethods,
    invoices,
    usageMetrics,
    isLoading,
    isRefreshing,
    error,

    // Actions
    upgradePlan,
    updateSubscription,
    cancelSubscription,
    addPaymentMethod,
    removePaymentMethod,
    refreshAll,

    // Utilities
    clearError: () => setError(null),
  };
}

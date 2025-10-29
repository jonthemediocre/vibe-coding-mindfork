/**
 * Custom hook for nutrition analytics and trends
 */

import { useState, useEffect, useCallback } from 'react';
import { AnalyticsService, type AnalyticsData, type AnalyticsPeriod } from '../services/AnalyticsService';
import { useAuth } from '../contexts/AuthContext';

export interface UseNutritionTrendsResult {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setPeriod: (period: 'week' | 'month' | 'custom', customPeriod?: AnalyticsPeriod) => void;
  currentPeriod: 'week' | 'month' | 'custom';
}

export const useNutritionTrends = (): UseNutritionTrendsResult => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<'week' | 'month' | 'custom'>('week');
  const [customPeriod, setCustomPeriod] = useState<AnalyticsPeriod | undefined>();

  const loadAnalytics = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const analytics = await AnalyticsService.getAnalytics(
        user.id,
        currentPeriod,
        customPeriod
      );

      if (analytics) {
        setData(analytics);
      } else {
        setError('Failed to load analytics data');
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, currentPeriod, customPeriod]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const refresh = useCallback(async () => {
    if (user?.id) {
      await AnalyticsService.clearCache(user.id);
      await loadAnalytics();
    }
  }, [user?.id, loadAnalytics]);

  const setPeriod = useCallback(
    (period: 'week' | 'month' | 'custom', customPeriodParam?: AnalyticsPeriod) => {
      setCurrentPeriod(period);
      if (period === 'custom' && customPeriodParam) {
        setCustomPeriod(customPeriodParam);
      } else {
        setCustomPeriod(undefined);
      }
    },
    []
  );

  return {
    data,
    isLoading,
    error,
    refresh,
    setPeriod,
    currentPeriod,
  };
};

import { useState, useEffect, useCallback } from 'react';
import { FoodService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import type { FoodEntry, CreateFoodEntryInput, DailyStats } from '../types/models';

export interface UseFoodTrackingResult {
  entries: FoodEntry[];
  dailyStats: DailyStats | null;
  weeklyStats: DailyStats[] | null;
  isLoading: boolean;
  error: string | null;
  addFoodEntry: (input: CreateFoodEntryInput) => Promise<boolean>;
  deleteFoodEntry: (entryId: string) => Promise<boolean>;
  refreshEntries: () => Promise<void>;
  clearError: () => void;
}

export const useFoodTracking = (): UseFoodTrackingResult => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTodaysEntries = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [entriesResponse, statsResponse, weeklyResponse] = await Promise.all([
        FoodService.getTodaysFoodEntries(user.id),
        FoodService.getDailyStats(user.id),
        FoodService.getWeeklyStats(user.id),
      ]);

      if (entriesResponse.error) {
        setError(entriesResponse.error);
      } else {
        setEntries(entriesResponse.data || []);
      }

      if (statsResponse.error) {
        setError(statsResponse.error);
      } else {
        setDailyStats(statsResponse.data || null);
      }

      if (weeklyResponse.error) {
        setError(weeklyResponse.error);
      } else {
        setWeeklyStats(weeklyResponse.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load food entries');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTodaysEntries();
  }, [loadTodaysEntries]);

  const addFoodEntry = useCallback(
    async (input: CreateFoodEntryInput): Promise<boolean> => {
      if (!user?.id) {
        setError('User not authenticated');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await FoodService.createFoodEntry(user.id, input);

        if (response.error) {
          setError(response.error);
          return false;
        }

        // Refresh the entries list
        await loadTodaysEntries();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add food entry');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, loadTodaysEntries]
  );

  const deleteFoodEntry = useCallback(
    async (entryId: string): Promise<boolean> => {
      if (!user?.id) {
        setError('User not authenticated');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await FoodService.deleteFoodEntry(user.id, entryId);

        if (response.error) {
          setError(response.error);
          return false;
        }

        // Refresh the entries list
        await loadTodaysEntries();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete food entry');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, loadTodaysEntries]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    entries,
    dailyStats,
    weeklyStats,
    isLoading,
    error,
    addFoodEntry,
    deleteFoodEntry,
    refreshEntries: loadTodaysEntries,
    clearError,
  };
};

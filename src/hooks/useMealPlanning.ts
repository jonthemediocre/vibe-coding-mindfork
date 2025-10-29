/**
 * useMealPlanning - Custom hook for meal planning state management
 *
 * Features:
 * - Manages weekly meal plan state
 * - Drag & drop logic
 * - Auto-refresh on date changes
 * - CRUD operations with optimistic updates
 * - Macro tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { MealPlanningService, type MealPlanEntry, type DailyMacroSummary } from '../services/MealPlanningService';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { showAlert } from '../utils/alerts';

interface UseMealPlanningOptions {
  startDate: string; // ISO date string (YYYY-MM-DD)
  numberOfDays?: number; // Default: 7
  autoRefresh?: boolean; // Auto-refresh when date changes
}

interface UseMealPlanningReturn {
  // State
  mealPlan: MealPlanEntry[];
  isLoading: boolean;
  error: string | null;
  macroSummaries: Map<string, DailyMacroSummary>;

  // Actions
  addMeal: (
    date: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    options: { foodEntryId?: string; recipeId?: string; servings?: number }
  ) => Promise<void>;
  removeMeal: (mealId: string) => Promise<void>;
  updateMeal: (mealId: string, updates: { servings?: number; notes?: string }) => Promise<void>;
  refreshMealPlan: () => Promise<void>;
  getMealsForDate: (date: string) => MealPlanEntry[];
  getMealsForSlot: (date: string, mealType: string) => MealPlanEntry[];
  getMacrosForDate: (date: string) => DailyMacroSummary | null;
}

export function useMealPlanning(options: UseMealPlanningOptions): UseMealPlanningReturn {
  const { user, profile } = useAuth();
  const [mealPlan, setMealPlan] = useState<MealPlanEntry[]>([]);
  const [macroSummaries, setMacroSummaries] = useState<Map<string, DailyMacroSummary>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const numberOfDays = options.numberOfDays || 7;

  // Calculate end date based on start date and number of days
  const getEndDate = useCallback(() => {
    const start = new Date(options.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + numberOfDays - 1);
    return end.toISOString().split('T')[0];
  }, [options.startDate, numberOfDays]);

  /**
   * Fetch meal plan from Supabase
   */
  const fetchMealPlan = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const endDate = getEndDate();
      const { data, error: fetchError } = await MealPlanningService.getMealPlan(
        user.id,
        options.startDate,
        endDate
      );

      if (fetchError) {
        setError(fetchError);
        logger.error('Error fetching meal plan', new Error(fetchError));
        return;
      }

      setMealPlan(data || []);

      // Fetch macro summaries for each day
      await fetchMacroSummaries();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch meal plan';
      setError(errorMsg);
      logger.error('Error in fetchMealPlan', err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, options.startDate, numberOfDays]);

  /**
   * Fetch macro summaries for all dates in range
   */
  const fetchMacroSummaries = useCallback(async () => {
    if (!user?.id) return;

    const summaries = new Map<string, DailyMacroSummary>();
    const start = new Date(options.startDate);

    const userGoals = profile ? {
      daily_calorie_goal: profile.daily_calorie_goal,
      daily_protein_goal: profile.daily_protein_goal,
      daily_carbs_goal: profile.daily_carbs_goal,
      daily_fat_goal: profile.daily_fat_goal,
    } : undefined;

    // Fetch summaries for each day
    for (let i = 0; i < numberOfDays; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const { data } = await MealPlanningService.getDailyMacroSummary(
        user.id,
        dateStr,
        userGoals
      );

      if (data) {
        summaries.set(dateStr, data);
      }
    }

    setMacroSummaries(summaries);
  }, [user?.id, profile, options.startDate, numberOfDays]);

  /**
   * Add a meal to the plan
   */
  const addMeal = useCallback(async (
    date: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    options: { foodEntryId?: string; recipeId?: string; servings?: number }
  ) => {
    if (!user?.id) return;

    try {
      const { data, error: addError } = await MealPlanningService.addMealToSlot(
        user.id,
        date,
        mealType,
        options
      );

      if (addError) {
        showAlert.error('Error', addError);
        return;
      }

      // Optimistic update
      if (data) {
        setMealPlan(prev => [...prev, data]);

        // Refresh macro summary for this date
        const userGoals = profile ? {
          daily_calorie_goal: profile.daily_calorie_goal,
          daily_protein_goal: profile.daily_protein_goal,
          daily_carbs_goal: profile.daily_carbs_goal,
          daily_fat_goal: profile.daily_fat_goal,
        } : undefined;

        const { data: summary } = await MealPlanningService.getDailyMacroSummary(
          user.id,
          date,
          userGoals
        );

        if (summary) {
          setMacroSummaries(prev => new Map(prev).set(date, summary));
        }
      }

      showAlert.success('Success', 'Meal added to plan');
    } catch (err) {
      logger.error('Error adding meal', err as Error);
      showAlert.error('Error', 'Failed to add meal');
    }
  }, [user?.id, profile]);

  /**
   * Remove a meal from the plan
   */
  const removeMeal = useCallback(async (mealId: string) => {
    if (!user?.id) return;

    try {
      // Find the meal to get its date for macro refresh
      const meal = mealPlan.find(m => m.id === mealId);
      const mealDate = meal?.date;

      const { error: removeError } = await MealPlanningService.removeMealFromSlot(
        user.id,
        mealId
      );

      if (removeError) {
        showAlert.error('Error', removeError);
        return;
      }

      // Optimistic update
      setMealPlan(prev => prev.filter(m => m.id !== mealId));

      // Refresh macro summary for this date
      if (mealDate) {
        const userGoals = profile ? {
          daily_calorie_goal: profile.daily_calorie_goal,
          daily_protein_goal: profile.daily_protein_goal,
          daily_carbs_goal: profile.daily_carbs_goal,
          daily_fat_goal: profile.daily_fat_goal,
        } : undefined;

        const { data: summary } = await MealPlanningService.getDailyMacroSummary(
          user.id,
          mealDate,
          userGoals
        );

        if (summary) {
          setMacroSummaries(prev => new Map(prev).set(mealDate, summary));
        }
      }

      showAlert.success('Success', 'Meal removed from plan');
    } catch (err) {
      logger.error('Error removing meal', err as Error);
      showAlert.error('Error', 'Failed to remove meal');
    }
  }, [user?.id, profile, mealPlan]);

  /**
   * Update meal servings or notes
   */
  const updateMeal = useCallback(async (
    mealId: string,
    updates: { servings?: number; notes?: string }
  ) => {
    if (!user?.id) return;

    try {
      const meal = mealPlan.find(m => m.id === mealId);
      const mealDate = meal?.date;

      const { data, error: updateError } = await MealPlanningService.updateMeal(
        user.id,
        mealId,
        updates
      );

      if (updateError) {
        showAlert.error('Error', updateError);
        return;
      }

      // Optimistic update
      if (data) {
        setMealPlan(prev => prev.map(m => m.id === mealId ? data : m));

        // Refresh macro summary if servings changed
        if (updates.servings && mealDate) {
          const userGoals = profile ? {
            daily_calorie_goal: profile.daily_calorie_goal,
            daily_protein_goal: profile.daily_protein_goal,
            daily_carbs_goal: profile.daily_carbs_goal,
            daily_fat_goal: profile.daily_fat_goal,
          } : undefined;

          const { data: summary } = await MealPlanningService.getDailyMacroSummary(
            user.id,
            mealDate,
            userGoals
          );

          if (summary) {
            setMacroSummaries(prev => new Map(prev).set(mealDate, summary));
          }
        }
      }
    } catch (err) {
      logger.error('Error updating meal', err as Error);
      showAlert.error('Error', 'Failed to update meal');
    }
  }, [user?.id, profile, mealPlan]);

  /**
   * Manually refresh meal plan
   */
  const refreshMealPlan = useCallback(async () => {
    await fetchMealPlan();
  }, [fetchMealPlan]);

  /**
   * Get all meals for a specific date
   */
  const getMealsForDate = useCallback((date: string): MealPlanEntry[] => {
    return mealPlan.filter(meal => meal.date === date);
  }, [mealPlan]);

  /**
   * Get meals for a specific slot (date + meal type)
   */
  const getMealsForSlot = useCallback((date: string, mealType: string): MealPlanEntry[] => {
    return mealPlan.filter(meal => meal.date === date && meal.meal_type === mealType);
  }, [mealPlan]);

  /**
   * Get macro summary for a specific date
   */
  const getMacrosForDate = useCallback((date: string): DailyMacroSummary | null => {
    return macroSummaries.get(date) || null;
  }, [macroSummaries]);

  // Initial fetch
  useEffect(() => {
    fetchMealPlan();
  }, [fetchMealPlan]);

  // Auto-refresh when date changes (if enabled)
  useEffect(() => {
    if (options.autoRefresh) {
      fetchMealPlan();
    }
  }, [options.startDate, options.autoRefresh]);

  return {
    mealPlan,
    isLoading,
    error,
    macroSummaries,
    addMeal,
    removeMeal,
    updateMeal,
    refreshMealPlan,
    getMealsForDate,
    getMealsForSlot,
    getMacrosForDate,
  };
}

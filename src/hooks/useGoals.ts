/**
 * useGoals - Custom hook for goals management
 *
 * Features:
 * - Fetch and manage goals
 * - Real-time updates via Supabase subscriptions
 * - Create, update, delete goals
 * - Track progress and milestones
 * - Fetch achievements
 */

import { useState, useEffect, useCallback } from 'react';
import { GoalsService } from '../services/GoalsService';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type {
  Goal,
  GoalMilestone,
  Achievement,
  CreateGoalInput,
  UpdateGoalInput,
} from '../types/models';

interface UseGoalsReturn {
  goals: Goal[];
  activeGoals: Goal[];
  completedGoals: Goal[];
  isLoading: boolean;
  error: string | null;
  achievements: Achievement[];
  totalProgress: number;
  fetchGoals: () => Promise<void>;
  createGoal: (input: CreateGoalInput) => Promise<boolean>;
  updateGoal: (input: UpdateGoalInput) => Promise<boolean>;
  updateProgress: (goalId: string, currentValue: number) => Promise<boolean>;
  deleteGoal: (goalId: string) => Promise<boolean>;
  fetchMilestones: (goalId: string) => Promise<GoalMilestone[]>;
  refreshAchievements: () => Promise<void>;
}

export const useGoals = (): UseGoalsReturn => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch goals from the database
  const fetchGoals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await GoalsService.fetchGoals();
      setGoals(data);
    } catch (err) {
      logger.error('Error fetching goals in useGoals', err as Error);
      setError('Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch achievements
  const refreshAchievements = useCallback(async () => {
    try {
      const data = await GoalsService.fetchAchievements();
      setAchievements(data);
    } catch (err) {
      logger.error('Error fetching achievements in useGoals', err as Error);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchGoals();
    refreshAchievements();
  }, [fetchGoals, refreshAchievements]);

  // Real-time subscription to goals changes
  useEffect(() => {
    const { data: { user } } = supabase.auth.getUser().then(result => result);

    if (!user) return;

    const subscription = supabase
      .channel('goals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.info('Goals table changed', payload);

          if (payload.eventType === 'INSERT') {
            setGoals(prev => [payload.new as Goal, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setGoals(prev =>
              prev.map(goal =>
                goal.id === payload.new.id ? (payload.new as Goal) : goal
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setGoals(prev => prev.filter(goal => goal.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Create a new goal
  const createGoal = useCallback(async (input: CreateGoalInput): Promise<boolean> => {
    try {
      setError(null);
      const result = await GoalsService.createGoal(input);

      if (result.error) {
        setError(result.error);
        return false;
      }

      // Refresh goals to get the latest data
      await fetchGoals();
      return true;
    } catch (err) {
      logger.error('Error creating goal in useGoals', err as Error);
      setError('Failed to create goal');
      return false;
    }
  }, [fetchGoals]);

  // Update an existing goal
  const updateGoal = useCallback(async (input: UpdateGoalInput): Promise<boolean> => {
    try {
      setError(null);
      const result = await GoalsService.updateGoal(input);

      if (result.error) {
        setError(result.error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Error updating goal in useGoals', err as Error);
      setError('Failed to update goal');
      return false;
    }
  }, []);

  // Update goal progress
  const updateProgress = useCallback(
    async (goalId: string, currentValue: number): Promise<boolean> => {
      try {
        setError(null);
        const result = await GoalsService.updateGoalProgress(goalId, currentValue);

        if (result.error) {
          setError(result.error);
          return false;
        }

        return true;
      } catch (err) {
        logger.error('Error updating goal progress in useGoals', err as Error);
        setError('Failed to update progress');
        return false;
      }
    },
    []
  );

  // Delete a goal
  const deleteGoal = useCallback(async (goalId: string): Promise<boolean> => {
    try {
      setError(null);
      const result = await GoalsService.deleteGoal(goalId);

      if (result.error) {
        setError(result.error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Error deleting goal in useGoals', err as Error);
      setError('Failed to delete goal');
      return false;
    }
  }, []);

  // Fetch milestones for a specific goal
  const fetchMilestones = useCallback(
    async (goalId: string): Promise<GoalMilestone[]> => {
      try {
        return await GoalsService.fetchMilestones(goalId);
      } catch (err) {
        logger.error('Error fetching milestones in useGoals', err as Error);
        return [];
      }
    },
    []
  );

  // Computed values
  const activeGoals = goals.filter(
    goal => goal.status !== 'completed' && goal.status !== 'paused'
  );

  const completedGoals = goals.filter(goal => goal.status === 'completed');

  const totalProgress = activeGoals.length > 0
    ? Math.round(
        activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / activeGoals.length
      )
    : 0;

  return {
    goals,
    activeGoals,
    completedGoals,
    isLoading,
    error,
    achievements,
    totalProgress,
    fetchGoals,
    createGoal,
    updateGoal,
    updateProgress,
    deleteGoal,
    fetchMilestones,
    refreshAchievements,
  };
};

/**
 * GoalsService - Manages user goals and achievements
 *
 * Features:
 * - CRUD operations for goals
 * - Progress tracking and automatic status updates
 * - Milestone management
 * - Achievement tracking
 * - Real-time sync with Supabase
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { showAlert } from '../utils/alerts';
import type {
  Goal,
  GoalMilestone,
  Achievement,
  CreateGoalInput,
  UpdateGoalInput,
  GoalStatus,
  ApiResponse,
} from '../types/models';

export class GoalsService {
  /**
   * Fetch all goals for the current user
   */
  static async fetchGoals(status?: 'active' | 'completed' | 'paused'): Promise<Goal[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let query = supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (status) {
        if (status === 'active') {
          query = query.in('status', ['on_track', 'behind', 'ahead']);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching goals', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in fetchGoals', error as Error);
      return [];
    }
  }

  /**
   * Create a new goal
   */
  static async createGoal(input: CreateGoalInput): Promise<ApiResponse<Goal>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'User not authenticated' };
      }

      const newGoal = {
        user_id: user.id,
        type: input.type,
        title: input.title,
        description: input.description || '',
        category: input.category,
        status: 'on_track' as GoalStatus,
        priority: input.priority || 'medium',
        start_value: input.current_value || 0,
        current_value: input.current_value || 0,
        target_value: input.target_value,
        unit: input.unit,
        progress: 0,
        start_date: new Date().toISOString(),
        target_date: input.target_date || null,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('goals')
        .insert(newGoal)
        .select()
        .single();

      if (error) {
        logger.error('Error creating goal', error);
        return { error: error.message };
      }

      // Create default milestones (25%, 50%, 75%, 100%)
      if (data?.id) {
        await this.createDefaultMilestones(data.id, input.target_value);
      }

      showAlert.success('Success', 'Goal created successfully!');
      return { data, message: 'Goal created successfully' };
    } catch (error) {
      logger.error('Error in createGoal', error as Error);
      return { error: 'Failed to create goal' };
    }
  }

  /**
   * Update an existing goal
   */
  static async updateGoal(input: UpdateGoalInput): Promise<ApiResponse<Goal>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'User not authenticated' };
      }

      const updates = {
        ...input,
        updated_at: new Date().toISOString(),
      };

      // Remove id from updates
      const { id, ...updateData } = updates;

      const { data, error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', input.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating goal', error);
        return { error: error.message };
      }

      return { data, message: 'Goal updated successfully' };
    } catch (error) {
      logger.error('Error in updateGoal', error as Error);
      return { error: 'Failed to update goal' };
    }
  }

  /**
   * Update goal progress
   */
  static async updateGoalProgress(
    goalId: string,
    currentValue: number
  ): Promise<ApiResponse<Goal>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'User not authenticated' };
      }

      // Fetch current goal to calculate progress
      const { data: goal, error: fetchError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !goal) {
        return { error: 'Goal not found' };
      }

      // Calculate progress percentage
      const progress = this.calculateProgress(
        goal.start_value || 0,
        currentValue,
        goal.target_value
      );

      // Determine status based on progress and timeline
      const status = this.determineGoalStatus(
        progress,
        goal.start_date,
        goal.target_date
      );

      // Check if goal is completed
      const isCompleted = progress >= 100;
      const completedDate = isCompleted && !goal.completed_date
        ? new Date().toISOString()
        : goal.completed_date;

      const { data, error } = await supabase
        .from('goals')
        .update({
          current_value: currentValue,
          progress,
          status: isCompleted ? 'completed' : status,
          completed_date: completedDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating goal progress', error);
        return { error: error.message };
      }

      // Check and update milestones
      await this.checkMilestones(goalId, currentValue);

      // Check for achievements
      if (isCompleted) {
        await this.checkAchievements(user.id, goal);
      }

      return { data };
    } catch (error) {
      logger.error('Error in updateGoalProgress', error as Error);
      return { error: 'Failed to update goal progress' };
    }
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(goalId: string): Promise<ApiResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Error deleting goal', error);
        return { error: error.message };
      }

      showAlert.success('Success', 'Goal deleted successfully');
      return { message: 'Goal deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteGoal', error as Error);
      return { error: 'Failed to delete goal' };
    }
  }

  /**
   * Fetch milestones for a goal
   */
  static async fetchMilestones(goalId: string): Promise<GoalMilestone[]> {
    try {
      const { data, error } = await supabase
        .from('goal_milestones')
        .select('*')
        .eq('goal_id', goalId)
        .order('value', { ascending: true });

      if (error) {
        logger.error('Error fetching milestones', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error in fetchMilestones', error as Error);
      return [];
    }
  }

  /**
   * Fetch achievements for the current user
   */
  static async fetchAchievements(): Promise<Achievement[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)
        .eq('criteria_met', true)
        .order('earned_date', { ascending: false });

      if (error) {
        logger.error('Error fetching achievements', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error in fetchAchievements', error as Error);
      return [];
    }
  }

  /**
   * Calculate progress percentage
   */
  private static calculateProgress(
    startValue: number,
    currentValue: number,
    targetValue: number
  ): number {
    if (targetValue === startValue) return 100;

    const progress = ((currentValue - startValue) / (targetValue - startValue)) * 100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  /**
   * Determine goal status based on progress and timeline
   */
  private static determineGoalStatus(
    progress: number,
    startDate: string,
    targetDate?: string | null
  ): GoalStatus {
    if (progress >= 100) return 'completed';
    if (progress >= 90) return 'ahead';

    if (!targetDate) {
      return progress >= 50 ? 'on_track' : 'behind';
    }

    // Calculate expected progress based on time elapsed
    const start = new Date(startDate).getTime();
    const target = new Date(targetDate).getTime();
    const now = Date.now();

    const timeElapsed = now - start;
    const totalTime = target - start;
    const expectedProgress = (timeElapsed / totalTime) * 100;

    // Compare actual progress to expected progress
    if (progress >= expectedProgress + 10) return 'ahead';
    if (progress < expectedProgress - 10) return 'behind';
    return 'on_track';
  }

  /**
   * Create default milestones for a goal
   */
  private static async createDefaultMilestones(
    goalId: string,
    targetValue: number
  ): Promise<void> {
    const milestones = [
      { value: targetValue * 0.25, title: '25% Complete' },
      { value: targetValue * 0.5, title: '50% Complete' },
      { value: targetValue * 0.75, title: '75% Complete' },
      { value: targetValue, title: 'Goal Complete!' },
    ];

    const milestonesToInsert = milestones.map(m => ({
      goal_id: goalId,
      value: m.value,
      title: m.title,
      achieved: false,
    }));

    const { error } = await supabase
      .from('goal_milestones')
      .insert(milestonesToInsert);

    if (error) {
      logger.error('Error creating milestones', error);
    }
  }

  /**
   * Check and update milestone achievements
   */
  private static async checkMilestones(
    goalId: string,
    currentValue: number
  ): Promise<void> {
    try {
      const milestones = await this.fetchMilestones(goalId);

      for (const milestone of milestones) {
        if (!milestone.achieved && currentValue >= milestone.value) {
          await supabase
            .from('goal_milestones')
            .update({
              achieved: true,
              achieved_date: new Date().toISOString(),
            })
            .eq('id', milestone.id);

          // Show celebration alert
          showAlert.success(
            'Milestone Achieved!',
            `You've reached: ${milestone.title || `${milestone.value} milestone`}`
          );
        }
      }
    } catch (error) {
      logger.error('Error checking milestones', error as Error);
    }
  }

  /**
   * Check for achievements when goals are completed
   */
  private static async checkAchievements(userId: string, goal: Goal): Promise<void> {
    try {
      // Check for first goal completion
      const { count } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (count === 1) {
        await this.awardAchievement(userId, {
          title: 'First Goal Complete',
          description: 'Completed your first goal',
          icon: 'trophy',
          color: '#FFD700',
          category: 'milestones',
          earned_at: new Date().toISOString(),
        });
      }

      // Check for category-specific achievements
      if (goal.category === 'weight') {
        await this.awardAchievement(userId, {
          title: 'Weight Goal Master',
          description: 'Achieved your weight goal',
          icon: 'scale',
          color: '#4CAF50',
          category: 'fitness',
          earned_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error checking achievements', error as Error);
    }
  }

  /**
   * Award an achievement to a user
   */
  private static async awardAchievement(
    userId: string,
    achievement: Omit<Achievement, 'id' | 'user_id' | 'earned_date' | 'criteria_met' | 'created_at'>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('achievements')
        .insert({
          user_id: userId,
          ...achievement,
          earned_date: new Date().toISOString(),
          criteria_met: true,
          created_at: new Date().toISOString(),
        });

      if (error) {
        logger.error('Error awarding achievement', error);
      } else {
        showAlert.success('Achievement Unlocked!', achievement.title);
      }
    } catch (error) {
      logger.error('Error in awardAchievement', error as Error);
    }
  }

  /**
   * Auto-update goals based on daily nutrition data
   */
  static async syncGoalsWithNutrition(userId: string, dailyStats: {
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
  }): Promise<void> {
    try {
      const goals = await this.fetchGoals('active');

      for (const goal of goals) {
        let currentValue: number | undefined;

        switch (goal.type) {
          case 'calories':
            currentValue = dailyStats.total_calories;
            break;
          case 'protein':
            currentValue = dailyStats.total_protein;
            break;
          case 'carbs':
            currentValue = dailyStats.total_carbs;
            break;
          case 'fat':
            currentValue = dailyStats.total_fat;
            break;
        }

        if (currentValue !== undefined) {
          await this.updateGoalProgress(goal.id, currentValue);
        }
      }
    } catch (error) {
      logger.error('Error syncing goals with nutrition', error as Error);
    }
  }
}

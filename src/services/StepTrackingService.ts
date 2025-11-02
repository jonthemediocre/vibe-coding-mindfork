import { supabase } from '@/lib/supabase';
import type { Database } from '../types/supabase';
import type { ApiResponse } from '../types/models';

type StepTrackingRow = Database['public']['Tables']['step_tracking']['Row'];
type StepTrackingInsert = Database['public']['Tables']['step_tracking']['Insert'];
type StepTrackingUpdate = Database['public']['Tables']['step_tracking']['Update'];

export interface StepTrackingData {
  id: string;
  user_id: string;
  date: string;
  step_count: number;
  calories_burned: number;
  created_at: string;
  updated_at?: string;
}

export interface StepStats {
  total_steps: number;
  average_steps: number;
  total_calories: number;
  days_tracked: number;
  highest_steps: number;
  highest_steps_date: string | null;
}

/**
 * Service for managing step tracking data in Supabase
 */
export class StepTrackingService {
  /**
   * Save today's steps to database
   * Upserts data to avoid duplicates for same day
   */
  static async saveSteps(
    userId: string,
    steps: number,
    calories: number,
    date: Date = new Date()
  ): Promise<ApiResponse<StepTrackingData>> {
    try {
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

      // Check if entry exists for today
      const { data: existing, error: checkError } = await supabase
        .from('step_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateString)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        return { error: checkError.message };
      }

      if (existing) {
        // Update existing entry
        const updateData: StepTrackingUpdate = {
          step_count: steps,
          calories_burned: calories,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('step_tracking')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          return { error: error.message };
        }

        return { data };
      } else {
        // Insert new entry
        const insertData: StepTrackingInsert = {
          user_id: userId,
          date: dateString,
          step_count: steps,
          calories_burned: calories,
        };

        const { data, error } = await supabase
          .from('step_tracking')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          return { error: error.message };
        }

        return { data };
      }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to save step data',
      };
    }
  }

  /**
   * Get step history for a date range
   */
  static async getStepHistory(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse<StepTrackingData[]>> {
    try {
      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('step_tracking')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDateString)
        .lte('date', endDateString)
        .order('date', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to fetch step history',
      };
    }
  }

  /**
   * Get weekly step average
   */
  static async getWeeklyStepAverage(
    userId: string
  ): Promise<ApiResponse<number>> {
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const response = await this.getStepHistory(userId, weekAgo, today);

      if (response.error || !response.data) {
        return { error: response.error || 'No data found' };
      }

      const totalSteps = response.data.reduce(
        (sum, day) => sum + day.step_count,
        0
      );
      const average = response.data.length > 0 ? totalSteps / response.data.length : 0;

      return { data: Math.round(average) };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to calculate weekly average',
      };
    }
  }

  /**
   * Get step statistics for a user
   */
  static async getStepStats(
    userId: string,
    days: number = 30
  ): Promise<ApiResponse<StepStats>> {
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days);

      const response = await this.getStepHistory(userId, startDate, today);

      if (response.error || !response.data) {
        return { error: response.error || 'No data found' };
      }

      const data = response.data;
      const totalSteps = data.reduce((sum, day) => sum + day.step_count, 0);
      const totalCalories = data.reduce((sum, day) => sum + day.calories_burned, 0);
      const daysTracked = data.length;
      const averageSteps = daysTracked > 0 ? totalSteps / daysTracked : 0;

      // Find highest step day
      let highestSteps = 0;
      let highestStepsDate: string | null = null;

      data.forEach((day) => {
        if (day.step_count > highestSteps) {
          highestSteps = day.step_count;
          highestStepsDate = day.date;
        }
      });

      const stats: StepStats = {
        total_steps: totalSteps,
        average_steps: Math.round(averageSteps),
        total_calories: Math.round(totalCalories),
        days_tracked: daysTracked,
        highest_steps: highestSteps,
        highest_steps_date: highestStepsDate,
      };

      return { data: stats };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to calculate step stats',
      };
    }
  }

  /**
   * Get today's steps
   */
  static async getTodaySteps(
    userId: string
  ): Promise<ApiResponse<StepTrackingData | null>> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('step_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        return { error: error.message };
      }

      return { data: data || null };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to fetch today\'s steps',
      };
    }
  }

  /**
   * Delete step tracking data (for GDPR compliance)
   */
  static async deleteUserStepData(userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('step_tracking')
        .delete()
        .eq('user_id', userId);

      if (error) {
        return { error: error.message };
      }

      return { message: 'Step tracking data deleted successfully' };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to delete step data',
      };
    }
  }
}

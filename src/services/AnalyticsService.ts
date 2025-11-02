/**
 * Analytics Service
 * Fetch and aggregate nutrition data for analytics dashboard
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { FoodEntry } from '../types/models';

const CACHE_KEY = 'mindfork_analytics_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface AnalyticsPeriod {
  startDate: Date;
  endDate: Date;
}

export interface DailyNutritionData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealCount: number;
}

export interface MacroDistribution {
  protein: number;
  carbs: number;
  fat: number;
}

export interface AnalyticsData {
  dailyData: DailyNutritionData[];
  macroDistribution: MacroDistribution;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  avgCaloriesPerDay: number;
  streak: number;
  goalAdherence: number;
  period: AnalyticsPeriod;
}

export interface CachedAnalytics {
  data: AnalyticsData;
  timestamp: number;
  userId: string;
  period: string;
}

export class AnalyticsService {
  /**
   * Fetch food entries for a date range
   */
  static async getFoodEntries(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FoodEntry[]> {
    try {
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching food entries:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching food entries:', error);
      return [];
    }
  }

  /**
   * Get analytics data for a period with caching
   */
  static async getAnalytics(
    userId: string,
    period: 'week' | 'month' | 'custom',
    customPeriod?: AnalyticsPeriod
  ): Promise<AnalyticsData | null> {
    try {
      // Check cache first
      const cached = await this.getCachedAnalytics(userId, period);
      if (cached) {
        return cached;
      }

      const { startDate, endDate } = this.getPeriodDates(period, customPeriod);
      const entries = await this.getFoodEntries(userId, startDate, endDate);

      if (entries.length === 0) {
        return this.getEmptyAnalytics(period, startDate, endDate);
      }

      const analytics = this.calculateAnalytics(entries, startDate, endDate);

      // Cache the results
      await this.cacheAnalytics(userId, period, analytics);

      return analytics;
    } catch (error) {
      console.error('Error getting analytics:', error);
      return null;
    }
  }

  /**
   * Calculate analytics from food entries
   */
  private static calculateAnalytics(
    entries: FoodEntry[],
    startDate: Date,
    endDate: Date
  ): AnalyticsData {
    // Group entries by day
    const dailyMap = new Map<string, DailyNutritionData>();

    entries.forEach((entry) => {
      const date = new Date(entry.created_at).toISOString().split('T')[0];

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          mealCount: 0,
        });
      }

      const day = dailyMap.get(date)!;
      day.calories += entry.calories || 0;
      day.protein += entry.protein_g || 0;
      day.carbs += entry.carbs_g || 0;
      day.fat += entry.fat_g || 0;
      day.fiber += entry.fiber_g || 0;
      day.mealCount += 1;
    });

    // Convert to array and sort by date
    const dailyData = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Calculate totals
    const totalCalories = dailyData.reduce((sum, day) => sum + day.calories, 0);
    const totalProtein = dailyData.reduce((sum, day) => sum + day.protein, 0);
    const totalCarbs = dailyData.reduce((sum, day) => sum + day.carbs, 0);
    const totalFat = dailyData.reduce((sum, day) => sum + day.fat, 0);

    // Calculate average calories per day
    const daysWithData = dailyData.length;
    const avgCaloriesPerDay = daysWithData > 0 ? totalCalories / daysWithData : 0;

    // Calculate macro distribution (percentage of calories)
    const proteinCalories = totalProtein * 4; // 4 cal/g
    const carbsCalories = totalCarbs * 4; // 4 cal/g
    const fatCalories = totalFat * 9; // 9 cal/g
    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

    const macroDistribution: MacroDistribution = {
      protein: totalMacroCalories > 0 ? (proteinCalories / totalMacroCalories) * 100 : 0,
      carbs: totalMacroCalories > 0 ? (carbsCalories / totalMacroCalories) * 100 : 0,
      fat: totalMacroCalories > 0 ? (fatCalories / totalMacroCalories) * 100 : 0,
    };

    // Calculate streak (consecutive days with logged meals)
    const streak = this.calculateStreak(dailyData);

    // Calculate goal adherence (placeholder - would need user goals)
    const goalAdherence = this.calculateGoalAdherence(dailyData);

    return {
      dailyData,
      macroDistribution,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      avgCaloriesPerDay,
      streak,
      goalAdherence,
      period: { startDate, endDate },
    };
  }

  /**
   * Calculate consecutive days streak
   */
  private static calculateStreak(dailyData: DailyNutritionData[]): number {
    if (dailyData.length === 0) return 0;

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];

    // Sort in descending order
    const sortedData = [...dailyData].sort((a, b) => b.date.localeCompare(a.date));

    // Check if today or yesterday has data
    const latestDate = sortedData[0].date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (latestDate !== today && latestDate !== yesterdayStr) {
      return 0; // Streak broken
    }

    // Count consecutive days
    let expectedDate = new Date(latestDate);
    for (const day of sortedData) {
      const dayDate = day.date;
      const expectedStr = expectedDate.toISOString().split('T')[0];

      if (dayDate === expectedStr) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate goal adherence percentage
   */
  private static calculateGoalAdherence(dailyData: DailyNutritionData[]): number {
    if (dailyData.length === 0) return 0;

    // Simple adherence: days with at least 2 meals
    const daysWithGoodTracking = dailyData.filter(day => day.mealCount >= 2).length;
    return (daysWithGoodTracking / dailyData.length) * 100;
  }

  /**
   * Get period dates based on period type
   */
  private static getPeriodDates(
    period: 'week' | 'month' | 'custom',
    customPeriod?: AnalyticsPeriod
  ): AnalyticsPeriod {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date();

    if (period === 'custom' && customPeriod) {
      return {
        startDate: customPeriod.startDate,
        endDate: customPeriod.endDate,
      };
    }

    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    }

    startDate.setHours(0, 0, 0, 0);

    return { startDate, endDate };
  }

  /**
   * Get empty analytics when no data
   */
  private static getEmptyAnalytics(
    period: string,
    startDate: Date,
    endDate: Date
  ): AnalyticsData {
    return {
      dailyData: [],
      macroDistribution: { protein: 0, carbs: 0, fat: 0 },
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      avgCaloriesPerDay: 0,
      streak: 0,
      goalAdherence: 0,
      period: { startDate, endDate },
    };
  }

  /**
   * Get cached analytics
   */
  private static async getCachedAnalytics(
    userId: string,
    period: string
  ): Promise<AnalyticsData | null> {
    try {
      const cacheKey = `${CACHE_KEY}_${userId}_${period}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) return null;

      const parsedCache: CachedAnalytics = JSON.parse(cached);

      // Check if cache is still valid
      const now = Date.now();
      if (now - parsedCache.timestamp > CACHE_DURATION) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      // Reconstruct dates
      parsedCache.data.period.startDate = new Date(parsedCache.data.period.startDate);
      parsedCache.data.period.endDate = new Date(parsedCache.data.period.endDate);

      return parsedCache.data;
    } catch (error) {
      console.error('Error getting cached analytics:', error);
      return null;
    }
  }

  /**
   * Cache analytics data
   */
  private static async cacheAnalytics(
    userId: string,
    period: string,
    data: AnalyticsData
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEY}_${userId}_${period}`;
      const cached: CachedAnalytics = {
        data,
        timestamp: Date.now(),
        userId,
        period,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch (error) {
      console.error('Error caching analytics:', error);
    }
  }

  /**
   * Clear analytics cache
   */
  static async clearCache(userId: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key =>
        key.startsWith(CACHE_KEY) && key.includes(userId)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing analytics cache:', error);
    }
  }
}

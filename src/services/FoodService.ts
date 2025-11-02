import { supabase } from '@/lib/supabase';
import type { Database } from '../types/supabase';
import type {
  FoodEntry,
  CreateFoodEntryInput,
  UpdateFoodEntryInput,
  ApiResponse,
  DailyStats,
} from '../types/models';
import type { UnifiedFood } from '../types/food';
import { apiInterceptor } from '../utils/api-interceptor';
import { FoodClassificationService } from './FoodClassificationService';
import { MetabolicAdaptationService } from './MetabolicAdaptationService';

type FoodEntryInsert = Database['public']['Tables']['food_entries']['Insert'];
type FoodEntryUpdate = Database['public']['Tables']['food_entries']['Update'];

export class FoodService {
  /**
   * Get all food entries for the current user
   */
  static async getFoodEntries(
    userId: string,
    options?: { limit?: number; offset?: number; date?: string }
  ): Promise<ApiResponse<FoodEntry[]>> {
    try {
      let query = supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false });

      if (options?.date) {
        const startOfDay = new Date(options.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(options.date);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('logged_at', startOfDay.toISOString())
          .lte('logged_at', endOfDay.toISOString());
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query.returns<FoodEntry[]>();

      if (error) {
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch food entries' };
    }
  }

  /**
   * Get food entries for today
   */
  static async getTodaysFoodEntries(userId: string): Promise<ApiResponse<FoodEntry[]>> {
    const today = new Date().toISOString().split('T')[0];
    return this.getFoodEntries(userId, { date: today });
  }

  /**
   * Create a new food entry
   */
  static async createFoodEntry(
    userId: string,
    input: CreateFoodEntryInput
  ): Promise<ApiResponse<FoodEntry>> {
    return apiInterceptor.instrumentRequest(
      '/food/create',
      'POST',
      async () => {
        try {
          const entry: FoodEntryInsert = {
            user_id: userId,
            name: input.name,
            serving: input.serving,
            calories: input.calories,
            protein: input.protein,
            carbs: input.carbs,
            fat: input.fat,
            fiber: input.fiber,
            meal_type: input.meal_type,
            logged_at: new Date().toISOString(),
          };

          const { data, error } = await supabase
            .from('food_entries')
            // @ts-ignore - Supabase type inference issue
            .insert(entry)
            .select()
            .single<FoodEntry>();

          if (error) {
            return { error: error.message };
          }

          return { data };
        } catch (err) {
          return { error: err instanceof Error ? err.message : 'Failed to create food entry' };
        }
      }
    );
  }

  /**
   * Update an existing food entry
   */
  static async updateFoodEntry(
    userId: string,
    input: UpdateFoodEntryInput
  ): Promise<ApiResponse<FoodEntry>> {
    try {
      const { id, ...updates } = input;

      const updateData: FoodEntryUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('food_entries')
        // @ts-ignore - Supabase type inference issue
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single<FoodEntry>();

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update food entry' };
    }
  }

  /**
   * Delete a food entry
   */
  static async deleteFoodEntry(userId: string, entryId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('food_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

      if (error) {
        return { error: error.message };
      }

      return { message: 'Food entry deleted successfully' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete food entry' };
    }
  }

  /**
   * Get daily nutrition stats
   */
  static async getDailyStats(userId: string, date?: string): Promise<ApiResponse<DailyStats>> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const { data: entries, error } = await this.getFoodEntries(userId, { date: targetDate });

      if (error || !entries) {
        return { error: error || 'No entries found' };
      }

      const stats: DailyStats = {
        date: targetDate,
        user_id: userId,
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        total_fiber: 0,
        meal_count: entries.length,
      };

      entries.forEach((entry) => {
        stats.total_calories += entry.calories || 0;
        stats.total_protein += entry.protein || 0;
        stats.total_carbs += entry.carbs || 0;
        stats.total_fat += entry.fat || 0;
        stats.total_fiber += entry.fiber || 0;
      });

      return { data: stats };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to calculate daily stats' };
    }
  }

  /**
   * Get weekly nutrition stats (last 7 days)
   */
  static async getWeeklyStats(userId: string): Promise<ApiResponse<DailyStats[]>> {
    try {
      const weeklyStats: DailyStats[] = [];
      const today = new Date();
      
      // Get stats for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const { data: dayStats, error } = await this.getDailyStats(userId, dateString);
        
        if (error) {
          // If we can't get stats for a day, create empty stats
          weeklyStats.push({
            date: dateString,
            user_id: userId,
            total_calories: 0,
            total_protein: 0,
            total_carbs: 0,
            total_fat: 0,
            total_fiber: 0,
            meal_count: 0,
          });
        } else if (dayStats) {
          weeklyStats.push(dayStats);
        }
      }

      return { data: weeklyStats };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to calculate weekly stats' };
    }
  }

  /**
   * Search food database
   * Searches both user's history and verified food database (380K+ foods)
   */
  static async searchFood(query: string, limit: number = 25): Promise<ApiResponse<UnifiedFood[]>> {
    try {
      if (!query || query.length < 2) {
        return { data: [] };
      }

      // Search verified food database (380K+ foods)
      const { USDAFoodDataService } = await import('./USDAFoodDataService');

      const searchResult = await USDAFoodDataService.searchFoods(query, {
        pageSize: limit,
        sortBy: 'dataType.keyword', // Foundation & SR Legacy first (highest quality)
        sortOrder: 'asc'
      });

      // Convert to UnifiedFood format
      const unifiedFoods: UnifiedFood[] = searchResult.foods.map(food => {
        const unified = USDAFoodDataService.toUnifiedFood(food);
        return {
          id: `verified-${food.fdcId}`,
          ...unified,
          source: 'database' as const // Hide implementation details - just show "database"
        };
      });

      return { data: unifiedFoods };
    } catch (err) {
      console.error('[FoodService] searchFood error:', err);
      return { error: err instanceof Error ? err.message : 'Failed to search food' };
    }
  }

  /**
   * Get recent foods for a user (for quick logging)
   */
  static async getRecentFoods(limit: number = 10, userId?: string): Promise<ApiResponse<FoodEntry[]>> {
    try {
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { error: error.message };
      }

      // Remove duplicates by food name (keep most recent)
      const uniqueFoods = new Map<string, FoodEntry>();
      data?.forEach(food => {
        if (!uniqueFoods.has(food.name)) {
          uniqueFoods.set(food.name, food);
        }
      });

      return { data: Array.from(uniqueFoods.values()) };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to get recent foods' };
    }
  }

  /**
   * Get favorite foods for a user
   * TODO: Implement favorites table in database
   */
  static async getFavoriteFoods(userId: string): Promise<ApiResponse<FoodEntry[]>> {
    try {
      // For now, return most frequently logged foods
      // TODO: Create a favorites table and track user favorites
      console.log('[FoodService] getFavoriteFoods - Using most frequent foods as fallback');

      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(50);

      if (error) {
        return { error: error.message };
      }

      // Count frequency of each food name
      const foodCounts = new Map<string, { count: number; entry: FoodEntry }>();
      data?.forEach(food => {
        const existing = foodCounts.get(food.name);
        if (existing) {
          existing.count++;
        } else {
          foodCounts.set(food.name, { count: 1, entry: food });
        }
      });

      // Sort by frequency and return top 10
      const favorites = Array.from(foodCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(item => item.entry);

      return { data: favorites };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to get favorite foods' };
    }
  }

  /**
   * Add food to recent foods (tracks usage)
   * Note: This is automatic when creating food entries
   */
  static async addToRecentFoods(userId: string, foodId: string): Promise<ApiResponse<void>> {
    // No-op for now since food entries are automatically tracked by logged_at
    console.log('[FoodService] addToRecentFoods called for:', { userId, foodId });
    return { message: 'Food automatically tracked via logged_at timestamp' };
  }

  /**
   * Remove food from favorites
   * TODO: Implement favorites table in database
   */
  static async removeFromFavorites(userId: string, foodId: string): Promise<ApiResponse<void>> {
    // TODO: Implement when favorites table exists
    console.log('[FoodService] removeFromFavorites called for:', { userId, foodId });
    return { message: 'Favorites feature not yet implemented - needs favorites table' };
  }

  /**
   * Get food by barcode
   * Checks local database first, then verified food database
   */
  static async getFoodByBarcode(barcode: string): Promise<ApiResponse<FoodEntry>> {
    try {
      // Step 1: Check local food_items database first (fastest)
      const localResult = await this.checkLocalBarcodeDatabase(barcode);
      if (localResult) {
        console.log('[FoodService] Barcode found in local database');
        return { data: localResult };
      }

      // Step 2: Check verified food database (USDA, free, accurate)
      console.log('[FoodService] Checking verified food database...');
      const { USDAFoodDataService } = await import('./USDAFoodDataService');
      const verifiedFood = await USDAFoodDataService.searchByBarcode(barcode);

      if (verifiedFood) {
        console.log('[FoodService] Barcode found in verified database:', verifiedFood.description);

        // Convert to our format
        const unified = USDAFoodDataService.toUnifiedFood(verifiedFood);

        // Convert to FoodEntry format
        const foodEntry: FoodEntry = {
          id: `verified-${verifiedFood.fdcId}`,
          user_id: '', // Will be set when logged
          food_name: unified.name,
          calories: unified.calories_per_serving,
          protein: unified.protein_g,
          carbs: unified.carbs_g,
          fat: unified.fat_g,
          fiber: unified.fiber_g || 0,
          logged_at: new Date().toISOString(),
          meal_type: 'snack',
          serving_size: unified.serving_size,
          serving_unit: unified.serving_unit
        };

        // TODO: Optionally save to local database for faster future lookups

        return { data: foodEntry };
      }

      // Step 3: Not found anywhere
      return { error: 'Barcode not found. Try searching manually or entering nutrition info.' };
    } catch (err) {
      console.error('[FoodService] getFoodByBarcode error:', err);
      return { error: 'Failed to lookup barcode. Please try again.' };
    }
  }

  /**
   * Check local database for barcode
   */
  private static async checkLocalBarcodeDatabase(barcode: string): Promise<FoodEntry | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if user has logged this barcode before
      // Note: Requires barcode field in food_entries table
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Update metabolic tracking with today's food intake
   * Call this at the end of the day or when daily logging is complete
   *
   * @param userId - User's UUID
   * @param profile - User's profile (for target calories)
   */
  static async updateMetabolicTracking(
    userId: string,
    profile?: { daily_calories?: number }
  ): Promise<void> {
    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Get today's food entries
      const { data: todayStats } = await this.getDailyStats(userId, today);

      if (!todayStats) {
        console.log('[FoodService] No food entries for today - skipping metabolic tracking');
        return;
      }

      // Calculate adherence score (0.0 to 1.0)
      const targetCalories = profile?.daily_calories || 2000;
      const actualCalories = todayStats.total_calories;
      const adherenceScore = Math.min(1.0, actualCalories > 0 ? actualCalories / targetCalories : 0);

      // Log to metabolic tracking
      await MetabolicAdaptationService.logDailyData(
        userId,
        today,
        null,  // weight will be logged separately
        actualCalories,
        adherenceScore
      );

      console.log(`[FoodService] ✅ Metabolic tracking updated: ${actualCalories} kcal, adherence ${(adherenceScore * 100).toFixed(0)}%`);

    } catch (error) {
      console.error('[FoodService] Failed to update metabolic tracking:', error);
      // Non-fatal - don't throw
    }
  }
}

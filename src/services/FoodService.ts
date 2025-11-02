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
        .order('created_at', { ascending: false });

      if (options?.date) {
        const startOfDay = new Date(options.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(options.date);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
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
            food_name: input.food_name,
            serving_size: input.serving_size,
            calories: input.calories,
            protein_g: input.protein_g,
            carbs_g: input.carbs_g,
            fat_g: input.fat_g,
            fiber_g: input.fiber_g,
            sodium_mg: input.sodium_mg,
            sugar_g: input.sugar_g,
            meal_type: input.meal_type,
            photo_url: input.photo_url,
          };

          const { data, error } = await supabase
            .from('food_entries')
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
   * Quick add calories - convenient method for logging calories without full macro breakdown
   * Creates a generic food entry with just calories and meal type
   */
  static async quickAddCalories(
    userId: string,
    calories: number,
    mealType: string
  ): Promise<ApiResponse<FoodEntry>> {
    return this.createFoodEntry(userId, {
      food_name: `Quick Add - ${calories} calories`,
      serving_size: '1 serving',
      calories,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      meal_type: mealType as any,
    });
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
        stats.total_protein += entry.protein_g || 0;
        stats.total_carbs += entry.carbs_g || 0;
        stats.total_fat += entry.fat_g || 0;
        stats.total_fiber += entry.fiber_g || 0;
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
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { error: error.message };
      }

      // Remove duplicates by food name (keep most recent)
      const uniqueFoods = new Map<string, FoodEntry>();
      data?.forEach(food => {
        if (!uniqueFoods.has(food.food_name)) {
          uniqueFoods.set(food.food_name, food);
        }
      });

      return { data: Array.from(uniqueFoods.values()) };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to get recent foods' };
    }
  }

  /**
   * Get favorite foods for a user
   * Queries the favorite_foods table for user's saved favorites
   */
  static async getFavoriteFoods(userId: string): Promise<ApiResponse<FoodEntry[]>> {
    try {
      const { data, error } = await supabase
        .from('favorite_foods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      // Convert favorite_foods format to FoodEntry format
      const favorites: FoodEntry[] = (data || []).map(fav => ({
        id: fav.id,
        user_id: fav.user_id,
        food_name: fav.food_name,
        serving_size: `${fav.serving_size} ${fav.serving_unit}`,
        calories: fav.calories,
        protein_g: fav.protein,
        carbs_g: fav.carbs,
        fat_g: fav.fat,
        fiber_g: fav.fiber,
        created_at: fav.created_at,
        meal_type: 'snack', // Default, will be set when logging
      }));

      return { data: favorites };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to get favorite foods' };
    }
  }

  /**
   * Add food entry to favorites
   * Stores the food in favorite_foods table for quick access
   */
  static async addToFavorites(userId: string, foodEntry: FoodEntry): Promise<ApiResponse<void>> {
    try {
      // Check if already favorited
      const { data: existing } = await supabase
        .from('favorite_foods')
        .select('id')
        .eq('user_id', userId)
        .eq('food_name', foodEntry.food_name)
        .maybeSingle();

      if (existing) {
        return { message: 'Food already in favorites' };
      }

      // Parse serving size (e.g., "100 g" -> 100 and "g")
      const servingSizeMatch = foodEntry.serving_size?.match(/^([\d.]+)\s*(.*)$/);
      const servingSize = servingSizeMatch ? parseFloat(servingSizeMatch[1]) : 1;
      const servingUnit = servingSizeMatch ? servingSizeMatch[2] || 'serving' : 'serving';

      // Add to favorites
      const { error } = await supabase
        .from('favorite_foods')
        .insert({
          user_id: userId,
          food_name: foodEntry.food_name,
          calories: foodEntry.calories || 0,
          protein: foodEntry.protein_g || 0,
          carbs: foodEntry.carbs_g || 0,
          fat: foodEntry.fat_g || 0,
          fiber: foodEntry.fiber_g || 0,
          serving_size: servingSize,
          serving_unit: servingUnit,
        });

      if (error) {
        return { error: error.message };
      }

      return { message: 'Added to favorites successfully' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to add to favorites' };
    }
  }

  /**
   * Add food to recent foods (tracks usage)
   * Note: This is automatic when creating food entries
   */
  static async addToRecentFoods(userId: string, foodId: string): Promise<ApiResponse<void>> {
    // No-op for now since food entries are automatically tracked by created_at
    console.log('[FoodService] addToRecentFoods called for:', { userId, foodId });
    return { message: 'Food automatically tracked via created_at timestamp' };
  }

  /**
   * Remove food from favorites
   * Deletes the food from favorite_foods table
   */
  static async removeFromFavorites(userId: string, foodName: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('favorite_foods')
        .delete()
        .eq('user_id', userId)
        .eq('food_name', foodName);

      if (error) {
        return { error: error.message };
      }

      return { message: 'Removed from favorites successfully' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to remove from favorites' };
    }
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

        // Convert to FoodEntry format with barcode for caching
        const foodEntry: FoodEntry = {
          id: `verified-${verifiedFood.fdcId}`,
          user_id: '', // Will be set when logged
          food_name: unified.name,
          calories: unified.calories_per_serving,
          protein_g: unified.protein_g,
          carbs_g: unified.carbs_g,
          fat_g: unified.fat_g,
          fiber_g: unified.fiber_g || 0,
          created_at: new Date().toISOString(),
          meal_type: 'snack',
          serving_size: `${unified.serving_size} ${unified.serving_unit}`,
          barcode: barcode, // Store barcode for local caching
        };

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
   * Returns cached food entry if user has scanned this barcode before
   */
  private static async checkLocalBarcodeDatabase(barcode: string): Promise<FoodEntry | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if user has logged this barcode before
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('barcode', barcode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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

/**
 * Food Search Service
 * Pure Supabase implementation for food search with USDA integration
 */

import { supabase as typedSupabase } from '../lib/supabase';

// Use untyped supabase for RPC calls to avoid type errors
const supabase = typedSupabase as any;

export interface FoodSearchResult {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  usda_fdc_id?: string;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  serving_size: number;
  serving_unit: string;
  // Micronutrients
  vitamin_a_mcg?: number;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  potassium_mg?: number;
  // Metadata
  is_verified: boolean;
  data_quality_score?: number;
  popularity_score?: number;
}

export class FoodSearchService {
  /**
   * Search foods by name
   */
  async searchFoods(query: string, limit: number = 20): Promise<FoodSearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
        .order('is_verified', { ascending: false })
        .order('data_quality_score', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) {
        console.error('Food search error:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search foods:', error);
      return [];
    }
  }

  /**
   * Search by barcode
   */
  async searchByBarcode(barcode: string): Promise<FoodSearchResult | null> {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('barcode', barcode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('Barcode search error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to search barcode:', error);
      return null;
    }
  }

  /**
   * Get food by ID
   */
  async getFoodById(id: string): Promise<FoodSearchResult | null> {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Get food error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get food:', error);
      return null;
    }
  }

  /**
   * Get popular foods
   */
  async getPopularFoods(limit: number = 100): Promise<FoodSearchResult[]> {
    try {
      // Use the database function to get popular foods
      const { data, error } = await supabase
        .rpc('get_popular_foods_for_cache', {
          p_limit: limit,
          p_min_score: 0.7,
        } as any);

      if (error) {
        console.error('Get popular foods error:', error);
        throw error;
      }

      // Transform to FoodSearchResult format
      return (data || []).map((item: any) => ({
        id: item.food_id,
        name: item.food_name,
        ...item,
      }));
    } catch (error) {
      console.error('Failed to get popular foods:', error);
      return [];
    }
  }

  /**
   * Track food search (for popularity)
   */
  async trackSearch(foodId: string, userId?: string): Promise<void> {
    if (!userId) return;

    try {
      await supabase.rpc('increment_food_search_count', {
        p_food_id: foodId,
        p_user_id: userId,
      } as any);
    } catch (error) {
      // Non-critical, just log
      console.warn('Failed to track search:', error);
    }
  }

  /**
   * Track food log (for popularity)
   */
  async trackLog(foodId: string, userId?: string): Promise<void> {
    if (!userId) return;

    try {
      await supabase.rpc('increment_food_log_count', {
        p_food_id: foodId,
        p_user_id: userId,
      } as any);
    } catch (error) {
      // Non-critical, just log
      console.warn('Failed to track log:', error);
    }
  }

  /**
   * Get user's favorite foods
   */
  async getUserFavorites(userId: string, limit: number = 50): Promise<FoodSearchResult[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_favorite_foods', {
          p_user_id: userId,
          p_limit: limit,
        } as any);

      if (error) {
        console.error('Get user favorites error:', error);
        throw error;
      }

      // Transform to FoodSearchResult format
      return (data || []).map((item: any) => ({
        id: item.food_id,
        name: item.food_name,
        ...item,
      }));
    } catch (error) {
      console.error('Failed to get user favorites:', error);
      return [];
    }
  }
}

// Export singleton instance
export const foodSearchService = new FoodSearchService();

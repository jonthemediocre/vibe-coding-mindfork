import { supabase } from "@/lib/supabase";
import type { DietColor } from "../types/supabase";
import type { ApiResponse } from "../types/models";

/**
 * FoodClassificationService
 *
 * Handles automatic classification of foods into Green/Yellow/Red categories
 * based on nutritional content, category, and tags.
 *
 * GREEN = Go ahead! Nutrient-dense, whole foods
 * YELLOW = Moderate - Track portions
 * RED = Limit - Occasional treats
 */
export class FoodClassificationService {
  /**
   * Color palette for UI
   */
  static readonly COLORS = {
    green: {
      primary: "#10B981", // emerald-500
      light: "#D1FAE5",   // emerald-100
      dark: "#059669",    // emerald-600
      text: "#064E3B",    // emerald-900
    },
    yellow: {
      primary: "#F59E0B", // amber-500
      light: "#FEF3C7",   // amber-100
      dark: "#D97706",    // amber-600
      text: "#78350F",    // amber-900
    },
    red: {
      primary: "#EF4444", // red-500
      light: "#FEE2E2",   // red-100
      dark: "#DC2626",    // red-600
      text: "#7F1D1D",    // red-900
    },
    neutral: {
      primary: "#6B7280", // gray-500
      light: "#F3F4F6",   // gray-100
      dark: "#4B5563",    // gray-600
      text: "#1F2937",    // gray-800
    },
  };

  /**
   * Get friendly label for color
   */
  static getColorLabel(color: DietColor): string {
    const labels: Record<DietColor, string> = {
      green: "Great Choice!",
      yellow: "In Moderation",
      red: "Occasional Treat",
      neutral: "Unclassified",
    };
    return labels[color];
  }

  /**
   * Get emoji for color
   */
  static getColorEmoji(color: DietColor): string {
    const emojis: Record<DietColor, string> = {
      green: "✅",
      yellow: "⚠️",
      red: "🔴",
      neutral: "⚪",
    };
    return emojis[color];
  }

  /**
   * Classify a food based on its nutritional content
   * This calls the Postgres function we created in the migration
   */
  static async classifyFood(params: {
    foodCategory?: string;
    tags?: string[];
    caloriesPer100g: number;
    proteinPer100g?: number;
    carbsPer100g?: number;
    fatPer100g?: number;
    fiberPer100g?: number;
    sugarPer100g?: number;
  }): Promise<ApiResponse<DietColor>> {
    try {
      const { data, error } = await supabase.rpc("classify_food_color", {
        p_food_category: params.foodCategory || null,
        p_tags: params.tags || null,
        p_calories_per_100g: params.caloriesPer100g,
        p_protein_per_100g: params.proteinPer100g || 0,
        p_carbs_per_100g: params.carbsPer100g || 0,
        p_fat_per_100g: params.fatPer100g || 0,
        p_fiber_per_100g: params.fiberPer100g || 0,
        p_sugar_per_100g: params.sugarPer100g || 0,
      });

      if (error) {
        console.error("[FoodClassificationService] Classification error:", error);
        return { error: error.message };
      }

      return { data: (data as DietColor) || "neutral" };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Failed to classify food",
      };
    }
  }

  /**
   * Get classification rules from database
   */
  static async getClassificationRules(): Promise<
    ApiResponse<Array<{
      rule_name: string;
      diet_color: DietColor;
      category_pattern: string | null;
      tag_pattern: string | null;
      priority: number;
    }>>
  > {
    try {
      const { data, error } = await supabase
        .from("diet_classification_rules")
        .select("rule_name, diet_color, category_pattern, tag_pattern, priority")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Failed to fetch classification rules",
      };
    }
  }

  /**
   * Get daily color distribution for user
   */
  static async getDailyColorDistribution(
    userId: string,
    date?: string
  ): Promise<
    ApiResponse<{
      green: { count: number; calories: number };
      yellow: { count: number; calories: number };
      red: { count: number; calories: number };
      neutral: { count: number; calories: number };
    }>
  > {
    try {
      const targetDate = date || new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("food_entries")
        .select("diet_color, calories")
        .eq("user_id", userId)
        .gte("logged_at", `${targetDate}T00:00:00.000Z`)
        .lte("logged_at", `${targetDate}T23:59:59.999Z`);

      if (error) {
        return { error: error.message };
      }

      const distribution = {
        green: { count: 0, calories: 0 },
        yellow: { count: 0, calories: 0 },
        red: { count: 0, calories: 0 },
        neutral: { count: 0, calories: 0 },
      };

      data?.forEach((entry) => {
        const color = (entry.diet_color || "neutral") as DietColor;
        distribution[color].count += 1;
        distribution[color].calories += entry.calories || 0;
      });

      return { data: distribution };
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to get color distribution",
      };
    }
  }

  /**
   * Get color balance score (0-100)
   * Higher score = better balance (more green, less red)
   */
  static calculateColorScore(distribution: {
    green: { count: number };
    yellow: { count: number };
    red: { count: number };
    neutral: { count: number };
  }): number {
    const total =
      distribution.green.count +
      distribution.yellow.count +
      distribution.red.count +
      distribution.neutral.count;

    if (total === 0) return 0;

    const greenWeight = 10;
    const yellowWeight = 5;
    const redWeight = -5;

    const score =
      (distribution.green.count * greenWeight +
        distribution.yellow.count * yellowWeight +
        distribution.red.count * redWeight) /
      total;

    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, ((score + 5) / 15) * 100));
  }

  /**
   * Get personalized food suggestions based on color balance
   */
  static getColorBalanceSuggestions(distribution: {
    green: { count: number };
    yellow: { count: number };
    red: { count: number };
    neutral: { count: number };
  }): string[] {
    const suggestions: string[] = [];
    const total =
      distribution.green.count +
      distribution.yellow.count +
      distribution.red.count;

    if (total === 0) {
      return ["Start logging your meals to track your nutritional balance!"];
    }

    const greenPercent = (distribution.green.count / total) * 100;
    const redPercent = (distribution.red.count / total) * 100;

    if (greenPercent < 50) {
      suggestions.push(
        "Try adding more vegetables, fruits, and whole grains to your meals."
      );
    }

    if (redPercent > 30) {
      suggestions.push(
        "You have quite a few red foods today. Consider swapping some for green alternatives."
      );
    }

    if (distribution.yellow.count > distribution.green.count) {
      suggestions.push(
        "Great job with moderation! Try adding more green foods for optimal nutrition."
      );
    }

    if (greenPercent >= 70) {
      suggestions.push(
        "Excellent! You are making great nutritional choices today."
      );
    }

    return suggestions.length > 0
      ? suggestions
      : ["Keep up the great work with your balanced eating!"];
  }

  /**
   * Find green alternatives for a food item
   */
  static async findGreenAlternatives(params: {
    foodName: string;
    category?: string;
    limit?: number;
  }): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    brand: string | null;
    calories_per_100g: number;
    protein_per_100g: number | null;
    diet_color: DietColor;
  }>>> {
    try {
      let query = supabase
        .from("foods")
        .select("id, name, brand, calories_per_100g, protein_per_100g, diet_color")
        .eq("diet_color", "green")
        .limit(params.limit || 5);

      if (params.category) {
        query = query.ilike("food_category", `%${params.category}%`);
      }

      const { data, error } = await query;

      if (error) {
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to find green alternatives",
      };
    }
  }
}

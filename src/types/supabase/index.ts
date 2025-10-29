/**
 * MindFork Supabase Database Types
 *
 * Domain-organized type definitions for better maintainability and navigation.
 * Each domain has its own file with related tables.
 */

// Core database types
export type { Json, DatabaseBase } from './database';

// Authentication & User Profile Types
export type {
  // Table interfaces
  ProfilesTable,
  UserSettingsTable,
  AuthTables,

  // Convenience types
  Profile,
  ProfileInsert,
  ProfileUpdate,
  UserSettings,
  UserSettingsInsert,
  UserSettingsUpdate,
} from './auth.types';

// Nutrition & Food Tracking Types
export type {
  // Table interfaces
  FoodEntriesTable,
  MealPlansTable,
  RecipesTable,
  RecipeIngredientsTable,
  NutritionTables,

  // Convenience types
  FoodEntry,
  FoodEntryInsert,
  FoodEntryUpdate,
  MealPlan,
  MealPlanInsert,
  MealPlanUpdate,
  Recipe,
  RecipeInsert,
  RecipeUpdate,
  RecipeIngredient,
  RecipeIngredientInsert,
  RecipeIngredientUpdate,
} from './nutrition.types';

// Composite Database Type
// This combines all domain tables into the complete database schema
import type { AuthTables } from './auth.types';
import type { NutritionTables } from './nutrition.types';

/**
 * Complete MindFork Database Schema
 *
 * This is the main Database type that should be used for Supabase client initialization.
 * It automatically composes all domain tables into the public schema.
 */
export interface Database {
  public: {
    Tables: AuthTables & NutritionTables;
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

/**
 * NOTE: Additional domain types to be added:
 *
 * - Coaching Types (coaches, coach_messages, ai_conversations, ai_messages, ai_insights)
 * - Goals Types (goals, goal_progress, achievements, achievement_types)
 * - Food Management Types (foods, user_foods, food_logs, daily_nutrition_summaries)
 * - Meal Planning Types (planned_meals, planned_meal_foods)
 * - Analytics Types (user_nutrition_trends, popular_foods, user_goal_summaries)
 * - Storage Types (user_storage_usage)
 * - Functions (calculate_nutrition_values, check_achievements, etc.)
 *
 * These will be extracted from the monolithic supabase.ts file in subsequent refactoring phases.
 */

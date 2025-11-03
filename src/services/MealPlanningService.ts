/**
 * MealPlanningService - Comprehensive meal planning and recipe management
 *
 * Features:
 * - Weekly meal plan management (7-day calendar)
 * - Recipe integration with Supabase recipes table
 * - Meal templates (save and reuse meal combinations)
 * - Shopping list generation from planned meals
 * - Drag & drop meal assignment
 * - Macro preview and tracking
 */

import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../types/models';

// ===========================
// Types
// ===========================

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  cuisine_type?: string;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings: number;
  calories_per_serving?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  image_url?: string;
  instructions?: Array<{ step: number; text: string }>;
  ingredients?: RecipeIngredient[];
  tags?: string[];
  created_at: string;
  created_by?: string;
  is_public: boolean;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
}

export interface MealPlanEntry {
  id: string;
  meal_plan_id: string | null;
  user_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: string; // ISO date string (YYYY-MM-DD)
  recipe_id: string | null;
  food_entry_id: string | null;
  servings: number | null;
  notes: string | null;
  created_at: string | null;
}

export interface MealTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  meals: {
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    recipe_id?: string;
    food_entry_id?: string;
    servings: number;
  }[];
  created_at: string;
}

export interface ShoppingListItem {
  ingredient_name: string;
  total_quantity: string;
  unit: string;
  recipes: string[]; // Recipe names that use this ingredient
  checked: boolean;
}

export interface DailyMacroSummary {
  date: string;
  planned_calories: number;
  planned_protein: number;
  planned_carbs: number;
  planned_fat: number;
  planned_fiber: number;
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
}

export interface RecipeFilter {
  search?: string;
  cuisine_type?: string;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  max_prep_time?: number;
  max_calories?: number;
  tags?: string[];
  is_public?: boolean;
}

// ===========================
// Service Implementation
// ===========================

export class MealPlanningService {

  // ===========================
  // Meal Plan CRUD
  // ===========================

  /**
   * Get meal plan for a date range (typically 7 days)
   */
  static async getMealPlan(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<MealPlanEntry[]>> {
    try {
      const { data, error } = await supabase
        .from('meal_plan_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('meal_type', { ascending: true});

      if (error) {
        logger.error('Error fetching meal plan', error);
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      logger.error('Error in getMealPlan', err as Error);
      return { error: 'Failed to fetch meal plan' };
    }
  }

  /**
   * Get or create a default meal plan for the user
   */
  static async getOrCreateDefaultMealPlan(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<string>> {
    try {
      // Check if user has an active meal plan for this period
      const { data: existingPlans, error: fetchError } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('end_date', startDate)
        .lte('start_date', endDate)
        .limit(1);

      if (fetchError) {
        logger.error('Error fetching meal plans', fetchError);
        return { error: fetchError.message };
      }

      if (existingPlans && existingPlans.length > 0) {
        return { data: existingPlans[0].id };
      }

      // Create a new meal plan
      const { data: newPlan, error: createError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userId,
          name: 'Weekly Meal Plan',
          description: 'Auto-generated meal plan',
          plan_type: 'custom',
          start_date: startDate,
          end_date: endDate,
          is_active: true,
          is_template: false,
        })
        .select('id')
        .single();

      if (createError) {
        logger.error('Error creating meal plan', createError);
        return { error: createError.message };
      }

      return { data: newPlan.id };
    } catch (err) {
      logger.error('Error in getOrCreateDefaultMealPlan', err as Error);
      return { error: 'Failed to get or create meal plan' };
    }
  }

  /**
   * Add a meal to a specific slot (date + meal type)
   */
  static async addMealToSlot(
    userId: string,
    date: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    options: {
      recipeId?: string;
      foodEntryId?: string;
      servings?: number;
      notes?: string;
      // Legacy fields (ignored, kept for backwards compatibility)
      mealName?: string;
      mealDescription?: string;
      estimatedCalories?: number;
      estimatedProteinG?: number;
      estimatedCarbsG?: number;
      estimatedFatG?: number;
    }
  ): Promise<ApiResponse<MealPlanEntry>> {
    try {
      // Get or create meal plan
      const { data: mealPlanId, error: planError } = await this.getOrCreateDefaultMealPlan(
        userId,
        date,
        date
      );

      if (planError || !mealPlanId) {
        return { error: planError || 'Failed to get meal plan' };
      }

      // Fetch meal name from recipe or food entry if not provided in notes
      let mealName = options.notes;

      if (!mealName && options.recipeId) {
        const { data: recipe } = await supabase
          .from('recipes')
          .select('name')
          .eq('id', options.recipeId)
          .single();
        mealName = recipe?.name;
      }

      if (!mealName && options.foodEntryId) {
        const { data: foodEntry } = await supabase
          .from('food_entries')
          .select('food_name')
          .eq('id', options.foodEntryId)
          .single();
        mealName = foodEntry?.food_name;
      }

      // meal_plan_entries schema: date, meal_type, recipe_id, food_entry_id, servings, notes, meal_plan_id, user_id
      const newMeal = {
        meal_plan_id: mealPlanId,
        user_id: userId,
        meal_type: mealType,
        date: date, // Changed from planned_date to date
        recipe_id: options.recipeId || null,
        food_entry_id: options.foodEntryId || null,
        servings: options.servings || 1,
        notes: mealName || options.notes || null,
      };

      const { data, error } = await supabase
        .from('meal_plan_entries') // Changed from planned_meals
        .insert(newMeal)
        .select()
        .single();

      if (error) {
        logger.error('Error adding meal to slot', error);
        return { error: error.message };
      }

      return { data, message: 'Meal added successfully' };
    } catch (err) {
      logger.error('Error in addMealToSlot', err as Error);
      return { error: 'Failed to add meal to plan' };
    }
  }

  /**
   * Remove a meal from the plan
   */
  static async removeMealFromSlot(
    userId: string,
    mealId: string
  ): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('meal_plan_entries')
        .delete()
        .eq('id', mealId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error removing meal', error);
        return { error: error.message };
      }

      return { message: 'Meal removed successfully' };
    } catch (err) {
      logger.error('Error in removeMealFromSlot', err as Error);
      return { error: 'Failed to remove meal' };
    }
  }

  /**
   * Update meal servings or notes
   */
  static async updateMeal(
    userId: string,
    mealId: string,
    updates: { servings?: number; notes?: string }
  ): Promise<ApiResponse<MealPlanEntry>> {
    try {
      const { data, error } = await supabase
        .from('meal_plan_entries')
        .update(updates)
        .eq('id', mealId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating meal', error);
        return { error: error.message };
      }

      return { data };
    } catch (err) {
      logger.error('Error in updateMeal', err as Error);
      return { error: 'Failed to update meal' };
    }
  }

  // ===========================
  // Recipe Management
  // ===========================

  /**
   * Search/filter recipes
   */
  static async getRecipes(
    filters?: RecipeFilter,
    limit: number = 50
  ): Promise<ApiResponse<Recipe[]>> {
    try {
      let query = supabase
        .from('recipes')
        .select(`
          *,
          ingredients:recipe_ingredients(*),
          tags:recipe_tags(tag)
        `)
        .eq('is_public', filters?.is_public ?? true)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (filters?.search) {
        query = query.textSearch('name', filters.search);
      }

      if (filters?.cuisine_type) {
        query = query.eq('cuisine_type', filters.cuisine_type);
      }

      if (filters?.difficulty_level) {
        query = query.eq('difficulty_level', filters.difficulty_level);
      }

      if (filters?.max_prep_time) {
        query = query.lte('prep_time_minutes', filters.max_prep_time);
      }

      if (filters?.max_calories) {
        query = query.lte('calories_per_serving', filters.max_calories);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching recipes', error);
        return { error: error.message };
      }

      // Transform tags from array of objects to array of strings
      const recipes = (data || []).map(recipe => ({
        ...recipe,
        tags: recipe.tags?.map((t: any) => t.tag) || [],
      }));

      return { data: recipes };
    } catch (err) {
      logger.error('Error in getRecipes', err as Error);
      return { error: 'Failed to fetch recipes' };
    }
  }

  /**
   * Get a single recipe with full details
   */
  static async getRecipeById(recipeId: string): Promise<ApiResponse<Recipe>> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients:recipe_ingredients(*),
          tags:recipe_tags(tag)
        `)
        .eq('id', recipeId)
        .single();

      if (error) {
        logger.error('Error fetching recipe', error);
        return { error: error.message };
      }

      // Transform tags
      const recipe = {
        ...data,
        tags: data.tags?.map((t: any) => t.tag) || [],
      };

      return { data: recipe };
    } catch (err) {
      logger.error('Error in getRecipeById', err as Error);
      return { error: 'Failed to fetch recipe details' };
    }
  }

  // ===========================
  // Meal Templates
  // ===========================

  /**
   * Get user's saved meal templates
   */
  static async getMealTemplates(userId: string): Promise<ApiResponse<MealTemplate[]>> {
    try {
      const { data, error } = await supabase
        .from('meal_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching meal templates', error);
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      logger.error('Error in getMealTemplates', err as Error);
      return { error: 'Failed to fetch meal templates' };
    }
  }

  /**
   * Save a new meal template
   */
  static async saveMealTemplate(
    userId: string,
    name: string,
    meals: MealTemplate['meals'],
    description?: string
  ): Promise<ApiResponse<MealTemplate>> {
    try {
      const template = {
        user_id: userId,
        name,
        description: description || null,
        meals,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('meal_templates')
        .insert(template)
        .select()
        .single();

      if (error) {
        logger.error('Error saving meal template', error);
        return { error: error.message };
      }

      return { data, message: 'Template saved successfully' };
    } catch (err) {
      logger.error('Error in saveMealTemplate', err as Error);
      return { error: 'Failed to save meal template' };
    }
  }

  /**
   * Apply a template to a specific date
   */
  static async applyTemplate(
    userId: string,
    templateId: string,
    targetDate: string
  ): Promise<ApiResponse<MealPlanEntry[]>> {
    try {
      // Get or create meal plan for target date
      const { data: mealPlanId, error: planError } = await this.getOrCreateDefaultMealPlan(
        userId,
        targetDate,
        targetDate
      );

      if (planError || !mealPlanId) {
        return { error: planError || 'Failed to get meal plan' };
      }

      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from('meal_templates')
        .select('*')
        .eq('id', templateId)
        .eq('user_id', userId)
        .single();

      if (templateError || !template) {
        return { error: 'Template not found' };
      }

      // Create meal plan entries from template
      const mealPlans = template.meals.map((meal: any) => ({
        meal_plan_id: mealPlanId,
        user_id: userId,
        date: targetDate,
        meal_type: meal.meal_type,
        food_entry_id: meal.food_entry_id || null,
        recipe_id: meal.recipe_id || null,
        servings: meal.servings || 1,
        notes: meal.notes || null,
      }));

      const { data, error } = await supabase
        .from('meal_plan_entries')
        .insert(mealPlans)
        .select();

      if (error) {
        logger.error('Error applying template', error);
        return { error: error.message };
      }

      return { data: data || [], message: 'Template applied successfully' };
    } catch (err) {
      logger.error('Error in applyTemplate', err as Error);
      return { error: 'Failed to apply template' };
    }
  }

  /**
   * Delete a meal template
   */
  static async deleteTemplate(
    userId: string,
    templateId: string
  ): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('meal_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error deleting template', error);
        return { error: error.message };
      }

      return { message: 'Template deleted successfully' };
    } catch (err) {
      logger.error('Error in deleteTemplate', err as Error);
      return { error: 'Failed to delete template' };
    }
  }

  // ===========================
  // Shopping List Generation
  // ===========================

  /**
   * Generate shopping list from meal plan
   * Uses meal_plan_entries schema with recipe_id and food_entry_id
   */
  static async generateShoppingList(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<ShoppingListItem[]>> {
    try {
      // Get all meal plan entries for the date range
      const { data: mealEntries, error: entriesError } = await supabase
        .from('meal_plan_entries')
        .select(`
          *,
          recipe:recipes(
            id,
            name,
            ingredients:recipe_ingredients(*)
          )
        `)
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (entriesError) {
        logger.error('Error fetching meal entries for shopping list', entriesError);
        return { error: entriesError.message };
      }

      if (!mealEntries || mealEntries.length === 0) {
        return { data: [] };
      }

      // Aggregate ingredients
      const ingredientMap = new Map<string, {
        quantities: number[];
        unit: string;
        recipes: Set<string>;
      }>();

      for (const entry of mealEntries) {
        if (!entry.recipe || !entry.recipe.ingredients) continue;

        const recipe = entry.recipe as any;
        const servings = entry.servings || 1;

        for (const ingredient of recipe.ingredients) {
          const name = ingredient.ingredient_name.toLowerCase();
          const unit = ingredient.unit || '';
          const quantity = parseFloat(ingredient.quantity || '1') * servings;

          if (!ingredientMap.has(name)) {
            ingredientMap.set(name, {
              quantities: [],
              unit,
              recipes: new Set(),
            });
          }

          const existing = ingredientMap.get(name)!;
          existing.quantities.push(quantity);
          existing.recipes.add(recipe.name);
        }
      }

      // Convert to ShoppingListItem array
      const shoppingList: ShoppingListItem[] = Array.from(ingredientMap.entries()).map(
        ([name, data]) => ({
          ingredient_name: name.charAt(0).toUpperCase() + name.slice(1),
          total_quantity: data.quantities.reduce((a, b) => a + b, 0).toFixed(1),
          unit: data.unit,
          recipes: Array.from(data.recipes),
          checked: false,
        })
      );

      // Cache the list
      await AsyncStorage.setItem(
        `@mindfork:shopping_list:${userId}`,
        JSON.stringify(shoppingList)
      );

      return { data: shoppingList };
    } catch (err) {
      logger.error('Error in generateShoppingList', err as Error);
      return { error: 'Failed to generate shopping list' };
    }
  }

  /**
   * Get cached shopping list
   */
  static async getCachedShoppingList(userId: string): Promise<ShoppingListItem[]> {
    try {
      const cached = await AsyncStorage.getItem(`@mindfork:shopping_list:${userId}`);
      return cached ? JSON.parse(cached) : [];
    } catch (err) {
      logger.error('Error getting cached shopping list', err as Error);
      return [];
    }
  }

  /**
   * Update shopping list item check status
   */
  static async updateShoppingListItem(
    userId: string,
    ingredientName: string,
    checked: boolean
  ): Promise<void> {
    try {
      const list = await this.getCachedShoppingList(userId);
      const updated = list.map(item =>
        item.ingredient_name === ingredientName ? { ...item, checked } : item
      );
      await AsyncStorage.setItem(
        `@mindfork:shopping_list:${userId}`,
        JSON.stringify(updated)
      );
    } catch (err) {
      logger.error('Error updating shopping list item', err as Error);
    }
  }

  // ===========================
  // Macro Summary
  // ===========================

  /**
   * Calculate daily macro summary for a date
   */
  static async getDailyMacroSummary(
    userId: string,
    date: string,
    userGoals?: {
      daily_calorie_goal?: number;
      daily_protein_goal?: number;
      daily_carbs_goal?: number;
      daily_fat_goal?: number;
    }
  ): Promise<ApiResponse<DailyMacroSummary>> {
    try {
      // Get meal plan for the day
      const { data: mealPlan, error } = await this.getMealPlan(userId, date, date);

      if (error || !mealPlan) {
        return { error: 'Failed to fetch meal plan' };
      }

      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let totalFiber = 0;

      // Calculate macros by fetching recipe/food_entry nutrition data
      for (const meal of mealPlan) {
        const servings = meal.servings || 1;

        // If meal references a recipe, fetch recipe nutrition
        if (meal.recipe_id) {
          const { data: recipe } = await supabase
            .from('recipes')
            .select('calories_per_serving, protein_g, carbs_g, fat_g, fiber_g')
            .eq('id', meal.recipe_id)
            .single();

          if (recipe) {
            totalCalories += (recipe.calories_per_serving || 0) * servings;
            totalProtein += (recipe.protein_g || 0) * servings;
            totalCarbs += (recipe.carbs_g || 0) * servings;
            totalFat += (recipe.fat_g || 0) * servings;
            totalFiber += (recipe.fiber_g || 0) * servings;
          }
        }

        // If meal references a food entry, fetch food nutrition
        if (meal.food_entry_id) {
          const { data: foodEntry } = await supabase
            .from('food_entries')
            .select('calories, protein_g, carbs_g, fat_g, fiber_g')
            .eq('id', meal.food_entry_id)
            .single();

          if (foodEntry) {
            totalCalories += (foodEntry.calories || 0) * servings;
            totalProtein += (foodEntry.protein_g || 0) * servings;
            totalCarbs += (foodEntry.carbs_g || 0) * servings;
            totalFat += (foodEntry.fat_g || 0) * servings;
            totalFiber += (foodEntry.fiber_g || 0) * servings;
          }
        }
      }

      const summary: DailyMacroSummary = {
        date,
        planned_calories: Math.round(totalCalories),
        planned_protein: Math.round(totalProtein),
        planned_carbs: Math.round(totalCarbs),
        planned_fat: Math.round(totalFat),
        planned_fiber: Math.round(totalFiber),
        target_calories: userGoals?.daily_calorie_goal,
        target_protein: userGoals?.daily_protein_goal,
        target_carbs: userGoals?.daily_carbs_goal,
        target_fat: userGoals?.daily_fat_goal,
      };

      return { data: summary };
    } catch (err) {
      logger.error('Error in getDailyMacroSummary', err as Error);
      return { error: 'Failed to calculate macro summary' };
    }
  }
}

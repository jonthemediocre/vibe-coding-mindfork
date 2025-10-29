/**
 * Nutrition & Food Tracking Types
 * Includes: food_entries, meal_plans, recipes, recipe_ingredients
 */

/**
 * Food Entries Table
 */
export interface FoodEntriesTable {
  Row: {
    id: string;
    user_id: string;
    food_name: string;
    serving_size: string | null;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    fiber_g: number | null;
    sodium_mg: number | null;
    sugar_g: number | null;
    meal_type: "breakfast" | "lunch" | "dinner" | "snack" | null;
    photo_url: string | null;
    consumed_at: string;
    created_at: string;
  };
  Insert: {
    user_id: string;
    food_name: string;
    serving_size?: string | null;
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    sodium_mg?: number | null;
    sugar_g?: number | null;
    meal_type?: "breakfast" | "lunch" | "dinner" | "snack" | null;
    photo_url?: string | null;
    consumed_at?: string;
    created_at?: string;
  };
  Update: {
    food_name?: string;
    serving_size?: string | null;
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    sodium_mg?: number | null;
    sugar_g?: number | null;
    meal_type?: "breakfast" | "lunch" | "dinner" | "snack" | null;
    photo_url?: string | null;
    consumed_at?: string;
  };
}

/**
 * Meal Plans Table
 */
export interface MealPlansTable {
  Row: {
    id: string;
    user_id: string;
    date: string;
    meal_type: "breakfast" | "lunch" | "dinner" | "snack";
    food_entry_id: string | null;
    recipe_id: string | null;
    servings: number;
    notes: string | null;
    created_at: string;
  };
  Insert: {
    user_id: string;
    date: string;
    meal_type: "breakfast" | "lunch" | "dinner" | "snack";
    food_entry_id?: string | null;
    recipe_id?: string | null;
    servings?: number;
    notes?: string | null;
    created_at?: string;
  };
  Update: {
    date?: string;
    meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
    food_entry_id?: string | null;
    recipe_id?: string | null;
    servings?: number;
    notes?: string | null;
  };
}

/**
 * Recipes Table
 */
export interface RecipesTable {
  Row: {
    id: string;
    name: string;
    description: string | null;
    cuisine_type: string | null;
    difficulty_level: "easy" | "medium" | "hard" | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    servings: number;
    calories_per_serving: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    fiber_g: number | null;
    image_url: string | null;
    instructions: any | null; // JSON type
    tags: string[] | null;
    created_at: string;
    created_by: string | null;
    is_public: boolean;
  };
  Insert: {
    name: string;
    description?: string | null;
    cuisine_type?: string | null;
    difficulty_level?: "easy" | "medium" | "hard" | null;
    prep_time_minutes?: number | null;
    cook_time_minutes?: number | null;
    servings: number;
    calories_per_serving?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    image_url?: string | null;
    instructions?: any | null;
    tags?: string[] | null;
    created_at?: string;
    created_by?: string | null;
    is_public?: boolean;
  };
  Update: {
    name?: string;
    description?: string | null;
    cuisine_type?: string | null;
    difficulty_level?: "easy" | "medium" | "hard" | null;
    prep_time_minutes?: number | null;
    cook_time_minutes?: number | null;
    servings?: number;
    calories_per_serving?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    image_url?: string | null;
    instructions?: any | null;
    tags?: string[] | null;
    is_public?: boolean;
  };
}

/**
 * Recipe Ingredients Table
 */
export interface RecipeIngredientsTable {
  Row: {
    id: string;
    recipe_id: string;
    ingredient_name: string;
    quantity: string | null;
    unit: string | null;
    notes: string | null;
    order_index: number | null;
  };
  Insert: {
    recipe_id: string;
    ingredient_name: string;
    quantity?: string | null;
    unit?: string | null;
    notes?: string | null;
    order_index?: number | null;
  };
  Update: {
    ingredient_name?: string;
    quantity?: string | null;
    unit?: string | null;
    notes?: string | null;
    order_index?: number | null;
  };
}

/**
 * Nutrition domain table definitions
 */
export interface NutritionTables {
  food_entries: FoodEntriesTable;
  meal_plans: MealPlansTable;
  recipes: RecipesTable;
  recipe_ingredients: RecipeIngredientsTable;
}

// Convenience type exports
export type FoodEntry = FoodEntriesTable['Row'];
export type FoodEntryInsert = FoodEntriesTable['Insert'];
export type FoodEntryUpdate = FoodEntriesTable['Update'];

export type MealPlan = MealPlansTable['Row'];
export type MealPlanInsert = MealPlansTable['Insert'];
export type MealPlanUpdate = MealPlansTable['Update'];

export type Recipe = RecipesTable['Row'];
export type RecipeInsert = RecipesTable['Insert'];
export type RecipeUpdate = RecipesTable['Update'];

export type RecipeIngredient = RecipeIngredientsTable['Row'];
export type RecipeIngredientInsert = RecipeIngredientsTable['Insert'];
export type RecipeIngredientUpdate = RecipeIngredientsTable['Update'];

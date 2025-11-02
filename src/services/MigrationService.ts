/**
 * Database Migration Executor
 * Run this from the app to execute the migration
 */
import { supabase } from '../lib/supabase';

export async function executeMigration() {
  console.log('Starting database migration...');

  try {
    // Step 1: Create recipes table
    console.log('Creating recipes table...');
    const createRecipesSQL = `
      CREATE TABLE IF NOT EXISTS public.recipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        cuisine_type TEXT,
        difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
        prep_time_minutes INTEGER,
        cook_time_minutes INTEGER,
        servings INTEGER DEFAULT 1,
        calories_per_serving DECIMAL(10, 2),
        protein_g DECIMAL(10, 2),
        carbs_g DECIMAL(10, 2),
        fat_g DECIMAL(10, 2),
        fiber_g DECIMAL(10, 2),
        image_url TEXT,
        instructions JSONB,
        tags TEXT[],
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Step 2: Create recipe_ingredients table
    console.log('Creating recipe_ingredients table...');
    const createIngredientsSQL = `
      CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
        ingredient_name TEXT NOT NULL,
        quantity TEXT,
        unit TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Step 3: Add columns to planned_meals
    console.log('Adding columns to planned_meals...');
    const alterPlannedMealsSQL = `
      ALTER TABLE public.planned_meals
      ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS food_entry_id UUID REFERENCES public.food_entries(id) ON DELETE SET NULL;
    `;

    // Note: We can't execute raw SQL directly through Supabase client without a custom function
    // The user needs to run this in the Supabase Dashboard

    console.log('\n⚠️  Cannot execute SQL directly from app.');
    console.log('\nPlease run the migration in Supabase Dashboard:');
    console.log('1. Go to: Supabase Dashboard > SQL Editor');
    console.log('2. Copy SQL from: database/migrations/20250102_add_recipes_and_ingredients.sql');
    console.log('3. Click "Run"');

    return {
      success: false,
      message: 'Migration must be run in Supabase Dashboard',
      sqlStatements: [createRecipesSQL, createIngredientsSQL, alterPlannedMealsSQL],
    };

  } catch (error: any) {
    console.error('Migration error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function checkMigrationStatus() {
  try {
    // Check if recipes table exists
    const { error: recipesError } = await supabase
      .from('recipes')
      .select('id')
      .limit(1);

    // Check if recipe_ingredients table exists
    const { error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select('id')
      .limit(1);

    // Check if planned_meals has new columns
    const { error: plannedMealsError } = await supabase
      .from('planned_meals')
      .select('recipe_id, food_entry_id')
      .limit(1);

    const recipesExists = !recipesError;
    const ingredientsExists = !ingredientsError;
    const columnsExist = !plannedMealsError;

    return {
      recipesExists,
      ingredientsExists,
      columnsExist,
      migrationComplete: recipesExists && ingredientsExists && columnsExist,
    };
  } catch (error: any) {
    return {
      recipesExists: false,
      ingredientsExists: false,
      columnsExist: false,
      migrationComplete: false,
      error: error.message,
    };
  }
}

/**
 * Check if database migration is needed
 */
import { supabase } from '../src/lib/supabase';

async function checkMigration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Checking Database Migration Status');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Check if recipes table exists
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id')
      .limit(1);

    const recipesExists = !recipesError;
    console.log(`${recipesExists ? '✅' : '❌'} recipes table: ${recipesExists ? 'EXISTS' : 'NOT FOUND'}`);

    // Check if recipe_ingredients table exists
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select('id')
      .limit(1);

    const ingredientsExists = !ingredientsError;
    console.log(`${ingredientsExists ? '✅' : '❌'} recipe_ingredients table: ${ingredientsExists ? 'EXISTS' : 'NOT FOUND'}`);

    // Check if planned_meals has new columns
    const { data: plannedMeals, error: plannedMealsError } = await supabase
      .from('planned_meals')
      .select('recipe_id, food_entry_id')
      .limit(1);

    const columnsExist = !plannedMealsError;
    console.log(`${columnsExist ? '✅' : '❌'} planned_meals new columns: ${columnsExist ? 'EXISTS' : 'NOT FOUND'}\n`);

    if (recipesExists && ingredientsExists && columnsExist) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  ✅ Migration Already Applied!');
      console.log('═══════════════════════════════════════════════════════════\n');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ⚠️  Migration Required');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Please run the migration SQL in Supabase Dashboard:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/sql/new');
    console.log('2. Copy the SQL from: database/migrations/20250102_add_recipes_and_ingredients.sql');
    console.log('3. Paste and click "Run"\n');

  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  }
}

checkMigration();

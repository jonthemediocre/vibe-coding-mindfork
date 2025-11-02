/**
 * Database Migration Runner - Direct SQL Execution
 *
 * This uses raw SQL execution via pg connection
 * Run with: bun run database/run-migration-direct.ts
 */

// @ts-ignore
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   Please run this from Supabase Dashboard SQL Editor instead.');
  console.error('');
  console.error('📝 Instructions:');
  console.error('   1. Go to your Supabase Dashboard → SQL Editor');
  console.error('   2. Copy the contents of database/migrations/20250102_add_recipes_and_ingredients.sql');
  console.error('   3. Paste into SQL Editor and click Run');
  console.error('');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Database Migration: Add Recipes & Ingredients');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Read the SQL file
  const migrationPath = join(__dirname, 'migrations', '20250102_add_recipes_and_ingredients.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  console.log('⚠️  Supabase API does not support direct SQL execution.');
  console.log('');
  console.log('📋 To run this migration, please use the Supabase Dashboard:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/_/sql');
  console.log('2. Click "New Query"');
  console.log('3. Copy and paste the SQL below:');
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(migrationSQL);
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('4. Click "Run" to execute the migration');
  console.log('');
  console.log('✅ After running, the following will be available:');
  console.log('   • recipes table');
  console.log('   • recipe_ingredients table');
  console.log('   • recipe_id and food_entry_id in planned_meals');
  console.log('   • Shopping list generation');
  console.log('   • Meal templates\n');

  // Try to verify if tables already exist
  console.log('🔍 Checking if migration has already been run...\n');

  const { error: recipesError } = await supabase
    .from('recipes')
    .select('id')
    .limit(1);

  if (!recipesError) {
    console.log('✅ Migration already completed! The recipes table exists.');
    console.log('');
    await verifyMigration();
  } else {
    console.log('⚠️  Migration not yet run. Please execute the SQL above in Supabase Dashboard.');
  }
}

async function verifyMigration() {
  const checks = [
    { table: 'recipes', name: 'Recipes table' },
    { table: 'recipe_ingredients', name: 'Recipe ingredients table' },
  ];

  for (const check of checks) {
    const { error } = await supabase
      .from(check.table)
      .select('id')
      .limit(1);

    if (!error) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name} - Not found`);
    }
  }

  // Check new columns in planned_meals
  const { error: columnsError } = await supabase
    .from('planned_meals')
    .select('recipe_id, food_entry_id')
    .limit(1);

  if (!columnsError) {
    console.log('✅ New columns in planned_meals (recipe_id, food_entry_id)');
  } else {
    console.log('❌ New columns in planned_meals - Not added yet');
  }

  console.log('');
  console.log('🎉 Migration verification complete!\n');
}

runMigration().catch(err => {
  console.error('💥 Error:', err);
  process.exit(1);
});

/**
 * Database Migration Runner
 *
 * Run migrations using: bun run database/migrate.ts
 */

// @ts-ignore - Import works at runtime
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('🚀 Starting database migration...\n');

  // Read migration file
  const migrationPath = join(__dirname, 'migrations', '20250102_add_recipes_and_ingredients.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  // Split into individual statements (Supabase doesn't support multi-statement execution)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    .filter(s => !s.match(/^COMMENT ON/)); // Skip comments for now

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60).replace(/\n/g, ' ');

    try {
      // Execute using the Supabase REST API
      const { data, error } = await supabase.rpc('exec_sql', {
        query: statement + ';'
      });

      if (error) {
        throw error;
      }

      console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
      successCount++;
    } catch (err: any) {
      console.error(`❌ [${i + 1}/${statements.length}] ${preview}...`);
      console.error(`   Error: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!\n');
    await verifyMigration();
  } else {
    console.log('\n⚠️  Some statements failed. The migration may need to be run via Supabase Dashboard.\n');
  }
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  // Check recipes table
  const { error: recipesError } = await supabase
    .from('recipes')
    .select('id')
    .limit(1);

  if (!recipesError) {
    console.log('✅ recipes table exists');
  } else {
    console.log(`❌ recipes table check failed: ${recipesError.message}`);
  }

  // Check recipe_ingredients table
  const { error: ingredientsError } = await supabase
    .from('recipe_ingredients')
    .select('id')
    .limit(1);

  if (!ingredientsError) {
    console.log('✅ recipe_ingredients table exists');
  } else {
    console.log(`❌ recipe_ingredients table check failed: ${ingredientsError.message}`);
  }

  // Check planned_meals columns
  const { error: plannedMealsError } = await supabase
    .from('planned_meals')
    .select('recipe_id, food_entry_id')
    .limit(1);

  if (!plannedMealsError) {
    console.log('✅ planned_meals columns added (recipe_id, food_entry_id)');
  } else {
    console.log(`❌ planned_meals columns check failed: ${plannedMealsError.message}`);
  }

  console.log('\n✨ Verification complete!\n');
}

// Run migration
runMigration().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});

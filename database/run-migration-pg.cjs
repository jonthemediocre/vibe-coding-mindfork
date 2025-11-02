/**
 * Run Database Migration with Direct PostgreSQL Connection
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// __dirname is available in CommonJS by default

// Database connection config
const connectionString = `postgresql://postgres:5x3FCVh1y39p8xxn@db.lxajnrofkgpwdpodjvkm.supabase.co:5432/postgres`;

async function runMigration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Database Migration: Add Recipes & Ingredients');
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read migration file
    // eslint-disable-next-line no-undef
    const migrationPath = path.join(__dirname, 'migrations', '20250102_add_recipes_and_ingredients.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration SQL...\n');

    // Execute the entire migration
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    // Verify migration
    console.log('🔍 Verifying migration...\n');

    // Check recipes table
    const recipesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'recipes'
      );
    `);
    console.log(`✅ recipes table: ${recipesCheck.rows[0].exists ? 'EXISTS' : 'NOT FOUND'}`);

    // Check recipe_ingredients table
    const ingredientsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'recipe_ingredients'
      );
    `);
    console.log(`✅ recipe_ingredients table: ${ingredientsCheck.rows[0].exists ? 'EXISTS' : 'NOT FOUND'}`);

    // Check new columns in planned_meals
    const columnsCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'planned_meals'
      AND column_name IN ('recipe_id', 'food_entry_id');
    `);
    console.log(`✅ planned_meals new columns: ${columnsCheck.rows.map(r => r.column_name).join(', ')}`);

    // Check RLS policies
    const policiesCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_policies
      WHERE tablename IN ('recipes', 'recipe_ingredients');
    `);
    console.log(`✅ RLS policies created: ${policiesCheck.rows[0].count} policies\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🎉 Migration Completed Successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('✨ Available features:');
    console.log('   • Recipe management');
    console.log('   • Shopping list generation');
    console.log('   • Meal templates');
    console.log('   • Community recipe sharing\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.\n');
  }
}

runMigration();

#!/usr/bin/env node

/**
 * Database migration runner using direct PostgreSQL connection
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Database Migration: Add Recipes & Ingredients');
  console.log('═══════════════════════════════════════════════════════════\n');

  const connectionString = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.lxajnrofkgpwdpodjvkm.supabase.co:5432/postgres`;

  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read migration file
    // eslint-disable-next-line no-undef
    const migrationPath = path.join(__dirname, 'database', 'migrations', '20250102_add_recipes_and_ingredients.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration SQL...\n');

    // Execute the entire migration
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    // Verify migration
    console.log('🔍 Verifying migration...\n');

    // Check recipes table
    try {
      await client.query('SELECT 1 FROM recipes LIMIT 1');
      console.log('✅ recipes table: EXISTS');
    } catch (e) {
      console.log('❌ recipes table: NOT FOUND');
    }

    // Check recipe_ingredients table
    try {
      await client.query('SELECT 1 FROM recipe_ingredients LIMIT 1');
      console.log('✅ recipe_ingredients table: EXISTS');
    } catch (e) {
      console.log('❌ recipe_ingredients table: NOT FOUND');
    }

    // Check planned_meals columns
    try {
      await client.query('SELECT recipe_id, food_entry_id FROM planned_meals LIMIT 1');
      console.log('✅ planned_meals new columns: EXISTS');
    } catch (e) {
      console.log('❌ planned_meals new columns: NOT FOUND');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  🎉 Migration Completed Successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

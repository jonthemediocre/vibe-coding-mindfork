#!/usr/bin/env node

/**
 * Simple migration runner using Supabase REST API
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Database Migration: Add Recipes & Ingredients');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Read migration SQL
    // eslint-disable-next-line no-undef
    const migrationPath = path.join(__dirname, 'database', 'migrations', '20250102_add_recipes_and_ingredients.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration via Supabase REST API...\n');

    // Use Supabase REST API to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    console.log('✅ Migration executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying migration...\n');

    const verifyQueries = [
      { name: 'recipes', query: 'SELECT 1 FROM recipes LIMIT 1' },
      { name: 'recipe_ingredients', query: 'SELECT 1 FROM recipe_ingredients LIMIT 1' },
      { name: 'planned_meals columns', query: 'SELECT recipe_id, food_entry_id FROM planned_meals LIMIT 1' }
    ];

    for (const { name, query } of verifyQueries) {
      const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({ query })
      });

      const exists = verifyResponse.ok;
      console.log(`${exists ? '✅' : '❌'} ${name}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  🎉 Migration Completed Successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nNote: Supabase may not have exec_sql RPC function.');
    console.error('Please run the SQL manually in Supabase Dashboard:\n');
    console.error('1. Go to: Supabase Dashboard > SQL Editor');
    console.error('2. Copy SQL from: database/migrations/20250102_add_recipes_and_ingredients.sql');
    console.error('3. Paste and click "Run"\n');
    process.exit(1);
  }
}

runMigration();

#!/usr/bin/env node

/**
 * Database migration runner using Supabase Management API
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Database Migration: Add Recipes & Ingredients');
  console.log('═══════════════════════════════════════════════════════════\n');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey || !dbPassword) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

  try {
    // Read migration file
    // eslint-disable-next-line no-undef
    const migrationPath = path.join(__dirname, 'database', 'migrations', '20250102_add_recipes_and_ingredients.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration via Supabase Management API...\n');

    // Try Supabase Management API
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        query: migrationSQL
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('✅ Migration executed successfully!\n');
    console.log('Result:', result);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  🎉 Migration Completed Successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n⚠️  This environment cannot connect to the database directly.');
    console.error('\nPlease run the migration manually:');
    console.error('\n1. Go to: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/sql/new');
    console.error('2. Copy the contents of: database/migrations/20250102_add_recipes_and_ingredients.sql');
    console.error('3. Paste into SQL Editor and click "Run"\n');
    process.exit(1);
  }
}

runMigration();

#!/usr/bin/env node

/**
 * Migration instructions - Direct database access not available from this environment
 */

const fs = require('fs');
const path = require('path');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  Database Migration Instructions');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('This environment does not have direct database access.');
console.log('Please follow these steps to run the migration:\n');

console.log('Step 1: Open Supabase SQL Editor');
console.log('   → https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/sql/new\n');

console.log('Step 2: Copy the migration SQL');
// eslint-disable-next-line no-undef
const migrationPath = path.join(__dirname, 'database', 'migrations', '20250102_add_recipes_and_ingredients.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('   File location: database/migrations/20250102_add_recipes_and_ingredients.sql');
console.log(`   SQL length: ${migrationSQL.length} characters\n`);

console.log('Step 3: Paste into SQL Editor and click "Run"\n');

console.log('What this migration does:');
console.log('   ✓ Creates recipes table');
console.log('   ✓ Creates recipe_ingredients table');
console.log('   ✓ Adds recipe_id and food_entry_id to planned_meals');
console.log('   ✓ Sets up RLS policies, indexes, and triggers');
console.log('   ✓ Fully backward compatible\n');

console.log('═══════════════════════════════════════════════════════════\n');

// Also output the SQL for easy copy-paste
console.log('SQL PREVIEW (first 500 chars):');
console.log('─────────────────────────────────────────────────────────');
console.log(migrationSQL.substring(0, 500) + '...\n');

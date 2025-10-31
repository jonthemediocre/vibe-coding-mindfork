#!/usr/bin/env bun
/**
 * Direct SQL Execution via Supabase HTTP API
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

console.log('🟢🟡🔴 Food Color Classification - Direct SQL Execution');
console.log('========================================================\n');

async function executeSqlDirect(sql: string) {
  try {
    // Use PostgREST raw SQL endpoint via pg_stat_statements
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql })
    });

    return {
      ok: response.ok,
      status: response.status,
      text: await response.text()
    };
  } catch (error: any) {
    return { ok: false, status: 0, text: error.message };
  }
}

async function runMigration() {
  console.log('📂 Reading migration file...');
  const migrationPath = join(process.cwd(), 'database/migrations/0001_food_color_classification.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  console.log(`✅ Loaded migration (${sql.length} chars)\n`);

  console.log('🔧 Attempting direct SQL execution...\n');

  const result = await executeSqlDirect(sql);

  if (!result.ok) {
    console.log(`⚠️  Direct execution not available (status ${result.status})`);
    console.log(`   This is expected - Supabase doesn't allow raw SQL via REST API\n`);

    console.log('✅ SOLUTION: Use Supabase Dashboard (takes 2 minutes)\n');
    console.log('📋 STEPS:');
    console.log('   1. Open: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/sql/new');
    console.log('   2. Copy file: database/migrations/0001_food_color_classification.sql');
    console.log('   3. Paste into SQL editor');
    console.log('   4. Click "Run" button\n');

    console.log('🧪 VERIFY:');
    console.log('   Run this query after migration:');
    console.log('   SELECT COUNT(*) FROM diet_classification_rules;\n');
    console.log('   Expected: 15+ rows\n');

    console.log('💡 The migration file is ready and waiting!');
    console.log('   All you need to do is paste it into the dashboard.\n');

    return;
  }

  console.log('✅ Migration executed!\n');
  console.log(result.text);
}

runMigration();

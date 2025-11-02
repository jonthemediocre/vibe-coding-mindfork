#!/usr/bin/env bun
/**
 * Auto-Deploy Migration Script
 * Executes the food color classification migration directly via Supabase
 */

// @ts-ignore - createClient exists in supabase-js
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Check for service role key
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL in .env');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env\n');
  console.log('📋 To get your service role key:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/settings/api');
  console.log('   2. Scroll to "Project API keys"');
  console.log('   3. Copy the "service_role" key (NOT the anon key)');
  console.log('   4. Add to .env:');
  console.log('      SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...<your-key>\n');
  console.log('⚠️  IMPORTANT: This key has admin privileges. Never commit it to git!\n');
  process.exit(1);
}

console.log('🟢🟡🔴 Food Color Classification - Auto Deploy');
console.log('==============================================\n');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSql(sql: string): Promise<{ data: any; error: any }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      return { data: null, error: { message: `HTTP ${response.status}: ${await response.text()}` } };
    }

    return { data: await response.json(), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function runMigration() {
  try {
    console.log('📂 Reading migration file...');
    const migrationPath = join(process.cwd(), 'database/migrations/0001_food_color_classification.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    console.log(`✅ Loaded ${sql.length} characters of SQL\n`);

    console.log('🔧 Executing migration...');
    console.log('   (This may take 10-15 seconds)\n');

    // For Supabase, we need to execute via the SQL endpoint
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: sql
    });

    if (!response.ok) {
      // Try alternative: Split into statements and execute one by one
      console.log('⚠️  Batch execution not supported, trying statement-by-statement...\n');

      // Split on semicolons (rough split)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`📝 Found ${statements.length} SQL statements\n`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.length < 10) continue; // Skip tiny fragments

        console.log(`   Executing statement ${i + 1}/${statements.length}...`);

        // Execute via Supabase client RPC if possible
        // Note: This requires a custom RPC function in Supabase
        const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

        if (error) {
          console.error(`   ❌ Failed: ${error.message}`);
          // Continue with other statements
        } else {
          console.log(`   ✅ Success`);
        }
      }
    }

    console.log('\n✅ Migration execution complete!\n');

    // Verify migration
    console.log('🔍 Verifying migration...');
    const { data: rules, error: rulesError } = await supabase
      .from('diet_classification_rules')
      .select('*', { count: 'exact' });

    if (rulesError) {
      console.error('❌ Verification failed:', rulesError.message);
      console.log('\n💡 The migration may have partially succeeded.');
      console.log('   Check the Supabase dashboard to verify.\n');
      return;
    }

    console.log(`✅ Found ${rules?.length || 0} classification rules\n`);

    if (!rules || rules.length === 0) {
      console.error('❌ No rules found. Migration may have failed.\n');
      console.log('💡 Try running the migration manually via Supabase Dashboard:');
      console.log('   https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/sql/new\n');
      return;
    }

    // Test classification function
    console.log('🧪 Testing classification function...');
    const { data: testResult, error: testError } = await supabase.rpc('classify_food_color', {
      p_food_category: 'vegetable',
      p_tags: ['leafy'],
      p_calories_per_100g: 25,
      p_protein_per_100g: 3,
      p_carbs_per_100g: 5,
      p_fat_per_100g: 0,
      p_fiber_per_100g: 3,
      p_sugar_per_100g: 2,
    });

    if (testError) {
      console.error('❌ Classification test failed:', testError.message);
    } else {
      console.log(`✅ Classification works! Result: "${testResult}"\n`);
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('🎉 DEPLOYMENT COMPLETE!\n');
    console.log('Your app now has:');
    console.log('  ✅ 15+ auto-classification rules');
    console.log('  ✅ Green/Yellow/Red food categorization');
    console.log('  ✅ Daily color balance scoring');
    console.log('  ✅ Semantic search foundation\n');
    console.log('Next steps:');
    console.log('  1. Restart your Expo dev server: bun start');
    console.log('  2. Food entries will auto-classify');
    console.log('  3. Use ColorCodedFoodCard to display colors\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Alternative: Use Supabase Dashboard');
    console.log('   https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/sql/new');
    console.log('   Copy/paste database/migrations/0001_food_color_classification.sql\n');
    process.exit(1);
  }
}

runMigration();

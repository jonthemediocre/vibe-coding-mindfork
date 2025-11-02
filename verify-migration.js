#!/usr/bin/env node
/**
 * Verify Migration Status
 * Checks if metabolic adaptation tables exist in Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 Checking metabolic adaptation migration status...\n');

  try {
    // Check metabolic_tracking
    const { error: e1, count: c1 } = await supabase
      .from('metabolic_tracking')
      .select('*', { count: 'exact', head: true });

    if (e1) {
      if (e1.code === 'PGRST116' || e1.message.includes('does not exist')) {
        console.log('❌ Migration NOT run - tables do not exist\n');
        console.log('📋 MANUAL MIGRATION REQUIRED:');
        console.log('1. Go to: https://lxajnrofkgpwdpodjvkm.supabase.co/project/lxajnrofkgpwdpodjvkm/sql');
        console.log('2. Open file: database/migrations/metabolic_adaptation_schema.sql');
        console.log('3. Copy all contents');
        console.log('4. Paste into SQL Editor');
        console.log('5. Click "Run" button\n');
        return;
      }
      throw e1;
    }

    console.log(`✅ metabolic_tracking exists (${c1 || 0} rows)`);

    // Check metabolic_adaptations
    const { error: e2, count: c2 } = await supabase
      .from('metabolic_adaptations')
      .select('*', { count: 'exact', head: true });

    if (e2) throw e2;

    console.log(`✅ metabolic_adaptations exists (${c2 || 0} rows)`);
    console.log('\n🎉 Migration already completed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();

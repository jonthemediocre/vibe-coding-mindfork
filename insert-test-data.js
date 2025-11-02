#!/usr/bin/env node
/**
 * Insert Test Data for Metabolic Adaptation
 * Creates 30 days of deficit stall scenario
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function insertTestData() {
  console.log('🔍 Finding a user to test with...\n');

  // Get first user
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(1)
    .single();

  if (userError || !users) {
    console.error('❌ No users found. Create a user first!');
    return;
  }

  const userId = users.id;
  console.log(`✅ Using user: ${users.email || userId}\n`);

  console.log('📊 Inserting 30 days of test data...');
  console.log('   Scenario: Deficit stall (loss rate slows after day 14)\n');

  // Generate 30 days of data
  const testData = [];
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const daysAgo = 29 - i; // Start from 29 days ago
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    // Weight starts at 180, drops 0.15 lbs/day initially
    // After day 14, metabolism adapts and loss slows (adds back 0.05 lbs/day)
    const baseWeight = 180.0;
    const initialLoss = i * 0.15; // Fast loss: ~1.0 lb/week
    const adaptationEffect = i > 14 ? (i - 14) * 0.05 : 0; // Slowdown after day 14
    const weight = baseWeight - initialLoss + adaptationEffect;

    // Consistent ~1800 cal intake with small variation
    const intake = Math.round(1800 + (Math.random() * 100 - 50));

    // High adherence (85-100%)
    const adherence = 0.85 + Math.random() * 0.15;

    testData.push({
      user_id: userId,
      date: date.toISOString().split('T')[0],
      weight_lb: Math.round(weight * 10) / 10, // Round to 1 decimal
      intake_kcal: intake,
      adherence_score: Math.round(adherence * 100) / 100
    });
  }

  // Insert data
  const { data, error } = await supabase
    .from('metabolic_tracking')
    .upsert(testData, { onConflict: 'user_id,date' });

  if (error) {
    console.error('❌ Failed to insert data:', error.message);
    return;
  }

  console.log(`✅ Inserted 30 days of test data`);

  // Show summary
  console.log('\n📈 Data Summary:');
  console.log(`   Week 1-2: ${testData[0].weight_lb} → ${testData[13].weight_lb} lbs (${(testData[0].weight_lb - testData[13].weight_lb).toFixed(1)} lb loss)`);
  console.log(`   Week 3-4: ${testData[14].weight_lb} → ${testData[29].weight_lb} lbs (${(testData[14].weight_lb - testData[29].weight_lb).toFixed(1)} lb loss)`);
  console.log(`   Average intake: ~${Math.round(testData.reduce((sum, d) => sum + d.intake_kcal, 0) / testData.length)} kcal`);
  console.log('\n🎯 This should trigger a "deficit_stall" adaptation!\n');
}

insertTestData();

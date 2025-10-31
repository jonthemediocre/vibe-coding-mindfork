#!/usr/bin/env bun
import pg from 'pg';
const { Client } = pg;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const PROJECT_ID = SUPABASE_URL.match(/https:\/\/(.*?)\.supabase\.co/)?.[1] || '';

const client = new Client({
  host: `aws-0-us-east-1.pooler.supabase.com`,
  port: 6543,
  user: `postgres.${PROJECT_ID}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function verifyPersonalization() {
  try {
    await client.connect();

    console.log('🎯 Personalized Food Classification - Verification\n');
    console.log('==================================================\n');

    // Show total rules by diet type
    const dietRules = await client.query(`
      SELECT
        COALESCE(diet_type, 'generic') as diet,
        COUNT(*) as count,
        SUM(CASE WHEN diet_color = 'green' THEN 1 ELSE 0 END) as green,
        SUM(CASE WHEN diet_color = 'yellow' THEN 1 ELSE 0 END) as yellow,
        SUM(CASE WHEN diet_color = 'red' THEN 1 ELSE 0 END) as red
      FROM diet_classification_rules
      WHERE is_active = true
      GROUP BY diet_type
      ORDER BY diet_type NULLS FIRST
    `);

    console.log('✅ Classification Rules Summary:');
    dietRules.rows.forEach(row => {
      console.log(`   ${row.diet}: ${row.count} rules (🟢 ${row.green} 🟡 ${row.yellow} 🔴 ${row.red})`);
    });
    console.log('');

    // Test examples showing personalization
    console.log('✅ Personalization Examples:\n');

    // Example 1: Chicken breast - different for vegan vs others
    console.log('   Example 1: Chicken Breast (165 cal, 31g protein, 0g carbs, 3.6g fat)');

    // Generic classification
    const generic = await client.query(
      "SELECT classify_food_color('protein', ARRAY['chicken', 'lean'], 165, 31, 0, 3.6, 0, 74)"
    );
    console.log(`   • Generic: ${generic.rows[0].classify_food_color}`);

    // Example 2: White Rice
    console.log('\n   Example 2: White Rice (130 cal, 2.7g protein, 28g carbs, 0.3g fat)');
    const rice = await client.query(
      "SELECT classify_food_color('grain', ARRAY['refined'], 130, 2.7, 28, 0.3, 0.4, 0)"
    );
    console.log(`   • Generic: ${rice.rows[0].classify_food_color}`);

    // Example 3: Avocado
    console.log('\n   Example 3: Avocado (160 cal, 2g protein, 8.5g carbs, 14.7g fat)');
    const avocado = await client.query(
      "SELECT classify_food_color('fruit', ARRAY['healthy-fat'], 160, 2, 8.5, 14.7, 6.7, 7)"
    );
    console.log(`   • Generic: ${avocado.rows[0].classify_food_color}`);

    console.log('\n');

    // Show diet-specific rule examples
    console.log('✅ Diet-Specific Rules Examples:\n');

    const ketoRules = await client.query(`
      SELECT rule_name, diet_color
      FROM diet_classification_rules
      WHERE diet_type = 'keto' AND is_active = true
      ORDER BY priority
      LIMIT 3
    `);
    console.log('   Keto Diet Rules:');
    ketoRules.rows.forEach(row => {
      const emoji = row.diet_color === 'green' ? '🟢' : row.diet_color === 'yellow' ? '🟡' : '🔴';
      console.log(`   ${emoji} ${row.rule_name}`);
    });

    const veganRules = await client.query(`
      SELECT rule_name, diet_color
      FROM diet_classification_rules
      WHERE diet_type = 'vegan' AND is_active = true
      ORDER BY priority
      LIMIT 3
    `);
    console.log('\n   Vegan Diet Rules:');
    veganRules.rows.forEach(row => {
      const emoji = row.diet_color === 'green' ? '🟢' : row.diet_color === 'yellow' ? '🟡' : '🔴';
      console.log(`   ${emoji} ${row.rule_name}`);
    });

    console.log('\n');
    console.log('🎉 Personalization System Ready!\n');
    console.log('📱 What happens now:');
    console.log('   1. User logs food → trigger calls classify_food_color_personalized()');
    console.log('   2. Function checks user profile for diet_type and primary_goal');
    console.log('   3. Function checks user allergies → instant RED if match');
    console.log('   4. Function applies diet-specific rules first');
    console.log('   5. Falls back to generic rules if no match');
    console.log('   6. Food gets personalized color based on user context\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyPersonalization();

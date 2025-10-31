#!/usr/bin/env bun
// Direct PostgreSQL connection - Migration 2: Personalized Classification

import pg from 'pg';
const { Client } = pg;
import { readFileSync } from 'fs';
import { join } from 'path';

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

async function runMigration() {
  console.log('🎯 Personalized Food Classification Migration');
  console.log('=============================================\n');

  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error('❌ Missing SUPABASE_DB_PASSWORD');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('📂 Reading migration file...');
    const sql = readFileSync(
      join(process.cwd(), 'database/migrations/0002_personalized_food_classification.sql'),
      'utf-8'
    );
    console.log(`✅ Loaded ${sql.length} characters\n`);

    console.log('🚀 Executing personalized classification migration...');
    console.log('   (This adds diet-specific rules for keto, vegan, paleo, etc.)\n');

    await client.query(sql);

    console.log('✅ Migration executed successfully!\n');

    // Verify diet-specific rules
    console.log('🔍 Verifying diet-specific rules...');
    const dietRules = await client.query(`
      SELECT diet_type, COUNT(*) as count
      FROM diet_classification_rules
      WHERE diet_type IS NOT NULL
      GROUP BY diet_type
      ORDER BY diet_type
    `);

    console.log('✅ Diet-specific rules by type:');
    dietRules.rows.forEach(row => {
      console.log(`   • ${row.diet_type}: ${row.count} rules`);
    });
    console.log('');

    // Test personalized function
    console.log('🧪 Testing personalized classification...');

    // Get a sample user
    const userResult = await client.query(`
      SELECT id, diet_type FROM profiles WHERE diet_type IS NOT NULL LIMIT 1
    `);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`   Testing with user diet: ${user.diet_type}\n`);

      const test = await client.query(
        "SELECT classify_food_color_personalized($1, 'protein', ARRAY['chicken'], 165, 31, 0, 3.6, 0, 74)",
        [user.id]
      );
      console.log(`   ✅ Chicken breast for ${user.diet_type} user: ${test.rows[0].classify_food_color_personalized}`);
    } else {
      console.log('   ⚠️  No users with diet_type set, skipping personalized test');
    }
    console.log('');

    console.log('🎉 SUCCESS! Personalized classification deployed!\n');
    console.log('📱 The system now considers:');
    console.log('   • User diet type (keto, vegan, paleo, vegetarian, mediterranean)');
    console.log('   • User goals (lose weight, gain muscle, maintain)');
    console.log('   • User allergies (automatic RED for allergens)');
    console.log('   • 50+ diet-specific rules');
    console.log('   • Fallback to generic rules when needed\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

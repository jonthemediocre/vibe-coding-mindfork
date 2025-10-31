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

async function checkDietTables() {
  try {
    await client.connect();

    console.log('🔍 Checking diet-related tables:\n');

    // Check user_diet_preferences
    const prefsCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_diet_preferences' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    if (prefsCols.rows.length > 0) {
      console.log('✅ user_diet_preferences columns:');
      prefsCols.rows.forEach(row => {
        console.log(`   • ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('❌ user_diet_preferences table does not exist');
    }
    console.log('');

    // Check profiles for goal/diet info
    const profileCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'profiles' AND table_schema = 'public'
        AND (column_name ILIKE '%diet%' OR column_name ILIKE '%goal%')
      ORDER BY ordinal_position
    `);

    if (profileCols.rows.length > 0) {
      console.log('✅ profiles diet/goal columns:');
      profileCols.rows.forEach(row => {
        console.log(`   • ${row.column_name}: ${row.data_type}`);
      });
    }
    console.log('');

    // Sample user_diet_preferences data
    const samplePrefs = await client.query(`
      SELECT * FROM user_diet_preferences LIMIT 3
    `);

    if (samplePrefs.rows.length > 0) {
      console.log('📊 Sample user_diet_preferences data:');
      console.log(JSON.stringify(samplePrefs.rows, null, 2));
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDietTables();

#!/usr/bin/env bun
// Quick schema check to see what tables exist

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

async function checkSchema() {
  try {
    await client.connect();
    console.log('✅ Connected!\n');

    // Check existing tables
    const tables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('📊 Existing tables:');
    tables.rows.forEach(row => {
      console.log(`   • ${row.tablename}`);
    });
    console.log('');

    // Check food_entries structure if it exists
    if (tables.rows.some(r => r.tablename === 'food_entries')) {
      console.log('🔍 food_entries columns:');
      const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'food_entries' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      columns.rows.forEach(row => {
        console.log(`   • ${row.column_name}: ${row.data_type}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();

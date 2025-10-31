// Direct PostgreSQL connection using node-postgres
// This bypasses Supabase API and connects directly to the database

import pg from 'pg';
const { Client } = pg;
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const PROJECT_ID = SUPABASE_URL.match(/https:\/\/(.*?)\.supabase\.co/)?.[1] || '';

// Supabase PostgreSQL connection details (using connection pooler for session mode)
const client = new Client({
  host: `aws-0-us-east-1.pooler.supabase.com`,
  port: 6543,
  user: `postgres.${PROJECT_ID}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🟢🟡🔴 Direct PostgreSQL Migration');
  console.log('===================================\n');

  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error('❌ Missing SUPABASE_DB_PASSWORD');
    console.log('\n📋 To get your database password:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/' + PROJECT_ID + '/settings/database');
    console.log('   2. Find "Database password" (under Connection string)');
    console.log('   3. Add to .env: SUPABASE_DB_PASSWORD=your-password\n');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('📂 Reading migration file...');
    const sql = readFileSync(
      join(process.cwd(), 'database/migrations/0001_food_color_classification_FIXED.sql'),
      'utf-8'
    );
    console.log(`✅ Loaded ${sql.length} characters\n`);

    console.log('🚀 Executing migration...');
    console.log('   (This will take 10-15 seconds)\n');

    await client.query(sql);

    console.log('✅ Migration executed successfully!\n');

    // Verify
    console.log('🔍 Verifying...');
    const result = await client.query('SELECT COUNT(*) FROM diet_classification_rules');
    console.log(`✅ Found ${result.rows[0].count} classification rules\n`);

    // Test function
    console.log('🧪 Testing classification function...');
    const test = await client.query(
      "SELECT classify_food_color('vegetable', ARRAY['leafy'], 25, 3, 5, 0, 3, 2)"
    );
    console.log(`✅ Classification test: ${test.rows[0].classify_food_color}\n`);

    console.log('🎉 SUCCESS! Migration complete!\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

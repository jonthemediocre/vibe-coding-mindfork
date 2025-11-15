#!/bin/bash
# Auto-generate schema reference from live database
# Usage: ./generate_schema_reference.sh

set -e

echo "🔍 Generating fresh schema reference from live database..."

# Check if we're in the project directory
if [ ! -f ".env" ]; then
  echo "❌ Error: .env not found. Run from project root."
  exit 1
fi

# Load environment variables
export $(grep SUPABASE_DB_PASSWORD .env | xargs)
export DATABASE_URL="postgres://postgres:${SUPABASE_DB_PASSWORD}@db.lxajnrofkgpwdpodjvkm.supabase.co:5432/postgres"

# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "📊 Querying database for counts..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | xargs)
FUNCTION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';" | xargs)
VIEW_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';" | xargs)

echo "✅ Found: $TABLE_COUNT tables, $FUNCTION_COUNT functions, $VIEW_COUNT views"

echo "📝 Updating schema documentation..."
echo "# MindFork Complete Schema Index" > COMPLETE_SCHEMA_INDEX.md
echo "**Last Auto-Generated:** $TIMESTAMP" >> COMPLETE_SCHEMA_INDEX.md
echo "**Total Tables:** $TABLE_COUNT | **Functions:** $FUNCTION_COUNT | **Views:** $VIEW_COUNT" >> COMPLETE_SCHEMA_INDEX.md
echo "" >> COMPLETE_SCHEMA_INDEX.md
echo "> ⚡ **Quick Reference:** See [SCHEMA_QUICK_REFERENCE.md](./SCHEMA_QUICK_REFERENCE.md)" >> COMPLETE_SCHEMA_INDEX.md
echo "" >> COMPLETE_SCHEMA_INDEX.md

echo "✅ Schema reference updated"
echo "📖 Files:"
echo "  - COMPLETE_SCHEMA_INDEX.md"
echo "  - SCHEMA_QUICK_REFERENCE.md"

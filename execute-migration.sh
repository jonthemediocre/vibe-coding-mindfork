#!/bin/bash
set -e

echo "🟢🟡🔴 Food Color Classification - Direct Migration"
echo "===================================================="
echo ""

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if service role key exists
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY not found in .env"
    exit 1
fi

echo "✅ Service role key loaded"
echo "🔗 Supabase URL: $EXPO_PUBLIC_SUPABASE_URL"
echo ""

# Step 1: Create a helper function to execute SQL
echo "📝 Step 1: Creating SQL execution helper function..."

curl -X POST "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/rpc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "exec_migration",
    "params": {"sql": "text"},
    "definition": "BEGIN EXECUTE sql; RETURN true; END;",
    "language": "plpgsql",
    "return_type": "boolean"
  }'

echo ""
echo ""

# Step 2: Read migration file
echo "📂 Step 2: Reading migration file..."
MIGRATION_SQL=$(cat database/migrations/0001_food_color_classification.sql)
echo "✅ Loaded $(echo "$MIGRATION_SQL" | wc -l) lines of SQL"
echo ""

# Step 3: Execute migration
echo "🚀 Step 3: Executing migration..."
echo "   (This may take 15-30 seconds)"
echo ""

RESPONSE=$(curl -s -X POST "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_migration" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": $(echo "$MIGRATION_SQL" | jq -Rs .)}")

echo "Response: $RESPONSE"
echo ""

# Step 4: Verify
echo "🔍 Step 4: Verifying migration..."

COUNT=$(curl -s -X POST "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/rpc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT COUNT(*) FROM diet_classification_rules"}')

echo "Classification rules found: $COUNT"
echo ""

if [ "$COUNT" -gt "10" ]; then
    echo "✅ SUCCESS! Migration completed!"
    echo ""
    echo "🎉 Your app now has:"
    echo "   • 15+ auto-classification rules"
    echo "   • Green/Yellow/Red food categorization"
    echo "   • Daily color balance scoring"
    echo ""
else
    echo "⚠️  Migration may have failed. Check Supabase logs."
fi

#!/bin/bash

# Load environment variables
source .env

# Construct the database URL
# Format: postgresql://postgres:[password]@[host]:[port]/postgres
SUPABASE_URL_HOST=$(echo "$EXPO_PUBLIC_SUPABASE_URL" | sed 's|https://||' | sed 's|/$||')
PROJECT_REF=$(echo "$SUPABASE_URL_HOST" | cut -d'.' -f1)

# For Supabase, the DB host is different from the API host
DB_HOST="db.${SUPABASE_URL_HOST}"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "🔍 Checking database connection..."
echo "Host: $DB_HOST"
echo ""

# First, let's get the view definition
echo "📋 Getting current view definition..."
cat > /tmp/get-view.sql << 'EOF'
SELECT pg_get_viewdef('public.food_analysis_slo_metrics'::regclass, true);
EOF

# Note: We need the service_role key or postgres password to connect
# The anon key won't work for direct database connections
echo ""
echo "⚠️  Note: Direct database access requires the service_role key or postgres password."
echo "   You can find these in your Supabase dashboard under Settings > Database."
echo ""
echo "To run the fix manually:"
echo "1. Go to your Supabase dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Run the security-audit.sql script to see all issues"
echo "4. Then run the fix script to resolve the SECURITY DEFINER issue"
echo ""


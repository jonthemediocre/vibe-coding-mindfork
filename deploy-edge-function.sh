#!/bin/bash
# Deploy Edge Function to Supabase

set -e

echo "🚀 Deploying generate-coach-video edge function..."
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Install with: brew install supabase/tap/supabase"
    exit 1
fi

# Set environment variables if not already set
export SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-lxajnrofkgpwdpodjvkm}"
export SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-sbp_8e8ae981cd381dcbbe83e076c57aa3f36bef61b2}"

echo "📦 Project: $SUPABASE_PROJECT_REF"
echo ""

# Deploy the function
echo "Deploying function..."
supabase functions deploy generate-coach-video \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --legacy-bundle

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Function URL: https://lxajnrofkgpwdpodjvkm.supabase.co/functions/v1/generate-coach-video"
echo ""
echo "Next steps:"
echo "1. Test the function from your app"
echo "2. Videos should now use the correct avatar URLs"

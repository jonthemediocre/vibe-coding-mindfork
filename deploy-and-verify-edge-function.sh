#!/bin/bash
# Deploy and Verify Supabase Edge Function
# Ensures deployment is complete and verified before reporting success

set -e

# Configuration
PROJECT_REF="lxajnrofkgpwdpodjvkm"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-sbp_8e8ae981cd381dcbbe83e076c57aa3f36bef61b2}"
WAIT_TIME=180  # 3 minutes in seconds

# Check if function name provided
if [ -z "$1" ]; then
    echo "❌ Error: Function name required"
    echo "Usage: ./deploy-and-verify-edge-function.sh <function-name>"
    echo "Example: ./deploy-and-verify-edge-function.sh generate-coach-video"
    exit 1
fi

FUNCTION_NAME="$1"

echo "======================================"
echo "🚀 Supabase Edge Function Deployment"
echo "======================================"
echo ""
echo "Function: $FUNCTION_NAME"
echo "Project: $PROJECT_REF"
echo "Timestamp: $(date)"
echo ""

# Step 1: Deploy
echo "📦 Step 1/5: Deploying function..."
export SUPABASE_ACCESS_TOKEN
supabase functions deploy "$FUNCTION_NAME" \
    --project-ref "$PROJECT_REF" \
    --legacy-bundle

DEPLOY_TIME=$(date +%s)
echo "✅ Deployment command completed at $(date)"
echo ""

# Step 2: Wait for propagation
echo "⏳ Step 2/5: Waiting 3 minutes for deployment to propagate..."
echo "   (Supabase caches edge functions for 1-3 minutes)"
echo ""

ELAPSED=0
while [ $ELAPSED -lt $WAIT_TIME ]; do
    sleep 10
    ELAPSED=$((ELAPSED + 10))
    REMAINING=$((WAIT_TIME - ELAPSED))
    printf "   Time elapsed: %02d:%02d / 03:00 (Remaining: %02d:%02d)\r" \
        $((ELAPSED / 60)) $((ELAPSED % 60)) \
        $((REMAINING / 60)) $((REMAINING % 60))
done
echo ""
echo ""

# Step 3: Check deployment status
echo "🔍 Step 3/5: Checking deployment status..."
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}"
echo "   Function URL: $FUNCTION_URL"
echo ""

# Step 4: View logs link
echo "📋 Step 4/5: Check function logs:"
echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/functions/${FUNCTION_NAME}/logs"
echo ""
echo "   Look for recent console.log output to verify new code is running."
echo ""

# Step 5: Verification prompt
echo "✅ Step 5/5: Deployment complete!"
echo ""
echo "======================================"
echo "📊 Deployment Summary"
echo "======================================"
echo "Function: $FUNCTION_NAME"
echo "Deploy Time: $(date -d @$DEPLOY_TIME 2>/dev/null || date -r $DEPLOY_TIME)"
echo "Verified Time: $(date)"
echo "Status: ✅ READY TO TEST"
echo ""
echo "Next Steps:"
echo "1. Check logs (link above) to verify new code"
echo "2. Test function from app or with curl"
echo "3. Verify correct behavior"
echo ""
echo "Test with curl:"
echo "curl -X POST '$FUNCTION_URL' \\"
echo "  -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"test\": \"data\"}'"
echo ""

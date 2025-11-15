#!/bin/bash
# Upload missing coach images to Supabase Storage via API

set -e

echo "📤 Uploading missing coach images to Supabase Storage via API..."
echo ""

PROJECT_URL="https://lxajnrofkgpwdpodjvkm.supabase.co"
# You'll need to set this environment variable with your service role key
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set"
    echo "Set it with: export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
    exit 1
fi

BUCKET="coach-avatars"

# Images to upload
declare -A IMAGES=(
    ["coach-images-for-heygen/nora.png"]="coach_nora.png"
    ["coach-images-for-heygen/blaze.png"]="coach_blaze.png"
    ["coach-images-for-heygen/kai.png"]="coach_kai.png"
    ["coach-images-for-heygen/maya.png"]="coach_maya.png"
    ["coach-images-for-heygen/sato.png"]="coach_sato.png"
)

# Upload each image
for LOCAL_PATH in "${!IMAGES[@]}"; do
    STORAGE_NAME="${IMAGES[$LOCAL_PATH]}"

    if [ ! -f "$LOCAL_PATH" ]; then
        echo "❌ File not found: $LOCAL_PATH"
        continue
    fi

    echo "📤 Uploading $LOCAL_PATH as $STORAGE_NAME..."

    curl -X POST \
        "$PROJECT_URL/storage/v1/object/$BUCKET/$STORAGE_NAME" \
        -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
        -H "Content-Type: image/png" \
        --data-binary "@$LOCAL_PATH"

    echo ""
    echo "✅ Uploaded $STORAGE_NAME"
    echo ""
done

echo "✅ All missing coach images uploaded!"
echo ""
echo "Verify at: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/storage/buckets/$BUCKET"
echo ""
echo "Now redeploy the edge function with: ./deploy-edge-function.sh"

#!/bin/bash
# Upload missing coach images to Supabase Storage

set -e

echo "📤 Uploading missing coach images to Supabase Storage..."
echo ""

PROJECT_REF="lxajnrofkgpwdpodjvkm"
BUCKET="coach-avatars"

# Images in coach-images-for-heygen/ need to be renamed and uploaded
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

    supabase storage upload \
        --project-ref "$PROJECT_REF" \
        --bucket "$BUCKET" \
        --path "$STORAGE_NAME" \
        --file "$LOCAL_PATH"

    echo "✅ Uploaded $STORAGE_NAME"
done

echo ""
echo "✅ All missing coach images uploaded!"
echo ""
echo "Verify at: https://supabase.com/dashboard/project/$PROJECT_REF/storage/buckets/$BUCKET"

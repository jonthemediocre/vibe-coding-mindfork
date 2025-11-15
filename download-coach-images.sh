#!/bin/bash

# Download all coach images for HeyGen upload
# Run this script, then upload the downloaded images to HeyGen dashboard

echo "Downloading coach images..."

# Create directory for downloads
mkdir -p coach-images-for-heygen

# Download each coach image
curl -o coach-images-for-heygen/blaze.png "https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/coach_decibel.png"
echo "✓ Downloaded Blaze"

curl -o coach-images-for-heygen/kai.png "https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/coach_synapse.png"
echo "✓ Downloaded Kai"

curl -o coach-images-for-heygen/maya.png "https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/coach_veloura.png"
echo "✓ Downloaded Maya"

curl -o coach-images-for-heygen/nora.png "https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/coach_vetra.png"
echo "✓ Downloaded Nora"

curl -o coach-images-for-heygen/sato.png "https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/coach_verdant.png"
echo "✓ Downloaded Sato"

echo ""
echo "✅ All images downloaded to: coach-images-for-heygen/"
echo ""
echo "Files ready for HeyGen upload:"
ls -lh coach-images-for-heygen/
echo ""
echo "Next steps:"
echo "1. Go to https://app.heygen.com/avatars"
echo "2. Upload each image from the coach-images-for-heygen/ folder"
echo "3. Copy the avatar IDs HeyGen provides"

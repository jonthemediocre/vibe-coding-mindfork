# Upload Missing Coach Images to Supabase Storage

## The Problem
The Nora coach image exists locally at `coach-images-for-heygen/nora.png` but was never uploaded to Supabase Storage. This is why you get "face not detected" errors.

## Missing Images (All Available Locally)
- ✅ `coach-images-for-heygen/nora.png` → Upload as `coach_nora.png`
- ✅ `coach-images-for-heygen/blaze.png` → Upload as `coach_blaze.png`
- ✅ `coach-images-for-heygen/kai.png` → Upload as `coach_kai.png`
- ✅ `coach-images-for-heygen/maya.png` → Upload as `coach_maya.png`
- ✅ `coach-images-for-heygen/sato.png` → Upload as `coach_sato.png`

## Option 1: Upload via Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/storage/buckets/coach-avatars

2. Click "Upload file"

3. Upload these files with the new names:
   - `nora.png` → rename to `coach_nora.png`
   - `blaze.png` → rename to `coach_blaze.png`
   - `kai.png` → rename to `coach_kai.png`
   - `maya.png` → rename to `coach_maya.png`
   - `sato.png` → rename to `coach_sato.png`

4. All files are in: `/home/jonbrookings/vibe_coding_projects/vibe-coding-mindfork/coach-images-for-heygen/`

## Option 2: Upload via API (Automated)

If you have your service role key, run:

```bash
# Set your service role key
export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key-here'

# Run the upload script
./upload-missing-coaches-api.sh
```

## Option 3: Quick Fix - Rename Locally First

```bash
cd coach-images-for-heygen/

# Copy files with correct naming
cp nora.png coach_nora.png
cp blaze.png coach_blaze.png
cp kai.png coach_kai.png
cp maya.png coach_maya.png
cp sato.png coach_sato.png

# Then upload the coach_*.png files via Supabase Dashboard
```

## After Upload

Once the images are uploaded, your videos will work immediately! The edge function is already deployed with the correct URLs, it just needs the images to exist.

## Verify Upload

Check that all 10 images exist:
https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/storage/buckets/coach-avatars

You should see:
- coach_aetheris.png ✅
- coach_decibel.png ✅
- coach_synapse.png ✅
- coach_veloura.png ✅
- coach_vetra.png ✅
- coach_nora.png (needs upload)
- coach_blaze.png (needs upload)
- coach_kai.png (needs upload)
- coach_maya.png (needs upload)
- coach_sato.png (needs upload)

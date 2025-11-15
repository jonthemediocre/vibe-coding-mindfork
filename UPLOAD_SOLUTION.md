# Solution: Upload Missing Coach Images

## The Problem
I tried to upload the images programmatically but hit RLS (Row Level Security) policies. The anon key doesn't have upload permissions.

## Solution 1: Manual Upload via Dashboard (EASIEST - 2 minutes)

1. **Open Supabase Storage**: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/storage/buckets/coach-avatars

2. **Click "Upload file" button**

3. **Upload these 5 files** from your local machine:
   - Location: `/home/jonbrookings/vibe_coding_projects/vibe-coding-mindfork/coach-images-for-heygen/`
   - Files:
     - `coach_nora.png`
     - `coach_blaze.png`
     - `coach_kai.png`
     - `coach_maya.png`
     - `coach_sato.png`

**That's it!** Once uploaded, your videos will work immediately.

---

## Solution 2: Temporarily Allow Public Uploads (If you prefer automation)

### Step 1: Make bucket publicly writable (via Supabase SQL Editor)

Go to: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/sql/new

Run this SQL:

```sql
-- Temporarily allow public uploads to coach-avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-avatars', 'coach-avatars', true)
ON CONFLICT (id)
DO UPDATE SET public = true;

-- Add RLS policy to allow public uploads
CREATE POLICY "Allow public uploads to coach-avatars"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'coach-avatars');
```

### Step 2: Run upload script

```bash
cd /home/jonbrookings/vibe_coding_projects/vibe-coding-mindfork
node upload-coaches.js
```

### Step 3: Remove public upload permission (IMPORTANT - run after upload)

```sql
-- Remove public upload policy
DROP POLICY IF EXISTS "Allow public uploads to coach-avatars" ON storage.objects;
```

---

## Solution 3: Use Service Role Key (Most Secure)

If you have your service role key:

1. Get it from: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/settings/api
   - Look for "service_role" key (keep this secret!)

2. Export it:
```bash
export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key-here'
```

3. Run:
```bash
./upload-missing-coaches-api.sh
```

---

## Verify Upload

After uploading, verify all images exist:
https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/storage/buckets/coach-avatars

You should see all 10 coach images:
- ✅ coach_aetheris.png
- ✅ coach_decibel.png
- ✅ coach_synapse.png
- ✅ coach_veloura.png
- ✅ coach_vetra.png
- ✅ coach_nora.png (new)
- ✅ coach_blaze.png (new)
- ✅ coach_kai.png (new)
- ✅ coach_maya.png (new)
- ✅ coach_sato.png (new)

## Test

Once uploaded, test Nora's video generation from your app - it should work immediately! 🎉

# 🎬 Coach Video Avatar Setup Guide

**Status:** Database schema ready ✅
**Next Step:** Upload coach images to HeyGen

---

## 📊 Your Coaches

You have **5 coaches** with existing avatars and voices:

| Coach ID | Name | ElevenLabs Voice | Current Avatar |
|----------|------|------------------|----------------|
| `blaze_hype` | Blaze | `ELEVENLABS_VOICE_BLAZE` | coach_decibel.png |
| `kai_planner` | Kai | `ELEVENLABS_VOICE_KAI` | coach_synapse.png |
| `maya_rival` | Maya | `ELEVENLABS_VOICE_MAYA` | coach_veloura.png |
| `nora_gentle` | Nora | `ELEVENLABS_VOICE_NORA` | coach_vetra.png |
| `sato_discipline` | Sato | `ELEVENLABS_VOICE_SATO` | coach_verdant.png |

---

## ✅ Step 1: Database Schema (DONE!)

The database now has these columns:
- `heygen_avatar_id` - Stores HeyGen custom avatar ID
- `elevenlabs_voice_id` - Stores ElevenLabs voice ID

---

## 🎨 Step 2: Upload Images to HeyGen

### Option A: Manual Upload (Recommended for Initial Setup)

1. **Download your coach images:**
   - Blaze: `https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/coach_decibel.png`
   - Kai: `https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/coach_synapse.png`
   - Maya: `https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/coach_veloura.png`
   - Nora: `https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/coach_vetra.png`
   - Sato: `https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/coach_verdant.png`

2. **Go to HeyGen Dashboard:**
   - https://app.heygen.com/avatars

3. **Upload each coach image:**
   - Click "Create Avatar"
   - Upload the image
   - Name it clearly (e.g., "Coach Blaze", "Coach Kai")
   - Wait for processing (~5-10 minutes per avatar)

4. **Copy the avatar IDs:**
   - Each avatar will get an ID like `blaze_custom_20251112`
   - Save these IDs!

### Option B: API Upload (For Automation)

```bash
# Upload Blaze avatar
curl -X POST "https://api.heygen.com/v1/avatar.upload" \
  -H "x-api-key: sk_V2_hgu_kPxtAXG9xjJ_yIDMXE6DQzLypC18kleEZgjix7i7WmOY" \
  -F "image=@/path/to/coach_decibel.png" \
  -F "name=Coach Blaze"

# Repeat for each coach...
```

---

## 📝 Step 3: Update Database with Avatar IDs

Once you have the HeyGen avatar IDs, update the database:

```sql
-- Update each coach with their HeyGen avatar ID
UPDATE coaches SET
  heygen_avatar_id = 'blaze_custom_20251112',  -- Replace with actual ID from HeyGen
  elevenlabs_voice_id = 'ELEVENLABS_VOICE_BLAZE'
WHERE id = 'blaze_hype';

UPDATE coaches SET
  heygen_avatar_id = 'kai_custom_20251112',  -- Replace with actual ID from HeyGen
  elevenlabs_voice_id = 'ELEVENLABS_VOICE_KAI'
WHERE id = 'kai_planner';

UPDATE coaches SET
  heygen_avatar_id = 'maya_custom_20251112',  -- Replace with actual ID from HeyGen
  elevenlabs_voice_id = 'ELEVENLABS_VOICE_MAYA'
WHERE id = 'maya_rival';

UPDATE coaches SET
  heygen_avatar_id = 'nora_custom_20251112',  -- Replace with actual ID from HeyGen
  elevenlabs_voice_id = 'ELEVENLABS_VOICE_NORA'
WHERE id = 'nora_gentle';

UPDATE coaches SET
  heygen_avatar_id = 'sato_custom_20251112',  -- Replace with actual ID from HeyGen
  elevenlabs_voice_id = 'ELEVENLABS_VOICE_SATO'
WHERE id = 'sato_discipline';
```

**Or via command line:**

```bash
# Example for Blaze
PGPASSWORD="TUi5fmUFZhlEt1Os" psql "postgresql://postgres:TUi5fmUFZhlEt1Os@db.lxajnrofkgpwdpodjvkm.supabase.co:5432/postgres" -c "
UPDATE coaches SET
  heygen_avatar_id = 'YOUR_HEYGEN_AVATAR_ID_HERE',
  elevenlabs_voice_id = 'ELEVENLABS_VOICE_BLAZE'
WHERE id = 'blaze_hype';
"
```

---

## 🎯 Step 4: Use in Your App

### Get Coach Data
```typescript
const { data: coach } = await supabase
  .from('coaches')
  .select('id, name, heygen_avatar_id, elevenlabs_voice_id, avatar_url')
  .eq('id', 'nora_gentle')
  .single()

console.log(coach)
// {
//   id: 'nora_gentle',
//   name: 'Nora',
//   heygen_avatar_id: 'nora_custom_20251112',
//   elevenlabs_voice_id: 'ELEVENLABS_VOICE_NORA',
//   avatar_url: 'https://...'
// }
```

### Generate Video with Coach's Avatar & Voice
```typescript
// Create job first
const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

await supabase
  .from('coach_video_jobs')
  .insert({
    id: jobId,
    user_id: userId,
    coach_name: coach.name,
    message_text: message,
    status: 'pending'
  })

// Call Edge Function with coach's custom avatar & voice
const { data, error } = await supabase.functions.invoke('generate-coach-video', {
  body: {
    userId: userId,
    coachName: coach.name,
    message: "Great work on your nutrition today!",
    jobId: jobId,
    avatarId: coach.heygen_avatar_id,      // ✨ Coach's custom avatar
    voiceId: coach.elevenlabs_voice_id     // ✨ Coach's custom voice
  }
})

// Poll for completion
const interval = setInterval(async () => {
  const { data: job } = await supabase
    .from('coach_video_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (job.status === 'completed') {
    clearInterval(interval)
    // Play video: job.video_url
    console.log('Video ready!', job.video_url)
  } else if (job.status === 'error') {
    clearInterval(interval)
    console.error('Error:', job.error_message)
  }
}, 3000)
```

---

## 🔧 Helper Function for Your App

Create a reusable function:

```typescript
// src/api/coach-video.ts
export async function generateCoachVideo(
  coachId: string,
  message: string,
  userId: string
) {
  // 1. Get coach data
  const { data: coach, error: coachError } = await supabase
    .from('coaches')
    .select('name, heygen_avatar_id, elevenlabs_voice_id')
    .eq('id', coachId)
    .single()

  if (coachError || !coach) {
    throw new Error('Coach not found')
  }

  // 2. Create job
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const { error: jobError } = await supabase
    .from('coach_video_jobs')
    .insert({
      id: jobId,
      user_id: userId,
      coach_name: coach.name,
      message_text: message,
      status: 'pending'
    })

  if (jobError) throw jobError

  // 3. Generate video
  const { data, error } = await supabase.functions.invoke('generate-coach-video', {
    body: {
      userId,
      coachName: coach.name,
      message,
      jobId,
      avatarId: coach.heygen_avatar_id,
      voiceId: coach.elevenlabs_voice_id
    }
  })

  if (error) throw error

  // 4. Return job ID for polling
  return jobId
}

// Usage in component:
const jobId = await generateCoachVideo('nora_gentle', 'Keep up the great work!', user.id)
```

---

## 📋 Checklist

### Initial Setup
- [x] Database schema created (heygen_avatar_id, elevenlabs_voice_id columns)
- [ ] Download coach images from Supabase Storage
- [ ] Upload images to HeyGen dashboard
- [ ] Get HeyGen avatar IDs
- [ ] Update database with avatar IDs
- [ ] Test with one coach first

### Testing
- [ ] Test Blaze video generation
- [ ] Test Kai video generation
- [ ] Test Maya video generation
- [ ] Test Nora video generation
- [ ] Test Sato video generation
- [ ] Verify each coach has unique voice
- [ ] Verify each coach has unique avatar

### Production
- [ ] Add error handling for missing avatar IDs
- [ ] Add fallback to default avatar if custom fails
- [ ] Monitor HeyGen quota usage
- [ ] Monitor ElevenLabs quota usage
- [ ] Set up webhook for video completion notifications

---

## 💡 Pro Tips

1. **Test with one coach first** before uploading all 5
2. **HeyGen processing takes 5-10 minutes** per avatar - be patient!
3. **Use high-quality images** (at least 512x512px) for best results
4. **Front-facing photos work best** for lip-sync
5. **Store avatar IDs in database** - don't hardcode them!

---

## 🚨 Troubleshooting

### "Avatar not found" error
- Check that `heygen_avatar_id` is set in database
- Verify avatar ID is correct in HeyGen dashboard
- Try using default avatar: `Abigail_expressive_2024112501`

### "Voice not found" error
- Check that voice ID is correct
- Verify voice exists in ElevenLabs dashboard
- Try default voice: `EXAVITQu4vr4xnSDxMaL`

### Video generation fails
- Check Edge Function logs in Supabase dashboard
- Verify both avatar and voice IDs are valid
- Check HeyGen and ElevenLabs quotas

---

**Next Step:** Upload your 5 coach images to HeyGen and get the avatar IDs!

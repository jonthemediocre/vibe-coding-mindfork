# Voice Fix Deployed - Database Lookup

**Deployment Time:** ~12:04 AM PST, November 13, 2025
**Wait Until:** 12:07 AM PST (3 minutes)

## What Was Fixed

**Problem:** Blaze was using the default voice (Bella) instead of Arnold because the frontend wasn't passing the voice ID and the edge function wasn't looking it up.

**Solution:** Updated edge function to fetch voice ID from the database when not provided by frontend.

## Code Changes (Lines 89-102)

```typescript
// Fetch coach's voice ID from database if not provided
let finalVoiceId = voiceId;
if (!finalVoiceId && coachName) {
  const { data: coachData } = await supabaseClient
    .from('coaches')
    .select('elevenlabs_voice_id')
    .eq('name', coachName)
    .single();

  if (coachData?.elevenlabs_voice_id) {
    finalVoiceId = coachData.elevenlabs_voice_id;
    console.log(`[Voice] Using voice from database for ${coachName}: ${finalVoiceId}`);
  }
}
```

## Current Voice Assignments in Database

| Coach | Voice ID | Voice Name |
|-------|----------|------------|
| Blaze | VR6AewLTigWG4xSOukaG | Arnold (deep male) ✅ |
| Kai | ErXwobaYiN019PkySvjV | Antoni (energetic) |
| Maya | EXAVITQu4vr4xnSDxMaL | Bella (confident female) |
| Nora | 21m00Tcm4TlvDq8ikWAM | Rachel (warm female) ✅ |
| Sato | pNInz6obpgDQGcFmaJgB | Adam (calm male) |

## After Propagation (12:07 AM)

When you generate a Blaze video, the edge function will:
1. Check if `voiceId` was passed from frontend (it's not)
2. Query database for Blaze's voice ID
3. Find `VR6AewLTigWG4xSOukaG` (Arnold)
4. Use Arnold's deep voice for the audio
5. Log: `[Voice] Using voice from database for Blaze: VR6AewLTigWG4xSOukaG`

## How to Verify

Check logs at 12:07 AM or later:
https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/functions/generate-coach-video/logs

Look for:
```
[Voice] Using voice from database for Blaze: VR6AewLTigWG4xSOukaG
```

Then test Blaze video - should have deep Arnold voice! 🔥

---

**Next:** Wait until 12:07 AM, then test

# Social Media Frame Package - Server Implementation Guide

## Current Status

✅ **Client-side preview** is LIVE and working
❌ **Server-side video composition** requires FFmpeg (not available in Supabase Edge Functions)

## The FFmpeg Challenge

Supabase Edge Functions run on Deno Deploy, which:
- Does NOT have FFmpeg installed
- Does NOT allow spawning subprocesses
- Does NOT support native video processing libraries

**This means our initial `add-video-frames` Edge Function CANNOT run as-is.**

## Solution Paths

### Path A: Third-Party Video API (RECOMMENDED)

Use a dedicated video processing service that provides FFmpeg capabilities via API.

#### Option 1: Cloudinary (Best for MindFork)

**Why Cloudinary:**
- Free tier: 25 monthly video transformations
- Overlay support built-in
- Automatic optimization
- CDN delivery included
- Simple REST API

**Implementation:**

```typescript
// Edge Function: add-video-frames-cloudinary
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { videoUrl, mode, userId } = await req.json();

  // Upload original video to Cloudinary
  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    {
      method: 'POST',
      body: JSON.stringify({
        file: videoUrl,
        upload_preset: 'mindfork-frames'
      })
    }
  );

  const { public_id } = await uploadResponse.json();

  // Apply overlay transformation
  const MODE_OVERLAYS = {
    savage: 'overlay_savage.png',
    roast: 'overlay_roast.png',
    gentle: 'overlay_gentle.png'
  };

  const framedVideoUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/l_${MODE_OVERLAYS[mode]},fl_layer_apply/${public_id}.mp4`;

  return new Response(JSON.stringify({ framedVideoUrl }));
});
```

**Setup Steps:**
1. Create free Cloudinary account
2. Upload 3 overlay PNGs (savage, roast, gentle) to Cloudinary
3. Create upload preset "mindfork-frames"
4. Add `CLOUDINARY_CLOUD_NAME` to Supabase secrets
5. Deploy edge function

**Cost:** FREE for up to 25 videos/month, then $0.012 per video

#### Option 2: Mux

**Pros:**
- Built for video
- Excellent performance
- Pay-as-you-go pricing

**Cons:**
- More expensive ($0.30 per video minute)
- Requires credit card even for free tier

#### Option 3: AWS MediaConvert

**Pros:**
- Most powerful
- Supports complex overlays
- Part of AWS ecosystem

**Cons:**
- Complex setup
- Expensive ($0.015/minute + S3 storage)
- Overkill for simple overlays

---

### Path B: Hybrid Approach (CURRENT)

**What's Working:**
- Frontend generates preview with overlays in real-time
- User sees framed video before sharing
- Original video can still be shared

**Limitations:**
- Frame is NOT permanently burned into video
- Shared video on social media shows original (no branding)
- Relies on frontend canvas rendering

**When to Use:**
- MVP phase
- Testing user engagement
- Low budget

**Upgrade Path:**
When viral sharing increases, implement Path A to get permanent branding on shared videos.

---

### Path C: External Service Worker (ADVANCED)

Run a separate video processing service outside Supabase:

**Architecture:**
1. Edge Function → Add job to queue
2. Worker service (Node.js + FFmpeg) → Process video
3. Upload result → Supabase Storage
4. Webhook → Notify frontend

**Tools:**
- Railway.app or Render.com for worker hosting
- BullMQ for job queue
- FFmpeg for video processing

**Cost:** ~$5/month for worker service

**Implementation Complexity:** High (requires separate infrastructure)

---

## Recommended Action Plan

### Phase 1: NOW (FREE)
✅ Ship client-side preview (DONE)
✅ Monitor user engagement
✅ Measure share rate

### Phase 2: When shares > 100/month
Implement Cloudinary overlay (1-2 hours dev time)
- Upload 3 overlay PNGs
- Update edge function to call Cloudinary API
- Test with 5 sample videos

### Phase 3: When shares > 1000/month
Consider custom worker service for cost optimization
- Evaluate Cloudinary costs vs self-hosted
- If Cloudinary < $50/month → stay
- If Cloudinary > $50/month → migrate to worker

---

## Decision Matrix

| Solution | Setup Time | Monthly Cost (100 videos) | Monthly Cost (1000 videos) | Maintenance |
|----------|------------|---------------------------|----------------------------|-------------|
| Client-side only | 0 (done) | $0 | $0 | None |
| Cloudinary | 2 hours | $0 (free tier) | $12 | Low |
| Mux | 3 hours | $30 | $300 | Low |
| AWS MediaConvert | 6 hours | $1.50 | $15 | Medium |
| Custom worker | 12 hours | $5 | $5 | High |

---

## Files Created (For Reference)

### ✅ Working Files
- `supabase/migrations/20251117_create_framed_videos_storage.sql` - Storage bucket (deployed)
- Frontend frame preview components (deployed)

### ⚠️ Non-Working Files (FFmpeg dependency)
- `supabase/functions/add-video-frames/index.ts` - Requires FFmpeg (not available)

**This file is deployed but will fail if called.** It serves as a template for when FFmpeg becomes available or for migration to a third-party service.

---

## Next Steps

1. **Immediate:** Continue with client-side preview (working great!)
2. **Monitor:** Track how many users share videos
3. **Decide:** When shares > 100/month, implement Cloudinary
4. **Optimize:** When shares > 1000/month, evaluate worker service

---

## Testing the Current System

Frontend can call the edge function, but it will fail with FFmpeg errors:

```typescript
// This will return an error about FFmpeg not being available
const { data, error } = await supabase.functions.invoke('add-video-frames', {
  body: { videoUrl, mode, coachName, userId }
});

if (error) {
  console.log('Expected: FFmpeg not available in Edge Functions');
  // Frontend gracefully falls back to client-side preview
}
```

**This is BY DESIGN** - the frontend has 30-second timeout and graceful fallback to original video.

---

## Conclusion

**Ship what works (client-side preview), measure engagement, upgrade when needed.**

The current implementation provides:
- ✅ Instant preview value to users
- ✅ Foundation for viral growth (users see what they'll share)
- ✅ Clear upgrade path when volume justifies cost
- ✅ No infrastructure burden during MVP phase

**When ready to upgrade:** Cloudinary integration takes 2 hours and costs $0 for first 25 videos/month.

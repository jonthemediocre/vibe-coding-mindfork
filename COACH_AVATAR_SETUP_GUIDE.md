# Coach Avatar Setup Guide
**Cyberpunk Nutrition Coach Visual Identity System**

## 🎨 Avatar Analysis

You have **7 stunning cyberpunk coach avatars** that perfectly capture the MindFork aesthetic:

### Avatar Breakdown:

1. **Image #1 - "The Owl Nutritionist"**
   - Binoculars showing vegetables (lettuce, tomatoes, peppers)
   - Metallic feathers, yellow beak
   - Very analytical, observant personality
   - **Suggested Coach**: Sato (calm, analytical) or Synapse (smart, data-driven)

2. **Image #2 - "The Glam Duck"**
   - Blonde hair styled high, pink heart necklace
   - Glamorous, motivational vibe
   - Yellow beak with lipstick
   - **Suggested Coach**: Maya-Rival (confident, competitive) or Veloura (elegant)

3. **Image #3 - "The Skull DJ"**
   - Headphones, colorful brain (fruits/vegetables)
   - Punk rock energy, intense
   - Pink sunglasses, rebellious
   - **Suggested Coach**: Blaze (high-energy) or Decibel (loud, intense)

4. **Image #4 - "The Rooster Commander"**
   - Megaphone beak, mechanical crest
   - Authoritative, commanding presence
   - Pink and blue feathers
   - **Suggested Coach**: Decibel (loud, motivating) or Aetheris (authoritative)

5. **Image #5 - "The Cat Doctor"**
   - Medical goggles, stethoscope visible
   - Pink/black striped hair
   - Patches: "CALNATA", "03310", "BEEPLET", "AMMONIA"
   - **Suggested Coach**: Vetra (analytical, scientific) or Verdant (health-focused)

6. **Image #6 - "The Racing Horse"**
   - Sporty vibes, wing detail
   - Pink racing goggles
   - Mechanical body with branded panels
   - **Suggested Coach**: Blaze (athletic, competitive) or Veloura (graceful, fast)

7. **Image #7 - "The Cat Doctor (Alternate)"**
   - Same as #5, duplicate image
   - Keep as backup or variant

---

## 🗂️ Recommended Coach Mapping

Based on your existing coaches and avatar personalities:

| Coach Name | Avatar | Personality Match | Voice (ElevenLabs) |
|------------|--------|-------------------|---------------------|
| **Synapse** | Owl (#1) | Analytical, observant, data-driven | Adam (deep, calm) |
| **Vetra** | Cat Doctor (#5) | Scientific, medical, precise | Rachel (professional) |
| **Verdant** | (need green variant) | Plant-based, eco-focused | Bella (warm) |
| **Veloura** | Racing Horse (#6) | Elegant, fast, graceful | Bella (confident) |
| **Aetheris** | Glam Duck (#2) | Aspirational, elegant, wise | Rachel (authoritative) |
| **Decibel** | Rooster (#4) | Loud, motivating, intense | Arnold (strong) |
| **Maya-Rival** | Skull DJ (#3) | Competitive, edgy, rebellious | Antoni (energetic) |
| **Blaze** | (need fire variant) | High-energy, athletic, intense | Antoni (young, energetic) |

---

## 📦 Step 1: Create Supabase Storage Bucket

### Via Supabase Dashboard (Easiest):

1. Go to: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm
2. Click **Storage** in left sidebar
3. Click **New Bucket**
4. Settings:
   - **Name**: `coach-avatars`
   - **Public bucket**: ✅ YES (images need to be publicly accessible)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/png, image/jpeg, image/webp`
5. Click **Create Bucket**

### Via CLI (Alternative):

```bash
# Create public storage bucket
supabase storage create coach-avatars --public

# Or via SQL in Supabase Dashboard
INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-avatars', 'coach-avatars', true);
```

---

## 📤 Step 2: Upload Avatar Images

### Naming Convention:
```
owl-nutritionist.png          # Image #1
glam-duck.png                 # Image #2
skull-dj.png                  # Image #3
rooster-commander.png         # Image #4
cat-doctor.png                # Image #5
racing-horse.png              # Image #6
```

### Upload via Dashboard:

1. Go to **Storage** → **coach-avatars** bucket
2. Click **Upload file**
3. Select all 6 images (skip duplicate #7)
4. Wait for upload to complete
5. Verify each image is publicly accessible

### Upload via CLI:

```bash
# Upload all images at once
supabase storage upload coach-avatars/owl-nutritionist.png ./path/to/image1.png
supabase storage upload coach-avatars/glam-duck.png ./path/to/image2.png
supabase storage upload coach-avatars/skull-dj.png ./path/to/image3.png
supabase storage upload coach-avatars/rooster-commander.png ./path/to/image4.png
supabase storage upload coach-avatars/cat-doctor.png ./path/to/image5.png
supabase storage upload coach-avatars/racing-horse.png ./path/to/image6.png
```

### Get Public URLs:

After upload, get the public URL format:
```
https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/owl-nutritionist.png
```

---

## 🔧 Step 3: Update Coaches Table

### Migration SQL:

```sql
-- Add avatar_url column to coaches table (if doesn't exist)
ALTER TABLE coaches
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update coaches with new avatar URLs
UPDATE coaches
SET avatar_url = 'https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/owl-nutritionist.png'
WHERE name = 'Synapse' OR coach_id = 'synapse';

UPDATE coaches
SET avatar_url = 'https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/cat-doctor.png'
WHERE name = 'Vetra' OR coach_id = 'vetra';

UPDATE coaches
SET avatar_url = 'https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/racing-horse.png'
WHERE name = 'Veloura' OR coach_id = 'veloura';

UPDATE coaches
SET avatar_url = 'https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/glam-duck.png'
WHERE name = 'Aetheris' OR coach_id = 'aetheris';

UPDATE coaches
SET avatar_url = 'https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/rooster-commander.png'
WHERE name = 'Decibel' OR coach_id = 'decibel';

UPDATE coaches
SET avatar_url = 'https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/skull-dj.png'
WHERE name = 'Maya-Rival' OR coach_id = 'maya-rival';

-- Verify updates
SELECT name, avatar_url FROM coaches WHERE avatar_url IS NOT NULL;
```

---

## 🎯 Step 4: Frontend Integration

### Display Avatar in React Native:

```tsx
import { Image } from 'react-native'

interface CoachAvatarProps {
  coachId: string
  size?: number
}

export const CoachAvatar: React.FC<CoachAvatarProps> = ({
  coachId,
  size = 80
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAvatar() {
      const { data } = await supabase
        .from('coaches')
        .select('avatar_url')
        .eq('coach_id', coachId)
        .single()

      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url)
      }
    }
    fetchAvatar()
  }, [coachId])

  if (!avatarUrl) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#e2e8f0'
        }}
      />
    )
  }

  return (
    <Image
      source={{ uri: avatarUrl }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
      resizeMode="cover"
    />
  )
}
```

### Usage:

```tsx
// Coach selection screen
<CoachAvatar coachId="synapse" size={120} />

// Chat header
<CoachAvatar coachId={currentCoach.id} size={40} />

// Marketplace
<CoachAvatar coachId={coach.id} size={80} />
```

---

## 🎨 Optional: Avatar Variants

### Create Avatar Moods (Future Enhancement):

```sql
CREATE TABLE coach_avatar_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT REFERENCES coaches(coach_id),
  mood TEXT NOT NULL, -- 'neutral', 'happy', 'motivated', 'serious'
  avatar_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example variants
INSERT INTO coach_avatar_variants (coach_id, mood, avatar_url)
VALUES
  ('synapse', 'neutral', 'https://.../owl-neutral.png'),
  ('synapse', 'happy', 'https://.../owl-happy.png'),
  ('synapse', 'analyzing', 'https://.../owl-analyzing.png');
```

---

## 📊 Image Optimization (Optional)

### Resize for Performance:

```bash
# Install ImageMagick (if needed)
brew install imagemagick

# Create optimized versions
for img in *.png; do
  # Original (1024x1024) - for full screen
  convert "$img" -resize 1024x1024 -quality 90 "${img%.png}_large.png"

  # Medium (512x512) - for cards
  convert "$img" -resize 512x512 -quality 85 "${img%.png}_medium.png"

  # Small (256x256) - for avatars
  convert "$img" -resize 256x256 -quality 80 "${img%.png}_small.png"

  # Thumbnail (128x128) - for lists
  convert "$img" -resize 128x128 -quality 75 "${img%.png}_thumb.png"
done

# Upload all variants
supabase storage upload coach-avatars/owl-nutritionist_large.png ./owl-nutritionist_large.png
# ... etc
```

### Responsive Image Loading:

```tsx
const getAvatarUrl = (coachId: string, size: 'thumb' | 'small' | 'medium' | 'large' = 'small') => {
  return `https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/${coachId}_${size}.png`
}

<Image
  source={{ uri: getAvatarUrl('synapse', 'small') }}
  style={{ width: 80, height: 80 }}
/>
```

---

## 🚀 Quick Deployment Checklist

- [ ] Create `coach-avatars` bucket (public)
- [ ] Upload 6 avatar images with descriptive names
- [ ] Verify public URLs are accessible
- [ ] Run migration to add `avatar_url` column
- [ ] Update coaches table with avatar URLs
- [ ] Test avatar display in app
- [ ] (Optional) Create optimized variants
- [ ] (Optional) Add avatar variants for moods

---

## 🎯 Next Steps

### Missing Coaches:
You have 7 coaches but only 6 unique avatars. Need to either:

**Option A:** Commission 2 more avatars
- Verdant (plant-based theme - green colors, botanical elements)
- Blaze (fire theme - orange/red colors, athletic energy)

**Option B:** Reuse existing avatars
- Use Owl for both Synapse and Verdant (both analytical)
- Use Skull DJ for both Blaze and Maya-Rival (both intense)

**Option C:** AI-generate matching avatars
- Use Midjourney/DALL-E with same art style
- Prompt: "Cyberpunk nutrition coach character, steampunk mechanical [animal], pink and teal color scheme, nutrition-themed accessories, 3D rendered"

---

## 💡 Pro Tips

1. **Consistent Branding**: All avatars share pink/teal color scheme - maintain this!
2. **Nutrition Details**: Each avatar has food/health elements (vegetables, medical gear, etc.)
3. **File Naming**: Use kebab-case for consistency: `owl-nutritionist.png`
4. **Image Format**: PNG with transparency works best for avatars
5. **Cache Busting**: If updating images, append `?v=2` to URL to force refresh

---

## 🔍 Verification

After setup, verify with:

```sql
-- Check all coaches have avatars
SELECT
  coach_id,
  name,
  CASE
    WHEN avatar_url IS NOT NULL THEN '✅ Has avatar'
    ELSE '❌ Missing avatar'
  END as avatar_status
FROM coaches
ORDER BY name;
```

Expected result:
```
coach_id     | name        | avatar_status
-------------|-------------|---------------
synapse      | Synapse     | ✅ Has avatar
vetra        | Vetra       | ✅ Has avatar
verdant      | Verdant     | ✅ Has avatar
veloura      | Veloura     | ✅ Has avatar
aetheris     | Aetheris    | ✅ Has avatar
decibel      | Decibel     | ✅ Has avatar
maya-rival   | Maya-Rival  | ✅ Has avatar
```

---

**Total Setup Time**: 15-30 minutes
**Impact**: 🔥 Massive brand identity boost, professional polish
**Cost**: $0 (Supabase storage is free for first 1 GB)

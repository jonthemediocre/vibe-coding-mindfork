# 🏗️ MINDFORK APP - COMPLETE TECHNICAL SPECIFICATIONS

**Last Updated:** 2025-10-31
**Version:** 2.0 - Viral Growth System Integration
**Status:** Development Ready

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Viral Growth Systems](#viral-growth-systems)
5. [AI Coach System](#ai-coach-system)
6. [Database Schema](#database-schema)
7. [API Integrations](#api-integrations)
8. [File Structure](#file-structure)
9. [Implementation Status](#implementation-status)
10. [Development Roadmap](#development-roadmap)

---

## 1. SYSTEM OVERVIEW

### Tech Stack
- **Frontend:** React Native 0.76.7 + Expo SDK 53
- **Styling:** NativeWind (TailwindCSS for React Native)
- **State Management:** Zustand with AsyncStorage persistence
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **AI Services:** OpenAI (GPT-4o), Anthropic (Claude), Grok 4, Google Gemini
- **Video:** expo-av, expo-video
- **Audio:** expo-haptics
- **Navigation:** React Navigation (Native Stack, Bottom Tabs, Drawer)

### Environment
- **Platform:** iOS-optimized (Android compatible)
- **Development Server:** Port 8081 (auto-managed by Vibecode)
- **Git:** Automated by Vibecode system
- **Package Manager:** Bun (not npm)

### Key Principles
- Mobile-first design (Apple Human Interface Guidelines)
- No new packages with native code
- TypeScript with strict type checking
- Haptic feedback on all major interactions
- Dark mode support throughout
- Viral growth mechanics built into core features

---

## 2. ARCHITECTURE

### Frontend Structure
```
/home/user/workspace/
├── src/
│   ├── api/                    # AI service integrations
│   │   ├── anthropic.ts        # Claude client
│   │   ├── openai.ts           # GPT-4o client
│   │   ├── grok.ts             # Grok 4 client (math-heavy)
│   │   ├── chat-service.ts     # Unified AI interface
│   │   ├── image-generation.ts # Vibecode image API
│   │   └── transcribe-audio.ts # Whisper transcription
│   │
│   ├── services/               # Business logic
│   │   ├── OnboardingAgentService.ts      # Conversational onboarding
│   │   ├── NanoBananaService.ts           # Image viral sharing
│   │   ├── NanoBananaVideoService.ts      # Video viral sharing
│   │   ├── RoastModeService.ts            # Roast level integration
│   │   ├── ViralRoastCaptureService.ts    # Auto-capture roasts
│   │   ├── CoachContextService.ts         # Coach personalization
│   │   ├── ProfileService.ts              # User profile management
│   │   ├── FoodService.ts                 # Food tracking
│   │   └── FastingService.ts              # Fasting timer
│   │
│   ├── components/             # Reusable UI components
│   │   ├── viral/
│   │   │   ├── ViralShareButton.tsx       # 3 variants share button
│   │   │   └── NanoBananaVideoEditor.tsx  # CapCut-style editor
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── food/               # Food tracking components
│   │   └── onboarding/         # Onboarding components
│   │
│   ├── screens/                # Full screen views
│   │   ├── auth/               # Authentication flows
│   │   │   ├── SignInScreen.tsx
│   │   │   └── ConversationalOnboardingScreen.tsx
│   │   ├── coach/              # AI coach chat
│   │   ├── food/               # Food tracking
│   │   ├── dashboard/          # Home dashboard
│   │   ├── profile/            # User settings
│   │   │   └── SettingsScreen.tsx
│   │   └── DevToolsScreen.tsx  # Developer utilities
│   │
│   ├── navigation/             # Navigation structure
│   │   ├── AuthNavigator.tsx           # Auth flow routing
│   │   ├── TabNavigator.tsx            # Bottom tabs
│   │   ├── SettingsStackNavigator.tsx  # Settings → DevTools
│   │   ├── CoachStackNavigator.tsx     # Coach screens
│   │   └── FoodStackNavigator.tsx      # Food screens
│   │
│   ├── data/                   # Static data & configurations
│   │   └── coachPersonalities.ts  # 7 detailed coach profiles
│   │
│   ├── types/                  # TypeScript definitions
│   ├── utils/                  # Utility functions
│   │   └── goalCalculations.ts # BMR, TDEE, macro calculations
│   │
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ProfileContext.tsx
│   │
│   └── hooks/                  # Custom React hooks
│       ├── useAgentStream.ts   # AI chat hook
│       └── useCoachContext.ts  # Personalized coaching
│
├── database/
│   └── migrations/
│       ├── nano_banana_referral_system.sql    # Referral tracking
│       └── viral_roast_mode_schema.sql        # Roast moment capture
│
├── assets/                     # Images, fonts, etc.
├── .env                        # Environment variables
└── README.md                   # Project documentation
```

---

## 3. CORE FEATURES

### 3.1 Authentication & Onboarding
- **Supabase Auth:** Email/password authentication
- **Conversational Onboarding:** AI-powered chat with Synapse coach
  - Extracts: name, age, gender, height, weight, goals, diet type, fasting preference
  - Natural language processing (GPT-4o)
  - Validates completeness before proceeding
  - Photo capture option at end
- **Welcome Image Generation:** AI-generated personalized welcome image
- **Onboarding Reset:** Developer tools for QA testing

**Files:**
- `/src/screens/auth/ConversationalOnboardingScreen.tsx`
- `/src/services/OnboardingAgentService.ts`

### 3.2 AI Coach System
- **7 Unique Coach Personalities:**
  1. **Synapse** (Wise Owl) - Analytical, patient, science-based
  2. **Vetra** (Parakeet) - Energetic, motivational, fitness-focused
  3. **Verdant** (Turtle) - Calm, mindful, sustainable habits
  4. **Veloura** (Rabbit) - Disciplined, structured, results-driven
  5. **Aetheris** (Phoenix) - Transformative, handles setbacks
  6. **Decibel** (Dolphin) - Playful, social, makes wellness fun
  7. **Maya** (Rival) - Competitive, challenging, no-nonsense

- **Roast Levels (1-10):**
  - 1-3: Gentle, supportive, patient
  - 4-6: Balanced, honest accountability
  - 7-8: Direct, no-nonsense challenges
  - 9-10: **FULL ROAST MODE** - viral-worthy content

- **Personalization:**
  - Uses user's food logs, weight progress, fasting data
  - Adapts to diet type (vegan, keto, paleo, etc.)
  - References specific user achievements

**Files:**
- `/src/data/coachPersonalities.ts` (7 detailed personality profiles)
- `/src/services/RoastModeService.ts` (roast level integration)
- `/src/hooks/useAgentStream.ts` (AI chat interface)
- `/src/screens/coach/CoachScreen.tsx` (chat UI)

### 3.3 Food Tracking
- Photo-based food logging
- AI-powered nutritional analysis (GPT-4o Vision)
- Macro tracking (protein, carbs, fat, fiber)
- Daily calorie goals
- Food history and patterns

**Files:**
- `/src/services/FoodService.ts`
- `/src/screens/food/FoodScreen.tsx`

### 3.4 Fasting Tracker
- Customizable fasting windows
- Visual circular timer
- Integration with coach feedback
- Fasting history and streaks

**Files:**
- `/src/services/FastingService.ts`
- `/src/screens/fasting/FastingScreen.tsx`

### 3.5 Dashboard
- Weight progress charts
- Nutrition progress cards
- Weekly summaries
- Coach insights
- Quick access to all features

**Files:**
- `/src/screens/dashboard/DashboardScreen.tsx`
- `/src/components/dashboard/` (various widgets)

---

## 4. VIRAL GROWTH SYSTEMS

### 4.1 NANO-BANANA Image Sharing

**Purpose:** Turn user achievements into shareable social media images

**Features:**
- User photo + AI coach character mashup
- 4 templates: Achievement, Progress, Coach Intro, Milestone
- Automatic referral code integration
- One-tap share button (3 variants)
- Haptic feedback on all interactions

**Templates:**
- **Achievement:** User celebrating + coach cheering
- **Progress:** Before/after with coach mascot
- **Coach Intro:** Feature coach with user testimonial
- **Milestone:** Celebration theme with confetti

**Files:**
- `/src/services/NanoBananaService.ts`
- `/src/components/viral/ViralShareButton.tsx`

**Database Tables:**
- `profiles.referral_code` - Unique code (e.g., "MINDFK42")
- `referrals` - Tracks who signed up with whose code

### 4.2 NANO-BANANA Video Editor (CapCut-Style)

**Purpose:** Create viral TikTok/Instagram Reels featuring AI coach + user achievements

**Features:**
- 4 pre-built video templates (15s Reels, 10s stories, 7s quick wins)
- AI-generated coach animation frames
- Text overlays with animations (fade, slide, typewriter, bounce)
- Multiple aspect ratios (9:16 TikTok, 1:1 Instagram, 16:9 YouTube)
- One-tap generation + share
- Beautiful 3-step UI: Select → Generate → Share

**Templates:**
1. **Transformation Reveal** (15s, 9:16) - Before/after with coach celebration
2. **Progress Stats** (10s, 1:1) - Animated stats with coach
3. **Daily Win** (7s, 9:16) - Quick win with coach in corner
4. **Meet My Coach** (12s, 9:16) - Introduce AI coach to friends

**Files:**
- `/src/services/NanoBananaVideoService.ts`
- `/src/components/viral/NanoBananaVideoEditor.tsx`

**Technical Notes:**
- MVP uses image sequences (not true video yet)
- Future: FFmpeg integration for actual video rendering
- Background music planned for v2
- Currently generates frames via Vibecode image API

### 4.3 Viral Roast Mode System

**Purpose:** Auto-capture viral-worthy roast moments and turn them into shareable content

**How It Works:**
1. User sets roast level 1-10 in coach chat
2. AI coach delivers roasts based on level
3. System auto-detects viral-worthy moments (Level 7+ with quotable phrases)
4. Prompts user: "💀 Epic roast detected! Share this?"
5. Generates shareable Instagram/TikTok card
6. Tracks shares, views, virality score

**Captures From:**
- ✅ Text chat messages
- ✅ Voice messages (transcribed via Whisper)
- ✅ Phone call recordings (transcribed)
- ✅ SMS exchanges (planned)

**Viral Detection Logic:**
- Roast level ≥ 7
- Contains quotable challenge phrases ("Let's be real", "Excuses or results", "Champions")
- Message length ≤ 50 words (shareable)
- Has emphasis punctuation (!, ?)

**Generated Cards Include:**
- Large, bold roast quote (center)
- Coach name + roast level badge (🔥 Level 9/10)
- Referral code prominently displayed
- CTA: "Think you can handle this? Use code [CODE]"
- High-contrast Instagram-ready design

**Files:**
- `/src/services/RoastModeService.ts` (roast level integration)
- `/src/services/ViralRoastCaptureService.ts` (auto-capture system)

**Database Tables:**
- `roast_moments` - All captured roasts with metadata
- `roast_shares` - Tracks shares by platform
- `viral_roast_leaderboard` view - Top 100 most viral roasts

### 4.4 Referral System

**Purpose:** Reward users for bringing friends

**Mechanics:**
- Each user gets unique referral code (e.g., "MINDFK42")
- Code embedded in all shared content (images, videos, roasts)
- New user signs up with code → tracked in database
- Original user earns free month when referred user subscribes
- Referral stats visible in profile

**Rewards:**
- 1 free month per successful referral
- Pending referrals shown (signed up but not subscribed yet)
- Leaderboard of top referrers (optional opt-in)

**Files:**
- `/src/services/NanoBananaService.ts` (generateReferralCode, trackReferralSignup)
- `/database/migrations/nano_banana_referral_system.sql`

---

## 5. AI COACH SYSTEM (DETAILED)

### 5.1 Coach Personality Profiles

Each coach has 14 attributes defining their behavior:

1. **corePersonality** - Essential character traits
2. **communicationStyle** - How they speak
3. **coachingMethodology** - Their approach to coaching
4. **vocabularyPatterns** - Signature phrases (12+ examples)
5. **responseStructure** - How they structure answers
6. **specializedKnowledge** - Areas of expertise
7. **motivationalApproach** - How they inspire
8. **conflictResolution** - Handling struggles
9. **celebrationStyle** - How they praise
10. **toneAndVoice** - Overall vibe
11. **signaturePhrase** - Catchphrase
12. **avoidancePatterns** - What NOT to do (6+ guardrails)
13. **exampleOpeners** - Message starters (5 examples)
14. **exampleClosers** - Message endings (5 examples)

**Total Profile Length:** ~500-800 lines per coach

**File:** `/src/data/coachPersonalities.ts`

### 5.2 Roast Level Modulation

Roast level (1-10) modulates each coach's personality:

**Modulation Variables:**
- `directness` (0-10) - How blunt
- `calloutIntensity` (0-10) - How hard to call out excuses
- `sugarcoating` (0-10, inverse) - How much to soften
- `competitiveEdge` (0-10) - Challenge/rivalry language
- `humor` (0-8, capped) - Roast humor level
- `encouragementRatio` (0-1) - Encouragement vs challenge

**System Prompt Construction:**
```
Base personality (from coachPersonalities.ts)
    +
Roast level modulation (gentle/balanced/direct/roast)
    +
Communication style
    +
Roast-specific vocabulary (if Level 7+)
    +
Safety guardrails (always included)
    +
Viral moment reminder (if Level 9-10)
    =
Complete system prompt for AI
```

**Example Roast Lines by Level:**

**Synapse:**
- Level 3: "Let's explore why this pattern keeps showing up..."
- Level 6: "The data shows you're capable of more than this."
- Level 9: "Research shows excuses don't burn calories. What's the real plan?"

**Maya:**
- Level 3: "You're capable of more. Here's the standard:"
- Level 6: "That excuse might work on someone else. Not me."
- Level 10: "You're wasting my time with excuses. Show up or shut up."

**File:** `/src/services/RoastModeService.ts`

### 5.3 Coach Context System

Coaches have access to user's personalized context:

**Data Available:**
- Recent food logs (past 7 days)
- Weight progress trends
- Fasting patterns
- Goal adherence rates
- Macro achievement percentages
- Activity levels
- Sleep patterns (if tracked)
- User's stated goals and preferences

**Context Sanitization:**
- Medical terms → wellness terms (HIPAA compliant)
- Removes sensitive identifiers
- Limits data to most relevant insights

**File:** `/src/services/CoachContextService.ts`

---

## 6. DATABASE SCHEMA

### 6.1 Supabase Configuration
- **URL:** `https://lxajnrofkgpwdpodjvkm.supabase.co`
- **Auth:** Row Level Security (RLS) enabled on all tables
- **Storage:** Used for user photos, food images, generated content

### 6.2 Core Tables

#### `profiles`
```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  gender VARCHAR(20),
  height_cm DECIMAL,
  weight_kg DECIMAL,
  activity_level VARCHAR(20),
  primary_goal VARCHAR(50),
  diet_type VARCHAR(50),
  onboarding_completed BOOLEAN DEFAULT false,
  referral_code VARCHAR(20) UNIQUE,  -- NANO-BANANA
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `user_settings`
```sql
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  daily_calories DECIMAL,
  daily_protein_g DECIMAL,
  daily_carbs_g DECIMAL,
  daily_fat_g DECIMAL,
  daily_fiber_g DECIMAL,
  uses_fasting BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `food_entries`
```sql
CREATE TABLE food_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  calories DECIMAL,
  protein_g DECIMAL,
  carbs_g DECIMAL,
  fat_g DECIMAL,
  fiber_g DECIMAL,
  image_url TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `referrals` (NANO-BANANA)
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID REFERENCES auth.users(id),
  referred_user_id UUID REFERENCES auth.users(id),
  reward_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'earned', 'redeemed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  earned_at TIMESTAMP WITH TIME ZONE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referrer_user_id, referred_user_id)
);
```

#### `roast_moments` (VIRAL ROAST MODE)
```sql
CREATE TABLE roast_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  coach_id VARCHAR(50) NOT NULL,
  coach_name VARCHAR(100) NOT NULL,
  roast_level INTEGER CHECK (roast_level >= 1 AND roast_level <= 10),
  roast_text TEXT NOT NULL,
  user_prompt TEXT,
  source_type VARCHAR(20), -- 'text', 'voice', 'call', 'sms'
  transcript TEXT,
  audio_url TEXT,
  is_viral_candidate BOOLEAN DEFAULT false,
  share_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `roast_shares` (VIRAL TRACKING)
```sql
CREATE TABLE roast_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roast_moment_id UUID REFERENCES roast_moments(id),
  platform VARCHAR(50), -- 'instagram', 'tiktok', 'twitter', etc.
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewer_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0
);
```

### 6.3 Database Functions

#### Referral Tracking
```sql
-- Auto-marks referrals as "earned" when referred user subscribes
CREATE FUNCTION mark_referral_earned() RETURNS TRIGGER;

-- Get referral stats for a user
CREATE FUNCTION get_referral_stats(user_uuid UUID) RETURNS JSON;
```

#### Roast Tracking
```sql
-- Increment share count and log share
CREATE FUNCTION increment_roast_share_count(roast_id UUID, platform_name VARCHAR);

-- Increment view count
CREATE FUNCTION increment_roast_view_count(roast_id UUID);

-- Get top roasters (leaderboard)
CREATE FUNCTION get_top_roasters(limit_count INTEGER) RETURNS TABLE;
```

### 6.4 Database Views

```sql
-- Viral roast leaderboard (top 100)
CREATE VIEW viral_roast_leaderboard AS
SELECT *, (share_count * 10 + view_count) as virality_score
FROM roast_moments
WHERE is_viral_candidate = true
ORDER BY virality_score DESC
LIMIT 100;
```

### 6.5 Migration Files

**Location:** `/database/migrations/`

1. `nano_banana_referral_system.sql` - Referral tracking system
2. `viral_roast_mode_schema.sql` - Roast moment capture system

---

## 7. API INTEGRATIONS

### 7.1 OpenAI (Primary AI Provider)

**API Key:** `EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY`

**Models Used:**
- `gpt-4o` - Main chat model (supports vision)
- `gpt-5-mini` - Fast, cheaper alternative (available but not yet integrated)
- `gpt-image-1` - Image generation (via Vibecode proxy)
- `whisper-1` - Audio transcription (via transcribe-audio.ts)

**Use Cases:**
- Food photo analysis (vision)
- Conversational onboarding
- Coach image generation
- Voice/call transcription

**Files:**
- `/src/api/openai.ts`
- `/src/api/image-generation.ts` (Vibecode wrapper)
- `/src/api/transcribe-audio.ts` (Whisper wrapper)

### 7.2 Anthropic Claude (Secondary AI)

**API Key:** `EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY`

**Models Used:**
- `claude-3-5-sonnet-20240620` - Default for complex reasoning
- Used primarily for onboarding agent (Synapse)

**Use Cases:**
- Conversational onboarding (extracts structured data)
- Complex coaching scenarios

**File:** `/src/api/anthropic.ts`

### 7.3 Grok (Math-Heavy Operations)

**API Key:** `EXPO_PUBLIC_VIBECODE_GROK_API_KEY`

**Models Used:**
- `grok-4-fast-non-reasoning` - Latest, best for math

**Use Cases (Planned):**
- Macro calculations with complex restrictions
- Meal planning optimization
- Progress analytics and predictions
- Nutrition goal adjustments

**File:** `/src/api/grok.ts`

### 7.4 Google Gemini (Available, Not Integrated)

**API Key:** `EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY`

**Models Available:**
- `gemini-2.5-flash` - Fast, multimodal, structured JSON output

**Potential Use Cases:**
- Structured data extraction
- Image analysis alternative
- Cost optimization

**Status:** API key present, no integration code yet

### 7.5 Unified Chat Service

**File:** `/src/api/chat-service.ts`

Provides consistent interface across all AI providers:

```typescript
// Anthropic
getAnthropicTextResponse(messages, options)
getAnthropicChatResponse(prompt)

// OpenAI
getOpenAITextResponse(messages, options)
getOpenAIChatResponse(prompt)

// Grok
getGrokTextResponse(messages, options)
getGrokChatResponse(prompt)
```

All functions support:
- Timeout handling (30s default)
- Error typing (AIServiceError, AITimeoutError, AIRateLimitError)
- Image input (where supported)
- Streaming (where supported)

### 7.6 Vibecode Image Generation API

**Endpoint:** `https://api.vibecodeapp.com/api/storage/generate-image`

**Uses:** OpenAI's `gpt-image-1` model under the hood

**Parameters:**
- `prompt` (required)
- `size`: "1024x1024" | "1536x1024" | "1024x1536" | "auto"
- `quality`: "low" | "medium" | "high" | "auto"
- `format`: "png" | "jpeg" | "webp"
- `background`: undefined | "transparent"

**Response:** `{ success: true, data: { imageUrl: string } }`

**Cost:** ~$0.04 per image (high quality)

**File:** `/src/api/image-generation.ts`

### 7.7 Haptic Feedback (expo-haptics)

**No API key required** - Native device capability

**Available Haptics:**
- `Haptics.impactAsync(ImpactFeedbackStyle.Light)` - Subtle interactions
- `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` - Standard button press
- `Haptics.impactAsync(ImpactFeedbackStyle.Heavy)` - Important actions
- `Haptics.impactAsync(ImpactFeedbackStyle.Soft)` - Smooth transitions
- `Haptics.impactAsync(ImpactFeedbackStyle.Rigid)` - Precise interactions
- `Haptics.selectionAsync()` - Selection changes
- `Haptics.notificationAsync(NotificationFeedbackType.Success)` - Success
- `Haptics.notificationAsync(NotificationFeedbackType.Warning)` - Warning
- `Haptics.notificationAsync(NotificationFeedbackType.Error)` - Error

**Integration Status:**
- ✅ Viral share button
- ✅ Video editor
- ⚠️ Food scanning (planned)
- ⚠️ AI chat (planned)
- ⚠️ Goal achievements (planned)

---

## 8. FILE STRUCTURE

### 8.1 Service Layer Files

**AI Services:**
- `/src/api/chat-service.ts` - Unified AI interface (OpenAI, Anthropic, Grok)
- `/src/api/anthropic.ts` - Claude client
- `/src/api/openai.ts` - GPT client
- `/src/api/grok.ts` - Grok 4 client
- `/src/api/image-generation.ts` - Vibecode image API wrapper
- `/src/api/transcribe-audio.ts` - Whisper transcription

**Business Logic Services:**
- `/src/services/OnboardingAgentService.ts` - Conversational onboarding logic
- `/src/services/NanoBananaService.ts` - Image viral sharing
- `/src/services/NanoBananaVideoService.ts` - Video viral sharing (CapCut-style)
- `/src/services/RoastModeService.ts` - Roast level + personality integration
- `/src/services/ViralRoastCaptureService.ts` - Auto-capture viral roasts
- `/src/services/CoachContextService.ts` - Coach personalization context
- `/src/services/ProfileService.ts` - User profile CRUD
- `/src/services/FoodService.ts` - Food tracking logic
- `/src/services/FastingService.ts` - Fasting timer logic
- `/src/services/GoalsService.ts` - Goal management
- `/src/services/MealPlanningService.ts` - Meal planning

### 8.2 Component Files

**Viral Growth Components:**
- `/src/components/viral/ViralShareButton.tsx` - Quick share button (3 variants)
- `/src/components/viral/NanoBananaVideoEditor.tsx` - CapCut-style video editor

**Dashboard Components:**
- `/src/components/dashboard/PersonalizedDashboard.tsx`
- `/src/components/dashboard/WeightProgressChart.tsx`
- `/src/components/dashboard/NutritionProgressCard.tsx`
- `/src/components/dashboard/WeeklySummaryCard.tsx`
- `/src/components/dashboard/StepCounterCard.tsx`

**Food Components:**
- `/src/components/food/FoodSearchBar.tsx`
- `/src/components/food/FoodEntryCard.tsx`

**Onboarding Components:**
- `/src/components/onboarding/WellnessOnboarding.tsx` (unused - using conversational)

### 8.3 Screen Files

**Auth Screens:**
- `/src/screens/auth/SignInScreen.tsx` - Login/signup
- `/src/screens/auth/ConversationalOnboardingScreen.tsx` - AI-powered onboarding

**Main Screens:**
- `/src/screens/dashboard/DashboardScreen.tsx` - Home
- `/src/screens/coach/CoachScreen.tsx` - AI coach chat
- `/src/screens/food/FoodScreen.tsx` - Food tracking
- `/src/screens/fasting/FastingScreen.tsx` - Fasting timer
- `/src/screens/meals/MealsScreen.tsx` - Meal planning
- `/src/screens/profile/SettingsScreen.tsx` - User settings
- `/src/screens/DevToolsScreen.tsx` - Developer utilities

**Planned Screens:**
- `/src/screens/RoastGalleryScreen.tsx` - User's roast history (not yet created)
- `/src/screens/ReferralStatsScreen.tsx` - Referral dashboard (not yet created)

### 8.4 Navigation Files

- `/src/navigation/AuthNavigator.tsx` - Top-level auth routing
- `/src/navigation/TabNavigator.tsx` - Bottom tab navigation
- `/src/navigation/SettingsStackNavigator.tsx` - Settings → DevTools stack
- `/src/navigation/CoachStackNavigator.tsx` - Coach screens stack
- `/src/navigation/FoodStackNavigator.tsx` - Food screens stack

### 8.5 Data Files

- `/src/data/coachPersonalities.ts` - 7 detailed coach personality profiles
- `/src/data/coachProfiles.ts` - Coach metadata (images, bios)
- `/src/data/mockCoaches.ts` - Sample coach data

### 8.6 Utility Files

- `/src/utils/goalCalculations.ts` - BMR, TDEE, macro calculations
- `/src/utils/foodTransformers.ts` - Food data transformation
- `/src/utils/analytics.ts` - Analytics tracking
- `/src/utils/logger.ts` - Logging utility
- `/src/utils/cn.ts` - TailwindCSS class merging helper

### 8.7 Database Files

- `/database/migrations/nano_banana_referral_system.sql` - Referral tracking
- `/database/migrations/viral_roast_mode_schema.sql` - Roast moment capture
- `/database/migrations/FIX_SECURITY_DEFINER.sql` - Security fix (manual execution needed)

### 8.8 Documentation Files

**Implementation Guides:**
- `/VIRAL_ROAST_MODE_GUIDE.md` - Complete roast mode implementation
- `/CAPCUT_STYLE_VIDEO_EDITOR.md` - Video editor guide
- `/VIRAL_GROWTH_IMPLEMENTATION.md` - Image sharing implementation
- `/COMPLETE_IMPLEMENTATION_SUMMARY.md` - Overview of all systems
- `/DEVELOPER_TOOLS_GUIDE.md` - Developer tools usage

**Project Documentation:**
- `/CLAUDE.md` - Instructions for Claude Code (system prompt)
- `/README.md` - Project overview
- `/TECHNICAL_SPECIFICATIONS.md` - This file

**Status Reports:**
- `/DEVELOPMENT_STATUS.md` - Current development status
- `/PROJECT_STATUS.md` - Project milestones
- `/COACH_PERSONALITY_PHASE1_COMPLETE.md` - Coach system completion

### 8.9 Configuration Files

- `.env` - Environment variables (API keys, Supabase config)
- `package.json` - Dependencies and scripts (use Bun, not npm)
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind/NativeWind configuration
- `babel.config.js` - Babel configuration
- `metro.config.js` - Metro bundler configuration
- `app.json` - Expo configuration

---

## 9. IMPLEMENTATION STATUS

### ✅ COMPLETE (Ready to Use)

**Core Features:**
- [x] Authentication (Supabase)
- [x] Conversational onboarding (AI-powered)
- [x] 7 Coach personalities (detailed profiles)
- [x] Food tracking (photo + AI analysis)
- [x] Fasting timer
- [x] Dashboard with progress tracking
- [x] Settings and profile management

**Viral Growth Systems:**
- [x] NANO-BANANA image sharing (user + coach mashup)
- [x] NANO-BANANA video editor (CapCut-style, 4 templates)
- [x] Roast mode integration (levels 1-10 with personalities)
- [x] Viral roast capture system (auto-detect + save)
- [x] Referral tracking system (codes + rewards)
- [x] Viral share button component (3 variants)
- [x] Complete database schema (referrals + roast moments)

**Developer Tools:**
- [x] Developer tools screen (reset onboarding, view profile)
- [x] Settings stack navigator
- [x] Comprehensive documentation

### ⚠️ IN PROGRESS (Needs Integration)

**Roast Mode:**
- [ ] Update `useAgentStream.ts` to use `buildRoastModePrompt()`
- [ ] Add roast level slider to CoachScreen
- [ ] Show "Share this roast?" prompt when viral moment detected
- [ ] Create RoastGalleryScreen for roast history

**Haptic Feedback:**
- [ ] Add to food scanning flow
- [ ] Add to AI chat interactions
- [ ] Add to goal achievements
- [ ] Add to weight logging

**Social Features:**
- [ ] Add video editor modal to Dashboard
- [ ] Add referral code input to signup
- [ ] Create referral stats screen
- [ ] Add roast leaderboard screen

**Voice/Call Integration:**
- [ ] Integrate voice message roast capture
- [ ] Add phone call recording (with consent)
- [ ] Implement call transcription pipeline

### 🔮 PLANNED (Future Enhancements)

**Video System:**
- [ ] FFmpeg integration for actual video rendering
- [ ] Background music library
- [ ] More video templates (target: 10+)
- [ ] Video trimming/editing
- [ ] Filters and effects

**AI Features:**
- [ ] Integrate Google Gemini (structured output)
- [ ] Use Grok for math-heavy operations
- [ ] Meal planning optimization with Grok
- [ ] Progress predictions and analytics

**Social Features:**
- [ ] User-generated video templates
- [ ] Roast challenges and competitions
- [ ] Social leaderboards (opt-in)
- [ ] Featured roasts section
- [ ] Cross-platform auto-posting

**Content:**
- [ ] Seasonal video templates
- [ ] Holiday-themed roast cards
- [ ] Trending audio integration (TikTok)
- [ ] A/B testing system for templates

---

## 10. DEVELOPMENT ROADMAP

### Phase 1: Viral Foundation (CURRENT - Week 1)
**Status:** Complete ✅

**Completed:**
- ✅ Grok 4 integration (latest model)
- ✅ NANO-BANANA image sharing system
- ✅ NANO-BANANA video editor (CapCut-style)
- ✅ Roast mode integration with personalities
- ✅ Viral roast capture system
- ✅ Referral tracking database
- ✅ Complete documentation

**Next Steps:**
1. Run database migrations
2. Integrate roast mode into chat
3. Add roast level slider UI
4. Test end-to-end viral flow

---

### Phase 2: Core Integration (Week 2)
**Goal:** Make viral features accessible throughout app

**Tasks:**
- [ ] Update useAgentStream with buildRoastModePrompt
- [ ] Add roast level slider to CoachScreen
- [ ] Create RoastGalleryScreen
- [ ] Add viral moment prompt modal
- [ ] Add video editor to Dashboard (floating button)
- [ ] Add referral code input to signup
- [ ] Integrate haptics in food scanning
- [ ] Integrate haptics in AI chat

**Testing:**
- [ ] Test roast level 1-10 variations per coach
- [ ] Verify viral moment detection accuracy
- [ ] Test image generation quality
- [ ] Test video template generation
- [ ] Verify referral tracking works

---

### Phase 3: Social Features (Week 3-4)
**Goal:** Launch viral growth features publicly

**Tasks:**
- [ ] Create referral stats screen (show earned free months)
- [ ] Build roast leaderboard screen
- [ ] Add share tracking analytics
- [ ] Create roast stats dashboard
- [ ] Add "Featured Roasts" section
- [ ] Implement roast challenges

**Content Creation:**
- [ ] Create launch video showcasing roast mode
- [ ] Generate sample roast cards for marketing
- [ ] Prepare TikTok content strategy
- [ ] Create Instagram Reels templates

**Launch Marketing:**
- [ ] Soft launch to 10% of users
- [ ] A/B test roast templates
- [ ] Monitor viral metrics
- [ ] Iterate based on engagement

---

### Phase 4: Voice & Call Integration (Month 2)
**Goal:** Capture roasts from all interaction types

**Tasks:**
- [ ] Implement voice message roast capture
- [ ] Add voice recording UI in coach chat
- [ ] Integrate Whisper transcription
- [ ] Add phone call recording (with consent prompts)
- [ ] Implement call transcription pipeline
- [ ] Create audio waveform visuals for shares
- [ ] Add "trending sound" support for TikTok

**Testing:**
- [ ] Test transcription accuracy
- [ ] Verify audio quality for sharing
- [ ] Test consent flow for call recording

---

### Phase 5: Advanced Video Features (Month 3)
**Goal:** True CapCut parity with FFmpeg

**Tasks:**
- [ ] Integrate FFmpeg for video rendering
- [ ] Add background music library
- [ ] Implement scene transitions (smooth animations)
- [ ] Add video trimming/cutting tools
- [ ] Create 10+ video templates
- [ ] Add filters and effects
- [ ] Implement speed control (slow-mo, fast-forward)
- [ ] Add text animation editor

**Technical:**
- [ ] Choose FFmpeg implementation (device vs cloud)
- [ ] Optimize rendering performance
- [ ] Add video preview with scrubbing

---

### Phase 6: Scale & Optimize (Month 4+)
**Goal:** Optimize for exponential growth

**Tasks:**
- [ ] A/B test all templates for conversion
- [ ] Optimize image generation costs
- [ ] Add user-generated templates (advanced)
- [ ] Implement AI-powered template recommendations
- [ ] Add seasonal/holiday templates
- [ ] Create influencer partnership program
- [ ] Build viral analytics dashboard
- [ ] Implement cross-platform auto-posting

**Growth Targets:**
- 1.5+ viral coefficient (each share brings 1.5 signups)
- 50% of users create viral content weekly
- 10,000+ roast moments captured per month
- Featured in "AI coaches that roast you" media

---

## 11. KEY METRICS TO TRACK

### Viral Growth Metrics

**Referral System:**
- Total referral codes generated
- Referral signup rate (% who use codes)
- Referral conversion rate (% who subscribe)
- Average free months earned per user
- Viral coefficient (signups per user)

**Roast Mode:**
- % of users who try roast level 7+
- Viral moments captured per day
- Share rate (% who share roasts)
- Virality score per roast (shares × 10 + views)
- Top performing coaches for roasts
- Platform distribution (Instagram vs TikTok vs Twitter)

**Video Editor:**
- % of users who open video editor
- Video completion rate (% who finish generation)
- Video share rate (% who share after creating)
- Template popularity (which get used most)
- Average shares per video
- Views per video (tracked externally)

### User Engagement Metrics

**Overall:**
- Daily active users (DAU)
- Weekly active users (WAU)
- Monthly active users (MAU)
- Retention rate (Day 1, Day 7, Day 30)
- Session length
- Sessions per week

**Feature Usage:**
- Food logs per week per user
- Coach chat messages per week
- Fasting sessions per week
- Goal achievements per month
- Profile completeness

### Business Metrics

**Acquisition:**
- Signups per day
- Signup source (organic vs referral vs paid)
- Cost per acquisition (CPA)
- Activation rate (% who complete onboarding)

**Revenue:**
- Subscription conversion rate (free → paid)
- Average revenue per user (ARPU)
- Monthly recurring revenue (MRR)
- Churn rate
- Free months given via referrals (cost)

**Viral Efficiency:**
- Content creation rate (viral content per user per week)
- Share rate (% of created content that gets shared)
- Viral coefficient (each user brings X new users)
- Time to first share (after signup)

---

## 12. SECURITY & PRIVACY

### Data Protection

**Sensitive Data:**
- Health data (weight, food logs, fasting)
- Voice recordings
- Phone call recordings
- Personal information (name, email)

**Protection Measures:**
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Users can only access their own data
- ✅ HIPAA-compliant terminology (no medical terms)
- ✅ Secure authentication (Supabase Auth)
- ⚠️ Voice/call recordings require explicit consent (planned)
- ⚠️ Users can delete roast moments (planned)

**Privacy Controls:**
- Users control what gets shared publicly
- Opt-in for public leaderboards
- Transcripts never exposed publicly
- Audio files stored securely (Supabase Storage)

### Security Vulnerabilities

**Known Issues:**
- ⚠️ `food_analysis_slo_metrics` view uses SECURITY DEFINER (bypass RLS)
  - **Status:** SQL fix script created, manual execution needed
  - **File:** `/database/migrations/FIX_SECURITY_DEFINER.sql`
  - **Priority:** HIGH

**Best Practices:**
- Never commit API keys to git
- Use environment variables for all secrets
- Validate all user input
- Sanitize SQL queries (using Supabase client, not raw SQL)

---

## 13. TROUBLESHOOTING

### Common Issues

#### 1. Onboarding Stalling
**Symptom:** AI doesn't respond after user input

**Causes:**
- Field name mismatch (AI extracting different names than validation expects)
- Missing API key
- Network timeout

**Solution:**
- Check `/src/services/OnboardingAgentService.ts` field names match validation
- Verify `EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY` in .env
- Check logs in `expo.log` file

#### 2. Database "Column Not Found" Errors
**Symptom:** Error: `Could not find the 'X' column of 'profiles'`

**Causes:**
- Nutrition goals in wrong table (should be `user_settings`)
- Using wrong column name (e.g., `id` instead of `user_id`)

**Solution:**
- Split saves between `profiles` and `user_settings` tables
- Use `.eq('user_id', userId)` not `.eq('id', userId)`
- Reference `/src/services/ProfileService.ts` for correct patterns

#### 3. TypeScript Errors
**Note:** 50+ pre-existing TypeScript errors in codebase (not introduced by recent changes)

**Common Errors:**
- Missing type definitions
- Incompatible types
- Missing imports

**Status:** Pre-existing, not blocking functionality

#### 4. Image Generation Failures
**Symptom:** "Failed to generate image" error

**Causes:**
- Vibecode API rate limit
- Invalid prompt
- Missing project ID

**Solution:**
- Check `EXPO_PUBLIC_VIBECODE_PROJECT_ID` in .env
- Verify prompt is clear and detailed
- Check Vibecode API status

#### 5. Referral Tracking Not Working
**Symptom:** Referrals not showing up in database

**Causes:**
- RLS policies preventing access
- Database migration not run
- Anon key used instead of authenticated session

**Solution:**
- Run `/database/migrations/nano_banana_referral_system.sql`
- Ensure user is authenticated when tracking referral
- Check RLS policies allow insert on `referrals` table

---

## 14. TESTING CHECKLIST

### Pre-Launch Testing

**Authentication:**
- [ ] Signup flow works
- [ ] Login flow works
- [ ] Password reset works
- [ ] Session persists after app restart

**Onboarding:**
- [ ] Conversational onboarding completes
- [ ] All fields extracted correctly
- [ ] Photo capture works
- [ ] Welcome image generates
- [ ] Can reset onboarding via Developer Tools

**AI Coach:**
- [ ] All 7 coaches load correctly
- [ ] Chat messages send/receive
- [ ] Roast level affects responses (test 1, 5, 10)
- [ ] Context includes user's data
- [ ] Viral moments auto-detected

**Food Tracking:**
- [ ] Photo upload works
- [ ] AI analysis returns macros
- [ ] Food logs save to database
- [ ] Progress shows on dashboard

**Fasting:**
- [ ] Timer starts
- [ ] Timer counts correctly
- [ ] Timer completes
- [ ] Fasting sessions save

**Viral Features:**
- [ ] Referral code generates
- [ ] Image share button works (all 3 variants)
- [ ] Video editor opens
- [ ] Video templates display
- [ ] Video generation completes
- [ ] Share to social media works
- [ ] Roast capture saves to database
- [ ] Roast cards generate correctly

**Haptics:**
- [ ] Share button triggers haptics
- [ ] Video editor triggers haptics
- [ ] Success/error haptics work

---

## 15. DEPLOYMENT NOTES

### Vibecode Environment

**Managed by Vibecode:**
- ✅ Git repository
- ✅ Development server (port 8081)
- ✅ Expo configuration
- ✅ Build process

**Developer Responsibilities:**
- ❌ DO NOT manage git manually
- ❌ DO NOT modify port or server settings
- ❌ DO NOT touch Docker configuration
- ✅ Focus on feature implementation only

### Environment Variables

**Required in .env:**
```bash
# OpenAI
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=sk-proj-...

# Anthropic
EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY=sk-ant-...

# Grok
EXPO_PUBLIC_VIBECODE_GROK_API_KEY=xai-...

# Google Gemini
EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY=...

# Elevenlabs (optional)
EXPO_PUBLIC_VIBECODE_ELEVENLABS_API_KEY=...

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://...supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Vibecode Project ID
EXPO_PUBLIC_VIBECODE_PROJECT_ID=...
```

### Pre-Deployment Checklist

- [ ] All database migrations run successfully
- [ ] API keys verified and working
- [ ] RLS policies tested
- [ ] Error handling implemented
- [ ] User flows tested end-to-end
- [ ] Performance optimized (no memory leaks)
- [ ] Analytics tracking implemented
- [ ] Documentation up to date

---

## 16. SUPPORT & MAINTENANCE

### Documentation Locations

**User-Facing:**
- In-app onboarding (conversational)
- Coach personality descriptions (in-app)

**Developer:**
- `/TECHNICAL_SPECIFICATIONS.md` (this file)
- `/VIRAL_ROAST_MODE_GUIDE.md` (roast system)
- `/CAPCUT_STYLE_VIDEO_EDITOR.md` (video editor)
- `/VIRAL_GROWTH_IMPLEMENTATION.md` (image sharing)
- `/DEVELOPER_TOOLS_GUIDE.md` (dev tools)
- `/CLAUDE.md` (system instructions for AI)

### Key Contacts

**Development:**
- Vibecode System (automated)
- Claude Code (AI assistant)

**Database:**
- Supabase Dashboard: `https://lxajnrofkgpwdpodjvkm.supabase.co`

---

## 17. GLOSSARY

**NANO-BANANA:** Viral sharing system (user + coach + CTA images/videos)

**Roast Mode:** High-intensity coaching (levels 7-10) designed to create shareable content

**Viral Moment:** Auto-detected quotable roast worth sharing

**Roast Level:** 1-10 scale of coaching intensity (1=gentle, 10=maximum roast)

**Referral Code:** Unique user code (e.g., "MINDFK42") for earning free months

**Coach Personality:** Detailed behavioral profile for each AI coach (14 attributes)

**System Prompt:** Instructions given to AI defining coach behavior

**RLS:** Row Level Security (PostgreSQL security feature)

**Virality Score:** Calculated as (shares × 10 + views)

**BMR:** Basal Metabolic Rate (calories burned at rest)

**TDEE:** Total Daily Energy Expenditure (BMR × activity level)

**Macro:** Macronutrient (protein, carbs, fat)

---

## 18. VERSION HISTORY

**v2.0 - 2025-10-31 (Current)**
- Added complete viral growth system
- Integrated roast mode (levels 1-10)
- Added NANO-BANANA video editor (CapCut-style)
- Added viral roast capture system
- Updated Grok to latest model (grok-4-fast-non-reasoning)
- Added complete referral tracking
- Added developer tools screen
- Comprehensive documentation update

**v1.5 - 2025-10 (Previous)**
- 7 Coach personalities implemented
- Conversational onboarding with AI
- Food tracking with photo analysis
- Fasting timer
- Dashboard with progress tracking

**v1.0 - 2025-09**
- Initial release
- Basic authentication
- Simple onboarding
- Manual food logging

---

## 19. NOTES FOR AI ASSISTANTS

### Context Preservation

This document serves as the **single source of truth** for the MindFork app's technical implementation. It should be updated whenever:

1. New features are added
2. Architecture changes
3. Database schema changes
4. API integrations change
5. File structure changes
6. Implementation status changes

### Key Files to Reference

**When working on viral features:**
- Read: `/VIRAL_ROAST_MODE_GUIDE.md`
- Read: `/CAPCUT_STYLE_VIDEO_EDITOR.md`
- Check: Database migrations in `/database/migrations/`

**When working on AI coaches:**
- Read: `/src/data/coachPersonalities.ts` (detailed profiles)
- Read: `/src/services/RoastModeService.ts` (roast integration)
- Check: `/src/hooks/useAgentStream.ts` (chat implementation)

**When working on database:**
- Check: `/database/migrations/*.sql` (all migrations)
- Reference: Section 6 of this document (Database Schema)

**When adding new features:**
1. Update this document (Section 9: Implementation Status)
2. Create documentation in `/docs/` if needed
3. Update roadmap (Section 10)

### Important Reminders

- ❌ DO NOT install new packages with native code
- ✅ Use Bun, not npm
- ✅ Check `/CLAUDE.md` for coding style guidelines
- ✅ Always add haptic feedback to user interactions
- ✅ Ensure dark mode support
- ✅ Test on iOS (primary platform)
- ✅ Reference this document for architecture decisions

---

**END OF TECHNICAL SPECIFICATIONS**

*This document should be updated with each major development session to preserve context.*

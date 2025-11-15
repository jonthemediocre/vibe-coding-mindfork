# 🎨 MindFork - Comprehensive Figma Design Prompt

## 🎯 Project Overview

**App Name**: MindFork
**Tagline**: "AI-Powered Diet Coaching That Gets You"
**Platform**: iOS + Android (React Native)
**Core Value**: Emotional eating detection + dynamic personalization + AI coaching

---

## 🎨 Design System (Query Supabase for Latest)

### Color Palette
```sql
-- Get all color tokens
SELECT token_name, token_value, usage_description
FROM design_tokens
WHERE token_category = 'color'
ORDER BY token_name;
```

**Primary Brand Colors** (From App Icon & Assets):
- **Brand Pink**: `#F5A9C8` - Primary brand color from app icon
- **Brand Pink Dark**: `#E91E63` - CTAs, buttons, highlights
- **Brand Pink Light**: `#FCE4EC` - Backgrounds, subtle accents

**Accent Colors** (From Coach Avatars):
- **Accent Red**: `#FF5252` - High energy, alerts, Coach Decibel
- **Accent Teal**: `#4DD0E1` - Data visualization, Coach Aetheris
- **Accent Orange**: `#FFA726` - Achievements, streaks, warmth
- **Accent Purple**: `#9C27B0` - Premium features, special achievements

**Dark Mode Backgrounds**:
- **BG Primary**: `#121212` - Main app background (dark mode)
- **BG Secondary**: `#1E1E1E` - Card backgrounds, elevated surfaces
- **BG Tertiary**: `#2C2C2C` - Subtle elevation, borders

**Text Colors** (Dark Mode):
- **Text Primary**: `#FFFFFF` - High emphasis text on dark
- **Text Secondary**: `#B0B0B0` - Body text, descriptions
- **Text Tertiary**: `#808080` - Captions, timestamps

**Semantic Colors**:
- **Success Green**: `#22C55E`
- **Warning Yellow**: `#F59E0B`
- **Error Red**: `#EF4444`
- **Info Blue**: `#3B82F6`

### Typography
```sql
-- Get typography tokens
SELECT token_name, token_value, usage_description
FROM design_tokens
WHERE token_category = 'typography'
ORDER BY token_name;
```

**Font Family**: System font (San Francisco iOS, Roboto Android)
**Font Sizes**:
- `text_xs`: 12px - Captions, timestamps
- `text_sm`: 14px - Body text, labels
- `text_base`: 16px - Default body
- `text_lg`: 18px - Subheadings
- `text_xl`: 20px - Section headers
- `text_2xl`: 24px - Page titles
- `text_3xl`: 30px - Hero text
- `text_4xl`: 36px - Display text

**Font Weights**:
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

### Spacing System
```sql
-- Get spacing tokens
SELECT token_name, token_value, usage_description
FROM design_tokens
WHERE token_category = 'spacing'
ORDER BY token_name;
```

**Scale**: 4px base unit
- `space_1`: 4px
- `space_2`: 8px
- `space_3`: 12px
- `space_4`: 16px
- `space_5`: 20px
- `space_6`: 24px
- `space_8`: 32px
- `space_10`: 40px
- `space_12`: 48px
- `space_16`: 64px

### Border Radius
- `radius_sm`: 4px - Small elements
- `radius_base`: 8px - Cards, buttons
- `radius_lg`: 12px - Modals
- `radius_xl`: 16px - Hero cards
- `radius_2xl`: 24px - Bottom sheets
- `radius_full`: 9999px - Pills, avatars

### Shadows
```sql
-- Get shadow tokens
SELECT token_name, token_value, usage_description
FROM design_tokens
WHERE token_category = 'shadow'
ORDER BY token_name;
```

- `shadow_sm`: Subtle elevation (1-2dp)
- `shadow_base`: Default cards (4-8dp)
- `shadow_lg`: Modals, overlays (16-24dp)
- `shadow_xl`: Hero elements (32dp)

---

## 🎭 Brand Assets (Query for Images)

### Coach Personas (5 AI Personalities)
```sql
-- Get all coach avatars
SELECT asset_name, file_url, alt_text, usage_notes
FROM brand_assets
WHERE asset_category = 'coach_persona'
ORDER BY asset_name;
```

**Coach 1: Decibel** (Pink/Red Rooster)
- **Personality**: High-energy motivator, loud, celebratory
- **Voice**: "LET'S GO! YOU'RE CRUSHING IT!"
- **Usage**: Users who want drill sergeant style motivation
- **File**: Query `file_url` for path

**Coach 2: Synapse** (Skull with Brain Fruits)
- **Personality**: Science-based, roast mode, tough love
- **Voice**: "Let me show you what the data ACTUALLY says..."
- **Usage**: Users who want accountability and facts
- **File**: Query `file_url` for path

**Coach 3: Veloura** (Blonde Duck with Heart)
- **Personality**: Empathetic supporter, emotional eating expert
- **Voice**: "I see you. How are you feeling right now?"
- **Usage**: Users struggling with emotional eating
- **File**: Query `file_url` for path

**Coach 4: Verdant** (Bird with Vegetable Binoculars)
- **Personality**: Plant-based expert, vegan focus
- **Voice**: "Check out these plant-powered nutrition wins!"
- **Usage**: Vegan/vegetarian users
- **File**: Query `file_url` for path

**Coach 5: Aetheris** (Cyberpunk Cat)
- **Personality**: Analytical data geek, quantified self
- **Voice**: "Let me show you the trends..."
- **Usage**: Engineers, scientists, data-driven users
- **File**: Query `file_url` for path

### Food Quality Badges (5 Tiers)
```sql
-- Get food quality badges
SELECT asset_name, file_url, alt_text, usage_notes
FROM brand_assets
WHERE asset_category = 'food_quality_rating'
ORDER BY asset_name;
```

**Badge Tier System**:
1. **Pink Fire** 🔥 - ELITE (high protein/fiber, low sugar)
2. **Green Leaf** 🍃 - GOOD (solid nutrition)
3. **Yellow Caution** ⚠️ - WATCH IT (portion control needed)
4. **Red Bomb** 💣 - HEAVY (triggers mood check-in)
5. **Grey Soot** 🌫️ - WORST (supportive intervention)

### Logos
```sql
-- Get logo variations
SELECT asset_name, file_url, alt_text, usage_notes
FROM brand_assets
WHERE asset_category IN ('primary_logo', 'logo')
ORDER BY asset_name;
```

- **Full Logo**: MindFork wordmark + icon
- **Icon Only**: MF brain icon
- **Visual Logo**: Brain + fork imagery (playful)

---

## 🎨 Brand Voice Guidelines

```sql
-- Get brand voice rules
SELECT guideline_name, guideline_text, example_dos, example_donts
FROM brand_voice_guidelines
ORDER BY guideline_name;
```

### Core Principles:
1. **Supportive, Never Shaming** - "I see you logged pizza. How are you feeling?" NOT "Why did you eat that?"
2. **Science-Backed** - Reference research, use precise language
3. **Playful but Mature** - Fun without being childish
4. **Empathetic** - Acknowledge emotional challenges
5. **Growth-Oriented** - Focus on progress, not perfection

### Tone Examples:
- **Achievement**: "5-day streak! You're building real momentum 🔥"
- **Error State**: "Couldn't load that. Let me try again for you."
- **Supportive Intervention**: "I noticed you logged dessert after a stressful meeting. Want to talk about it?"
- **Roast Mode** (opt-in): "You said you wanted accountability. Logging 3 donuts at 11pm wasn't in the plan..."

---

## 📱 Key Screens to Design

### 1. **Onboarding Flow** (5-7 screens)
**Goal**: Capture user traits for personalization

Screens:
1. Welcome splash (logo animation)
2. Goal selection (lose weight / build muscle / health maintenance / performance)
3. Diet preferences (omnivore / vegetarian / vegan / keto / paleo / IF)
4. Personality type (motivated / needs accountability / empathetic / data-driven)
5. Emotional eating assessment (yes/no, triggers)
6. Ethics & values (carbon footprint / animal welfare / health optimization)
7. Coach selection (show 5 personas, pick one)

**Design Notes**:
- Use full-bleed imagery
- Progress indicator at top
- Skip option for non-critical questions
- Coach persona cards with animations

### 2. **Dynamic Home Screen** (Server-Driven UI)
```sql
-- Example: Get home layout for a user
SELECT select_ui_layout('USER_ID', 'home');
```

**Component Variations Based on User Traits**:

**Vegan User Sees**:
- Carbon Savings Card (top)
- Plant-Based Protein Progress
- Vegan Recipe Suggestions
- Coach Verdant avatar

**Muscle Builder Sees**:
- Protein Progress Bar (top)
- Hypertrophy Goal Tracker
- Macro Breakdown Chart
- Coach Decibel avatar

**IF User Sees**:
- Fasting Timer (top)
- Eating Window Countdown
- Autophagy Progress
- Coach Aetheris avatar

**Emotional Eater Sees**:
- Mood Check-In Prompt (top)
- Emotional Eating Streak
- Coping Strategy Suggestions
- Coach Veloura avatar

**Design Notes**:
- Modular card system
- Cards can reorder based on priority
- Hero card (top) always personalized
- Bottom nav: Home / Log / Coach / Profile

### 3. **Food Logging Screen**
**Flow**: Camera → AI Analysis → Confirm/Edit → Mood Check-In (if triggered)

**Screens**:
1. Camera view with flash toggle, flip camera, gallery button
2. AI analyzing (loading animation with copy: "Analyzing nutrition...")
3. Food entry card with:
   - Photo thumbnail
   - Food name (editable)
   - Calories, macros (editable)
   - Quality badge (Pink Fire / Green / Yellow / Red / Grey)
   - Portion size selector
   - "Looks good" / "Edit details" buttons
4. Mood check-in modal (if heavy/soot food detected):
   - "How are you feeling?" with emoji slider
   - "What triggered this?" with quick options
   - "Want to talk about it?" with coach chat CTA

**Design Notes**:
- Native camera UI (iOS style)
- Quality badge prominent
- Supportive messaging for soot-tier foods
- No shame, just awareness

### 4. **Mood Check-In Modal** (Emotional Eating Detection)
**Triggers**: Before/after meals, soot/heavy foods, user request

**Elements**:
- Title: "Quick Check-In"
- Emoji sliders (5 emotions):
  - 😊 Happy → 😢 Sad
  - 😌 Calm → 😰 Anxious
  - 💪 Energized → 😴 Tired
  - 🎯 Focused → 😵 Scattered
  - 🙏 Satisfied → 😋 Craving
- "What's happening?" quick tags (stressed / bored / celebrating / social / habitual)
- "Skip" / "Submit" buttons
- Coach avatar in corner with supportive message

**Design Notes**:
- Modal covers 80% screen
- Swipe down to dismiss
- Haptic feedback on slider interaction
- Animate coach avatar reaction

### 5. **Coach Chat Screen**
**Layout**: Standard chat interface with AI personality

**Elements**:
- Header: Coach avatar + name + status ("Online", "Analyzing...")
- Message bubbles:
  - User messages: Right-aligned, pink bubble
  - Coach messages: Left-aligned, dark purple bubble
  - System messages: Center-aligned, grey text
- Input bar:
  - Text input
  - Voice input button (microphone)
  - Send button
- Quick reply chips above input (context-aware)
- "Call Coach" button in header (voice call feature)

**Coach Message Variations**:
- Text with emoji
- Charts/graphs (inline)
- Food recommendations (cards)
- Achievement unlocks (animated)
- Supportive interventions (highlighted)

**Design Notes**:
- Smooth scroll
- Typing indicator (3 dots)
- Read receipts
- Coach avatar animates when speaking

### 6. **Profile & Settings Screen**
**Layout**: Standard iOS settings style

**Sections**:
1. User Info:
   - Avatar (editable)
   - Name, email
   - Current level & XP bar
2. My Coach:
   - Current coach avatar
   - "Switch Coach" button
   - Coaching style toggle (supportive / roast mode)
3. Personalization:
   - Diet preferences (editable)
   - Goals (editable)
   - Emotional eating support (on/off)
4. Subscription:
   - Current tier (Free / Premium / Pro)
   - Usage stats (daily food logs left)
   - "Upgrade" button
5. App Settings:
   - Notifications
   - Units (metric/imperial)
   - Dark mode (toggle)
   - Data & Privacy

**Design Notes**:
- Clean, iOS-native style
- Green checkmarks for active features
- Lock icons for premium features
- Smooth tier upgrade flow

### 7. **Achievements & Gamification Screen**
**Layout**: Game-like achievement wall

**Elements**:
- XP progress bar (top):
  - Current level
  - XP to next level
  - Total XP earned
- Achievement grid (3 columns):
  - Locked achievements (greyed out)
  - Unlocked achievements (colorful badges)
  - In-progress achievements (progress bar)
- Tabs: All / Nutrition / Streaks / Milestones
- Recent unlocks section (top):
  - Latest 3 achievements
  - Animated reveal on unlock

**Achievement Badge Examples**:
- Pink Fire Streak (5 elite days)
- Brain Smart (100 complete logs)
- Phoenix Rising (recovered from soot food)
- 30-Day Warrior (30-day streak)
- Macro Master (hit macros 7 days straight)

**Design Notes**:
- Parallax scroll effect
- Particle animation on unlock
- Haptic feedback
- Share achievement button

### 8. **Weekly Report Screen**
**Layout**: Scrollable dashboard with cards

**Cards**:
1. Hero stat (largest card):
   - Personalized metric (e.g., "Carbon Saved: 12 lbs CO2" for vegans)
   - Progress vs last week
2. Emotional Eating Insights:
   - Detection events count
   - Most common trigger
   - Success rate (recovered meals)
   - Trend graph
3. Nutrition Quality:
   - Food quality breakdown (% elite/good/caution/heavy/soot)
   - Average quality score
   - Trend line
4. Consistency:
   - Logging streak
   - Days hit goal
   - Best day of week
5. Coach Message:
   - Personalized weekly summary
   - Recommendations for next week

**Design Notes**:
- Confetti animation on load if good week
- Shareable report (screenshot)
- "Let's talk about it" button → coach chat

---

## 🎨 Component Library (Build in Figma)

### Buttons
```
Primary Button:
- Background: Brand Pink Dark (#E91E63)
- Text: White, Semibold, 16px
- Padding: 16px 24px
- Border Radius: 12px
- Shadow: shadow_base
- States: Default, Pressed (#C2185B darker), Disabled (#424242 grey)

Secondary Button:
- Background: Transparent
- Border: 2px solid #E91E63
- Text: Brand Pink (#F5A9C8), Semibold, 16px
- Padding: 16px 24px
- Border Radius: 12px

Text Button:
- Background: None
- Text: Pink, Medium, 14px
- Underline on press
```

### Cards
```
Default Card:
- Background: Card Dark (#1f1635)
- Border Radius: 12px
- Padding: 16px
- Shadow: shadow_base
- Border: 1px solid #2a1f40

Hero Card (larger):
- Background: Gradient (Deep Purple → Card Dark)
- Border Radius: 16px
- Padding: 24px
- Shadow: shadow_lg
```

### Input Fields
```
Text Input:
- Background: #0f0a1e
- Border: 1px solid #2a1f40
- Border Radius: 8px
- Padding: 12px 16px
- Text: White, 16px
- Placeholder: #B0A8CC
- Focus: Border changes to Brand Pink

Search Input:
- Same as text input
- Icon: Magnifying glass (left)
- Clear button (right, appears when typing)
```

### Modals & Bottom Sheets
```
Modal Overlay:
- Background: rgba(0, 0, 0, 0.7)
- Backdrop blur: 8px

Bottom Sheet:
- Background: Card Dark
- Border Radius: 24px (top corners only)
- Handle: 40px wide, 4px tall, centered, grey
- Padding: 24px
- Shadow: shadow_xl
- Animation: Slide up from bottom
```

### Badges & Pills
```
Quality Badge (5 variants):
- Size: 32px × 32px
- Border Radius: 8px
- Icon: Query from brand_assets
- Background: Transparent with colored border

XP Badge:
- Background: Orange gradient
- Text: White, Bold, 12px
- Border Radius: 16px (pill)
- Padding: 4px 12px

Streak Badge:
- Background: Brand Pink
- Icon: Fire emoji or flame icon
- Text: White, Bold, 14px
- Border Radius: 12px
- Padding: 8px 12px
```

### Progress Bars
```
XP Progress Bar:
- Height: 8px
- Background: #2a1f40
- Fill: Gradient (Pink → Orange)
- Border Radius: 4px
- Animation: Smooth fill on load

Macro Progress (Circular):
- Size: 120px diameter
- Stroke Width: 12px
- Background Stroke: #2a1f40
- Fill Stroke: Green (protein), Pink (carbs), Orange (fat)
- Text Center: Value + unit
```

### Charts & Graphs
```
Line Chart (Emotional Eating Trend):
- Background: Transparent
- Line: Brand Pink, 3px
- Gradient Fill: Pink (50% opacity) to transparent
- Grid Lines: #2a1f40
- Labels: Text Secondary

Bar Chart (Food Quality Breakdown):
- Bar Background: #2a1f40
- Bar Fill: Color-coded (Pink/Green/Yellow/Red/Grey)
- Border Radius: 4px (top)
- Labels: Below each bar
```

---

## 🎯 Interaction Patterns

### Animations
- **Loading**: Skeleton screens with shimmer effect
- **Success**: Confetti burst + haptic feedback
- **Error**: Shake animation + red highlight
- **Achievement Unlock**: Modal slide up + particle effect
- **Coach Reaction**: Avatar bounce + emotion change
- **Streak Milestone**: Fire icon grows + sparkles

### Gestures
- **Swipe Right on Food Entry**: Quick delete
- **Swipe Left on Food Entry**: Quick edit
- **Pull Down on Home**: Refresh
- **Long Press on Badge**: See details
- **Swipe Up on Bottom Sheet**: Expand to full screen

### Haptics (iOS)
- Button tap: Light impact
- Achievement unlock: Success notification
- Error: Error notification
- Streak milestone: Heavy impact
- Quality badge reveal: Medium impact

---

## 📊 Dynamic Personalization Examples

### Query User Traits
```sql
-- Get all traits for a user
SELECT trait_key, trait_value, confidence
FROM user_traits
WHERE user_id = 'USER_ID'
ORDER BY trait_key;
```

### Example User Profiles

**Profile 1: Sarah (Vegan, Carbon-Conscious)**
```json
{
  "diet_type": "vegan",
  "goal_primary": "health_maintenance",
  "ethics_carbon": "high",
  "personality_type": "empathetic",
  "emotional_eating_risk": "medium"
}
```
**Sarah's Home Screen Shows**:
- Carbon Savings Card (hero)
- Plant-Based Protein Tracker
- Vegan Recipe Carousel
- Coach Verdant avatar
- Green color accents

**Profile 2: Mike (Muscle Builder, Data-Driven)**
```json
{
  "diet_type": "omnivore",
  "goal_primary": "hypertrophy",
  "ethics_carbon": "low",
  "personality_type": "analytical",
  "learning_style": "data_driven"
}
```
**Mike's Home Screen Shows**:
- Protein Progress Bar (hero)
- Hypertrophy Goal Tracker
- Macro Breakdown Chart
- Coach Aetheris avatar
- Blue color accents for data viz

**Profile 3: Emma (Weight Loss, Emotional Eater)**
```json
{
  "diet_type": "omnivore",
  "goal_primary": "fat_loss",
  "emotional_eating_risk": "high",
  "personality_type": "empathetic",
  "needs_support": "high"
}
```
**Emma's Home Screen Shows**:
- Mood Check-In Prompt (hero)
- Emotional Eating Streak
- Coping Strategy Cards
- Coach Veloura avatar
- Pink color accents (warm, supportive)

---

## 🎨 Figma File Structure (Recommended)

```
MindFork.fig
│
├── 📄 Cover Page
│   ├── Project overview
│   └── Design system snapshot
│
├── 🎨 Design System
│   ├── Colors (all tokens)
│   ├── Typography (scale + examples)
│   ├── Spacing (visual scale)
│   ├── Shadows (elevation examples)
│   ├── Border Radius (examples)
│   └── Icons (system icons + custom)
│
├── 🎭 Brand Assets
│   ├── Logos (all variations)
│   ├── Coach Personas (5 avatars + bios)
│   ├── Food Quality Badges (5 tiers)
│   └── Achievement Badges (grid)
│
├── 🧩 Components
│   ├── Buttons (all states)
│   ├── Cards (all types)
│   ├── Input Fields (all types)
│   ├── Modals & Bottom Sheets
│   ├── Badges & Pills
│   ├── Progress Bars
│   ├── Charts & Graphs
│   └── Navigation (tab bar, header)
│
├── 📱 Screens - Onboarding
│   ├── 1. Splash
│   ├── 2. Goal Selection
│   ├── 3. Diet Preferences
│   ├── 4. Personality Type
│   ├── 5. Emotional Eating Assessment
│   ├── 6. Ethics & Values
│   └── 7. Coach Selection
│
├── 📱 Screens - Home (Dynamic Layouts)
│   ├── Home - Vegan User
│   ├── Home - Muscle Builder
│   ├── Home - IF User
│   └── Home - Emotional Eater
│
├── 📱 Screens - Food Logging
│   ├── 1. Camera View
│   ├── 2. AI Analyzing
│   ├── 3. Food Entry Card
│   └── 4. Mood Check-In Modal
│
├── 📱 Screens - Coach Chat
│   ├── Chat Interface
│   ├── Voice Call Interface
│   └── Message Variations
│
├── 📱 Screens - Profile
│   ├── Profile Overview
│   ├── Coach Settings
│   ├── Subscription Page
│   └── App Settings
│
├── 📱 Screens - Achievements
│   ├── Achievement Wall
│   ├── Unlock Animation
│   └── Achievement Details
│
├── 📱 Screens - Weekly Report
│   └── Report Dashboard
│
└── 🎬 Prototyping
    ├── Onboarding Flow
    ├── Food Logging Flow
    ├── Emotional Eating Intervention
    └── Coach Interaction Flow
```

---

## 🚀 Implementation Notes for Figma AI

### Auto-Layout Rules
1. **Cards**: Auto-layout vertical, 16px gap, hug contents
2. **Button Groups**: Auto-layout horizontal, 12px gap, fill container
3. **List Items**: Auto-layout vertical, 8px gap, fill container
4. **Screen Padding**: 20px horizontal, 24px top, 32px bottom (safe area)

### Responsive Behavior
- **iPhone SE**: 375px width (minimum)
- **iPhone Pro**: 393px width (common)
- **iPhone Pro Max**: 430px width (maximum)
- **Android**: 360px-420px (test breakpoints)

### Component Variants
- **Button**: Default, Pressed, Disabled
- **Input**: Empty, Filled, Focused, Error
- **Card**: Default, Selected, Disabled
- **Coach Avatar**: 5 personalities × 3 moods (happy/neutral/concerned)
- **Quality Badge**: 5 tiers

### Dark Mode Only
This app uses dark mode exclusively. No light mode needed.

---

## 📞 Supabase Asset Queries (Copy-Paste Ready)

```sql
-- Get ALL design tokens (colors, typography, spacing, shadows)
SELECT * FROM design_tokens ORDER BY token_category, token_name;

-- Get ALL brand assets (coaches, badges, logos)
SELECT * FROM brand_assets ORDER BY asset_category, asset_name;

-- Get coach personas specifically
SELECT asset_name, file_url, alt_text, usage_notes
FROM brand_assets
WHERE asset_category = 'coach_persona'
ORDER BY asset_name;

-- Get food quality badges
SELECT asset_name, file_url, alt_text, usage_notes
FROM brand_assets
WHERE asset_category = 'food_quality_rating'
ORDER BY asset_name;

-- Get brand voice guidelines
SELECT guideline_name, guideline_text, example_dos, example_donts
FROM brand_voice_guidelines
ORDER BY guideline_name;

-- Get example UI layout for home screen
SELECT select_ui_layout('SAMPLE_USER_ID', 'home');

-- Get personalization rules (to understand dynamic UI logic)
SELECT name, priority, predicate, effects
FROM personalization_rules
WHERE active = TRUE
ORDER BY priority;
```

---

## ✅ Checklist for Figma AI

Before you start designing:
- [ ] Query Supabase for latest design tokens
- [ ] Download all coach persona images from brand_assets
- [ ] Download all food quality badge images
- [ ] Review brand voice guidelines
- [ ] Understand dynamic UI system (different layouts per user type)
- [ ] Note: Dark mode only, no light mode
- [ ] Platform: iOS primary, Android secondary (design for iOS first)

Design priorities:
1. **Emotional Eating Detection Flow** (competitive moat!)
2. **Dynamic Home Layouts** (3-4 variants for different user types)
3. **Coach Chat Interface** (with 5 personality variations)
4. **Food Logging with Quality Badges**
5. **Achievement & Gamification System**

---

## 🎯 Final Design Principles

1. **Supportive, Not Shaming** - Every screen should feel encouraging
2. **Data-Driven** - Show insights, trends, and progress
3. **Personalized** - Different users see different interfaces
4. **Gamified** - Achievements, streaks, levels visible throughout
5. **Coach-First** - AI coach is central to experience (always visible)
6. **Mobile-Native** - Use platform conventions (iOS Human Interface Guidelines)
7. **Accessible** - High contrast, large touch targets, clear labels
8. **Dark Mode Optimized** - Dark backgrounds, vibrant highlights

---

**Database Connection** (for queries):
```
Host: db.lxajnrofkgpwdpodjvkm.supabase.co
Database: postgres
Port: 5432
User: postgres
```

**Start by querying**:
```sql
SELECT * FROM design_tokens;
SELECT * FROM brand_assets;
SELECT * FROM brand_voice_guidelines;
```

Then design the **Emotional Eating Detection Flow** first - it's the competitive moat! 🎨🚀

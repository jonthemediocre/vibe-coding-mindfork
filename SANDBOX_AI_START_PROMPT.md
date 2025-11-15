# 🚀 Start Here: MindFork Development Guide

## ⚡ Quick Start (3 Steps)

### Step 1: Read Project Configuration
```sql
-- Connect to database
-- Host: db.lxajnrofkgpwdpodjvkm.supabase.co
-- Database: postgres
-- User: postgres

-- Get the Quick Start guide
SELECT content FROM project_documentation WHERE doc_key = 'quick_start_index';
```

### Step 2: Read Coding Guidelines
```sql
-- Get coding specifications
SELECT content FROM project_documentation WHERE doc_key = 'claude_md';

-- Get development principles (CRITICAL!)
SELECT content FROM project_documentation WHERE doc_key = 'agents_md';
```

### Step 3: Browse Implementation Guides
```sql
-- See all available guides
SELECT guide_name, priority, target_feature, tables_involved
FROM ai_implementation_guides
ORDER BY priority;

-- Get detailed guide for feature you're building
SELECT step_by_step_guide, code_examples, ux_flow_description, test_scenarios
FROM ai_implementation_guides
WHERE guide_name = 'emotional_eating_detection_system'; -- or other feature
```

---

## ✅ Schema Status: COMPLETE (146 Tables!)

**All tables exist and are deployed!** Don't try to create them.

### Core Tables (Verified ✅):
- ✅ `food_entries` - Complete nutrition tracking (26 columns)
- ✅ `mood_check_ins` - Emotional state tracking (18 columns)
- ✅ `cravings` - Craving intervention (21 columns)
- ✅ `dopamine_triggers` - Micro-rewards (15 columns)
- ✅ `ai_predictions` - RLHF feedback loop
- ✅ `user_traits` - Personalization traits
- ✅ `personalization_rules` - Rules engine
- ✅ `user_achievements` - Badges & achievements
- ✅ `brand_assets` - Coach avatars, logos (17 assets)
- ✅ `project_documentation` - This document & guides!

### Quick Schema Check:
```sql
-- Verify a table exists before querying
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'mood_check_ins'
); -- Returns true

-- See all 146 tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

---

## 🎯 What To Build (Client-Side Only!)

**Important**: Schema is complete. You only need to build React Native UI/UX.

### Available Features to Implement:

1. **Food Logging with Photo** ⭐⭐⭐⭐⭐
   ```sql
   SELECT * FROM ai_implementation_guides WHERE guide_name = 'food_logging_with_photo';
   ```
   - Camera screen
   - AI vision analysis
   - Barcode scanning
   - Manual entry form

2. **Emotional Eating Detection** ⭐⭐⭐⭐⭐ (COMPETITIVE MOAT!)
   ```sql
   SELECT * FROM ai_implementation_guides WHERE guide_name = 'emotional_eating_detection_system';
   ```
   - Mood check-in modal (before/after meals)
   - Detection algorithm (4 rules)
   - AI supportive intervention
   - Weekly report

3. **Dynamic Personalization** ⭐⭐⭐⭐⭐
   ```sql
   SELECT * FROM ai_implementation_guides WHERE guide_name = 'dynamic_personalization_system';
   ```
   - Server-driven UI rendering
   - Vegan → carbon card
   - Muscle builder → protein card
   - IF user → fasting timer

4. **Habit Stack Formation** ⭐⭐⭐⭐
   ```sql
   SELECT * FROM ai_implementation_guides WHERE guide_name = 'habit_stack_formation';
   ```
   - Implementation intentions UI
   - Completion tracking
   - Streak visualization

5. **AI Phone Coaching** ⭐⭐⭐⭐
   ```sql
   SELECT * FROM ai_implementation_guides WHERE guide_name = 'ai_phone_call_coaching';
   ```
   - Real-time transcription
   - Voice coaching interface
   - SMS threading

---

## 🎨 Brand Assets Available

### Coach Personas (5 AI personalities):
```sql
SELECT asset_name, alt_text, usage_notes
FROM brand_assets
WHERE asset_category = 'coach_persona';
```

**Results**:
1. **Coach Decibel** - High-energy motivator (loud, celebratory)
2. **Coach Synapse** - Science-based roast mode (tough love)
3. **Coach Veloura** - Empathetic supporter (emotional eating expert)
4. **Coach Verdant** - Plant-based expert (vegan focus)
5. **Coach Aetheris** - Analytical data geek (quantified self)

### Food Quality Badges (5 tiers):
```sql
SELECT asset_name, alt_text, usage_notes
FROM brand_assets
WHERE asset_category = 'food_quality_rating';
```

**Results**:
- 🔥 Pink Fire - ELITE (high protein/fiber, low sugar)
- 🍃 Green Leaf - GOOD (solid nutrition)
- ⚠️ Yellow Caution - WATCH IT (portion control)
- 💣 Red Bomb - HEAVY (triggers check-in)
- 🌫️ Grey Soot - WORST (supportive intervention)

### Design Tokens (38 tokens):
```sql
SELECT token_name, token_value, usage_description
FROM design_tokens
WHERE token_category = 'color'
ORDER BY token_name;
```

**Primary Colors**: Pink (#FF69B4), Dark backgrounds, Green accents

---

## 🚫 Critical Rules (READ THIS!)

### DO NOT:
1. ❌ Create new database tables (all 146 exist!)
2. ❌ Modify database schema (ONLY human can do this)
3. ❌ Deprecate existing code without approval
4. ❌ Simplify sophisticated code to "fix" it
5. ❌ Use apostrophes (') in single-quoted strings (use double quotes)
6. ❌ Install new packages (all needed packages pre-installed)
7. ❌ Manage git or dev server

### DO:
1. ✅ Query `project_documentation` first
2. ✅ Query `ai_implementation_guides` before building
3. ✅ Use server-driven UI: `select_ui_layout(user_id, area)`
4. ✅ Fetch user traits for personalization
5. ✅ Use brand voice: supportive, never shaming
6. ✅ Build React Native UI only (Expo SDK 53, RN 0.76.7)
7. ✅ Use Zustand + AsyncStorage for state
8. ✅ Use Nativewind + Tailwind v3 for styling

---

## 💡 Example Workflow

### Building Emotional Eating Detection:

```typescript
// Step 1: Get the implementation guide
const guide = await supabase
  .from('ai_implementation_guides')
  .select('*')
  .eq('guide_name', 'emotional_eating_detection_system')
  .single();

// Step 2: Check if mood_check_ins table exists (it does!)
const { data } = await supabase
  .from('mood_check_ins')
  .select('*')
  .limit(1);
// ✅ Table exists, proceed!

// Step 3: Build the UI following the guide's step_by_step_guide
// - Mood check-in modal with emoji sliders
// - Detection algorithm (code in guide!)
// - AI intervention with supportive tone
// - Feedback collection

// Step 4: Test against scenarios in guide.test_scenarios
```

---

## 🎯 Success Metrics

Each implementation guide includes success metrics. For example:

**Emotional Eating Detection**:
- Detection accuracy >70%
- >50% users report interventions helpful
- <5% users find interventions intrusive
- 30% reduction in emotional eating episodes (90 days)

**Dynamic Personalization**:
- >80% users have ≥3 traits captured
- Personalized users have 2x engagement vs baseline
- 90%+ users see only relevant features

---

## 📞 Getting Help

If you're stuck:

1. **Re-query the implementation guide** - it has complete working code!
2. **Check brand_assets** - all coach personas, badges, colors are there
3. **Query project_documentation** - coding specs, environment details
4. **Verify table exists** - don't assume it's missing, check first!

```sql
-- Check if a table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'your_table_name'
);
```

---

## 🚀 Ready to Build!

**Database**: ✅ Complete (146 tables)
**Assets**: ✅ Seeded (17 assets)
**Guides**: ✅ Available (4+ comprehensive guides)
**Your Task**: Build beautiful React Native UI that leverages this world-class backend!

**Start with this query**:
```sql
SELECT * FROM ai_implementation_guides WHERE priority = 'critical' ORDER BY guide_name;
```

Then pick a feature and start building! 🎉

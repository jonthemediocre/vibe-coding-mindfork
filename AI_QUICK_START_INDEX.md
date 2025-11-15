# 🚀 AI AGENT QUICK START - READ THIS FIRST

**Date**: 2025-11-03
**Purpose**: Index for AI agents building MindFork features
**Critical**: Read this BEFORE starting any work!

---

## 🎯 NORTH STAR: Query Supabase for Implementation Guides

**ALL implementation instructions are stored IN Supabase** in the `ai_implementation_guides` table.

### How to Access (Priority #1):
```sql
-- Get all guides
SELECT * FROM ai_implementation_guides
ORDER BY priority;

-- Get critical guides
SELECT * FROM ai_implementation_guides
WHERE priority = 'critical'
ORDER BY guide_name;

-- Get guides for specific feature
SELECT * FROM ai_implementation_guides
WHERE target_feature ILIKE '%food%'
  OR guide_name ILIKE '%food%';
```

### Why This Matters:
- ✅ Guides include **complete working code** (TypeScript + SQL)
- ✅ **UX flows** documented step-by-step
- ✅ **Tables involved** listed
- ✅ **Test scenarios** provided
- ✅ **Success metrics** defined
- ✅ **Common mistakes** to avoid
- ✅ **AI tips** for best implementation

**DO NOT GUESS** - Query the guides first!

---

## 📊 Schema Overview (147 Tables!)

MindFork has a **comprehensive world-class schema** with 147+ tables across 8 systems:

### 1. Core User & Food (10 tables)
- `profiles` - User demographics, goals, TDEE settings
- `food_entries` - Complete nutrition tracking (26 columns!)
- `weight_history` - Progress tracking
- `water_intake` - Hydration
- `step_tracking` - Activity

### 2. AI Infrastructure (15 tables)
- `ai_predictions` - RLHF feedback loop
- `ai_knowledge_sources` - RAG grounding
- `ai_embeddings` - Vector search
- `ai_context_cache` - <10ms context retrieval
- `ai_training_datasets` - Fine-tuning pipeline
- `ai_implementation_guides` - **YOUR NORTH STAR!**

### 3. Psychology & Behavior (8 tables)
- `mood_check_ins` - Emotional state (OUR MOAT!)
- `cravings` - Predictive intervention
- `thought_records` - CBT methodology
- `habit_stacks` - Implementation intentions
- `habit_completions` - Execution tracking
- `lapses` - Relapse prevention

### 4. AI Communication (14 tables)
- `phone_calls` - Complete call lifecycle
- `sms_messages` - SMS threading
- `ai_episodic_memory` - Long-term memory
- `learned_user_preferences` - AI learns over time
- `dopamine_triggers` - Micro-rewards
- `variable_rewards` - Unpredictable reinforcement
- `engagement_hooks` - Re-engagement system

### 5. Gamification & Subscriptions (16 tables)
- `user_xp_levels` - XP/leveling system
- `user_achievements` - Badges & achievements
- `achievement_definitions` - 50+ achievements
- `subscription_tiers` - Free/Premium/Pro
- `user_subscriptions` - Payment & trials
- `subscription_usage_limits` - Freemium enforcement
- `referral_rewards` - Viral growth
- `time_based_unlocks` - Day 7/30/90 celebrations

### 6. Dynamic Personalization (9 tables)
- `user_traits` - Diet type, goals, ethics
- `user_features` - Feature flags & A/B tests
- `personalization_rules` - Rules engine
- `ui_layouts` - Server-driven UI
- `ui_components` - Component registry
- `user_environmental_metrics` - Carbon tracking (vegans)

### 7. Math & Computed Metrics (5 SQL functions + 2 tables)
- `compute_tdee()` - Calculate daily calorie needs
- `project_weight_trajectory()` - 30-day weight prediction
- `calculate_satiety_score()` - How filling is this food?
- `calculate_adherence_score()` - Daily adherence (0-1)
- `calculate_habit_strength()` - Exponential habit model
- `daily_metrics` - Comprehensive daily performance
- `k_factor_metrics` - Viral growth tracking

### 8. Brand & Design System (4 tables)
- `brand_assets` - Logos, coach images, icons
- `design_tokens` - Colors, typography, spacing (38 tokens!)
- `brand_voice_guidelines` - Supportive/roast tone
- `get_brand_system()` - Get complete brand as JSON

---

## 🎨 Dynamic UI Architecture

**MindFork uses SERVER-DRIVEN UI** - no app rebuild needed for new features!

### How It Works:
1. User answers onboarding → traits captured in `user_traits`
2. Rules engine evaluates → enables features + selects layout
3. Client calls `select_ui_layout(user_id, 'home')` → gets JSON
4. Client renders components dynamically from registry

### Examples:
- **Vegan user** → sees carbon footprint card
- **Muscle builder** → sees protein progress card
- **Intermittent faster** → sees fasting timer widget

### Key Function:
```sql
SELECT select_ui_layout('user_id', 'home');
-- Returns: {features: [...], layout: {key, area, components: [...]}}
```

**Query implementation guides** for complete code!

---

## 🔥 Competitive Moats (DO NOT DEPRECATE!)

### 1. Real-Time Emotional Eating Detection
**Why it matters**: No other app does this!
**How it works**: Mood check-in → AI detects emotional eating → intervenes with supportive message
**Tables**: `mood_check_ins`, `cravings`, `food_entries`
**Guide**: Query `ai_implementation_guides` where `guide_name = 'emotional_eating_detection_system'`

### 2. AI Phone Coaching
**Why it matters**: Human-like phone conversations
**Tables**: `phone_calls`, `active_calls`, `sms_messages`, `ai_episodic_memory`
**Guide**: Query for `ai_phone_call_coaching`

### 3. Gamification + Personalization Synergy
**Why it matters**: XP/Badges that adapt to user goals
**Example**: Vegan users earn "Plant-Based Hero" badge, muscle builders unlock "Protein Master" skill tree
**Tables**: `user_achievements`, `user_traits`, `personalization_rules`

---

## 🚫 CRITICAL: What NOT to Do

### ❌ DO NOT:
1. **Deprecate existing tables** - only ADD, never remove/replace
2. **Guess implementation patterns** - query guides first!
3. **Ignore user traits** - always fetch and adapt to traits
4. **Hardcode UI** - use server-driven components
5. **Skip RLS policies** - security is critical
6. **Create duplicate functionality** - check if table exists first
7. **Use medical advice tone** - we're coaches, not doctors

### ✅ DO:
1. **Query `ai_implementation_guides` FIRST**
2. **Fetch user traits** before rendering UI
3. **Use existing math functions** (TDEE, satiety, adherence)
4. **Follow brand voice guidelines** (supportive, not shaming)
5. **Test against success metrics** defined in guides
6. **Add new features as additive migrations**

---

## 📖 Where to Find Everything

### Supabase Tables:
```sql
-- See all tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- See implementation guides
SELECT guide_name, priority, target_feature
FROM ai_implementation_guides
ORDER BY priority, guide_name;

-- Get brand system
SELECT get_brand_system();
```

### Local Files:
- **This file**: `AI_QUICK_START_INDEX.md` - Quick reference
- **Schema docs**: `SESSION_COMPLETE_SUMMARY.md` - Comprehensive session log
- **Math analysis**: `MATH_PRIMITIVES_ANALYSIS.md` - Scientific formulas
- **Personalization**: `PERSONALIZATION_EXPANSION_ANALYSIS.md` - Gamification deep-dive
- **Project instructions**: `CLAUDE.md` - General project guidelines

---

## 🎯 Common Tasks - Where to Start

### Task: Build Food Logging Screen
1. Query: `SELECT * FROM ai_implementation_guides WHERE guide_name = 'food_logging_with_photo'`
2. Use tables: `food_entries`, `ai_knowledge_sources` (barcode lookup)
3. Call `calculate_satiety_score()` for each food
4. Follow UX flow in guide

### Task: Build Home Dashboard
1. Query: `SELECT select_ui_layout(user_id, 'home')`
2. Fetch user traits: `SELECT * FROM user_traits WHERE user_id = ?`
3. Render components from layout JSON
4. Use brand tokens: `SELECT * FROM design_tokens WHERE token_category = 'color'`

### Task: Implement AI Coach Message
1. Query: `SELECT * FROM ai_implementation_guides WHERE target_feature ILIKE '%coach%'`
2. Fetch enhanced context: User traits + episodic memory + preferences
3. Use brand voice: `SELECT * FROM brand_voice_guidelines WHERE guideline_name = 'supportive_coach_tone'`
4. Store message in `coach_messages` table

### Task: Add New Feature
1. Create migration in `supabase/migrations/`
2. Add implementation guide to `ai_implementation_guides`
3. Update personalization rules if feature should be gated
4. Add UI component to `ui_components` registry

---

## 💡 Pro Tips

1. **Always check subscription tier** before showing premium features
   ```sql
   SELECT tier_key FROM user_subscriptions WHERE user_id = ?
   ```

2. **Track usage limits** for free users
   ```sql
   SELECT * FROM subscription_usage_limits
   WHERE user_id = ? AND date = CURRENT_DATE
   ```

3. **Award XP for actions**
   ```sql
   SELECT xp_amount FROM xp_earning_rules
   WHERE action_type = 'log_food' AND is_active = TRUE
   ```

4. **Check for unlocked achievements**
   ```sql
   SELECT achievement_key, earned_at
   FROM user_achievements
   WHERE user_id = ? AND earned_at IS NOT NULL
   ```

5. **Use computed metrics** (don't recalculate!)
   ```sql
   SELECT adherence_score, actual_protein_g, habit_completion_rate
   FROM daily_metrics
   WHERE user_id = ? ORDER BY date DESC LIMIT 1
   ```

---

## 🚀 You're Ready!

**Before starting ANY task:**
1. ✅ Read this index
2. ✅ Query `ai_implementation_guides` for your specific feature
3. ✅ Check existing tables (don't duplicate!)
4. ✅ Fetch user traits for personalization
5. ✅ Follow brand voice guidelines
6. ✅ Test against success metrics

**Remember**: The schema is your friend! 147 tables of world-class infrastructure ready to use.

**Query the guides. Build amazing features. Ship fast. 🚀**

---

*Last updated: 2025-11-03*
*Schema version: v1.0 (147 tables, 5 SQL functions, 38 design tokens)*
*Implementation guides: 4 critical guides + expanding*

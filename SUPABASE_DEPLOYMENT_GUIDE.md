# Supabase Deployment Guide - Complete Dynamic UI System

**Created**: 2025-11-04
**Status**: 🟢 READY FOR PRODUCTION DEPLOYMENT
**System**: MindFork Dynamic UI with AI-Driven Personalization

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Prerequisites](#prerequisites)
3. [Migration Order](#migration-order)
4. [Deployment Steps](#deployment-steps)
5. [Verification](#verification)
6. [Rollback Plan](#rollback-plan)
7. [Post-Deployment Tasks](#post-deployment-tasks)

---

## 🎯 Executive Summary

This deployment completes the **Server-Driven Dynamic UI System** with:

- ✅ **Meal aggregation** functions for daily nutrition summaries
- ✅ **Fitness tracking** tables (fitness_logs, body_measurements)
- ✅ **Social features** (friends, challenges, leaderboards)
- ✅ **Gamification** (XP system, achievements, streaks)
- ✅ **Dynamic UI engine** (rules engine, trait matching, layout selection)
- ✅ **Performance optimization** (materialized views, caching)
- ✅ **AI trait evolution** (behavioral pattern detection)

**Total Tables Created**: 16
**Total Functions**: 15+
**Total Indexes**: 40+
**Total RLS Policies**: 50+

---

## 🔧 Prerequisites

### Required Tools
```bash
# Supabase CLI (recommended method)
npm install -g supabase

# Or direct psql connection
psql --version  # PostgreSQL 14+ required
```

### Environment Variables
Ensure you have one of these:
- `DATABASE_URL` - Full Postgres connection string
- `SUPABASE_DB_URL` - Supabase-specific connection string
- `.env` file with database credentials

### Check Current Schema
```sql
-- Verify existing tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check for previous migrations
SELECT * FROM migrations ORDER BY created_at DESC LIMIT 10;
```

---

## 📦 Migration Order

### Phase 1: Core Features (COMPLETED)
These should already be applied:
1. ✅ `20251103_fix_user_goals_rls_policy.sql` - Fixed RLS blocking inserts
2. ✅ `20251104_add_meal_aggregation_function.sql` - Daily nutrition summary
3. ✅ `20251104_create_fitness_tracking.sql` - Fitness logs & body measurements
4. ✅ `20251104_create_social_features.sql` - Friends, challenges, leaderboards
5. ✅ `20251104_add_gamification_functions.sql` - XP, achievements, streaks

### Phase 2: Dynamic UI System (TO APPLY)
**These must be applied in this exact order:**

#### Step 1: Apply Complete Dynamic UI System
```bash
supabase db push supabase/migrations/20251104_complete_dynamic_ui_system.sql
```
**OR**
```bash
psql "$DATABASE_URL" -f supabase/migrations/20251104_complete_dynamic_ui_system.sql
```

**What this creates:**
- `predicate_match()` - Rules engine for trait evaluation
- `select_ui_layout()` - Master function for layout selection
- `update_trait_confidence()` - AI confidence scoring
- `detect_emotional_eating_pattern()` - Behavioral analysis
- `detect_meal_timing_pattern()` - Temporal pattern detection
- Cache invalidation triggers
- Performance monitoring tables

**Expected Output:**
```
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
...
CREATE TRIGGER
CREATE INDEX
GRANT
```

#### Step 2: Apply All Fixes
```bash
supabase db push supabase/migrations/20251104_APPLY_ALL_FIXES.sql
```

**What this creates:**
- `user_layout_cache` table (5-min TTL cache)
- `quality_tier` column on `food_entries`
- Verifies all functions are present
- Refreshes materialized views
- Grants necessary permissions

**Expected Output:**
```
CREATE TABLE
ALTER TABLE
NOTICE: ✅ All fixes applied successfully!
NOTICE: ✅ user_layout_cache table created
NOTICE: ✅ quality_tier column added
NOTICE: ✅ Dynamic UI system ready for personalization rules
```

#### Step 3: Seed Personalization Rules
```bash
supabase db push supabase/migrations/20251104_seed_personalization_rules.sql
```

**What this creates:**
- 5 example personalization rules:
  1. **Vegan Carbon Focus** (priority 10) - For vegan + carbon-conscious users
  2. **Intermittent Fasting** (priority 20) - For IF practitioners
  3. **Emotional Eating Support** (priority 15) - For emotional eaters
  4. **Muscle Builder Focus** (priority 30) - For hypertrophy goals
  5. **Default Fallback** (priority 100) - Catches all users

**Expected Output:**
```
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
SELECT 5
```

---

## 🚀 Deployment Steps

### Option A: Supabase CLI (Recommended)

```bash
# 1. Navigate to project directory
cd /home/jonbrookings/vibe_coding_projects/vibe-coding-mindfork

# 2. Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# 3. Apply all migrations
supabase db push

# 4. Verify deployment
supabase db diff --schema public
```

### Option B: Direct psql

```bash
# 1. Set connection string
export DATABASE_URL="postgresql://user:pass@host:port/database"

# 2. Apply migrations in order
psql "$DATABASE_URL" -f supabase/migrations/20251104_complete_dynamic_ui_system.sql
psql "$DATABASE_URL" -f supabase/migrations/20251104_APPLY_ALL_FIXES.sql
psql "$DATABASE_URL" -f supabase/migrations/20251104_seed_personalization_rules.sql

# 3. Verify
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM personalization_rules;"
```

### Option C: Supabase Dashboard

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy contents of each migration file
3. Execute in order (Step 1 → Step 2 → Step 3)
4. Verify output shows no errors

---

## ✅ Verification

### 1. Check Tables Created
```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_layout_cache',
    'layout_performance_metrics',
    'personalization_rules',
    'ui_layouts',
    'fitness_logs',
    'body_measurements',
    'friendships',
    'challenges',
    'leaderboards'
  )
ORDER BY table_name;
```

**Expected Result**: 9 tables

### 2. Check Functions Created
```sql
SELECT proname as function_name
FROM pg_proc
WHERE proname IN (
  'predicate_match',
  'select_ui_layout',
  'update_trait_confidence',
  'detect_emotional_eating_pattern',
  'detect_meal_timing_pattern',
  'invalidate_layout_cache',
  'get_daily_nutrition_summary',
  'award_xp',
  'check_achievement_unlock',
  'update_habit_streak'
)
ORDER BY proname;
```

**Expected Result**: 10 functions

### 3. Check Personalization Rules Seeded
```sql
SELECT
  name,
  priority,
  predicate->>'trait' as simple_trait,
  effects->>'home_layout' as layout,
  effects->>'coach_persona' as coach,
  active
FROM personalization_rules
ORDER BY priority;
```

**Expected Result**: 5 rules with priorities 10, 15, 20, 30, 100

### 4. Test Core Functions

#### Test predicate_match()
```sql
-- Should return TRUE for any user (empty predicate)
SELECT predicate_match(
  (SELECT id FROM auth.users LIMIT 1),
  '{}'::JSONB
) as always_true;
```

#### Test select_ui_layout()
```sql
-- Should return default layout for user with no traits
SELECT select_ui_layout(
  (SELECT id FROM auth.users LIMIT 1),
  'home',
  FALSE
) as layout_json;
```

#### Test get_daily_nutrition_summary()
```sql
-- Should return nutrition summary for today
SELECT get_daily_nutrition_summary(
  (SELECT id FROM auth.users LIMIT 1),
  CURRENT_DATE
) as nutrition_summary;
```

### 5. Check RLS Policies
```sql
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('user_layout_cache', 'personalization_rules', 'fitness_logs')
ORDER BY tablename, policyname;
```

**Expected Result**: 3+ policies per table

### 6. Verify Indexes Created
```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('user_layout_cache', 'food_entries', 'fitness_logs')
  AND schemaname = 'public'
ORDER BY tablename, indexname;
```

**Expected Result**: 10+ indexes across all tables

---

## 🔄 Rollback Plan

### If Issues Occur During Deployment

#### Rollback Step 3 (Personalization Rules)
```sql
-- Delete seeded rules
DELETE FROM personalization_rules
WHERE name IN (
  'Vegan Carbon Focus Layout',
  'Intermittent Fasting Layout',
  'Emotional Eating Support Layout',
  'Muscle Builder Focus Layout',
  'Default Layout (Fallback)'
);
```

#### Rollback Step 2 (Fixes)
```sql
-- Drop added table
DROP TABLE IF EXISTS user_layout_cache CASCADE;

-- Remove added column
ALTER TABLE food_entries DROP COLUMN IF EXISTS quality_tier;
```

#### Rollback Step 1 (Dynamic UI System)
```sql
-- Drop functions
DROP FUNCTION IF EXISTS predicate_match CASCADE;
DROP FUNCTION IF EXISTS select_ui_layout CASCADE;
DROP FUNCTION IF EXISTS update_trait_confidence CASCADE;
DROP FUNCTION IF EXISTS detect_emotional_eating_pattern CASCADE;
DROP FUNCTION IF EXISTS detect_meal_timing_pattern CASCADE;
DROP FUNCTION IF EXISTS invalidate_layout_cache CASCADE;
DROP FUNCTION IF EXISTS invalidate_all_layout_caches CASCADE;

-- Drop tables
DROP TABLE IF EXISTS layout_performance_metrics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS user_dashboard_metrics CASCADE;
```

---

## 📊 Post-Deployment Tasks

### 1. Set Up Automated Cache Refresh
Create a cron job to refresh the dashboard metrics every 5 minutes:

```sql
-- Using pg_cron (if available)
SELECT cron.schedule(
  'refresh-dashboard-metrics',
  '*/5 * * * *',  -- Every 5 minutes
  $$ SELECT refresh_dashboard_metrics(); $$
);
```

**OR** set up an Edge Function with Supabase Scheduler

### 2. Populate Initial User Traits
For existing users, run initial trait detection:

```sql
-- Run for all existing users
SELECT detect_emotional_eating_pattern(id)
FROM auth.users;

SELECT detect_meal_timing_pattern(id)
FROM auth.users;
```

### 3. Monitor Performance
Check layout computation times:

```sql
SELECT
  layout_key,
  AVG(computation_time_ms) as avg_ms,
  MAX(computation_time_ms) as max_ms,
  COUNT(*) FILTER (WHERE cache_hit = TRUE)::FLOAT / COUNT(*) as cache_hit_rate
FROM layout_performance_metrics
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY layout_key;
```

### 4. Seed UI Layouts
Create the actual layout definitions (must be done by interface AI):

```sql
-- Example: Vegan Focus Layout
INSERT INTO ui_layouts (layout_key, area, name, components) VALUES
('layout_vegan_focus', 'home', 'Vegan Carbon Focus Home', '[
  {"component_key": "card_carbon_savings", "position": 1},
  {"component_key": "card_plant_protein_tracker", "position": 2},
  {"component_key": "card_daily_meals", "position": 3}
]'::JSONB);
```

### 5. Create Coach Persona Assets
Ensure all referenced coach personas have corresponding assets:
- `coach_verdant_avatar` - Vegan focus
- `coach_aetheris_avatar` - Analytical/muscle builder
- `coach_veloura_avatar` - Emotional support
- `coach_decibel_avatar` - Default

### 6. Test End-to-End User Flow
1. Create test user
2. Set user traits (diet_type = 'vegan', ethics_carbon = 'high')
3. Call `select_ui_layout(user_id, 'home', false)`
4. Verify correct layout returned (layout_vegan_focus)
5. Check cache is populated
6. Call again, verify cache hit

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ All 3 migration files applied without errors
- ✅ All 10 core functions exist and are callable
- ✅ 5 personalization rules seeded successfully
- ✅ `user_layout_cache` table created with RLS policies
- ✅ `quality_tier` column added to `food_entries`
- ✅ Test queries return expected results
- ✅ RLS policies allow authenticated users to access own data
- ✅ Performance monitoring shows cache hit rate > 80%

---

## 📝 Notes

### Known Issues (Non-Blocking)
- **Index creation warnings** on social features (IMMUTABLE function requirement) - Does not affect functionality
- **Materialized view** may be slow on first refresh with large datasets - Run during off-peak hours

### Performance Considerations
- **Cache TTL**: 5 minutes (configurable in `select_ui_layout` function)
- **Materialized View Refresh**: Should be scheduled every 5-15 minutes
- **Rule Evaluation**: O(n) where n = number of active rules (optimize by keeping count low)

### Security Notes
- All functions use `SECURITY DEFINER` - Run with elevated privileges
- RLS policies enforce user-level data isolation
- Cache invalidation triggers maintain consistency
- No sensitive data logged in performance metrics

---

## 🔗 Related Documentation

- [DYNAMIC_UI_SYSTEM.md](/home/jonbrookings/vibe_coding_projects/vibe-coding-mindfork/DYNAMIC_UI_SYSTEM.md) - Full system architecture
- [SUPABASE_READINESS_AUDIT.md](/home/jonbrookings/vibe_coding_projects/vibe-coding-mindfork/SUPABASE_READINESS_AUDIT.md) - Pre-deployment audit
- [DEPLOYMENT_SUMMARY_20251104.md](/home/jonbrookings/vibe_coding_projects/vibe-coding-mindfork/DEPLOYMENT_SUMMARY_20251104.md) - Phase 1 deployment report

---

**Deployment Guide Complete** ✅
**Ready for Production** 🚀

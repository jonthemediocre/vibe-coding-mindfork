# Schema Migration Checklist for Supabase

**Last Updated:** 2025-11-02
**Status:** ⚠️ NEEDS MANUAL VERIFICATION

---

## 🎯 Overview

This document lists all database tables that the MindFork app expects to exist in Supabase. The user must verify these tables exist and run migrations if needed.

---

## ✅ Core Tables (Required for Basic Functionality)

### 1. **profiles**
- **Used By:** AuthContext, ProfileContext, most services
- **Schema Location:** src/types/supabase.ts line 62
- **Columns Expected:**
  - id (uuid, primary key)
  - user_id (uuid, references auth.users)
  - email (text)
  - full_name (text, nullable)
  - avatar_url (text, nullable)
  - daily_calories (int, nullable)
  - daily_protein (int, nullable)
  - daily_carbs (int, nullable)
  - daily_fat (int, nullable)
  - weight_goal (numeric, nullable)
  - height_cm (numeric, nullable)
  - current_weight_kg (numeric, nullable)
  - date_of_birth (date, nullable)
  - gender (text, nullable)
  - activity_level (text, nullable)
  - dietary_preferences (jsonb, nullable)
  - created_at (timestamptz)
  - updated_at (timestamptz, nullable)

**Status:** ✅ Likely exists (core table)

---

### 2. **food_entries**
- **Used By:** FoodService, FoodScreen, useFoodTracking, AnalyticsService
- **Schema Location:** src/types/supabase.ts line 997
- **Columns Expected:**
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - food_name (text)
  - serving_size (text, nullable)
  - calories (numeric, nullable)
  - protein_g (numeric, nullable)
  - carbs_g (numeric, nullable)
  - fat_g (numeric, nullable)
  - fiber_g (numeric, nullable)
  - sodium_mg (numeric, nullable)
  - sugar_g (numeric, nullable)
  - meal_type (text, nullable) - enum: breakfast, lunch, dinner, snack
  - photo_url (text, nullable)
  - barcode (text, nullable)
  - **created_at (timestamptz)** ⚠️ NOT consumed_at

**Status:** ✅ Table exists, ⚠️ Make sure `consumed_at` column does NOT exist (we use `created_at`)

**Recent Fix:** Changed all code references from `consumed_at` to `created_at`

---

### 3. **fasting_sessions**
- **Used By:** FastingService, useFastingTimer, FastingScreen
- **Schema Location:** src/types/supabase.ts line 1050
- **Columns Expected:**
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - start_time (timestamptz)
  - end_time (timestamptz, nullable)
  - target_duration_hours (numeric)
  - actual_duration_hours (numeric, nullable)
  - status (text) - enum: active, completed, cancelled
  - created_at (timestamptz)
  - updated_at (timestamptz, nullable)

**Status:** ✅ Likely exists

---

### 4. **user_settings**
- **Used By:** Multiple services for user preferences
- **Schema Location:** src/types/supabase.ts line 148
- **Columns Expected:**
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - theme (text, nullable)
  - notifications_enabled (boolean)
  - language (text, nullable)
  - timezone (text, nullable)
  - created_at (timestamptz)
  - updated_at (timestamptz, nullable)

**Status:** ✅ Likely exists

---

## 📊 Meal Planning Tables

### 5. **meal_plans**
- **Used By:** MealPlanningService
- **Schema Location:** src/types/supabase.ts line 694
- **Columns Expected:**
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - name (text)
  - description (text, nullable)
  - start_date (date)
  - end_date (date, nullable)
  - is_active (boolean)
  - created_at (timestamptz)
  - updated_at (timestamptz, nullable)

**Status:** ✅ Likely exists

---

### 6. **meal_plan_entries** ⚠️ CRITICAL
- **Used By:** MealPlanningService, MealPlanningScreen, useMealPlanning
- **Schema:** Expected but NOT in supabase.ts (custom table)
- **Columns Expected:**
  - id (uuid, primary key)
  - meal_plan_id (uuid, references meal_plans, nullable)
  - user_id (uuid, references profiles)
  - meal_type (text) - enum: breakfast, lunch, dinner, snack
  - date (date) ⚠️ NOT planned_date
  - recipe_id (uuid, references recipes, nullable)
  - food_entry_id (uuid, references food_entries, nullable)
  - servings (numeric, nullable)
  - notes (text, nullable)
  - created_at (timestamptz, nullable)

**Status:** ⚠️ **MUST BE CREATED** - Recent migration (Iteration 2)

**Migration:** See `/home/user/workspace/database/migrations/20250102_add_recipes_and_ingredients.sql`

---

### 7. **recipes**
- **Used By:** MealPlanningService, RecipeService
- **Schema:** Custom table
- **Columns Expected:**
  - id (uuid, primary key)
  - user_id (uuid, references profiles, nullable) - null for public recipes
  - name (text)
  - description (text, nullable)
  - instructions (text, nullable)
  - prep_time_minutes (int, nullable)
  - cook_time_minutes (int, nullable)
  - servings (int)
  - calories_per_serving (numeric, nullable)
  - protein_per_serving (numeric, nullable)
  - carbs_per_serving (numeric, nullable)
  - fat_per_serving (numeric, nullable)
  - fiber_per_serving (numeric, nullable)
  - photo_url (text, nullable)
  - is_public (boolean)
  - created_at (timestamptz)
  - updated_at (timestamptz, nullable)

**Status:** ⚠️ **MUST BE CREATED**

**Migration:** See `/home/user/workspace/database/migrations/20250102_add_recipes_and_ingredients.sql`

---

### 8. **recipe_ingredients**
- **Used By:** MealPlanningService (shopping list generation)
- **Schema:** Custom table
- **Columns Expected:**
  - id (uuid, primary key)
  - recipe_id (uuid, references recipes)
  - ingredient_name (text)
  - quantity (text, nullable)
  - unit (text, nullable)
  - sort_order (int, nullable)

**Status:** ⚠️ **MUST BE CREATED**

**Migration:** See `/home/user/workspace/database/migrations/20250102_add_recipes_and_ingredients.sql`

---

### 9. **meal_templates**
- **Used By:** MealPlanningService
- **Schema:** Custom table
- **Columns Expected:**
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - name (text)
  - description (text, nullable)
  - template_data (jsonb) - stores meal configuration
  - created_at (timestamptz)

**Status:** ⚠️ **MUST BE CREATED**

---

## 🍽️ Food & Favorites Tables

### 10. **favorite_foods**
- **Used By:** FoodService
- **Schema:** Custom table
- **Columns Expected:**
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - food_name (text)
  - serving_size (numeric)
  - serving_unit (text)
  - calories (numeric)
  - protein (numeric, nullable)
  - carbs (numeric, nullable)
  - fat (numeric, nullable)
  - fiber (numeric, nullable)
  - created_at (timestamptz)

**Status:** ⚠️ **VERIFY EXISTS** - Used in Iteration 2

---

### 11. **foods** (USDA database)
- **Used By:** USDAFoodDataService (optional - for offline caching)
- **Schema:** May not exist yet
- **Status:** ⚠️ OPTIONAL - Can work without this table

---

## 🎯 Goals & Achievements

### 12. **goals**
- **Used By:** GoalsScreen, useGoals
- **Schema Location:** src/types/supabase.ts line 411
- **Columns Expected:**
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - title (text)
  - description (text, nullable)
  - type (text) - e.g. weight, calories, protein
  - category (text, nullable)
  - target_value (numeric)
  - current_value (numeric)
  - unit (text)
  - target_date (date, nullable)
  - status (text)
  - progress (numeric)
  - milestones (jsonb, nullable)
  - created_at (timestamptz)
  - updated_at (timestamptz, nullable)

**Status:** ✅ Likely exists

---

### 13. **goal_milestones**
- **Used By:** GoalsScreen
- **Schema:** Custom table
- **Status:** ⚠️ VERIFY EXISTS

---

### 14. **achievements**
- **Used By:** GoalsScreen, useGoals
- **Schema Location:** src/types/supabase.ts line 924
- **Status:** ✅ Likely exists

---

## 🤖 Coach & Marketplace Tables

### 15. **coaches**
- **Used By:** CoachScreen, CoachService
- **Status:** ✅ Likely exists

### 16. **coach_purchases**
- **Used By:** CoachMarketplaceScreen, useCoachMarketplace
- **Status:** ⚠️ VERIFY EXISTS

### 17. **coach_reviews**
- **Used By:** CoachMarketplaceScreen
- **Status:** ⚠️ VERIFY EXISTS

### 18. **coach_categories**
- **Used By:** CoachMarketplaceScreen
- **Status:** ⚠️ VERIFY EXISTS

### 19. **messages**
- **Used By:** CoachScreen (chat history)
- **Schema:** Custom table for AI chat messages
- **Status:** ⚠️ VERIFY EXISTS

---

## 💳 Subscription & Payment Tables

### 20. **subscriptions**
- **Used By:** SubscriptionScreen, useSubscription
- **Status:** ⚠️ VERIFY EXISTS

### 21. **payment_methods**
- **Used By:** SubscriptionScreen
- **Status:** ⚠️ VERIFY EXISTS

### 22. **invoices**
- **Used By:** SubscriptionScreen
- **Status:** ⚠️ VERIFY EXISTS

---

## 📈 Analytics & Tracking Tables

### 23. **step_tracking**
- **Used By:** AnalyticsService
- **Schema Location:** src/types/supabase.ts line 1085
- **Status:** ✅ Likely exists

### 24. **weight_logs**
- **Used By:** Various tracking features
- **Status:** ⚠️ VERIFY EXISTS

### 25. **metabolic_tracking**
- **Used By:** Advanced analytics
- **Status:** ⚠️ OPTIONAL

---

## 🚨 CRITICAL MIGRATIONS NEEDED

### Priority 1: MUST RUN IMMEDIATELY

#### Migration 1: Recipes & Meal Planning Tables
**File:** `/home/user/workspace/database/migrations/20250102_add_recipes_and_ingredients.sql`
**Tables Created:**
- recipes
- recipe_ingredients
- meal_plan_entries
- meal_templates

**Why Critical:** Meal planning features (shopping lists, templates) won't work without these

**How to Run:**
```sql
-- Option 1: Copy SQL to Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/[your-project]/sql/new
-- Paste contents of 20250102_add_recipes_and_ingredients.sql
-- Click "Run"

-- Option 2: Use Supabase CLI (if available)
-- Run from project root:
supabase migration up
```

---

#### Migration 2: Add Barcode Column to food_entries
**File:** `/home/user/workspace/supabase/migrations/20251102_add_barcode_to_food_entries.sql`
**Changes:**
- Adds `barcode` column to food_entries table

**Why Needed:** Barcode scanning feature stores UPC/EAN codes

**How to Run:**
```sql
ALTER TABLE food_entries ADD COLUMN IF NOT EXISTS barcode TEXT;
```

---

### Priority 2: VERIFY EXIST

These tables should exist but need verification:

✅ **Check in Supabase Dashboard → Table Editor:**
1. profiles ✓
2. food_entries ✓ (but verify NO consumed_at column)
3. fasting_sessions ✓
4. user_settings ✓
5. meal_plans ✓
6. goals ✓
7. achievements ✓
8. coaches ✓
9. favorite_foods ⚠️
10. messages ⚠️
11. coach_purchases ⚠️
12. subscriptions ⚠️
13. payment_methods ⚠️

---

## 🔍 How to Verify Schema

### Step 1: Check Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to "Table Editor" in sidebar
4. Verify each table from the "VERIFY EXIST" list above

### Step 2: Check for consumed_at Column
```sql
-- Run in SQL Editor
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'food_entries'
  AND column_name = 'consumed_at';

-- Should return 0 rows (we use created_at instead)
```

### Step 3: Check for Required Tables
```sql
-- Run in SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'recipes',
    'recipe_ingredients',
    'meal_plan_entries',
    'meal_templates',
    'favorite_foods'
  );

-- Should return all 5 table names
```

---

## 📝 Migration Commands

### If Tables are Missing:

#### Option A: Use Supabase Dashboard (Recommended)
1. Go to SQL Editor in Supabase Dashboard
2. Create new query
3. Copy contents of migration file
4. Run query
5. Verify table created in Table Editor

#### Option B: Use Supabase CLI
```bash
# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run pending migrations
supabase db push
```

---

## ⚠️ Known Schema Issues

### Issue 1: consumed_at vs created_at
**Status:** ✅ FIXED (2025-11-02)
**Description:** Code was using `consumed_at` column that doesn't exist in database
**Solution:** Changed all references to use `created_at` instead
**Files Fixed:**
- src/services/FoodService.ts
- src/services/AnalyticsService.ts
- src/screens/food/FoodScreenEnhanced.tsx
- src/utils/foodTransformers.ts
- src/types/models.ts (made consumed_at optional)

### Issue 2: planned_meals vs meal_plan_entries
**Status:** ✅ FIXED (Iteration 2)
**Description:** Old schema used `planned_meals`, new schema uses `meal_plan_entries`
**Solution:** Migrated entire codebase to use meal_plan_entries
**Migration Required:** YES - see 20250102_add_recipes_and_ingredients.sql

---

## 🎯 Quick Verification Checklist

Run this in Supabase SQL Editor to check all critical tables:

```sql
-- Check for all required tables
SELECT
  t.table_name,
  CASE
    WHEN t.table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES
    ('profiles'),
    ('food_entries'),
    ('fasting_sessions'),
    ('user_settings'),
    ('meal_plans'),
    ('meal_plan_entries'),
    ('recipes'),
    ('recipe_ingredients'),
    ('meal_templates'),
    ('favorite_foods'),
    ('goals'),
    ('achievements'),
    ('coaches'),
    ('messages')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_name = expected.table_name
  AND t.table_schema = 'public'
ORDER BY
  CASE WHEN t.table_name IS NULL THEN 0 ELSE 1 END,
  expected.table_name;
```

Expected output: All tables show ✅ EXISTS

---

## 📧 Support

If tables are missing and migrations fail:
1. Check `/home/user/workspace/database/migrations/` for SQL files
2. Manually run SQL in Supabase SQL Editor
3. Verify Row Level Security (RLS) policies are set correctly
4. Check Supabase logs for permission errors

**Critical Migration Files:**
- `20250102_add_recipes_and_ingredients.sql` - Meal planning tables
- `20251102_add_barcode_to_food_entries.sql` - Barcode column

---

**Status:** ⚠️ USER ACTION REQUIRED
**Last Code Update:** 2025-11-02 (consumed_at → created_at fix)
**Next Step:** Run SQL verification query above in Supabase Dashboard

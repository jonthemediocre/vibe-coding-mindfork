# Schema Gap Analysis Report
**Generated**: 2025-11-03
**Database**: MindFork Supabase Instance (lxajnrofkgpwdpodjvkm)

## Executive Summary

After analyzing the app's TypeScript type definitions, service layer code, and comparing against the actual Supabase database schema, I've identified **critical gaps** that are limiting app functionality and causing potential runtime errors.

---

## 🚨 CRITICAL Issues (Breaking Functionality)

### 1. **Missing `step_tracking` Table**
**Status**: ❌ Table doesn't exist
**Impact**: HIGH - Step tracking feature completely broken
**Service Affected**: `StepTrackingService.ts`

The app has a complete `StepTrackingService` with methods for:
- Saving daily steps
- Getting step history
- Calculating weekly averages
- Getting step statistics

**Expected Schema**:
```sql
CREATE TABLE step_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  date DATE NOT NULL,
  step_count INTEGER NOT NULL DEFAULT 0,
  calories_burned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, date) -- Prevent duplicate entries per day
);
```

**Recommended Indexes**:
- `idx_step_tracking_user_date` on (user_id, date)
- `idx_step_tracking_user_date_desc` on (user_id, date DESC)

---

### 2. **Missing Nutrition Columns in `food_entries`**
**Status**: ❌ Columns don't exist
**Impact**: HIGH - Detailed nutrition tracking broken
**Fields Missing**:
- `sodium_mg` (NUMERIC)
- `sugar_g` (NUMERIC)
- `barcode` (TEXT) - for UPC/EAN barcodes

**Current Schema**: Has only `name`, `calories`, `protein`, `carbs`, `fat`, `fiber`
**App Expects**: `food_name`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `sodium_mg`, `sugar_g`, `barcode`

**Issues**:
1. Column naming mismatch (`name` vs `food_name`, `protein` vs `protein_g`)
2. Missing critical nutrition fields (sodium, sugar)
3. No barcode support for product scanning

---

## ⚠️ HIGH PRIORITY Issues (Limited Functionality)

### 3. **Column Naming Inconsistencies in `food_entries`**
**Status**: ⚠️ Inconsistent naming
**Impact**: MEDIUM - Requires data mapping layer

| App Type Definition | Database Column | Status |
|---------------------|----------------|--------|
| `food_name` | `name` | ⚠️ Mismatch |
| `protein_g` | `protein` | ⚠️ Mismatch |
| `carbs_g` | `carbs` | ⚠️ Mismatch |
| `fat_g` | `fat` | ⚠️ Mismatch |
| `fiber_g` | `fiber` | ⚠️ Mismatch |
| `serving_size` | `serving` | ⚠️ Mismatch |

**Recommendation**: Either:
- A) Add column aliases/views
- B) Rename columns to match TypeScript types (breaking change)
- C) Update TypeScript types to match database (breaking change)
- **D) Keep current mapping in service layer (safest)**

---

### 4. **Missing `consumed_at` Field**
**Status**: ❌ Field doesn't exist
**Impact**: MEDIUM - Using `created_at` as fallback

The `FoodEntry` type has `consumed_at` field for when food was actually eaten (vs when it was logged). Currently using `logged_at` which might be acceptable but limits backdating entries.

---

## 💡 RECOMMENDED Enhancements

### 5. **Profile Table Enhancements**
**Current**: 71 columns (very comprehensive!)
**Potential Additions**:

```sql
-- Nutrition goal tracking (vs hardcoded in app)
ALTER TABLE profiles
  ADD COLUMN daily_fiber_g INTEGER,  -- Missing from current schema
  ADD COLUMN daily_sodium_mg INTEGER,  -- For heart health tracking
  ADD COLUMN daily_sugar_g INTEGER;  -- For diabetes/weight management

-- Activity tracking preferences
ALTER TABLE profiles
  ADD COLUMN step_goal INTEGER DEFAULT 10000,
  ADD COLUMN activity_sync_enabled BOOLEAN DEFAULT false,
  ADD COLUMN last_step_sync_at TIMESTAMPTZ;
```

---

### 6. **Food Entry Enhancements**
**Beneficial additions**:

```sql
ALTER TABLE food_entries
  -- Nutrition details
  ADD COLUMN sodium_mg NUMERIC,
  ADD COLUMN sugar_g NUMERIC,
  ADD COLUMN saturated_fat_g NUMERIC,
  ADD COLUMN trans_fat_g NUMERIC,
  ADD COLUMN cholesterol_mg NUMERIC,
  ADD COLUMN vitamin_a_mcg NUMERIC,
  ADD COLUMN vitamin_c_mg NUMERIC,
  ADD COLUMN calcium_mg NUMERIC,
  ADD COLUMN iron_mg NUMERIC,

  -- Barcode scanning
  ADD COLUMN barcode TEXT,  -- UPC/EAN code
  ADD COLUMN barcode_type TEXT,  -- 'UPC', 'EAN13', etc.

  -- Source tracking
  ADD COLUMN data_source TEXT,  -- 'manual', 'barcode', 'photo', 'usda'
  ADD COLUMN usda_fdc_id TEXT,  -- USDA FoodData Central ID

  -- User experience
  ADD COLUMN consumed_at TIMESTAMPTZ,  -- When actually eaten
  ADD COLUMN notes TEXT,  -- User notes about the food
  ADD COLUMN is_favorite BOOLEAN DEFAULT false;
```

---

### 7. **Call & SMS Tables**
**Status**: ✅ Need to verify these exist

The app expects `calls` and `sms_messages` tables for voice/SMS features. Let me verify:

---

## 📊 Database Statistics

**Total Tables**: 79
**Tables Used by App Services**: ~15 core tables
**Critical Missing Tables**: 1 (`step_tracking`)
**Tables with Missing Columns**: 2 (`food_entries`, `profiles`)

---

## 🎯 Migration Priority

### Phase 1 (CRITICAL - Do Immediately)
1. ✅ Create `step_tracking` table
2. ✅ Add `sodium_mg`, `sugar_g`, `barcode` to `food_entries`

### Phase 2 (HIGH - Do This Week)
3. Add `consumed_at` to `food_entries`
4. Add nutrition goals to `profiles` (fiber, sodium, sugar)
5. Add step tracking preferences to `profiles`

### Phase 3 (NICE TO HAVE - Do This Month)
6. Add extended nutrition fields (saturated fat, cholesterol, vitamins, minerals)
7. Add `data_source` and `usda_fdc_id` for better food tracking
8. Add `notes` and `is_favorite` to `food_entries`

---

## 🔧 Ready-to-Run Migrations

I'll generate SQL migration files in the next step that you can run to fix these issues.

**Files to create**:
1. `20251103_create_step_tracking_table.sql`
2. `20251103_add_missing_food_entry_columns.sql`
3. `20251103_add_profile_tracking_preferences.sql` (optional)

---

## ⚡ Impact Analysis

### If Migrations Are Run:
- ✅ Step tracking feature will work
- ✅ Full nutrition tracking (sodium, sugar) will work
- ✅ Barcode scanning can be implemented
- ✅ Users can set step goals
- ✅ Better data quality with source tracking

### If Migrations Are NOT Run:
- ❌ `StepTrackingService` will throw errors
- ❌ Sodium/sugar tracking won't work (data lost)
- ❌ Barcode feature can't be implemented
- ⚠️ Existing food entries work but with limited nutrition data
- ⚠️ Column naming mismatches continue (handled in service layer)

---

## Next Steps

Would you like me to:
1. **Generate the migration SQL files?** ✅ Recommended
2. **Run them directly on your database?** (needs confirmation)
3. **Create a rollback plan first?** (best practice)
4. **Analyze more services for additional gaps?**

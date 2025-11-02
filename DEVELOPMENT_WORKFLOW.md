# Development Workflow Guide

**Last Updated:** 2025-11-02

---

## 🎯 Overview

This guide shows you how to use the schema verification system during daily development of the MindFork app.

---

## 📋 Quick Reference

### When to Run Schema Verification

```bash
# After pulling new code
git pull && bun run verify-schema.ts

# Before starting a new feature
bun run verify-schema.ts

# Before committing changes that touch database code
bun run verify-schema.ts

# Before deploying to production
bun run verify-schema.ts
```

### Reading the Output

✅ **All tables exist** → Safe to develop
⚠️ **Tables missing** → Run migrations first
📊 **Row counts shown** → Verify data populated correctly

---

## 🔄 Daily Development Workflow

### 1. **Starting Your Day**

```bash
# Pull latest code
git pull origin main

# Check schema status
bun run verify-schema.ts

# If tables missing, check SCHEMA_STATUS.md for instructions
cat SCHEMA_STATUS.md
```

**Why**: Ensures your database matches the code you just pulled

---

### 2. **Adding a New Feature**

**Example: Adding a "Water Tracking" feature**

#### Step 1: Update verification script
```typescript
// verify-schema.ts - Add to EXPECTED_TABLES
const EXPECTED_TABLES = {
  critical: ['profiles', 'food_entries', ...],
  // ...
  analytics: ['step_tracking', 'weight_logs', 'water_logs'], // Added water_logs
};
```

#### Step 2: Create migration file
```bash
# Create migration in supabase/migrations/
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_add_water_tracking.sql
```

```sql
-- supabase/migrations/20250102120000_add_water_tracking.sql
CREATE TABLE water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount_ml NUMERIC NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

-- User can only see their own water logs
CREATE POLICY "Users can view own water logs"
  ON water_logs FOR SELECT
  USING (auth.uid() = user_id);

-- User can insert their own water logs
CREATE POLICY "Users can insert own water logs"
  ON water_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### Step 3: Run migration manually
1. Go to Supabase Dashboard → SQL Editor
2. Paste migration SQL
3. Click "Run"

#### Step 4: Verify schema
```bash
bun run verify-schema.ts
```

Should show:
```
✅ Analytics Tables (3/3 exist)
  ✅ step_tracking (145 rows)
  ✅ weight_logs (23 rows)
  ✅ water_logs (0 rows) ← New table
```

#### Step 5: Build feature
```typescript
// src/services/WaterService.ts
export class WaterService {
  static async logWater(userId: string, amountMl: number) {
    const { data, error } = await supabase
      .from('water_logs')
      .insert({ user_id: userId, amount_ml: amountMl })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
```

---

### 3. **Before Committing Code**

```bash
# Run verification
bun run verify-schema.ts

# If tables missing, commit both:
# 1. Migration file (supabase/migrations/*.sql)
# 2. Updated verification script (verify-schema.ts)
git add supabase/migrations/20250102120000_add_water_tracking.sql
git add verify-schema.ts
git add src/services/WaterService.ts
git commit -m "Add water tracking feature

- Created water_logs table
- Added WaterService for logging water intake
- Updated schema verification to check water_logs"
```

---

### 4. **Handling Schema Errors**

#### Scenario A: "Column does not exist" error

**Example**: `column food_entries.consumed_at does not exist`

**Steps**:
1. Check what column actually exists:
```sql
-- Run in Supabase SQL Editor
SELECT column_name FROM information_schema.columns
WHERE table_name = 'food_entries';
```

2. Update code to match database:
```typescript
// Before (wrong)
.order('consumed_at', { ascending: false })

// After (correct)
.order('created_at', { ascending: false })
```

3. Update TypeScript types:
```typescript
export interface FoodEntry {
  // ...
  consumed_at?: string; // Optional - database uses created_at
  created_at: string;
}
```

---

#### Scenario B: "Table does not exist" error

**Example**: `relation "meal_plan_entries" does not exist`

**Steps**:
1. Run schema verification:
```bash
bun run verify-schema.ts
```

2. Check SCHEMA_STATUS.md for migration instructions:
```bash
cat SCHEMA_STATUS.md
```

3. Run the required migration:
```sql
-- Copy SQL from database/migrations/*.sql
-- Paste into Supabase SQL Editor
-- Click "Run"
```

4. Verify fixed:
```bash
bun run verify-schema.ts
```

---

## 🚀 Pre-Deployment Checklist

### Before Deploying to Production

```bash
# 1. Verify all tables exist
bun run verify-schema.ts
# Must exit with code 0 (no missing tables)

# 2. Check for uncommitted migrations
git status supabase/migrations/

# 3. Verify .env variables match production
grep SUPABASE .env

# 4. Run type checking
bun run typecheck

# 5. Test critical flows
# - Sign up flow
# - Food logging
# - Meal planning
# - Fasting timer
```

---

## 👥 Team Workflow

### For Pull Requests

**PR Author**:
1. Run `bun run verify-schema.ts` before creating PR
2. If new tables added:
   - Include migration file in PR
   - Update verify-schema.ts with new tables
   - Update SCHEMA_MIGRATION_CHECKLIST.md
3. Add schema status to PR description:
```markdown
## Schema Changes
- ✅ Added `water_logs` table
- ✅ Migration file: `supabase/migrations/20250102120000_add_water_tracking.sql`
- ✅ Verification script updated
- ✅ All tables verified: `bun run verify-schema.ts`
```

**PR Reviewer**:
1. Check if schema changes documented
2. Review migration SQL for:
   - Proper RLS policies
   - CASCADE delete rules
   - Index creation for performance
3. Run verification locally:
```bash
git checkout pr-branch
bun run verify-schema.ts
```

---

### For Team Communication

**In Slack/Discord**:
```
🚨 New Schema Migration Required

I just merged PR #123 which adds meal templates.

Action needed:
1. Pull latest code: `git pull origin main`
2. Run migration from: `database/migrations/20250102_add_meal_templates.sql`
3. Verify: `bun run verify-schema.ts`

Let me know if you hit any issues!
```

---

## 🔧 CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/verify-schema.yml
name: Verify Database Schema

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  verify-schema:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Verify schema
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: bun run verify-schema.ts

      - name: Upload schema status
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: schema-status
          path: SCHEMA_STATUS.md
```

### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Verifying database schema..."
bun run verify-schema.ts

if [ $? -ne 0 ]; then
  echo "❌ Schema verification failed!"
  echo "Run 'bun run verify-schema.ts' and check SCHEMA_STATUS.md"
  exit 1
fi

echo "✅ Schema verified"
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 🐛 Debugging Schema Issues

### Issue: Script shows table exists but code fails

**Possible Causes**:
1. **Wrong environment** - Script checks dev DB, code uses prod DB
2. **Stale cache** - Supabase client cached schema
3. **RLS policy blocks access** - Table exists but user can't access

**Debug Steps**:
```bash
# 1. Check environment variables
echo $EXPO_PUBLIC_SUPABASE_URL

# 2. Verify table in dashboard
# Go to: https://supabase.com/dashboard/project/[id]/editor

# 3. Test RLS policy
# Run in SQL Editor:
SELECT * FROM water_logs WHERE user_id = 'your-user-id';
```

---

### Issue: Script fails with "Missing environment variables"

**Fix**:
```bash
# Verify .env file exists
ls -la .env

# Check variable names match
grep SUPABASE .env

# Required variables:
# EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

### Issue: Script shows table missing but it exists in dashboard

**Possible Causes**:
1. **Wrong project** - Service key from different project
2. **Typo in table name** - Script checks "meal_plans", DB has "mealplans"
3. **Schema other than public** - Table in "auth" schema

**Debug Steps**:
```sql
-- Check all tables in public schema
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## 📊 Schema Status Monitoring

### Daily Status Check

```bash
# Check and save status
bun run verify-schema.ts && cat SCHEMA_STATUS.md

# Or create an alias
echo "alias schema-check='bun run verify-schema.ts && cat SCHEMA_STATUS.md'" >> ~/.bashrc
```

### Track Schema Evolution

```bash
# Git history of schema changes
git log --oneline --follow supabase/migrations/

# Who added what table
git log --all --full-history -- supabase/migrations/*meal_templates*
```

---

## ✅ Best Practices

### DO:
- ✅ Run verification after every `git pull`
- ✅ Include migration files in same commit as code changes
- ✅ Update verify-schema.ts when adding new tables
- ✅ Document schema changes in PR descriptions
- ✅ Test migrations on dev database first
- ✅ Use descriptive migration file names
- ✅ Add RLS policies to all new tables

### DON'T:
- ❌ Commit code without migration files
- ❌ Manually edit production database without migration files
- ❌ Skip verification before deploying
- ❌ Forget to update verify-schema.ts with new tables
- ❌ Rename tables without migration
- ❌ Delete columns without checking usage

---

## 🎓 Learning Examples

### Example 1: Adding Shopping List Feature

```bash
# 1. Plan the schema
# Need: shopping_lists, shopping_list_items tables

# 2. Update verification script
# Add to EXPECTED_TABLES in verify-schema.ts

# 3. Create migration
cat > supabase/migrations/20250102130000_add_shopping_lists.sql << 'EOF'
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  quantity TEXT,
  checked BOOLEAN DEFAULT FALSE
);

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shopping lists"
  ON shopping_lists FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own shopping list items"
  ON shopping_list_items FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM shopping_lists
      WHERE id = shopping_list_items.shopping_list_id
    )
  );
EOF

# 4. Run migration in Supabase dashboard

# 5. Verify
bun run verify-schema.ts

# 6. Build the feature
# src/services/ShoppingListService.ts
# src/screens/ShoppingListScreen.tsx

# 7. Commit everything
git add supabase/migrations/20250102130000_add_shopping_lists.sql
git add verify-schema.ts
git add src/services/ShoppingListService.ts
git commit -m "Add shopping list feature"
```

---

### Example 2: Fixing Schema Mismatch

**Scenario**: Pulled code that references `consumed_at` but database has `created_at`

```bash
# 1. Verify the issue
bun run verify-schema.ts
# Shows food_entries exists

# 2. Check actual columns
# Run in Supabase SQL Editor:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'food_entries';
# Shows: created_at (not consumed_at)

# 3. Fix code to match database
# Find all references:
grep -r "consumed_at" src/

# 4. Replace with created_at:
# src/services/FoodService.ts
# src/services/AnalyticsService.ts
# etc.

# 5. Update TypeScript types
# Make consumed_at optional in src/types/models.ts

# 6. Test
bun run typecheck
bun run verify-schema.ts

# 7. Commit
git add -A
git commit -m "Fix: Use created_at instead of consumed_at for food entries"
```

---

## 📚 Additional Resources

- **Supabase Migrations Docs**: https://supabase.com/docs/guides/cli/local-development#database-migrations
- **Row Level Security Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Schema Verification Guide**: See `SCHEMA_VERIFICATION_GUIDE.md`
- **Migration Checklist**: See `SCHEMA_MIGRATION_CHECKLIST.md`

---

## 🆘 Getting Help

### Common Questions

**Q: I ran the migration but verification still shows missing table**

**A**: Try refreshing the connection:
```bash
# Clear any cached connections
pkill -f "bun run verify-schema"

# Re-run verification
bun run verify-schema.ts
```

---

**Q: How do I roll back a migration?**

**A**: Create a new migration that reverses it:
```sql
-- supabase/migrations/20250102140000_rollback_water_tracking.sql
DROP TABLE IF EXISTS water_logs;
```

---

**Q: Can I run multiple migrations at once?**

**A**: Yes, in Supabase SQL Editor:
```sql
-- Paste multiple CREATE TABLE statements
-- They run in a transaction
```

---

**Q: What if teammate added table but I don't have migration file?**

**A**:
```bash
# Pull latest migrations
git pull origin main

# Check what's new
ls -l supabase/migrations/

# Run new migrations manually in Supabase dashboard
# Or ask teammate for the SQL
```

---

## 🎯 Success Metrics

You are using the workflow correctly when:

✅ You never see "table does not exist" errors in production
✅ All team members have matching database schemas
✅ CI/CD pipeline catches schema issues before merge
✅ SCHEMA_STATUS.md always shows accurate status
✅ New features include migration files in the same PR
✅ Database changes are documented and traceable

---

**Last Updated**: 2025-11-02
**Status**: Ready for use
**Next Steps**: Run `bun run verify-schema.ts` to get started!

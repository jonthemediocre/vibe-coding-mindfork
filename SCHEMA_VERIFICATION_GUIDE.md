# Schema Verification System

## 🎯 Overview

This system programmatically checks what tables exist in your Supabase database vs what the code expects, and automatically generates a status report.

---

## 🚀 Quick Start

### Run the Verification Script

```bash
bun run verify-schema.ts
```

This will:
1. ✅ Connect to your Supabase database
2. ✅ Check all expected tables (50+ tables across 7 categories)
3. ✅ Count rows in each table
4. ✅ Generate `SCHEMA_STATUS.md` with detailed report
5. ✅ Exit with code 1 if any tables are missing (useful for CI/CD)

---

## 📋 What Gets Checked

The script verifies tables in these categories:

### Critical (5 tables)
- `profiles`, `food_entries`, `fasting_sessions`, `user_settings`, `goals`

### Meal Planning (5 tables)
- `meal_plans`, `meal_plan_entries`, `recipes`, `recipe_ingredients`, `meal_templates`

### Food Features (1 table)
- `favorite_foods`

### Achievements (3 tables)
- `achievements`, `achievement_types`, `goal_milestones`

### Coaching (4 tables)
- `coaches`, `coach_purchases`, `coach_reviews`, `messages`

### Subscription (3 tables)
- `subscriptions`, `payment_methods`, `invoices`

### Analytics (2 tables)
- `step_tracking`, `weight_logs`

**Total: 23 core tables**

---

## 📊 Example Output

```
🔍 Supabase Schema Verification

Connecting to: https://your-project.supabase.co

🔍 Checking critical tables...
   Checking profiles... ✅
   Checking food_entries... ✅
   Checking fasting_sessions... ✅
   Checking user_settings... ✅
   Checking goals... ✅

🔍 Checking mealPlanning tables...
   Checking meal_plans... ✅
   Checking meal_plan_entries... ❌
   Checking recipes... ❌
   Checking recipe_ingredients... ❌
   Checking meal_templates... ❌

✅ Report generated: SCHEMA_STATUS.md

📊 Summary:
   Total tables: 23
   Existing: 19
   Missing: 4

⚠️  Some tables are missing. Check SCHEMA_STATUS.md for details.
```

---

## 📄 Generated Report

The script generates `SCHEMA_STATUS.md` with:

- **Summary table** - Overall completion percentage
- **Category breakdown** - Status per category
- **Missing tables list** - What needs to be created
- **Migration instructions** - How to fix missing tables
- **Row counts** - How many rows in each table

---

## 🔧 Setup Requirements

### Environment Variables

The script requires these variables in your `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

⚠️ **Important:** Use the **SERVICE_ROLE_KEY**, not the anon key. This gives admin access to check all tables.

### Where to Find Keys

1. Go to your Supabase Dashboard
2. Navigate to: **Settings → API**
3. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔄 Keeping Schema in Sync

### When to Run

Run the verification script:

1. **After pulling code** - Check if new tables were added
2. **Before deploying** - Ensure all required tables exist
3. **After running migrations** - Verify migrations succeeded
4. **When features fail** - Check if required tables are missing

### Automated Checking

You can add this to your CI/CD pipeline:

```yaml
# .github/workflows/verify-schema.yml
name: Verify Database Schema
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run verify-schema.ts
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

## 🛠️ How It Works

### 1. Table Detection

For each expected table, the script runs:

```typescript
const { error, count } = await supabase
  .from(tableName)
  .select('*', { count: 'exact', head: true })
  .limit(0);
```

- If `error` → Table doesn't exist ❌
- If no error → Table exists ✅
- `count` → Number of rows in table

### 2. Status Report

Results are categorized by:
- **Category** (critical, mealPlanning, etc.)
- **Completion %** per category
- **Row counts** per table
- **Error messages** if table access fails

### 3. Exit Code

- **Exit 0** → All tables exist ✅
- **Exit 1** → Some tables missing ⚠️

This allows CI/CD to fail if schema is incomplete.

---

## 📝 Maintaining the Script

### Adding New Tables

When you add a new table to the codebase:

1. Open `verify-schema.ts`
2. Find the `EXPECTED_TABLES` object
3. Add your table to the appropriate category:

```typescript
const EXPECTED_TABLES = {
  critical: [
    'profiles',
    'food_entries',
    'your_new_table', // Add here
  ],
  // ...
};
```

4. Run the script to verify
5. Update `SCHEMA_MIGRATION_CHECKLIST.md` if needed

### Adding New Categories

```typescript
const EXPECTED_TABLES = {
  // Existing categories...
  yourNewCategory: [
    'table1',
    'table2',
  ],
};
```

---

## 🔍 Troubleshooting

### Error: "Missing environment variables"

**Solution:** Add `EXPO_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env`

### Error: "relation does not exist"

**Meaning:** Table is missing from database

**Solution:**
1. Check `SCHEMA_STATUS.md` for missing tables
2. See `SCHEMA_MIGRATION_CHECKLIST.md` for migration instructions
3. Run required SQL migrations in Supabase Dashboard

### Error: "permission denied"

**Meaning:** Service role key is invalid or has insufficient permissions

**Solution:**
1. Verify you're using the **service_role** key (not anon key)
2. Check key hasn't been rotated in Supabase Dashboard
3. Ensure RLS policies aren't blocking service role access

### Script hangs or times out

**Meaning:** Network issue or Supabase is down

**Solution:**
1. Check internet connection
2. Verify Supabase project is running
3. Check Supabase status page: https://status.supabase.com

---

## 🎯 Best Practices

1. **Run before every deployment** to catch schema drift
2. **Commit SCHEMA_STATUS.md** to version control for history
3. **Review changes** in SCHEMA_STATUS.md during PR reviews
4. **Update EXPECTED_TABLES** when adding features
5. **Use in CI/CD** to prevent deploying with incomplete schema

---

## 📚 Related Files

- `verify-schema.ts` - The verification script (this system)
- `SCHEMA_STATUS.md` - Generated report (auto-updated)
- `SCHEMA_MIGRATION_CHECKLIST.md` - Manual migration guide
- `database/migrations/*.sql` - SQL migration files

---

## 🤝 Contributing

When adding database tables to the codebase:

1. ✅ Add table to `EXPECTED_TABLES` in `verify-schema.ts`
2. ✅ Create migration file in `database/migrations/`
3. ✅ Document in `SCHEMA_MIGRATION_CHECKLIST.md`
4. ✅ Run `bun run verify-schema.ts` to test
5. ✅ Commit the updated `SCHEMA_STATUS.md`

This ensures the next developer knows exactly what tables are needed!

---

**Questions?** See `SCHEMA_MIGRATION_CHECKLIST.md` for detailed migration instructions.

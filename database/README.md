# Database Migrations

This directory contains SQL migration files for the Mindfork database.

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Open the migration file: `migrations/20250102_add_recipes_and_ingredients.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push

# Or manually run the migration
psql $DATABASE_URL -f database/migrations/20250102_add_recipes_and_ingredients.sql
```

## Migration: 20250102_add_recipes_and_ingredients.sql

### What This Migration Adds

**New Tables:**
1. **`recipes`** - Store user-created recipes with full nutritional information
   - Name, description, cuisine type, difficulty
   - Prep/cook times, servings
   - Complete macros: calories, protein, carbs, fat, fiber
   - Instructions (JSON), tags, images
   - Public/private sharing capability

2. **`recipe_ingredients`** - Ingredients for recipes (for shopping lists)
   - Ingredient name, quantity, unit
   - Linked to recipes with foreign key
   - Used to generate shopping lists automatically

**Schema Enhancements:**
- Adds `recipe_id` column to `planned_meals` (nullable, optional reference)
- Adds `food_entry_id` column to `planned_meals` (nullable, optional reference)

### Why These Changes?

This migration enables:
- ✅ Recipe creation and management
- ✅ Shopping list generation from ingredients
- ✅ Reference-based meal planning (link to recipes/food entries)
- ✅ Community recipe sharing
- ✅ Better data integrity with foreign keys

### Backward Compatibility

The migration is **fully backward compatible**:
- All new columns are nullable
- Existing `planned_meals` data is unaffected
- The app works with or without `recipe_id`/`food_entry_id` populated
- Current meal planning continues to use `meal_name` + nutrition data directly

### After Running This Migration

The meal planning system will support:
1. **Current mode** (works now): Direct meal names with nutrition data
2. **Enhanced mode** (after migration): Link meals to recipes or food entries
3. **Shopping lists**: Auto-generate from recipe ingredients
4. **Templates**: Save meal combinations as reusable templates

## Verifying the Migration

After running, verify with these SQL queries:

```sql
-- Check recipes table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'recipes';

-- Check new columns in planned_meals
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'planned_meals'
AND column_name IN ('recipe_id', 'food_entry_id');

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('recipes', 'recipe_ingredients');
```

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Remove new columns
ALTER TABLE public.planned_meals DROP COLUMN IF EXISTS recipe_id;
ALTER TABLE public.planned_meals DROP COLUMN IF EXISTS food_entry_id;

-- Drop tables (will cascade to ingredients)
DROP TABLE IF EXISTS public.recipe_ingredients CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

## Next Steps

After running this migration:
1. Re-run TypeScript type generation: `npm run generate-types`
2. The app will automatically support the new features
3. Shopping list and template features will be re-enabled

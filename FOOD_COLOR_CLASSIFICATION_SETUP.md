# Green/Yellow/Red Food Classification System - Setup Guide

## What We Built

A **simple, competitive dietary guidance system** that automatically classifies foods into three color categories:

- 🟢 **GREEN** - Great choice! (vegetables, fruits, lean proteins, whole grains)
- 🟡 **YELLOW** - Moderate - track portions (refined grains, moderate fats, dairy)
- 🔴 **RED** - Limit - occasional treats (sugary drinks, fried foods, candy)

This gives users **instant decision guidance** similar to successful competitors like Noom, without requiring manual input.

---

## What Was Changed (Additive Only)

### 1. Database Migration (`database/migrations/0001_food_color_classification.sql`)

**Added to existing tables** (no data loss):
- `food_entries.diet_color` - Color classification for logged foods
- `food_entries.tags` - Semantic tags for search
- `food_entries.food_category` - Category for classification
- `foods.diet_color` - Pre-classified colors for master food database
- `foods.health_score` - Optional 0-10 health rating

**New tables created**:
- `diet_classification_rules` - Rules for auto-classifying foods (15+ default rules)

**New functions**:
- `classify_food_color()` - Auto-classifies based on category, tags, nutrition
- `search_similar_foods()` - Semantic search (future: with embeddings)

**New views**:
- `daily_food_colors` - Daily color distribution summary

### 2. TypeScript Types Updated (`src/types/supabase.ts`)

- Added `DietColor` type: `"green" | "yellow" | "red" | "neutral"`
- Extended `food_entries` Row/Insert/Update types with new fields
- Added `diet_classification_rules` table types

### 3. New Service (`src/services/FoodClassificationService.ts`)

Methods:
- `classifyFood()` - Classify a food item
- `getDailyColorDistribution()` - Get today's green/yellow/red counts
- `calculateColorScore()` - 0-100 balance score
- `getColorBalanceSuggestions()` - Personalized tips
- `findGreenAlternatives()` - Suggest healthier swaps

### 4. New UI Component (`src/components/food/ColorCodedFoodCard.tsx`)

- **ColorCodedFoodCard** - Food entry card with color indicator
- **ColorDistributionBar** - Daily balance visualization

---

## Setup Instructions

### Step 1: Run the Database Migration

You need to apply the SQL migration to your Supabase database.

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. Copy the entire contents of `/home/user/workspace/database/migrations/0001_food_color_classification.sql`
5. Paste into the SQL editor
6. Click **Run** (bottom right)
7. Verify success - you should see "Success. No rows returned"

**Option B: Via Supabase CLI** (if you have it installed)

```bash
cd /home/user/workspace
supabase db push
```

### Step 2: Verify Migration Success

Run this query in SQL Editor to check:

```sql
-- Check that new columns exist
SELECT diet_color, tags, food_category
FROM food_entries
LIMIT 1;

-- Check that rules were inserted
SELECT COUNT(*) FROM diet_classification_rules;
-- Should return 15 or more

-- Check that classification function works
SELECT classify_food_color(
  'vegetable',
  ARRAY['leafy'],
  25, -- calories
  3,  -- protein
  5,  -- carbs
  0,  -- fat
  3,  -- fiber
  2   -- sugar
);
-- Should return 'green'
```

### Step 3: Test the Classification Service

You can test it immediately without changing any UI:

```typescript
import { FoodClassificationService } from "@/services/FoodClassificationService";

// Test classification
const result = await FoodClassificationService.classifyFood({
  foodCategory: "vegetable",
  tags: ["leafy", "organic"],
  caloriesPer100g: 25,
  proteinPer100g: 3,
  fiberPer100g: 3,
});

console.log(result.data); // Should be "green"

// Get today's color distribution
const { data: userId } = await supabase.auth.getUser();
const distribution = await FoodClassificationService.getDailyColorDistribution(
  userId.user.id
);

console.log(distribution);
/*
{
  green: { count: 5, calories: 400 },
  yellow: { count: 2, calories: 300 },
  red: { count: 1, calories: 250 },
  neutral: { count: 0, calories: 0 }
}
*/
```

---

## Usage in Your App

### Option 1: Update FoodScreen to Use Color-Coded Cards

Replace existing food entry cards with the new ColorCodedFoodCard:

```typescript
// In FoodScreen.tsx or wherever you display food entries
import { ColorCodedFoodCard } from "@/components/food/ColorCodedFoodCard";

{foodEntries.map((entry) => (
  <ColorCodedFoodCard
    key={entry.id}
    name={entry.name}
    serving={entry.serving}
    calories={entry.calories}
    protein={entry.protein}
    carbs={entry.carbs}
    fat={entry.fat}
    dietColor={entry.diet_color}
    mealType={entry.meal_type}
    onPress={() => handleEditEntry(entry)}
    showColorLabel={true}
  />
))}
```

### Option 2: Add Color Distribution Dashboard Widget

Show users their daily balance:

```typescript
import { ColorDistributionBar } from "@/components/food/ColorCodedFoodCard";
import { FoodClassificationService } from "@/services/FoodClassificationService";

const [distribution, setDistribution] = useState(null);

useEffect(() => {
  async function loadDistribution() {
    const { data } = await FoodClassificationService.getDailyColorDistribution(
      userId
    );
    setDistribution(data);
  }
  loadDistribution();
}, [userId]);

// In your render:
{distribution && <ColorDistributionBar distribution={distribution} />}
```

### Option 3: Auto-Classify When Logging Food

Update FoodService to auto-classify new entries:

```typescript
// In FoodService.ts, in createFoodEntry method:
import { FoodClassificationService } from "./FoodClassificationService";

static async createFoodEntry(userId: string, input: CreateFoodEntryInput) {
  // ... existing code ...

  // Auto-classify the food
  const { data: dietColor } = await FoodClassificationService.classifyFood({
    foodCategory: input.food_category,
    tags: input.tags,
    caloriesPer100g: (input.calories / input.quantity_g) * 100,
    proteinPer100g: ((input.protein || 0) / input.quantity_g) * 100,
    carbsPer100g: ((input.carbs || 0) / input.quantity_g) * 100,
    fatPer100g: ((input.fat || 0) / input.quantity_g) * 100,
    fiberPer100g: ((input.fiber || 0) / input.quantity_g) * 100,
  });

  const entry: FoodEntryInsert = {
    user_id: userId,
    name: input.name,
    serving: input.serving,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    fiber: input.fiber,
    meal_type: input.meal_type,
    diet_color: dietColor || "neutral",  // <-- Add this
    tags: input.tags,                     // <-- Add this
    food_category: input.food_category,   // <-- Add this
  };

  // ... rest of insert logic ...
}
```

---

## Customization

### Add Custom Classification Rules

Add your own rules via Supabase SQL Editor:

```sql
-- Example: Mark anything with "keto" tag as green
INSERT INTO diet_classification_rules (
  rule_name,
  diet_color,
  tag_pattern,
  priority
) VALUES (
  'keto_friendly',
  'green',
  'keto',
  120  -- Higher priority than default rules
);

-- Example: Mark anything over 500 calories per 100g as red
INSERT INTO diet_classification_rules (
  rule_name,
  diet_color,
  nutrient_criteria,
  priority
) VALUES (
  'very_high_calorie',
  'red',
  '{"calorie_min": 500}',
  125
);
```

### Adjust Color Palette

Edit the COLORS constant in `FoodClassificationService.ts`:

```typescript
static readonly COLORS = {
  green: {
    primary: "#YOUR_COLOR",
    light: "#YOUR_COLOR",
    dark: "#YOUR_COLOR",
    text: "#YOUR_COLOR",
  },
  // ... etc
};
```

---

## Rollback Instructions

If you need to remove this feature:

```sql
-- Remove new columns (data in other columns is safe)
ALTER TABLE food_entries
DROP COLUMN IF EXISTS diet_color,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS food_category,
DROP COLUMN IF EXISTS ai_classification_confidence;

ALTER TABLE foods
DROP COLUMN IF EXISTS diet_color,
DROP COLUMN IF EXISTS health_score;

ALTER TABLE food_logs
DROP COLUMN IF EXISTS diet_color,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS embedding;

-- Drop new objects
DROP VIEW IF EXISTS daily_food_colors;
DROP FUNCTION IF EXISTS search_similar_foods;
DROP FUNCTION IF EXISTS classify_food_color;
DROP FUNCTION IF EXISTS trigger_classify_food CASCADE;
DROP TABLE IF EXISTS diet_classification_rules;
DROP TYPE IF EXISTS diet_color;
DROP EXTENSION IF EXISTS vector;
```

---

## Next Steps (Optional Future Enhancements)

1. **Semantic Search with Embeddings**
   - Generate embeddings for food descriptions
   - Enable "find similar protein-rich breakfasts" queries
   - Requires OpenAI API to generate embeddings

2. **Personalized Rules**
   - Let users create custom color rules
   - E.g., "I'm low-carb, so bread is red for me"

3. **Smart Swap Suggestions**
   - When user logs red food, suggest green alternatives
   - "Try grilled chicken (green) instead of fried chicken (red)"

4. **Coach Integration**
   - Have AI coaches comment on color balance
   - "Great job! 80% green foods today!"

---

## FAQ

**Q: Will this break my existing food entries?**
A: No. The migration only **adds** columns with safe defaults. All existing data remains intact.

**Q: What if a food doesn't match any rule?**
A: It gets classified as "neutral" (gray). You can add custom rules to cover more foods.

**Q: Can I reclassify foods manually?**
A: Yes! Just update the `diet_color` column:
```sql
UPDATE foods SET diet_color = 'green' WHERE name = 'Dark Chocolate';
```

**Q: Does this slow down food logging?**
A: No. Classification happens automatically via database trigger. Your app just reads the pre-computed color.

**Q: Can I use different categories than Green/Yellow/Red?**
A: The enum is set to those 4 colors in the migration. To change it, you'd need to alter the enum type in SQL.

---

## Support

If you encounter issues:

1. Check the Supabase logs: Dashboard → Logs → Postgres Logs
2. Verify migration ran: `SELECT * FROM diet_classification_rules LIMIT 5;`
3. Test classification function directly in SQL Editor
4. Check TypeScript compilation errors in terminal

---

## Summary

**What you get:**
- ✅ Automatic food color classification (no manual tagging needed)
- ✅ Visual color indicators in food logging
- ✅ Daily balance score and suggestions
- ✅ Competitive feature parity with Noom/MyFitnessPal

**What's next:**
- Run the migration (5 minutes)
- Test the service (5 minutes)
- Update one screen to use ColorCodedFoodCard (15 minutes)
- **Total time: ~25 minutes to ship this feature**


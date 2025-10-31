# 🚀 DEPLOY NOW - 5 MINUTE GUIDE

## Your Supabase Project
**Project ID:** `lxajnrofkgpwdpodjvkm`

---

## OPTION 1: Supabase Dashboard (Easiest - 5 min)

### Step 1: Open SQL Editor
🔗 **Click here:** https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/sql/new

### Step 2: Copy Migration SQL
📂 **File location:** `/home/user/workspace/database/migrations/0001_food_color_classification.sql`

**Copy command:**
```bash
cat database/migrations/0001_food_color_classification.sql
```

### Step 3: Paste & Run
1. Paste the SQL into the editor
2. Click **"Run"** button (bottom right)
3. Wait ~10 seconds

### Step 4: Verify Success
Run this query in the SQL editor:
```sql
SELECT COUNT(*) FROM diet_classification_rules;
```
✅ Should return: **15 or more rows**

Test classification:
```sql
SELECT classify_food_color('vegetable', ARRAY['leafy'], 25, 3, 5, 0, 3, 2);
```
✅ Should return: **'green'**

---

## OPTION 2: psql CLI (If you have DB password)

```bash
psql -h db.lxajnrofkgpwdpodjvkm.supabase.co \
     -U postgres \
     -d postgres \
     -f database/migrations/0001_food_color_classification.sql
```

---

## ✅ After Migration Success

Your app automatically gets:
- 🟢 Green foods (vegetables, lean proteins)
- 🟡 Yellow foods (moderate, track portions)
- 🔴 Red foods (occasional treats)
- Auto-classification on every food entry
- Daily balance scoring

**Restart dev server:**
```bash
bun start
```

---

## 🎨 Optional: Show Colors in UI

Add to any food list screen:

```typescript
import { ColorCodedFoodCard } from "@/components/food/ColorCodedFoodCard";

<ColorCodedFoodCard
  name={entry.name}
  serving={entry.serving}
  calories={entry.calories}
  protein={entry.protein}
  carbs={entry.carbs}
  fat={entry.fat}
  dietColor={entry.diet_color}
  mealType={entry.meal_type}
/>
```

Add to dashboard:

```typescript
import { ColorDistributionBar } from "@/components/food/ColorCodedFoodCard";
import { FoodClassificationService } from "@/services/FoodClassificationService";

const [distribution, setDistribution] = useState(null);

useEffect(() => {
  async function load() {
    const { data } = await FoodClassificationService.getDailyColorDistribution(userId);
    setDistribution(data);
  }
  load();
}, [userId]);

{distribution && <ColorDistributionBar distribution={distribution} />}
```

---

## 🎉 DONE!

You now have a feature that apps charge $59-80/year for, completely free!

**Questions?** Check `SUNDAY_RELEASE_READY.md` for full details.

# ✅ Settings Screen - Food Color Personalization

**Status:** ✅ FULLY EDITABLE - Users can update all fields that affect food colors

---

## What You Can Edit in Settings

The SettingsScreen at `src/screens/profile/SettingsScreen.tsx` already has **full editing capabilities** for all fields that affect food color ratings:

### ✅ **Diet Type** (Directly Affects Food Colors)
**Location:** Settings → Goals & Activity → Diet Type

**Options:**
- None
- Vegetarian
- Vegan
- Pescatarian
- Keto
- Paleo
- Mediterranean

**How It Works:**
- Tap "Diet Type" field
- Select from picker
- Save
- **All future food entries get personalized colors based on this diet**

**Example Impact:**
- **Set to Vegan** → Chicken becomes 🔴 RED
- **Set to Keto** → Rice becomes 🔴 RED, Avocado becomes 🟢 GREEN
- **Set to Paleo** → Grains become 🔴 RED, Meat stays 🟢 GREEN

### ✅ **Primary Goal** (Affects Food Colors)
**Location:** Settings → Goals & Activity → Primary Goal

**Options:**
- Lose Weight (extra strict on calorie-dense foods)
- Gain Muscle (prioritizes high protein)
- Maintain
- Get Healthy

**How It Works:**
- Tap "Primary Goal" field
- Select from picker
- Save
- **Food colors adjust based on goal priority**

### ✅ **Other Editable Fields** (Affect Nutrition Goals)

**Basic Information:**
- Age
- Gender

**Physical Metrics:**
- Height (cm/kg or ft/lbs toggle)
- Current Weight
- Target Weight

**Activity:**
- Activity Level (sedentary → extremely active)

**Auto-Calculated (Not Editable):**
- Daily Calories
- Daily Protein
- Daily Carbs
- Daily Fat

---

## How Food Color Personalization Works

### User Flow:

1. **User edits diet_type in Settings** (e.g., changes from "None" to "Keto")
2. **Profile is saved** to `profiles` table with new `diet_type`
3. **User logs food** (e.g., "Chicken breast")
4. **Trigger fires:** `auto_classify_food_entry()`
5. **Function calls:** `classify_food_color_personalized(user_id, nutrients)`
6. **Function queries:** User's `diet_type` = "keto"
7. **Applies keto-specific rules:**
   - Chicken breast (high protein, low carb) → matches "Keto: Lean Proteins" rule → 🟢 GREEN
8. **Food entry saved** with `diet_color = 'green'`
9. **UI displays** colored food card with green border and 🟢

### Visual Feedback in Settings:

After your edit, there's now a helpful info box under Diet Type that says:

> 🎨 Your diet type affects food color ratings (🟢🟡🔴). Foods are personalized to match your chosen diet!

---

## What Happens When User Changes Diet Type

### Scenario: User switches from "None" to "Vegan"

**Before (Generic Rules):**
- Chicken breast: 🟢 GREEN (lean protein - good for everyone)
- Rice: 🔴 RED (refined carbs - generally avoid)
- Lentils: 🟢 GREEN (protein + fiber - good for everyone)

**After (Vegan-Specific Rules):**
- Chicken breast: 🔴 RED (violates vegan diet)
- Rice: 🟡 YELLOW (ok for vegans, energy source)
- Lentils: 🟢 GREEN (perfect vegan protein)

**User Experience:**
1. User taps Settings
2. Taps "Diet Type" → sees "None"
3. Selects "Vegan" from picker
4. Taps Save
5. Goes to Food screen
6. Logs "Chicken breast"
7. Sees 🔴 RED border and "Avoid this" label
8. **Now knows chicken doesn't fit their diet!**

---

## Testing the Personalization

### How to Verify It's Working:

1. **Open Settings screen**
2. **Check current diet type** (Goals & Activity → Diet Type)
3. **Change diet type** (e.g., None → Keto)
4. **Save**
5. **Go to Food screen**
6. **Log a food** (e.g., "Avocado")
7. **See colored border** based on your diet:
   - Keto diet: Avocado = 🟢 GREEN (high fat, low carb - perfect!)
   - Weight loss: Avocado = 🟡 YELLOW (calorie-dense - use moderation)

---

## Files Modified

**Settings Screen:**
- ✅ `src/screens/profile/SettingsScreen.tsx` - Added info box explaining food color personalization

**Already Functional:**
- ✅ Diet type picker (line 320-322)
- ✅ Primary goal picker (line 314-316)
- ✅ ProfileUpdateService saves to database
- ✅ Food classification system reads from database

---

## What About Allergens?

**Current State:**
The backend already supports allergen filtering! The `classify_food_color_personalized()` function checks `user_diet_preferences.allergies` and automatically marks foods RED if they match.

**Not Yet in UI:**
- Allergen management UI not yet in Settings screen
- But the data structure exists in database (`user_diet_preferences` table has `allergies` column)

**Quick Add (Optional):**
Could add an "Allergies" section in Settings that lets users manage their allergen list. Any food matching an allergen tag would automatically become 🔴 RED.

---

## Summary

### ✅ What Works RIGHT NOW:

1. **SettingsScreen is fully functional** for editing:
   - ✅ Diet Type (keto, vegan, paleo, vegetarian, mediterranean)
   - ✅ Primary Goal (lose weight, gain muscle, maintain)
   - ✅ Age, Gender, Height, Weight, Activity Level

2. **Food color personalization works** based on:
   - ✅ User's diet_type
   - ✅ User's primary_goal
   - ✅ User's allergies (backend ready, UI not yet)

3. **Visual feedback added:**
   - ✅ Info box explaining that diet type affects food colors

### 🎯 User Can:

- ✅ Change their diet type in Settings
- ✅ See their food colors automatically personalize
- ✅ Know why foods are colored based on their diet
- ✅ Edit all profile fields that affect nutrition goals
- ✅ See auto-calculated nutrition targets update

### Status: Ready for use! 🚀

Users can now edit their diet type and primary goal in Settings, and all food entries will be automatically color-coded to match their personal diet and goals.

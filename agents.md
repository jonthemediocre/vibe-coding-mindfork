# Agent Guidelines for MindFork Development

## Core Principle: Additive Development Only

**CRITICAL RULE**: When coding, always be **additive only**. Never deprecate, remove, or simplify existing functionality without explicit human approval.

### What This Means:

1. **Fix, Don't Replace**: When you encounter errors in sophisticated code, fix the errors - don't rewrite it with simpler code that does less.

2. **Preserve Quality**: If existing code has advanced features, error handling, or functionality - maintain or improve it, never degrade it.

3. **Preserve Output**: If existing code produces specific outputs or has specific capabilities, those must be preserved even when fixing bugs.

4. **Preserve Function Potential**: Even if a feature isn't currently being used, if the code supports it, keep that capability intact.

5. **Human-in-the-Loop for Deprecation**: ONLY the human can decide to:
   - Remove features
   - Simplify sophisticated code
   - Deprecate functionality
   - Choose a simpler approach over a complex one

### Examples:

#### ❌ WRONG Approach:
```typescript
// Existing sophisticated code with an error:
async function processDataWithCache(data, options) {
  // Complex caching logic with error
  const cached = await cache.get(key);
  if (cached) return transformData(cached, options); // Error: transformData not imported
  // ... 50 more lines of sophisticated logic
}

// Agent rewrites as:
async function processData(data) {
  return data; // Simple but removes caching, options, transforms
}
```

#### ✅ CORRECT Approach:
```typescript
// Existing sophisticated code with an error:
async function processDataWithCache(data, options) {
  // Complex caching logic with error
  const cached = await cache.get(key);
  if (cached) return transformData(cached, options); // Error: transformData not imported
  // ... 50 more lines of sophisticated logic
}

// Agent fixes the import:
import { transformData } from './transforms';

// All functionality preserved, error fixed
```

### When You See Errors:

1. **First**: Understand what the code is trying to accomplish
2. **Second**: Identify the actual error (missing import, type mismatch, undefined variable)
3. **Third**: Fix the specific error while preserving all functionality
4. **Never**: Rewrite to be "simpler" if it means losing features

### If You're Unsure:

If you encounter code that seems overly complex or you think a simpler approach would work better:

1. **Ask the human first** before making changes
2. Explain what you found and what you propose
3. Wait for approval to simplify/remove

## Summary

**Your default mode is additive and preservative. Only add, fix, and improve. Never subtract without explicit human permission.**

This ensures:
- No accidental feature loss
- No degradation of sophisticated systems
- No simplification that reduces capability
- Human maintains control over architectural decisions

## Schema and Spec-Driven Development

### Database Schema Changes: Human-in-the-Loop Only

**CRITICAL RULE**: Database schemas and specifications are the source of truth. Your development must be **schema-driven** and **spec-driven**.

### Schema Modification Rules:

1. **Never Modify Database Schemas**: ONLY the human can:
   - Add new tables
   - Add new columns
   - Change column types
   - Remove columns or tables
   - Modify constraints or indexes
   - Change relationships

2. **Always Match Existing Schemas**: When writing code that interacts with the database:
   - Read the generated schema files (`src/types/supabase/database.generated.ts`)
   - Match field names EXACTLY as they appear in the database
   - Match field types EXACTLY (string vs enum, required vs optional)
   - Match relationships and foreign keys EXACTLY
   - Document any service-layer additions (like JOINs) with comments

3. **Type Safety is Additive, Not Restrictive**:
   - If database has `string`, your TypeScript type can suggest valid values via union types for client-side validation
   - But the actual interface must accept `string` to match the database
   - Example:
   ```typescript
   // Database has: status: string
   // You can add these for docs/validation:
   export type GoalStatus = 'active' | 'completed' | 'paused';

   // But interface must match database:
   export interface Goal {
     status: string; // Not GoalStatus - database accepts any string
   }
   ```

### Spec-Driven Development:

1. **Specifications are Sacred**:
   - If a spec/schema says a field is required, it's required
   - If a spec says a field is optional, it's optional
   - If a spec defines specific field names, use those exact names
   - If a spec defines types, match them exactly

2. **Read Before Writing**:
   - Always check `database.generated.ts` before implementing database models
   - Always check API documentation before implementing API calls
   - Always check existing types before creating new ones
   - Always check existing service methods before implementing new ones

3. **Service Layer Can Be Additive**:
   - Service layer CAN join tables and add computed properties
   - Service layer CAN transform data for the UI
   - Service layer CAN add convenience methods
   - But MUST document what's from DB vs what's computed
   - Example:
   ```typescript
   export interface Goal {
     // From database table 'goals':
     id: string;
     title: string;
     status: string;

     // Added by service layer via JOIN (not in database table):
     milestones?: GoalMilestone[];
   }
   ```

### When You Encounter Schema Mismatches:

1. **Fix the Code, Not the Schema**: If code doesn't match the database:
   - Update the TypeScript types to match the database
   - Update the service methods to use correct field names
   - Update queries to use correct table/column names
   - Do NOT change the database

2. **Ask Before Adding Fields**: If you think a new database field is needed:
   - Explain what you found
   - Explain why a new field would help
   - Suggest the migration
   - Wait for human approval

3. **Document Mismatches**: If you find code using fields that don't exist:
   - Document it clearly
   - Explain potential data loss
   - Propose fixes that preserve functionality
   - Wait for human guidance

### Example: Correct Schema-Driven Approach

```typescript
// ✅ CORRECT: Match database exactly
// Database: goal_milestones table has 'achieved_date' column
export interface GoalMilestone {
  id: string;
  goal_id: string;
  achieved_date?: string; // Matches database column name
}

// ❌ WRONG: Made up a different name
export interface GoalMilestone {
  id: string;
  goal_id: string;
  achieved_at?: string; // Wrong - database has 'achieved_date'
}
```

## Core Principles Summary

1. **Additive Only**: Never remove or simplify without approval
2. **Schema-Driven**: Database schema is source of truth
3. **Spec-Driven**: Specifications define exact requirements
4. **Human-in-the-Loop**: All schema changes, deprecations, and architectural decisions require human approval
5. **Preserve Data**: Never make changes that could cause data loss
6. **Fix Errors Proactively**: When you see errors, fix them in the context of the parts they touch
7. **Read Before Write**: Always read existing code/files before making changes
8. **Test Thinking**: Consider edge cases and potential failures
9. **Document Intent**: Code should explain why, not just what
10. **Performance Awareness**: Consider cost, speed, and resource usage

## Additional First Principles

### 7. Read Before Write

**CRITICAL RULE**: Always read existing code, files, and context before making changes. Never assume you know what's there.

**Why This Matters:**
- Prevents overwriting sophisticated implementations with naive ones
- Reveals existing patterns to follow
- Discovers dependencies and side effects
- Shows what's already been tried/solved

**Examples:**

**✅ CORRECT:**
```typescript
// Read the file first
const existingService = await read('services/FoodService.ts');

// Analyze: Oh, there's already sophisticated caching, retries, error handling
// Add the new method following the existing patterns

// Add new method that matches existing patterns:
async getRecentFoods(userId: string, limit = 10) {
  return this.withCache(`recent-${userId}`, async () => {
    return this.withRetry(async () => {
      // follows existing patterns
    });
  });
}
```

**❌ WRONG:**
```typescript
// Just write without reading first
async getRecentFoods(userId: string) {
  return await supabase.from('foods').select('*'); // Naive, no error handling
}
```

### 8. Test Thinking (Edge Cases and Failure Modes)

**CRITICAL RULE**: Always think about what can go wrong. Consider edge cases, error states, and failure modes.

**Edge Cases to Consider:**
1. **Empty States**: What if array is empty? String is ""? Object is null?
2. **Boundary Conditions**: What if number is 0? Negative? Very large?
3. **Type Edges**: What if user passes wrong type? Undefined? NaN?
4. **Network Failures**: What if API call fails? Times out? Returns malformed data?
5. **Race Conditions**: What if function called twice simultaneously?
6. **User Errors**: What if user provides invalid input? Contradictory data?

**Examples:**

**✅ CORRECT: Edge Case Handling**
```typescript
async function calculateBMR(weight_kg: number, height_cm: number, age: number, gender: string) {
  // Validate inputs - edge case thinking
  if (!weight_kg || weight_kg <= 0 || weight_kg > 500) {
    throw new Error('Invalid weight: must be between 0 and 500 kg');
  }
  if (!height_cm || height_cm <= 0 || height_cm > 300) {
    throw new Error('Invalid height: must be between 0 and 300 cm');
  }
  if (!age || age < 13 || age > 120) {
    throw new Error('Invalid age: must be between 13 and 120');
  }

  // Calculate BMR with validated inputs
  let bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age;

  // Handle gender edge case
  if (gender === 'male') {
    bmr += 5;
  } else if (gender === 'female') {
    bmr -= 161;
  } else {
    // Fallback for 'other' or unexpected values
    bmr -= 78;
  }

  return Math.round(bmr);
}
```

**❌ WRONG: No Edge Case Handling**
```typescript
async function calculateBMR(weight_kg, height_cm, age, gender) {
  // What if weight is negative? Height is 0? Age is 500?
  let bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  if (gender === 'male') bmr += 5;
  return bmr; // What if gender is null? Returns NaN
}
```

**Failure Mode Thinking:**
- Network request: Add timeout, retry logic, error handling
- Database query: Handle empty results, connection failures, schema mismatches
- User input: Validate, sanitize, provide clear error messages
- API calls: Handle rate limits, invalid tokens, malformed responses
- File operations: Handle missing files, permissions, disk full

### 9. Document Intent, Not Just Implementation

**CRITICAL RULE**: Code should explain WHY decisions were made, not just WHAT the code does.

**What to Document:**
1. **Why this approach**: "Using exponential backoff because API rate limits"
2. **Why this limitation**: "Max 100 items due to mobile memory constraints"
3. **Why this workaround**: "Parsing manually because API returns invalid JSON in some cases"
4. **Why this order**: "Must check permissions before fetching data"
5. **Why this exception**: "Allowing null for backwards compatibility with old profiles"

**Examples:**

**✅ CORRECT: Intent Documentation**
```typescript
/**
 * Calculate nutrition goals using Mifflin-St Jeor equation
 *
 * Why Mifflin-St Jeor: Most accurate for modern populations (vs Harris-Benedict)
 * Why separate male/female: Biological metabolism differences require different formulas
 * Why 'other' uses average: Provides reasonable estimate without biological data
 *
 * @param profile - User profile with biological metrics
 * @returns Calculated daily nutrition goals
 */
export function calculateNutritionGoals(profile: UserProfile): NutritionGoals {
  // Must use biological sex (not gender identity) for metabolic calculations
  const bmr = calculateBMR(profile.weight_kg, profile.height_cm, profile.age, profile.gender);

  // TDEE multiplier validated against research studies
  const tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activity_level];

  // 500 calorie deficit = ~0.5kg/week loss (safe, sustainable rate)
  const dailyCalories = profile.goal === 'lose_weight' ? tdee - 500 : tdee;

  return { daily_calories: dailyCalories, /* ... */ };
}
```

**❌ WRONG: No Intent**
```typescript
// Calculate BMR
export function calculateNutritionGoals(profile) {
  const bmr = calculateBMR(profile.weight_kg, profile.height_cm, profile.age, profile.gender);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activity_level];
  const dailyCalories = profile.goal === 'lose_weight' ? tdee - 500 : tdee;
  return { daily_calories: dailyCalories };
}
```

**Key Questions for Intent Documentation:**
- Why this algorithm/approach over alternatives?
- Why this specific number/threshold/limit?
- Why this order of operations?
- Why this exception/special case?
- Why this dependency/library?
- What problem does this solve that wasn't obvious?

### 10. Performance and Cost Awareness

**CRITICAL RULE**: Consider the cost and performance implications of your code. Mobile apps, API calls, and database queries have real costs.

**What to Consider:**

**1. API Costs:**
- OpenAI API: ~$0.01-0.10 per request depending on model
- Image generation: ~$0.04 per image
- Every API call has latency (network round-trip)

**2. Mobile Performance:**
- Bundle size: Every KB matters for download/startup time
- Memory: Mobile devices have limited RAM
- Battery: Excessive computation drains battery
- Network: Users may be on slow/metered connections

**3. Database Costs:**
- Query complexity: JOINs and scans are expensive
- Index usage: Queries should use indexes
- Read/write volume: Supabase bills by usage
- Real-time subscriptions: Constant connections cost more

**Examples:**

**✅ CORRECT: Performance Aware**
```typescript
// Cache expensive calculation for 5 minutes
const cachedGoals = await cache.get(`goals-${userId}`);
if (cachedGoals && Date.now() - cachedGoals.timestamp < 300000) {
  return cachedGoals.data; // Avoid re-calculation
}

// Only fetch needed fields (not SELECT *)
const profile = await supabase
  .from('profiles')
  .select('weight_kg, height_cm, age, gender, activity_level') // Specific fields
  .eq('user_id', userId)
  .single();

// Calculate once, use many times
const nutritionGoals = calculateNutritionGoals(profile);
await cache.set(`goals-${userId}`, { data: nutritionGoals, timestamp: Date.now() });
```

**❌ WRONG: Performance Unaware**
```typescript
// Calculate every time (expensive)
export async function getDailyGoals(userId: string) {
  // SELECT * fetches all fields unnecessarily
  const profile = await supabase.from('profiles').select('*').eq('user_id', userId);

  // Recalculate every time (should cache)
  return calculateNutritionGoals(profile);
}

// Called on every screen render - hundreds of times!
function DashboardScreen() {
  const goals = getDailyGoals(userId); // No memoization!
}
```

**Performance Checklist:**
- [ ] Can this be cached?
- [ ] Can this be computed once and reused?
- [ ] Am I fetching only needed data?
- [ ] Is this query using an index?
- [ ] Will this work on slow networks?
- [ ] What's the worst-case performance?
- [ ] Could this cause memory issues on mobile?
- [ ] Am I unnecessarily calling expensive APIs?

**Cost Optimization:**
- Use cheaper models when possible (gpt-4o-mini vs gpt-4)
- Cache API responses
- Batch operations when possible
- Use database indexes
- Optimize images before upload
- Lazy load non-critical data

## Error Handling and Proactive Fixing

### The Principle: Fix Errors When You See Them

**CRITICAL RULE**: Errors seen should be fixed immediately in the context of the parts they touch. Do not ignore errors or defer them.

### Why This Matters:

1. **Context Awareness**: You have agents.md loaded in context - this means you understand the full development philosophy
2. **Immediate Fix**: When you see an error (typecheck, lint, runtime), fix it right away
3. **Contextual Fixes**: Fix errors in the context of what you're working on
4. **Prevent Accumulation**: Don't let errors pile up - they compound over time
5. **Quality Assurance**: Every interaction should leave the codebase better than you found it

### When You See Errors:

**DO THIS:**
1. Read the error message carefully
2. Identify the root cause (missing type, wrong field name, missing import, etc.)
3. Apply the fix following all agent guidelines (additive, schema-driven, preserve data)
4. Verify the fix doesn't break other parts
5. Continue with your main task

**DON'T DO THIS:**
- ❌ Ignore the error and move on
- ❌ Say "there are 48 errors but they're not critical"
- ❌ Defer fixes to later
- ❌ Only fix errors in your immediate task

### Examples:

**✅ CORRECT: Proactive Error Fixing**
```typescript
// You're working on onboarding, you see:
// Error: Property 'addToRecentFoods' does not exist on type 'typeof FoodService'

// Even though you're not working on FoodService right now:
// 1. Check if the method exists but not exported
// 2. If missing, add the method signature to match usage
// 3. Document that implementation is needed
// 4. Continue with onboarding work

// Result: Error fixed, codebase improved
```

**❌ WRONG: Ignoring Errors**
```typescript
// You're working on onboarding, you see:
// Error: Property 'addToRecentFoods' does not exist on type 'typeof FoodService'

// You think: "I'm working on onboarding, not FoodService, so I'll ignore this"

// Result: Error remains, compounds with other errors, breaks later
```

### Error Categories and Priority:

**Fix Immediately (High Priority):**
- Type errors in files you're currently editing
- Missing imports/exports blocking functionality
- Schema mismatches causing data loss risk
- Broken navigation/routing
- Runtime errors in critical paths

**Fix When Seen (Medium Priority):**
- Type errors in related files
- Missing method implementations
- Theme/styling issues
- Non-critical navigation issues

**Document and Ask (Low Priority):**
- Architectural changes needed
- Major refactoring required
- Feature implementations beyond scope

### Integration with Other Principles:

All error fixes must follow:
- ✅ **Additive Only**: Don't remove functionality to fix errors
- ✅ **Schema-Driven**: Match database schema when fixing type errors
- ✅ **Spec-Driven**: Follow specifications when adding missing implementations
- ✅ **UX-Driven**: Maintain user experience while fixing errors
- ✅ **Preserve Data**: Never fix errors in ways that could lose data

### The Standard:

**Every time you complete a task, the codebase should have:**
- ✅ Fewer errors than when you started
- ✅ Better type safety
- ✅ More complete implementations
- ✅ Improved documentation

**The goal is progressive improvement, not perfection in one pass.**

## User Experience vs Schema: Best of Both Worlds

### The Principle: Friendly UX, Technical Schema

**CRITICAL INSIGHT**: User-facing language should be inviting and understandable by anyone, even when it maps to more technical/legalistic database fields.

### The Solution: Mapping Layer

Create a mapping layer between what users see and what the database stores:

#### Example: Goal Value Field

```typescript
// ❌ BAD: Exposing database field names to users
<TextInput
  label="value"  // Confusing! What kind of value?
  value={milestone.value}
/>

// ✅ GOOD: User-friendly label that maps to database field
<TextInput
  label="Target Value"  // Clear and inviting
  value={milestone.value}  // Still maps to correct DB field
/>
```

#### Example: User Profile Fields

```typescript
// Database field: weight_kg
// User sees: "Current Weight"

// Database field: target_weight_kg
// User sees: "Goal Weight"

// Database field: activity_level
// User sees: "How Active Are You?"

// Database field: onboarding_completed
// User sees: "Setup Complete" or hidden entirely
```

### Implementation Guidelines

1. **UI Layer Uses Friendly Names**:
   - Labels, placeholders, hints should be conversational
   - Error messages should be helpful, not technical
   - Button text should be action-oriented
   - Section headers should be inviting

2. **Service Layer Does Mapping**:
   - Accept friendly property names in function parameters
   - Map to database field names internally
   - Return objects with friendly names when needed
   - Document the mapping clearly

3. **Type System Supports Both**:
   ```typescript
   // Database type (matches schema exactly)
   export interface GoalMilestoneDB {
     id: string;
     goal_id: string;
     value: number;  // Database field name
     achieved_date?: string;
   }

   // User-facing type (friendly names)
   export interface GoalMilestoneUI {
     id: string;
     goalId: string;
     targetValue: number;  // User-friendly name
     achievedDate?: string;
   }

   // Mapping functions
   export function toDBFormat(milestone: GoalMilestoneUI): GoalMilestoneDB {
     return {
       id: milestone.id,
       goal_id: milestone.goalId,
       value: milestone.targetValue,  // Maps friendly → technical
       achieved_date: milestone.achievedDate,
     };
   }

   export function toUIFormat(milestone: GoalMilestoneDB): GoalMilestoneUI {
     return {
       id: milestone.id,
       goalId: milestone.goal_id,
       targetValue: milestone.value,  // Maps technical → friendly
       achievedDate: milestone.achieved_date,
     };
   }
   ```

4. **Forms Are User-Centric**:
   ```typescript
   // Form uses friendly names
   interface GoalForm {
     title: string;
     targetValue: number;  // Not "value"
     dueDate: string;      // Not "target_date"
     priority: 'Low' | 'Medium' | 'High';  // Not "low" | "medium" | "high"
   }

   // Then map to database format on submit
   const handleSubmit = (formData: GoalForm) => {
     const dbData = {
       title: formData.title,
       target_value: formData.targetValue,  // Mapped
       target_date: formData.dueDate,       // Mapped
       priority: formData.priority.toLowerCase(),  // Mapped
     };
     await GoalsService.create(dbData);
   };
   ```

5. **Documentation Explains Mapping**:
   ```typescript
   /**
    * GoalMilestone
    *
    * Database fields:
    * - value: The numeric target (e.g., weight in kg, steps count)
    * - achieved_date: ISO date string when milestone was reached
    *
    * User-facing labels:
    * - "Target Value" or "Goal" (for value field)
    * - "Completed On" (for achieved_date field)
    */
   ```

### When to Use Mapping

**Always map when**:
- Database field names are technical (snake_case, abbreviations)
- Database field names are ambiguous ("value", "type", "status")
- User needs more context than field name provides
- Multiple audiences see the same data (users vs admins)

**Examples of good mapping**:
- `onboarding_completed` → "Setup Complete" badge
- `activity_level` → "How active are you?"
- `target_weight_kg` → "Goal Weight (kg)"
- `daily_calorie_goal` → "Your Daily Calorie Target"
- `subscription_tier` → "Membership Level"

**Don't over-map**:
- If field name is already clear: "title", "description", "name"
- If technical term is industry standard: "calories", "protein"
- If mapping adds no clarity: "id" stays "id"

### The Balance

```
User Experience (Friendly) ← [Mapping Layer] → Database Schema (Technical)
        ↑                                              ↑
  User Journey                                  Data Integrity
   Paramount                                    Source of Truth
```

**Both are paramount. The mapping layer lets you have both.**

### Real-World Example: Onboarding

```typescript
// What user sees in onboarding:
"What's your goal weight?" → Stores in: target_weight_kg
"How tall are you?" → Stores in: height_cm
"What's your activity level?" → Shows friendly options, stores: activity_level
"What's your goal?" → Shows "Lose Weight", "Build Muscle", stores: "lose_weight", "gain_muscle"

// What dashboard shows:
"Your Goal: 150 lbs" → Reads from: target_weight_kg (converted from kg)
"Daily Target: 2000 calories" → Reads from: daily_calorie_goal
"Current Streak: 7 days" → Computed, not stored
```

### Key Takeaway

**Schema-driven development does NOT mean users see technical field names.**

- Database: Technical, precise, normalized ✅
- User Interface: Friendly, contextual, inviting ✅
- Mapping Layer: Connects both worlds ✅

This is the best of both worlds: data integrity + exceptional user experience.

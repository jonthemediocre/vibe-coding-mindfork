# ✅ User Goals RLS Policy Fix

## Issue
```
Goals save error: {"code":"42501","message":"new row violates row-level security policy for table \"user_goals\""}
```

## Root Cause
The `user_goals` table had RLS enabled with a single policy:
```sql
POLICY "Users can manage own goals"
  USING (auth.uid() = user_id)
```

**Problem**: This policy had no `WITH CHECK` clause, which means:
- ✅ SELECT/UPDATE/DELETE worked (used `USING` clause)
- ❌ INSERT failed (no `WITH CHECK` clause to validate new rows)

## Solution Applied

**Migration**: `supabase/migrations/20251103_fix_user_goals_rls_policy.sql`

Replaced the single incomplete policy with 4 specific policies:

### 1. INSERT Policy ✅
```sql
CREATE POLICY "Users can insert own goals"
  ON public.user_goals
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);
```
**Purpose**: Allows authenticated users to insert their own goals

### 2. SELECT Policy ✅
```sql
CREATE POLICY "Users can view own goals"
  ON public.user_goals
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);
```
**Purpose**: Allows users to view only their own goals

### 3. UPDATE Policy ✅
```sql
CREATE POLICY "Users can update own goals"
  ON public.user_goals
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
**Purpose**: Allows users to update only their own goals

### 4. DELETE Policy ✅
```sql
CREATE POLICY "Users can delete own goals"
  ON public.user_goals
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);
```
**Purpose**: Allows users to delete only their own goals

## Verification

After migration:
```
 policyname              | cmd    | qual                   | with_check
-------------------------+--------+------------------------+------------------------
 Users can delete own goals | DELETE | (auth.uid() = user_id) |
 Users can insert own goals | INSERT |                        | (auth.uid() = user_id)
 Users can update own goals | UPDATE | (auth.uid() = user_id) | (auth.uid() = user_id)
 Users can view own goals   | SELECT | (auth.uid() = user_id) |
```

## Requirements for Success

For the INSERT to work, the following must be true:

1. **User must be authenticated**: `auth.uid()` must return a valid UUID
2. **user_id must match**: The `user_id` field in the INSERT must equal `auth.uid()`

### Example Working Insert:
```typescript
// User must be signed in first
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  const { data, error } = await supabase
    .from('user_goals')
    .insert({
      user_id: user.id, // MUST match auth.uid()
      goal_type: 'lose_weight',
      daily_calorie_target: 2000,
      // ... other fields
    });
}
```

## Common Pitfalls

### ❌ Trying to insert before authentication:
```typescript
// This will fail with 42501 error
await supabase.from('user_goals').insert({ ... });
// No user authenticated yet!
```

### ❌ Using wrong user_id:
```typescript
await supabase.from('user_goals').insert({
  user_id: 'some-other-uuid', // Doesn't match auth.uid()
  // ... will fail!
});
```

### ✅ Correct approach:
```typescript
// 1. Authenticate user first
const { data: { user } } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});

// 2. Then insert with authenticated user's ID
if (user) {
  await supabase.from('user_goals').insert({
    user_id: user.id, // Matches auth.uid() ✅
    goal_type: 'lose_weight',
    // ...
  });
}
```

## Testing the Fix

To verify the fix works:

```typescript
import { supabase } from './lib/supabase';

// Test INSERT
async function testGoalsInsert() {
  // 1. Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ User not authenticated');
    return;
  }

  // 2. Try to insert a goal
  const { data, error } = await supabase
    .from('user_goals')
    .insert({
      user_id: user.id,
      goal_type: 'lose_weight',
      daily_calorie_target: 2000,
      activity_level: 'moderately_active',
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Insert failed:', error);
  } else {
    console.log('✅ Goal inserted successfully:', data);
  }
}
```

## For Sandbox AI

If you're building the onboarding flow, ensure:

1. **User signs up FIRST**:
```typescript
const { data: { user } } = await supabase.auth.signUp({
  email: userData.email,
  password: userData.password,
});
```

2. **Then create profile**:
```typescript
await supabase.from('profiles').insert({
  id: user.id,
  // ...
});
```

3. **Then create goals**:
```typescript
await supabase.from('user_goals').insert({
  user_id: user.id, // Use authenticated user's ID
  // ...
});
```

---

# ✅ Challenge Participants RLS Recursion Fix

## Issue
- Queries against `challenge_participants` raised `42P17: recursive definition` because the SELECT policy referenced the same table in its predicate.

## Root Cause
```sql
CREATE POLICY challenge_participants_select_policy ON public.challenge_participants
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.challenge_id = challenge_participants.challenge_id
        AND cp.user_id = auth.uid()
    )
  );
```

The self-referencing subquery caused PostgreSQL to re-apply the policy infinitely, producing the recursion error.

## Solution Applied
- **Migration**: `supabase/migrations/20251113_fix_challenge_participants_rls.sql`
- Dropped all legacy SELECT policies on `challenge_participants`.
- Added helper function executed as `SECURITY DEFINER` so it runs outside the RLS context:
  ```sql
  CREATE OR REPLACE FUNCTION public.can_view_challenge_participants(
    p_challenge_id UUID,
    p_viewer_id UUID
  ) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER;
  ```
- Function grants access when the viewer:
  1. Owns the row (participant),
  2. Created the challenge, or
  3. Challenge is public.
- Recreated SELECT policy to rely on the helper:
  ```sql
  CREATE POLICY challenge_participants_select_policy ON public.challenge_participants
    FOR SELECT
    USING (
      user_id = auth.uid()
      OR public.can_view_challenge_participants(challenge_id, auth.uid())
    );
  ```

## Verification
```sql
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'challenge_participants';

-- Should now succeed for valid participants/owners
SET request.jwt.claim.sub = '<user-id>';
SELECT * FROM public.challenge_participants LIMIT 5;
```

## Requirements for Success
1. Client must be authenticated (`auth.uid()` not null).
2. One of the helper conditions must be true (participant, challenge creator, or challenge marked public).

This removes the recursion, keeps unauthorized users locked out, and restores the challenges feed without frontend workarounds.

## Status

✅ **FIXED** - Migration applied successfully
✅ **4 Policies Created** - INSERT, SELECT, UPDATE, DELETE
✅ **RLS Enabled** - Row-level security active
✅ **Tested** - Policies verified in database

The `user_goals` table now has proper RLS policies for all operations!

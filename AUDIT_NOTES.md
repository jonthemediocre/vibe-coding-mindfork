# Codebase Audit - Known Issues & TypeScript Concerns

**Date:** 2025-11-02
**Target:** MindFork App - Bug and TypeScript Error Audit

---

## Critical Issues Found

### 1. TypeScript @ts-ignore in Supabase Client
**File:** `/home/user/workspace/src/lib/supabase.ts`
**Lines:** 8-11
**Severity:** HIGH

```typescript
// @ts-ignore - Import works at runtime
import { createClient } from "@supabase/supabase-js";
// @ts-ignore - Type import works at runtime
import type { AuthSession, AuthUser } from "@supabase/supabase-js";
```

**Issue:** Module resolution problem with @supabase/supabase-js. Suppressions indicate potential runtime issues.
**Action:** Verify Supabase version in package.json matches type definitions, or update type imports.

---

## Screen Components - Potential Issues

### DevToolsScreen.tsx
**File:** `/home/user/workspace/src/screens/DevToolsScreen.tsx`
**Severity:** MEDIUM

**Issues:**
1. Uses `Alert` component (lines 32-104) - per CLAUDE.md, should avoid alerts and use custom modals
2. Multiple `console.log()` calls throughout (lines 43, 63, 74, 165, 219, 225, 247, 253, etc.)
   - Per CLAUDE.md: "Communicate to the user by building descriptive error states, not through comments and console.logs()"
3. Lines 197-211: `__DEV__` conditional check - ensure this is properly typed
4. No error boundary for testing operations - could crash app if tests fail

**Recommendations:**
- Replace all Alerts with custom modal implementations
- Move console.logs to structured logger only
- Add error boundary around test execution
- Display test results in custom error/success states

### SignInScreen.tsx
**File:** `/home/user/workspace/src/screens/auth/SignInScreen.tsx`
**Lines:** 27-28
**Severity:** MEDIUM

```typescript
if (!email.trim() || !password.trim()) {
  Alert.alert("Missing information", "Please enter email and password.");
  return;
}
```

**Issue:** Uses `Alert.alert()` - should use custom modal per CLAUDE.md specifications

**Recommendations:**
- Replace with custom implemented modal
- Apply to all Alert calls in file (lines 36, 40)

### OnboardingScreen.tsx
**File:** `/home/user/workspace/src/screens/auth/OnboardingScreen.tsx`
**Lines:** 108, 151
**Severity:** MEDIUM

```typescript
Alert.alert('Validation Error', validation.errors.join('\n'));
Alert.alert('Error', 'Failed to save your profile. Please try again.');
```

**Issues:** Multiple Alert.alert() calls instead of custom modals

### CoachScreen.tsx
**File:** `/home/user/workspace/src/screens/coach/CoachScreen.tsx`
**Severity:** MEDIUM

**Issues:**
1. Heavy reliance on `useAgentStream()` hook - ensure TypeScript types are complete
2. Coach selection logic (lines 118-122) uses AsyncStorage - verify JSON serialization
3. `selectedCoach?.personality?.toLowerCase()` - potential null coalescing issue if personality is undefined
4. Line 102: `user.tier ? user.tier !== "free" : false` - could be simplified and more type-safe
5. Complex useMemo dependency (lines 144-152) - verify all dependencies captured

**Recommendations:**
- Add null checks for coach data
- Verify useAgentStream hook TypeScript types are complete
- Add error boundaries for streaming failures

---

## Component Issues

### PersonalizedDashboard.tsx
**File:** `/home/user/workspace/src/components/dashboard/PersonalizedDashboard.tsx`
**Severity:** LOW

**Potential Issues:**
- Heavy component likely has many database queries
- May not properly handle loading/error states for each sub-component
- Consider memoization to prevent unnecessary re-renders

### PhotoCaptureModal.tsx & PhotoOptionsModal.tsx
**File:** `/home/user/workspace/src/components/PhotoCaptureModal.tsx`
**Severity:** HIGH

**Issue:** Per CLAUDE.md note on camera handling:
- If using Camera from expo-camera, it's deprecated
- Must use `CameraView` from expo-camera instead
- Cannot use `className` on CameraView - must use inline `style` prop

**Action:** Verify implementation and update if necessary

### Marketplace Components
**File:** `/home/user/workspace/src/components/marketplace/*.tsx`
**Severity:** MEDIUM

**Issues:**
- PurchaseModal.tsx, RatingModal.tsx, AddPaymentMethodModal.tsx - should be custom modals, not standard UI modals
- Verify these don't use native Alert component for confirmations

---

## Service Files - Critical Audit Points

### AIFoodScanService.ts
**File:** `/home/user/workspace/src/services/AIFoodScanService.ts`
**Severity:** HIGH

**Concerns:**
1. Image analysis using Vision API - ensure images are not persisted in logs
2. HIPAA compliance - food data is potentially protected health info
3. No apparent encryption of image data in transit
4. Check if image URLs are properly sanitized

**Action:** Verify HIPAA compliance in image handling

### ProfileService.ts
**File:** `/home/user/workspace/src/services/ProfileService.ts`
**Severity:** MEDIUM

**Concerns:**
1. Likely handles sensitive user data (weight, goals, medical info)
2. Verify HIPAA compliance for all data writes
3. Check Row Level Security (RLS) policies on profiles table
4. DevToolsScreen references RLS policy issues (line 58)

### CoachContextService.ts
**File:** `/home/user/workspace/src/services/CoachContextService.ts`
**Severity:** MEDIUM

**Concerns:**
1. Builds comprehensive user data context for AI
2. May include sensitive health/nutrition data
3. Verify PII is not leaked to coach context
4. Check if context includes user ID, email, or other identifiers unnecessarily

### MetabolicAdaptationService.ts
**File:** `/home/user/workspace/src/services/MetabolicAdaptationService.ts`
**Severity:** HIGH

**Concerns:**
1. Complex algorithm for detecting metabolic changes
2. Requires 3+ weeks of consistent data (per DevToolsScreen line 335)
3. May not have sufficient data for accurate detection
4. Error handling for insufficient data unclear

---

## API Services - TypeScript Concerns

### chat-service.ts
**File:** `/home/user/workspace/src/api/chat-service.ts`
**Severity:** MEDIUM

**Issues:**
1. Lines 23-31: Timeout promise creation - TypeScript generic typing could be more specific
2. Lines 48-72: Error handling uses `error?.status` and `error?.statusCode` - loosely typed
3. Lines 90-98: Message mapping could fail silently if role is not "assistant" or "user"
4. Error types (AIServiceError, AITimeoutError, etc.) not fully defined in visible code

**Recommendations:**
- Strengthen error type definitions
- Add validation for message roles
- Add fallback error handling

### image-generation.ts & transcribe-audio.ts
**File:** `/home/user/workspace/src/api/`
**Severity:** MEDIUM

**Issue:** Uses CURL implementation per comment - may not have proper TypeScript types
- Verify request/response types are fully defined
- Ensure error handling is comprehensive

---

## Hooks - TypeScript & Logic Issues

### useCoachContext.ts
**File:** `/home/user/workspace/src/hooks/useCoachContext.ts`
**Severity:** MEDIUM

**Concerns:**
1. Complex hook with many dependencies
2. Likely builds large objects on every render
3. Need to verify memoization is correct
4. Check for Zustand infinite loop pattern (per CLAUDE.md)

**Issue Examples from CLAUDE.md:**
```typescript
// BAD - Creates new object every render
const state = useStore(s => ({ a: s.a, b: s.b }))

// GOOD - Use individual selectors
const a = useStore(s => s.a)
const b = useStore(s => s.b)
```

### useAgentStream.ts
**File:** `/home/user/workspace/src/hooks/useAgentStream.ts`
**Severity:** HIGH

**Concerns:**
1. Streaming API hook - ensure proper cleanup on unmount
2. Verify abort signals are properly handled
3. Check for memory leaks during long streams
4. Error states must be properly typed

---

## Context Issues

### AuthContext.tsx
**File:** `/home/user/workspace/src/contexts/AuthContext.tsx`
**Lines:** 50-63 (mapUser function)
**Severity:** MEDIUM

```typescript
function mapUser(supabaseUser: SupabaseUser | null | undefined): User | null {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name: (supabaseUser.user_metadata as Record<string, any>)?.name,
    avatar_url: (supabaseUser.user_metadata as Record<string, any>)?.avatar_url,
    phone_number: (supabaseUser.user_metadata as Record<string, any>)?.phone_number,
    email_confirmed_at: supabaseUser.email_confirmed_at ?? undefined,
    created_at: supabaseUser.created_at,
    updated_at: supabaseUser.updated_at ?? undefined,
    tier: (supabaseUser.user_metadata as Record<string, any>)?.subscription_tier,
  };
}
```

**Issues:**
1. Multiple `as Record<string, any>` type assertions - should be proper types
2. user_metadata structure not type-safe
3. Missing validation for required fields

### ProfileContext.tsx
**File:** `/home/user/workspace/src/contexts/ProfileContext.tsx`
**Lines:** 67, 73
**Severity:** MEDIUM

```typescript
console.log('ProfileContext: Profile loaded successfully');
console.error('ProfileContext: Load error:', err);
```

**Issues:**
- Uses console.log/console.error instead of structured logger
- Per CLAUDE.md: Should use error states for user communication

---

## Utility Issues

### goalCalculations.ts
**File:** `/home/user/workspace/src/utils/goalCalculations.ts`
**Severity:** MEDIUM

**Concerns:**
1. Complex calculations for nutrition/fitness goals
2. Need to verify edge cases:
   - Very low weight (< 50kg)
   - Very high weight (> 200kg)
   - Extreme ages (< 18 or > 80)
   - Activity level extremes
3. Dietary restrictions compatibility

**Action:** Test all edge cases for goal calculations

### foodTransformers.ts
**File:** `/home/user/workspace/src/utils/foodTransformers.ts`
**Severity:** MEDIUM

**Concerns:**
1. Likely parses food nutrition labels
2. Need robust error handling for malformed data
3. Verify unit conversions are accurate (mg/g/oz/etc)

### secureStorage.ts
**File:** `/home/user/workspace/src/utils/secureStorage.ts`
**Severity:** HIGH

**Issues:**
1. AuthContext.tsx line 82-98 uses it for session storage
2. Function `migrateFromAsyncStorage()` suggests previous security vulnerability
3. Need to verify all sensitive data is using secure storage
4. Check what data is being migrated

---

## Navigation Issues

### AuthNavigator.tsx
**File:** `/home/user/workspace/src/navigation/AuthNavigator.tsx`
**Lines:** 56-58
**Severity:** MEDIUM

```typescript
if (!isInitialized || (isAuthenticated && profileLoading)) {
  return <LoadingScreen />;
}
```

**Issues:**
1. May show loading indefinitely if profile fails to load
2. No error state for profile loading failure
3. Consider timeout for loading state

---

## Type Definition Issues

### supabase/database.generated.ts
**File:** `/home/user/workspace/src/types/supabase/database.generated.ts`
**Severity:** MEDIUM

**Issue:** Auto-generated file should not be manually edited
- Verify it's properly regenerated when schema changes
- Check for stale type definitions

### profile.ts
**File:** `/home/user/workspace/src/types/profile.ts`
**Severity:** LOW

**Concern:** Type definitions for user profile - ensure all fields match Supabase schema

---

## String Literal Issues (Apostrophe Rule)

Per CLAUDE.md: "NEVER use apostrophes (') inside single-quoted strings"

**Files to Check:**
- All components and services for strings like: `'How's it going?'`
- Should be: `"How's it going?"` or use double quotes

**Critical Locations:**
- Coach messages (VoiceCoachScreen, CoachScreen)
- UI text in all components
- Error messages in services

---

## Missing Error Boundaries

**Components Without Error Boundaries:**
1. PersonalizedDashboard.tsx - may fail with many sub-components
2. CoachScreen.tsx - streaming can fail
3. FoodScreen.tsx - food API calls can fail
4. All service-heavy screens

**Recommendation:** Add error boundaries or error states to all data-fetching screens

---

## Database Issues

### Row Level Security (RLS) Policies
**Mentioned in:** DevToolsScreen.tsx line 58

**Issue:** "This might be due to Row Level Security policies"
- Verify all RLS policies are correctly configured
- Check if test user has proper permissions
- Document all RLS policy requirements

### Missing Indexes
**Concern:** Large tables (food_entries, coach_conversations) may need indexes on:
- user_id
- created_at
- date fields for range queries

---

## Performance Concerns

1. **PersonalizedDashboard.tsx** - Multiple metric cards may cause performance issues
   - Implement React.memo for sub-components
   - Use useMemo for expensive calculations

2. **CoachScreen.tsx** - Streaming responses may block UI
   - Verify proper async handling
   - Consider worker threads for heavy processing

3. **Food Search** - USDA database queries may be slow
   - Implement debouncing
   - Add caching for popular searches

4. **Weight/Fasting Charts** - Re-rendering with large datasets
   - Implement virtualization or pagination
   - Cache chart data

---

## Environment Variable Issues

**File:** `/home/user/workspace/src/config/env.ts`

**Verify:**
1. EXPO_PUBLIC_SUPABASE_URL is set
2. EXPO_PUBLIC_SUPABASE_ANON_KEY is set (public, not secret!)
3. Any API keys are in .env and NOT in version control
4. API keys are not logged or displayed anywhere

---

## Testing Infrastructure

**Per DevToolsScreen.tsx:**
- Requires SQL migration: `database/migrations/ai_testing_schema.sql`
- Verify this file exists and is documented

**Issues:**
1. Testing schema may not exist in all environments
2. Tests may fail silently if schema is missing
3. No check for schema existence before running tests

---

## Action Items Summary

### HIGH Priority
- [ ] Fix all Alert.alert() calls - replace with custom modals
- [ ] Verify Camera implementation uses CameraView, not deprecated Camera
- [ ] Check AIFoodScanService for HIPAA compliance
- [ ] Verify secure storage is used for all sensitive data
- [ ] Fix useAgentStream hook - ensure proper cleanup and error handling

### MEDIUM Priority
- [ ] Remove all console.log/console.error calls - use structured logger
- [ ] Fix TypeScript type assertions (especially `as Record<string, any>`)
- [ ] Add error boundaries to all data-fetching screens
- [ ] Verify goalCalculations.ts edge cases
- [ ] Check for Zustand infinite loop patterns in all hooks
- [ ] Fix AuthNavigator loading state timeout issue

### LOW Priority
- [ ] Review all string literals for apostrophe rule compliance
- [ ] Implement performance optimizations for heavy components
- [ ] Add missing database indexes
- [ ] Document RLS policy requirements
- [ ] Verify environment variable configuration

---

## References

- CLAUDE.md - Project specifications and rules
- package.json - Dependencies verification
- Supabase Dashboard - Schema and RLS policies verification

---

**End of Audit Notes**

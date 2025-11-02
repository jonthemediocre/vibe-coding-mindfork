# 🛡️ SAFE DEPLOYMENT: Manual Approval Mode

## What This Does

Modifies the metabolic adaptation system to:
1. ✅ **Detect adaptations** automatically
2. ✅ **Send coach notifications** with explanation
3. ❌ **DO NOT change calories** automatically
4. ✅ **Require user approval** before applying changes

This is the **SAFE** way to deploy initially.

---

## Code Changes for Safe Mode

### 1. Modify MetabolicAdaptationService (Safe Mode)

**File:** `src/services/MetabolicAdaptationService.ts`

**Change the `applyAdaptation()` method:**

```typescript
/**
 * Apply metabolic adaptation (SAFE MODE - Requires user approval)
 *
 * This sends a notification to the user but DOES NOT automatically change calories.
 * User must explicitly approve the change in the app.
 */
static async applyAdaptation(
  userId: string,
  adaptation: AdaptationResult,
  coachId?: string,
  autoApply: boolean = false  // NEW PARAMETER: default FALSE for safety
): Promise<boolean> {

  try {
    const finalCoachId = coachId || 'synapse';

    // SAFE MODE: Do NOT update profile automatically unless explicitly approved
    if (autoApply) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ daily_calories: adaptation.newCalories })
        .eq('id', userId);

      if (profileError) {
        console.error('[MetabolicAdaptationService] Profile update error:', profileError);
        throw profileError;
      }
    }

    // Get current date for week calculation
    const today = new Date();
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEnd = today;

    // Record adaptation in database (but mark as pending approval if not auto-applied)
    const { data: adaptationRecord, error: adaptError } = await supabase
      .from('metabolic_adaptations')
      .insert({
        user_id: userId,
        week_start_date: weekStart.toISOString().split('T')[0],
        week_end_date: weekEnd.toISOString().split('T')[0],
        adaptation_type: adaptation.type,
        adaptation_magnitude: adaptation.magnitude,
        old_daily_calories: adaptation.oldCalories,
        new_daily_calories: adaptation.newCalories,
        old_ee_kcal: adaptation.oldEE,
        new_ee_kcal: adaptation.newEE,
        week_start_weight_lb: adaptation.weekStartWeight,
        week_end_weight_lb: adaptation.weekEndWeight,
        weight_change_rate_lb_per_day: adaptation.weightChangeRate,
        coach_id: finalCoachId,
        coach_message: adaptation.coachExplanation,
        data_points_used: adaptation.dataPoints,
        confidence_score: adaptation.confidence,
        // NEW: Track if this was auto-applied or needs approval
        user_acknowledged: autoApply,  // If auto-applied, mark as acknowledged
      })
      .select()
      .single();

    if (adaptError) {
      console.error('[MetabolicAdaptationService] Adaptation record error:', adaptError);
      throw adaptError;
    }

    // Send notification with approval buttons (if not auto-applied)
    const notificationMessage = autoApply
      ? adaptation.coachExplanation  // Just explanation if auto-applied
      : `${adaptation.coachExplanation}\n\n🔍 Review This Change:\n• Current: ${adaptation.oldCalories} cal/day\n• Recommended: ${adaptation.newCalories} cal/day\n• Change: ${adaptation.newCalories - adaptation.oldCalories} cal\n\nWould you like me to apply this adjustment? You can accept or decline in your dashboard.`;

    const { error: messageError } = await supabase
      .from('coach_messages')
      .insert({
        coach_id: finalCoachId,
        user_id: userId,
        message: autoApply ? 'system_metabolic_adaptation_applied' : 'system_metabolic_adaptation_pending',
        response: notificationMessage,
        created_at: new Date().toISOString(),
        // Store adaptation ID for approval flow
        metadata: { adaptation_id: adaptationRecord.id },
      });

    if (messageError) {
      console.error('[MetabolicAdaptationService] Message insert error:', messageError);
      // Non-fatal - continue even if message fails
    }

    if (autoApply) {
      console.log(`[MetabolicAdaptationService] ✅ Auto-applied ${adaptation.type} adaptation for user ${userId}: ${adaptation.oldCalories} → ${adaptation.newCalories} cal`);
    } else {
      console.log(`[MetabolicAdaptationService] 📋 Pending approval: ${adaptation.type} adaptation for user ${userId}: ${adaptation.oldCalories} → ${adaptation.newCalories} cal`);
    }

    return true;

  } catch (error) {
    console.error('[MetabolicAdaptationService] Failed to apply metabolic adaptation:', error);
    return false;
  }
}

/**
 * User approves pending adaptation (NEW METHOD)
 */
static async approvePendingAdaptation(
  userId: string,
  adaptationId: string
): Promise<boolean> {
  try {
    // Get pending adaptation
    const { data: adaptation, error: fetchError } = await supabase
      .from('metabolic_adaptations')
      .select('*')
      .eq('id', adaptationId)
      .eq('user_id', userId)
      .eq('user_acknowledged', false)  // Only pending adaptations
      .single();

    if (fetchError || !adaptation) {
      console.error('[MetabolicAdaptationService] Adaptation not found or already applied');
      return false;
    }

    // Apply the change
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ daily_calories: adaptation.new_daily_calories })
      .eq('id', userId);

    if (profileError) {
      console.error('[MetabolicAdaptationService] Failed to update profile:', profileError);
      return false;
    }

    // Mark as acknowledged
    await supabase
      .from('metabolic_adaptations')
      .update({
        user_acknowledged: true,
        user_acknowledged_at: new Date().toISOString()
      })
      .eq('id', adaptationId);

    console.log(`[MetabolicAdaptationService] ✅ User approved adaptation: ${adaptation.old_daily_calories} → ${adaptation.new_daily_calories} cal`);
    return true;

  } catch (error) {
    console.error('[MetabolicAdaptationService] Failed to approve adaptation:', error);
    return false;
  }
}

/**
 * User declines pending adaptation (NEW METHOD)
 */
static async declinePendingAdaptation(
  userId: string,
  adaptationId: string
): Promise<boolean> {
  try {
    // Just mark as acknowledged without applying
    const { error } = await supabase
      .from('metabolic_adaptations')
      .update({
        user_acknowledged: true,
        user_acknowledged_at: new Date().toISOString(),
        // Could add a 'declined' flag if needed
      })
      .eq('id', adaptationId)
      .eq('user_id', userId);

    if (error) {
      console.error('[MetabolicAdaptationService] Failed to decline adaptation:', error);
      return false;
    }

    console.log(`[MetabolicAdaptationService] User declined adaptation ${adaptationId}`);
    return true;

  } catch (error) {
    console.error('[MetabolicAdaptationService] Failed to decline adaptation:', error);
    return false;
  }
}
```

---

### 2. Add Approval UI to MetabolicTrendCard

**File:** `src/components/dashboard/MetabolicTrendCard.tsx`

**Add approval buttons:**

```tsx
{/* Adaptation Notification with Approval */}
{recentAdaptation && !recentAdaptation.user_acknowledged && (
  <View className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    {/* ... existing adaptation display ... */}

    {/* Coach Message */}
    <Text className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
      {recentAdaptation.coach_message}
    </Text>

    {/* APPROVAL BUTTONS */}
    <View className="flex-row gap-2">
      <Pressable
        onPress={async () => {
          const success = await MetabolicAdaptationService.approvePendingAdaptation(
            userId,
            recentAdaptation.id
          );
          if (success) {
            Alert.alert(
              'Applied!',
              `Your daily calories have been adjusted to ${recentAdaptation.new_daily_calories}.`
            );
            setRecentAdaptation({ ...recentAdaptation, user_acknowledged: true });
          }
        }}
        className="flex-1 py-3 bg-blue-600 rounded-lg"
      >
        <Text className="text-center text-white font-semibold text-sm">
          ✓ Accept Change
        </Text>
      </Pressable>

      <Pressable
        onPress={async () => {
          const success = await MetabolicAdaptationService.declinePendingAdaptation(
            userId,
            recentAdaptation.id
          );
          if (success) {
            Alert.alert(
              'Declined',
              'Your calories will stay at the current level. You can always adjust manually in settings.'
            );
            setRecentAdaptation({ ...recentAdaptation, user_acknowledged: true });
          }
        }}
        className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg"
      >
        <Text className="text-center text-gray-800 dark:text-gray-200 font-semibold text-sm">
          ✗ Keep Current
        </Text>
      </Pressable>
    </View>

    {/* Medical Disclaimer */}
    <View className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
      <Text className="text-xs text-yellow-800 dark:text-yellow-300">
        ⚠️ This is wellness guidance, not medical advice. Consult a healthcare
        professional before making significant dietary changes, especially if you
        have medical conditions.
      </Text>
    </View>
  </View>
)}
```

---

### 3. Update Database Schema (Add Auto-Apply Flag)

**File:** `database/migrations/metabolic_adaptation_schema.sql`

**Add to `metabolic_adaptations` table:**

```sql
-- Add after line 100 (coach_message):
auto_applied BOOLEAN DEFAULT false,           -- Was this auto-applied or manually approved?
```

---

## Testing Safe Mode

### 1. Run Migration
- Database migration unchanged (same as before)

### 2. Test Detection
```typescript
const result = await MetabolicAdaptationService.detectAdaptation(userId);
console.log('Detected:', result);
```

### 3. Test Pending Approval
```typescript
// Apply in SAFE MODE (default)
await MetabolicAdaptationService.applyAdaptation(userId, result);
// ✅ Notification sent, calories NOT changed yet

// Check profile
const profile = await getProfile(userId);
console.log('Calories still:', profile.daily_calories);  // Should be OLD value
```

### 4. Test User Approval
```typescript
// User clicks "Accept"
await MetabolicAdaptationService.approvePendingAdaptation(userId, adaptationId);

// Check profile again
const profile = await getProfile(userId);
console.log('Calories now:', profile.daily_calories);  // Should be NEW value
```

---

## Migration to Auto-Apply (Later)

When ready to enable automatic changes:

```typescript
// In settings or config:
const autoApplyEnabled = await getSettingFor(userId, 'enable_auto_calorie_adjustments');

// When applying:
await MetabolicAdaptationService.applyAdaptation(
  userId,
  adaptation,
  coachId,
  autoApplyEnabled  // TRUE if user opted in
);
```

---

## Summary

**Safe Mode:**
- ✅ Detects adaptations
- ✅ Sends coach notifications
- ❌ Does NOT change calories automatically
- ✅ User must explicitly approve

**When ready for auto-apply:**
1. Add opt-in toggle to settings
2. Pass `autoApply: true` for opted-in users
3. Monitor for issues

**This approach:**
- Minimizes risk
- Builds user trust
- Allows testing at scale
- Easy to rollback if needed

---

**Recommendation:** Use Safe Mode for first 2-4 weeks, then gradually enable auto-apply.

# 🛡️ SAFETY ANALYSIS: Metabolic Adaptation System

## Executive Summary

**Risk Level:** 🟡 **MEDIUM** - Safe to deploy with precautions
**Recommendation:** Deploy to **STAGING first**, not production
**Critical Issues:** 3 identified, 2 mitigated, 1 requires monitoring

---

## 🚨 CRITICAL SAFETY CONCERNS

### **1. AUTOMATIC CALORIE CHANGES (HIGH RISK)** ⚠️

**Risk:** Algorithm automatically modifies user's daily calorie target without explicit consent.

**Potential Harm:**
- User eating 1800 cal → Algorithm drops to 1650 cal → User not aware
- Could lead to **unintentional under-eating** or **over-eating**
- Health implications for users with eating disorders
- Legal liability if user experiences negative health outcomes

**Mitigation Status:** ✅ **PARTIALLY MITIGATED**

**Built-in Safeguards:**
```typescript
// Line 244-248 in MetabolicAdaptationService.ts
const newCalories = this.clip(
  oldCalories + calorieAdjustment,
  1200,  // Never go below 1200 (safe minimum)
  5000   // Never go above 5000 (sanity check)
);
```

**Additional Safeguards Needed:**
1. ✅ **Minimum 1200 kcal floor** (implemented)
2. ⚠️ **User consent toggle** (NOT implemented) ← **MISSING**
3. ⚠️ **Email notification** when calories change (NOT implemented)
4. ⚠️ **Undo button** for 24 hours (NOT implemented)

**Recommendation:**
```typescript
// ADD THIS TO SETTINGS:
interface UserSettings {
  enable_auto_calorie_adjustments: boolean; // Default: false (opt-in)
  notify_on_adaptation: boolean;            // Default: true
}

// MODIFY applyAdaptation():
static async applyAdaptation(userId: string, adaptation: AdaptationResult) {
  // Check if user has opted in
  const { data: settings } = await supabase
    .from('user_settings')
    .select('enable_auto_calorie_adjustments')
    .eq('user_id', userId)
    .single();

  if (!settings?.enable_auto_calorie_adjustments) {
    console.log('[MetabolicAdaptation] User has not opted in - skipping auto-adjustment');
    // Still send notification, but DON'T change calories
    await this.sendNotificationOnly(userId, adaptation);
    return false;
  }

  // Continue with adjustment...
}
```

---

### **2. DATA QUALITY & FALSE POSITIVES (MEDIUM RISK)** ⚠️

**Risk:** Algorithm makes decisions on incomplete/noisy data.

**Scenarios:**
- User logs food sporadically (3 days one week, 7 days another)
- User forgets to log weight for 2 weeks
- User has water retention (menstruation, high sodium) skewing trend
- User switches from kg to lbs mid-tracking

**Example False Positive:**
```
Week 2: User logs 6/7 days, weight dropping normally
Week 4: User logs 3/7 days, appears to stall
Algorithm: "Adaptation detected!" (WRONG - just missing data)
```

**Mitigation Status:** ✅ **PARTIALLY MITIGATED**

**Built-in Safeguards:**
```typescript
// Line 183-185 in MetabolicAdaptationService.ts
if (week2Intakes.length < 4 || week4Intakes.length < 4) {
  return null;  // Not enough intake data
}

// Line 172 in MetabolicAdaptationService.ts
if (trackingData.length < 21) {
  return null;  // Need at least 3 weeks of data
}

// Line 258-263 in MetabolicAdaptationService.ts
const confidence = this.clip(
  avgAdherence * (dataPoints / 14),  // Perfect score = 1.0 adherence * 14 data points
  0.5,
  1.0
);
```

**Additional Safeguards Needed:**
1. ✅ **Minimum data points check** (implemented)
2. ⚠️ **Confidence threshold** (calculated but NOT enforced) ← **MISSING**
3. ⚠️ **Outlier detection** for water retention (NOT implemented)
4. ⚠️ **Unit consistency check** (NOT implemented)

**Recommendation:**
```typescript
// ENFORCE CONFIDENCE THRESHOLD:
if (confidence < 0.7) {
  console.log('[MetabolicAdaptation] Confidence too low:', confidence);
  return null;  // Don't make changes with low confidence
}

// ADD OUTLIER DETECTION:
const detectWaterRetention = (weights: number[]): boolean => {
  const last3Days = weights.slice(-3);
  const prev3Days = weights.slice(-6, -3);
  const avgRecent = average(last3Days);
  const avgPrev = average(prev3Days);

  // If weight jumped >3 lbs in 3 days, likely water retention
  if (avgRecent - avgPrev > 3) {
    console.warn('[MetabolicAdaptation] Water retention detected - skipping');
    return true;
  }
  return false;
};
```

---

### **3. EATING DISORDER TRIGGER RISK (HIGH RISK)** 🚨

**Risk:** Algorithm messaging could trigger or worsen eating disorders.

**High-Risk Users:**
- History of anorexia, bulimia, EDNOS
- Obsessive calorie tracking behavior
- Extreme deficit goals (>1000 kcal/day)
- Rapid weight loss attempts

**Dangerous Messaging Examples:**
```
❌ BAD: "Your metabolism slowed down. Eating less now: 1200 cal."
❌ BAD: "You need to cut another 300 calories to keep losing weight."
❌ BAD: "Your body is fighting your weight loss. Be more strict."
```

**Mitigation Status:** ✅ **WELL MITIGATED**

**Built-in Safeguards:**
```typescript
// Coaches use empathetic, non-shaming language:

Synapse: "Your metabolism isn't broken; it's adapting. Let's work with it."
Aetheris: "This is not resistance - it's adaptation. Your body is wise."
Verdant: "Slow down and breathe. Your body is finding its rhythm."
```

**Additional Safeguards Needed:**
1. ✅ **Non-shaming language** (implemented)
2. ✅ **1200 kcal hard floor** (implemented)
3. ⚠️ **Red flag detection** for extreme behavior (NOT implemented) ← **MISSING**
4. ⚠️ **Professional help referral** for at-risk users (NOT implemented)

**Recommendation:**
```typescript
// ADD RED FLAG DETECTION:
const detectDangerousBehavior = async (userId: string): Promise<boolean> => {
  const { data: tracking } = await supabase
    .from('metabolic_tracking')
    .select('intake_kcal, weight_lb')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30);

  if (!tracking || tracking.length < 7) return false;

  // Red flags:
  // 1. Average intake < 1000 kcal for 7+ days
  const avgIntake = average(tracking.slice(0, 7).map(t => t.intake_kcal));
  if (avgIntake < 1000) return true;

  // 2. Weight loss > 2.5 lbs/week for 3+ weeks (extreme)
  const weightChange = tracking[0].weight_lb - tracking[20].weight_lb;
  const weeksElapsed = 20 / 7;
  const ratePerWeek = weightChange / weeksElapsed;
  if (ratePerWeek < -2.5) return true;

  // 3. Multiple consecutive days with no logging (purging behavior)
  // ... additional checks

  return false;
};

// In applyAdaptation():
const isDangerous = await detectDangerousBehavior(userId);
if (isDangerous) {
  console.warn('[MetabolicAdaptation] Dangerous behavior detected - NOT applying adaptation');

  // Send supportive message instead:
  await supabase.from('coach_messages').insert({
    coach_id: 'synapse',
    user_id: userId,
    response: "I notice some patterns that concern me. Your health is more important than any number on a scale. Consider speaking with a healthcare professional about your nutrition goals. I'm here to support you, not to push you to extremes."
  });

  return false;
}
```

---

## ✅ WELL-DESIGNED SAFETY FEATURES

### **1. Hard Calorie Bounds** ✅
```sql
-- Line 112 in metabolic_adaptation_schema.sql
CHECK (new_daily_calories >= 1200 AND new_daily_calories <= 5000)
```
**Analysis:** Excellent. Prevents dangerous extremes.

### **2. Magnitude Limits** ✅
```typescript
// Line 220-224 in MetabolicAdaptationService.ts
const magnitude = this.clip(
  Math.abs(rateDifference) / Math.abs(week2Rate),
  this.config.adapt_floor,   // 0.10 (max 10% decrease)
  this.config.adapt_ceiling  // 0.25 (max 25% decrease)
);
```
**Analysis:** Excellent. Prevents drastic changes (max ±25%).

### **3. Data Quality Requirements** ✅
```typescript
// Requires 3 weeks minimum, 4+ data points per week
if (trackingData.length < 21) return null;
if (week2Intakes.length < 4 || week4Intakes.length < 4) return null;
```
**Analysis:** Good. Reduces false positives.

### **4. Empathetic Coach Messaging** ✅
All coaches use non-judgmental, supportive language.

### **5. RLS (Row Level Security)** ✅
```sql
-- Users can only see their own data
CREATE POLICY "Users can view own metabolic tracking"
  ON metabolic_tracking FOR SELECT
  USING (auth.uid() = user_id);
```
**Analysis:** Excellent data privacy.

---

## 🟡 MODERATE CONCERNS

### **1. No Rollback Mechanism**
**Issue:** Once calories are changed, user cannot undo.

**Fix:**
```typescript
// Add to metabolic_adaptations table:
ALTER TABLE metabolic_adaptations ADD COLUMN rolled_back BOOLEAN DEFAULT false;
ALTER TABLE metabolic_adaptations ADD COLUMN rolled_back_at TIMESTAMPTZ;

// Add method:
static async rollbackAdaptation(adaptationId: string, userId: string): Promise<boolean> {
  // Restore old calories
  const { data: adaptation } = await supabase
    .from('metabolic_adaptations')
    .select('old_daily_calories')
    .eq('id', adaptationId)
    .eq('user_id', userId)
    .single();

  if (!adaptation) return false;

  await supabase.from('profiles')
    .update({ daily_calories: adaptation.old_daily_calories })
    .eq('id', userId);

  await supabase.from('metabolic_adaptations')
    .update({ rolled_back: true, rolled_back_at: new Date().toISOString() })
    .eq('id', adaptationId);

  return true;
}
```

### **2. No Medical Disclaimer in UI**
**Issue:** Algorithm makes health recommendations without disclaimer.

**Fix:** Add to MetabolicTrendCard.tsx:
```tsx
<View className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
  <Text className="text-xs text-yellow-800 dark:text-yellow-300">
    ⚠️ This is wellness guidance, not medical advice. Consult a healthcare
    professional before making significant dietary changes, especially if you
    have medical conditions.
  </Text>
</View>
```

### **3. No Logging/Audit Trail**
**Issue:** Can't debug why adaptation occurred or track algorithm changes.

**Fix:** Already implemented in `metabolic_adaptations` table! ✅

---

## 📊 RISK MATRIX

| Risk | Severity | Likelihood | Mitigation | Status |
|------|----------|------------|------------|--------|
| Under-eating (< 1200 kcal) | **CRITICAL** | Low | Hard floor at 1200 | ✅ Mitigated |
| Eating disorder trigger | **HIGH** | Medium | Empathetic messaging | ⚠️ Partial |
| False positive adaptation | **MEDIUM** | High | Data quality checks | ⚠️ Partial |
| User consent | **HIGH** | High | Opt-in toggle | ❌ Missing |
| No undo mechanism | **MEDIUM** | Medium | Rollback function | ❌ Missing |
| Medical disclaimer | **LOW** | Low | UI disclaimer | ❌ Missing |

---

## 🎯 DEPLOYMENT RECOMMENDATIONS

### **Option 1: SAFE DEPLOYMENT (Recommended)** ✅

**Phase 1: Observation Only (Week 1-2)**
- ✅ Deploy database migration
- ✅ Deploy tracking services
- ✅ Deploy dashboard UI
- ❌ **DO NOT** enable automatic calorie changes
- ✅ Show adaptation notifications with "Review" button (manual approval)

```typescript
// Modify applyAdaptation() temporarily:
static async applyAdaptation(userId: string, adaptation: AdaptationResult) {
  // DON'T update profile automatically
  // await supabase.from('profiles').update({ daily_calories: adaptation.newCalories });

  // Instead, send notification for user to review:
  await supabase.from('coach_messages').insert({
    coach_id: adaptation.coachId,
    user_id: userId,
    response: `${adaptation.coachExplanation}\n\nWould you like me to adjust your daily calories from ${adaptation.oldCalories} to ${adaptation.newCalories}? Tap 'Accept' to apply this change.`
  });

  // Store pending adaptation
  await supabase.from('metabolic_adaptations').insert({
    ...adaptation,
    auto_applied: false,  // User must approve
    user_acknowledged: false
  });
}
```

**Phase 2: Opt-In Testing (Week 3-4)**
- Add settings toggle: "Enable automatic calorie adjustments"
- Only apply to users who opt-in
- Monitor for issues

**Phase 3: Full Rollout (Week 5+)**
- Make opt-in default for new users
- Keep opt-out available
- Monitor metrics

### **Option 2: AGGRESSIVE DEPLOYMENT (Not Recommended)** ⚠️

Deploy everything immediately, including automatic calorie changes.

**Risks:**
- Users surprised by changes
- Potential negative reviews
- Legal liability if harm occurs
- Hard to undo at scale

---

## 🔒 REQUIRED CHANGES BEFORE PRODUCTION

### **CRITICAL (Must Fix)**

1. **Add Opt-In Toggle**
```sql
ALTER TABLE user_settings ADD COLUMN enable_auto_calorie_adjustments BOOLEAN DEFAULT false;
```

2. **Add Medical Disclaimer to UI**
```tsx
// In MetabolicTrendCard.tsx
<Text className="text-xs text-gray-500">
  ⚠️ Wellness guidance only. Consult healthcare professionals for medical advice.
</Text>
```

3. **Enforce Confidence Threshold**
```typescript
// In detectAdaptation()
if (confidence < 0.7) return null;  // Don't apply low-confidence changes
```

### **IMPORTANT (Should Fix)**

4. **Add Rollback Function**
```typescript
static async rollbackAdaptation(adaptationId: string, userId: string): Promise<boolean>
```

5. **Add Email Notification**
```typescript
// When calories change, send email:
await sendEmail({
  to: user.email,
  subject: 'Your MindFork calorie target has been adjusted',
  body: adaptation.coachExplanation
});
```

6. **Add Red Flag Detection**
```typescript
const isDangerous = await detectDangerousBehavior(userId);
if (isDangerous) { /* Don't apply, send support message */ }
```

### **NICE TO HAVE (Improve Later)**

7. Water retention detection
8. Unit consistency validation
9. A/B testing framework for algorithm parameters
10. Dashboard for monitoring adaptation accuracy

---

## ✅ FINAL RECOMMENDATION

### **DO THIS:**

1. **Run migration in STAGING/DEV first** (not production)
2. **Test with synthetic data** (provided in migration file)
3. **Disable automatic calorie changes** (manual approval only)
4. **Add opt-in toggle** before full rollout
5. **Add medical disclaimer** to UI
6. **Monitor for 2 weeks** before enabling auto-adjust

### **DON'T DO THIS:**

1. ❌ Deploy directly to production with automatic changes enabled
2. ❌ Skip testing with synthetic data
3. ❌ Ignore the opt-in toggle requirement
4. ❌ Launch without medical disclaimer

---

## 📝 TESTING CHECKLIST

Before deploying to production:

- [ ] Run migration in staging
- [ ] Insert synthetic deficit stall data
- [ ] Verify adaptation detection works
- [ ] Test all 6 coach personalities generate appropriate messages
- [ ] Verify 1200 kcal floor enforced
- [ ] Verify 5000 kcal ceiling enforced
- [ ] Test with missing data (should return null)
- [ ] Test with low adherence (should return null or low confidence)
- [ ] Add opt-in toggle to settings
- [ ] Add medical disclaimer to MetabolicTrendCard
- [ ] Test rollback mechanism
- [ ] Monitor for 2 weeks in staging

---

## 🎯 CONCLUSION

**The algorithm is scientifically sound and well-implemented**, but **deployment strategy matters** for safety.

**Risk Level:** 🟡 **MEDIUM** with current implementation
**Risk Level after fixes:** 🟢 **LOW** (safe for production)

**Estimated time to make it production-safe:** 2-3 hours

**Proceed?** ✅ **YES**, but with **PHASE 1 (Observation Only)** approach.

---

**Built with safety first by Claude Code** 🛡️

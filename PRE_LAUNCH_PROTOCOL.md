# 🚀 PRE-LAUNCH PROTOCOL - Test, Vet, and Launch

## Overview

This guide outlines best practices for safely testing, vetting, and launching the metabolic adaptation feature to production users.

---

## 📋 Phase 1: Internal Testing (Week 1)

### Goal
Verify the feature works correctly with controlled test data before exposing to real users.

### Tasks

#### 1.1 Setup Test Environment
- [ ] Create 3 test user accounts:
  - `test-deficit@mindfork.com` (weight loss scenario)
  - `test-surplus@mindfork.com` (muscle gain scenario)
  - `test-stable@mindfork.com` (maintenance scenario)
- [ ] Document credentials in secure location

#### 1.2 Insert Synthetic Data

**For deficit stall user:**
```bash
# Get user ID from Supabase
SELECT id FROM auth.users WHERE email = 'test-deficit@mindfork.com';

# Run test data script
node insert-test-data.js
```

**Manually insert surplus and stable scenarios in Supabase SQL:**
```sql
-- Surplus slow (muscle gain stalled)
INSERT INTO metabolic_tracking (user_id, date, weight_lb, intake_kcal, adherence_score)
SELECT
  'SURPLUS_USER_ID'::uuid,
  CURRENT_DATE - (30 - generate_series)::INTEGER,
  -- Weight: starts at 160, gains fast then slows
  160.0 + (generate_series::FLOAT * 0.08) -
    (CASE WHEN generate_series > 14 THEN (generate_series - 14) * 0.03 ELSE 0 END),
  2800 + (RANDOM() * 100 - 50)::INTEGER,
  0.85 + (RANDOM() * 0.15)
FROM generate_series(0, 29);

-- Stable (no adaptation)
INSERT INTO metabolic_tracking (user_id, date, weight_lb, intake_kcal, adherence_score)
SELECT
  'STABLE_USER_ID'::uuid,
  CURRENT_DATE - (30 - generate_series)::INTEGER,
  -- Weight: fluctuates but no clear trend
  175.0 + (RANDOM() * 2 - 1)::DECIMAL,
  2200 + (RANDOM() * 200 - 100)::INTEGER,
  0.80 + (RANDOM() * 0.20)
FROM generate_series(0, 29);
```

#### 1.3 Test Detection Algorithm

**For each test user:**
1. [ ] Open app → DevTools → Click "🔥 Test Metabolic Adaptation"
2. [ ] Verify expected results:
   - **Deficit user:** Should detect `deficit_stall`
   - **Surplus user:** Should detect `surplus_slow`
   - **Stable user:** Should return "No adaptation detected"

**Expected console output:**
```
✅ Adaptation Detected!
Type: deficit_stall
Magnitude: -12.3%
Confidence: 87%
Old Calories: 1800
New Calories: 1670
```

**Verify in Supabase:**
```sql
-- Check adaptations created
SELECT
  user_id,
  adaptation_type,
  old_daily_calories,
  new_daily_calories,
  confidence_score,
  user_acknowledged
FROM metabolic_adaptations
ORDER BY detected_at DESC;
```

Expected: 2 rows (deficit + surplus), both with `user_acknowledged = false`

#### 1.4 Test Approval Flow

**For deficit user:**
1. [ ] Navigate to Dashboard
2. [ ] Verify adaptation card shows:
   - [ ] Blue notification box
   - [ ] Coach explanation (personality-specific)
   - [ ] Current vs recommended calories clearly displayed
   - [ ] Two buttons visible: "✓ Accept Change" and "✗ Keep Current"
   - [ ] Yellow medical disclaimer at bottom

3. [ ] Click "✓ Accept Change"
4. [ ] Verify:
   - [ ] Buttons disappear
   - [ ] Card shows "Acknowledged" state
   - [ ] Go to Settings → Personal Info
   - [ ] Verify `daily_calories` updated to new value (1670)

**Check in Supabase:**
```sql
SELECT daily_calories FROM profiles WHERE id = 'DEFICIT_USER_ID';
-- Should match new_daily_calories

SELECT user_acknowledged, user_acknowledged_at
FROM metabolic_adaptations
WHERE user_id = 'DEFICIT_USER_ID'
ORDER BY detected_at DESC LIMIT 1;
-- Should be true with recent timestamp
```

#### 1.5 Test Decline Flow

**For surplus user:**
1. [ ] Navigate to Dashboard
2. [ ] See adaptation card with pending approval
3. [ ] Click "✗ Keep Current"
4. [ ] Verify:
   - [ ] Buttons disappear
   - [ ] Card shows acknowledged state
   - [ ] Go to Settings → Personal Info
   - [ ] Verify `daily_calories` unchanged (still old value)

**Check in Supabase:**
```sql
SELECT daily_calories FROM profiles WHERE id = 'SURPLUS_USER_ID';
-- Should match OLD calories (not new)

SELECT user_acknowledged FROM metabolic_adaptations
WHERE user_id = 'SURPLUS_USER_ID'
ORDER BY detected_at DESC LIMIT 1;
-- Should be true (acknowledged but not applied)
```

#### 1.6 Test Edge Cases

**Test: No data**
- [ ] Create fresh user with 0 tracking data
- [ ] Run detection
- [ ] Verify: Returns "Not enough data" (need 21+ days)

**Test: Insufficient data points**
- [ ] Insert only 10 days of data
- [ ] Run detection
- [ ] Verify: Returns "Not enough data"

**Test: Unstable intake**
- [ ] Insert data with wildly varying calories (1000-3000 kcal)
- [ ] Run detection
- [ ] Verify: Returns null (intake not stable)

**Test: Hard bounds enforcement**
- [ ] Manually try to create adaptation with 1000 kcal (below minimum)
- [ ] Verify: Database constraint blocks insert
```sql
-- Should fail
INSERT INTO metabolic_adaptations (
  user_id, week_start_date, week_end_date,
  adaptation_type, adaptation_magnitude,
  old_daily_calories, new_daily_calories,
  old_ee_kcal, new_ee_kcal,
  coach_id, coach_message, data_points_used
) VALUES (
  'TEST_USER_ID', CURRENT_DATE - 7, CURRENT_DATE,
  'deficit_stall', -0.15,
  1500, 1000, -- Below 1200 minimum
  2200, 2000,
  'synapse', 'Test message', 21
);
-- ERROR: new value for column "new_daily_calories" violates check constraint
```

#### 1.7 Performance Testing

**Test: Large dataset**
- [ ] Insert 90 days of data for one user
- [ ] Run detection
- [ ] Measure time: Should complete in <2 seconds
- [ ] Check logs for any errors

**Test: Multiple users**
- [ ] Insert data for 10 test users
- [ ] Run detection for all users sequentially
- [ ] Verify: No memory leaks, all complete successfully

### Phase 1 Success Criteria

- [x] All 3 scenarios detect correctly (deficit, surplus, stable)
- [x] Approval flow works (calories updated)
- [x] Decline flow works (calories unchanged)
- [x] Edge cases handled gracefully
- [x] Hard bounds enforced by database
- [x] Performance acceptable (<2s per detection)
- [x] No console errors or crashes

---

## 🔍 Phase 2: Beta Testing (Weeks 2-3)

### Goal
Test with 5-10 real users who have actual weight/intake data.

### Tasks

#### 2.1 Select Beta Users

**Criteria:**
- [ ] Active users with 21+ days of food logging
- [ ] Active users with 21+ days of weight tracking
- [ ] High adherence (>80% logging consistency)
- [ ] Mix of goals (weight loss, maintenance, muscle gain)
- [ ] Diverse demographics (age, gender, starting weight)

**How to find:**
```sql
-- Find users with sufficient data
SELECT
  p.id,
  p.email,
  COUNT(DISTINCT fe.date) as food_log_days,
  COUNT(DISTINCT mt.date) as weight_log_days,
  p.goal
FROM profiles p
LEFT JOIN food_entries fe ON fe.user_id = p.id
  AND fe.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN metabolic_tracking mt ON mt.user_id = p.id
  AND mt.date > CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.id, p.email, p.goal
HAVING
  COUNT(DISTINCT fe.date) >= 21
  AND COUNT(DISTINCT mt.date) >= 21
ORDER BY COUNT(DISTINCT fe.date) DESC
LIMIT 10;
```

#### 2.2 Enable Feature for Beta Users

**Option A: Manual flag (if you add a settings toggle)**
```sql
-- Add enable_metabolic_adaptation column if needed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  enable_metabolic_adaptation BOOLEAN DEFAULT false;

-- Enable for beta users
UPDATE profiles
SET enable_metabolic_adaptation = true
WHERE email IN (
  'beta1@example.com',
  'beta2@example.com'
  -- ... list all beta users
);
```

**Option B: Just let it run for everyone (since safe mode is default)**
- Safe to do since calories don't change without approval
- Monitor these 10 users closely

#### 2.3 Monitor Beta Users Daily

**Daily Checklist:**

**Day 1-7:**
- [ ] Check if adaptations detected
```sql
SELECT
  u.email,
  ma.detected_at,
  ma.adaptation_type,
  ma.old_daily_calories,
  ma.new_daily_calories,
  ma.confidence_score,
  ma.user_acknowledged
FROM metabolic_adaptations ma
JOIN auth.users u ON ma.user_id = u.id
WHERE ma.detected_at > NOW() - INTERVAL '7 days'
ORDER BY ma.detected_at DESC;
```

- [ ] Check approval rates
```sql
-- Beta user approval stats
SELECT
  COUNT(*) FILTER (WHERE user_acknowledged = true) as total_decisions,
  COUNT(*) FILTER (WHERE user_acknowledged = true
    AND new_daily_calories != old_daily_calories) as approved,
  COUNT(*) FILTER (WHERE user_acknowledged = true
    AND new_daily_calories = old_daily_calories) as declined,
  ROUND(
    COUNT(*) FILTER (WHERE user_acknowledged = true
      AND new_daily_calories != old_daily_calories)::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE user_acknowledged = true), 0) * 100,
    1
  ) as approval_rate_pct
FROM metabolic_adaptations
WHERE detected_at > NOW() - INTERVAL '7 days';
```

- [ ] Check for errors in logs
```bash
# View recent logs
tail -100 expo.log | grep -i "metabolic"
```

- [ ] Send check-in survey to beta users
  - "Did you see an adaptation notification?"
  - "Did the explanation make sense?"
  - "Did you approve or decline? Why?"
  - "Any confusion or concerns?"

**Week 2 Check-in:**
- [ ] Interview 3-5 beta users (10 min calls)
  - Was the notification clear?
  - Did you trust the recommendation?
  - Would you prefer automatic adjustments?
  - Any bugs or issues?

#### 2.4 Track Key Metrics

**Detection Quality:**
```sql
-- False positive rate (user declined because detection was wrong)
SELECT
  COUNT(*) FILTER (WHERE user_acknowledged = true) as total_reviewed,
  COUNT(*) FILTER (WHERE user_acknowledged = true
    AND new_daily_calories = old_daily_calories) as declined,
  ROUND(
    COUNT(*) FILTER (WHERE user_acknowledged = true
      AND new_daily_calories = old_daily_calories)::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE user_acknowledged = true), 0) * 100,
    1
  ) as false_positive_rate_pct
FROM metabolic_adaptations;
```

**Target: <15% false positive rate**

**User Trust:**
```sql
-- Approval rate
SELECT
  ROUND(
    COUNT(*) FILTER (WHERE user_acknowledged = true
      AND new_daily_calories != old_daily_calories)::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE user_acknowledged = true), 0) * 100,
    1
  ) as approval_rate_pct
FROM metabolic_adaptations;
```

**Target: >70% approval rate**

**Time to Decision:**
```sql
-- How long users take to approve/decline
SELECT
  AVG(EXTRACT(EPOCH FROM (user_acknowledged_at - detected_at)) / 3600) as avg_hours_to_decision,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (user_acknowledged_at - detected_at)) / 3600) as median_hours
FROM metabolic_adaptations
WHERE user_acknowledged = true;
```

**Target: <24 hours median**

#### 2.5 Collect Qualitative Feedback

**Survey questions:**
1. How clear was the metabolic adaptation notification? (1-5 scale)
2. Did you trust the recommendation? (Yes/No/Unsure)
3. If you approved: Did you see better results afterward? (Yes/No/Too soon to tell)
4. If you declined: Why? (Open text)
5. Would you prefer automatic adjustments (opt-in)? (Yes/No)
6. Any concerns about the feature? (Open text)
7. Overall satisfaction (1-5 scale)

### Phase 2 Success Criteria

- [ ] Approval rate >70%
- [ ] False positive rate <15%
- [ ] No safety incidents (e.g., dangerous calorie levels)
- [ ] Average satisfaction >4.0/5.0
- [ ] Zero complaints about unwanted changes
- [ ] Positive qualitative feedback

---

## ✅ Phase 3: Vetting & Quality Assurance (Week 4)

### Goal
Comprehensive review before full launch.

### Tasks

#### 3.1 Code Review

- [ ] **Service Layer Review**
  - [ ] `MetabolicAdaptationService.ts` logic verified
  - [ ] All safety bounds checked (1200-5000 kcal)
  - [ ] Error handling comprehensive
  - [ ] Logging sufficient for debugging

- [ ] **UI Review**
  - [ ] MetabolicTrendCard renders correctly on all devices
  - [ ] Buttons are easily tappable (min 44pt touch targets)
  - [ ] Medical disclaimer clearly visible
  - [ ] Dark mode support verified

- [ ] **Integration Review**
  - [ ] FoodService integration tested
  - [ ] ProfileUpdateService integration tested
  - [ ] No breaking changes to existing features

#### 3.2 Security Audit

- [ ] **RLS Policies**
```sql
-- Verify users can only see their own data
-- Test with different user tokens
```

- [ ] **Service Role Key**
  - [ ] Not exposed in client code
  - [ ] Only used in secure backend contexts

- [ ] **Input Validation**
  - [ ] All user inputs sanitized
  - [ ] SQL injection not possible
  - [ ] XSS not possible in coach messages

#### 3.3 Performance Audit

- [ ] **Query Performance**
```sql
-- Check query plans for slow queries
EXPLAIN ANALYZE
SELECT * FROM metabolic_tracking
WHERE user_id = 'test-id'
AND date > CURRENT_DATE - INTERVAL '30 days';
```

- [ ] **Index Usage**
  - [ ] All queries use indexes (no seq scans on large tables)
  - [ ] Index sizes reasonable

- [ ] **Memory Usage**
  - [ ] No memory leaks in detection algorithm
  - [ ] Large datasets handled efficiently

#### 3.4 Legal & Compliance Review

- [ ] **Terms of Service**
  - [ ] Mentions metabolic adaptation feature
  - [ ] Disclaims medical advice
  - [ ] Users consent to automated recommendations

- [ ] **Privacy Policy**
  - [ ] Covers metabolic data collection
  - [ ] Explains how data is used
  - [ ] Data retention policy clear

- [ ] **Medical Disclaimer**
  - [ ] Always shown to users
  - [ ] Clear and unambiguous language
  - [ ] Recommends consulting healthcare professionals

#### 3.5 Documentation Review

- [ ] All documentation up to date
- [ ] Customer support trained on feature
- [ ] FAQ prepared for common questions
- [ ] Troubleshooting guide available

### Phase 3 Success Criteria

- [ ] Code reviewed and approved
- [ ] Security audit passed
- [ ] Performance acceptable
- [ ] Legal compliance verified
- [ ] Documentation complete

---

## 🚀 Phase 4: Soft Launch (Weeks 5-6)

### Goal
Roll out to 25-50% of users, monitor closely.

### Tasks

#### 4.1 Create Launch Segments

**Option A: Gradual rollout by user cohort**
```sql
-- Enable for users created in last 30 days (newer users, smaller history)
UPDATE profiles
SET enable_metabolic_adaptation = true
WHERE created_at > NOW() - INTERVAL '30 days'
AND enable_metabolic_adaptation = false;
```

**Option B: Random 25% sample**
```sql
-- Enable for random 25% of eligible users
UPDATE profiles
SET enable_metabolic_adaptation = true
WHERE id IN (
  SELECT id FROM profiles
  WHERE enable_metabolic_adaptation = false
  ORDER BY RANDOM()
  LIMIT (SELECT COUNT(*) * 0.25 FROM profiles)::INTEGER
);
```

#### 4.2 Monitor Daily (Week 5)

**Daily dashboard queries:**

```sql
-- Adaptations created today
SELECT COUNT(*) FROM metabolic_adaptations WHERE detected_at::date = CURRENT_DATE;

-- Approval rate today
SELECT
  ROUND(
    COUNT(*) FILTER (WHERE user_acknowledged = true AND new_daily_calories != old_daily_calories)::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE user_acknowledged = true), 0) * 100, 1
  ) as approval_rate
FROM metabolic_adaptations
WHERE detected_at::date = CURRENT_DATE;

-- Average confidence scores
SELECT AVG(confidence_score) FROM metabolic_adaptations WHERE detected_at::date = CURRENT_DATE;

-- Outliers (check for errors)
SELECT * FROM metabolic_adaptations
WHERE detected_at::date = CURRENT_DATE
AND (
  confidence_score < 0.5 OR
  ABS(calorie_adjustment) > 500 OR
  new_daily_calories < 1400 OR new_daily_calories > 4000
);
```

**Watch for red flags:**
- Approval rate drops below 60%
- Confidence scores <0.5
- Multiple user complaints
- Support tickets about unwanted changes
- Any calorie targets outside 1400-4000 range

#### 4.3 A/B Test (Optional)

If you have analytics set up:

**Variant A:** Manual approval (current)
**Variant B:** Automatic with opt-out toggle

**Metrics to track:**
- User retention (do users stick around longer?)
- Goal achievement (do they hit targets faster?)
- Engagement (more food/weight logging?)
- Satisfaction (higher NPS scores?)

#### 4.4 Expand to 50% (Week 6)

If metrics look good after week 5:

```sql
-- Enable for another 25%
UPDATE profiles
SET enable_metabolic_adaptation = true
WHERE id IN (
  SELECT id FROM profiles
  WHERE enable_metabolic_adaptation = false
  ORDER BY RANDOM()
  LIMIT (SELECT COUNT(*) FROM profiles WHERE enable_metabolic_adaptation = false) / 2
);
```

### Phase 4 Success Criteria

- [ ] Approval rate stable (>70%)
- [ ] No safety incidents
- [ ] Support tickets manageable
- [ ] User satisfaction maintained
- [ ] No performance issues at scale

---

## 🎉 Phase 5: Full Launch (Week 7+)

### Goal
Enable for all users, announce publicly.

### Tasks

#### 5.1 Enable for All Users

```sql
-- Enable metabolic adaptation for everyone
UPDATE profiles SET enable_metabolic_adaptation = true;
```

Or if you're using safe mode by default (recommended):
- Feature is already live for everyone
- Just announce it publicly

#### 5.2 Marketing Launch

- [ ] **Blog post:** "Introducing Metabolic Adaptation"
  - Explain what it is
  - Why it matters
  - How MindFork's is different (AI coaches + manual approval)
  - Competitive advantage over MacroFactor

- [ ] **Email announcement** to all users
  - Highlight new feature
  - Explain safe mode (you're in control)
  - Link to FAQ/help docs

- [ ] **Social media posts**
  - Feature highlights
  - User testimonials
  - Before/after success stories

- [ ] **Press release** (if appropriate)
  - First AI-powered adaptive nutrition app
  - Emphasis on safety + personality

#### 5.3 Monitor Post-Launch (Weeks 7-10)

**Weekly metrics:**
```sql
-- Weekly adaptation stats
SELECT
  DATE_TRUNC('week', detected_at) as week,
  COUNT(*) as total_adaptations,
  COUNT(*) FILTER (WHERE user_acknowledged = true) as acknowledged,
  ROUND(AVG(confidence_score), 2) as avg_confidence,
  ROUND(
    COUNT(*) FILTER (WHERE user_acknowledged = true AND new_daily_calories != old_daily_calories)::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE user_acknowledged = true), 0) * 100, 1
  ) as approval_rate
FROM metabolic_adaptations
GROUP BY week
ORDER BY week DESC;
```

**User feedback:**
- Monitor support tickets
- Track NPS scores
- Review app store ratings
- Read social media mentions

#### 5.4 Iterate & Improve

Based on data, consider:

**High priority improvements:**
- [ ] Add water retention detection (reduce false positives)
- [ ] Add eating disorder red flag detection
- [ ] Enforce confidence threshold (only show if >0.7)
- [ ] Add "undo" button (rollback calorie change)

**Medium priority:**
- [ ] Add weekly email summary of metabolic trends
- [ ] Create onboarding tutorial
- [ ] Add settings toggle for auto vs manual mode
- [ ] Create predictive alerts ("adaptation expected in 3 days")

**Low priority:**
- [ ] A/B test different confidence thresholds
- [ ] Optimize algorithm parameters
- [ ] Add more coach personalities
- [ ] Create detailed metabolic report (PDF export)

### Phase 5 Success Criteria

- [ ] Feature stable at scale
- [ ] Positive user reception
- [ ] Competitive advantage established
- [ ] Roadmap for v2 features defined

---

## 🎯 Key Metrics Summary

### Must Track

| Metric | Target | Red Flag |
|--------|--------|----------|
| Approval rate | >70% | <60% |
| False positive rate | <15% | >25% |
| Time to decision | <24h median | >72h |
| Confidence scores | >0.75 avg | <0.60 |
| Support tickets | <5/week | >20/week |
| Safety incidents | 0 | Any |

### Nice to Track

- User retention (7-day, 30-day)
- Goal achievement rate
- Logging adherence (before vs after adaptation)
- NPS score
- App store rating

---

## 🚨 Emergency Rollback Plan

If critical issues arise:

### Immediate Actions

1. **Disable detection (stop creating new adaptations):**
```sql
-- Quick fix: Set all users to manual mode
UPDATE profiles SET enable_metabolic_adaptation = false;
```

2. **Pause pending adaptations:**
```sql
-- Mark all pending as acknowledged (stop showing in UI)
UPDATE metabolic_adaptations
SET user_acknowledged = true
WHERE user_acknowledged = false;
```

3. **Communicate to users:**
- In-app banner: "Metabolic adaptation temporarily paused for maintenance"
- Email to affected users
- Social media update

### Root Cause Analysis

- Review logs for errors
- Check database for anomalies
- Interview affected users
- Identify bug/issue

### Fix & Redeploy

- Implement fix
- Test thoroughly in staging
- Gradually re-enable (start with beta users)
- Monitor closely

---

## ✅ Final Checklist

Before declaring launch complete:

- [ ] All phases completed successfully
- [ ] Metrics meet targets
- [ ] Zero safety incidents
- [ ] Positive user feedback
- [ ] Documentation complete
- [ ] Support team trained
- [ ] Marketing launched
- [ ] Monitoring dashboards set up
- [ ] Emergency rollback plan tested

---

## 🎊 Congratulations!

If you've completed all phases successfully, you've launched a **production-grade metabolic adaptation system** that:

1. ✅ Closes competitive gaps
2. ✅ Maintains brand identity
3. ✅ Exceeds safety standards
4. ✅ Delights users

**Now maintain, iterate, and improve based on real-world data!** 🚀

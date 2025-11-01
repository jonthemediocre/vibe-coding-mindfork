# 🧠 Metabolic Adaptation Integration Plan

## Executive Summary

**Goal:** Integrate MacroFactor-style metabolic adaptation algorithm into MindFork **without losing our warm, coach-first identity**.

**Approach:** "Warm Intelligence" - AI coaches explain metabolic changes using empathy and personality, not cold data.

**ROI:** HIGH - Closes #1 competitive gap vs MacroFactor while maintaining MindFork's emotional intelligence advantage.

---

## 🎯 Design Philosophy

### MacroFactor Approach (What We're NOT Doing)
```
User logs food → Algorithm calculates → Numbers change → User sees:
"Your TDEE is 2247 kcal. Expenditure dropped 8.3%"
```
❌ **Problem:** Cold, clinical, confusing for non-data-nerds

### MindFork Approach (Our Way)
```
User logs food → Algorithm calculates → AI Coach explains:

Synapse: "I've been analyzing your progress this week, and I noticed
something interesting. Even though you've been hitting your 1800 calorie
target consistently (great job!), your weight loss has slowed from 1.5 lbs/
week to 0.8 lbs/week. This is completely normal - it's called metabolic
adaptation. Your body is becoming more efficient with energy. Here's what
we're going to do: I'm adjusting your target from 1800 to 1650 calories.
This isn't punishment - it's personalization. Your metabolism isn't broken,
it's just adapting. We'll navigate this together. What questions do you have?"
```
✅ **Solution:** Warm, explanatory, empowering

---

## 📊 Technical Architecture

### 1. **Database Schema**

```sql
-- New table: metabolic_tracking
CREATE TABLE metabolic_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Raw inputs
  weight_lb DECIMAL(5,1),  -- Daily weigh-in
  intake_kcal INTEGER,      -- Total calories logged

  -- Calculated values
  trend_weight_lb DECIMAL(5,1),  -- 7-day EMA smoothed weight
  estimated_ee_kcal INTEGER,      -- Calculated energy expenditure
  kcal_per_lb DECIMAL(5,1),       -- Personalized 3500 kcal/lb adjustment

  -- Metadata
  weighins_this_week INTEGER DEFAULT 0,
  adherence_score DECIMAL(3,2),  -- 0.00 to 1.00

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_metabolic_tracking_user_date ON metabolic_tracking(user_id, date DESC);

-- New table: metabolic_adaptations (detected changes)
CREATE TABLE metabolic_adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  week_start_date DATE NOT NULL,

  -- Adaptation details
  adaptation_type TEXT NOT NULL CHECK (adaptation_type IN ('deficit_stall', 'surplus_slow', 'stable')),
  adaptation_magnitude DECIMAL(4,2),  -- Percentage change (e.g., -0.12 = 12% drop)

  -- What changed
  old_daily_calories INTEGER NOT NULL,
  new_daily_calories INTEGER NOT NULL,
  old_ee_kcal INTEGER NOT NULL,
  new_ee_kcal INTEGER NOT NULL,

  -- Coach explanation
  coach_id TEXT NOT NULL,  -- Which coach explained it
  coach_message TEXT NOT NULL,  -- What they said
  user_acknowledged BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metabolic_adaptations_user ON metabolic_adaptations(user_id, detected_at DESC);
```

### 2. **TypeScript Service**

**File:** `src/services/MetabolicAdaptationService.ts`

```typescript
/**
 * Metabolic Adaptation Service
 *
 * Implements MacroFactor-style metabolic tracking with MindFork personality.
 * Detects when user's metabolism adapts (slows down or speeds up) and
 * automatically adjusts calorie targets with AI coach explanation.
 *
 * Algorithm based on:
 * - 7-day EMA trend weight (smooths daily fluctuations)
 * - Energy balance equation (intake - expenditure = weight change * 3500 kcal/lb)
 * - Adaptive thermogenesis detection (deficit → metabolic slowdown)
 */

import { supabase } from '../lib/supabase';
import { getCoachById } from '../data/coachProfiles';
import { getCoachPersonality } from '../data/coachPersonalities';

interface Config {
  ema_halflife_days: number;        // 7 (smoothing for trend weight)
  kcal_per_lb: number;               // 3500.0 (default energy/weight ratio)
  adapt_floor: number;               // 0.10 (min adaptation %)
  adapt_ceiling: number;             // 0.25 (max adaptation %)
  adapt_gain: number;                // 0.45 (sensitivity)
  min_weighins_per_week: number;    // 1
  min_days_for_update: number;      // 3
  weekly_days: number;               // 7
}

export class MetabolicAdaptationService {
  private static config: Config = {
    ema_halflife_days: 7,
    kcal_per_lb: 3500.0,
    adapt_floor: 0.10,
    adapt_ceiling: 0.25,
    adapt_gain: 0.45,
    min_weighins_per_week: 1,
    min_days_for_update: 3,
    weekly_days: 7,
  };

  /**
   * Calculate trend weight using Exponential Moving Average
   */
  private static calculateTrendWeight(weights: (number | null)[]): number[] {
    // EMA smoothing logic (converted from Python)
    const alpha = 1 - Math.exp(Math.log(0.5) / this.config.ema_halflife_days);
    const trend: number[] = [];

    // Forward fill missing values
    let lastValid = weights.find(w => w !== null) || 0;
    const filled = weights.map(w => w !== null ? w : lastValid);

    // Calculate EMA
    trend[0] = filled[0];
    for (let i = 1; i < filled.length; i++) {
      lastValid = filled[i];
      trend[i] = alpha * filled[i] + (1 - alpha) * trend[i - 1];
    }

    return trend;
  }

  /**
   * Detect metabolic adaptation for a user
   * Returns adaptation magnitude and recommended calorie adjustment
   */
  static async detectAdaptation(
    userId: string,
    weekStartDate: string
  ): Promise<{
    adapted: boolean;
    type: 'deficit_stall' | 'surplus_slow' | 'stable';
    magnitude: number;  // Percentage (e.g., -0.12 = 12% slowdown)
    oldCalories: number;
    newCalories: number;
    oldEE: number;
    newEE: number;
    coachExplanation: string;
  } | null> {

    // Get last 30 days of data
    const { data: trackingData, error } = await supabase
      .from('metabolic_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: true });

    if (error || !trackingData || trackingData.length < 14) {
      return null;  // Need at least 2 weeks of data
    }

    // Extract weights and intake
    const weights = trackingData.map(d => d.weight_lb);
    const intakes = trackingData.map(d => d.intake_kcal);

    // Calculate trend weights
    const trendWeights = this.calculateTrendWeight(weights);

    // Get week 2 vs week 4 comparison
    const week2Start = 7;
    const week2End = 14;
    const week4Start = 21;
    const week4End = 28;

    if (trackingData.length < week4End) return null;

    const week2Weight = trendWeights[week2Start];
    const week2WeightEnd = trendWeights[week2End];
    const week4Weight = trendWeights[week4Start];
    const week4WeightEnd = trendWeights[week4End];

    const week2Intake = intakes.slice(week2Start, week2End).filter(i => i).reduce((a, b) => a + b, 0) / 7;
    const week4Intake = intakes.slice(week4Start, week4End).filter(i => i).reduce((a, b) => a + b, 0) / 7;

    // Calculate weight change rate
    const week2Rate = (week2WeightEnd - week2Weight) / 7;  // lbs per day
    const week4Rate = (week4WeightEnd - week4Weight) / 7;

    // Detect adaptation
    const intakeStable = Math.abs(week4Intake - week2Intake) < 200;  // Within 200 kcal
    const rateDifference = week4Rate - week2Rate;

    // User is in deficit (losing weight) but loss rate slowed
    const deficitStall = week2Rate < -0.1 && rateDifference > 0.05 && intakeStable;

    // User is in surplus (gaining weight) but gain rate slowed
    const surplusSlow = week2Rate > 0.1 && rateDifference < -0.05 && intakeStable;

    if (!deficitStall && !surplusSlow) {
      return null;  // No significant adaptation detected
    }

    // Calculate adaptation magnitude
    const adaptType = deficitStall ? 'deficit_stall' : 'surplus_slow';
    const magnitude = deficitStall ?
      Math.min((rateDifference / Math.abs(week2Rate)), this.config.adapt_ceiling) :
      Math.min((Math.abs(rateDifference) / week2Rate), this.config.adapt_ceiling);

    // Calculate old EE (from week 2)
    const oldEE = Math.round(week2Intake - (week2Rate * this.config.kcal_per_lb));

    // Calculate new EE (from week 4)
    const newEE = Math.round(week4Intake - (week4Rate * this.config.kcal_per_lb));

    // Get current profile to determine old calories
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_calories, primary_goal, activity_level')
      .eq('id', userId)
      .single();

    const oldCalories = profile?.daily_calories || Math.round(week4Intake);

    // Calculate new recommended calories
    const calorieAdjustment = deficitStall ?
      -Math.round(oldCalories * magnitude) :  // Reduce further for stalled deficit
      Math.round(oldCalories * magnitude);     // Increase for slowed surplus

    const newCalories = Math.max(1200, oldCalories + calorieAdjustment);  // Never go below 1200

    // Generate coach explanation
    const coachExplanation = await this.generateCoachExplanation(
      userId,
      adaptType,
      magnitude,
      oldCalories,
      newCalories,
      week2Rate,
      week4Rate
    );

    return {
      adapted: true,
      type: adaptType,
      magnitude,
      oldCalories,
      newCalories,
      oldEE,
      newEE,
      coachExplanation
    };
  }

  /**
   * Generate personalized coach explanation for metabolic adaptation
   */
  private static async generateCoachExplanation(
    userId: string,
    adaptType: 'deficit_stall' | 'surplus_slow',
    magnitude: number,
    oldCalories: number,
    newCalories: number,
    oldRate: number,
    newRate: number
  ): Promise<string> {

    // Get user's primary coach (most recently used)
    const { data: recentChat } = await supabase
      .from('coach_messages')
      .select('coach_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const coachId = recentChat?.coach_id || 'synapse';  // Default to Synapse
    const personality = getCoachPersonality(coachId);

    if (!personality) {
      // Fallback generic explanation
      return `Your metabolism has adapted! I'm adjusting your daily calories from ${oldCalories} to ${newCalories} to keep you progressing toward your goal.`;
    }

    // Generate personality-specific explanation
    const percentChange = Math.round(magnitude * 100);
    const calorieChange = newCalories - oldCalories;

    if (adaptType === 'deficit_stall') {
      // Weight loss slowed despite consistent deficit
      switch (coachId) {
        case 'synapse':
          return `I've been analyzing your progress data, and I noticed something fascinating: even though you've been consistently hitting your ${oldCalories} calorie target, your weight loss rate has slowed from ${Math.abs(oldRate * 7).toFixed(1)} lbs/week to ${Math.abs(newRate * 7).toFixed(1)} lbs/week. This is metabolic adaptation - your body is becoming more efficient with energy. Research shows this happens to ~80% of dieters. I'm adjusting your target to ${newCalories} calories (${Math.abs(calorieChange)} fewer). This isn't a punishment - it's personalization based on how YOUR body responds. Your metabolism isn't broken; it's adapting. Let's work with it.`;

        case 'vetra':
          return `ENERGY CHECK! 🔥 Your body is adapting! Even with consistent ${oldCalories} cal intake, your loss rate dropped ${percentChange}%. This is NORMAL - your metabolism is getting efficient! Time to level up: new target is ${newCalories} cal. This keeps the momentum going! You're not failing - you're EVOLVING! Let's GO! 💪`;

        case 'aetheris':
          return `I see you standing at a threshold. Your body, wise and protective, has slowed its release from ${Math.abs(oldRate * 7).toFixed(1)} to ${Math.abs(newRate * 7).toFixed(1)} lbs per week. This is not resistance - it's adaptation. Your metabolism isn't broken; it's transforming. We're adjusting from ${oldCalories} to ${newCalories} calories. This isn't restriction, it's recalibration. From these ashes of what was, we build what's next. Trust this process.`;

        case 'verdant':
          return `Slow down and breathe with me. Your body is speaking, and it's saying: "I'm adapting." Over these weeks, your weight release has naturally slowed from ${Math.abs(oldRate * 7).toFixed(1)} to ${Math.abs(newRate * 7).toFixed(1)} lbs per week. Like a tree growing deeper roots before reaching higher, your metabolism is finding its new rhythm. We're gently adjusting from ${oldCalories} to ${newCalories} calories - not forcing, just flowing with your body's wisdom. There's no rush. Sustainable change grows from patience.`;

        case 'veloura':
          return `Data analysis complete. Your weight loss rate dropped ${percentChange}% despite ${oldCalories} cal adherence. Diagnosis: metabolic adaptation. Solution: recalibrate to ${newCalories} cal. This is strategic adjustment, not failure. Your system adapted; we counter-adapt. New targets loaded. Execute.`;

        case 'decibel':
          return `Hey! So I noticed something cool (well, scientifically cool, maybe not "yay" cool 😅): your metabolism adapted! You've been crushing your ${oldCalories} cal target, but your loss rate slowed from ${Math.abs(oldRate * 7).toFixed(1)} to ${Math.abs(newRate * 7).toFixed(1)} lbs/week. Totally normal! We're adjusting to ${newCalories} cal - think of it as your personalized sweet spot. You're not broken, you're just efficient! Let's make this work deliciously! 🐬`;

        default:
          return `Your metabolism has adapted to your ${oldCalories} calorie intake. I'm adjusting your target to ${newCalories} calories to continue progressing toward your goal. This is a normal part of the process!`;
      }
    } else {
      // Weight gain slowed despite consistent surplus (muscle building stalled)
      switch (coachId) {
        case 'synapse':
          return `Interesting data point: despite consistently eating ${oldCalories} calories in your surplus, your gain rate has slowed from ${(oldRate * 7).toFixed(1)} to ${(newRate * 7).toFixed(1)} lbs/week. Your metabolism is ramping up - this is actually a sign your body is efficiently using those calories. I'm increasing your target to ${newCalories} calories (+${calorieChange}) to maintain your muscle-building momentum. This is precision nutrition based on YOUR metabolic response.`;

        case 'vetra':
          return `POWER MOVE ALERT! 💪 Your metabolism is LEVELING UP! Even at ${oldCalories} cal, your gains slowed ${percentChange}%. That means your body is BURNING MORE! New target: ${newCalories} cal to keep those gains coming! You're not stalling - you're ADAPTING UPWARD! Let's fuel this machine! 🔥`;

        default:
          return `Your metabolism has increased! Moving from ${oldCalories} to ${newCalories} calories to maintain your muscle-building progress.`;
      }
    }
  }

  /**
   * Apply metabolic adaptation (update profile with new calories)
   */
  static async applyAdaptation(
    userId: string,
    adaptation: {
      type: 'deficit_stall' | 'surplus_slow' | 'stable';
      magnitude: number;
      oldCalories: number;
      newCalories: number;
      oldEE: number;
      newEE: number;
      coachExplanation: string;
    },
    coachId: string
  ): Promise<boolean> {

    try {
      // 1. Update profile with new calories
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ daily_calories: adaptation.newCalories })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 2. Record adaptation in database
      const { error: adaptError } = await supabase
        .from('metabolic_adaptations')
        .insert({
          user_id: userId,
          week_start_date: new Date().toISOString().split('T')[0],
          adaptation_type: adaptation.type,
          adaptation_magnitude: adaptation.magnitude,
          old_daily_calories: adaptation.oldCalories,
          new_daily_calories: adaptation.newCalories,
          old_ee_kcal: adaptation.oldEE,
          new_ee_kcal: adaptation.newEE,
          coach_id: coachId,
          coach_message: adaptation.coachExplanation,
        });

      if (adaptError) throw adaptError;

      // 3. Send in-app notification via coach message
      const { error: messageError } = await supabase
        .from('coach_messages')
        .insert({
          coach_id: coachId,
          user_id: userId,
          message: 'system_metabolic_adaptation_detected',
          response: adaptation.coachExplanation,
          created_at: new Date().toISOString(),
        });

      if (messageError) throw messageError;

      return true;

    } catch (error) {
      console.error('Failed to apply metabolic adaptation:', error);
      return false;
    }
  }
}
```

### 3. **Weekly Cron Job (Supabase Edge Function)**

**File:** `supabase/functions/weekly-metabolic-check/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active users who have logged food + weight recently
    const { data: activeUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('onboarding_completed', true);

    if (!activeUsers) {
      return new Response('No active users', { status: 200 });
    }

    let adaptationsDetected = 0;
    let adaptationsApplied = 0;

    // Check each user for metabolic adaptation
    for (const user of activeUsers) {
      // Call MetabolicAdaptationService.detectAdaptation()
      // (This would need to be exposed via another Edge Function or run client-side)

      // For now, this is a placeholder - actual implementation would:
      // 1. Fetch user's last 30 days of weight + food data
      // 2. Run adaptation detection algorithm
      // 3. If adaptation detected, update profile + send coach message
    }

    return new Response(
      JSON.stringify({
        message: 'Weekly metabolic check complete',
        checked: activeUsers.length,
        detected: adaptationsDetected,
        applied: adaptationsApplied,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
```

### 4. **Dashboard UI Component**

**File:** `src/components/dashboard/MetabolicTrendCard.tsx`

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

export const MetabolicTrendCard: React.FC<{
  trendWeights: number[];
  rawWeights: number[];
  adaptationDetected: boolean;
  coachExplanation?: string;
}> = ({ trendWeights, rawWeights, adaptationDetected, coachExplanation }) => {

  return (
    <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
      <Text className="text-xl font-bold mb-2">
        Your Weight Trend
      </Text>

      <LineChart
        data={{
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          datasets: [
            {
              data: rawWeights,
              color: () => 'rgba(150, 150, 150, 0.3)',  // Raw weight (gray)
              strokeWidth: 1,
            },
            {
              data: trendWeights,
              color: () => 'rgba(59, 130, 246, 1)',  // Trend weight (blue)
              strokeWidth: 3,
            }
          ],
          legend: ['Daily Weight', 'Trend (7-day)']
        }}
        width={300}
        height={200}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
      />

      {adaptationDetected && coachExplanation && (
        <View className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Text className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
            🧠 Metabolic Adaptation Detected
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            {coachExplanation}
          </Text>
        </View>
      )}
    </View>
  );
};
```

---

## 🎯 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Add database schema (metabolic_tracking + metabolic_adaptations tables)
- [ ] Create MetabolicAdaptationService.ts with core algorithm
- [ ] Add daily tracking: log weight + food intake → metabolic_tracking table

### Phase 2: Detection (Week 2)
- [ ] Implement detectAdaptation() method
- [ ] Test with synthetic data (deficit stall, surplus slow)
- [ ] Add unit tests matching Python pytest suite

### Phase 3: Coach Integration (Week 3)
- [ ] Implement generateCoachExplanation() with personality-specific responses
- [ ] Create applyAdaptation() method to update profile + send message
- [ ] Test each coach's explanation style

### Phase 4: UI & Automation (Week 4)
- [ ] Build MetabolicTrendCard dashboard component
- [ ] Add trend weight graph to Progress screen
- [ ] Create weekly cron job (Supabase Edge Function)
- [ ] Add settings toggle: "Enable automatic metabolic adjustments"

---

## ✅ Success Criteria

1. **Algorithm Accuracy**
   - Detects deficit stalls within 10% error margin
   - Detects surplus slows within 10% error margin
   - Handles missing data gracefully

2. **Coach Quality**
   - Each coach's explanation feels authentic to their personality
   - Users understand WHY their calories changed
   - 80%+ of users acknowledge adaptation messages positively

3. **User Experience**
   - Dashboard shows trend weight (not just raw weight)
   - Adaptation explanations feel warm, not clinical
   - Users trust the automatic adjustments

4. **Technical Performance**
   - Algorithm runs in <100ms per user
   - Weekly cron job completes in <5 minutes for 10k users
   - Database queries optimized with indexes

---

## 🚀 Competitive Impact

### Before Integration
**MindFork:** Great coaches, no metabolic adaptation
**MacroFactor:** Great metabolic adaptation, no coaches

### After Integration
**MindFork:** Great coaches + Great metabolic adaptation = UNBEATABLE

**Result:** MindFork becomes the ONLY app that combines:
- MacroFactor's proven adaptive algorithm
- Emotional intelligence & personality
- Warm explanations instead of cold data

---

## 📝 Next Steps

**Decision Required:**
1. ✅ Approve this integration plan?
2. ✅ Start with Phase 1 (database schema + service)?
3. ⚠️ OR defer to future sprint?

**Estimated Effort:**
- Phase 1: 6-8 hours
- Phase 2: 8-10 hours
- Phase 3: 10-12 hours
- Phase 4: 8-10 hours
- **Total: ~40 hours (1 week of focused work)**

**ROI:**
- Closes #1 competitive gap vs MacroFactor
- Increases retention (users see better results)
- Justifies premium pricing ($79-99/year)
- Maintains MindFork's warm, coach-first identity

---

## 💡 Summary

This integration is **HIGH-ROI** and **BRAND-ALIGNED**.

We're not copying MacroFactor - we're **transcending** them by wrapping their cold algorithm in warm, empathetic AI coaching.

**Recommendation: PROCEED with implementation.**

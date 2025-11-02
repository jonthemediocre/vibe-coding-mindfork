# 📋 PHASED IMPLEMENTATION PLAN - Mathematical Primitives Integration

**Date**: 2025-11-02
**Status**: 🎯 **ACTIVE ROADMAP - DO NOT DELETE**

---

## 🎯 Overview

This is the **definitive implementation plan** for integrating advanced mathematical primitives into MindFork's food tracking system. Each phase has clear triggers, success criteria, and code to implement.

**DO NOT SKIP PHASES** - Each builds on the previous.

---

## PHASE 0: Critical Fixes (ACTIVE - Start Now)

**Trigger**: User reports inaccurate food tracking
**Duration**: 1-2 days
**Status**: 🔴 **IN PROGRESS**

### Tasks:

#### ✅ Task 0.1: Add OpenRouter API Credits
**Status**: ⚠️ **BLOCKED** - Need credits to test
**Action**: Add $20 credits at https://openrouter.ai/settings/credits
**Trigger Complete**: When `node test-food-analysis.js` runs without 402 errors

---

#### ✅ Task 0.2: Validate Multi-Stage V4 Accuracy
**Status**: ⏸️ **WAITING** for Task 0.1
**File**: `test-food-analysis.js`
**Action**: Run full 14-food test suite
```bash
node test-food-analysis.js
```
**Success Criteria**: ≥75% calorie accuracy
**Trigger Complete**: When test results show accuracy improvement

---

#### ✅ Task 0.3: Connect USDA API (If not already done)
**Status**: ⚠️ **NEEDS VERIFICATION**
**Check First**:
```bash
# Check if USDA API key exists
grep "USDA_API_KEY" .env

# Check if service exists
find src/services -name "*USDA*"
```

**If Missing - Create Service**:
**File**: `src/services/USDAFoodDataService.ts`
```typescript
import { USDAFood } from '../types/food';

export class USDAFoodDataService {
  private static readonly API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY;
  private static readonly BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

  /**
   * Search USDA FoodData Central
   */
  static async searchFoods(query: string, limit: number = 10): Promise<USDAFood[]> {
    if (!this.API_KEY || this.API_KEY === 'your_usda_api_key_here') {
      console.warn('USDA API key not configured');
      return [];
    }

    try {
      const response = await fetch(
        `${this.BASE_URL}/foods/search?query=${encodeURIComponent(query)}&pageSize=${limit}&api_key=${this.API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status}`);
      }

      const data = await response.json();

      return data.foods?.map((food: any) => ({
        fdcId: food.fdcId,
        description: food.description,
        brandName: food.brandName,
        brandOwner: food.brandOwner,
        gtinUpc: food.gtinUpc,
        foodNutrients: food.foodNutrients || [],
        servingSize: food.servingSize,
        servingSizeUnit: food.servingSizeUnit,
      })) || [];
    } catch (error) {
      console.error('USDA search failed:', error);
      return [];
    }
  }

  /**
   * Get specific food by FDC ID
   */
  static async getFoodById(fdcId: number): Promise<USDAFood | null> {
    if (!this.API_KEY || this.API_KEY === 'your_usda_api_key_here') {
      return null;
    }

    try {
      const response = await fetch(
        `${this.BASE_URL}/food/${fdcId}?api_key=${this.API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status}`);
      }

      const food = await response.json();

      return {
        fdcId: food.fdcId,
        description: food.description,
        brandName: food.brandName,
        brandOwner: food.brandOwner,
        gtinUpc: food.gtinUpc,
        foodNutrients: food.foodNutrients || [],
        servingSize: food.servingSize,
        servingSizeUnit: food.servingSizeUnit,
      };
    } catch (error) {
      console.error('USDA fetch failed:', error);
      return null;
    }
  }
}
```

**Trigger Complete**: When USDA API returns results for "chicken breast"

---

## PHASE 1: Immediate Wins (Start After Phase 0)

**Trigger**: Phase 0 complete AND accuracy <80%
**Duration**: 2-3 days
**Priority**: 🔴 **P0 - Critical**

---

### ✅ Task 1.1: Nutrition Constraint Validation

**Trigger**: Any nutrition label OCR or AI food analysis
**Mathematical Basis**: `cals ≈ 4*protein + 4*carbs + 9*fat` (Atwater factors)
**Effort**: 1 hour
**Impact**: Catches 30-40% of OCR errors

**File**: `src/services/NutritionConstraintValidator.ts`
```typescript
/**
 * Validates nutrition data against thermodynamic constraints
 * Based on Atwater factors: P=4 kcal/g, C=4 kcal/g, F=9 kcal/g
 */

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  error: number;
  expectedCalories: number;
  correctedCalories: number;
  message: string;
  penalty: number; // L_cons from mathematical framework
}

export class NutritionConstraintValidator {
  private static readonly TOLERANCE_KCAL = 20; // Allow 20 kcal discrepancy
  private static readonly ATWATER_PROTEIN = 4;
  private static readonly ATWATER_CARBS = 4;
  private static readonly ATWATER_FAT = 9;
  private static readonly ATWATER_FIBER = 2; // Partial calorie contribution
  private static readonly ATWATER_ALCOHOL = 7; // If we add alcohol tracking

  /**
   * Validates nutrition label against energy equation
   * Energy constraint: cals ≈ 4*P + 4*C + 9*F
   * Returns: { isValid, confidence, correctedCalories }
   */
  static validate(data: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
  }): ValidationResult {
    // Calculate expected calories using Atwater factors
    const expectedCalories =
      this.ATWATER_PROTEIN * data.protein_g +
      this.ATWATER_CARBS * data.carbs_g +
      this.ATWATER_FAT * data.fat_g -
      (data.fiber_g ? this.ATWATER_FIBER * data.fiber_g : 0); // Fiber reduces net carbs

    const error = Math.abs(data.calories - expectedCalories);

    // L_cons penalty (Lagrangian constraint penalty from framework)
    const penalty = error / Math.max(data.calories, expectedCalories);
    const confidence = Math.max(0, 1 - penalty);

    const isValid = error <= this.TOLERANCE_KCAL;

    return {
      isValid,
      confidence,
      error,
      expectedCalories: Math.round(expectedCalories),
      correctedCalories: error > 50 ? Math.round(expectedCalories) : data.calories,
      penalty,
      message: isValid
        ? 'Nutrition data is thermodynamically consistent'
        : `Warning: ${error} kcal discrepancy. Expected ~${Math.round(expectedCalories)} kcal based on macros`,
    };
  }

  /**
   * Auto-correct nutrition data if constraint violation is severe
   */
  static autoCorrect(data: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
  }): { calories: number; wascorrected: boolean; reason?: string } {
    const validation = this.validate(data);

    if (!validation.isValid && validation.error > 50) {
      return {
        calories: validation.correctedCalories,
        wasCorrect: true,
        reason: `Original ${data.calories} kcal violated energy balance by ${validation.error} kcal`,
      };
    }

    return {
      calories: data.calories,
      wasCorrect: false,
    };
  }
}
```

**Integration Point**:
**File**: `src/services/AIFoodScanService.ts`
```typescript
// Add after AI analysis:
import { NutritionConstraintValidator } from './NutritionConstraintValidator';

// In analyzeFoodImage(), after getting AI result:
const validation = NutritionConstraintValidator.validate({
  calories: aiResult.calories,
  protein_g: aiResult.protein || 0,
  carbs_g: aiResult.carbs || 0,
  fat_g: aiResult.fat || 0,
  fiber_g: aiResult.fiber || 0,
});

// If constraint violated, use corrected value
if (!validation.isValid) {
  console.warn(validation.message);
  aiResult.calories = validation.correctedCalories;
  aiResult.confidence = Math.min(aiResult.confidence, validation.confidence);
}
```

**Test**:
```bash
# Create test file: src/services/__tests__/NutritionConstraintValidator.test.ts
bun test NutritionConstraintValidator
```

**Success Criteria**:
- [ ] Catches calorie errors >50 kcal
- [ ] Auto-corrects severe violations
- [ ] Reduces overall calorie MAPE by 10%+

**Trigger Complete**: When validation catches at least 1 error in test suite

---

### ✅ Task 1.2: Multi-Model Uncertainty Ensemble

**Trigger**: AI confidence <80% OR multiple food items detected
**Mathematical Basis**: `Var[nutrients] = Σ_i w_i (n_i - E[n])^2`
**Effort**: 4 hours
**Impact**: Shows users realistic uncertainty (e.g., "280 ± 40 cal")

**File**: `src/services/UncertaintyEnsembleService.ts`
```typescript
/**
 * Multi-model ensemble for uncertainty quantification
 * Based on mixture-of-experts with variance estimation
 */

import { AIFoodScanService } from './AIFoodScanService';
import { USDAFoodDataService } from './USDAFoodDataService';
import type { FoodAnalysisResult } from './AIFoodScanService';

interface EnsembleResult extends FoodAnalysisResult {
  range: [number, number]; // [min, max] calories
  variance: number;
  modelContributions: {
    model: string;
    weight: number;
    estimate: number;
  }[];
}

export class UncertaintyEnsembleService {
  /**
   * Analyze food using multiple models and compute uncertainty
   * Returns: mean ± 2*std_dev range
   */
  static async analyzeWithUncertainty(imageUri: string): Promise<EnsembleResult> {
    // Get predictions from multiple sources
    const predictions: Array<{ source: string; weight: number; result: FoodAnalysisResult }> = [];

    // Model 1: GPT-4V via OpenRouter (primary)
    try {
      const gptResult = await AIFoodScanService.analyzeFoodImage(imageUri);
      if (gptResult) {
        predictions.push({
          source: 'GPT-4V',
          weight: 0.5, // Highest weight
          result: gptResult,
        });
      }
    } catch (error) {
      console.error('GPT-4V analysis failed:', error);
    }

    // Model 2: Claude (if API key available)
    // TODO: Add Claude Vision analysis
    // predictions.push({ source: 'Claude', weight: 0.3, result: claudeResult });

    // Model 3: USDA lookup (if name identified)
    if (predictions.length > 0 && predictions[0].result) {
      try {
        const usdaMatches = await USDAFoodDataService.searchFoods(
          predictions[0].result.name,
          3
        );
        if (usdaMatches.length > 0) {
          // Convert USDA result to FoodAnalysisResult format
          const usdaResult = this.convertUSDAToAnalysis(usdaMatches[0]);
          predictions.push({
            source: 'USDA',
            weight: 0.5, // High weight for verified data
            result: usdaResult,
          });
        }
      } catch (error) {
        console.error('USDA lookup failed:', error);
      }
    }

    // If only one model, return with lower confidence
    if (predictions.length === 1) {
      return {
        ...predictions[0].result,
        range: this.estimateRangeFromSingle(predictions[0].result),
        variance: Math.pow(predictions[0].result.calories * 0.2, 2), // Assume 20% uncertainty
        modelContributions: [
          {
            model: predictions[0].source,
            weight: 1.0,
            estimate: predictions[0].result.calories,
          },
        ],
      };
    }

    // Normalize weights
    const totalWeight = predictions.reduce((sum, p) => sum + p.weight, 0);
    predictions.forEach(p => (p.weight /= totalWeight));

    // Mixture: nutrients = Σ_i w_i * n_i
    const meanCalories = predictions.reduce(
      (sum, p) => sum + p.weight * p.result.calories,
      0
    );
    const meanProtein = predictions.reduce(
      (sum, p) => sum + p.weight * (p.result.protein || 0),
      0
    );
    const meanCarbs = predictions.reduce(
      (sum, p) => sum + p.weight * (p.result.carbs || 0),
      0
    );
    const meanFat = predictions.reduce(
      (sum, p) => sum + p.weight * (p.result.fat || 0),
      0
    );

    // Variance: Σ_i w_i (n_i - E[n])^2
    const variance = predictions.reduce(
      (sum, p) => sum + p.weight * Math.pow(p.result.calories - meanCalories, 2),
      0
    );

    const stdDev = Math.sqrt(variance);

    // Confidence based on agreement between models
    const agreement = 1 - stdDev / meanCalories;
    const confidence = Math.max(
      0.5,
      predictions.reduce((sum, p) => sum + p.weight * p.result.confidence, 0) * agreement
    );

    return {
      name: predictions[0].result.name, // Use primary model's name
      serving: predictions[0].result.serving,
      calories: Math.round(meanCalories),
      protein: Math.round(meanProtein),
      carbs: Math.round(meanCarbs),
      fat: Math.round(meanFat),
      fiber: predictions[0].result.fiber,
      confidence,
      range: [
        Math.max(0, Math.round(meanCalories - 2 * stdDev)),
        Math.round(meanCalories + 2 * stdDev),
      ],
      variance,
      modelContributions: predictions.map(p => ({
        model: p.source,
        weight: p.weight,
        estimate: p.result.calories,
      })),
    };
  }

  private static convertUSDAToAnalysis(usda: any): FoodAnalysisResult {
    // Extract nutrients from USDA format
    const getNutrient = (name: string): number => {
      const nutrient = usda.foodNutrients?.find((n: any) =>
        n.nutrientName?.toLowerCase().includes(name.toLowerCase())
      );
      return nutrient?.value || 0;
    };

    return {
      name: usda.description,
      serving: '100g',
      calories: getNutrient('Energy'),
      protein: getNutrient('Protein'),
      carbs: getNutrient('Carbohydrate'),
      fat: getNutrient('Total lipid'),
      fiber: getNutrient('Fiber'),
      confidence: 0.95, // USDA is highly reliable
    };
  }

  private static estimateRangeFromSingle(result: FoodAnalysisResult): [number, number] {
    // If only one model, estimate range based on confidence
    const uncertainty = result.calories * (1 - result.confidence);
    return [
      Math.max(0, Math.round(result.calories - uncertainty)),
      Math.round(result.calories + uncertainty),
    ];
  }
}
```

**Integration Point**:
**File**: `src/screens/food/FoodEntryConfirmScreen.tsx`
```typescript
// Show uncertainty range to user:
<View style={styles.uncertaintyDisplay}>
  <Text style={styles.caloriesText}>{foodData.calories} cal</Text>
  {foodData.range && (
    <Text style={styles.rangeText}>
      (Range: {foodData.range[0]} - {foodData.range[1]} cal)
    </Text>
  )}
  {foodData.modelContributions && (
    <Text style={styles.modelsText}>
      Based on {foodData.modelContributions.map(m => m.model).join(', ')}
    </Text>
  )}
</View>
```

**Success Criteria**:
- [ ] Shows confidence range for all analyses
- [ ] USDA data used when available
- [ ] Variance decreases when models agree

**Trigger Complete**: When uncertainty ranges display in UI

---

### ✅ Task 1.3: ECE Calibration Tracking

**Trigger**: After 100+ food analyses with user corrections
**Mathematical Basis**: `ECE = Σ_b |p_b - acc_b| * (n_b / N)`
**Effort**: 2 hours
**Impact**: Know if AI confidence scores are realistic

**File**: `src/services/CalibrationMetrics.ts`
```typescript
/**
 * Expected Calibration Error (ECE) tracking
 * Measures if confidence scores match actual accuracy
 */

export interface CalibrationData {
  predictions: Array<{
    confidence: number;
    wasCorrect: boolean;
    calorieError: number;
  }>;
  ece: number;
  calibrationCurve: Array<{
    binCenter: number;
    meanConfidence: number;
    meanAccuracy: number;
    count: number;
  }>;
}

export class CalibrationMetrics {
  /**
   * Calculate Expected Calibration Error
   * ECE = Σ_b |p_b - acc_b| * (n_b / N)
   */
  static calculateECE(
    predictions: Array<{ confidence: number; wasCorrect: boolean }>,
    numBins: number = 10
  ): number {
    if (predictions.length === 0) return 0;

    // Create bins
    const bins: Array<{ confidences: number[]; accuracies: number[] }> = Array(numBins)
      .fill(0)
      .map(() => ({ confidences: [], accuracies: [] }));

    // Assign predictions to bins
    predictions.forEach(pred => {
      const binIndex = Math.min(
        numBins - 1,
        Math.floor(pred.confidence * numBins)
      );
      bins[binIndex].confidences.push(pred.confidence);
      bins[binIndex].accuracies.push(pred.wasCorrect ? 1 : 0);
    });

    // Calculate ECE
    let ece = 0;
    const N = predictions.length;

    bins.forEach(bin => {
      if (bin.confidences.length === 0) return;

      const p_b = bin.confidences.reduce((a, b) => a + b, 0) / bin.confidences.length;
      const acc_b = bin.accuracies.reduce((a, b) => a + b, 0) / bin.accuracies.length;
      const n_b = bin.confidences.length;

      ece += Math.abs(p_b - acc_b) * (n_b / N);
    });

    return ece;
  }

  /**
   * Get calibration curve for visualization
   */
  static getCalibrationCurve(
    predictions: Array<{ confidence: number; wasCorrect: boolean }>,
    numBins: number = 10
  ) {
    const bins: Array<{ confidences: number[]; accuracies: number[] }> = Array(numBins)
      .fill(0)
      .map(() => ({ confidences: [], accuracies: [] }));

    predictions.forEach(pred => {
      const binIndex = Math.min(
        numBins - 1,
        Math.floor(pred.confidence * numBins)
      );
      bins[binIndex].confidences.push(pred.confidence);
      bins[binIndex].accuracies.push(pred.wasCorrect ? 1 : 0);
    });

    return bins.map((bin, i) => ({
      binCenter: (i + 0.5) / numBins,
      meanConfidence:
        bin.confidences.length > 0
          ? bin.confidences.reduce((a, b) => a + b, 0) / bin.confidences.length
          : 0,
      meanAccuracy:
        bin.accuracies.length > 0
          ? bin.accuracies.reduce((a, b) => a + b, 0) / bin.accuracies.length
          : 0,
      count: bin.confidences.length,
    }));
  }

  /**
   * Temperature scaling to improve calibration
   * p_T = softmax(z/T)
   */
  static applyTemperatureScaling(
    confidence: number,
    temperature: number = 1.5
  ): number {
    // Convert confidence to logit
    const logit = Math.log(confidence / (1 - confidence));

    // Apply temperature
    const scaledLogit = logit / temperature;

    // Convert back to probability
    return 1 / (1 + Math.exp(-scaledLogit));
  }
}
```

**Integration Point**:
**File**: `src/services/FoodService.ts`
```typescript
// Track calibration data when user provides feedback
import { CalibrationMetrics } from './CalibrationMetrics';

// In createFoodEntry(), after user saves:
if (visionLogId && userFeedback) {
  const wasCorrect = userFeedback.type === 'correct';
  const calorieError = Math.abs(foodData.calories - originalAIEstimate);

  // Store for calibration tracking
  await supabase.from('calibration_data').insert({
    user_id: userId,
    confidence: originalConfidence,
    was_correct: wasCorrect,
    calorie_error: calorieError,
    created_at: new Date().toISOString(),
  });
}
```

**Success Criteria**:
- [ ] ECE calculated after 100+ predictions
- [ ] Calibration curve visualized in admin dashboard
- [ ] Temperature scaling improves ECE by 20%+

**Trigger Complete**: When ECE < 0.1 (well-calibrated)

---

## PHASE 2: Advanced Routing (Start After Phase 1)

**Trigger**: Phase 1 complete AND >500 active users
**Duration**: 1 week
**Priority**: 🟡 **P1 - High Value**

---

### ✅ Task 2.1: RA-UCB Coach Routing

**Trigger**: User has interacted with 3+ coaches
**Mathematical Basis**: `a* = argmax_a [ μ̂_a + sqrt(2 ln N / n_a) - β σ̂_a ]`
**Effort**: 6 hours
**Impact**: Better coach selection → 15-20% adherence improvement

**File**: `src/services/CoachRoutingService.ts`
```typescript
/**
 * Risk-Averse Upper Confidence Bound (RA-UCB) for coach selection
 * Balances exploration, exploitation, and risk aversion
 */

interface CoachStats {
  coachId: string;
  successCount: number; // Adherence events
  totalTrials: number; // Total interactions
  meanReward: number; // μ̂_a (average user satisfaction/adherence)
  rewardVariance: number; // σ̂_a (variance in outcomes)
  lastInteraction: Date;
}

export class CoachRoutingService {
  private static readonly BETA = 0.1; // Risk aversion parameter
  private static readonly EPSILON = 0.05; // Random exploration 5% of time

  /**
   * Select coach using RA-UCB algorithm
   * a* = argmax_a [ μ̂_a + sqrt(2 ln N / n_a) - β σ̂_a ]
   */
  static selectCoach(
    userId: string,
    coachStats: CoachStats[],
    totalTrials: number,
    userContext?: {
      currentGoal: string;
      adherenceScore: number;
      preferredStyle?: string;
    }
  ): string {
    // Random exploration (ε-greedy)
    if (Math.random() < this.EPSILON) {
      return coachStats[Math.floor(Math.random() * coachStats.length)].coachId;
    }

    // Calculate RA-UCB score for each coach
    const scores = coachStats.map(coach => {
      // Exploitation: current mean reward
      const exploitation = coach.meanReward;

      // Exploration: UCB bonus for under-explored coaches
      const exploration =
        coach.totalTrials > 0
          ? Math.sqrt((2 * Math.log(totalTrials)) / coach.totalTrials)
          : Infinity; // Prioritize never-tried coaches

      // Risk aversion: penalize high variance
      const riskPenalty = this.BETA * Math.sqrt(coach.rewardVariance);

      // RA-UCB formula
      const score = exploitation + exploration - riskPenalty;

      return {
        coachId: coach.coachId,
        score,
        exploitation,
        exploration,
        riskPenalty,
      };
    });

    // Return coach with highest RA-UCB score
    const bestCoach = scores.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    console.log('RA-UCB Coach Selection:', {
      selected: bestCoach.coachId,
      score: bestCoach.score,
      exploitation: bestCoach.exploitation,
      exploration: bestCoach.exploration,
      riskPenalty: bestCoach.riskPenalty,
    });

    return bestCoach.coachId;
  }

  /**
   * Update coach statistics after user interaction
   */
  static async updateCoachStats(
    userId: string,
    coachId: string,
    reward: number, // 0-1 score (adherence, satisfaction, etc.)
    outcome: 'success' | 'neutral' | 'failure'
  ): Promise<void> {
    // Fetch current stats
    const { data: stats } = await supabase
      .from('coach_routing_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .single();

    if (!stats) {
      // First interaction with this coach
      await supabase.from('coach_routing_stats').insert({
        user_id: userId,
        coach_id: coachId,
        success_count: outcome === 'success' ? 1 : 0,
        total_trials: 1,
        mean_reward: reward,
        reward_variance: 0,
        last_interaction: new Date().toISOString(),
      });
    } else {
      // Update existing stats using online algorithm
      const n = stats.total_trials;
      const oldMean = stats.mean_reward;
      const oldVariance = stats.reward_variance;

      // Update mean: μ_new = μ_old + (x - μ_old) / n
      const newMean = oldMean + (reward - oldMean) / (n + 1);

      // Update variance: σ²_new = (n-1)/n * σ²_old + (x - μ_new)² / n
      const newVariance =
        ((n - 1) / n) * oldVariance + Math.pow(reward - newMean, 2) / n;

      await supabase
        .from('coach_routing_stats')
        .update({
          success_count: stats.success_count + (outcome === 'success' ? 1 : 0),
          total_trials: n + 1,
          mean_reward: newMean,
          reward_variance: newVariance,
          last_interaction: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('coach_id', coachId);
    }
  }

  /**
   * Calculate reward from user behavior
   */
  static calculateReward(userBehavior: {
    loggedFood: boolean;
    completedGoal: boolean;
    respondedToCoach: boolean;
    adherenceScore: number;
  }): number {
    // Multi-objective reward function
    let reward = 0;

    if (userBehavior.loggedFood) reward += 0.3;
    if (userBehavior.completedGoal) reward += 0.4;
    if (userBehavior.respondedToCoach) reward += 0.2;
    reward += 0.1 * userBehavior.adherenceScore; // 0-1 scale

    return Math.min(1, reward);
  }
}
```

**Database Migration**:
**File**: `database/migrations/coach_routing_stats_schema.sql`
```sql
-- Coach routing statistics for RA-UCB
CREATE TABLE IF NOT EXISTS coach_routing_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  success_count INTEGER DEFAULT 0,
  total_trials INTEGER DEFAULT 0,
  mean_reward FLOAT DEFAULT 0,
  reward_variance FLOAT DEFAULT 0,
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, coach_id)
);

CREATE INDEX idx_coach_routing_user ON coach_routing_stats(user_id);
CREATE INDEX idx_coach_routing_coach ON coach_routing_stats(coach_id);
```

**Success Criteria**:
- [ ] Coaches with higher success rates selected more often
- [ ] Under-explored coaches get tried occasionally
- [ ] User adherence improves 15%+ over random assignment

**Trigger Complete**: When coach routing stats show convergence

---

## PHASE 3: Engagement Optimization (Start After Phase 2)

**Trigger**: >1,000 active users AND engagement data collected
**Duration**: 2 weeks
**Priority**: 🟢 **P2 - Growth Phase**

---

### ✅ Task 3.1: Hawkes Process Send-Time Optimization

**Trigger**: User has 30+ days of engagement history
**Mathematical Basis**: `λ(t) = μ + Σ_k α_k exp(-δ (t - t_k))`
**Effort**: 1 day
**Impact**: 20-30% increase in notification open rates

**File**: `src/services/NotificationScheduler.ts`
```typescript
/**
 * Hawkes process for optimal notification timing
 * Models self-exciting intensity (past engagement boosts future likelihood)
 */

export class NotificationScheduler {
  private static readonly BASE_INTENSITY = 0.1; // μ (baseline per hour)
  private static readonly DECAY_RATE = 0.5; // δ (decay per hour)
  private static readonly EXCITATION = 0.3; // α (boost from past engagement)

  /**
   * Calculate intensity function at time t
   * λ(t) = μ + Σ_k α_k exp(-δ (t - t_k))
   */
  static calculateIntensity(currentTime: Date, pastEngagements: Date[]): number {
    let intensity = this.BASE_INTENSITY;

    for (const t_k of pastEngagements) {
      const hoursSince =
        (currentTime.getTime() - t_k.getTime()) / (1000 * 60 * 60);

      if (hoursSince >= 0) {
        // Only count past events
        intensity += this.EXCITATION * Math.exp(-this.DECAY_RATE * hoursSince);
      }
    }

    return intensity;
  }

  /**
   * Find optimal send time in window
   * t* = argmax_t P(open|t) * P(convert|t)
   */
  static findOptimalSendTime(
    userId: string,
    windowStart: Date,
    windowEnd: Date,
    engagementHistory: Date[]
  ): Date {
    let bestTime = windowStart;
    let maxIntensity = 0;

    // Sample every 30 minutes
    const samplingInterval = 30 * 60 * 1000; // 30 minutes in ms

    for (
      let t = windowStart.getTime();
      t <= windowEnd.getTime();
      t += samplingInterval
    ) {
      const currentTime = new Date(t);
      const intensity = this.calculateIntensity(currentTime, engagementHistory);

      if (intensity > maxIntensity) {
        maxIntensity = intensity;
        bestTime = currentTime;
      }
    }

    return bestTime;
  }

  /**
   * Schedule next notification using Hawkes
   */
  static async scheduleNotification(
    userId: string,
    message: string,
    type: 'reminder' | 'motivation' | 'tip'
  ): Promise<Date> {
    // Get user's engagement history (last 7 days)
    const { data: engagements } = await supabase
      .from('user_engagements')
      .select('engaged_at')
      .eq('user_id', userId)
      .gte('engaged_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('engaged_at', { ascending: true });

    const history = engagements?.map(e => new Date(e.engaged_at)) || [];

    // Define send window (e.g., 9 AM - 9 PM today)
    const today = new Date();
    const windowStart = new Date(today);
    windowStart.setHours(9, 0, 0, 0);

    const windowEnd = new Date(today);
    windowEnd.setHours(21, 0, 0, 0);

    // Find optimal time
    const optimalTime = this.findOptimalSendTime(
      userId,
      windowStart,
      windowEnd,
      history
    );

    console.log(`Scheduled notification for ${userId} at ${optimalTime.toISOString()}`);

    // TODO: Actually schedule the notification
    // await scheduleSystemNotification(userId, message, optimalTime);

    return optimalTime;
  }
}
```

**Success Criteria**:
- [ ] Open rates improve 20%+ vs random timing
- [ ] Users engage more after recent activity (self-exciting)
- [ ] Notifications avoid low-intensity times

**Trigger Complete**: When open rates plateau at higher level

---

## PHASE 4: Privacy & Federated Learning (Future)

**Trigger**: Enterprise customers OR privacy regulations OR scale >100K users
**Duration**: 1 month
**Priority**: ⏭️ **P3 - Future Research**

---

### ✅ Task 4.1: Federated Averaging Setup

**Mathematical Basis**: `θ_{t+1} = Σ_k (n_k / N) * θ^{(k)}_t`
**Effort**: 2 weeks
**Impact**: Train models without centralizing user data

**Status**: ⏸️ **DEFERRED** - Not needed until scale or regulation requires

---

## 🎯 Trigger Checklist (Master Reference)

### Phase 0 Triggers:
- [ ] User reports inaccurate tracking
- [ ] OpenRouter credits depleted
- [ ] Test accuracy <75%

### Phase 1 Triggers:
- [x] Phase 0 complete
- [ ] Accuracy <80% after Phase 0
- [ ] Users complain about AI confidence

### Phase 2 Triggers:
- [ ] Phase 1 complete
- [ ] >500 active users
- [ ] User has 3+ coach interactions

### Phase 3 Triggers:
- [ ] Phase 2 complete
- [ ] >1,000 active users
- [ ] 30+ days engagement data per user

### Phase 4 Triggers:
- [ ] Enterprise customers
- [ ] Privacy regulations (GDPR/HIPAA)
- [ ] >100K users

---

## 📊 Success Metrics Dashboard

| Phase | Metric | Baseline | Target | Current | Status |
|-------|--------|----------|--------|---------|--------|
| **Phase 0** | Calorie Accuracy | 60% | 75% | - | 🔴 Not Started |
| **Phase 1.1** | Constraint Violations Caught | 0% | 30% | - | ⏸️ Pending |
| **Phase 1.2** | Uncertainty Range Shown | No | Yes | - | ⏸️ Pending |
| **Phase 1.3** | ECE (Calibration) | Unknown | <0.1 | - | ⏸️ Pending |
| **Phase 2.1** | Coach Selection Adherence | Random | +15% | - | ⏸️ Pending |
| **Phase 3.1** | Notification Open Rate | Baseline | +20% | - | ⏸️ Pending |

---

## 📁 File Checklist

### Files to Create:
- [ ] `src/services/NutritionConstraintValidator.ts`
- [ ] `src/services/UncertaintyEnsembleService.ts`
- [ ] `src/services/CalibrationMetrics.ts`
- [ ] `src/services/CoachRoutingService.ts`
- [ ] `src/services/NotificationScheduler.ts`
- [ ] `src/services/USDAFoodDataService.ts` (if missing)
- [ ] `database/migrations/coach_routing_stats_schema.sql`
- [ ] `database/migrations/calibration_data_schema.sql`

### Files to Update:
- [ ] `src/services/AIFoodScanService.ts` - Add constraint validation
- [ ] `src/screens/food/FoodEntryConfirmScreen.tsx` - Show uncertainty ranges
- [ ] `src/services/FoodService.ts` - Track calibration data

---

## 🚨 DO NOT DELETE THIS FILE

This is the master implementation plan. Reference it weekly:
- ✅ Monday: Check current phase triggers
- ✅ Wednesday: Update success metrics
- ✅ Friday: Mark completed tasks

**Last Updated**: 2025-11-02
**Next Review**: 2025-11-09

---

**Status**: 🎯 **ACTIVE** - Phase 0 in progress

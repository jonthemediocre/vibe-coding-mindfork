# 🧮 Mathematical Primitives Integration Plan - MindFork

**Date**: 2025-11-02

## Current State Assessment

### What Exists:
- ✅ Basic AI photo analysis (GPT-4V)
- ✅ USDA types/schema (not actively used)
- ✅ Barcode scanner component
- ✅ Multi-coach system with personalities
- ✅ Metabolic adaptation algorithm

### What's Missing (from your framework):
- ❌ Advanced OCR with CTC loss for nutrition labels
- ❌ Portion size estimation with depth/volume integration
- ❌ Uncertainty quantification (μ_V, σ_V)
- ❌ Mixture-of-Experts routing (RA-UCB)
- ❌ Hawkes process for send-time optimization
- ❌ Contextual bandits for channel selection

## Framework Alignment Analysis

### A) Barcode & Nutrition Label Pipeline

**Your Math:**
```
- CTC loss: L_CTC = -log P(y|x) with blank-augmented paths
- Table structure: bipartite matching via Hungarian (min Σ c_ij x_ij)
- Energy/macro constraints: cals ≈ 4*protein + 4*carbs + 9*fat
```

**Current MindFork Implementation:**
```typescript
// We have basic GPT-4V OCR:
const labelData = await openai.chat.completions.create({
  model: 'openai/gpt-4o-2024-11-20',
  messages: [{ role: 'user', content: 'Extract nutrition facts...' }]
});
```

**Gap:**
- No CTC loss training (we're using pretrained GPT-4V)
- No Hungarian table matching (GPT-4V does this internally)
- ✅ Could add constraint validation: `L_cons = |cals - 4*P - 4*C - 9*F|`

**Actionable:**
```typescript
// Add after OCR extraction:
function validateNutritionConstraints(data: NutritionLabel): ValidationResult {
  const expectedCals = 4 * data.protein_g + 4 * data.carbs_g + 9 * data.fat_g;
  const error = Math.abs(data.calories - expectedCals);
  const confidence = 1 - (error / data.calories); // L_cons penalty

  return {
    isValid: error < 20, // 20 cal tolerance
    confidence,
    correctedCalories: error > 50 ? expectedCals : data.calories
  };
}
```

---

### B) Food/Meal Image Understanding

**Your Math:**
```
B2) Portion size with depth: z = f * s / px
B3) Embedding retrieval: sim = <f_img, f_food> / (||f_img||·||f_food||)
B3) Uncertainty: Var[nutrients] = Σ_i w_i (n_i - E[n])^2
```

**Current MindFork:**
```typescript
// We use GPT-4V for everything (black box):
const analysis = await openai.chat.completions.create({
  messages: [{ role: 'user', content: 'Analyze food and estimate portion...' }]
});
// Returns: { name, serving, calories, confidence }
```

**Gap:**
- No explicit depth/volume calculation (GPT-4V does implicitly)
- No embedding retrieval against USDA database
- No uncertainty propagation (Var[nutrients])

**Actionable (High Value):**
```typescript
// Multi-model ensemble for uncertainty:
async function analyzeWithUncertainty(imageUri: string): Promise<AnalysisWithUncertainty> {
  // Get predictions from 3 models
  const results = await Promise.all([
    analyzeWithGPT4V(imageUri),      // μ1, weight: 0.5
    analyzeWithClaude(imageUri),     // μ2, weight: 0.3
    analyzeWithUSDARetrieval(imageUri) // μ3, weight: 0.2
  ]);

  // Mixture: nutrients = Σ_i w_i * n_i
  const weights = [0.5, 0.3, 0.2];
  const meanCalories = results.reduce((sum, r, i) => sum + weights[i] * r.calories, 0);

  // Variance: Σ_i w_i (n_i - E[n])^2
  const variance = results.reduce((sum, r, i) =>
    sum + weights[i] * Math.pow(r.calories - meanCalories, 2), 0
  );

  return {
    calories: meanCalories,
    confidence: 1 - Math.sqrt(variance) / meanCalories, // Higher variance = lower confidence
    range: [meanCalories - 2*Math.sqrt(variance), meanCalories + 2*Math.sqrt(variance)]
  };
}
```

---

### C) Coaches: Knowledge, Personas, Routing

**Your Math:**
```
C1) RA-UCB: a* = argmax_a [ μ̂_a + sqrt(2 ln N / n_a) - β σ̂_a ]
C3) Policy gradient: maximize E[R] - τ * KL(π || π_ref)
```

**Current MindFork:**
```typescript
// Simple selection by user preference:
const selectedCoach = user.preferred_coach_id
  ? coaches.find(c => c.id === user.preferred_coach_id)
  : coaches[0]; // Default to first coach
```

**Gap:**
- No UCB-based routing (no exploitation/exploration tradeoff)
- No reward tracking per coach
- No KL-constrained policy

**Actionable (Medium Priority):**
```typescript
interface CoachStats {
  coachId: string;
  successCount: number;  // n_success
  totalTrials: number;   // n_a
  meanReward: number;    // μ̂_a
  rewardVariance: number; // σ̂_a
}

function selectCoachRAUCB(
  coaches: CoachStats[],
  totalTrials: number,
  beta: number = 0.1
): string {
  // RA-UCB: a* = argmax_a [ μ̂_a + sqrt(2 ln N / n_a) - β σ̂_a ]
  const scores = coaches.map(coach => {
    const exploitation = coach.meanReward;
    const exploration = Math.sqrt((2 * Math.log(totalTrials)) / coach.totalTrials);
    const riskaverse = beta * Math.sqrt(coach.rewardVariance);
    return {
      coachId: coach.coachId,
      score: exploitation + exploration - riskaverse
    };
  });

  return scores.reduce((best, curr) =>
    curr.score > best.score ? curr : best
  ).coachId;
}
```

---

### D) Engagement: Voice/SMS/Call Scheduling

**Your Math:**
```
D1) Hawkes: λ(t) = μ + Σ_k α_k exp(-δ (t - t_k))
D2) Contextual bandit: c* = argmax_c [ μ̂_c(x) + UCB_c ]
```

**Current MindFork:**
- ❌ No push notification scheduling
- ❌ No send-time optimization
- ❌ No channel selection logic

**Gap:** Entire engagement system missing

**Actionable (Lower Priority - Post-Launch):**
```typescript
// Simplified Hawkes for notification timing:
class NotificationScheduler {
  private baseIntensity = 0.1; // μ (baseline per hour)
  private decayRate = 0.5;     // δ (decay per hour)
  private excitation = 0.3;    // α_k (boost from past engagement)

  calculateIntensity(currentTime: Date, pastEngagements: Date[]): number {
    // λ(t) = μ + Σ_k α_k exp(-δ (t - t_k))
    let intensity = this.baseIntensity;

    for (const t_k of pastEngagements) {
      const hoursSince = (currentTime.getTime() - t_k.getTime()) / (1000 * 60 * 60);
      intensity += this.excitation * Math.exp(-this.decayRate * hoursSince);
    }

    return intensity;
  }

  findOptimalSendTime(startTime: Date, endTime: Date, engagementHistory: Date[]): Date {
    // t* = argmax_t P(open|t) * P(convert|t)
    // Simplified: find time with highest intensity
    let bestTime = startTime;
    let maxIntensity = 0;

    for (let t = new Date(startTime); t <= endTime; t.setHours(t.getHours() + 1)) {
      const intensity = this.calculateIntensity(t, engagementHistory);
      if (intensity > maxIntensity) {
        maxIntensity = intensity;
        bestTime = new Date(t);
      }
    }

    return bestTime;
  }
}
```

---

### E) Habit Formation & Programming

**Your Math:**
```
E1) Logistic adherence: P(adherence) = σ(θ^T x)
E3) EMA trend: m_t = (1-γ) m_{t-1} + γ x_t
```

**Current MindFork:**
```typescript
// We have EMA for metabolic adaptation!
const trendWeight = weights.reduce((ema, w, i) =>
  i === 0 ? w : ema + ALPHA * (w - ema),
  weights[0]
);
```

✅ **Already Implemented!** (in `MetabolicAdaptationService.ts`)

**Gap:** No logistic adherence prediction

**Actionable:**
```typescript
function predictAdherence(userFeatures: UserFeatures): number {
  // P(adherence) = σ(θ^T x)
  const weights = {
    streak: 0.3,
    daysSinceLastLog: -0.2,
    goalProgress: 0.4,
    coachEngagement: 0.2
  };

  const logit =
    weights.streak * userFeatures.currentStreak +
    weights.daysSinceLastLog * userFeatures.daysSinceLastLog +
    weights.goalProgress * userFeatures.goalProgress +
    weights.coachEngagement * userFeatures.coachEngagementScore;

  return 1 / (1 + Math.exp(-logit)); // σ(θ^T x)
}
```

---

### G) Evaluation & Calibration

**Your Math:**
```
G3) ECE = Σ_b |p_b - acc_b| * (n_b / N)
G3) Temperature scaling: p_T = softmax(z/T)
```

**Current MindFork:**
- ❌ No calibration metrics tracked
- ❌ No temperature scaling

**Actionable (Testing Phase):**
```typescript
function calculateECE(predictions: Prediction[], numBins: number = 10): number {
  // Expected Calibration Error: ECE = Σ_b |p_b - acc_b| * (n_b / N)

  const bins = Array(numBins).fill(0).map(() => ({
    confidences: [] as number[],
    accuracies: [] as number[]
  }));

  // Assign predictions to bins
  predictions.forEach(pred => {
    const binIndex = Math.floor(pred.confidence * numBins);
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
```

---

## Priority Integration Roadmap

### Phase 0: Critical Foundations (Week 1)
1. ✅ **Nutrition constraint validation** (A3) - Easy win, immediate value
2. ✅ **USDA retrieval integration** (B3) - Connect existing types to API
3. ✅ **Multi-model uncertainty** (B3) - Ensemble GPT-4V + Claude + USDA

### Phase 1: Core Math (Week 2-3)
4. ✅ **RA-UCB coach routing** (C1) - Better coach selection
5. ✅ **Adherence prediction** (E1) - Logistic model for retention
6. ✅ **ECE calibration** (G3) - Track AI accuracy reliability

### Phase 2: Advanced Features (Week 4+)
7. ⏭️ **Hawkes notification timing** (D1) - Optimal send times
8. ⏭️ **Contextual bandits** (D2) - Channel selection
9. ⏭️ **Temperature scaling** (G3) - Calibrate confidence scores

### Phase 3: Research/Future
10. ⏭️ **Federated learning** (H1-H2) - Privacy-preserving on-device training
11. ⏭️ **IPS policy evaluation** (G2) - Off-policy reward estimation

---

## Implementation Decisions

### What to Use GPT-4V For:
- ✅ OCR (CTC loss handled internally)
- ✅ Food recognition (trained on massive dataset)
- ✅ Initial portion estimation

### What to Add Math For:
- ✅ **Constraint validation** (catch OCR errors)
- ✅ **Uncertainty quantification** (multi-model ensemble)
- ✅ **Coach routing** (RA-UCB for better selection)
- ✅ **Adherence prediction** (logistic regression)
- ✅ **Calibration** (ECE metric)

### What NOT to Build:
- ❌ Custom CTC loss (GPT-4V already optimal)
- ❌ Custom depth estimation (monocular depth is hard, GPT-4V sufficient)
- ❌ Custom food embedding (GPT-4V + USDA retrieval better)

---

## Immediate Next Steps

**Today:**
1. Add nutrition constraint validation (10 lines of code)
2. Connect USDA API (use existing types)
3. Implement multi-model uncertainty ensemble

**This Week:**
4. Add RA-UCB coach routing
5. Track ECE for calibration
6. Build adherence prediction model

**Code Example - Start Here:**
```typescript
// src/services/NutritionConstraintValidator.ts
export class NutritionConstraintValidator {
  /**
   * Validates nutrition label against energy equation
   * Energy constraint: cals ≈ 4*P + 4*C + 9*F
   */
  static validate(data: NutritionLabel): ValidationResult {
    const expectedCals = 4 * data.protein_g + 4 * data.carbs_g + 9 * data.fat_g;
    const error = Math.abs(data.calories - expectedCals);

    // L_cons penalty
    const penalty = error / data.calories;
    const confidence = Math.max(0, 1 - penalty);

    return {
      isValid: error < 20,
      confidence,
      error,
      expectedCals,
      correctedCalories: error > 50 ? Math.round(expectedCals) : data.calories,
      message: error > 20
        ? `Nutrition label may be incorrect. Expected ~${Math.round(expectedCals)} cal based on macros`
        : 'Nutrition data looks consistent'
    };
  }
}
```

---

## Summary

**Your mathematical framework is excellent** - it covers the full stack from perception to engagement to privacy.

**What MindFork needs RIGHT NOW:**
1. ✅ Constraint validation (A3) - 1 hour
2. ✅ Multi-model uncertainty (B3) - 4 hours
3. ✅ RA-UCB routing (C1) - 6 hours
4. ✅ ECE calibration (G3) - 2 hours

**What can wait:**
- Hawkes send-time (D1) - Post-launch
- Federated learning (H) - Future research

**The path forward:** Start with the 4 immediate implementations above, then layer in advanced features as we scale.

Want me to implement any of these? I'd recommend starting with constraint validation - it's a quick win that immediately improves accuracy.

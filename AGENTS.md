# Agent Coding Quality Framework

This document contains mathematical frameworks and principles for improving code quality, decision-making, and optimization across all coding tasks.

---

## 1) CODE QUALITY: OBJECTIVES & PENALTIES

### Unit/Integration Tests (Pass Rate)
```
Q_tests = (#passed / #total)
```

### Static Analysis (Weighted Violations)
```
Q_static = exp( - Σ_k w_k * v_k )
```

### Runtime Performance (Lower is Better), Normalized
```
Q_perf = exp( - α * (t_run / t_ref) )
```

### Coverage (Branch/Line/Function)
```
Q_cov = (b + l + f) / 3
```

### Complexity Penalties
```
Cyclomatic:  M = E - N + 2P
Halstead:    V = N * log2(n)
Maintainability (scaled): MI = 171 - 5.2*ln(V) - 0.23*M - 16.2*ln(LOC)
```

### Composite Code Score (Maximize)
```
Q_code = w1*Q_tests + w2*Q_static + w3*Q_perf + w4*Q_cov - w5*norm(M) - w6*norm(V)
```

### Regression Guard (No Quality Drop)
```
L_regress = max(0, Q_prev - Q_code)
```

---

## 2) PROGRAM SYNTHESIS / SEARCH

### Candidate Ranking (Bayes/Posterior)
```
score(x) ∝ p(pass|x)^α * p(style|x)^β * p(perf|x)^γ
```

### Best-of-N with Risk Aversion
```
Select: argmax_i [ E[Q_code(x_i)] - λ * Var(Q_code(x_i)) ]
```

---

## 3) TOOL/MODEL ROUTING (BANDITS)

### Cost-Aware, Risk-Adjusted UCB
```
UCB_a = μ̂_a - β*σ̂_a + c*sqrt(2 ln N / n_a) - κ*(cost_a)
Pick arm* = argmax_a UCB_a
```

### Thompson Sampling (Beta for Pass/Fail)
```
θ_a ~ Beta(α_a, β_a); pick arm with max θ_a
Update: α_a += success, β_a += fail
```

---

## 4) ROI & ECONOMICS

### Basic Experiment ROI
```
ROI = (p_succ * ΔValue - Cost) / Cost
```

### Risk-Adjusted (Sharpe-Like)
```
S = (E[ΔV] - r_f) / σ(ΔV)
```

### Decision Under Budget B (Knapsack)
```
max Σ_i ΔV_i * x_i
s.t. Σ_i Cost_i * x_i ≤ B, x_i ∈ {0,1}
```

### Value of Information (VOI)
```
VOI = E[ max_a U_a | new data ] - max_a E[U_a]
Run experiment if VOI ≥ Cost_experiment
```

### Kelly Fraction for Repeated Bets (Optional)
```
f* = (p*b - q)/b,  b = payoff ratio, q = 1-p
```

---

## 5) MULTI-OBJECTIVE BALANCE

### Objectives: Quality (↑), Speed (↑), Cost (↓), Risk (↓), Maintainability (↑)
```
L = α1*(1 - Q_code) + α2*(t_run/t_ref) + α3*norm(Cost) + α4*Risk - α5*MI
Minimize L  (tune αj or enforce Pareto front)
```

### Lexicographic Guard (Never Ship Regressions)
```
Constraint: Q_code ≥ Q_baseline  AND  MI ≥ MI_min
```

---

## 6) PLANNING & SCHEDULING

### Weighted Shortest Processing Time (WSRP)
```
Order tasks by ratio: p_i / w_i  (p=predicted time, w=business weight)
```

### Project Makespan with Critical Path (DAG)
```
T_total = max_path_length(G)
```

### Queueing (Dev/CI Lane) M/G/1
```
ρ = λ * E[S];  E[T] = E[S] + (λ * E[S^2])/(2*(1-ρ))
Throttle arrivals to keep ρ < 0.7
```

---

## 7) LEARNING LOOPS & STOP RULES

### Sequential Probability Ratio Test (SPRT)
```
Continue if A < Λ_t = Π_t p1(data)/p0(data) < B
Stop for H1 if Λ_t ≥ B; stop for H0 if Λ_t ≤ A
```

### Bayesian Optimization for Hyperparams
```
acq(h) = μ(h) + κ*σ(h)       (UCB)
EI(h)  = σ(h)*( zΦ(z) + φ(z) ), z=(μ(h)-y*)/σ(h)
```

---

## 8) RELIABILITY & RISK

### Failure Rate & MTBF
```
λ_fail = fails / time;   MTBF = 1 / λ_fail
```

### Risk Score Per Change
```
Risk = p_break * Impact = σ(θ^T x) * I
Use as penalty in L and for bandit β
```

---

## 9) DATA/KNOWLEDGE & RETRIEVAL

### Embedding Retrieval for Code/Context
```
sim = <e_q, e_doc> / (||e_q|| * ||e_doc||)
Top-K with MMR: argmax_j [ λ*sim(q,j) - (1-λ)*max_{s∈S} sim(j,s) ]
```

### Uncertainty via Ensembles/MC-Dropout
```
μ = mean(Q_code_i),  σ^2 = var(Q_code_i)
```

---

## 10) GOVERNANCE & GATES

### Promotion Gate (Must Pass All)
```
Gate = 1{ Q_code ≥ τ_Q  AND  L_regress = 0  AND  Risk ≤ τ_R  AND  ROI ≥ τ_ROI }
```

### Release Scoring (Weighted)
```
Score_release = γ1*Q_code + γ2*ROI - γ3*Risk - γ4*Cost
Ship if Score_release ≥ τ_ship
```

---

## 11) MINIMAL CONTROL LOOP (ONE-LINER)

```
minimize_θ  E[L]  where L = α1*(1 - Q_tests) + α2*norm(M) + α3*norm(Cost) + α4*Risk - α5*Q_cov

subject to: Q_code ≥ Q_baseline, MI ≥ MI_min

and route tools/models with: argmax_a ( μ̂_a - βσ̂_a - κ cost_a + c sqrt(2 ln N / n_a) )
```

---

## Application Guidelines

### When Writing Code
1. **Minimize cyclomatic complexity (M)**: Keep functions simple, avoid deep nesting
2. **Maximize test coverage (Q_cov)**: Aim for >80% branch coverage
3. **Maintain high maintainability index (MI)**: Keep MI > 65 (good), avoid MI < 20 (legacy)
4. **Guard against regressions**: Always ensure Q_code ≥ Q_baseline

### When Making Decisions
1. **Calculate ROI**: Don't implement features with negative expected ROI
2. **Consider risk**: High-risk changes need higher expected value to justify
3. **Use VOI**: Test/prototype when VOI ≥ Cost before full implementation
4. **Balance objectives**: Optimize for quality + speed - cost - risk

### When Choosing Tools/Approaches
1. **UCB for exploration**: Balance exploitation (μ̂) with exploration (uncertainty σ̂) and cost (κ)
2. **Thompson sampling**: Use for A/B decisions when you want stochastic exploration
3. **Best-of-N with risk aversion**: Generate multiple solutions, pick the one with best expected quality minus variance penalty

### When Planning Work
1. **WSRP ordering**: Tackle high-value, low-effort tasks first (maximize p_i / w_i)
2. **Critical path awareness**: Identify and optimize the longest dependency chain
3. **Queue management**: Keep utilization ρ < 0.7 to avoid exponential wait times

### When Testing/Validating
1. **SPRT for early stopping**: Don't waste time testing when outcome is already clear
2. **Bayesian optimization**: Use when tuning hyperparameters or searching config space
3. **Composite scoring**: Combine multiple metrics into weighted score for holistic evaluation

### Quality Gates (Must Pass)
```
✓ Q_code ≥ Q_baseline (no quality regression)
✓ MI ≥ MI_min (maintainable code)
✓ Risk ≤ τ_R (acceptable risk level)
✓ ROI ≥ τ_ROI (positive expected value)
```

Only ship code that passes ALL gates.

---

## Example: Applying Framework to Code Review

### Given Code Change:
```typescript
// Calculate metrics
Q_tests = 45/50 = 0.90          (90% tests pass)
M = 15                           (cyclomatic complexity)
V = 200                          (Halstead volume)
LOC = 150
MI = 171 - 5.2*ln(200) - 0.23*15 - 16.2*ln(150) = 92.3  (good maintainability)

Q_cov = (0.85 + 0.90 + 0.95) / 3 = 0.90  (90% coverage)
t_run = 1.2s, t_ref = 1.0s
Q_perf = exp(-1 * 1.2) = 0.30  (slower than reference)

// Composite score (example weights)
Q_code = 0.4*0.90 + 0.2*1.0 + 0.1*0.30 + 0.2*0.90 - 0.05*15 - 0.05*0.5
       = 0.36 + 0.2 + 0.03 + 0.18 - 0.75 - 0.025
       = 0.015 (needs improvement!)

// Diagnosis: Complexity (M=15) is too high, performance is poor
// Action: Refactor to reduce M, optimize hot paths
```

### Risk Assessment:
```
Risk = p_break * Impact
     = 0.15 * 8 = 1.2  (moderate risk)

// Risk factors:
// - Touches core business logic (high impact)
// - Complex change (M=15)
// - 10% test failures suggest edge cases

// Mitigation: Add more tests, reduce complexity before merge
```

### ROI Calculation:
```
ΔValue = 1000 (user value from feature)
Cost = 8 hours * $100/hr = $800
p_succ = 0.75 (75% chance of successful deployment)

ROI = (0.75 * 1000 - 800) / 800 = -0.0625 (-6.25%)

// Negative ROI! Consider:
// - Increase p_succ by reducing risk (more tests, simpler code)
// - Reduce cost (simplify implementation)
// - Increase value (ensure feature is truly needed)
```

---

## Key Takeaways

1. **Always measure**: Use Q_code, MI, M, V to quantify code quality
2. **Never regress**: Enforce Q_code ≥ Q_baseline as hard constraint
3. **Balance tradeoffs**: Optimize multi-objective loss function L
4. **Be risk-aware**: Include σ (uncertainty) and p_break in decisions
5. **Calculate ROI**: Don't build features with negative expected value
6. **Use gates**: Ship only when all quality gates pass
7. **Iterate with feedback**: Use bandits/Bayesian optimization to learn and improve

This framework should guide **all coding decisions** to maximize quality, minimize risk, and deliver value efficiently.

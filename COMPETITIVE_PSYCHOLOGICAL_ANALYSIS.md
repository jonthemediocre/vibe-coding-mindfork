# 🧠 Competitive & Psychological Analysis for World-Class AI Coach App
**Date**: 2025-11-03
**Focus**: Diet, Habit, Psychology-Driven AI Coaching

---

## 🎯 Elite Competitor Feature Analysis

### Apps Analyzed
1. **Noom** - Psychology-focused weight loss
2. **MacroFactor** - AI-powered adaptive diet coaching
3. **MyFitnessPal Premium** - Comprehensive tracking
4. **Lose It!** - Gamified weight loss
5. **Atomic Habits** - Habit formation
6. **Headspace** - Behavioral psychology
7. **Fitbit Premium** - Holistic health coaching

---

## 🧩 MISSING CRITICAL TABLES

### 1. **MOOD & EMOTIONAL STATE TRACKING** ⭐ CRITICAL

**Why**: Noom's secret sauce - correlating emotions with eating behaviors

```sql
CREATE TABLE mood_check_ins (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Mood dimensions (backed by psychology research)
  mood_valence INTEGER, -- 1-10: negative to positive
  mood_arousal INTEGER, -- 1-10: calm to excited
  mood_tags TEXT[], -- ['stressed', 'anxious', 'happy', 'bored', 'tired']

  -- Emotional eating indicators
  eating_triggered_by_emotion BOOLEAN,
  emotional_state_description TEXT,
  coping_mechanism_used TEXT, -- 'food', 'exercise', 'meditation', 'none'

  -- Context
  trigger_event TEXT, -- 'work_stress', 'argument', 'celebration', 'loneliness'
  location TEXT, -- 'home', 'work', 'restaurant', 'car'
  with_people TEXT[], -- 'alone', 'family', 'friends', 'colleagues'

  -- Physiological
  hunger_level INTEGER, -- 1-10: not hungry to starving
  energy_level INTEGER, -- 1-10: exhausted to energized
  stress_level INTEGER, -- 1-10

  -- Timing
  before_meal BOOLEAN, -- Captured before eating
  after_meal BOOLEAN, -- Captured after eating
  food_entry_id UUID REFERENCES food_entries(id),

  created_at TIMESTAMPTZ
);
```

**AI Training Value**:
- Predict emotional eating triggers
- Intervene BEFORE emotional eating occurs
- Personalize coaching based on emotional patterns

---

### 2. **COGNITIVE BEHAVIORAL THERAPY (CBT) THOUGHT RECORDS** ⭐ CRITICAL

**Why**: Track cognitive distortions and reframing (Noom's core methodology)

```sql
CREATE TABLE thought_records (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- CBT framework
  situation TEXT, -- "Saw donut at work"
  automatic_thought TEXT, -- "I deserve this, I've been good"
  cognitive_distortion TEXT[], -- ['all_or_nothing', 'emotional_reasoning']
  emotion TEXT, -- 'guilt', 'shame', 'pride'
  emotion_intensity INTEGER, -- 1-10

  -- Behavioral response
  behavior TEXT, -- 'ate_donut', 'walked_away', 'ate_half'
  consequence TEXT, -- 'felt_guilty_later', 'felt_proud'

  -- Reframing (AI coach helps with this)
  alternative_thought TEXT, -- "One donut won't ruin my progress"
  reframe_helpful BOOLEAN,

  -- Coach interaction
  coach_suggested_reframe TEXT,
  user_modified_reframe TEXT,

  created_at TIMESTAMPTZ
);
```

**AI Training Value**:
- Learn which reframes work for which users
- Detect cognitive distortion patterns
- Personalize CBT interventions

---

### 3. **HABIT STACK & IMPLEMENTATION INTENTIONS** ⭐ CRITICAL

**Why**: James Clear's "Atomic Habits" methodology - proven to increase success 2-3x

```sql
CREATE TABLE habit_stacks (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Implementation intention format: "When X, I will Y"
  trigger_cue TEXT, -- "After I brush my teeth in the morning"
  target_behavior TEXT, -- "I will drink a glass of water"

  -- Habit details
  habit_category TEXT, -- 'nutrition', 'exercise', 'sleep', 'stress'
  difficulty TEXT, -- 'tiny', 'small', 'medium', 'large'

  -- Tracking
  is_active BOOLEAN DEFAULT true,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,

  -- Tiny habits methodology
  celebration_phrase TEXT, -- "I'm awesome!" (BJ Fogg method)

  created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

CREATE TABLE habit_completions (
  id UUID PRIMARY KEY,
  habit_stack_id UUID REFERENCES habit_stacks(id),
  user_id UUID,

  completed BOOLEAN,
  difficulty_rating INTEGER, -- 1-10: how hard was it?
  satisfaction_rating INTEGER, -- 1-10: how satisfied?

  -- Context
  time_of_day TIME,
  mood_before TEXT,
  mood_after TEXT,

  notes TEXT,
  completed_at TIMESTAMPTZ
);
```

**AI Training Value**:
- Predict habit adherence likelihood
- Suggest optimal habit stacks per user
- Identify failing patterns early

---

### 4. **CRAVING & URGE TRACKING** ⭐ CRITICAL

**Why**: MacroFactor-style - predict and prevent diet adherence failures

```sql
CREATE TABLE cravings (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Craving details
  craved_food TEXT,
  craving_intensity INTEGER, -- 1-10
  craving_type TEXT, -- 'specific_food', 'general_sweet', 'general_salty', 'texture'

  -- Context (critical for prediction)
  time_since_last_meal_hours NUMERIC,
  calories_consumed_today INTEGER,
  sleep_hours_last_night NUMERIC,
  stress_level INTEGER,
  location TEXT,
  activity TEXT, -- 'watching_tv', 'working', 'socializing'

  -- Response
  gave_in BOOLEAN,
  delay_minutes INTEGER, -- How long did they resist?
  substitution_used TEXT, -- 'healthy_snack', 'water', 'walk', 'none'

  -- Outcome
  satisfaction_if_ate INTEGER, -- 1-10
  regret_level INTEGER, -- 1-10

  -- AI intervention
  coach_intervention_received BOOLEAN,
  intervention_helpful BOOLEAN,

  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);
```

**AI Training Value**:
- Predict cravings before they happen
- Intervene with personalized strategies
- Learn what substitutions work per user

---

### 5. **SELF-EFFICACY & CONFIDENCE TRACKING**

**Why**: Bandura's self-efficacy theory - best predictor of behavior change success

```sql
CREATE TABLE self_efficacy_assessments (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Confidence domains (1-10 scale)
  confidence_resist_temptation INTEGER,
  confidence_log_food_consistently INTEGER,
  confidence_exercise_regularly INTEGER,
  confidence_manage_stress INTEGER,
  confidence_reach_goal INTEGER,

  -- Barriers perceived
  barriers_identified TEXT[], -- ['time', 'motivation', 'support', 'knowledge']
  barriers_severity INTEGER, -- 1-10

  -- Mastery experiences (builds self-efficacy)
  recent_wins TEXT[],
  recent_challenges TEXT[],

  -- Social modeling (seeing others succeed)
  inspiration_sources TEXT[], -- 'friend', 'community', 'coach'

  assessed_at TIMESTAMPTZ
);
```

**AI Training Value**:
- Adjust coaching intensity based on confidence
- Celebrate wins to build self-efficacy
- Identify when user needs more support

---

### 6. **SOCIAL SUPPORT & ACCOUNTABILITY** ⭐ CRITICAL

**Why**: Social support is one of strongest predictors of weight loss success

```sql
CREATE TABLE accountability_partners (
  id UUID PRIMARY KEY,
  user_id UUID,
  partner_user_id UUID REFERENCES profiles(user_id),

  relationship_type TEXT, -- 'friend', 'family', 'coach', 'community_buddy'
  accountability_frequency TEXT, -- 'daily', 'weekly', 'as_needed'

  status TEXT, -- 'active', 'paused', 'ended'

  created_at TIMESTAMPTZ
);

CREATE TABLE accountability_check_ins (
  id UUID PRIMARY KEY,
  user_id UUID,
  partner_user_id UUID,

  check_in_type TEXT, -- 'daily_report', 'weekly_reflection', 'emergency_support'

  -- Shared data
  progress_shared TEXT, -- 'weight', 'photos', 'food_log', 'wins'
  message TEXT,

  -- Response
  partner_response TEXT,
  encouragement_received BOOLEAN,
  accountability_helpful BOOLEAN,

  created_at TIMESTAMPTZ
);

CREATE TABLE community_challenges (
  id UUID PRIMARY KEY,
  challenge_name TEXT,
  description TEXT,

  challenge_type TEXT, -- 'step_goal', 'water_intake', 'no_sweets_week'
  duration_days INTEGER,

  start_date DATE,
  end_date DATE,

  created_by_user_id UUID
);

CREATE TABLE challenge_participants (
  id UUID PRIMARY KEY,
  challenge_id UUID REFERENCES community_challenges(id),
  user_id UUID,

  completed BOOLEAN,
  completion_percentage NUMERIC,
  rank INTEGER,

  joined_at TIMESTAMPTZ
);
```

**AI Training Value**:
- Predict who needs more social support
- Match compatible accountability partners
- Optimize challenge difficulty

---

### 7. **MOTIVATION & GOAL ORIENTATION**

**Why**: Intrinsic vs extrinsic motivation predicts long-term success

```sql
CREATE TABLE motivation_assessments (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Motivation types (Self-Determination Theory)
  intrinsic_motivation INTEGER, -- 1-10: "I enjoy healthy eating"
  extrinsic_motivation INTEGER, -- 1-10: "I want to look good for event"
  identified_regulation INTEGER, -- 1-10: "It's important for my health"

  -- Why they want to change (crucial for AI coaching tone)
  primary_reason TEXT, -- 'health', 'appearance', 'energy', 'medical', 'family'
  secondary_reasons TEXT[],

  -- Values alignment
  aligned_with_values BOOLEAN,
  values_description TEXT,

  assessed_at TIMESTAMPTZ
);
```

---

### 8. **LAPSE, RELAPSE & RECOVERY TRACKING** ⭐ CRITICAL

**Why**: MacroFactor's adaptive algorithm - expects and plans for setbacks

```sql
CREATE TABLE lapses (
  id UUID PRIMARY KEY,
  user_id UUID,

  lapse_type TEXT, -- 'overeating', 'binge', 'skipped_logging', 'abandoned_plan'
  severity TEXT, -- 'minor', 'moderate', 'major'

  -- What happened
  trigger_description TEXT,
  foods_consumed JSONB,
  estimated_calories INTEGER,

  -- Emotional state
  emotions_during TEXT[],
  thoughts_during TEXT,

  -- Recovery
  recovery_action TEXT, -- 'got_back_on_track', 'talked_to_coach', 'gave_up_temporarily'
  recovery_time_hours INTEGER,

  -- AI intervention
  coach_helped_recovery BOOLEAN,
  intervention_type TEXT,

  -- Learning
  what_learned TEXT,
  prevention_plan TEXT, -- For next time

  occurred_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ
);
```

**AI Training Value**:
- Predict lapse risk
- Intervene before relapse
- Personalize recovery strategies

---

### 9. **NUTRITION KNOWLEDGE & EDUCATION PROGRESS**

**Why**: Track what user knows vs doesn't know to personalize education

```sql
CREATE TABLE nutrition_lessons (
  id UUID PRIMARY KEY,
  lesson_name TEXT,
  category TEXT, -- 'macros', 'meal_timing', 'portion_control', 'mindful_eating'
  difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'
  content JSONB,

  created_at TIMESTAMPTZ
);

CREATE TABLE user_lesson_progress (
  id UUID PRIMARY KEY,
  user_id UUID,
  lesson_id UUID REFERENCES nutrition_lessons(id),

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Comprehension
  quiz_score NUMERIC,
  time_spent_seconds INTEGER,

  -- Application
  applied_in_practice BOOLEAN,
  confidence_applying INTEGER, -- 1-10

  -- Feedback
  found_helpful BOOLEAN,
  feedback_text TEXT
);
```

---

### 10. **BIOLOGICAL & HORMONAL TRACKING** (Female Users)

**Why**: Menstrual cycle affects hunger, cravings, weight - critical for female users

```sql
CREATE TABLE menstrual_cycle_tracking (
  id UUID PRIMARY KEY,
  user_id UUID,

  cycle_day INTEGER, -- Day 1 = first day of period
  cycle_phase TEXT, -- 'menstrual', 'follicular', 'ovulation', 'luteal'

  -- Symptoms
  bloating_level INTEGER,
  craving_intensity INTEGER,
  mood_changes TEXT[],
  energy_level INTEGER,

  tracked_at DATE
);
```

**AI Training Value**:
- Adjust calorie goals by cycle phase
- Predict craving days
- Personalize coaching empathy

---

### 11. **ENVIRONMENTAL CUES & FOOD ENVIRONMENT**

**Why**: Environment shapes behavior (Brian Wansink research)

```sql
CREATE TABLE food_environment_audits (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Home environment
  healthy_foods_visible BOOLEAN,
  junk_food_visible BOOLEAN,
  kitchen_organization TEXT, -- 'organized', 'cluttered', 'messy'

  -- Portion control aids
  uses_small_plates BOOLEAN,
  has_food_scale BOOLEAN,
  has_meal_prep_containers BOOLEAN,

  -- Work environment
  work_has_vending_machines BOOLEAN,
  work_has_free_snacks BOOLEAN,
  healthy_lunch_options_available BOOLEAN,

  -- Social environment
  family_supportive BOOLEAN,
  friends_supportive BOOLEAN,
  dining_out_frequency_per_week INTEGER,

  audited_at TIMESTAMPTZ
);
```

---

### 12. **DECISION FATIGUE & COGNITIVE LOAD**

**Why**: Late-day willpower depletion (Roy Baumeister research)

```sql
CREATE TABLE decision_fatigue_tracking (
  id UUID PRIMARY KEY,
  user_id UUID,

  time_of_day TIME,
  decisions_made_today_estimate INTEGER,

  -- Cognitive state
  mental_energy INTEGER, -- 1-10
  decision_difficulty INTEGER, -- 1-10: how hard to choose healthy option

  -- Outcome
  chose_healthy_option BOOLEAN,
  relied_on_habits BOOLEAN, -- vs active decision

  tracked_at TIMESTAMPTZ
);
```

---

### 13. **MEAL PLANNING & PREPARATION**

**Why**: Meal prep = 2-3x more likely to stick to diet (multiple studies)

```sql
CREATE TABLE meal_prep_sessions (
  id UUID PRIMARY KEY,
  user_id UUID,

  prep_date DATE,
  meals_prepped INTEGER,
  servings_created INTEGER,
  time_spent_minutes INTEGER,

  -- Effectiveness
  helped_adherence BOOLEAN,
  saved_money_estimate NUMERIC,

  created_at TIMESTAMPTZ
);
```

---

### 14. **PLATE COMPOSITION & FOOD COMBINATIONS**

**Why**: Track if user follows "half plate vegetables" type rules

```sql
CREATE TABLE meal_composition_analysis (
  id UUID PRIMARY KEY,
  food_entry_id UUID REFERENCES food_entries(id),
  user_id UUID,

  -- Plate method analysis
  vegetables_percentage NUMERIC, -- % of plate
  protein_percentage NUMERIC,
  carbs_percentage NUMERIC,

  -- Quality scores (AI calculated)
  nutrient_density_score NUMERIC, -- 1-100
  satiety_score NUMERIC, -- Predicted fullness
  blood_sugar_impact TEXT, -- 'low', 'medium', 'high' (glycemic load)

  -- Variety
  food_groups_included TEXT[],
  color_variety_score INTEGER, -- More colors = more nutrients

  analyzed_at TIMESTAMPTZ
);
```

---

## 🎯 CRITICAL MISSING: Voice Note Reflections

**Why**: Users prefer talking to typing (especially while emotional)

```sql
CREATE TABLE voice_reflections (
  id UUID PRIMARY KEY,
  user_id UUID,

  audio_url TEXT,
  duration_seconds INTEGER,

  -- AI transcription & analysis
  transcript TEXT,
  sentiment TEXT, -- 'positive', 'negative', 'mixed'
  emotion_detected TEXT, -- 'frustrated', 'proud', 'confused'

  -- Content themes (AI extracted)
  topics TEXT[], -- ['struggled_today', 'proud_of_choice', 'seeking_advice']

  -- Coach response
  coach_responded BOOLEAN,
  coach_response_text TEXT,

  created_at TIMESTAMPTZ
);
```

---

## 📊 Summary: Must-Have Tables

### Tier 1: CRITICAL (Implement Now)
1. ✅ `mood_check_ins` - Emotional eating
2. ✅ `thought_records` - CBT methodology
3. ✅ `habit_stacks` + `habit_completions` - Atomic Habits
4. ✅ `cravings` - Predictive intervention
5. ✅ `lapses` - Relapse prevention
6. ✅ `accountability_partners` + `accountability_check_ins` - Social support

### Tier 2: HIGH PRIORITY
7. ✅ `self_efficacy_assessments` - Confidence tracking
8. ✅ `menstrual_cycle_tracking` - Female users (50%+ of market)
9. ✅ `voice_reflections` - Emotional journaling
10. ✅ `meal_prep_sessions` - Preparation = success

### Tier 3: NICE TO HAVE
11. `motivation_assessments`
12. `food_environment_audits`
13. `decision_fatigue_tracking`
14. `meal_composition_analysis`

---

## 🧠 AI Training Gold Mines

**Most Valuable for AI**:
1. **mood_check_ins** → Predict emotional eating 24hrs in advance
2. **cravings** → Intervene before user gives in
3. **thought_records** → Personalize CBT reframes
4. **habit_completions** → Predict adherence likelihood
5. **lapses** → Prevent relapse spirals

**These tables = competitive moat**

Would you like me to create the migration for these psychological/behavioral tables?

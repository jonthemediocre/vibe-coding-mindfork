# 📞 AI Coach Communication & Memory Infrastructure Gap Analysis
**Date**: 2025-11-03
**Focus**: Phone calls, SMS, cutting-edge AI memory, habit-forming interactions

---

## ✅ WHAT WE HAVE (Excellent Foundation!)

### Communication Infrastructure ✅
- **`coach_messages`** table with:
  - ✅ Channel support: 'in_app', 'sms', 'call', 'push'
  - ✅ Engagement tracking: sent_at, delivered_at, read_at, engaged_at
  - ✅ Feedback loop: helpfulness_rating, feedback_text
  - ✅ Call-to-action: cta_text, cta_action
  - ✅ Vector embeddings for semantic search

- **`voice_sessions`** table with:
  - ✅ Transcript storage
  - ✅ AI response tracking
  - ✅ Duration tracking

- **`messages`** table with:
  - ✅ Conversation history
  - ✅ Role-based messages (user, assistant, system)
  - ✅ Metadata storage

### AI Memory Infrastructure ✅
- **`ai_context_cache`**: Fast context retrieval (<10ms vs 200-300ms)
- **`ai_knowledge_sources`**: RAG grounding
- **Vector embeddings** on 5 tables: food_entries, recipes, nutrition_knowledge, coach_messages, coach_knowledge
- **4 RAG procedures**: match_similar_foods, match_knowledge_sources, get_user_ai_context, refresh_user_context

### Learning Infrastructure ✅
- **`ai_predictions`**: RLHF feedback loop
- **`coach_response_feedback`**: Coach message quality tracking
- **`user_behavior_events`**: Event stream
- **`user_outcome_metrics`**: Success metrics
- **`ai_experiments`**: A/B testing
- **`model_performance_logs`**: Production monitoring

### Habit Formation ✅ (Partially)
- **`habit_stacks`**: Implementation intentions
- **`habit_completions`**: NEW! Track execution (just added)
- **`user_streaks`**: Streak tracking
- **`achievements`**: Gamification
- **`predictive_nudges`**: Proactive interventions

---

## ❌ CRITICAL GAPS FOR WORLD-CLASS AI COACHING

### 1. PHONE CALL INFRASTRUCTURE ❌ MAJOR GAP!

**What we have**:
- ✅ `coach_messages.channel = 'call'` (field exists)
- ✅ `voice_sessions` (captures voice data)

**What's MISSING**:

```sql
-- MISSING: Phone call lifecycle tracking
CREATE TABLE phone_calls (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Call details
  call_direction TEXT, -- 'inbound', 'outbound'
  call_status TEXT, -- 'queued', 'ringing', 'in_progress', 'completed', 'failed', 'no_answer', 'busy'

  -- Timing
  initiated_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Twilio/provider tracking
  provider TEXT, -- 'twilio', 'vonage', 'plivo'
  provider_call_sid TEXT UNIQUE, -- External call ID
  from_phone TEXT,
  to_phone TEXT,

  -- Recording
  recording_url TEXT,
  recording_duration_seconds INTEGER,

  -- Transcription (AI processing)
  transcript TEXT,
  transcript_confidence NUMERIC,
  ai_summary TEXT, -- AI-generated call summary

  -- Key moments (AI extracted)
  key_topics TEXT[], -- ['cravings', 'motivation', 'celebration', 'struggle']
  sentiment TEXT, -- 'positive', 'negative', 'mixed', 'neutral'
  user_emotion TEXT, -- 'happy', 'frustrated', 'motivated', 'discouraged'

  -- AI coaching actions taken during call
  interventions_provided JSONB, -- [{type: 'reframe', timestamp: '...', effective: true}, ...]
  commitments_made TEXT[], -- What user committed to

  -- Follow-up
  follow_up_scheduled BOOLEAN,
  follow_up_at TIMESTAMPTZ,
  follow_up_type TEXT, -- 'call', 'sms', 'in_app'

  -- Quality & learning
  call_quality_score NUMERIC, -- 1-10
  user_satisfaction INTEGER, -- 1-10
  ai_performance_rating INTEGER, -- 1-10: How well did AI coach perform?

  -- Cost tracking
  cost_cents INTEGER,

  created_at TIMESTAMPTZ
);

-- MISSING: Real-time call state (for active calls)
CREATE TABLE active_calls (
  id UUID PRIMARY KEY,
  phone_call_id UUID REFERENCES phone_calls(id),
  user_id UUID,

  -- Real-time state
  current_state TEXT, -- 'greeting', 'listening', 'responding', 'intervening', 'wrapping_up'
  conversation_context JSONB, -- Live context for AI

  -- AI decision-making
  next_ai_action TEXT, -- 'ask_followup', 'provide_support', 'challenge_thinking', 'celebrate_win'
  confidence_level NUMERIC, -- How confident is AI in current approach?

  -- User signals (real-time analysis)
  detected_emotions TEXT[], -- Emotions detected in voice
  speech_pace TEXT, -- 'fast', 'normal', 'slow'
  energy_level TEXT, -- 'high', 'medium', 'low'

  last_updated_at TIMESTAMPTZ
);

-- MISSING: Call scheduling
CREATE TABLE scheduled_calls (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  timezone TEXT,

  -- Purpose
  call_purpose TEXT, -- 'check_in', 'intervention', 'celebration', 'accountability', 'crisis_support'
  ai_talking_points JSONB, -- What AI should focus on

  -- Reminder system
  reminder_sent_at TIMESTAMPTZ,

  -- Completion
  completed BOOLEAN DEFAULT false,
  phone_call_id UUID REFERENCES phone_calls(id),

  created_at TIMESTAMPTZ
);
```

---

### 2. SMS INFRASTRUCTURE ❌ MAJOR GAP!

**What we have**:
- ✅ `coach_messages.channel = 'sms'` (field exists)

**What's MISSING**:

```sql
-- MISSING: SMS conversation threading
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Message details
  direction TEXT, -- 'inbound', 'outbound'
  from_phone TEXT,
  to_phone TEXT,
  body TEXT,

  -- Twilio/provider
  provider TEXT, -- 'twilio', 'messagebird', 'plivo'
  provider_message_sid TEXT UNIQUE,

  -- Status tracking
  status TEXT, -- 'queued', 'sent', 'delivered', 'failed', 'undelivered'
  error_code TEXT,
  error_message TEXT,

  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- AI processing
  intent_detected TEXT, -- 'request_help', 'report_progress', 'log_food', 'ask_question', 'emergency'
  sentiment TEXT,
  requires_response BOOLEAN,

  -- Threading
  conversation_id UUID, -- Group related messages
  replied_to_message_id UUID REFERENCES sms_messages(id),

  -- Cost
  cost_cents INTEGER,

  created_at TIMESTAMPTZ
);

-- MISSING: SMS templates (for personalized texting)
CREATE TABLE sms_templates (
  id UUID PRIMARY KEY,

  -- Template details
  template_name TEXT UNIQUE,
  template_category TEXT, -- 'check_in', 'motivation', 'intervention', 'celebration', 'reminder'

  -- Dynamic content
  template_text TEXT, -- "Hey {first_name}! You're {days_on_streak} days into your streak! {personalized_message}"
  variables TEXT[], -- ['first_name', 'days_on_streak', 'personalized_message']

  -- AI personalization
  ai_personalization_enabled BOOLEAN DEFAULT true,
  personalization_context JSONB, -- What data AI should use

  -- Performance
  sent_count INTEGER DEFAULT 0,
  average_response_rate NUMERIC,
  average_engagement_score NUMERIC,

  -- A/B testing
  variant_of_template_id UUID REFERENCES sms_templates(id),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
);

-- MISSING: SMS campaigns (scheduled texting sequences)
CREATE TABLE sms_campaigns (
  id UUID PRIMARY KEY,
  campaign_name TEXT,

  -- Targeting
  target_user_segment TEXT, -- 'new_users', 'at_risk', 'high_performers', 'all'

  -- Sequence
  message_sequence JSONB, -- [{delay_hours: 0, template_id: 'xxx'}, {delay_hours: 24, template_id: 'yyy'}]

  -- Performance
  enrolled_users_count INTEGER DEFAULT 0,
  completion_rate NUMERIC,

  status TEXT, -- 'draft', 'active', 'paused', 'completed'

  created_at TIMESTAMPTZ
);
```

---

### 3. CUTTING-EDGE AI MEMORY ⚠️ PARTIALLY COMPLETE

**What we have**:
- ✅ Context caching
- ✅ Vector embeddings
- ✅ RAG knowledge sources
- ✅ Conversation history

**What's MISSING for TRULY cutting-edge memory**:

```sql
-- MISSING: Long-term episodic memory (remember specific moments)
CREATE TABLE ai_episodic_memory (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Memory content
  memory_type TEXT, -- 'victory', 'struggle', 'insight', 'preference', 'relationship', 'context'
  memory_description TEXT, -- "User mentioned they hate cooking on Mondays"

  -- When it happened
  original_timestamp TIMESTAMPTZ, -- When the event occurred
  source_type TEXT, -- 'conversation', 'phone_call', 'sms', 'food_log', 'behavior'
  source_id UUID, -- ID of original message/call/etc

  -- Memory strength (decays over time unless reinforced)
  strength NUMERIC DEFAULT 1.0, -- 0-1: How important/relevant is this memory?
  last_reinforced_at TIMESTAMPTZ, -- When was this memory last relevant?
  times_referenced INTEGER DEFAULT 0, -- How often has AI used this memory?

  -- Emotional valence (positive/negative memories)
  emotional_valence NUMERIC, -- -1 to 1: negative to positive

  -- Retrieval
  embedding VECTOR(1536), -- Semantic search
  tags TEXT[], -- ['cooking', 'monday', 'preference', 'barrier']

  -- Expiration (some memories should fade)
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ
);

-- MISSING: User preferences learned over time
CREATE TABLE learned_user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Preference details
  preference_category TEXT, -- 'communication_style', 'coaching_tone', 'meal_types', 'exercise', 'timing'
  preference_key TEXT, -- 'prefers_tough_love', 'loves_italian_food', 'night_owl'
  preference_value JSONB,

  -- Confidence (how sure is AI about this?)
  confidence NUMERIC, -- 0-1
  evidence_count INTEGER, -- How many data points support this?

  -- Learning source
  learned_from TEXT[], -- ['conversation', 'behavior_pattern', 'explicit_statement']

  -- Last observed
  last_confirmed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ,

  CONSTRAINT learned_preferences_unique UNIQUE(user_id, preference_category, preference_key)
);

-- MISSING: Conversation summaries (compress long histories)
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Time window
  summary_period TEXT, -- 'daily', 'weekly', 'monthly'
  start_date DATE,
  end_date DATE,

  -- Summary content
  key_topics TEXT[],
  main_insights TEXT,
  user_progress TEXT,
  challenges_discussed TEXT[],
  commitments_made TEXT[],

  -- Emotional tone
  overall_sentiment TEXT,
  user_motivation_level INTEGER, -- 1-10

  -- AI-generated summary
  ai_summary TEXT,
  embedding VECTOR(1536),

  created_at TIMESTAMPTZ
);

-- MISSING: Interaction patterns (when user is most receptive)
CREATE TABLE user_interaction_patterns (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Timing patterns
  most_active_hours INTEGER[], -- [7, 8, 12, 18, 21]
  most_active_days TEXT[], -- ['monday', 'wednesday', 'friday']

  -- Response patterns
  average_response_time_minutes INTEGER,
  preferred_communication_channel TEXT, -- 'sms', 'call', 'in_app'

  -- Engagement patterns
  most_engaging_message_types TEXT[], -- ['roast', 'celebration', 'micro_lesson']
  least_engaging_message_types TEXT[],

  -- Call patterns
  average_call_duration_seconds INTEGER,
  prefers_scheduled_calls BOOLEAN,
  best_call_times TIME[],

  -- Learning rate
  concept_mastery_speed TEXT, -- 'fast', 'medium', 'slow'
  needs_repetition_count INTEGER,

  -- Updated regularly
  last_analyzed_at TIMESTAMPTZ,
  confidence_score NUMERIC,

  created_at TIMESTAMPTZ,

  CONSTRAINT user_interaction_patterns_unique UNIQUE(user_id)
);
```

---

### 4. HABIT-FORMING / ADDICTIVE POSITIVE BEHAVIOR ⚠️ PARTIALLY COMPLETE

**What we have**:
- ✅ habit_stacks + habit_completions
- ✅ user_streaks
- ✅ achievements
- ✅ predictive_nudges

**What's MISSING for addiction-level engagement**:

```sql
-- MISSING: Dopamine-trigger events (micro-rewards)
CREATE TABLE dopamine_triggers (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Trigger type
  trigger_type TEXT, -- 'streak_milestone', 'level_up', 'badge_unlock', 'surprise_reward', 'social_recognition'
  trigger_name TEXT,

  -- Reward delivered
  reward_type TEXT, -- 'visual_animation', 'sound_effect', 'confetti', 'coach_celebration', 'unlock_feature'
  reward_intensity TEXT, -- 'small', 'medium', 'large', 'epic'

  -- Timing (critical for habit formation)
  delivered_at TIMESTAMPTZ,
  delay_from_action_seconds INTEGER, -- Immediate rewards = stronger habits

  -- User reaction
  user_engaged BOOLEAN,
  engagement_duration_seconds INTEGER,

  -- Effectiveness (learning)
  increased_next_day_engagement BOOLEAN,

  created_at TIMESTAMPTZ
);

-- MISSING: Variable reward schedule (most addictive pattern)
CREATE TABLE variable_rewards (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Reward scheduling (unpredictable = more addictive)
  reward_category TEXT, -- 'streak', 'logging', 'check_in', 'achievement'
  trigger_action TEXT, -- What action triggers potential reward?

  -- Probability (not every action gets reward = more addictive)
  reward_probability NUMERIC, -- 0-1: Chance of reward

  -- Reward delivered
  reward_delivered BOOLEAN,
  reward_type TEXT,
  surprise_factor NUMERIC, -- 0-1: How unexpected was this reward?

  -- Behavioral impact
  user_repeated_action_within_hour BOOLEAN,

  created_at TIMESTAMPTZ
);

-- MISSING: Engagement hooks (bring users back)
CREATE TABLE engagement_hooks (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Hook type
  hook_type TEXT, -- 'uncompleted_task', 'pending_achievement', 'streak_at_risk', 'friend_activity', 'personalized_insight'
  hook_message TEXT, -- "You're 1 log away from your longest streak!"

  -- Urgency
  urgency_level TEXT, -- 'low', 'medium', 'high', 'critical'
  expires_at TIMESTAMPTZ, -- "Complete in next 2 hours to keep streak!"

  -- Delivery
  delivered_via TEXT[], -- ['push', 'sms', 'in_app_badge']
  delivered_at TIMESTAMPTZ,

  -- Effectiveness
  user_returned BOOLEAN,
  time_to_return_minutes INTEGER,
  action_completed BOOLEAN,

  created_at TIMESTAMPTZ
);

-- MISSING: Social proof & FOMO
CREATE TABLE social_proof_triggers (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Social proof type
  proof_type TEXT, -- 'others_achieving', 'leaderboard', 'friend_milestone', 'community_challenge'
  message TEXT, -- "342 people logged breakfast this morning!"

  -- FOMO elements
  scarcity_factor TEXT, -- "Only 3 spots left in challenge!"
  time_pressure_factor TEXT, -- "Ends in 24 hours!"

  -- Comparison (motivating but not discouraging)
  comparison_shown BOOLEAN,
  user_rank INTEGER,
  percentile NUMERIC,

  -- Outcome
  motivated_user BOOLEAN,
  user_took_action BOOLEAN,

  created_at TIMESTAMPTZ
);

-- MISSING: Progress visualization events
CREATE TABLE progress_milestones (
  id UUID PRIMARY KEY,
  user_id UUID,

  -- Milestone type
  milestone_type TEXT, -- 'weight_goal', 'streak', 'days_logged', 'lessons_completed', 'habits_formed'
  milestone_name TEXT, -- "First 10 pounds lost!"

  -- Progress
  current_value NUMERIC,
  goal_value NUMERIC,
  percentage_complete NUMERIC,

  -- Visual representation
  chart_url TEXT, -- Beautiful progress chart
  celebration_image_url TEXT,

  -- Sharing
  shareable BOOLEAN DEFAULT true,
  shared_to_social BOOLEAN,

  -- Next milestone
  next_milestone_name TEXT,
  distance_to_next NUMERIC,

  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

---

## 🎯 PRIORITY ASSESSMENT

### TIER 1: MUST HAVE FOR AI COACHING CALLS/SMS (Deploy NOW) 🔴

1. **`phone_calls`** - Can't do AI phone coaching without this!
2. **`sms_messages`** - Can't do AI SMS coaching without this!
3. **`scheduled_calls`** - Proactive AI calling
4. **`sms_templates`** - Personalized texting
5. **`ai_episodic_memory`** - Remember specific user moments
6. **`learned_user_preferences`** - Truly personalized coaching

### TIER 2: CUTTING-EDGE MEMORY (Very High Value) 🟡

7. **`conversation_summaries`** - Compress long histories
8. **`user_interaction_patterns`** - When to reach out
9. **`active_calls`** - Real-time call state (for AI decision-making)

### TIER 3: HABIT-FORMING ADDICTIVE ENGAGEMENT (High Value) 🟢

10. **`dopamine_triggers`** - Micro-rewards for positive reinforcement
11. **`variable_rewards`** - Unpredictable rewards (most addictive)
12. **`engagement_hooks`** - Bring users back
13. **`social_proof_triggers`** - FOMO & social motivation
14. **`progress_milestones`** - Celebrate wins

---

## 📊 CURRENT STATE SUMMARY

### ✅ WHAT'S COMPLETE (Strong Foundation)
- AI memory: Context caching, RAG, vector embeddings
- Learning: RLHF, experiments, behavior tracking
- Communication fields: channel support (sms/call) exists
- Habit tracking: habit_stacks, completions, streaks

### ❌ WHAT'S MISSING (Critical Gaps)
- **Phone call lifecycle**: No tracking of actual calls
- **SMS threading**: No conversation management
- **Episodic memory**: Can't remember specific moments
- **Engagement hooks**: No system to bring users back
- **Variable rewards**: No addiction-level engagement system

### 🎯 ANSWER TO YOUR QUESTIONS

**Q: Is everything there for AI coaches that make phone calls?**
❌ **NO** - Missing phone_calls table, scheduled_calls, active_calls

**Q: Is everything there for AI coaches that text SMS users?**
❌ **NO** - Missing sms_messages table, sms_templates, threading

**Q: Is everything there for truly cutting-edge AI memory?**
⚠️ **PARTIAL** - Have RAG + embeddings, but missing episodic memory, learned preferences, conversation summaries

**Q: Is everything there for learning from all interactions?**
✅ **YES!** - ai_predictions, coach_response_feedback, user_behavior_events all excellent

**Q: Is everything there for habit-forming, addictive positive behavior?**
⚠️ **PARTIAL** - Have streaks/achievements, but missing dopamine triggers, variable rewards, engagement hooks

---

## 🚀 RECOMMENDED NEXT MIGRATION

Create **Migration 5: AI Communication & Memory Infrastructure** with:

### Part A: Communication (Phone + SMS)
1. phone_calls
2. sms_messages
3. scheduled_calls
4. sms_templates
5. active_calls (real-time state)

### Part B: Cutting-Edge Memory
6. ai_episodic_memory
7. learned_user_preferences
8. conversation_summaries
9. user_interaction_patterns

### Part C: Habit-Forming Engagement
10. dopamine_triggers
11. variable_rewards
12. engagement_hooks
13. social_proof_triggers
14. progress_milestones

**Total: 14 critical tables**

This will give you COMPLETE infrastructure for:
- ✅ AI phone coaching with real-time call management
- ✅ AI SMS coaching with conversation threading
- ✅ Truly cutting-edge AI memory (episodic + semantic)
- ✅ Addiction-level positive habit formation
- ✅ Learning from every single interaction

Should I create this migration now?

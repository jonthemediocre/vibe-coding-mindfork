-- Migration: Update AI Implementation Guides with New Schema Features
-- Created: 2025-11-03
-- Purpose: Add comprehensive implementation guides for all new tables and features
-- Target: ai_implementation_guides table in Supabase
-- Approach: ADDITIVE - adds new guides, updates existing ones

-- ============================================================================
-- GUIDE 1: Emotional Eating Detection (THE COMPETITIVE MOAT!)
-- ============================================================================
INSERT INTO public.ai_implementation_guides (
  guide_category,
  guide_name,
  target_feature,
  priority,
  overview,
  user_story,
  acceptance_criteria,
  tables_involved,
  step_by_step_guide,
  ux_flow_description,
  ui_components_needed,
  design_principles,
  code_examples,
  ai_tips,
  common_mistakes,
  test_scenarios,
  success_metrics
) VALUES (
  'feature',
  'emotional_eating_detection_system',
  'Emotional Eating Detection & Intervention',
  'critical',

  'Real-time emotional eating detection and AI intervention BEFORE users break their diet. This is your competitive moat - no other app does this!',

  'As a user, when I start eating for emotional reasons instead of hunger, I want the app to gently intervene and help me understand my triggers so I can make better choices.',

  ARRAY[
    'System detects emotional eating patterns (eating <2hrs after last meal, low hunger, high-calorie comfort food)',
    'AI sends supportive intervention message within 30 seconds',
    'User can respond to intervention (helpful/not helpful)',
    'System learns from feedback and improves detection',
    'Mood check-ins optionally triggered before/after meals',
    'Patterns visualized in weekly emotional eating report'
  ],

  ARRAY['mood_check_ins', 'food_entries', 'cravings', 'coach_messages', 'ai_predictions', 'learned_user_preferences'],

  E'# Emotional Eating Detection - Complete Implementation

## The Science
Emotional eating accounts for 75% of overeating. Detection signals:
1. **Time-based**: Eating <2 hours after last meal
2. **Hunger-based**: Mood check-in shows hunger_level <5
3. **Food-based**: High-calorie comfort foods (>500 kcal, high fat+sugar)
4. **Mood-based**: Negative mood valence (<5) or high stress (>7)

## Step 1: Trigger Mood Check-In (Proactive)

After user logs food, check if we should ask about mood:

```typescript
async function shouldTriggerMoodCheckIn(userId: string, foodEntryId: string) {
  // Get food entry details
  const { data: foodEntry } = await supabase
    .from("food_entries")
    .select("calories, consumed_at, food_name")
    .eq("id", foodEntryId)
    .single();

  // Get last meal time
  const { data: lastMeal } = await supabase
    .from("food_entries")
    .select("consumed_at")
    .eq("user_id", userId)
    .order("consumed_at", { ascending: false })
    .limit(2);

  const hoursSinceLastMeal = lastMeal.length > 1
    ? (new Date(lastMeal[0].consumed_at) - new Date(lastMeal[1].consumed_at)) / (1000 * 60 * 60)
    : 24;

  // Trigger if suspicious timing or high calories
  return hoursSinceLastMeal < 2 || foodEntry.calories > 500;
}

// After food log
if (await shouldTriggerMoodCheckIn(userId, foodEntryId)) {
  showMoodCheckInModal({ foodEntryId, timing: "after_meal" });
}
```

## Step 2: Mood Check-In UI (Beautiful & Quick)

```typescript
function MoodCheckInModal({ foodEntryId, onComplete }) {
  const [moodValence, setMoodValence] = useState(5);
  const [hungerLevel, setHungerLevel] = useState(5);
  const [emotionalEating, setEmotionalEating] = useState(false);

  return (
    <Modal>
      <Text className="text-xl font-bold mb-4">
        How are you feeling?
      </Text>

      {/* Emoji mood slider */}
      <Text className="mb-2">Mood right now:</Text>
      <View className="flex-row justify-between mb-4">
        <Text>😢</Text>
        <Slider
          value={moodValence}
          onValueChange={setMoodValence}
          minimumValue={1}
          maximumValue={10}
          step={1}
        />
        <Text>😁</Text>
      </View>
      <Text className="text-center text-gray-600 mb-4">
        {getMoodLabel(moodValence)}
      </Text>

      {/* Hunger slider */}
      <Text className="mb-2">How hungry were you?</Text>
      <View className="flex-row justify-between mb-4">
        <Text>😐</Text>
        <Slider
          value={hungerLevel}
          onValueChange={setHungerLevel}
          minimumValue={1}
          maximumValue={10}
        />
        <Text>🤤</Text>
      </View>

      {/* Emotional eating checkbox */}
      <Pressable
        onPress={() => setEmotionalEating(!emotionalEating)}
        className="flex-row items-center mb-6"
      >
        <View className={`w-6 h-6 border-2 rounded mr-3 ${
          emotionalEating ? "bg-blue-500 border-blue-500" : "border-gray-400"
        }`}>
          {emotionalEating && <Text>✓</Text>}
        </View>
        <Text>I ate for emotional reasons (stress, boredom, sadness)</Text>
      </Pressable>

      <Button onPress={async () => {
        await saveMoodCheckIn({
          userId,
          foodEntryId,
          moodValence,
          hungerLevel,
          eatingTriggeredByEmotion: emotionalEating,
          beforeMeal: false
        });
        onComplete();
      }}>
        Save
      </Button>
    </Modal>
  );
}
```

## Step 3: Emotional Eating Detection (The Algorithm)

```typescript
async function detectEmotionalEating(userId: string, foodEntryId: string) {
  // Get food entry
  const { data: food } = await supabase
    .from("food_entries")
    .select("calories, consumed_at, food_name")
    .eq("id", foodEntryId)
    .single();

  // Get mood check-in if exists
  const { data: mood } = await supabase
    .from("mood_check_ins")
    .select("hunger_level, mood_valence, eating_triggered_by_emotion")
    .eq("food_entry_id", foodEntryId)
    .single();

  // Get last meal timing
  const { data: lastMeal } = await supabase
    .from("food_entries")
    .select("consumed_at")
    .eq("user_id", userId)
    .order("consumed_at", { ascending: false })
    .limit(2);

  const hoursSinceLastMeal = lastMeal.length > 1
    ? (new Date(lastMeal[0].consumed_at) - new Date(lastMeal[1].consumed_at)) / (1000 * 60 * 60)
    : 24;

  // DETECTION LOGIC (simple rules that work!)
  let isEmotional = false;
  let confidence = 0;
  let reason = "";

  // Rule 1: User explicitly said so
  if (mood?.eating_triggered_by_emotion) {
    isEmotional = true;
    confidence = 0.95;
    reason = "You mentioned eating for emotional reasons";
  }
  // Rule 2: Eating very soon after last meal
  else if (hoursSinceLastMeal < 2) {
    isEmotional = true;
    confidence = 0.75;
    reason = `You ate only ${hoursSinceLastMeal.toFixed(1)} hours after your last meal`;
  }
  // Rule 3: Low hunger but high calories
  else if (mood && mood.hunger_level < 5 && food.calories > 400) {
    isEmotional = true;
    confidence = 0.70;
    reason = "Your hunger level was low, but you ate a large meal";
  }
  // Rule 4: Negative mood + comfort food
  else if (mood && mood.mood_valence < 5 && food.calories > 500) {
    isEmotional = true;
    confidence = 0.65;
    reason = "You were feeling down and chose a high-calorie comfort food";
  }

  return {
    isEmotional,
    confidence,
    reason,
    foodName: food.food_name,
    calories: food.calories
  };
}
```

## Step 4: AI Intervention (Supportive, Not Shameful!)

```typescript
async function sendEmotionalEatingIntervention(
  userId: string,
  detection: any
) {
  // Get user preferences for tone
  const { data: prefs } = await supabase
    .from("learned_user_preferences")
    .select("preference_value")
    .eq("user_id", userId)
    .eq("preference_category", "coaching_tone")
    .eq("preference_key", "intervention_style")
    .single();

  const tone = prefs?.preference_value?.tone || "supportive"; // default supportive

  // Generate personalized message
  let message = "";

  if (tone === "supportive") {
    message = `I noticed something: ${detection.reason}.

That''s totally normal - we all eat emotionally sometimes! 💙

Want to talk about what''s going on? I''m here to help, not judge.`;
  } else if (tone === "roast") {
    message = `Caught you! ${detection.reason}.

Real talk: You''re not even hungry. What''s actually bothering you?

Give me 2 minutes and we''ll fix the real problem instead of fake-fixing it with ${detection.foodName}.`;
  }

  // Send intervention
  const { data: intervention } = await supabase
    .from("coach_messages")
    .insert({
      user_id: userId,
      coach_id: "ai_coach_1",
      mode: "intervention",
      channel: "in_app",
      message_type: "intervention",
      content: message,
      cta_text: "Let''s talk",
      cta_action: "open_chat",
      metadata: {
        detection_confidence: detection.confidence,
        detection_reason: detection.reason,
        food_calories: detection.calories
      }
    })
    .select()
    .single();

  // Log AI prediction for learning
  await supabase.from("ai_predictions").insert({
    user_id: userId,
    prediction_type: "emotional_eating_detection",
    model_name: "rule_based_v1",
    input_data: { detection },
    predicted_output: { is_emotional: detection.isEmotional },
    confidence_score: detection.confidence
  });

  // Show in-app notification
  showNotification({
    title: "Your coach wants to check in",
    body: message.split("\\n")[0],
    onPress: () => navigation.navigate("Chat", { messageId: intervention.id })
  });
}
```

## Step 5: Collect Feedback (CRITICAL for Learning!)

```typescript
// After user engages with intervention
async function recordInterventionFeedback(
  interventionId: string,
  wasHelpful: boolean
) {
  // Update coach message
  await supabase
    .from("coach_messages")
    .update({
      engaged_at: new Date().toISOString(),
      helpfulness_rating: wasHelpful ? 5 : 2,
      feedback_text: wasHelpful ? "helpful" : "not_helpful"
    })
    .eq("id", interventionId);

  // Update AI prediction
  const { data: message } = await supabase
    .from("coach_messages")
    .select("metadata")
    .eq("id", interventionId)
    .single();

  await supabase
    .from("ai_predictions")
    .update({
      user_accepted: wasHelpful,
      user_satisfaction_rating: wasHelpful ? 5 : 2,
      feedback_received_at: new Date().toISOString()
    })
    .eq("prediction_type", "emotional_eating_detection")
    .eq("confidence_score", message.metadata.detection_confidence);

  // Learn preference
  if (!wasHelpful) {
    // User didn''t like intervention - maybe switch tone?
    const currentTone = await getCurrentTone(userId);
    const newTone = currentTone === "supportive" ? "roast" : "supportive";

    await supabase.from("learned_user_preferences").upsert({
      user_id: userId,
      preference_category: "coaching_tone",
      preference_key: "intervention_style",
      preference_value: { tone: newTone },
      learned_from: ["intervention_feedback"]
    });
  }
}
```

## Step 6: Weekly Emotional Eating Report

```typescript
async function generateEmotionalEatingReport(userId: string) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get emotional eating instances
  const { data: instances } = await supabase
    .from("mood_check_ins")
    .select("*, food_entries(food_name, calories)")
    .eq("user_id", userId)
    .eq("eating_triggered_by_emotion", true)
    .gte("created_at", weekAgo.toISOString());

  // Get common triggers
  const triggers = instances
    .map(i => i.trigger_event)
    .filter(Boolean)
    .reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

  // Get most common coping mechanism
  const copingMechanisms = instances
    .map(i => i.coping_mechanism_used)
    .filter(Boolean);

  return {
    totalInstances: instances.length,
    topTriggers: Object.entries(triggers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([trigger, count]) => ({ trigger, count })),
    mostCommonTime: getMostCommonTimeOfDay(instances),
    mostCommonFoods: getMostCommonFoods(instances),
    interventionsHelped: instances.filter(i =>
      i.food_entries.some(f => f.metadata?.intervention_helpful)
    ).length
  };
}
```',

  'User logs food → System checks timing/calories/mood → If suspicious, prompt mood check-in → User fills mood slider (30 seconds) → System detects emotional eating → AI sends supportive intervention within 30 seconds → User engages or dismisses → System learns from feedback → Adjust future interventions',

  ARRAY['MoodSlider', 'EmojiPicker', 'InterventionModal', 'ChatInterface', 'WeeklyReportChart', 'NotificationBanner'],

  ARRAY['Empathetic not judgmental', 'Fast intervention (<30s)', 'Beautiful mood UI', 'Learn from every interaction', 'Celebrate awareness not shame'],

  '{"react_native": "// Quick mood check-in\nconst MoodCheckIn = () => {\n  const [mood, setMood] = useState(5);\n  return (\n    <View>\n      <Text>How are you feeling?</Text>\n      <Slider value={mood} onChange={setMood} min={1} max={10} />\n      <Text>{getMoodEmoji(mood)}</Text>\n    </View>\n  );\n};", "sql": "-- Get emotional eating patterns\nSELECT \n  trigger_event,\n  COUNT(*) as frequency,\n  AVG(mood_valence) as avg_mood\nFROM mood_check_ins\nWHERE user_id = $1\n  AND eating_triggered_by_emotion = true\n  AND created_at >= NOW() - INTERVAL ''30 days''\nGROUP BY trigger_event\nORDER BY frequency DESC\nLIMIT 5;"}'::jsonb,

  'CRITICAL: This is your competitive moat! Detection must be FAST (<30s) and EMPATHETIC. Never shame users. Focus on awareness and understanding. The goal is to help them recognize patterns, not make them feel guilty. Collect feedback on EVERY intervention - this is how the AI improves. Start with simple rules (they work better than complex ML!), then upgrade to ML models later using collected data.',

  ARRAY[
    'Making users feel guilty or ashamed',
    'Intervening too aggressively (turns users off)',
    'Not collecting feedback (can''t improve!)',
    'Using complex ML before having data (simple rules work better initially)',
    'Making mood check-in too long (should be <30 seconds)'
  ],

  ARRAY[
    'User eats lunch at 12pm, then snack at 1pm → System detects short interval → Prompts mood check-in → User reports low hunger → AI intervenes with supportive message',
    'User in bad mood (valence=3) logs ice cream (600 kcal) → System detects negative mood + comfort food → Gentle intervention about emotional eating',
    'User marks "eating for emotional reasons" → Intervention happens → User clicks "This was helpful" → System learns user prefers supportive tone',
    'Weekly report shows stress is #1 trigger → User sees pattern → Becomes aware → Requests stress management resources'
  ],

  ARRAY[
    'Detection accuracy >70% (compared to user self-report)',
    '>50% of users report interventions as helpful',
    'Average intervention time <30 seconds from food log',
    '40% reduction in emotional eating frequency after 30 days',
    'User engagement rate >60% on intervention messages'
  ]
) ON CONFLICT (guide_name) DO UPDATE SET
  step_by_step_guide = EXCLUDED.step_by_step_guide,
  code_examples = EXCLUDED.code_examples,
  updated_at = NOW();

-- ============================================================================
-- GUIDE 2: AI Phone Coaching with Real-Time Context
-- ============================================================================
INSERT INTO public.ai_implementation_guides (
  guide_category,
  guide_name,
  target_feature,
  priority,
  overview,
  user_story,
  tables_involved,
  step_by_step_guide,
  ux_flow_description,
  ai_tips
) VALUES (
  'feature',
  'ai_phone_coaching_realtime',
  'AI Phone Coaching',
  'high',

  'AI-powered phone coaching with real-time conversation, episodic memory, and intelligent follow-up. Users can call anytime or schedule calls for check-ins.',

  'As a user, I want to have real voice conversations with my AI coach when I need support, and I want the coach to remember what we talked about and follow up on my commitments.',

  ARRAY['phone_calls', 'scheduled_calls', 'active_calls', 'ai_episodic_memory', 'learned_user_preferences', 'coach_messages', 'user_interaction_patterns'],

  E'# AI Phone Coaching - Production Implementation

## Architecture
- **Twilio**: Phone number + call routing
- **Real-time transcription**: Deepgram or AssemblyAI
- **AI responses**: GPT-4 with streaming
- **Memory**: Episodic memory + learned preferences
- **Context**: Fast retrieval from ai_context_cache

## Complete Flow (see full code in database)',

  'User taps "Call Coach" OR AI initiates scheduled call → Twilio connects → Real-time transcription starts → AI responds with full context (remembers past conversations!) → Key moments extracted to episodic memory → Commitments tracked → Automatic follow-up scheduled → Post-call summary sent via SMS',

  'Use episodic memory for "Last time we talked, you mentioned..." references. Extract commitments automatically and schedule follow-ups. Keep AI responses <20 seconds spoken (conversational). Always end calls with clear next steps.'
) ON CONFLICT (guide_name) DO UPDATE SET
  tables_involved = EXCLUDED.tables_involved,
  updated_at = NOW();

-- Continue with more guides...

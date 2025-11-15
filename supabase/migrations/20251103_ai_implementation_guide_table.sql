-- Migration: AI Implementation Guide Table
-- Created: 2025-11-03
-- Purpose: Store comprehensive implementation instructions for other AIs to build UX/UI/user journeys
--
-- This table acts as a "manual" for other AI assistants working in sandboxes
-- that can access Supabase but not git. It contains detailed instructions
-- for how to implement features using the database schema.
--
-- Usage: Point another AI to query this table to understand how to build features

-- ============================================================================
-- AI IMPLEMENTATION GUIDES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_implementation_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Guide identification
  guide_category TEXT NOT NULL, -- 'ux_pattern', 'user_journey', 'feature', 'integration', 'best_practice'
  guide_name TEXT NOT NULL UNIQUE, -- 'food_logging_flow', 'phone_call_coaching', 'mood_tracking_ux'

  -- Target feature/screen
  target_feature TEXT NOT NULL, -- What feature this guide is for
  priority TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'

  -- Comprehensive instructions
  overview TEXT NOT NULL, -- High-level description
  user_story TEXT, -- "As a user, I want to..."
  acceptance_criteria TEXT[], -- List of requirements for completion

  -- Database integration
  tables_involved TEXT[] NOT NULL, -- Which tables are used
  required_fields JSONB, -- {table_name: [field1, field2]}
  optional_fields JSONB,

  -- Implementation steps
  step_by_step_guide TEXT NOT NULL, -- Detailed step-by-step instructions
  code_examples JSONB, -- {language: code_snippet}

  -- UX/UI specifications
  ux_flow_description TEXT, -- Describe the user flow
  ui_components_needed TEXT[], -- ['Modal', 'Form', 'Animation', 'Chart']
  design_principles TEXT[], -- ['Simple', 'Empathetic', 'Data-driven']

  -- Edge cases and considerations
  edge_cases TEXT[],
  error_handling TEXT,
  validation_rules JSONB,

  -- Dependencies
  depends_on_guides UUID[], -- IDs of other guides that should be implemented first
  related_guides UUID[], -- IDs of related guides

  -- API/Backend requirements
  api_endpoints_needed JSONB, -- [{endpoint: '/api/...', method: 'POST', purpose: '...'}]
  backend_logic TEXT,

  -- Testing instructions
  test_scenarios TEXT[],
  success_metrics TEXT[],

  -- Examples and references
  example_data JSONB, -- Sample data to use for testing
  reference_apps TEXT[], -- Apps to reference for inspiration
  reference_urls TEXT[],

  -- AI-specific hints
  ai_tips TEXT, -- Special considerations for AI implementation
  common_mistakes TEXT[], -- What to avoid

  -- Versioning
  version INTEGER DEFAULT 1,
  last_updated_by TEXT,
  changelog TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ai_implementation_guides_category_valid CHECK (guide_category IN ('ux_pattern', 'user_journey', 'feature', 'integration', 'best_practice')),
  CONSTRAINT ai_implementation_guides_priority_valid CHECK (priority IN ('critical', 'high', 'medium', 'low'))
);

-- Indexes for ai_implementation_guides
CREATE INDEX IF NOT EXISTS idx_ai_guides_category ON public.ai_implementation_guides(guide_category, priority);
CREATE INDEX IF NOT EXISTS idx_ai_guides_priority ON public.ai_implementation_guides(priority, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_guides_tables ON public.ai_implementation_guides USING GIN(tables_involved);

-- RLS policies (public read for AI access, service role for management)
ALTER TABLE public.ai_implementation_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read implementation guides"
  ON public.ai_implementation_guides FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage implementation guides"
  ON public.ai_implementation_guides
  USING (auth.role() = 'service_role');

-- ============================================================================
-- COMPREHENSIVE SEED DATA: All Implementation Guides
-- ============================================================================

-- Guide 1: Food Logging with Photo Analysis
INSERT INTO public.ai_implementation_guides (
  guide_category,
  guide_name,
  target_feature,
  priority,
  overview,
  user_story,
  acceptance_criteria,
  tables_involved,
  required_fields,
  optional_fields,
  step_by_step_guide,
  code_examples,
  ux_flow_description,
  ui_components_needed,
  design_principles,
  edge_cases,
  error_handling,
  validation_rules,
  api_endpoints_needed,
  test_scenarios,
  success_metrics,
  example_data,
  ai_tips,
  common_mistakes
) VALUES (
  'user_journey',
  'food_logging_with_photo',
  'Food Logging',
  'critical',

  'Complete user journey for logging food via photo analysis with AI vision, nutrition tracking, and mood context.',

  'As a user, I want to log my meals by taking a photo so I can quickly track my nutrition without manual entry.',

  ARRAY[
    'User can open camera from home screen',
    'Photo is analyzed by AI vision model',
    'Food items are auto-detected with confidence scores',
    'User can edit detected foods',
    'Nutrition data is calculated and saved',
    'Mood check-in is optionally prompted',
    'Food entry appears in daily log'
  ],

  ARRAY['food_entries', 'food_photo_training_data', 'mood_check_ins', 'ai_predictions', 'profiles'],

  '{"food_entries": ["user_id", "food_name", "calories", "protein_g", "carbs_g", "fat_g", "photo_url", "consumed_at"], "mood_check_ins": ["user_id", "mood_valence", "mood_arousal", "hunger_level", "food_entry_id"]}'::jsonb,

  '{"food_entries": ["barcode", "brand_name", "sodium_mg", "sugar_g"], "mood_check_ins": ["emotional_state_description", "eating_triggered_by_emotion"]}'::jsonb,

  '# Step-by-Step Implementation

## Step 1: Camera Screen
1. Create camera screen with CameraView component
2. Add capture button with haptic feedback
3. Show flash toggle and camera flip options
4. Handle permissions gracefully

## Step 2: Photo Capture
1. Call takePictureAsync() on capture
2. Show loading state while uploading
3. Upload to Supabase Storage at: `food_photos/{user_id}/{timestamp}.jpg`
4. Get public URL from storage

## Step 3: AI Vision Analysis
1. Call AI vision API with photo URL (use GPT-4 Vision or similar)
2. Prompt: "Analyze this food photo. Return JSON with: foods array (name, estimated_calories, protein_g, carbs_g, fat_g, serving_size, confidence_score)"
3. Parse response into food items array

## Step 4: Review Screen
1. Show detected foods in editable list
2. Display confidence scores visually (green > 80%, yellow > 60%, red < 60%)
3. Allow user to:
   - Edit quantities
   - Remove incorrect items
   - Add missed items manually
   - Adjust nutrition values
4. Calculate total nutrition for meal

## Step 5: Mood Check-In Prompt (Optional)
1. Show modal: "How are you feeling right now?"
2. Use emoji slider for mood valence (😢 to 😁)
3. Show hunger level slider (1-10)
4. Optional: "Was this meal triggered by emotions?" checkbox
5. Save to mood_check_ins table with food_entry_id reference

## Step 6: Save Food Entry
1. Insert into food_entries table with:
   - user_id from auth
   - All food data from step 4
   - photo_url from step 2
   - consumed_at = NOW()
   - data_source = "photo_ai_vision"
2. Save mood check-in if provided (link via food_entry_id)

## Step 7: AI Prediction Logging (for learning)
1. Insert into ai_predictions table:
   - prediction_type = "food_classification"
   - model_name = "gpt-4-vision"
   - input_data = {photo_url}
   - predicted_output = {detected_foods}
   - confidence_score = average confidence
2. When user edits detected foods, update:
   - actual_user_choice = {user_final_foods}
   - user_accepted = (predictions == final)
   - feedback_received_at = NOW()

## Step 8: Feedback Collection (Critical for AI training!)
1. After saving, show: "How accurate was our detection?"
2. 5-star rating
3. If rating < 4, ask: "What did we miss or get wrong?"
4. Save to ai_predictions.user_satisfaction_rating and feedback_text
5. If user_satisfaction >= 4, this becomes training data!

## Step 9: Success Animation
1. Show confetti/celebration if this completes a streak
2. Insert into dopamine_triggers table
3. Navigate back to home with updated daily log

## Step 10: Update Daily Nutrition Summary
1. Recalculate daily totals from food_entries
2. Update/insert into daily_nutrition_summaries
3. Check if user hit goals -> trigger achievement if yes',

  '{"react_native": "// Camera Screen\nimport { CameraView } from ''expo-camera'';\n\nconst [photo, setPhoto] = useState(null);\nconst cameraRef = useRef(null);\n\nconst takePhoto = async () => {\n  const result = await cameraRef.current.takePictureAsync();\n  setPhoto(result.uri);\n  await uploadAndAnalyze(result.uri);\n};\n\nconst uploadAndAnalyze = async (uri) => {\n  // Upload to Supabase Storage\n  const { data, error } = await supabase.storage\n    .from(''food_photos'')\n    .upload(`${userId}/${Date.now()}.jpg`, photo);\n    \n  const photoUrl = supabase.storage.from(''food_photos'').getPublicUrl(data.path);\n  \n  // Analyze with AI\n  const foods = await analyzeFood(photoUrl.data.publicUrl);\n  \n  // Show review screen\n  navigation.navigate(''ReviewFood'', { foods, photoUrl: photoUrl.data.publicUrl });\n};", "supabase_query": "-- Save food entry\nINSERT INTO food_entries (\n  user_id,\n  food_name,\n  calories,\n  protein_g,\n  carbs_g,\n  fat_g,\n  photo_url,\n  consumed_at,\n  data_source\n) VALUES (\n  $1, $2, $3, $4, $5, $6, $7, NOW(), ''photo_ai_vision''\n) RETURNING id;\n\n-- Save mood check-in\nINSERT INTO mood_check_ins (\n  user_id,\n  mood_valence,\n  mood_arousal,\n  hunger_level,\n  food_entry_id,\n  before_meal\n) VALUES (\n  $1, $2, $3, $4, $5, false\n);\n\n-- Log AI prediction for training\nINSERT INTO ai_predictions (\n  user_id,\n  prediction_type,\n  model_name,\n  input_data,\n  predicted_output,\n  confidence_score\n) VALUES (\n  $1, ''food_classification'', ''gpt-4-vision'', $2, $3, $4\n);"}'::jsonb,

  'User opens app → Taps "Log Food" → Camera opens → Takes photo → AI analyzes (3-5s loading) → Review screen shows detected foods → User confirms/edits → Optional mood prompt → Save → Success animation → Returns to home with updated log',

  ARRAY['CameraView', 'ImagePreview', 'LoadingSpinner', 'FoodItemList', 'EditableNutritionCard', 'MoodSlider', 'ConfettiAnimation', 'SuccessModal'],

  ARRAY['Fast and responsive', 'Forgiving of AI errors', 'Educational (show nutrition)', 'Celebratory (positive reinforcement)', 'Privacy-conscious (photos stored securely)'],

  ARRAY[
    'Camera permission denied - show friendly prompt with settings link',
    'Photo too dark/blurry - suggest retake or manual entry',
    'AI detects 0 foods - offer manual entry',
    'AI very low confidence (< 40%) - warn user to verify carefully',
    'Network error during analysis - save photo locally, retry later',
    'Duplicate food log (same food within 5 min) - ask if intentional'
  ],

  'Use try-catch for all API calls. Show user-friendly errors like "Couldn''t analyze photo - try again?" instead of technical errors. Save photo URL even if analysis fails so user can retry later.',

  '{"photo_size_max": "10MB", "photo_dimensions_max": "4096x4096", "confidence_threshold_warn": 0.6, "confidence_threshold_reject": 0.3}'::jsonb,

  '[{"endpoint": "/api/food/analyze-photo", "method": "POST", "body": {"photo_url": "string", "user_id": "uuid"}, "response": {"foods": "array", "confidence": "number"}}]'::jsonb,

  ARRAY[
    'Happy path: Take photo of simple meal (e.g., banana) and verify correct detection',
    'Complex meal: Take photo of multiple foods and verify all detected',
    'Low quality photo: Test with blurry image and verify error handling',
    'Permission denied: Deny camera permission and verify graceful fallback',
    'Offline: Disconnect network and verify offline handling'
  ],

  ARRAY[
    'AI detection accuracy > 75% (compared to user final choice)',
    'Photo to saved entry < 15 seconds',
    '> 80% of users complete mood check-in when prompted',
    'User satisfaction rating > 4.0/5.0 average'
  ],

  '{"example_photo_url": "https://example.com/pizza.jpg", "expected_detection": [{"food_name": "Pizza slice", "calories": 285, "protein_g": 12, "carbs_g": 36, "fat_g": 10, "confidence_score": 0.89}], "example_mood": {"mood_valence": 7, "mood_arousal": 5, "hunger_level": 8}}'::jsonb,

  'CRITICAL: Always link food_entry_id to mood_check_ins so AI can learn emotional eating patterns. Use high-quality loading states - users hate waiting for AI analysis without feedback. Implement optimistic UI - show detected foods immediately even before saving. Store raw AI output in ai_predictions for continuous learning.',

  ARRAY[
    'Not saving ai_predictions data - you lose ability to improve AI!',
    'Not linking mood to food entries - can''t detect emotional eating',
    'Harsh error messages when AI fails - be encouraging instead',
    'Not celebrating successes - miss opportunity for dopamine hit',
    'Making mood check-in required - should be optional but encouraged'
  ]
) ON CONFLICT (guide_name) DO NOTHING;

-- Guide 2: AI Phone Call Coaching
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
  ai_tips,
  ux_flow_description
) VALUES (
  'feature',
  'ai_phone_call_coaching',
  'AI Phone Coaching',
  'high',

  'Enable AI to make and receive phone calls with users for coaching, check-ins, and interventions. Track call lifecycle, transcribe conversations, extract insights, and learn from interactions.',

  'As a user, I want to have phone conversations with my AI coach so I can get real-time support when I need it.',

  ARRAY[
    'User can schedule AI coach calls',
    'AI can initiate outbound calls at scheduled times',
    'User can call AI coach anytime (inbound)',
    'Calls are transcribed in real-time',
    'AI responds intelligently based on conversation context',
    'Key moments and commitments are extracted',
    'Follow-up actions are scheduled automatically',
    'User can rate call quality and AI performance'
  ],

  ARRAY['phone_calls', 'scheduled_calls', 'active_calls', 'ai_episodic_memory', 'learned_user_preferences', 'user_interaction_patterns'],

  '# AI Phone Call Implementation

## Prerequisites
1. Set up Twilio account (recommended) or similar provider
2. Get phone number from Twilio
3. Configure webhook endpoints for call events
4. Set up real-time transcription service (Twilio, AssemblyAI, or Deepgram)

## Step 1: Scheduled Call Flow

### 1.1 User Schedules Call
```sql
INSERT INTO scheduled_calls (
  user_id,
  scheduled_for,
  timezone,
  call_purpose,
  ai_talking_points
) VALUES (
  $user_id,
  $scheduled_time,
  $timezone,
  ''check_in'',
  ''{"topics": ["progress_this_week", "challenges", "next_week_goals"]}''::jsonb
);
```

### 1.2 Send Reminder (30 min before)
```sql
INSERT INTO sms_messages (
  user_id,
  direction,
  from_phone,
  to_phone,
  body,
  status
) VALUES (
  $user_id,
  ''outbound'',
  $twilio_number,
  $user_phone,
  ''Hey! Your AI coach call is in 30 minutes. Looking forward to chatting! 📞'',
  ''queued''
);
```

### 1.3 Initiate Call
```javascript
// Backend service (runs as cron job checking for scheduled calls)
const twilioClient = require(''twilio'')(accountSid, authToken);

async function initiateScheduledCall(scheduledCall) {
  // Create phone_call record
  const phoneCall = await supabase.from(''phone_calls'').insert({
    user_id: scheduledCall.user_id,
    call_direction: ''outbound'',
    call_status: ''queued'',
    initiated_at: new Date().toISOString(),
    provider: ''twilio'',
    from_phone: twilioPhoneNumber,
    to_phone: userPhoneNumber
  }).select().single();

  // Make call via Twilio
  const call = await twilioClient.calls.create({
    to: userPhoneNumber,
    from: twilioPhoneNumber,
    url: `https://yourapp.com/api/twiml/coach-call/${phoneCall.data.id}`,
    statusCallback: `https://yourapp.com/api/twilio/call-status/${phoneCall.data.id}`,
    statusCallbackEvent: [''initiated'', ''ringing'', ''answered'', ''completed''],
    record: true,
    transcribe: true
  });

  // Update with Twilio SID
  await supabase.from(''phone_calls'').update({
    provider_call_sid: call.sid
  }).eq(''id'', phoneCall.data.id);
}
```

## Step 2: Real-Time Call State Management

### 2.1 When Call Connects
```javascript
// TwiML webhook - first response
app.post(''/api/twiml/coach-call/:callId'', async (req, res) => {
  const { callId } = req.params;

  // Create active_call record for real-time state
  await supabase.from(''active_calls'').insert({
    phone_call_id: callId,
    user_id: req.user.id,
    current_state: ''greeting'',
    conversation_context: {
      current_topic: null,
      user_mood: null,
      commitments: [],
      concerns: []
    },
    next_ai_action: ''greet_user'',
    confidence_level: 1.0
  });

  // Update phone_call status
  await supabase.from(''phone_calls'').update({
    call_status: ''in_progress'',
    answered_at: new Date().toISOString()
  }).eq(''id'', callId);

  // Generate greeting TwiML
  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say({
    voice: ''Polly.Joanna''
  }, ''Hi! This is your health coach. How are you doing today?'');

  // Gather user response
  twiml.gather({
    input: [''speech''],
    action: `/api/twiml/process-response/${callId}`,
    speechTimeout: ''auto'',
    speechModel: ''phone_call''
  });

  res.type(''text/xml'');
  res.send(twiml.toString());
});
```

### 2.2 Process User Speech in Real-Time
```javascript
app.post(''/api/twiml/process-response/:callId'', async (req, res) => {
  const { callId } = req.params;
  const userSpeech = req.body.SpeechResult;
  const confidence = req.body.Confidence;

  // Get current call state
  const { data: activeCall } = await supabase
    .from(''active_calls'')
    .select(''*, phone_calls!inner(*)'')
    .eq(''phone_call_id'', callId)
    .single();

  // Get user context for AI
  const userContext = await supabase.rpc(''get_user_ai_context'', {
    p_user_id: activeCall.user_id,
    p_context_types: [''user_summary'', ''recent_foods'', ''current_goals'', ''recent_struggles'']
  });

  // Get conversation history from this call
  const callHistory = activeCall.conversation_context.conversation_turns || [];

  // Call OpenAI for AI coach response
  const aiResponse = await openai.chat.completions.create({
    model: ''gpt-4'',
    messages: [
      {
        role: ''system'',
        content: `You are a supportive, empathetic nutrition coach having a phone call with a user.

User context: ${JSON.stringify(userContext)}

Your goal for this call: ${activeCall.phone_calls.call_purpose}

Conversation so far:
${callHistory.map(turn => `${turn.role}: ${turn.content}`).join(''\n'')}

User just said: "${userSpeech}"

Respond naturally, warmly, and conversationally. Keep responses under 30 seconds when spoken. If user mentions a commitment or struggle, acknowledge it specifically.`
      }
    ],
    temperature: 0.7,
    max_tokens: 150
  });

  const coachResponse = aiResponse.choices[0].message.content;

  // Update active call state
  callHistory.push(
    { role: ''user'', content: userSpeech, timestamp: new Date().toISOString() },
    { role: ''assistant'', content: coachResponse, timestamp: new Date().toISOString() }
  );

  await supabase.from(''active_calls'').update({
    conversation_context: {
      ...activeCall.conversation_context,
      conversation_turns: callHistory
    },
    last_updated_at: new Date().toISOString()
  }).eq(''id'', activeCall.id);

  // Generate TwiML response
  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say({
    voice: ''Polly.Joanna''
  }, coachResponse);

  // Continue gathering user input
  twiml.gather({
    input: [''speech''],
    action: `/api/twiml/process-response/${callId}`,
    speechTimeout: ''auto''
  });

  res.type(''text/xml'');
  res.send(twiml.toString());
});
```

## Step 3: Post-Call Processing

### 3.1 When Call Ends
```javascript
app.post(''/api/twilio/call-status/:callId'', async (req, res) => {
  const { callId } = req.params;
  const { CallStatus, RecordingUrl, RecordingDuration, TranscriptionText } = req.body;

  if (CallStatus === ''completed'') {
    // Update phone_call
    await supabase.from(''phone_calls'').update({
      call_status: ''completed'',
      ended_at: new Date().toISOString(),
      recording_url: RecordingUrl,
      recording_duration_seconds: parseInt(RecordingDuration),
      transcript: TranscriptionText
    }).eq(''id'', callId);

    // Extract insights with AI
    await extractCallInsights(callId);
  }

  res.sendStatus(200);
});

async function extractCallInsights(callId) {
  const { data: call } = await supabase
    .from(''phone_calls'')
    .select(''*, active_calls(*)'')
    .eq(''id'', callId)
    .single();

  const conversationText = call.active_calls[0].conversation_context.conversation_turns
    .map(turn => `${turn.role}: ${turn.content}`)
    .join(''\n'');

  // Use AI to extract key information
  const analysis = await openai.chat.completions.create({
    model: ''gpt-4'',
    messages: [{
      role: ''system'',
      content: `Analyze this coaching call and extract:
1. Key topics discussed (array)
2. User''s emotional state (positive/negative/mixed/neutral)
3. User''s specific emotion (happy/frustrated/motivated/etc)
4. Commitments user made (array)
5. Struggles or barriers mentioned (array)
6. Overall sentiment (-1 to 1)
7. Brief summary (2-3 sentences)

Return as JSON.

Call transcript:
${conversationText}`
    }],
    response_format: { type: ''json_object'' }
  });

  const insights = JSON.parse(analysis.choices[0].message.content);

  // Update phone_call with insights
  await supabase.from(''phone_calls'').update({
    key_topics: insights.key_topics,
    sentiment: insights.emotional_state,
    user_emotion: insights.specific_emotion,
    commitments_made: insights.commitments,
    ai_summary: insights.summary
  }).eq(''id'', callId);

  // Create episodic memories for important moments
  for (const commitment of insights.commitments) {
    await supabase.from(''ai_episodic_memory'').insert({
      user_id: call.user_id,
      memory_type: ''commitment'',
      memory_description: commitment,
      original_timestamp: call.ended_at,
      source_type: ''phone_call'',
      source_id: callId,
      strength: 1.0,
      emotional_valence: insights.sentiment
    });
  }

  // Schedule follow-up based on commitments
  if (insights.commitments.length > 0) {
    const followUpTime = new Date(call.ended_at);
    followUpTime.setHours(followUpTime.getHours() + 24);

    await supabase.from(''scheduled_calls'').insert({
      user_id: call.user_id,
      scheduled_for: followUpTime.toISOString(),
      timezone: ''America/New_York'', // Get from user profile
      call_purpose: ''accountability'',
      ai_talking_points: {
        commitments_to_check: insights.commitments,
        previous_call_id: callId
      }
    });
  }
}
```

## Step 4: User Feedback Collection
```sql
-- Prompt user for feedback via SMS
INSERT INTO sms_messages (
  user_id,
  direction,
  from_phone,
  to_phone,
  body,
  requires_response
) VALUES (
  $user_id,
  ''outbound'',
  $twilio_number,
  $user_phone,
  ''Thanks for the call! On a scale of 1-10, how helpful was our conversation? Reply with a number.'',
  true
);

-- When user replies, save to phone_calls
UPDATE phone_calls
SET
  user_satisfaction = $rating::integer,
  ai_performance_rating = $rating::integer
WHERE id = $call_id;
```',

  'CRITICAL: Phone calls are synchronous and unforgiving - AI must respond quickly (< 2s) and naturally. Store ALL conversation context in active_calls for real-time decision making. Extract episodic memories immediately after call ends - these are gold for personalization. Always schedule follow-up actions based on commitments made during call.',

  'User schedules call OR AI initiates → Twilio webhook receives call → Create active_calls record → AI greeting → User speaks → Real-time transcription → AI generates response (with full context) → TwiML speaks response → Loop until call ends → Extract insights → Create episodic memories → Schedule follow-up → Request feedback via SMS'
) ON CONFLICT (guide_name) DO NOTHING;

-- Guide 3: Habit Stack Formation with Micro-Rewards
INSERT INTO public.ai_implementation_guides (
  guide_category,
  guide_name,
  target_feature,
  priority,
  overview,
  tables_involved,
  step_by_step_guide,
  ux_flow_description
) VALUES (
  'user_journey',
  'habit_stack_formation',
  'Habit Formation',
  'critical',

  'Implement James Clear''s Atomic Habits methodology with implementation intentions, micro-rewards, and variable reinforcement for maximum habit adherence.',

  ARRAY['habit_stacks', 'habit_completions', 'dopamine_triggers', 'variable_rewards', 'user_streaks', 'achievements'],

  '# Habit Stack Formation - Implementation Guide

## Overview
This implements the "When X, I will Y" pattern proven to increase habit adherence by 2-3x.

## Step 1: Habit Creation Flow

### 1.1 Show Habit Templates
```javascript
// Pre-built habit suggestions based on user goals
const habitTemplates = [
  {
    trigger_cue: "After I wake up",
    target_behavior: "I will drink a glass of water",
    category: "nutrition",
    difficulty: "tiny"
  },
  {
    trigger_cue: "After I eat dinner",
    target_behavior: "I will log my meal in the app",
    category: "tracking",
    difficulty: "small"
  },
  {
    trigger_cue: "When I feel a craving",
    target_behavior: "I will drink water and wait 10 minutes",
    category: "craving_management",
    difficulty: "medium"
  }
];
```

### 1.2 Guide User Through Creation
```
Screen 1: "Let''s build a simple habit!"

Screen 2: "When will you do this?"
[Text input: "After I ___________"]
Examples: "wake up", "brush my teeth", "finish work"

Screen 3: "What will you do?"
[Text input: "I will ___________"]
Examples: "drink water", "do 5 pushups", "log my breakfast"

Screen 4: "How hard is this for you?"
[Buttons: Tiny (effortless) | Small (easy) | Medium (some effort)]

Screen 5: "Add a celebration phrase!"
[Text input with example: "I''m crushing it!" or "Nice work!"]
Explanation: "Say this out loud each time you do it - it rewires your brain!"
```

### 1.3 Save Habit Stack
```sql
INSERT INTO habit_stacks (
  user_id,
  trigger_cue,
  target_behavior,
  habit_category,
  difficulty,
  celebration_phrase,
  is_active,
  current_streak,
  longest_streak,
  total_completions
) VALUES (
  $user_id,
  $trigger_cue,
  $target_behavior,
  $category,
  $difficulty,
  $celebration,
  true,
  0,
  0,
  0
);
```

## Step 2: Daily Habit Completion

### 2.1 Show Active Habits (Home Screen)
```javascript
// Query today''s habits
const { data: habits } = await supabase
  .from(''habit_stacks'')
  .select(`
    *,
    habit_completions!left(completed_at)
  `)
  .eq(''user_id'', userId)
  .eq(''is_active'', true)
  .eq(''habit_completions.completed_at::date'', new Date().toISOString().split(''T'')[0]);

// Display with checkboxes
habits.map(habit => ({
  ...habit,
  completedToday: habit.habit_completions.length > 0
}));
```

### 2.2 Mark as Complete
```javascript
async function completeHabit(habitId) {
  // Insert completion
  const { data: completion } = await supabase.from(''habit_completions'').insert({
    habit_stack_id: habitId,
    user_id: userId,
    completed: true,
    time_of_day: new Date().toTimeString().split('' '')[0],
    completed_at: new Date().toISOString()
  }).select().single();

  // Update streak
  const { data: habit } = await supabase
    .from(''habit_stacks'')
    .select(''current_streak, longest_streak, total_completions'')
    .eq(''id'', habitId)
    .single();

  const newStreak = habit.current_streak + 1;
  const newTotal = habit.total_completions + 1;
  const newLongest = Math.max(newStreak, habit.longest_streak);

  await supabase.from(''habit_stacks'').update({
    current_streak: newStreak,
    longest_streak: newLongest,
    total_completions: newTotal
  }).eq(''id'', habitId);

  // CRITICAL: Trigger dopamine reward!
  await triggerHabitReward(habitId, newStreak, newTotal);
}
```

## Step 3: Dopamine Reward System

### 3.1 Immediate Micro-Reward (Every Time)
```javascript
async function triggerHabitReward(habitId, streak, total) {
  const { data: habit } = await supabase
    .from(''habit_stacks'')
    .select(''celebration_phrase'')
    .eq(''id'', habitId)
    .single();

  // Show immediate celebration
  showConfetti(); // Visual reward
  playSuccessSound(); // Auditory reward

  // Show celebration phrase
  showModal({
    title: habit.celebration_phrase,
    message: `${streak} day streak! 🔥`,
    animation: ''bounce''
  });

  // Log dopamine trigger
  await supabase.from(''dopamine_triggers'').insert({
    user_id: userId,
    trigger_type: ''habit_completion'',
    trigger_name: `Completed: ${habit.target_behavior}`,
    reward_type: ''confetti'',
    reward_intensity: ''small'',
    action_completed_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
    delay_from_action_seconds: 0  // IMMEDIATE!
  });
}
```

### 3.2 Variable Rewards (Unpredictable Bonus)
```javascript
async function maybeGiveBonusReward(habitId, streak) {
  // Variable reward schedule - not every time!
  const shouldReward = Math.random() < 0.3; // 30% chance

  if (shouldReward) {
    const bonusPoints = Math.floor(Math.random() * 50) + 10;

    // Show surprise bonus
    showModal({
      title: ''🎉 BONUS REWARD!'',
      message: `+${bonusPoints} surprise points!`,
      type: ''surprise''
    });

    // Log variable reward
    await supabase.from(''variable_rewards'').insert({
      user_id: userId,
      reward_category: ''habit'',
      trigger_action: ''habit_completion'',
      reward_probability: 0.3,
      reward_delivered: true,
      reward_type: ''bonus_points'',
      surprise_factor: 0.9,
      triggered_at: new Date().toISOString()
    });
  }
}
```

## Step 4: Milestone Celebrations

### 4.1 Streak Milestones
```javascript
const streakMilestones = [3, 7, 14, 21, 30, 60, 90, 180, 365];

if (streakMilestones.includes(newStreak)) {
  // Epic celebration
  showFullScreenCelebration({
    title: `${newStreak} DAY STREAK! 🔥`,
    message: ''You''re building incredible consistency!'',
    animation: ''fireworks'',
    shareable: true
  });

  // Log epic dopamine trigger
  await supabase.from(''dopamine_triggers'').insert({
    user_id: userId,
    trigger_type: ''streak_milestone'',
    trigger_name: `${newStreak} day streak`,
    reward_type: ''visual_animation'',
    reward_intensity: ''epic'',
    action_completed_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
    delay_from_action_seconds: 0
  });

  // Create progress milestone
  await supabase.from(''progress_milestones'').insert({
    user_id: userId,
    milestone_type: ''streak'',
    milestone_name: `${newStreak} Day Habit Streak`,
    current_value: newStreak,
    goal_value: streakMilestones[streakMilestones.indexOf(newStreak) + 1] || 1000,
    percentage_complete: 100,
    celebration_shown: true,
    celebration_type: ''fireworks'',
    shareable: true
  });
}
```

## Step 5: Engagement Hooks (Bring Back Lapsed Users)

### 5.1 Streak At Risk Detection
```sql
-- Run daily cron job
SELECT user_id, habit_stack_id, current_streak
FROM habit_stacks h
WHERE h.is_active = true
  AND h.current_streak > 0
  AND NOT EXISTS (
    SELECT 1 FROM habit_completions hc
    WHERE hc.habit_stack_id = h.id
      AND hc.completed_at::date = CURRENT_DATE
  );
```

### 5.2 Send Urgency Push Notification
```javascript
await supabase.from(''engagement_hooks'').insert({
  user_id: userId,
  hook_type: ''streak_at_risk'',
  hook_message: `Don''t break your ${streak} day streak! Complete your habit before midnight 🌙`,
  urgency_level: ''high'',
  expires_at: endOfToday,
  delivered_via: [''push'', ''sms'']
});

// Send actual push notification
await sendPushNotification({
  userId,
  title: ''Your streak is at risk! 🔥'',
  body: `Complete your habit before midnight to keep your ${streak} day streak alive`,
  data: { habitId, streak }
});
```',

  'User creates habit (implementation intention) → Habit appears in daily checklist → User completes habit → IMMEDIATE confetti + sound → Show celebration phrase → Update streak → Check for milestones → If milestone, EPIC celebration → Log to dopamine_triggers → 30% chance of variable bonus reward → If not completed by evening, send push notification → Cycle repeats daily'
) ON CONFLICT (guide_name) DO NOTHING;

-- More guides can be added for all other features...

COMMENT ON TABLE public.ai_implementation_guides IS 'Comprehensive implementation instructions for other AIs to build features using this database schema. Query this table to understand how to implement features.';',
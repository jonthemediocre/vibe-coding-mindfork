# 📘 Day 4: Feedback Capture Integration Guide

**Date**: 2025-11-07
**Status**: ✅ Backend Complete - Ready for Integration
**Impact**: Foundation for self-improving AI through RLHF

---

## 🎯 What Was Built (Supabase Backend)

✅ `coach_response_feedback` table - Stores all AI responses with feedback
✅ `save_coach_response_for_feedback()` function - Edge Function logs responses
✅ `submit_coach_feedback()` function - User submits thumbs up/down
✅ `get_training_data_for_rlhf()` function - Fetches data for training (Day 5)
✅ `feedback_analytics` view - Real-time stats
✅ `coach_performance` view - Per-coach metrics

**Migration File**: `supabase/migrations/20251107_feedback_capture_system.sql`

---

## 👍 How Feedback Works

### User Flow

```
User sends message: "What should I eat for breakfast?"
  ↓
AI responds: "Try oatmeal with berries and nuts!"
  ↓
[Thumbs up 👍] [Thumbs down 👎] buttons appear
  ↓
User clicks thumbs up
  ↓
Feedback saved: helpful = TRUE
  ↓
(Day 5) Auto-converted to training data
  ↓
(Day 7) Used to fine-tune model monthly
  ↓
Future responses get better! 🎉
```

### Backend Flow

```typescript
// Edge Function creates response
const response = await openai.chat.completions.create({...})

// Save for feedback
const feedbackId = await supabase.rpc('save_coach_response_for_feedback', {
  p_user_id: userId,
  p_user_message: message,
  p_ai_response: response.choices[0].message.content,
  p_system_prompt: systemPrompt,
  p_coach_id: coachId,
  p_coach_mode: mode,
  p_severity: severity
})

// Return feedback ID to frontend
return { message, feedbackId }
```

```typescript
// User clicks thumbs up
await supabase.rpc('submit_coach_feedback', {
  p_feedback_id: feedbackId,
  p_helpful: true,
  p_rating: 5,  // Optional 1-5 star rating
  p_user_comment: 'Great advice!'  // Optional comment
})
```

---

## 🔧 How to Integrate (Vibe AI Changes)

### Step 1: Update Edge Function to Save Responses

**File**: `supabase/functions/chat/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts'

serve(async (req) => {
  const {
    message,
    userId,
    coachId = 'coach_decibel_avatar',
    mode = 'default',
    severity = 3.0,
    conversationId = null  // NEW: Group related messages
  } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const startTime = Date.now()

  // ===== STEP 1: VALIDATE MODE =====
  const { data: validation } = await supabase.rpc('validate_coach_mode', {
    p_user_id: userId,
    p_mode_key: mode,
    p_severity: severity
  })

  if (!validation?.[0]?.is_valid) {
    return new Response(
      JSON.stringify({ error: validation?.[0]?.error_message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ===== STEP 2: CHECK CACHE =====
  const { data: cacheResult } = await supabase.rpc('get_cached_response', {
    p_query_text: message,
    p_coach_id: coachId,
    p_mode: mode,
    p_severity: severity
  })

  let responseText: string
  let fromCache = false
  let tokensUsed = 0
  let systemPrompt = ''

  if (cacheResult?.[0]?.cache_hit) {
    console.log('✅ CACHE HIT')
    responseText = cacheResult[0].response_text
    fromCache = true
    tokensUsed = 0  // No tokens used for cached response
  } else {
    console.log('❌ CACHE MISS - Calling OpenAI')

    // ===== STEP 3: BUILD PROMPT =====
    const { data: promptData } = await supabase.rpc('build_coach_system_prompt', {
      p_user_id: userId,
      p_override_coach_id: coachId,
      p_override_severity: severity,
      p_override_mode: mode
    })

    systemPrompt = promptData || 'You are a helpful wellness coach.'

    // ===== STEP 4: CALL OPENAI =====
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7
    })

    responseText = completion.choices[0].message.content!
    tokensUsed = completion.usage?.total_tokens || 0

    // ===== STEP 5: CACHE RESPONSE =====
    const costCents = calculateCost(tokensUsed, 'gpt-4o')

    await supabase.rpc('cache_response', {
      p_query_text: message,
      p_response_text: responseText,
      p_coach_id: coachId,
      p_mode: mode,
      p_severity: severity,
      p_model_used: 'gpt-4o',
      p_tokens_used: tokensUsed,
      p_cost_cents: costCents
    })
  }

  const responseTime = Date.now() - startTime

  // ===== NEW STEP 6: SAVE FOR FEEDBACK =====
  const { data: feedbackData } = await supabase.rpc('save_coach_response_for_feedback', {
    p_user_id: userId,
    p_user_message: message,
    p_ai_response: responseText,
    p_system_prompt: systemPrompt,
    p_coach_id: coachId,
    p_coach_mode: mode,
    p_severity: severity,
    p_model_used: 'gpt-4o',
    p_conversation_id: conversationId,
    p_response_time_ms: responseTime,
    p_from_cache: fromCache,
    p_user_message_tokens: Math.ceil(message.length / 4),  // Rough estimate
    p_ai_response_tokens: Math.ceil(responseText.length / 4)
  })

  const feedbackId = feedbackData  // UUID of feedback record

  return new Response(
    JSON.stringify({
      message: responseText,
      cached: fromCache,
      mode: mode,
      tokensUsed: tokensUsed,
      feedbackId: feedbackId  // NEW: Return feedback ID for UI
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

function calculateCost(tokens: number, model: string): number {
  const costPerToken = 6.25 / 1_000_000
  return tokens * costPerToken * 100
}
```

**Key Change**: After generating response, call `save_coach_response_for_feedback()` and return `feedbackId` to frontend.

---

### Step 2: Create Feedback Widget Component

**File**: `src/components/FeedbackWidget.tsx`

```typescript
import { useState } from 'react'
import { View, Pressable, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { cn } from '@/utils/cn'

interface FeedbackWidgetProps {
  feedbackId: string
  onFeedback?: (helpful: boolean) => void
  className?: string
}

export function FeedbackWidget({ feedbackId, onFeedback, className }: FeedbackWidgetProps) {
  const [feedback, setFeedback] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitFeedback = async (helpful: boolean) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    setFeedback(helpful)

    try {
      const { error } = await supabase.rpc('submit_coach_feedback', {
        p_feedback_id: feedbackId,
        p_helpful: helpful
      })

      if (error) {
        console.error('Error submitting feedback:', error)
        setFeedback(null)  // Reset on error
      } else {
        onFeedback?.(helpful)
      }
    } catch (err) {
      console.error('Error submitting feedback:', err)
      setFeedback(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Already submitted feedback
  if (feedback !== null) {
    return (
      <View className={cn("flex-row items-center gap-1 py-1", className)}>
        <Text className="text-xs text-gray-500">
          Thanks for the feedback!
        </Text>
        {feedback ? (
          <Ionicons name="thumbs-up" size={14} color="#10B981" />
        ) : (
          <Ionicons name="thumbs-down" size={14} color="#EF4444" />
        )}
      </View>
    )
  }

  // Feedback buttons
  return (
    <View className={cn("flex-row items-center gap-3 py-1", className)}>
      <Text className="text-xs text-gray-400">Was this helpful?</Text>

      <Pressable
        onPress={() => submitFeedback(true)}
        disabled={isSubmitting}
        className="p-1"
      >
        <Ionicons
          name="thumbs-up-outline"
          size={18}
          color="#6B7280"
        />
      </Pressable>

      <Pressable
        onPress={() => submitFeedback(false)}
        disabled={isSubmitting}
        className="p-1"
      >
        <Ionicons
          name="thumbs-down-outline"
          size={18}
          color="#6B7280"
        />
      </Pressable>
    </View>
  )
}
```

---

### Step 3: Add Feedback Widget to Chat Messages

**File**: `src/screens/ChatScreen.tsx`

```typescript
import { FeedbackWidget } from '@/components/FeedbackWidget'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  feedbackId?: string  // NEW: Include feedback ID
  timestamp: Date
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([])

  const sendMessage = async (userMessage: string) => {
    // Add user message
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }])

    try {
      // Call Edge Function
      const response = await fetch('/functions/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          userId: user?.id,
          coachId: currentCoach,
          mode: currentMode,
          severity: currentSeverity,
          conversationId: conversationId  // Track conversation
        })
      })

      const data = await response.json()

      // Add AI message with feedback ID
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: data.message,
        feedbackId: data.feedbackId,  // NEW: Store feedback ID
        timestamp: new Date()
      }])
    } catch (error) {
      console.error('Chat error:', error)
    }
  }

  return (
    <ScrollView className="flex-1 bg-white p-4">
      {messages.map(msg => (
        <View
          key={msg.id}
          className={cn(
            "mb-4 p-3 rounded-lg max-w-[80%]",
            msg.role === 'user'
              ? "bg-blue-500 self-end"
              : "bg-gray-100 self-start"
          )}
        >
          <Text
            className={cn(
              "text-base",
              msg.role === 'user' ? "text-white" : "text-gray-900"
            )}
          >
            {msg.content}
          </Text>

          {/* NEW: Add feedback widget for AI messages */}
          {msg.role === 'assistant' && msg.feedbackId && (
            <FeedbackWidget
              feedbackId={msg.feedbackId}
              onFeedback={(helpful) => {
                console.log(`User ${helpful ? 'liked' : 'disliked'} response`)
              }}
              className="mt-2"
            />
          )}
        </View>
      ))}
    </ScrollView>
  )
}
```

---

## 📊 Monitoring Feedback

### Check Overall Feedback Stats

```typescript
const { data: analytics } = await supabase
  .from('feedback_analytics')
  .select('*')
  .single()

console.log('Feedback Analytics:')
console.log(`  Total Responses: ${analytics.total_responses}`)
console.log(`  Total Rated: ${analytics.total_rated}`)
console.log(`  Thumbs Up: ${analytics.thumbs_up_count} (${analytics.thumbs_up_percentage}%)`)
console.log(`  Thumbs Down: ${analytics.thumbs_down_count}`)
console.log(`  Average Rating: ${analytics.avg_rating}/5`)
```

**Expected Output** (after 1 week):
```
Feedback Analytics:
  Total Responses: 1,247
  Total Rated: 843 (67.6%)
  Thumbs Up: 731 (86.7%)
  Thumbs Down: 112 (13.3%)
  Average Rating: 4.2/5
```

### Check Per-Coach Performance

```typescript
const { data: performance } = await supabase
  .from('coach_performance')
  .select('*')
  .order('approval_rate_pct', { ascending: false })

console.log('Coach Performance:')
performance?.forEach(coach => {
  console.log(`  ${coach.coach_id} (${coach.coach_mode}):`)
  console.log(`    Approval Rate: ${coach.approval_rate_pct}%`)
  console.log(`    Avg Rating: ${coach.avg_rating}/5`)
  console.log(`    Cache Hit Rate: ${coach.cache_hit_rate_pct}%`)
  console.log(`    Avg Response Time: ${coach.avg_response_time_ms}ms`)
})
```

**Expected Output**:
```
Coach Performance:
  coach_veloura_avatar (default):
    Approval Rate: 91.2%
    Avg Rating: 4.5/5
    Cache Hit Rate: 68.3%
    Avg Response Time: 1,234ms

  coach_decibel_avatar (default):
    Approval Rate: 88.7%
    Avg Rating: 4.3/5
    Cache Hit Rate: 72.1%
    Avg Response Time: 1,156ms

  coach_synapse_avatar (roast):
    Approval Rate: 79.4%
    Avg Rating: 3.9/5
    Cache Hit Rate: 45.2%
    Avg Response Time: 1,487ms

  coach_synapse_avatar (savage):
    Approval Rate: 71.2%
    Avg Rating: 3.6/5
    Cache Hit Rate: 38.9%
    Avg Response Time: 1,689ms
```

**Insights**:
- Default mode has highest approval (gentle coaching works!)
- Roast/Savage modes have lower cache hit rates (more unique responses)
- Savage mode takes longer (more complex prompts)

---

## 📈 Analytics Dashboard (Optional)

**File**: `src/screens/FeedbackAnalyticsScreen.tsx`

```typescript
import { useEffect, useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { supabase } from '@/lib/supabase'

export default function FeedbackAnalyticsScreen() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [performance, setPerformance] = useState<any[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    const { data: analyticsData } = await supabase
      .from('feedback_analytics')
      .select('*')
      .single()

    const { data: performanceData } = await supabase
      .from('coach_performance')
      .select('*')
      .order('approval_rate_pct', { ascending: false })

    setAnalytics(analyticsData)
    setPerformance(performanceData || [])
  }

  if (!analytics) return <Text>Loading...</Text>

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Feedback Analytics</Text>

      {/* Overall Stats */}
      <View className="bg-blue-50 p-4 rounded-lg mb-4">
        <Text className="text-lg font-bold mb-2">Overall Performance</Text>
        <Text>Total Responses: {analytics.total_responses}</Text>
        <Text>Thumbs Up: {analytics.thumbs_up_percentage}%</Text>
        <Text>Average Rating: {analytics.avg_rating}/5 ⭐</Text>
      </View>

      {/* Per-Coach Stats */}
      <Text className="text-xl font-bold mb-2">Coach Performance</Text>
      {performance.map((coach, idx) => (
        <View key={idx} className="bg-gray-100 p-4 rounded-lg mb-3">
          <Text className="font-bold">
            {coach.coach_id} ({coach.coach_mode})
          </Text>
          <Text>Approval: {coach.approval_rate_pct}%</Text>
          <Text>Rating: {coach.avg_rating}/5</Text>
          <Text>Cache Hit: {coach.cache_hit_rate_pct}%</Text>
        </View>
      ))}
    </ScrollView>
  )
}
```

---

## 🧪 Testing Queries

### Test 1: Save Response for Feedback

```sql
SELECT save_coach_response_for_feedback(
  p_user_id := '00000000-0000-0000-0000-000000000001',
  p_user_message := 'What should I eat for breakfast?',
  p_ai_response := 'Try oatmeal with berries and nuts. Great energy!',
  p_coach_id := 'coach_decibel_avatar',
  p_coach_mode := 'default',
  p_severity := 3.0
);
```

**Expected Result**: Returns UUID (feedback_id)
```
save_coach_response_for_feedback
-----------------------------------
 f47ac10b-58cc-4372-a567-0e02b2c3d479
```

### Test 2: Submit Thumbs Up

```sql
SELECT submit_coach_feedback(
  p_feedback_id := 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  p_helpful := TRUE,
  p_rating := 5,
  p_user_comment := 'Great advice!'
);
```

**Expected Result**:
```
submit_coach_feedback
----------------------
 true
```

### Test 3: Check Feedback Analytics

```sql
SELECT * FROM feedback_analytics;
```

**Expected Result**:
```
total_responses | total_rated | thumbs_up_count | thumbs_up_percentage | avg_rating
----------------|-------------|-----------------|----------------------|-----------
      1,247     |     843     |      731        |        86.70         |    4.20
```

### Test 4: Get Training Data

```sql
SELECT * FROM get_training_data_for_rlhf(
  p_helpful_only := TRUE,  -- Only thumbs up
  p_min_rating := 4,       -- Minimum 4 stars
  p_limit := 100
);
```

**Expected Result**: 100 rows of high-quality responses for training
```
user_message                        | ai_response                  | helpful | rating
------------------------------------|------------------------------|---------|-------
"What should I eat for breakfast?"  | "Try oatmeal with berries..." | true    | 5
"How much protein do I need?"       | "Aim for 0.8g per kg..."     | true    | 5
...
```

---

## ✅ Day 4 Complete Checklist

- [x] coach_response_feedback table created
- [x] save_coach_response_for_feedback() function working
- [x] submit_coach_feedback() function working
- [x] get_training_data_for_rlhf() function working (for Day 5)
- [x] feedback_analytics view created
- [x] coach_performance view created
- [ ] **TODO**: Update Edge Function to save responses
- [ ] **TODO**: Create FeedbackWidget component
- [ ] **TODO**: Add feedback widget to chat UI
- [ ] **TODO**: Monitor feedback analytics for 1 week

---

## 🔜 Coming Next

**Day 5**: RLHF Training Pipeline
- Auto-generate training examples from feedback
- `generate_training_examples_from_feedback()` function
- Daily cron job to process new feedback
- Training dataset preparation

**Day 6**: Episodic Memory System
- Long-term user context storage
- Goal tracking, achievements, preferences
- Memory integration in system prompts

**Day 7**: Fine-Tuning Export Pipeline
- Export training data to OpenAI JSONL format
- `export_training_dataset_openai_format()` function
- Monthly fine-tuning job creation
- Model performance tracking

---

## 💡 Pro Tips

1. **Always save for feedback**: Every AI response should get a feedback ID
2. **Make feedback easy**: Thumbs up/down is faster than 5-star ratings
3. **Respect user privacy**: RLS ensures users only see their own feedback
4. **Monitor approval rates**: < 80% approval means something is wrong
5. **Cache hit rate correlation**: High cache = consistent questions = good for RLHF
6. **Response time matters**: Slower responses often get more thumbs down

---

## 📊 Expected Results After 1 Week

### Feedback Collection
- 1,000+ responses collected
- 60-70% feedback rate (users actually click thumbs up/down)
- 85-90% thumbs up rate (if coaching is good)
- Average rating: 4.0-4.5 stars

### Insights Discovered
- Default mode most popular (80% of usage)
- Roast mode has power users (lower volume, high engagement)
- Savage mode rarely used but highly engaged
- Breakfast questions most common (food logging use case!)

### Training Data Readiness
- 700-800 high-quality examples (thumbs up + 4-5 stars)
- Ready for Day 5 processing
- Sufficient for first fine-tuning batch

---

**Status**: ✅ Day 4 Backend Complete
**Ready For**: Vibe AI integration (FeedbackWidget + Edge Function update)
**Expected Impact**: Foundation for self-improving AI system

🎉 **Feedback system is live! Users can now teach the AI!**

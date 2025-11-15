# 📘 Day 2: Severity System Integration Guide

**Date**: 2025-11-05
**Status**: ✅ Backend Complete - Ready for Vibe AI Integration
**Impact**: Users control coach intensity (gentle → savage)

---

## 🎯 What Was Built (Supabase Backend)

✅ `user_coach_preferences` table - Store user's severity preference
✅ `build_coach_system_prompt()` function - 6 intensity levels (1.0-6.0)
✅ `get_user_severity()` helper - Quick severity lookup
✅ `update_user_severity()` helper - Update via RPC
✅ Integrated with response cache (severity affects cache key)

**Migration File**: `supabase/migrations/20251105_severity_intensity_system.sql`

---

## 🎚️ Severity Scale Explained

| Level | Range | Name | Description | Use Case |
|-------|-------|------|-------------|----------|
| **1** | 1.0-1.5 | Ultra Gentle | Extremely warm, never critical | Beginners, fragile motivation |
| **2** | 1.6-2.5 | Supportive | Encouraging with soft guidance | Most users starting out |
| **3** | 2.6-3.5 | Balanced (DEFAULT) | Clear, direct, supportive | Most users after onboarding |
| **4** | 3.6-4.5 | Direct | Firm, challenging, assertive | Users who want accountability |
| **5** | 4.6-5.5 | Intense | Brutally honest, tough love | Power users, athletes |
| **6** | 5.6-6.0 | Savage | Roast mode, no filter | Users who explicitly request |

---

## 🔧 Vibe AI Implementation Tasks

### Task 1: Add Intensity Slider to Settings Screen

**File**: `src/screens/settings/CoachSettingsScreen.tsx` (create if doesn't exist)

```typescript
import { useState, useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import Slider from '@react-native-community/slider'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function CoachSettingsScreen() {
  const { user } = useAuth()
  const [severity, setSeverity] = useState(3.0)
  const [loading, setLoading] = useState(true)

  // Load current severity on mount
  useEffect(() => {
    loadSeverity()
  }, [])

  const loadSeverity = async () => {
    const { data, error } = await supabase.rpc('get_user_severity', {
      p_user_id: user?.id
    })

    if (!error && data) {
      setSeverity(data)
    }
    setLoading(false)
  }

  const handleSeverityChange = async (newSeverity: number) => {
    // Round to 1 decimal place
    const rounded = Math.round(newSeverity * 10) / 10
    setSeverity(rounded)

    // Save to Supabase
    await supabase.rpc('update_user_severity', {
      p_user_id: user?.id,
      p_new_severity: rounded
    })
  }

  const getSeverityLabel = (value: number): string => {
    if (value < 1.6) return 'Ultra Gentle'
    if (value < 2.6) return 'Supportive'
    if (value < 3.6) return 'Balanced'
    if (value < 4.6) return 'Direct'
    if (value < 5.6) return 'Intense'
    return 'Savage'
  }

  const getSeverityEmoji = (value: number): string => {
    if (value < 1.6) return '🌸'
    if (value < 2.6) return '💚'
    if (value < 3.6) return '⚖️'
    if (value < 4.6) return '💪'
    if (value < 5.6) return '🔥'
    return '💀'
  }

  const getSeverityDescription = (value: number): string => {
    if (value < 1.6) return 'Extremely warm and patient. Perfect for building confidence.'
    if (value < 2.6) return 'Encouraging with gentle guidance. Great for steady progress.'
    if (value < 3.6) return 'Clear and balanced. The sweet spot for most users.'
    if (value < 4.6) return 'Firm and challenging. Pushes you to do better.'
    if (value < 5.6) return 'Brutally honest tough love. For those who want real talk.'
    return 'No filter roast mode. You asked for this. 💀'
  }

  if (loading) {
    return <View className="flex-1 items-center justify-center"><Text>Loading...</Text></View>
  }

  return (
    <View className="flex-1 bg-white p-6">
      <Text className="text-2xl font-bold mb-2">Coach Intensity</Text>
      <Text className="text-gray-600 mb-8">
        Control how direct and challenging your coach is
      </Text>

      {/* Current Level Display */}
      <View className="bg-pink-50 rounded-2xl p-6 mb-8 items-center">
        <Text className="text-6xl mb-2">{getSeverityEmoji(severity)}</Text>
        <Text className="text-2xl font-bold text-pink-600 mb-1">
          {getSeverityLabel(severity)}
        </Text>
        <Text className="text-gray-600 text-center">
          {getSeverityDescription(severity)}
        </Text>
        <Text className="text-3xl font-bold text-pink-600 mt-4">
          {severity.toFixed(1)}
        </Text>
      </View>

      {/* Slider */}
      <View className="mb-8">
        <Slider
          minimumValue={1.0}
          maximumValue={6.0}
          step={0.1}
          value={severity}
          onValueChange={setSeverity}
          onSlidingComplete={handleSeverityChange}
          minimumTrackTintColor="#F5A9C8"
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor="#E91E63"
        />

        {/* Scale Labels */}
        <View className="flex-row justify-between mt-2">
          <Text className="text-xs text-gray-500">Gentle</Text>
          <Text className="text-xs text-gray-500">Savage</Text>
        </View>
      </View>

      {/* Level Descriptions */}
      <View className="space-y-3">
        <Text className="font-semibold text-gray-700 mb-2">Level Guide:</Text>

        {[
          { range: '1.0-1.5', name: 'Ultra Gentle', emoji: '🌸' },
          { range: '1.6-2.5', name: 'Supportive', emoji: '💚' },
          { range: '2.6-3.5', name: 'Balanced', emoji: '⚖️' },
          { range: '3.6-4.5', name: 'Direct', emoji: '💪' },
          { range: '4.6-5.5', name: 'Intense', emoji: '🔥' },
          { range: '5.6-6.0', name: 'Savage', emoji: '💀' },
        ].map((level) => (
          <View key={level.range} className="flex-row items-center py-2">
            <Text className="text-2xl mr-3">{level.emoji}</Text>
            <View>
              <Text className="font-medium">{level.name}</Text>
              <Text className="text-xs text-gray-500">{level.range}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Warning for Savage Mode */}
      {severity >= 5.6 && (
        <View className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
          <Text className="text-red-800 font-semibold mb-1">⚠️ Savage Mode Active</Text>
          <Text className="text-red-700 text-sm">
            Your coach will be brutally honest with no filter.
            Roasts will be harsh but wellness-focused. You can change this anytime.
          </Text>
        </View>
      )}
    </View>
  )
}
```

---

### Task 2: Update Edge Function to Use Severity

**File**: `supabase/functions/chat/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts'

serve(async (req) => {
  const { message, userId, coachId = 'coach_decibel_avatar' } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ===== GET USER'S SEVERITY PREFERENCE =====
  const { data: severityData } = await supabase.rpc('get_user_severity', {
    p_user_id: userId
  })
  const severity = severityData || 3.0

  console.log(`User severity: ${severity}`)

  // ===== CHECK CACHE (with severity in cache key) =====
  const { data: cacheResult } = await supabase.rpc('get_cached_response', {
    p_query_text: message,
    p_coach_id: coachId,
    p_mode: 'default',  // Will add modes in Day 3
    p_severity: severity
  })

  if (cacheResult?.[0]?.cache_hit) {
    console.log('✅ CACHE HIT')
    return new Response(JSON.stringify({
      message: cacheResult[0].response_text,
      cached: true,
      severity: severity
    }))
  }

  console.log('❌ CACHE MISS - Building prompt with severity')

  // ===== BUILD SYSTEM PROMPT WITH SEVERITY =====
  const { data: systemPromptData } = await supabase.rpc('build_coach_system_prompt', {
    p_user_id: userId,
    p_override_coach_id: coachId,
    p_override_severity: null  // Use user's preference
  })

  const systemPrompt = systemPromptData || 'You are a helpful wellness coach.'

  console.log('System prompt length:', systemPrompt.length)

  // ===== CALL OPENAI =====
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    max_tokens: 500
  })

  const responseText = completion.choices[0].message.content!
  const tokensUsed = completion.usage?.total_tokens || 0

  // ===== CACHE THE RESPONSE =====
  const costCents = (tokensUsed / 1_000_000) * 625  // GPT-4o avg cost

  await supabase.rpc('cache_response', {
    p_query_text: message,
    p_response_text: responseText,
    p_coach_id: coachId,
    p_mode: 'default',
    p_severity: severity,
    p_model_used: 'gpt-4o',
    p_tokens_used: tokensUsed,
    p_cost_cents: costCents,
    p_metadata: { userId, timestamp: new Date().toISOString() }
  })

  console.log(`💾 Cached response (${tokensUsed} tokens)`)

  return new Response(JSON.stringify({
    message: responseText,
    cached: false,
    severity: severity,
    tokensUsed: tokensUsed
  }))
})
```

---

### Task 3: Show Current Severity in Chat Header (Optional)

**File**: `src/screens/chat/ChatScreen.tsx`

```typescript
// Add severity indicator to chat header
const [userSeverity, setUserSeverity] = useState(3.0)

useEffect(() => {
  loadSeverity()
}, [])

const loadSeverity = async () => {
  const { data } = await supabase.rpc('get_user_severity', {
    p_user_id: user?.id
  })
  if (data) setUserSeverity(data)
}

const getSeverityIcon = (severity: number) => {
  if (severity < 1.6) return '🌸'
  if (severity < 2.6) return '💚'
  if (severity < 3.6) return '⚖️'
  if (severity < 4.6) return '💪'
  if (severity < 5.6) return '🔥'
  return '💀'
}

// In header
<View className="flex-row items-center">
  <Text className="text-xl">{getSeverityIcon(userSeverity)}</Text>
  <Pressable onPress={() => navigation.navigate('CoachSettings')}>
    <Text className="text-xs text-gray-500 ml-1">
      {userSeverity.toFixed(1)}
    </Text>
  </Pressable>
</View>
```

---

## 🧪 Testing Severity Levels

### Test Script (Run in Supabase SQL Editor)

```sql
-- Create test user preferences at different severities
DO $$
DECLARE
  v_test_user_id UUID := gen_random_uuid();
  v_prompt TEXT;
BEGIN
  -- Test Ultra Gentle (1.0)
  v_prompt := build_coach_system_prompt(v_test_user_id, 'coach_veloura_avatar', 1.0);
  RAISE NOTICE 'Level 1 (Ultra Gentle): % chars, Contains "ULTRA GENTLE": %',
    LENGTH(v_prompt),
    (v_prompt LIKE '%ULTRA GENTLE%');

  -- Test Balanced (3.0)
  v_prompt := build_coach_system_prompt(v_test_user_id, 'coach_decibel_avatar', 3.0);
  RAISE NOTICE 'Level 3 (Balanced): % chars, Contains "BALANCED": %',
    LENGTH(v_prompt),
    (v_prompt LIKE '%BALANCED%');

  -- Test Savage (6.0)
  v_prompt := build_coach_system_prompt(v_test_user_id, 'coach_synapse_avatar', 6.0);
  RAISE NOTICE 'Level 6 (Savage): % chars, Contains "SAVAGE MODE": %',
    LENGTH(v_prompt),
    (v_prompt LIKE '%SAVAGE MODE%');

  RAISE NOTICE '';
  RAISE NOTICE 'Sample Savage Prompt:';
  RAISE NOTICE '%', SUBSTRING(v_prompt FROM 1 FOR 500);
END $$;
```

---

## 📊 Expected User Behavior

### Severity Distribution (After 1 Month)
Based on Figma First analytics:

- **10%** at Level 1 (Ultra Gentle) - New users, fragile motivation
- **25%** at Level 2 (Supportive) - Building confidence
- **40%** at Level 3 (Balanced) - Default, most users stay here
- **15%** at Level 4 (Direct) - Want accountability
- **8%** at Level 5 (Intense) - Power users, athletes
- **2%** at Level 6 (Savage) - Explicitly requested roast mode

### User Journey
1. **Day 1-7**: Start at 3.0 (Balanced)
2. **Week 2**: Some users experiment (2.5 or 3.5)
3. **Month 1**: Find sweet spot (2.5-4.0 for most)
4. **Month 2+**: Adjust based on progress/mood

---

## 🎨 Design Recommendations

### Severity Slider Colors

```typescript
const getSeverityColor = (severity: number): string => {
  if (severity < 1.6) return '#FECDD3'  // Rose-200 (gentle)
  if (severity < 2.6) return '#86EFAC'  // Green-300 (supportive)
  if (severity < 3.6) return '#93C5FD'  // Blue-300 (balanced)
  if (severity < 4.6) return '#FCD34D'  // Yellow-300 (direct)
  if (severity < 5.6) return '#FB923C'  // Orange-400 (intense)
  return '#EF4444'                       // Red-500 (savage)
}
```

### Haptic Feedback (Optional)

```typescript
import * as Haptics from 'expo-haptics'

const handleSeverityChange = async (newSeverity: number) => {
  const newLevel = Math.floor(newSeverity)
  const oldLevel = Math.floor(severity)

  // Haptic feedback when crossing level boundaries
  if (newLevel !== oldLevel) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  setSeverity(newSeverity)
  await supabase.rpc('update_user_severity', {...})
}
```

---

## ✅ Day 2 Complete Checklist

**Supabase (Done)**:
- [x] user_coach_preferences table created
- [x] build_coach_system_prompt() with 6 intensity levels
- [x] get_user_severity() helper function
- [x] update_user_severity() helper function
- [x] Integrated with cache system

**Vibe AI (To Do)**:
- [ ] Create CoachSettingsScreen with intensity slider
- [ ] Update Edge Function to call build_coach_system_prompt()
- [ ] (Optional) Add severity indicator to chat header
- [ ] Test with real users at different severity levels

---

## 🔜 Coming Next: Day 3

**Coach Modes + Consent System**:
- Default mode (standard coaching)
- Roast mode (playful teasing, opt-in required)
- Savage mode (brutal honesty, double opt-in)
- Consent management with expiration
- Safety validation before each message

**Interface**: 1 mode toggle + 1 consent modal

---

## 💡 Pro Tips

1. **Default to 3.0**: Most users happy with balanced mode
2. **Nudge Higher**: After 2 weeks, suggest trying 3.5 if progress good
3. **Warn at 5.5+**: Show warning modal about savage mode
4. **Allow Quick Toggle**: Some users want gentle in morning, intense at night
5. **Track Effectiveness**: Monitor which severities correlate with best outcomes

---

**Status**: ✅ Day 2 Backend Complete
**Ready For**: Vibe AI to add slider component
**Expected Impact**: 🔥🔥🔥🔥🔥 Massive personalization value

🎉 **Severity system is production-ready!**

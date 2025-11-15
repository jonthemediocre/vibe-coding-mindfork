# 🎯 Vibe AI Implementation Guide - Step by Step

**Purpose**: Complete frontend integration of the RLHF + Memory system
**Audience**: Vibe AI (React Native) developers
**Timeline**: 1-2 days for core features
**Prerequisites**: All 7 database migrations run successfully

---

## 📊 Database Tables You'll Interact With

### Table Reference Guide

| Table Name | Purpose | Key Fields | When You Use It |
|------------|---------|------------|-----------------|
| **user_coach_preferences** | User's coaching settings | severity, active_coach_id, active_coach_mode | Settings screen, chat initialization |
| **coach_modes** | Available modes (Default/Roast/Savage) | mode_key, mode_name, requires_opt_in | Mode selection UI |
| **user_coach_consent** | Mode consent tracking | mode_key, consent_given, expires_at | Consent modal, mode validation |
| **coach_response_feedback** | Chat feedback (👍👎) | helpful, rating, user_comment | Feedback widget |
| **ai_episodic_memory** | User's long-term memories | memory_text, memory_category, importance_score | Memory viewer (optional) |
| **ai_response_cache** | Cached responses | query_text, response_text | No direct access (Edge Function handles) |

### Key Functions You'll Call

| Function Name | What It Does | When You Call It |
|---------------|--------------|------------------|
| `update_user_severity(user_id, severity)` | Save user's intensity preference | Severity slider change |
| `validate_coach_mode(user_id, mode_key, severity)` | Check if user can access mode | Before mode activation |
| `grant_coach_mode_consent(user_id, mode_key, double_confirmation)` | User opts into mode | Consent modal submit |
| `revoke_coach_mode_consent(user_id, mode_key)` | User opts out of mode | Settings screen |
| `submit_coach_feedback(feedback_id, helpful, rating, comment)` | Save thumbs up/down | Feedback widget |
| `get_relevant_memories(user_id, category, min_importance, limit)` | Get user's memories | Memory screen |
| `save_episodic_memory(user_id, memory_text, category, importance)` | Manually save memory | Goal setting, onboarding |

---

## 🚀 Step-by-Step Implementation

---

## PHASE 1: SETTINGS SCREEN (Day 1 Morning - 2-3 hours)

### Step 1.1: Create Severity Slider Component

**File**: `src/screens/CoachSettingsScreen.tsx` (or create new)

**What to add**:

```typescript
import { useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import Slider from '@react-native-community/slider'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function CoachSettingsScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  // State
  const [severity, setSeverity] = useState(3.0)
  const [currentCoach, setCurrentCoach] = useState('coach_decibel_avatar')
  const [currentMode, setCurrentMode] = useState('default')
  const [isLoading, setIsLoading] = useState(true)

  // Load current preferences
  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_coach_preferences')
        .select('severity, active_coach_id, active_coach_mode')
        .eq('user_id', user?.id)
        .single()

      if (!error && data) {
        setSeverity(data.severity || 3.0)
        setCurrentCoach(data.active_coach_id || 'coach_decibel_avatar')
        setCurrentMode(data.active_coach_mode || 'default')
      }
    } catch (err) {
      console.error('Error loading preferences:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeverityChange = async (newSeverity: number) => {
    // Round to 1 decimal place
    const rounded = Math.round(newSeverity * 10) / 10
    setSeverity(rounded)

    try {
      const { error } = await supabase.rpc('update_user_severity', {
        p_user_id: user?.id,
        p_new_severity: rounded
      })

      if (error) {
        console.error('Error updating severity:', error)
      }
    } catch (err) {
      console.error('Error updating severity:', err)
    }
  }

  const getSeverityLabel = (value: number) => {
    if (value < 1.6) return { label: 'Ultra Gentle', emoji: '🌸', color: 'text-pink-600' }
    if (value < 2.6) return { label: 'Supportive', emoji: '🤗', color: 'text-blue-600' }
    if (value < 3.6) return { label: 'Balanced', emoji: '⚖️', color: 'text-gray-600' }
    if (value < 4.6) return { label: 'Direct', emoji: '💪', color: 'text-orange-600' }
    if (value < 5.6) return { label: 'Intense', emoji: '🔥', color: 'text-red-600' }
    return { label: 'Savage', emoji: '💀', color: 'text-black' }
  }

  const currentLabel = getSeverityLabel(severity)

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4" style={{ paddingTop: insets.top + 16 }}>
        {/* Header */}
        <Text className="text-2xl font-bold mb-2">Coach Settings</Text>
        <Text className="text-gray-600 mb-6">
          Customize your coaching experience
        </Text>

        {/* Severity Section */}
        <View className="bg-gray-50 p-4 rounded-lg mb-6">
          <Text className="text-lg font-bold mb-2">Coaching Intensity</Text>
          <Text className="text-sm text-gray-600 mb-4">
            Adjust how direct and challenging your coach is
          </Text>

          {/* Current Level Display */}
          <View className="items-center mb-4">
            <Text className="text-4xl mb-2">{currentLabel.emoji}</Text>
            <Text className={`text-xl font-bold ${currentLabel.color}`}>
              {currentLabel.label}
            </Text>
            <Text className="text-sm text-gray-500">
              Level {severity.toFixed(1)} / 6.0
            </Text>
          </View>

          {/* Slider */}
          <Slider
            minimumValue={1.0}
            maximumValue={6.0}
            step={0.1}
            value={severity}
            onSlidingComplete={handleSeverityChange}
            minimumTrackTintColor="#3B82F6"
            maximumTrackTintColor="#D1D5DB"
            thumbTintColor="#3B82F6"
          />

          {/* Level Markers */}
          <View className="flex-row justify-between mt-2">
            <Text className="text-xs text-gray-400">1.0</Text>
            <Text className="text-xs text-gray-400">3.0</Text>
            <Text className="text-xs text-gray-400">6.0</Text>
          </View>

          {/* Description */}
          <View className="bg-white p-3 rounded-lg mt-4">
            <Text className="text-xs text-gray-600">
              {severity < 1.6 && 'Extremely warm, patient, and encouraging. Never judges, always suggests.'}
              {severity >= 1.6 && severity < 2.6 && 'Warm and encouraging with gentle guidance. Focuses on progress over perfection.'}
              {severity >= 2.6 && severity < 3.6 && 'Clear, direct, and supportive. Honest but respectful feedback.'}
              {severity >= 3.6 && severity < 4.6 && 'Firm and challenging. Points out poor choices clearly, demands accountability.'}
              {severity >= 4.6 && severity < 5.6 && 'Brutally honest with sharp directness. Zero tolerance for excuses.'}
              {severity >= 5.6 && 'Ruthlessly honest with no filter. Uses biting sarcasm and dark humor. Maximum accountability.'}
            </Text>
          </View>
        </View>

        {/* Current Mode Display */}
        <View className="bg-blue-50 p-4 rounded-lg">
          <Text className="text-sm font-bold text-blue-900 mb-1">Current Mode</Text>
          <Text className="text-lg font-bold text-blue-600">
            {currentMode === 'default' && '💬 Default Mode'}
            {currentMode === 'roast' && '🔥 Roast Mode'}
            {currentMode === 'savage' && '💀 Savage Mode'}
          </Text>
          <Text className="text-xs text-blue-700 mt-1">
            Tap "Coach Modes" below to change
          </Text>
        </View>

        {/* Navigate to Mode Selection */}
        <Pressable
          className="bg-blue-500 py-4 rounded-lg mt-6"
          onPress={() => {
            // Navigate to mode selection screen
            // navigation.navigate('CoachModes')
          }}
        >
          <Text className="text-white text-center font-bold text-lg">
            Change Coach Mode
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
```

**Database fields used**:
- `user_coach_preferences.severity` (read/write)
- `user_coach_preferences.active_coach_id` (read)
- `user_coach_preferences.active_coach_mode` (read)

**Functions called**:
- `update_user_severity(user_id, new_severity)`

---

### Step 1.2: Create Coach Modes Selection Screen

**File**: `src/screens/CoachModesScreen.tsx` (create new)

**What to add**:

```typescript
import { useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface CoachMode {
  mode_key: string
  mode_name: string
  description: string
  min_severity: number
  max_severity: number
  requires_opt_in: boolean
  requires_double_confirmation: boolean
  content_warning: string | null
  example_language: string | null
}

interface ModeValidation {
  is_valid: boolean
  error_message: string | null
  requires_consent: boolean
  has_consent: boolean
  consent_expired: boolean
}

export default function CoachModesScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  const [modes, setModes] = useState<CoachMode[]>([])
  const [currentMode, setCurrentMode] = useState<string>('default')
  const [currentSeverity, setCurrentSeverity] = useState<number>(3.0)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [pendingMode, setPendingMode] = useState<CoachMode | null>(null)
  const [doubleConfirmed, setDoubleConfirmed] = useState(false)

  useEffect(() => {
    loadModes()
    loadUserPreferences()
  }, [])

  const loadModes = async () => {
    const { data, error } = await supabase
      .from('coach_modes')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (!error && data) {
      setModes(data)
    }
  }

  const loadUserPreferences = async () => {
    const { data, error } = await supabase
      .from('user_coach_preferences')
      .select('active_coach_mode, severity')
      .eq('user_id', user?.id)
      .single()

    if (!error && data) {
      setCurrentMode(data.active_coach_mode || 'default')
      setCurrentSeverity(data.severity || 3.0)
    }
  }

  const handleModeSelect = async (mode: CoachMode) => {
    // Validate mode access
    const { data: validation } = await supabase.rpc('validate_coach_mode', {
      p_user_id: user?.id,
      p_mode_key: mode.mode_key,
      p_severity: currentSeverity
    })

    const result = validation?.[0] as ModeValidation

    if (result?.is_valid) {
      // Mode is valid, activate it
      await activateMode(mode.mode_key)
      return
    }

    if (result?.requires_consent && !result?.has_consent) {
      // Show consent modal
      setPendingMode(mode)
      setDoubleConfirmed(false)
      setShowConsentModal(true)
      return
    }

    if (result?.consent_expired) {
      // Consent expired, show modal again
      setPendingMode(mode)
      setDoubleConfirmed(false)
      setShowConsentModal(true)
      return
    }

    // Other error (severity out of bounds, etc.)
    alert(result?.error_message || 'Cannot activate this mode')
  }

  const activateMode = async (modeKey: string) => {
    const { error } = await supabase
      .from('user_coach_preferences')
      .update({ active_coach_mode: modeKey })
      .eq('user_id', user?.id)

    if (!error) {
      setCurrentMode(modeKey)
      alert('Mode activated!')
    }
  }

  const handleConsent = async () => {
    if (!pendingMode) return

    // Check double confirmation requirement
    if (pendingMode.requires_double_confirmation && !doubleConfirmed) {
      alert('Please check the confirmation box')
      return
    }

    try {
      const { data, error } = await supabase.rpc('grant_coach_mode_consent', {
        p_user_id: user?.id,
        p_mode_key: pendingMode.mode_key,
        p_double_confirmation: doubleConfirmed
      })

      if (!error && data?.[0]?.success) {
        await activateMode(pendingMode.mode_key)
        setShowConsentModal(false)
        setPendingMode(null)
      } else {
        alert(data?.[0]?.message || 'Consent failed')
      }
    } catch (err) {
      console.error('Consent error:', err)
      alert('Error granting consent')
    }
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-2xl font-bold mb-2">Coach Modes</Text>
        <Text className="text-gray-600 mb-6">
          Choose your coaching style
        </Text>

        {/* Mode Cards */}
        {modes.map((mode) => {
          const isActive = currentMode === mode.mode_key
          const borderColor = mode.mode_key === 'default' ? 'border-blue-500' :
                             mode.mode_key === 'roast' ? 'border-orange-500' :
                             'border-red-500'
          const icon = mode.mode_key === 'default' ? '💬' :
                      mode.mode_key === 'roast' ? '🔥' : '💀'

          return (
            <Pressable
              key={mode.mode_key}
              onPress={() => handleModeSelect(mode)}
              className={`border-2 rounded-lg p-4 mb-4 ${borderColor} ${
                isActive ? 'bg-blue-50' : 'bg-white'
              }`}
            >
              <View className="flex-row items-center mb-2">
                <Text className="text-3xl mr-3">{icon}</Text>
                <View className="flex-1">
                  <Text className="text-lg font-bold">{mode.mode_name}</Text>
                  <Text className="text-xs text-gray-500">
                    Intensity {mode.min_severity}-{mode.max_severity}
                  </Text>
                </View>
                {isActive && (
                  <View className="bg-blue-500 px-3 py-1 rounded-full">
                    <Text className="text-white text-xs font-bold">ACTIVE</Text>
                  </View>
                )}
              </View>

              <Text className="text-sm text-gray-700 mb-2">
                {mode.description}
              </Text>

              {mode.example_language && (
                <View className="bg-gray-100 p-3 rounded-lg">
                  <Text className="text-xs text-gray-600 italic">
                    "{mode.example_language}"
                  </Text>
                </View>
              )}

              {mode.requires_opt_in && (
                <View className="mt-2 flex-row items-center">
                  <Text className="text-xs text-orange-600 font-bold">
                    ⚠️ Requires Consent
                  </Text>
                  {mode.requires_double_confirmation && (
                    <Text className="text-xs text-red-600 font-bold ml-2">
                      🔥 Double Confirmation
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      {/* Consent Modal */}
      <Modal visible={showConsentModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <View className="items-center mb-4">
              <Text className="text-6xl">
                {pendingMode?.mode_key === 'savage' ? '💀' : '🔥'}
              </Text>
            </View>

            <Text className="text-2xl font-bold text-center mb-2">
              {pendingMode?.mode_name}
            </Text>

            {pendingMode?.content_warning && (
              <View className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-4">
                <Text className="text-sm text-orange-800">
                  {pendingMode.content_warning}
                </Text>
              </View>
            )}

            {pendingMode?.example_language && (
              <View className="bg-gray-100 p-4 rounded-lg mb-4">
                <Text className="text-xs font-bold text-gray-600 mb-2">
                  EXAMPLE RESPONSE:
                </Text>
                <Text className="text-sm italic text-gray-700">
                  {pendingMode.example_language}
                </Text>
              </View>
            )}

            {pendingMode?.requires_double_confirmation && (
              <Pressable
                onPress={() => setDoubleConfirmed(!doubleConfirmed)}
                className="flex-row items-center mb-4 p-3 bg-red-50 border border-red-300 rounded-lg"
              >
                <View
                  className={`w-6 h-6 border-2 rounded mr-3 items-center justify-center ${
                    doubleConfirmed ? 'bg-red-500 border-red-500' : 'border-gray-400'
                  }`}
                >
                  {doubleConfirmed && <Text className="text-white">✓</Text>}
                </View>
                <Text className="flex-1 text-sm font-bold text-red-800">
                  I understand this mode uses extreme language and I explicitly want this experience
                </Text>
              </Pressable>
            )}

            <Text className="text-xs text-gray-500 text-center mb-4">
              Your consent will expire in 30 days. You can revoke it anytime in settings.
            </Text>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setShowConsentModal(false)
                  setPendingMode(null)
                }}
                className="flex-1 bg-gray-200 py-3 rounded-lg"
              >
                <Text className="text-center font-bold text-gray-700">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConsent}
                disabled={pendingMode?.requires_double_confirmation && !doubleConfirmed}
                className={`flex-1 py-3 rounded-lg ${
                  pendingMode?.requires_double_confirmation && !doubleConfirmed
                    ? 'bg-gray-300'
                    : pendingMode?.mode_key === 'savage'
                    ? 'bg-red-500'
                    : 'bg-orange-500'
                }`}
              >
                <Text className="text-center font-bold text-white">
                  I Consent
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}
```

**Database fields used**:
- `coach_modes.*` (read all fields)
- `user_coach_preferences.active_coach_mode` (read/write)
- `user_coach_preferences.severity` (read)
- `user_coach_consent.consent_given` (write via function)

**Functions called**:
- `validate_coach_mode(user_id, mode_key, severity)`
- `grant_coach_mode_consent(user_id, mode_key, double_confirmation)`

---

## PHASE 2: CHAT SCREEN FEEDBACK (Day 1 Afternoon - 1-2 hours)

### Step 2.1: Create Feedback Widget Component

**File**: `src/components/FeedbackWidget.tsx` (create new)

```typescript
import { useState } from 'react'
import { View, Pressable, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

interface FeedbackWidgetProps {
  feedbackId: string
  onFeedback?: (helpful: boolean) => void
}

export function FeedbackWidget({ feedbackId, onFeedback }: FeedbackWidgetProps) {
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
        setFeedback(null)
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

  if (feedback !== null) {
    return (
      <View className="flex-row items-center gap-1 py-1">
        <Text className="text-xs text-gray-500">Thanks for the feedback!</Text>
        {feedback ? (
          <Ionicons name="thumbs-up" size={14} color="#10B981" />
        ) : (
          <Ionicons name="thumbs-down" size={14} color="#EF4444" />
        )}
      </View>
    )
  }

  return (
    <View className="flex-row items-center gap-3 py-1">
      <Text className="text-xs text-gray-400">Was this helpful?</Text>

      <Pressable
        onPress={() => submitFeedback(true)}
        disabled={isSubmitting}
        className="p-1"
      >
        <Ionicons name="thumbs-up-outline" size={18} color="#6B7280" />
      </Pressable>

      <Pressable
        onPress={() => submitFeedback(false)}
        disabled={isSubmitting}
        className="p-1"
      >
        <Ionicons name="thumbs-down-outline" size={18} color="#6B7280" />
      </Pressable>
    </View>
  )
}
```

**Database fields used**:
- `coach_response_feedback.helpful` (write via function)

**Functions called**:
- `submit_coach_feedback(feedback_id, helpful)`

---

### Step 2.2: Update Chat Screen to Include Feedback Widget

**File**: `src/screens/ChatScreen.tsx` (update existing)

**What to change**:

```typescript
import { FeedbackWidget } from '@/components/FeedbackWidget'

// Update your Message type
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  feedbackId?: string  // ADD THIS
  timestamp: Date
}

// In your sendMessage function, update to:
const sendMessage = async (userMessage: string) => {
  // Add user message
  setMessages(prev => [...prev, {
    id: generateId(),
    role: 'user',
    content: userMessage,
    timestamp: new Date()
  }])

  try {
    // Call your chat Edge Function
    const response = await fetch('YOUR_EDGE_FUNCTION_URL/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        userId: user?.id,
        coachId: currentCoach,
        mode: currentMode,
        severity: currentSeverity
      })
    })

    const data = await response.json()

    // Add AI message with feedbackId
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'assistant',
      content: data.message,
      feedbackId: data.feedbackId,  // IMPORTANT: Save this
      timestamp: new Date()
    }])
  } catch (error) {
    console.error('Chat error:', error)
  }
}

// In your message rendering:
{messages.map(msg => (
  <View
    key={msg.id}
    className={`mb-4 p-3 rounded-lg max-w-[80%] ${
      msg.role === 'user' ? 'bg-blue-500 self-end' : 'bg-gray-100 self-start'
    }`}
  >
    <Text className={msg.role === 'user' ? 'text-white' : 'text-gray-900'}>
      {msg.content}
    </Text>

    {/* ADD FEEDBACK WIDGET FOR AI MESSAGES */}
    {msg.role === 'assistant' && msg.feedbackId && (
      <FeedbackWidget
        feedbackId={msg.feedbackId}
        onFeedback={(helpful) => {
          console.log(`User ${helpful ? 'liked' : 'disliked'} response`)
        }}
      />
    )}
  </View>
))}
```

**Database fields used**:
- None directly (Edge Function returns `feedbackId`)

---

## PHASE 3: EDGE FUNCTION UPDATES (Day 2 Morning - 2-3 hours)

### Step 3.1: Update Chat Edge Function

**File**: `supabase/functions/chat/index.ts` (update existing)

**What to add** (complete updated function):

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts'

serve(async (req) => {
  try {
    const {
      message,
      userId,
      coachId = 'coach_decibel_avatar',
      mode = 'default',
      severity = 3.0,
      conversationId = null
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
      return new Response(JSON.stringify({
        error: validation?.[0]?.error_message || 'Invalid mode',
        fallback_mode: 'default'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
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
    } else {
      console.log('❌ CACHE MISS - Calling OpenAI')

      // ===== STEP 3: BUILD SYSTEM PROMPT (with memory) =====
      const { data: promptData } = await supabase.rpc('build_coach_system_prompt', {
        p_user_id: userId,
        p_override_coach_id: coachId,
        p_override_severity: severity,
        p_override_mode: mode,
        p_include_memory: true  // IMPORTANT: Include memory
      })

      systemPrompt = promptData || 'You are a helpful wellness coach.'

      // ===== STEP 4: GET LATEST FINE-TUNED MODEL =====
      const { data: fineTunedModel } = await supabase.rpc('get_latest_finetuned_model', {
        p_base_model: 'gpt-4o-2024-08-06'
      })

      const modelToUse = fineTunedModel?.[0]?.model_id || 'gpt-4o'
      console.log(`🤖 Using model: ${modelToUse}`)

      // ===== STEP 5: CALL OPENAI =====
      const openai = new OpenAI({
        apiKey: Deno.env.get('OPENAI_API_KEY')
      })

      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7
      })

      responseText = completion.choices[0].message.content!
      tokensUsed = completion.usage?.total_tokens || 0

      // ===== STEP 6: CACHE RESPONSE =====
      const costCents = (tokensUsed * 6.25 / 1_000_000) * 100

      await supabase.rpc('cache_response', {
        p_query_text: message,
        p_response_text: responseText,
        p_coach_id: coachId,
        p_mode: mode,
        p_severity: severity,
        p_model_used: modelToUse,
        p_tokens_used: tokensUsed,
        p_cost_cents: costCents
      })
    }

    const responseTime = Date.now() - startTime

    // ===== STEP 7: SAVE FOR FEEDBACK =====
    const { data: feedbackIdData } = await supabase.rpc('save_coach_response_for_feedback', {
      p_user_id: userId,
      p_user_message: message,
      p_ai_response: responseText,
      p_system_prompt: systemPrompt,
      p_coach_id: coachId,
      p_coach_mode: mode,
      p_severity: severity,
      p_model_used: fromCache ? 'cached' : 'gpt-4o',
      p_conversation_id: conversationId,
      p_response_time_ms: responseTime,
      p_from_cache: fromCache,
      p_user_message_tokens: Math.ceil(message.length / 4),
      p_ai_response_tokens: Math.ceil(responseText.length / 4)
    })

    const feedbackId = feedbackIdData

    // ===== STEP 8: AUTO-CAPTURE MEMORY =====
    try {
      await supabase.rpc('auto_capture_memory_from_conversation', {
        p_user_id: userId,
        p_user_message: message,
        p_ai_response: responseText
      })
    } catch (memoryError) {
      console.error('Memory capture failed:', memoryError)
      // Don't fail the request if memory capture fails
    }

    // ===== STEP 9: RETURN RESPONSE =====
    return new Response(JSON.stringify({
      message: responseText,
      cached: fromCache,
      mode: mode,
      tokensUsed: tokensUsed,
      feedbackId: feedbackId  // IMPORTANT: Return this to frontend
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Chat error:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

**Database fields used**:
- All via functions (no direct table access)

**Functions called**:
- `validate_coach_mode()`
- `get_cached_response()`
- `build_coach_system_prompt()`
- `get_latest_finetuned_model()`
- `cache_response()`
- `save_coach_response_for_feedback()`
- `auto_capture_memory_from_conversation()`

---

## PHASE 4: OPTIONAL MEMORY SCREEN (Day 2 Afternoon - 2 hours)

### Step 4.1: Create User Memories Screen

**File**: `src/screens/UserMemoriesScreen.tsx` (create new, optional)

```typescript
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Memory {
  memory_id: string
  memory_text: string
  memory_category: string
  importance_score: number
  created_at: string
  access_count: number
  days_ago: number
}

export default function UserMemoriesScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  const [memories, setMemories] = useState<Memory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadMemories()
  }, [selectedCategory])

  const loadMemories = async () => {
    const { data, error } = await supabase.rpc('get_relevant_memories', {
      p_user_id: user?.id,
      p_category: selectedCategory,
      p_min_importance: 0.0,
      p_limit: 50
    })

    if (!error && data) {
      setMemories(data)
    }
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      goal: '🎯',
      achievement: '🏆',
      preference: '❤️',
      pattern: '🔄',
      milestone: '📍',
      insight: '💡',
      general: '📝'
    }
    return icons[category] || '📝'
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      goal: 'bg-blue-100 border-blue-300',
      achievement: 'bg-green-100 border-green-300',
      preference: 'bg-pink-100 border-pink-300',
      pattern: 'bg-purple-100 border-purple-300',
      milestone: 'bg-yellow-100 border-yellow-300',
      insight: 'bg-orange-100 border-orange-300',
      general: 'bg-gray-100 border-gray-300'
    }
    return colors[category] || 'bg-gray-100 border-gray-300'
  }

  const categories = ['goal', 'achievement', 'preference', 'pattern', 'milestone', 'insight']

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-2xl font-bold mb-2">Your Memory</Text>
        <Text className="text-gray-600 mb-4">
          What your coach remembers about you
        </Text>

        {/* Category Filter */}
        <ScrollView horizontal className="mb-4" showsHorizontalScrollIndicator={false}>
          <Pressable
            onPress={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full mr-2 ${
              selectedCategory === null ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          >
            <Text className={selectedCategory === null ? 'text-white' : 'text-gray-700'}>
              All
            </Text>
          </Pressable>

          {categories.map(cat => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full mr-2 ${
                selectedCategory === cat ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            >
              <Text className={selectedCategory === cat ? 'text-white' : 'text-gray-700'}>
                {getCategoryIcon(cat)} {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Memories */}
        {memories.map((memory) => (
          <View
            key={memory.memory_id}
            className={`p-4 rounded-lg mb-3 border-2 ${getCategoryColor(memory.memory_category)}`}
          >
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl mr-2">
                {getCategoryIcon(memory.memory_category)}
              </Text>
              <View className="flex-1">
                <Text className="text-xs text-gray-500">
                  {memory.memory_category.toUpperCase()} • {memory.days_ago} days ago
                </Text>
              </View>
              <View className="flex-row items-center">
                {'⭐'.repeat(Math.ceil(memory.importance_score * 5))}
              </View>
            </View>

            <Text className="text-base text-gray-900 mb-2">
              {memory.memory_text}
            </Text>

            <Text className="text-xs text-gray-400">
              Referenced {memory.access_count} times
            </Text>
          </View>
        ))}

        {memories.length === 0 && (
          <View className="items-center py-8">
            <Text className="text-gray-400 text-center">
              No memories yet. Start chatting with your coach to build your memory!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}
```

**Database fields used**:
- `ai_episodic_memory.*` (read via function)

**Functions called**:
- `get_relevant_memories(user_id, category, min_importance, limit)`

---

## 🎯 IMPLEMENTATION CHECKLIST

### Phase 1: Settings (Day 1 Morning) ✅
- [ ] Create `CoachSettingsScreen.tsx` with severity slider
- [ ] Add `@react-native-community/slider` package (if not installed)
- [ ] Test severity updates save to database
- [ ] Create `CoachModesScreen.tsx` with mode selection
- [ ] Test consent modal flow
- [ ] Test mode activation

### Phase 2: Chat Feedback (Day 1 Afternoon) ✅
- [ ] Create `FeedbackWidget.tsx` component
- [ ] Update `ChatScreen.tsx` to include feedback widget
- [ ] Test thumbs up/down submission
- [ ] Verify feedback saves to database

### Phase 3: Edge Function (Day 2 Morning) ✅
- [ ] Update `/chat` Edge Function with complete flow
- [ ] Deploy Edge Function to Supabase
- [ ] Test cache hit/miss
- [ ] Test memory capture
- [ ] Test feedback ID return
- [ ] Verify all 8 steps execute correctly

### Phase 4: Memory Screen (Day 2 Afternoon - Optional) ✅
- [ ] Create `UserMemoriesScreen.tsx`
- [ ] Add navigation route
- [ ] Test memory retrieval
- [ ] Test category filtering

---

## 🧪 TESTING INSTRUCTIONS

### Test 1: Severity Slider
1. Open Settings screen
2. Move slider from 1.0 to 6.0
3. Verify label changes (Ultra Gentle → Savage)
4. Close app and reopen
5. Verify severity persists

**Expected**: Severity saves and persists

---

### Test 2: Mode Consent Flow
1. Open Coach Modes screen
2. Tap "Roast Mode"
3. Verify consent modal appears with warning
4. Click "I Consent"
5. Verify mode activates
6. Send a chat message
7. Verify roast tone in response

**Expected**: Mode requires consent, activates after consent

---

### Test 3: Savage Mode Double Confirmation
1. Open Coach Modes screen
2. Tap "Savage Mode"
3. Verify consent modal appears
4. Try clicking "I Consent" without checkbox
5. Verify button disabled or shows error
6. Check the confirmation checkbox
7. Click "I Consent"
8. Verify mode activates

**Expected**: Cannot activate without double confirmation

---

### Test 4: Feedback Widget
1. Send a chat message
2. Verify thumbs up/down buttons appear
3. Click thumbs up
4. Verify "Thanks for feedback!" message
5. Send another message
6. Click thumbs down
7. Verify feedback saves

**Expected**: Feedback submits successfully

---

### Test 5: Cache Working
1. Send message: "What should I eat for breakfast?"
2. Note response time (~2-5 seconds)
3. Send exact same message again
4. Note response time (should be <1 second)
5. Verify response is identical

**Expected**: Second request instant (cached)

---

### Test 6: Memory Auto-Capture
1. Send message: "My goal is to lose 20 pounds by summer"
2. Wait a few seconds
3. Open Memory screen (if implemented)
4. Verify goal captured as memory
5. Send next message
6. Verify AI references your goal

**Expected**: Memory captured and used in next response

---

## ⚠️ COMMON ISSUES & FIXES

### Issue 1: "Function not found" Error

**Problem**: `supabase.rpc('function_name')` fails

**Fix**:
1. Verify migrations ran: Check Supabase Dashboard → Database → Functions
2. Check function name spelling (case-sensitive)
3. Try: `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';`

---

### Issue 2: Feedback ID is NULL

**Problem**: `data.feedbackId` is undefined

**Fix**:
1. Check Edge Function returns feedbackId
2. Verify `save_coach_response_for_feedback()` returns UUID
3. Check Edge Function logs for errors

---

### Issue 3: Consent Modal Doesn't Appear

**Problem**: Mode activates without consent

**Fix**:
1. Check `requires_opt_in` is TRUE in `coach_modes` table
2. Verify `validate_coach_mode()` returns `requires_consent: true`
3. Check modal visibility state logic

---

### Issue 4: Severity Slider Not Saving

**Problem**: Slider moves but doesn't persist

**Fix**:
1. Verify `onSlidingComplete` (not `onValueChange`) is used
2. Check user ID is correct
3. Verify `update_user_severity()` function exists
4. Check for error logs

---

## 📊 SUCCESS CRITERIA

Your implementation is complete when:

✅ Severity slider works and persists
✅ Mode selection works with consent flow
✅ Feedback widget appears on all AI messages
✅ Thumbs up/down saves to database
✅ Edge Function calls all 8 steps
✅ Cache works (second identical query is instant)
✅ Memory auto-captures goals/preferences
✅ AI references past conversations

---

## 🎉 YOU'RE DONE!

Once all phases are complete, your users will have:

1. **Personalized coaching** (severity + modes)
2. **Safety consent** (for intense modes)
3. **Feedback collection** (thumbs up/down)
4. **Intelligent caching** (50-70% cost savings)
5. **Long-term memory** (context across sessions)
6. **Self-improving AI** (gets better monthly)

**Total implementation time**: 1-2 days
**Result**: Production-ready RLHF + Memory system

🚀 **Deploy and watch your AI get better every day!**

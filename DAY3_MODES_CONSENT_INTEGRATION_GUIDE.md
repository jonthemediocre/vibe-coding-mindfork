# 📘 Day 3: Coach Modes + Consent Integration Guide

**Date**: 2025-11-06
**Status**: ✅ Backend Complete - Ready for Integration
**Impact**: Personalized coaching styles with safety guardrails

---

## 🎯 What Was Built (Supabase Backend)

✅ `coach_modes` table - 3 modes: Default, Roast, Savage
✅ `user_coach_consent` table - Consent tracking with expiration
✅ `validate_coach_mode()` function - Safety checks before mode activation
✅ `grant_coach_mode_consent()` function - User opt-in flow
✅ `revoke_coach_mode_consent()` function - User opt-out flow
✅ Enhanced `build_coach_system_prompt()` - Now includes mode modifiers
✅ `active_coach_mode` column added to `user_coach_preferences`

**Migration File**: `supabase/migrations/20251106_coach_modes_consent_system.sql`

---

## 🎭 The 3 Coach Modes

| Mode | Severity Range | Requires Consent | Description |
|------|---------------|------------------|-------------|
| **Default** | 1.0 - 4.0 | ❌ No | Standard wellness coaching. Safe for all users. |
| **Roast** | 3.0 - 5.0 | ✅ Yes | Tough-love coaching with sarcasm and direct confrontation. |
| **Savage** | 4.0 - 6.0 | ✅✅ Yes (Double) | Maximum intensity with ruthless honesty and biting sarcasm. |

### Mode Examples

**Default Mode (Severity 3.0)**
> "Hey, I noticed you skipped the gym today. Want to talk about what got in the way? Let's plan for tomorrow!"

**Roast Mode (Severity 4.0)**
> "Oh, another late-night snack? Your willpower called, it wants a refund. Let's try something with actual nutritional value."

**Savage Mode (Severity 5.5)**
> "Skipping the gym for the third time this week? Your muscles are filing a missing persons report. Your metabolism is ghosting you. Pizza at 2am isn't a meal plan, it's a suicide note written in carbs."

---

## 🔧 How to Integrate (Vibe AI Changes)

### Step 1: Add Mode Toggle to Settings Screen

**File**: `src/screens/CoachSettingsScreen.tsx`

```typescript
import { useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface CoachMode {
  mode_key: string
  mode_name: string
  description: string
  min_severity: number
  max_severity: number
  default_severity: number
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

export default function CoachSettingsScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  // State
  const [modes, setModes] = useState<CoachMode[]>([])
  const [currentMode, setCurrentMode] = useState<string>('default')
  const [severity, setSeverity] = useState<number>(3.0)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [pendingMode, setPendingMode] = useState<CoachMode | null>(null)

  // Load available modes
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
      setSeverity(data.severity || 3.0)
    }
  }

  const handleModeSelect = async (mode: CoachMode) => {
    // Validate mode access
    const { data: validation } = await supabase
      .rpc('validate_coach_mode', {
        p_user_id: user?.id,
        p_mode_key: mode.mode_key,
        p_severity: severity
      })

    const result = validation?.[0] as ModeValidation

    // Mode is valid, activate it
    if (result?.is_valid) {
      await activateMode(mode.mode_key)
      return
    }

    // Mode requires consent
    if (result?.requires_consent && !result?.has_consent) {
      setPendingMode(mode)
      setShowConsentModal(true)
      return
    }

    // Consent expired
    if (result?.consent_expired) {
      setPendingMode(mode)
      setShowConsentModal(true)
      return
    }

    // Severity out of bounds
    if (result?.error_message?.includes('outside allowed range')) {
      alert(`Please adjust your intensity to ${mode.min_severity}-${mode.max_severity} for ${mode.mode_name}`)
      return
    }

    // Other error
    alert(result?.error_message || 'Cannot activate this mode')
  }

  const activateMode = async (modeKey: string) => {
    const { error } = await supabase
      .from('user_coach_preferences')
      .update({ active_coach_mode: modeKey })
      .eq('user_id', user?.id)

    if (!error) {
      setCurrentMode(modeKey)
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
        {modes.map((mode) => (
          <ModeCard
            key={mode.mode_key}
            mode={mode}
            isActive={currentMode === mode.mode_key}
            onSelect={() => handleModeSelect(mode)}
          />
        ))}
      </View>

      {/* Consent Modal */}
      {showConsentModal && pendingMode && (
        <ConsentModal
          mode={pendingMode}
          onConsent={async (doubleConfirmed) => {
            const { data } = await supabase.rpc('grant_coach_mode_consent', {
              p_user_id: user?.id,
              p_mode_key: pendingMode.mode_key,
              p_double_confirmation: doubleConfirmed,
              p_auto_renew: false
            })

            if (data?.[0]?.success) {
              await activateMode(pendingMode.mode_key)
            }

            setShowConsentModal(false)
            setPendingMode(null)
          }}
          onCancel={() => {
            setShowConsentModal(false)
            setPendingMode(null)
          }}
        />
      )}
    </ScrollView>
  )
}

// ===== MODE CARD COMPONENT =====

interface ModeCardProps {
  mode: CoachMode
  isActive: boolean
  onSelect: () => void
}

function ModeCard({ mode, isActive, onSelect }: ModeCardProps) {
  const getBorderColor = () => {
    if (mode.mode_key === 'default') return 'border-blue-500'
    if (mode.mode_key === 'roast') return 'border-orange-500'
    if (mode.mode_key === 'savage') return 'border-red-500'
    return 'border-gray-300'
  }

  const getIcon = () => {
    if (mode.mode_key === 'default') return '💬'
    if (mode.mode_key === 'roast') return '🔥'
    if (mode.mode_key === 'savage') return '💀'
    return '🤖'
  }

  return (
    <Pressable
      onPress={onSelect}
      className={`border-2 rounded-lg p-4 mb-4 ${getBorderColor()} ${
        isActive ? 'bg-blue-50' : 'bg-white'
      }`}
    >
      <View className="flex-row items-center mb-2">
        <Text className="text-3xl mr-3">{getIcon()}</Text>
        <View className="flex-1">
          <Text className="text-lg font-bold">
            {mode.mode_name}
          </Text>
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
}

// ===== CONSENT MODAL COMPONENT =====

interface ConsentModalProps {
  mode: CoachMode
  onConsent: (doubleConfirmed: boolean) => void
  onCancel: () => void
}

function ConsentModal({ mode, onConsent, onCancel }: ConsentModalProps) {
  const [doubleConfirmed, setDoubleConfirmed] = useState(false)

  return (
    <View className="absolute inset-0 bg-black/50 justify-center items-center px-6">
      <View className="bg-white rounded-2xl p-6 w-full max-w-md">
        {/* Warning Icon */}
        <View className="items-center mb-4">
          <Text className="text-6xl">
            {mode.mode_key === 'savage' ? '💀' : '🔥'}
          </Text>
        </View>

        {/* Title */}
        <Text className="text-2xl font-bold text-center mb-2">
          {mode.mode_name}
        </Text>

        {/* Content Warning */}
        {mode.content_warning && (
          <View className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-4">
            <Text className="text-sm text-orange-800">
              {mode.content_warning}
            </Text>
          </View>
        )}

        {/* Example */}
        {mode.example_language && (
          <View className="bg-gray-100 p-4 rounded-lg mb-4">
            <Text className="text-xs font-bold text-gray-600 mb-2">
              EXAMPLE RESPONSE:
            </Text>
            <Text className="text-sm italic text-gray-700">
              {mode.example_language}
            </Text>
          </View>
        )}

        {/* Double Confirmation Checkbox (Savage mode only) */}
        {mode.requires_double_confirmation && (
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

        {/* Consent Duration Info */}
        <Text className="text-xs text-gray-500 text-center mb-4">
          Your consent will expire in 30 days. You can revoke it anytime in settings.
        </Text>

        {/* Actions */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={onCancel}
            className="flex-1 bg-gray-200 py-3 rounded-lg"
          >
            <Text className="text-center font-bold text-gray-700">
              Cancel
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onConsent(doubleConfirmed)}
            disabled={mode.requires_double_confirmation && !doubleConfirmed}
            className={`flex-1 py-3 rounded-lg ${
              mode.requires_double_confirmation && !doubleConfirmed
                ? 'bg-gray-300'
                : mode.mode_key === 'savage'
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
  )
}
```

---

### Step 2: Update Edge Function to Use Modes

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
    mode = 'default',  // NEW: Accept mode from frontend
    severity = 3.0
  } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ===== STEP 0: VALIDATE MODE ACCESS =====
  const { data: validation } = await supabase.rpc('validate_coach_mode', {
    p_user_id: userId,
    p_mode_key: mode,
    p_severity: severity
  })

  if (!validation?.[0]?.is_valid) {
    return new Response(
      JSON.stringify({
        error: validation?.[0]?.error_message || 'Invalid mode',
        fallback_mode: 'default'
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // ===== STEP 1: CHECK CACHE =====
  const { data: cacheResult } = await supabase.rpc('get_cached_response', {
    p_query_text: message,
    p_coach_id: coachId,
    p_mode: mode,  // Include mode in cache key
    p_severity: severity
  })

  if (cacheResult?.[0]?.cache_hit) {
    console.log('✅ CACHE HIT')
    return new Response(
      JSON.stringify({
        message: cacheResult[0].response_text,
        cached: true,
        mode: mode
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  console.log('❌ CACHE MISS - Calling OpenAI')

  // ===== STEP 2: BUILD SYSTEM PROMPT (with mode support) =====
  const { data: systemPromptData } = await supabase.rpc('build_coach_system_prompt', {
    p_user_id: userId,
    p_override_coach_id: coachId,
    p_override_severity: severity,
    p_override_mode: mode  // NEW: Pass mode to prompt builder
  })

  const systemPrompt = systemPromptData || 'You are a helpful wellness coach.'

  // ===== STEP 3: CALL OPENAI =====
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

  const responseText = completion.choices[0].message.content!
  const tokensUsed = completion.usage?.total_tokens || 0

  // ===== STEP 4: CACHE RESPONSE =====
  const costCents = calculateCost(tokensUsed, 'gpt-4o')

  await supabase.rpc('cache_response', {
    p_query_text: message,
    p_response_text: responseText,
    p_coach_id: coachId,
    p_mode: mode,  // Include mode in cache
    p_severity: severity,
    p_model_used: 'gpt-4o',
    p_tokens_used: tokensUsed,
    p_cost_cents: costCents
  })

  return new Response(
    JSON.stringify({
      message: responseText,
      cached: false,
      mode: mode,
      tokensUsed: tokensUsed
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

function calculateCost(tokens: number, model: string): number {
  const costPerToken = 6.25 / 1_000_000
  return tokens * costPerToken * 100
}
```

---

### Step 3: Add Mode Indicator to Chat UI

**File**: `src/screens/ChatScreen.tsx`

```typescript
// At the top of chat screen
{currentMode !== 'default' && (
  <View className="bg-orange-100 px-4 py-2 border-b border-orange-200">
    <Text className="text-xs text-orange-800 text-center font-bold">
      {currentMode === 'roast' ? '🔥 ROAST MODE ACTIVE' : '💀 SAVAGE MODE ACTIVE'}
    </Text>
  </View>
)}
```

---

## 🧹 Consent Management

### Check User's Current Consents

```typescript
const { data: consents } = await supabase
  .from('user_coach_consent')
  .select(`
    mode_key,
    consent_given,
    expires_at,
    coach_modes(mode_name)
  `)
  .eq('user_id', user?.id)
  .eq('consent_given', true)
  .is('revoked_at', null)

// Show active consents with expiration dates
consents?.forEach(consent => {
  console.log(`${consent.coach_modes.mode_name}: Expires ${consent.expires_at}`)
})
```

### Revoke Consent (User Wants to Downgrade)

```typescript
const revokeMode = async (modeKey: string) => {
  const { data } = await supabase.rpc('revoke_coach_mode_consent', {
    p_user_id: user?.id,
    p_mode_key: modeKey,
    p_reason: 'User requested downgrade'
  })

  if (data) {
    alert('Mode consent revoked. Switched back to Default mode.')
    loadUserPreferences()  // Reload preferences
  }
}
```

### Check Expired Consents (Automated Cleanup)

```sql
-- Run this daily via cron job in Supabase Dashboard
SELECT cron.schedule(
  'cleanup-expired-consents',
  '0 2 * * *',  -- 2 AM daily
  $$
  UPDATE user_coach_preferences
  SET active_coach_mode = 'default'
  WHERE user_id IN (
    SELECT user_id
    FROM user_coach_consent
    WHERE consent_given = TRUE
      AND expires_at < NOW()
      AND revoked_at IS NULL
  );

  UPDATE user_coach_consent
  SET consent_given = FALSE,
      revoked_at = NOW(),
      revoked_reason = 'Expired (30 days)'
  WHERE consent_given = TRUE
    AND expires_at < NOW()
    AND revoked_at IS NULL;
  $$
);
```

---

## 📊 Testing Queries

### Test 1: Check Available Modes

```sql
SELECT
  mode_key,
  mode_name,
  min_severity,
  max_severity,
  requires_opt_in,
  requires_double_confirmation
FROM coach_modes
WHERE is_active = TRUE
ORDER BY display_order;
```

**Expected Result**:
```
mode_key  | mode_name | min_severity | max_severity | requires_opt_in | requires_double_confirmation
----------|-----------|--------------|--------------|-----------------|-----------------------------
default   | Default   | 1.0          | 4.0          | false           | false
roast     | Roast     | 3.0          | 5.0          | true            | false
savage    | Savage    | 4.0          | 6.0          | true            | true
```

### Test 2: Validate Mode Without Consent (Should Fail)

```sql
SELECT * FROM validate_coach_mode(
  '00000000-0000-0000-0000-000000000001',  -- test user
  'roast',
  4.0
);
```

**Expected Result**:
```
is_valid | error_message                     | requires_consent | has_consent | consent_expired
---------|-----------------------------------|------------------|-------------|----------------
false    | Roast Mode mode requires opt-in consent | true             | false       | false
```

### Test 3: Grant Consent

```sql
SELECT * FROM grant_coach_mode_consent(
  '00000000-0000-0000-0000-000000000001',  -- test user
  'roast',
  false,  -- double_confirmation not needed for roast
  false   -- no auto-renew
);
```

**Expected Result**:
```
success | message                    | expires_at
--------|----------------------------|-------------------------
true    | Consent granted for Roast Mode | 2025-12-06 12:00:00+00
```

### Test 4: Validate Mode After Consent (Should Work)

```sql
SELECT * FROM validate_coach_mode(
  '00000000-0000-0000-0000-000000000001',
  'roast',
  4.0
);
```

**Expected Result**:
```
is_valid | error_message | requires_consent | has_consent | consent_expired
---------|---------------|------------------|-------------|----------------
true     | NULL          | true             | true        | false
```

### Test 5: Build Prompt with Savage Mode

```sql
-- First grant savage consent with double confirmation
SELECT * FROM grant_coach_mode_consent(
  '00000000-0000-0000-0000-000000000001',
  'savage',
  true,  -- double_confirmation = true
  false
);

-- Then build prompt
SELECT build_coach_system_prompt(
  '00000000-0000-0000-0000-000000000001',
  'coach_synapse_avatar',  -- Roast coach
  5.5,  -- High severity
  'savage'
);
```

**Expected Result**: System prompt should include:
- `INTENSITY: SAVAGE MODE (Level 6)`
- `MODE: SAVAGE MODE (User Double-Confirmed)`
- Dark humor examples
- Ruthless honesty instructions

---

## 🚀 Expected User Flow

### Flow 1: User Tries Roast Mode

1. User opens Settings → Coach Modes
2. User sees 3 mode cards: Default ✅, Roast, Savage
3. User taps "Roast Mode"
4. **Consent modal appears** with:
   - ⚠️ Content warning
   - Example language
   - "I Consent" button
5. User reads warning and clicks "I Consent"
6. Backend calls `grant_coach_mode_consent()`
7. Mode activates, chat shows "🔥 ROAST MODE ACTIVE"
8. User's next message gets roasted! 🔥

### Flow 2: User Tries Savage Mode

1. User taps "Savage Mode"
2. **Consent modal appears** with:
   - 🔥 Extreme content warning
   - Example savage language
   - **Double confirmation checkbox** ✅ Required
   - "I Consent" button (disabled until checkbox)
3. User checks "I understand this mode uses extreme language"
4. "I Consent" button enables
5. User clicks consent
6. Backend calls `grant_coach_mode_consent(double_confirmation: true)`
7. Mode activates, chat shows "💀 SAVAGE MODE ACTIVE"
8. User gets brutally roasted! 💀

### Flow 3: Consent Expires After 30 Days

1. 30 days pass since consent granted
2. Daily cron job runs at 2 AM
3. User's consent marked as expired
4. User automatically downgraded to Default mode
5. Next time user opens app:
   - Mode shows "Default" again
   - If they try Roast/Savage, consent modal appears again

---

## ✅ Day 3 Complete Checklist

- [x] coach_modes table created with 3 modes
- [x] user_coach_consent table with expiration tracking
- [x] validate_coach_mode() function working
- [x] grant_coach_mode_consent() function working
- [x] revoke_coach_mode_consent() function working
- [x] build_coach_system_prompt() enhanced with mode support
- [ ] **TODO**: Add mode toggle to settings screen
- [ ] **TODO**: Create consent modal with warnings
- [ ] **TODO**: Update chat Edge Function to validate mode
- [ ] **TODO**: Add mode indicator to chat UI
- [ ] **TODO**: Set up daily consent expiration cron job

---

## 🔜 Coming Next

**Day 4**: Feedback Capture System
- Thumbs up/down on chat responses
- `coach_response_feedback` table
- Feedback UI widget

**Day 5**: RLHF Training Pipeline
- Auto-generate training examples from feedback
- Daily cron job to process feedback
- Training dataset preparation

**Day 6**: Episodic Memory System
- Long-term user context storage
- Goal tracking, achievements, preferences
- Memory integration in prompts

**Day 7**: Fine-Tuning Export Pipeline
- Export training data to OpenAI format
- Monthly fine-tuning job creation
- Model performance tracking

---

## 💡 Pro Tips

1. **Always validate mode before chat**: Use `validate_coach_mode()` in Edge Function
2. **Cache by mode**: Include mode in cache key for accurate caching
3. **Enforce double confirmation**: Savage mode MUST have double confirmation checkbox
4. **Show clear warnings**: Content warnings prevent user complaints
5. **Auto-expire consent**: 30-day expiration is safety feature, not bug
6. **Allow easy revocation**: Users should be able to downgrade anytime

---

**Status**: ✅ Day 3 Backend Complete
**Ready For**: Vibe AI integration (mode toggle + consent modal)
**Expected Impact**: Personalized coaching styles with legal/ethical safeguards

🎉 **Coach modes are ready! Time to let users choose their intensity!**

# Vibe AI Essential Implementation Guide
**RLHF + Memory System - Zero Fluff Edition**

## Database Functions (Supabase RPC)

```typescript
// 1. Cache Check/Store
supabase.rpc('get_cached_response', {
  p_user_id: string,
  p_query_hash: string // MD5(severity + mode + message)
})
supabase.rpc('cache_response', {
  p_user_id, p_query_hash, p_response_text, p_tokens_used
})

// 2. System Prompt Builder
supabase.rpc('build_coach_system_prompt', {
  p_user_id: string
}) // Returns: base_prompt + intensity_modifier + memory_context

// 3. Mode Validation
supabase.rpc('validate_coach_mode', {
  p_user_id, p_mode_name: 'default'|'roast'|'savage'
}) // Returns: allowed BOOLEAN, severity DECIMAL

// 4. Feedback Storage
supabase.rpc('save_coach_response_for_feedback', {
  p_user_id, p_user_message, p_coach_response, p_severity, p_mode_name
}) // Returns: response_id
supabase.rpc('submit_coach_feedback', {
  p_response_id: UUID, p_helpful: boolean, p_rating: 1-5
})

// 5. Memory Operations
supabase.rpc('save_episodic_memory', {
  p_user_id, p_content, p_category: 'goal'|'achievement'|'preference'|'pattern'|'milestone'|'insight'|'general',
  p_importance: 0.0-1.0
})
supabase.rpc('get_relevant_memories', {
  p_user_id, p_limit: 5
}) // Returns: Array<{content, category, importance, created_at}>

// 6. Preference Management
supabase.rpc('update_severity_preference', {
  p_user_id, p_severity: 1.0-6.0
})
supabase.rpc('grant_coach_mode_consent', {
  p_user_id, p_mode_name: 'roast'|'savage'
}) // Auto-expires in 30 days
```

## Core Tables Schema

```sql
user_coach_preferences: { user_id PK, severity DECIMAL(2,1), active_mode_name, updated_at }
coach_modes: { mode_name PK, severity_min, severity_max, requires_consent BOOLEAN }
user_coach_consent: { user_id, mode_name, granted_at, expires_at }
ai_response_cache: { query_hash PK, user_id, response_text, tokens_used, created_at }
coach_response_feedback: { response_id PK, user_id, user_message, coach_response, helpful BOOLEAN, rating INT, severity, mode_name }
ai_episodic_memory: { memory_id PK, user_id, content TEXT, category, importance_score, created_at }
```

## Implementation Flow

### Phase 1: Chat Message Handler
```typescript
async function sendCoachMessage(userId: string, message: string) {
  // 1. Validate mode
  const { allowed, severity } = await supabase.rpc('validate_coach_mode', {
    p_user_id: userId, p_mode_name: currentMode
  })
  if (!allowed) throw new Error('Mode requires consent')

  // 2. Check cache
  const queryHash = md5(`${severity}:${currentMode}:${message}`)
  const cached = await supabase.rpc('get_cached_response', {
    p_user_id: userId, p_query_hash: queryHash
  })
  if (cached) return cached.response_text

  // 3. Build system prompt (includes memory)
  const { base_prompt, intensity_modifier, memory_context } =
    await supabase.rpc('build_coach_system_prompt', { p_user_id: userId })
  const systemPrompt = `${base_prompt}\n\n${intensity_modifier}\n\n${memory_context}`

  // 4. Call OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ]
  })
  const coachResponse = response.choices[0].message.content

  // 5. Store for feedback + cache
  const { response_id } = await supabase.rpc('save_coach_response_for_feedback', {
    p_user_id: userId, p_user_message: message, p_coach_response: coachResponse,
    p_severity: severity, p_mode_name: currentMode
  })
  await supabase.rpc('cache_response', {
    p_user_id: userId, p_query_hash: queryHash,
    p_response_text: coachResponse, p_tokens_used: response.usage.total_tokens
  })

  return { coachResponse, response_id }
}
```

### Phase 2: Feedback UI
```typescript
// After message display, show thumbs up/down
<View className="flex-row gap-2">
  <Pressable onPress={() => submitFeedback(true, 5)}>
    <Ionicons name="thumbs-up-outline" size={20} />
  </Pressable>
  <Pressable onPress={() => submitFeedback(false, 1)}>
    <Ionicons name="thumbs-down-outline" size={20} />
  </Pressable>
</View>

async function submitFeedback(helpful: boolean, rating: number) {
  await supabase.rpc('submit_coach_feedback', {
    p_response_id: currentResponseId,
    p_helpful: helpful,
    p_rating: rating
  })
}
```

### Phase 3: Settings Screen
```typescript
// Severity Slider (1.0 - 6.0)
<Slider
  value={severity}
  onValueChange={async (val) => {
    await supabase.rpc('update_severity_preference', {
      p_user_id: userId, p_severity: val
    })
  }}
  minimumValue={1.0} maximumValue={6.0} step={0.1}
/>

// Mode Selector (Default/Roast/Savage)
<Pressable onPress={async () => {
  if (mode === 'savage') {
    Alert.alert('Confirm', 'Savage mode: No filter. Proceed?', [
      { text: 'Yes', onPress: async () => {
        await supabase.rpc('grant_coach_mode_consent', {
          p_user_id: userId, p_mode_name: 'savage'
        })
      }}
    ])
  } else if (mode === 'roast') {
    await supabase.rpc('grant_coach_mode_consent', {
      p_user_id: userId, p_mode_name: 'roast'
    })
  }
}}>
  <Text>{mode}</Text>
</Pressable>
```

### Phase 4: Memory Capture (Background)
```typescript
// Trigger after significant events
async function captureMemory(userId: string, content: string, category: string) {
  await supabase.rpc('save_episodic_memory', {
    p_user_id: userId,
    p_content: content,
    p_category: category, // 'goal' | 'achievement' | 'preference' | 'pattern' | 'milestone' | 'insight' | 'general'
    p_importance: 0.8 // High importance for user-stated goals
  })
}

// Example: After goal-setting conversation
if (messageContainsGoal(message)) {
  await captureMemory(userId, message, 'goal')
}
```

## Testing Checklist

- [ ] **Cache Hit**: Send same message twice → 2nd response instant (<100ms)
- [ ] **Severity Changes**: severity=1.5 → gentle, severity=5.5 → savage
- [ ] **Mode Consent**: Switch to Savage → consent modal → grant → allowed
- [ ] **Feedback Storage**: Thumbs up → verify in `coach_response_feedback` table
- [ ] **Memory Retrieval**: Save memory → next chat → system prompt includes memory_context
- [ ] **Token Savings**: Check `ai_response_cache.tokens_used` → should see 50-70% reduction over time

## Critical Constants

```typescript
const SEVERITY_LEVELS = {
  ULTRA_GENTLE: 1.0-1.5,
  SUPPORTIVE: 1.6-2.5,
  BALANCED: 2.6-3.5, // Default
  DIRECT: 3.6-4.5,
  INTENSE: 4.6-5.5,
  SAVAGE: 5.6-6.0
}

const MEMORY_CATEGORIES = ['goal', 'achievement', 'preference', 'pattern', 'milestone', 'insight', 'general']

const CONSENT_EXPIRY_DAYS = 30
```

## Automated Backend Processes (Already Running)

- **Daily 1 AM**: Training dataset generation from feedback
- **Weekly**: Fine-tuning job creation (if 500+ examples)
- **Hourly**: Cache cleanup (remove >7 day old entries)
- **On conversation**: Auto memory capture from keywords

## Fine-Tuning (OpenAI API - Backend Only)

```typescript
// Export training data (already automated via cron)
const { data } = await supabase.rpc('export_training_dataset_openai_jsonl', {
  p_min_examples: 100
})

// Create fine-tuning job (automated via should_create_finetuning_job)
const job = await openai.fineTuning.jobs.create({
  training_file: uploadedFileId,
  model: 'gpt-4o-2024-08-06',
  suffix: 'mindfork-coach'
})

// Use fine-tuned model
const response = await openai.chat.completions.create({
  model: 'ft:gpt-4o-2024-08-06:mindfork-coach:abc123', // Updated in build_coach_system_prompt
  messages: [...]
})
```

## ROI Summary

- **Response Caching**: 50-70% token savings (cost reduction)
- **RLHF Pipeline**: Self-improving model (quality increase over time)
- **Episodic Memory**: Personalized responses (engagement increase)
- **Severity System**: User control (retention increase)

## Implementation Priority

1. **Week 1**: Chat handler + cache + system prompt (Phase 1)
2. **Week 2**: Feedback UI (Phase 2)
3. **Week 3**: Settings screen (Phase 3)
4. **Week 4**: Memory capture + testing (Phase 4)

## Key Files Reference

- **Migrations**: `/supabase/migrations/2025110*_*.sql` (7 files, already deployed)
- **Integration Guide**: `DAY7_FINETUNING_INTEGRATION_GUIDE.md` (OpenAI fine-tuning setup)
- **Testing Guide**: `DAY8_9_TESTING_GUIDE.md` (Complete test scenarios)

---

**ZERO TOLERANCE FOR**:
- Hardcoded severity values (always fetch from user_coach_preferences)
- Bypassing consent checks (validate_coach_mode required for roast/savage)
- Ignoring cache (50-70% cost savings at stake)
- Missing feedback capture (RLHF pipeline breaks without data)

**END OF ESSENTIAL GUIDE**

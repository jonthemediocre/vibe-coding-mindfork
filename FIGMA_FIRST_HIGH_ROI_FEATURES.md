# 🚀 High-ROI Features from Figma First Project

**Date**: 2025-11-04
**Source**: `/home/jonbrookings/vibe_coding_projects/mindfork_figma_first/supabase`
**Criteria**: No degradation, high ROI, minimal interface impact

---

## 🎯 Executive Summary

**Figma First project has 5 KILLER features** we should adopt:

1. **✅ HIGHEST ROI**: Severity/Intensity System (1-6 scale)
2. **✅ HIGH ROI**: Coach Modes (Default, Roast, Savage) with consent
3. **✅ MEDIUM ROI**: Multi-Channel Delivery (SMS, Push, Call)
4. **✅ MEDIUM ROI**: Micro-Lessons System
5. **✅ LOW ROI**: Predictive Nudges (requires more ML infra)

**Recommendation**: Adopt features #1 and #2 immediately - they're **pure Supabase additions** with massive UX value.

---

## 📊 Feature Comparison Matrix

| Feature | Current Project | Figma First | ROI | Interface Impact | Recommendation |
|---------|----------------|-------------|-----|------------------|----------------|
| **Coach Personas** | ✅ 4 coaches (Decibel, Synapse, Veloura, Verdant) | ✅ 5 coaches (Nora, Blaze, Kai, Sato, Maya) | LOW | None | Keep ours (already branded) |
| **Severity/Intensity** | ❌ None | ✅ 1.0-6.0 scale | **🔥 HIGHEST** | Slider component | **ADOPT** |
| **Coach Modes** | ❌ None | ✅ Default/Roast/Savage | **🔥 HIGHEST** | Toggle component | **ADOPT** |
| **Consent Management** | ❌ None | ✅ Opt-in + Double opt-in | HIGH | Modal/checkbox | **ADOPT** |
| **Multi-Channel** | ❌ In-app only | ✅ SMS, Push, Call | MEDIUM | Settings screen | Consider |
| **Quiet Hours** | ❌ None | ✅ Configurable hours | MEDIUM | Time picker | Consider |
| **Habit Stacking** | ✅ Basic streaks | ✅ Trigger-based stacking | MEDIUM | Enhanced UI | Consider |
| **Micro-Lessons** | ❌ None | ✅ Full system | MEDIUM | New screen | Consider |
| **Predictive Nudges** | ❌ None | ✅ ML-based timing | LOW | Background only | Skip (complex) |
| **Coach Marketplace** | ❌ None | ✅ Custom coaches | LOW | New screen | Skip (scope creep) |
| **Vector Knowledge** | ✅ Has `ai_knowledge_sources` | ✅ Similar | NONE | None | Keep ours |
| **Response Caching** | ❌ None | ✅ Query hash cache | HIGH | None (backend) | **ADOPT** |
| **RLHF Feedback** | ❌ None | ✅ Rating system | MEDIUM | Thumbs up/down | Consider |

---

## 🔥 PRIORITY 1: Severity/Intensity System (MUST ADOPT)

### What It Is
A **1.0 to 6.0 scale** that controls coach directness:
- **1.0-2.0**: Gentle, supportive, warm
- **2.5-3.5**: Balanced, clear, direct
- **4.0-5.0**: Firm, challenging, assertive
- **5.5-6.0**: Brutally honest, roast mode

### Why It's High ROI
✅ **User Control**: Power users can dial up intensity
✅ **Personalization**: Same coach, different styles
✅ **No Interface Overhaul**: Just add a slider
✅ **Pure Backend**: Supabase column + function logic

### Supabase Schema (Additive)

```sql
-- ADD to existing user_coach_preferences table (or create new)
CREATE TABLE IF NOT EXISTS user_coach_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),

  -- NEW: Severity scale (replaces binary "roast mode")
  severity DECIMAL(2,1) DEFAULT 3.0 CHECK (severity >= 1.0 AND severity <= 6.0),

  -- Link to existing coach system
  active_coach TEXT DEFAULT 'coach_decibel_avatar',  -- References brand_assets

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_coach_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
ON user_coach_preferences FOR ALL TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Interface Impact: MINIMAL ✅

**Vibe AI adds 1 component**:
```typescript
// Settings screen or chat header
<IntensitySlider
  value={severity}
  onChange={(val) => updateCoachPreference(val)}
  labels={['Gentle', 'Balanced', 'Direct', 'Intense', 'Brutal', 'Savage']}
/>
```

### OpenAI Prompt Integration

```typescript
// In build_coach_system_prompt()
const intensityModifier = severity >= 5.0
  ? "Be brutally honest and direct. No sugarcoating."
  : severity >= 4.0
  ? "Be firm and challenging. Push harder."
  : severity >= 3.0
  ? "Be balanced and clear. Direct but supportive."
  : "Be gentle and warm. Focus on encouragement.";

const systemPrompt = `
${coachPersonality}
${knowledgeDomain}

Intensity Level: ${severity}/6.0
${intensityModifier}

Respond accordingly.
`;
```

---

## 🔥 PRIORITY 2: Coach Modes System (MUST ADOPT)

### What It Is
Pre-defined **mode presets** with consent management:
- **Default Mode**: Standard coaching (severity 1-4)
- **Roast Mode**: Playful teasing (severity 3-5, requires opt-in)
- **Savage Mode**: Brutally honest (severity 4-6, requires DOUBLE opt-in)

### Why It's High ROI
✅ **Safety Rails**: Prevents accidental harm (consent required)
✅ **User Excitement**: "Roast mode" is a feature users request
✅ **Viral Potential**: People love sharing roast mode convos
✅ **Legal Protection**: Double opt-in for extreme modes

### Supabase Schema (Additive)

```sql
-- Coach modes definitions
CREATE TABLE coach_modes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  severity_range NUMRANGE NOT NULL,  -- PostgreSQL range type
  requires_opt_in BOOLEAN DEFAULT FALSE,
  requires_double_opt_in BOOLEAN DEFAULT FALSE,
  renew_days INTEGER DEFAULT 30,  -- Mode expires after X days
  guardrails TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Safety rules
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User consent tracking
CREATE TABLE user_coach_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('roast', 'savage', 'sms', 'call')),
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- Auto-expire consent after 30 days
  double_confirmed BOOLEAN DEFAULT FALSE,
  double_confirmed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',

  UNIQUE(user_id, consent_type)
);

-- Seed modes
INSERT INTO coach_modes (id, name, severity_range, requires_opt_in, description) VALUES
  ('default', 'Default', '[1.0,4.0]', FALSE, 'Standard supportive coaching'),
  ('roast', 'Roast Mode', '[3.0,5.0]', TRUE, 'Playful teasing to motivate (opt-in required)'),
  ('savage', 'Savage Mode', '[4.0,6.0]', TRUE, 'Brutally honest feedback (double opt-in required)')
ON CONFLICT (id) DO NOTHING;

-- ADD to user_coach_preferences
ALTER TABLE user_coach_preferences
ADD COLUMN active_mode TEXT REFERENCES coach_modes(id) DEFAULT 'default';

-- RLS for consent
ALTER TABLE user_coach_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own consent"
ON user_coach_consent FOR ALL TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Interface Impact: MEDIUM ✅

**Vibe AI adds 2 components**:

1. **Mode Toggle** (in chat header or settings):
```typescript
<ModeSelector
  currentMode={activeMode}
  modes={['default', 'roast', 'savage']}
  onModeChange={handleModeChange}  // Shows consent modal if needed
/>
```

2. **Consent Modal** (one-time):
```typescript
<ConsentModal
  mode="roast"
  requiresDoubleConfirm={mode === 'savage'}
  onConsent={grantConsent}
/>
```

### OpenAI Prompt Integration

```typescript
// In build_coach_system_prompt()
const modePrompt = {
  default: "",  // No modifier
  roast: `
ROAST MODE ACTIVE:
- Use playful teasing to motivate
- Call out poor choices with humor
- Stay wellness-focused (no personal attacks)
- Example: "Another donut? Your insulin is crying. Try almonds, coward. 🔥"
`,
  savage: `
SAVAGE MODE ACTIVE:
- Be brutally honest about poor choices
- No sugarcoating, direct harsh truths
- Tie every roast to health consequences
- User CONSENTED to this level of honesty
- Example: "Skipped the gym 4 days straight? Your muscles are filing a restraining order. Move or decay."
`
}[activeMode];

const systemPrompt = `
${coachPersonality}
${knowledgeDomain}
${modePrompt}

Current severity: ${severity}/6.0
`;
```

### Safety Checks

```sql
-- Function to validate mode before message
CREATE FUNCTION validate_coach_mode(p_user_id UUID, p_mode TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_requires_opt_in BOOLEAN;
  v_has_consent BOOLEAN;
BEGIN
  -- Check if mode requires consent
  SELECT requires_opt_in INTO v_requires_opt_in
  FROM coach_modes
  WHERE id = p_mode;

  IF NOT v_requires_opt_in THEN
    RETURN TRUE;  -- Default mode, no consent needed
  END IF;

  -- Check if user has active consent
  SELECT EXISTS(
    SELECT 1 FROM user_coach_consent
    WHERE user_id = p_user_id
      AND consent_type = p_mode
      AND granted = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_has_consent;

  RETURN v_has_consent;
END;
$$ LANGUAGE plpgsql;
```

---

## 💎 PRIORITY 3: Response Caching (Backend Only - High ROI)

### What It Is
Cache OpenAI responses by query hash to save costs.

### Why It's High ROI
✅ **Cost Savings**: 50-70% reduction in API calls
✅ **Faster Responses**: Instant for cached queries
✅ **Zero Interface Impact**: Pure backend optimization

### Supabase Schema (Additive)

```sql
CREATE TABLE ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  coach_id TEXT,  -- References brand_assets.asset_name
  model_used TEXT DEFAULT 'gpt-4o',
  tokens_used INT DEFAULT 0,
  cost_cents DECIMAL(10,4) DEFAULT 0.0,
  hit_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_cache_hash ON ai_response_cache(query_hash);
CREATE INDEX idx_cache_expires ON ai_response_cache(expires_at) WHERE expires_at > NOW();

-- Function to check cache before OpenAI call
CREATE FUNCTION get_cached_response(
  p_query_text TEXT,
  p_coach_id TEXT
) RETURNS TEXT AS $$
DECLARE
  v_hash TEXT;
  v_response TEXT;
BEGIN
  -- Generate hash from query + coach
  v_hash := MD5(p_query_text || p_coach_id);

  -- Try to get cached response
  SELECT response_text INTO v_response
  FROM ai_response_cache
  WHERE query_hash = v_hash
    AND expires_at > NOW();

  IF FOUND THEN
    -- Increment hit count
    UPDATE ai_response_cache
    SET hit_count = hit_count + 1
    WHERE query_hash = v_hash;
  END IF;

  RETURN v_response;
END;
$$ LANGUAGE plpgsql;

-- Function to save response to cache
CREATE FUNCTION cache_response(
  p_query_text TEXT,
  p_response_text TEXT,
  p_coach_id TEXT,
  p_tokens INT,
  p_cost_cents DECIMAL
) RETURNS VOID AS $$
DECLARE
  v_hash TEXT;
BEGIN
  v_hash := MD5(p_query_text || p_coach_id);

  INSERT INTO ai_response_cache (
    query_hash, query_text, response_text, coach_id,
    tokens_used, cost_cents
  ) VALUES (
    v_hash, p_query_text, p_response_text, p_coach_id,
    p_tokens, p_cost_cents
  )
  ON CONFLICT (query_hash) DO UPDATE
  SET hit_count = ai_response_cache.hit_count + 1;
END;
$$ LANGUAGE plpgsql;
```

### Interface Impact: NONE ✅

**Vibe AI changes NOTHING** - just update Edge Function:

```typescript
// In Edge Function
const cachedResponse = await supabase.rpc('get_cached_response', {
  p_query_text: userMessage,
  p_coach_id: coachId
});

if (cachedResponse.data) {
  return new Response(JSON.stringify({ message: cachedResponse.data }));
}

// Otherwise, call OpenAI and cache result
const openAIResponse = await openai.chat.completions.create({...});

await supabase.rpc('cache_response', {
  p_query_text: userMessage,
  p_response_text: openAIResponse.choices[0].message.content,
  p_coach_id: coachId,
  p_tokens: openAIResponse.usage.total_tokens,
  p_cost_cents: calculateCost(openAIResponse.usage.total_tokens)
});
```

---

## 📚 PRIORITY 4: Micro-Lessons System (Medium ROI)

### What It Is
Bite-sized educational content (30-60 second reads) delivered contextually.

### Why Medium ROI
✅ **Engagement**: Keeps users learning daily
✅ **Retention**: "Learn something new" dopamine hit
❌ **Interface Required**: Needs new screen/component

### Supabase Schema (Additive)

```sql
CREATE TABLE micro_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('nutrition', 'habits', 'psychology', 'fitness', 'science')),
  difficulty_level INT DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 3),
  estimated_read_time_seconds INT DEFAULT 30,

  -- Engagement tracking
  view_count INT DEFAULT 0,
  avg_rating DECIMAL(2,1),

  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_micro_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES micro_lessons(id) ON DELETE CASCADE,

  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  rating INT CHECK (rating BETWEEN 1 AND 5),

  UNIQUE(user_id, lesson_id)
);

-- Seed sample lessons
INSERT INTO micro_lessons (title, content, category, tags) VALUES
('The Protein Power Hour', 'Consuming 20-30g of protein within an hour after exercise maximizes muscle recovery. Your body is primed to absorb nutrients post-workout!', 'nutrition', ARRAY['protein', 'recovery']),
('The 2-Minute Rule', 'Any habit can be started in under 2 minutes. Want to exercise? Start by putting on your shoes. The key is making it so easy you can''t say no.', 'habits', ARRAY['habits', 'motivation']),
('Mindful Eating 101', 'Take 3 deep breaths before each meal. This activates your parasympathetic nervous system, improving digestion and helping you feel satisfied sooner.', 'psychology', ARRAY['mindfulness', 'eating'])
ON CONFLICT DO NOTHING;
```

### Interface Impact: MEDIUM ⚠️

**Vibe AI needs to add**:
- New "Daily Lesson" card on home screen
- Lesson detail modal/screen
- Progress tracking

**Recommendation**: Add to backlog, implement if time allows.

---

## 🤔 CONSIDER: Multi-Channel Delivery

### What It Is
Send coach messages via SMS, Push, or even Phone calls.

### Why Consider
✅ **Engagement**: Reach users outside app
✅ **Habit Formation**: Timely reminders
❌ **Cost**: SMS/Call costs money
❌ **Permissions**: Requires phone number collection

### Supabase Schema (Additive)

```sql
ALTER TABLE user_coach_preferences
ADD COLUMN sms_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN sms_phone_number TEXT,
ADD COLUMN push_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN quiet_hours_start TIME DEFAULT '21:00',
ADD COLUMN quiet_hours_end TIME DEFAULT '07:00';
```

**Recommendation**: Skip for MVP, add later if retention metrics show need.

---

## ❌ SKIP: Predictive Nudges & Coach Marketplace

### Why Skip
- **Predictive Nudges**: Requires ML infrastructure (complex, low ROI)
- **Coach Marketplace**: Scope creep, doesn't fit current roadmap

---

## 🚀 Implementation Roadmap

### Phase 1: Backend Only (1 day)
✅ **Response caching** - Zero interface impact, immediate cost savings

### Phase 2: Severity System (2 days)
1. Supabase: Add `user_coach_preferences` table + functions
2. Interface: Add intensity slider to settings
3. Edge Function: Update prompt builder to use severity

### Phase 3: Coach Modes (3 days)
1. Supabase: Add `coach_modes` + `user_coach_consent` tables
2. Interface: Add mode toggle + consent modal
3. Edge Function: Add mode validation + prompt modifiers

### Phase 4: Micro-Lessons (Optional, 5 days)
1. Supabase: Seed lesson content
2. Interface: Add "Daily Lesson" feature
3. Analytics: Track lesson completion

---

## 💰 ROI Calculation

| Feature | Dev Time | Cost Savings | User Value | Total ROI |
|---------|----------|--------------|------------|-----------|
| Response Caching | 1 day | $500+/month | Medium | **⭐⭐⭐⭐⭐** |
| Severity System | 2 days | $0 | High | **⭐⭐⭐⭐⭐** |
| Coach Modes | 3 days | $0 | Very High | **⭐⭐⭐⭐☆** |
| Micro-Lessons | 5 days | $0 | Medium | **⭐⭐⭐☆☆** |

---

## 🎯 Final Recommendation

**ADOPT IMMEDIATELY**:
1. ✅ Response Caching (1 day, pure backend)
2. ✅ Severity/Intensity System (2 days)
3. ✅ Coach Modes + Consent (3 days)

**Total Time**: 6 days
**Interface Impact**: Minimal (1 slider + 1 toggle + 1 modal)
**User Value**: Massive (personalized intensity + viral "roast mode")

**DO NOT ADOPT**:
- ❌ Predictive Nudges (complex ML, low ROI)
- ❌ Coach Marketplace (scope creep)

**CONSIDER FOR V2**:
- ⏳ Micro-Lessons (if retention shows educational content helps)
- ⏳ Multi-Channel (if SMS/Push shows clear engagement lift)

---

**Ready to build Phase 1-3?** 🔥

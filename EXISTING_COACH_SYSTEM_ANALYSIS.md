# 🔍 Existing Coach & Knowledge System Analysis

**Date**: 2025-11-04
**Purpose**: Identify what we already have before building prompt-based personality system

---

## ✅ What We ALREADY Have

### 1. **Coach Personas (Avatars + Metadata)** ✅

**Location**: `supabase/migrations/20251103_seed_brand_assets_coaches.sql`

**Table**: `brand_assets` (where `asset_type = 'coach_avatar'`)

**4 Coaches Already Defined**:

#### Coach Decibel (Default/Energetic)
```sql
asset_name: 'coach_decibel_avatar'
usage_notes: 'HIGH ENERGY motivation, loud encouragement, drill sergeant style (but positive).
              Perfect for athletes, competitive types.
              Personality: LOUD, energetic, celebratory, uses ALL CAPS for emphasis'
associated_persona: 'coach_decibel_avatar' (from personalization_rules)
```

#### Coach Synapse (Roast Mode/Analytical)
```sql
asset_name: 'coach_synapse_avatar'
usage_notes: 'TOUGH LOVE, roast mode, direct feedback, science-backed reasoning.
              Perfect for users who requested roast mode, analytical types.
              Personality: Direct, uses science/data, occasional sarcasm, calls out excuses'
```
**🎯 THIS IS YOUR ROAST MODE COACH!**

#### Coach Veloura (Empathetic/Supportive)
```sql
asset_name: 'coach_veloura_avatar'
usage_notes: 'EMOTIONAL SUPPORT, gentle encouragement, empathy.
              Perfect for emotional eaters, users struggling with self-compassion.
              Personality: Warm (9/10), validating, acknowledges feelings, celebrates small wins'
associated_persona: 'coach_veloura_avatar' (from personalization_rules)
```

#### Coach Verdant (Vegan/Plant-Based Expert)
```sql
asset_name: 'coach_verdant_avatar'
usage_notes: 'VEGAN/VEGETARIAN users. Expert in plant-based nutrition, environmental impact.
              Personality: Knowledgeable about plant nutrition, emphasizes environmental benefits'
associated_persona: 'coach_verdant_avatar' (from personalization_rules)
```

#### Coach Aetheris (Referenced but not in brand_assets)
```sql
-- Referenced in personalization_rules but no avatar asset found
associated_persona: 'coach_aetheris_avatar' (Muscle Builder, IF personas)
```

---

### 2. **Personalization Rules (Coach Assignment Logic)** ✅

**Location**: `supabase/migrations/20251104_seed_personalization_rules.sql`

**Table**: `personalization_rules`

**5 Rules Already Seeded**:

1. **Vegan Carbon Focus** → `coach_verdant_avatar`
2. **Muscle Builder Focus** → `coach_aetheris_avatar`
3. **Intermittent Fasting** → `coach_aetheris_avatar`
4. **Emotional Eating Support** → `coach_veloura_avatar`
5. **Default Fallback** → `coach_decibel_avatar`

**Example Rule**:
```json
{
  "predicate": {
    "all": [
      {"trait": "diet_type", "op": "eq", "value": "vegan"},
      {"trait": "ethics_carbon", "op": "in", "value": ["high", "medium"]}
    ]
  },
  "effects": {
    "home_layout": "layout_vegan_focus",
    "coach_persona": "coach_verdant_avatar",
    "enable_features": ["carbon_metric", "plant_protein_tracking"],
    "primary_color": "#22C55E"
  }
}
```

**What this provides**: Automatic coach selection based on user traits

---

### 3. **AI Knowledge Sources Table** ✅

**Location**: `supabase/migrations/20251103_complete_ai_infrastructure.sql`

**Table**: `ai_knowledge_sources`

**Schema**:
```sql
CREATE TABLE ai_knowledge_sources (
  id UUID PRIMARY KEY,
  source_type TEXT,  -- 'nutrition_research', 'fitness_guidelines', 'medical_database', 'coaching_script'
  source_name TEXT,
  title TEXT,
  content TEXT,
  summary TEXT,
  embedding VECTOR(1536),  -- For semantic search

  -- Quality metadata
  reliability_score NUMERIC,
  peer_reviewed BOOLEAN,
  topic_tags TEXT[],  -- ['macronutrients', 'weight_loss', 'diabetes']
  target_audience TEXT,  -- 'general', 'diabetes', 'athletes', 'pregnancy'

  is_active BOOLEAN,
  created_at TIMESTAMPTZ
);
```

**What this provides**:
- Grounding source for AI responses
- Can store coaching scripts, nutrition knowledge
- Vector search enabled for semantic retrieval

---

### 4. **User Traits System** ✅

**Location**: `supabase/migrations/20251103_dynamic_personalization_infrastructure.sql`

**Table**: `user_traits`

**Traits We Can Use**:
- `diet_type`: vegan, keto, intermittent_fasting, low_sugar, etc.
- `goal_primary`: weight_loss, hypertrophy, performance, maintenance
- `personality_type`: analytical, emotional, social, pragmatic
- `emotional_eating_risk`: high, medium, low, none (AI-detected)
- `ethics_carbon`: high, medium, low, none

**What this provides**: Context for selecting knowledge domain + personality style

---

### 5. **Conversations Table** ✅

**Location**: Exists in schema (referenced in migrations)

**Table**: `conversations` or `coach_messages`

**What this provides**: Storage for chat history

---

## ❌ What We DON'T Have Yet

### 1. **Prompt Templates for Each Coach** ❌

**Current State**:
- We have coach avatars and personality descriptions in `usage_notes`
- But NO structured system prompts ready for OpenAI API

**Need**:
- Full system prompt for Coach Synapse (roast mode)
- Full system prompt for Coach Veloura (empathetic)
- Full system prompt for Coach Verdant (vegan expert)
- Full system prompt for Coach Decibel (energetic)

---

### 2. **Knowledge Domain Prompts** ❌

**Current State**:
- `ai_knowledge_sources` table exists but is empty
- No seeded knowledge for domains like:
  - Low-sugar expertise
  - Keto expertise
  - Vegan nutrition
  - IF/fasting protocols

**Need**:
- Prompt snippets for each diet type
- Can be stored in `ai_knowledge_sources` as `source_type = 'coaching_script'`

---

### 3. **Intensity Control** ❌

**Current State**:
- No concept of intensity slider (0-100%)
- Coaches are static personalities

**Need**:
- Intensity modifiers for each coach
- Example: Coach Synapse at 30% intensity vs 90% intensity

---

### 4. **Modifier System (Roast Mode Toggle)** ❌

**Current State**:
- Coach Synapse IS the roast coach
- But it's all-or-nothing (can't toggle roast mode for other coaches)

**Need**:
- Roast mode as a MODIFIER that can be applied to any coach
- Zen mode, Hype mode, etc. as universal modifiers

---

### 5. **User Preferences Table** ❌

**Current State**:
- Coaches are auto-selected via `personalization_rules`
- No way for user to manually override or adjust intensity

**Need**:
- Table to store user's explicit coach selection
- Intensity preference (0-1 scale)
- Modifier toggles (roast mode on/off)

---

### 6. **Prompt Composition Function** ❌

**Current State**:
- `select_ui_layout()` returns `coach_persona` string
- But no function to build complete OpenAI system prompt

**Need**:
- Function that takes user_id and returns full system prompt
- Combines: base coach personality + knowledge domain + intensity + modifiers

---

## 🎯 Summary: Leverage vs Build

### ✅ Leverage Existing (Don't Rebuild)

1. **Coach Avatars** - Use existing 4 coaches (Decibel, Synapse, Veloura, Verdant)
2. **Personalization Rules** - Keep trait-based coach assignment
3. **User Traits** - Use for knowledge domain selection
4. **AI Knowledge Sources Table** - Populate with prompt snippets (don't create new table)
5. **Brand Assets Table** - Reference coach avatars from here

### 🆕 Build New (Additive Only)

1. **Prompt Templates** - Store in `ai_knowledge_sources` with `source_type = 'coaching_prompt'`
2. **User Coach Preferences** - NEW lightweight table for overrides + intensity
3. **Build Prompt Function** - NEW function to compose system prompt
4. **Seed Prompt Data** - Populate `ai_knowledge_sources` with coach personalities + knowledge domains

---

## 💡 Recommended Approach

### Option A: Minimal (Use Existing Tables)

**Store prompts in `ai_knowledge_sources`**:

```sql
-- Coach personality prompts
INSERT INTO ai_knowledge_sources (
  source_type,
  source_name,
  content,
  topic_tags,
  target_audience,
  is_active
) VALUES (
  'coaching_script',
  'Coach Synapse Roast Mode Personality',
  'You are Coach Synapse, a savage wellness coach who roasts users... [FULL PROMPT]',
  ARRAY['roast_mode', 'direct_feedback', 'science_based'],
  'general',
  TRUE
);

-- Knowledge domain prompts
INSERT INTO ai_knowledge_sources (
  source_type,
  source_name,
  content,
  topic_tags,
  target_audience,
  is_active
) VALUES (
  'coaching_script',
  'Low-Sugar Nutrition Expertise',
  'You are an expert in low-sugar eating. When discussing food choices... [KNOWLEDGE PROMPT]',
  ARRAY['low_sugar', 'blood_sugar', 'energy'],
  'diabetes',
  TRUE
);
```

**Pros**:
- ✅ Zero new tables
- ✅ Leverages existing vector search
- ✅ Simple

**Cons**:
- ❌ Mixing prompts with knowledge sources (less organized)
- ❌ No explicit intensity/modifier fields

---

### Option B: Dedicated Table (Cleaner)

**Create new `coach_personality_prompts` table**:

```sql
CREATE TABLE coach_personality_prompts (
  id UUID PRIMARY KEY,
  prompt_type TEXT CHECK (prompt_type IN ('personality', 'knowledge', 'modifier')),
  coach_avatar_ref TEXT,  -- References brand_assets.asset_name
  name TEXT UNIQUE,
  system_prompt TEXT,
  intensity_scale NUMERIC(3,2),  -- How this prompt scales with intensity
  examples JSONB,
  active BOOLEAN
);
```

**Pros**:
- ✅ Clean separation of concerns
- ✅ Explicit intensity handling
- ✅ Easy to query by type

**Cons**:
- ❌ One more table (but lightweight)

---

## 🚀 My Recommendation

### Hybrid Approach: Use `ai_knowledge_sources` + Small Preferences Table

1. **Store prompts in `ai_knowledge_sources`** (repurpose existing table)
   - Set `source_type = 'coaching_prompt'`
   - Use `topic_tags` for categorization
   - Use `structured_data` JSONB for intensity scaling

2. **Create minimal `user_coach_preferences` table**
   - Just: user_id, intensity_scale, selected_modifier
   - Links to coach via `personalization_rules` (already exists)

3. **Create `build_coach_system_prompt(user_id)` function**
   - Reads user traits
   - Gets coach from personalization_rules
   - Fetches prompts from ai_knowledge_sources
   - Composes final system prompt

**Result**: Maximum leverage of existing tables, minimal new structure

---

## 📝 Next Steps

1. ✅ Confirm approach (Option A, B, or Hybrid)
2. Seed `ai_knowledge_sources` with coach prompts
3. Create `user_coach_preferences` table
4. Build prompt composition function
5. Document for Vibe AI (interface implementation)

**Ready to proceed with Hybrid Approach?** 🎯

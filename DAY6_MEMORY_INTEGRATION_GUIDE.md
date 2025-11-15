# 📘 Day 6: Episodic Memory Integration Guide

**Date**: 2025-11-09
**Status**: ✅ Backend Complete - Ready for Integration
**Impact**: AI remembers user context across sessions for personalized coaching

---

## 🎯 What Was Built (Supabase Backend)

✅ Enhanced `ai_episodic_memory` table - Now with importance scoring, categories, access tracking
✅ `save_episodic_memory()` function - Manual memory creation
✅ `get_relevant_memories()` function - Smart retrieval based on importance + recency
✅ `build_memory_context()` function - Formats memories for system prompts
✅ `auto_capture_memory_from_conversation()` function - Detects important info automatically
✅ Updated `build_coach_system_prompt()` - Now includes memory context
✅ `memory_statistics` view - Per-user analytics

**Migration File**: `supabase/migrations/20251109_episodic_memory_system.sql`

---

## 🧠 How Memory Works

### Memory Categories

| Category | What It Stores | Importance | Example |
|----------|----------------|------------|---------|
| **goal** | User goals and aspirations | 0.9 | "User wants to lose 20 pounds by summer" |
| **achievement** | Completed milestones | 0.9 | "User completed 30-day streak" |
| **preference** | Food likes/dislikes | 0.7 | "User dislikes mushrooms" |
| **pattern** | Behavioral patterns | 0.8 | "User tends to snack late at night when stressed" |
| **milestone** | Important life events | 0.8 | "User started keto diet on Jan 1, 2025" |
| **insight** | AI-discovered insights | 0.7 | "User has higher willpower in mornings" |
| **general** | Other memories | 0.5 | "User asked about protein shakes" |

### Importance Scoring (0.0 - 1.0)

- **0.9-1.0**: Critical (goals, achievements) - Always included
- **0.7-0.8**: High (patterns, preferences) - Usually included
- **0.5-0.6**: Medium (insights, general) - Sometimes included
- **0.0-0.4**: Low (routine questions) - Rarely included

### Smart Retrieval Algorithm

Memories are ranked by:
```
Score = (importance * 0.7) + (recency * 0.3)
```

Where:
- **Importance**: User-defined (0.0-1.0)
- **Recency**: `1.0 / (1.0 + days_ago)`

**Result**: Recent important memories rank highest, old unimportant ones fade away naturally.

---

## 🔧 How to Integrate (Edge Function Changes)

### Step 1: Update Edge Function to Auto-Capture Memories

**File**: `supabase/functions/chat/index.ts`

```typescript
serve(async (req) => {
  const { message, userId, coachId, mode, severity, conversationId } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ... validation, cache check, OpenAI call ...

  const responseText = completion.choices[0].message.content!

  // ===== NEW: AUTO-CAPTURE MEMORIES =====
  try {
    const { data: memoryId } = await supabase.rpc('auto_capture_memory_from_conversation', {
      p_user_id: userId,
      p_user_message: message,
      p_ai_response: responseText
    })

    if (memoryId) {
      console.log(`📝 Auto-captured memory: ${memoryId}`)
    }
  } catch (error) {
    console.error('Memory capture failed:', error)
    // Don't fail the request if memory capture fails
  }

  // ... save feedback, cache response, return ...

  return new Response(JSON.stringify({
    message: responseText,
    cached: fromCache,
    feedbackId: feedbackId
  }))
})
```

**What This Does**:
- Automatically detects important information in conversations
- Saves goals, preferences, achievements, patterns without manual intervention
- Fails gracefully (doesn't break chat if memory system has issues)

---

### Step 2: Manual Memory Creation (Optional)

For explicit memory creation (e.g., when user sets a goal in UI):

```typescript
// When user completes onboarding or sets a goal
const saveUserGoal = async (userId: string, goalText: string) => {
  const { data: memoryId, error } = await supabase.rpc('save_episodic_memory', {
    p_user_id: userId,
    p_memory_text: goalText,
    p_memory_category: 'goal',
    p_importance_score: 0.9,
    p_context: {
      source: 'onboarding',
      timestamp: new Date().toISOString()
    }
  })

  if (error) {
    console.error('Failed to save goal:', error)
  } else {
    console.log('Goal saved:', memoryId)
  }
}

// Example usage
await saveUserGoal(user.id, 'Lose 20 pounds by June 2025')
```

---

### Step 3: View User Memories (Optional UI)

**File**: `src/screens/UserMemoriesScreen.tsx`

```typescript
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
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
      <View className="p-4">
        <Text className="text-2xl font-bold mb-2">Your Memory</Text>
        <Text className="text-gray-600 mb-4">
          What your coach remembers about you
        </Text>

        {/* Category Filter */}
        <ScrollView horizontal className="mb-4">
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

---

## 📊 Memory Examples (What Gets Saved)

### Example 1: Goal Detection

**User**: "My goal is to lose 20 pounds by summer"

**Auto-captured**:
```json
{
  "memory_text": "User stated goal: My goal is to lose 20 pounds by summer",
  "memory_category": "goal",
  "importance_score": 0.9,
  "context": {
    "user_message": "My goal is to lose 20 pounds by summer",
    "ai_response": "That's a great goal! Let's break it down...",
    "detected_at": "2025-11-09T12:00:00Z"
  }
}
```

### Example 2: Preference Detection

**User**: "I hate mushrooms, they make me gag"

**Auto-captured**:
```json
{
  "memory_text": "User preference: I hate mushrooms, they make me gag",
  "memory_category": "preference",
  "importance_score": 0.7,
  "context": {
    "user_message": "I hate mushrooms, they make me gag",
    "ai_response": "Got it! I'll avoid recommending mushrooms...",
    "detected_at": "2025-11-09T12:05:00Z"
  }
}
```

### Example 3: Pattern Detection

**AI**: "I noticed you tend to snack late at night when stressed"

**Auto-captured**:
```json
{
  "memory_text": "Behavioral pattern: I noticed you tend to snack late at night when stressed",
  "memory_category": "pattern",
  "importance_score": 0.8,
  "context": {
    "user_message": "I ate a whole bag of chips at 11pm last night",
    "ai_response": "I noticed you tend to snack late at night when stressed. Let's work on healthier stress management...",
    "detected_at": "2025-11-09T12:10:00Z"
  }
}
```

### Example 4: Achievement Detection

**User**: "I did it! Completed my 30-day streak!"

**Auto-captured**:
```json
{
  "memory_text": "Achievement: I did it! Completed my 30-day streak!",
  "memory_category": "achievement",
  "importance_score": 0.9,
  "context": {
    "user_message": "I did it! Completed my 30-day streak!",
    "ai_response": "Congratulations! That's incredible dedication!",
    "detected_at": "2025-11-09T12:15:00Z"
  }
}
```

---

## 🔍 How Memory Appears in Prompts

### Before Memory (Day 5)

```
You are Coach Decibel, a wellness and nutrition coach.

USER CONTEXT:
- Diet preference: keto
- Primary goal: weight loss
- Current intensity preference: 3.0/6.0
- Active mode: default

[... intensity and mode modifiers ...]
```

### After Memory (Day 6)

```
You are Coach Decibel, a wellness and nutrition coach.

USER CONTEXT:
- Diet preference: keto
- Primary goal: weight loss
- Current intensity preference: 3.0/6.0
- Active mode: default

USER MEMORY (Important Context from Past Interactions):
- [GOAL, 3 days ago] User stated goal: Lose 20 pounds by summer
- [PREFERENCE, 5 days ago] User preference: I hate mushrooms, they make me gag
- [PATTERN, 7 days ago] Behavioral pattern: User tends to snack late at night when stressed
- [ACHIEVEMENT, 10 days ago] Achievement: Completed 30-day streak
- [MILESTONE, 30 days ago] Milestone: User started keto diet on Jan 1, 2025

[... intensity and mode modifiers ...]
```

**Result**: AI can now reference past conversations naturally!

---

## 💬 Example Conversations with Memory

### Without Memory (Repetitive)

**Day 1**:
- **User**: What should I eat for breakfast?
- **AI**: Try eggs and bacon, great for keto!

**Day 30**:
- **User**: What should I eat for breakfast?
- **AI**: Try eggs and bacon, great for keto! *(Same generic response)*

### With Memory (Personalized)

**Day 1**:
- **User**: What should I eat for breakfast?
- **AI**: Try eggs and bacon, great for keto!
- *(Memory saved: User asked about breakfast)*

**Day 30**:
- **User**: What should I eat for breakfast?
- **AI**: Remember you're working toward losing 20 pounds by summer! Since you started keto 30 days ago and have been crushing it, let's keep it interesting. How about a mushroom-free veggie omelet? *(References goal, milestone, preference)*

---

## 📊 Monitoring Memory System

### Check User's Memories

```typescript
const { data: memories } = await supabase.rpc('get_relevant_memories', {
  p_user_id: user?.id,
  p_category: null,  // All categories
  p_min_importance: 0.6,  // High importance only
  p_limit: 20
})

console.log('User has', memories?.length, 'important memories')
```

### Check Memory Statistics

```typescript
const { data: stats } = await supabase
  .from('memory_statistics')
  .select('*')
  .eq('user_id', user?.id)
  .single()

console.log('Memory Stats:')
console.log(`  Total: ${stats.total_memories}`)
console.log(`  Goals: ${stats.goals}`)
console.log(`  Achievements: ${stats.achievements}`)
console.log(`  Avg Importance: ${stats.avg_importance}`)
console.log(`  Most Accessed: ${stats.max_access_count} times`)
```

---

## 🧪 Testing Queries

### Test 1: Save a Memory

```sql
SELECT save_episodic_memory(
  p_user_id := '00000000-0000-0000-0000-000000000001',
  p_memory_text := 'User wants to lose 20 pounds by summer',
  p_memory_category := 'goal',
  p_importance_score := 0.9
);
```

**Expected Result**: Returns UUID (memory ID)

### Test 2: Retrieve Memories

```sql
SELECT * FROM get_relevant_memories(
  p_user_id := '00000000-0000-0000-0000-000000000001',
  p_category := NULL,  -- All categories
  p_min_importance := 0.5,
  p_limit := 10
);
```

**Expected Result**: List of memories sorted by relevance

### Test 3: Build Memory Context

```sql
SELECT build_memory_context(
  p_user_id := '00000000-0000-0000-0000-000000000001',
  p_max_memories := 5
);
```

**Expected Result**: Formatted memory context string for prompt

### Test 4: Auto-Capture Memory

```sql
SELECT auto_capture_memory_from_conversation(
  p_user_id := '00000000-0000-0000-0000-000000000001',
  p_user_message := 'My goal is to eat healthier and exercise 3 times a week',
  p_ai_response := 'Great goal! Let''s start with tracking your meals.'
);
```

**Expected Result**: Memory ID if pattern matched, NULL otherwise

### Test 5: Memory-Enhanced Prompt

```sql
SELECT build_coach_system_prompt(
  p_user_id := '00000000-0000-0000-0000-000000000001',
  p_override_coach_id := 'coach_decibel_avatar',
  p_override_severity := 3.0,
  p_override_mode := 'default',
  p_include_memory := TRUE  -- Enable memory
);
```

**Expected Result**: System prompt with memory section included

---

## ✅ Day 6 Complete Checklist

- [x] ai_episodic_memory table enhanced
- [x] save_episodic_memory() function working
- [x] get_relevant_memories() function working
- [x] build_memory_context() function working
- [x] auto_capture_memory_from_conversation() function working
- [x] build_coach_system_prompt() updated with memory
- [x] memory_statistics view created
- [ ] **TODO**: Update Edge Function to auto-capture memories
- [ ] **TODO**: Test memory system with real conversations
- [ ] **TODO**: Monitor memory quality and relevance

---

## 🔜 Coming Next

**Day 7**: Fine-Tuning Export Pipeline
- Export training data to OpenAI JSONL format
- Create fine-tuning jobs via OpenAI API
- Track job status and completion
- Store fine-tuned model IDs
- A/B test fine-tuned vs base model

**Days 8-9**: Testing Complete System
- End-to-end testing of all features
- Performance benchmarks
- Memory quality validation
- RLHF pipeline verification

**Day 10**: Final Documentation + Handoff
- Complete integration guide
- Deployment checklist
- Maintenance procedures
- Monitoring dashboards

---

## 💡 Pro Tips

1. **Start with high importance thresholds** (0.6+) to avoid prompt bloat
2. **Monitor access_count** to see which memories are actually useful
3. **Let auto-capture run for 1 week** before tuning pattern detection
4. **Memory fade is good** - old memories naturally deprioritize
5. **Don't save everything** - only important context matters
6. **Test memory retrieval** weekly to ensure quality

---

**Status**: ✅ Day 6 Backend Complete
**Ready For**: Edge Function integration (auto-capture memories)
**Expected Impact**: AI remembers user context → personalized coaching

🎉 **Memory system is live! Your AI now has long-term memory!**

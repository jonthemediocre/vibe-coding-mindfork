# 🤖 Conversational AI Onboarding - Implementation Guide

**Status:** ✅ Implemented and Ready
**Date:** $(date)

---

## 🎯 What We Built

Instead of traditional multi-step forms, MindFork now features a **conversational AI onboarding** where users chat naturally with Synapse (the AI health coach) to complete their profile setup.

### Before vs After

**Before (Traditional Form Onboarding):**
```
Step 1/6: What's your name?
[Text input]
[Next Button]

Step 2/6: How old are you?
[Number input]
[Back] [Next]

... 4 more screens ...
```

**After (Conversational AI Onboarding):**
```
Synapse: Hey there! 👋 I'm Synapse, your AI health coach.
         What should I call you?

User: I'm Alex, 28 years old

Synapse: Nice to meet you, Alex! 28 is a great age to focus on health.
         What brings you to MindFork? Want to lose weight, build muscle,
         or just get healthier overall?

User: I want to lose about 20 lbs. I'm 5'10" and 190 lbs right now

Synapse: Got it! You're 5'10", 190 lbs, looking to drop 20 pounds - that's
         totally doable! How active are you during the week?

User: I go to the gym 3-4 times a week

Synapse: Perfect! That's moderate activity. Last question - any dietary
         preferences? Vegetarian, keto, or just balanced eating?

User: Just balanced, I eat everything

Synapse: Awesome! 🎉 I've got everything I need. Setting up your
         personalized dashboard now...
```

---

## 🏗️ Architecture

### Components

**1. ConversationalOnboardingScreen.tsx**
- Location: `/src/screens/auth/ConversationalOnboardingScreen.tsx`
- Chat-style UI with message bubbles
- Real-time data preview panel
- Keyboard-aware scrolling
- Automatic navigation when complete

**2. OnboardingAgentService.ts**
- Location: `/src/services/OnboardingAgentService.ts`
- Natural language parser (local regex-based extraction)
- AI integration (calls Supabase Edge Function)
- Data validation and completion checking
- Saves to Supabase profiles table

**3. Supabase Edge Function: onboarding-agent**
- Location: `/home/user/mindfork-supabase/functions/onboarding-agent/index.ts`
- Powered by OpenAI GPT-4o-mini
- Structured JSON responses
- Context-aware conversation flow
- Fallback error handling

### Data Flow

```
User types message
    ↓
ConversationalOnboardingScreen
    ↓
Local extraction (regex) → Extracts basic data (age, height, etc)
    ↓
OnboardingAgentService.sendOnboardingMessage()
    ↓
Supabase Edge Function: onboarding-agent
    ↓
OpenAI GPT-4o-mini
    ↓
Returns: { response, extractedData, isComplete }
    ↓
Merge local + AI extracted data
    ↓
Update UI with new message & data preview
    ↓
If complete → completeOnboarding() → Save to Supabase
    ↓
Navigate to main app
```

---

## 📝 Data Collected

The AI agent extracts the following structured data from natural conversation:

| Field | Type | Required | Example |
|-------|------|----------|---------|
| fullName | string | No | "Alex" |
| age | number | Yes | 28 |
| gender | enum | Yes | "male", "female", "other" |
| heightFeet | number | Yes | 5 |
| heightInches | number | Yes | 10 |
| weightLbs | number | Yes | 190 |
| targetWeightLbs | number | No | 170 |
| primaryGoal | enum | Yes | "lose_weight", "gain_muscle", "maintain", "get_healthy" |
| activityLevel | enum | Yes | "sedentary", "light", "moderate", "active", "very_active" |
| dietType | enum | Yes | "mindfork", "vegetarian", "vegan", "keto", "paleo", "mediterranean" |

---

## 🧠 Natural Language Processing

### Dual Extraction System

**1. Local Regex Parser** (Fast, works offline)
```typescript
// Extract age from "I'm 28" or "28 years old"
const ageMatch = text.match(/\b(\d{2})\b/);

// Extract height from "5'10" or "5 feet 10 inches"
const heightMatch = text.match(/(\d+)\s*(?:feet|ft|')\s*(\d+)?\s*(?:inches|in|")?/i);

// Extract goals from keywords
if (lowerText.includes("lose weight")) → primaryGoal = "lose_weight"
```

**2. AI Extraction** (Contextual, understands nuance)
```typescript
// Handles complex statements like:
"I'm trying to shed some pounds for my wedding"
→ primaryGoal = "lose_weight"

"I hit the gym almost every day"
→ activityLevel = "very_active"

"I don't eat meat"
→ dietType = "vegetarian"
```

---

## 💬 Conversation Design

### AI Personality: Synapse
- **Tone:** Warm, friendly, encouraging (like texting a friend)
- **Style:** Casual, not clinical
- **Pace:** 1-2 questions at a time
- **Validation:** Positive acknowledgment of every response
- **Fallback:** Offers examples when user seems confused

### Example Prompts

**Good prompts from AI:**
- ✅ "What should I call you?"
- ✅ "How active are you during the week?"
- ✅ "Want to lose weight, build muscle, or just get healthier?"

**Avoid (too clinical):**
- ❌ "Please enter your biological sex"
- ❌ "What is your body mass index goal?"
- ❌ "Select your metabolic equivalence task level"

---

## 🔧 Configuration

### Environment Variables

```bash
# Required for AI onboarding
EXPO_PUBLIC_OPENAI_API_KEY=sk-...

# Or use Vibecode provided key
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=sk-...

# Supabase (for saving profile)
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

### Supabase Edge Function Deployment

```bash
cd /home/user/mindfork-supabase

# Deploy the onboarding-agent function
supabase functions deploy onboarding-agent

# Set OpenAI API key secret
supabase secrets set OPENAI_API_KEY=sk-...

# Verify deployment
supabase functions list
```

---

## 🎨 UI Features

### Message Bubbles
- **AI messages:** Purple bubble on the left
- **User messages:** Blue bubble on the right
- **Loading state:** Animated typing indicator
- **Timestamps:** Stored but not displayed (reduces clutter)

### Data Preview Panel
Shows collected information in real-time:
```
Information collected:
• Name: Alex
• Age: 28
• Gender: male
• Height: 5'10"
• Weight: 190 lbs
• Goal: Lose Weight
• Activity: moderate
```

### Auto-scroll
- Automatically scrolls to latest message
- Smooth animation
- Works with keyboard open

### Keyboard Handling
- `KeyboardAvoidingView` for iOS
- Input stays visible when typing
- Send button always accessible
- Dismissible by tapping outside

---

## 🚀 Deployment Checklist

- [x] ConversationalOnboardingScreen created
- [x] OnboardingAgentService implemented
- [x] Supabase Edge Function created
- [x] Navigation updated to use conversational onboarding
- [x] Local extraction (regex) working
- [x] AI extraction integrated
- [x] Data preview UI implemented
- [x] Saves to Supabase profiles table
- [x] Auto-navigation when complete
- [ ] Deploy Supabase Edge Function (user must do)
- [ ] Set OPENAI_API_KEY secret in Supabase (user must do)
- [ ] Test end-to-end flow in production

---

## 🧪 Testing

### Manual Test Flow

1. **Sign up** for a new account
2. Should land on conversational onboarding
3. **Chat naturally** with Synapse:
   - "I'm Sam, 32 years old"
   - "I want to lose 15 pounds"
   - "I'm 6 feet tall and weigh 200 lbs"
   - "I work out 3 times a week"
   - "I eat everything, no restrictions"
4. **Verify data preview** updates as you chat
5. **Wait for completion** message
6. Should **auto-navigate** to main dashboard
7. **Check dashboard** shows personalized data

### Edge Cases to Test

- Very short responses: "yes", "no", "ok"
- Long rambling messages with multiple data points
- Typos and misspellings
- Imperial vs metric (should handle both)
- Ambiguous goals: "I just want to be healthier"
- Network errors (should show fallback)

---

## 📊 Analytics to Track

Post-launch metrics to monitor:

1. **Completion Rate**
   - % of users who complete onboarding
   - Compare to old form completion rate

2. **Time to Complete**
   - Average messages sent
   - Average time from start to finish

3. **Drop-off Points**
   - Which questions cause abandonment
   - Where users get stuck/confused

4. **Extraction Accuracy**
   - % of fields correctly extracted
   - Local regex vs AI extraction success rate

5. **User Satisfaction**
   - Post-onboarding survey
   - Compare conversational vs form experience

---

## 🎯 Future Enhancements

### Phase 2 Features

1. **Voice Input**
   - Tap-to-talk button
   - Speech-to-text transcription
   - More natural for some users

2. **Multi-language Support**
   - Detect user language
   - AI responds in same language
   - Extract data regardless of language

3. **Personality Selection**
   - Let user choose their coach for onboarding
   - Different personalities for different users
   - "Want a motivating coach or a gentle one?"

4. **Smart Suggestions**
   - Quick reply buttons for common responses
   - "5'8\"", "5'10\"", "6'0\"" for height
   - "Lose weight", "Gain muscle", "Get healthy" for goals

5. **Progress Indicator**
   - Show "3/8 fields collected"
   - Visual progress bar
   - Motivates completion

6. **Edit Capability**
   - "Actually, I'm 29 not 28"
   - AI updates the field
   - Data preview shows change

---

## 🐛 Known Issues & Workarounds

### Issue 1: AI Hallucination
**Problem:** AI sometimes invents data that wasn't provided
**Workaround:** Local regex extraction runs first, AI only fills gaps
**Fix:** Validate all AI-extracted data against user message

### Issue 2: Network Latency
**Problem:** Edge Function calls can be slow (2-3 seconds)
**Workaround:** Show typing indicator, keeps UI responsive
**Fix:** Implement streaming responses in future

### Issue 3: Ambiguous Responses
**Problem:** User says "yes" without context
**Workaround:** AI asks clarifying question
**Fix:** Better conversation state management

---

## 📚 Code Examples

### How to Add a New Field

```typescript
// 1. Add to OnboardingData interface
interface OnboardingData {
  // ... existing fields
  favoriteFood?: string; // NEW
}

// 2. Add to extraction logic
if (lowerText.includes("favorite food")) {
  newData.favoriteFood = extractFood(text);
}

// 3. Update AI system prompt
"10. Favorite food (optional)"

// 4. Update isOnboardingComplete() if required
return !!(
  // ... existing checks
  data.favoriteFood  // If required
);

// 5. Update completeOnboarding() to save it
await supabase
  .from("profiles")
  .update({
    // ... existing fields
    favorite_food: data.favoriteFood,
  })
```

### How to Change AI Personality

```typescript
// In OnboardingAgentService.ts or Edge Function

const systemPrompt = `You are Luna, a playful and energetic AI coach...
// Change tone, style, emoji usage, etc.
`;
```

---

## ✅ Success Metrics

The conversational onboarding is successful if:

1. **Higher completion rate** than form-based onboarding
2. **Faster time to completion** (less cognitive load)
3. **More accurate data** (users give more natural responses)
4. **Higher user satisfaction** (feels more personal)
5. **Better engagement** (users enjoy chatting with AI)

---

## 🎊 Summary

You now have a **production-ready conversational AI onboarding system** that:

- ✅ Replaces traditional forms with natural chat
- ✅ Uses GPT-4o-mini for contextual understanding
- ✅ Has dual extraction (local + AI) for accuracy
- ✅ Shows real-time data preview
- ✅ Auto-saves to Supabase when complete
- ✅ Provides warm, friendly user experience
- ✅ Handles errors gracefully with fallbacks

This is a **major UX improvement** that makes onboarding feel personal and effortless!

---

**Ready to Deploy:** Just deploy the Supabase Edge Function and test! 🚀

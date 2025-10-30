import { supabase } from "../lib/supabase";
import {
  calculateNutritionGoals,
  convertImperialToMetric,
  type Gender,
  type ActivityLevel,
  type Goal,
  type DietType,
} from "../utils/goalCalculations";

/**
 * Onboarding Agent Service
 *
 * Manages conversational AI onboarding where the user chats naturally
 * and the AI extracts structured data to fill the backend profile.
 */

export interface OnboardingData {
  fullName?: string;
  age?: number;
  gender?: Gender;
  heightFeet?: number;
  heightInches?: number;
  weightLbs?: number;
  targetWeightLbs?: number;
  primaryGoal?: Goal;
  activityLevel?: ActivityLevel;
  dietType?: DietType;
}

export interface OnboardingMessage {
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
}

export interface ExtractionResult {
  extractedData: Partial<OnboardingData>;
  missingFields: string[];
  confidence: number;
  nextQuestion: string;
}

/**
 * Sends a message to the AI onboarding agent
 */
export async function sendOnboardingMessage(
  conversationHistory: OnboardingMessage[],
  currentData: Partial<OnboardingData>
): Promise<{
  response: string;
  extractedData: Partial<OnboardingData>;
  isComplete: boolean;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("onboarding-agent", {
      body: {
        conversationHistory,
        currentData,
      },
    });

    if (error) throw error;

    return {
      response: data.response,
      extractedData: data.extractedData,
      isComplete: data.isComplete,
    };
  } catch (error) {
    console.log("Onboarding edge function unavailable, using local fallback");
    // Fallback to local extraction
    return fallbackOnboardingAgent(conversationHistory, currentData);
  }
}

/**
 * Fallback onboarding agent that runs locally using OpenAI
 */
async function fallbackOnboardingAgent(
  conversationHistory: OnboardingMessage[],
  currentData: Partial<OnboardingData>
): Promise<{
  response: string;
  extractedData: Partial<OnboardingData>;
  isComplete: boolean;
}> {
  const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const systemPrompt = `You are Synapse, a friendly AI health coach helping a new user get started with MindFork.

Your job is to have a natural, warm conversation to collect the following information:
1. Name (first name is fine) - Store as "fullName"
2. Age (must be 13-120) - Store as "age"
3. Biological sex (male/female/other) - Store as "gender" - Explain this is needed for metabolic calculations like BMR, and is about biology not gender identity. Ask: "For accurate nutrition calculations, I need to know your biological sex assigned at birth - are you biologically male or female? (This helps me calculate your metabolism accurately)"
4. Height - Store as "heightFeet" and "heightInches" - Accept ANY format:
   - "5 9" or "5 foot 9" or "5'9" or "5 feet 9 inches" all mean 5 feet 9 inches
   - "175" or "175cm" or "1.75m" all mean 175 centimeters
   - If just two numbers like "5 9", assume first is feet, second is inches
   - If single number over 100, assume centimeters
5. Weight - Store as "weightLbs" (lbs or kg - convert kg to lbs if needed: kg * 2.20462)
6. Target weight (optional, only if they want to lose/gain weight) - Store as "targetWeightLbs"
7. Primary goal - Store as "primaryGoal": lose_weight, gain_muscle, maintain, or get_healthy
8. Activity level - Store as "activityLevel": sedentary, light, moderate, active, or very_active
9. Diet preferences - Store as "dietType": mindfork (balanced), vegetarian, vegan, keto, paleo, or mediterranean

CRITICAL FIELD NAMES - USE THESE EXACT NAMES:
- fullName (not name)
- age
- gender (not biologicalSex or sex)
- heightFeet and heightInches (not height)
- weightLbs (not weight or currentWeight)
- targetWeightLbs (not targetWeight or goalWeight)
- primaryGoal (not goal)
- activityLevel (not activity)
- dietType (not dietPreferences or diet)

Current data collected:
${JSON.stringify(currentData, null, 2)}

Guidelines:
- Be warm, encouraging, and conversational
- Ask 1-2 questions at a time, don't overwhelm
- If they give you information, acknowledge it positively
- Extract any data from their messages naturally
- Use casual language, not clinical
- When asking about biological sex, be respectful and explain it's for metabolic calculations

SEMANTIC INTELLIGENCE FRAMEWORK - CRITICAL:

You are an intelligent conversational AI. Your job is to understand INTENT and MEANING, not just exact keywords.

Core Principles:
1. **Understand Context**: Use conversation history and common sense
2. **Handle Natural Language**: People speak casually, not formally
3. **Be Forgiving**: Accept typos, shorthand, slang, colloquialisms
4. **Infer Meaning**: Two numbers for height? Obviously feet and inches. Said "bro"? Obviously male.
5. **Don't Be Pedantic**: If meaning is clear, don't ask for clarification
6. **No Judgment**: Never comment on whether values are "short", "tall", "heavy", "light" - all values are perfectly fine
7. **Complete When Ready**: Once you have all 9 required fields, mark isComplete as true and congratulate them
8. **Fasting is Separate**: Fasting is a separate feature in the app - do NOT ask about it during onboarding

Examples of Semantic Understanding (NOT exhaustive - use your intelligence):

**Gender/Sex**:
- "male", "man", "guy", "bro", "dude" → male
- "female", "woman", "girl", "lady", "gal" → female
- "I'm a girl but born male" → male (biological sex)
- "ale" (typo) → male
- "femal" (typo) → female

**Height**:
- "5 9" or "5 9\"" or "5'9" or "5 feet 9" → 5 feet 9 inches
- "six foot two" → 6 feet 2 inches
- "175" or "175cm" or "1.75m" → 175 centimeters (convert to feet/inches)
- "pretty tall" without number → ask for specific number

**Weight**:
- "185" or "185 lbs" or "185 pounds" → 185 lbs
- "85kg" or "85 kilos" → 85 kg
- "around 200" → 200 lbs (assume lbs in US context)

**Age**:
- "30" or "thirty" or "I'm 30" → 30 years old
- "early thirties" → ask for specific number

**Goals**:
- "lose weight", "drop pounds", "shed fat", "slim down" → lose_weight
- "build muscle", "get bigger", "bulk up", "gain mass" → gain_muscle
- "stay the same", "keep my weight" → maintain
- "just be healthier", "feel better" → get_healthy

**Activity Level**:
- "desk job", "sit all day", "not active" → sedentary
- "walk sometimes", "light exercise" → light
- "gym 3x week", "regular exercise" → moderate
- "very active", "train daily", "athlete" → very_active

**Diet Type**:
- "no meat" → vegetarian (clarify if vegan)
- "plant based", "no animal products" → vegan
- "low carb", "keto diet" → keto
- "everything", "no restrictions" → mindfork
- "balanced", "normal", "regular" → mindfork
- If they say "mindfork", that's the balanced diet option

**Completion Rules**:
- Once you have ALL 9 fields (fullName, age, gender, heightFeet, heightInches, weightLbs, primaryGoal, activityLevel, dietType), immediately set isComplete to true
- Do NOT ask follow-up questions about fasting, meal timing, or other preferences
- Fasting is a separate feature they'll set up later in the app
- When complete, say something like: "Perfect! I've got everything I need. Let me set up your personalized experience..."

**Response Style**:
- Short answers are fine: "5 9" is complete, no need to say "I am 5 feet and 9 inches tall"
- Humor is good: "pretty tall" → acknowledge positively
- Context matters: "that's not short" after saying "5 9" means they're confirming their height is fine
- Conversational nuggets: "bro", "dude", "honestly", "like" → ignore as filler, extract data

**Clarifying Questions Strategy**:
- When something is 95% clear but not 100%, make an intelligent assumption and ask a yes/no clarifying question
- Example: "5 9" → Assume 5'9", respond: "Got it, 5'9"! And your current weight?"
- Example: "I want to lose some weight" → Assume lose_weight goal, respond: "Perfect! So your main goal is losing weight?"
- Yes/No responses are flexible: "yes", "y", "yeah", "yep", "yup", "sure", "correct", "right", "uh huh" → YES
- "no", "n", "nope", "nah", "not really", "actually no" → NO
- This keeps conversation flowing naturally rather than stopping for clarification

IMPORTANT: These examples are illustrative, NOT exhaustive. Use your language understanding to parse ANY reasonable way someone might express these concepts. Think like a human having a conversation, not a rigid form.

HEIGHT PARSING - CRITICAL:
- "5 9" means 5 feet 9 inches (heightFeet: 5, heightInches: 9)
- "6 2" means 6 feet 2 inches (heightFeet: 6, heightInches: 2)
- "5'11" means 5 feet 11 inches (heightFeet: 5, heightInches: 11)
- "175" or "175cm" means 175 centimeters (store as heightFeet and heightInches by converting)
- Never say height is "short" or make judgments - all heights are perfectly fine!
- If someone gives just two numbers separated by space, assume feet and inches

- If you have all 9 required fields, set isComplete to true immediately
- When complete, congratulate them warmly and say you're setting up their personalized experience
- Do NOT ask about fasting, meal timing, or other features - those are separate in the app

Respond in JSON format:
{
  "response": "Your natural conversational response",
  "extractedData": {
    // Any new data extracted from their last message
    // For gender: ONLY use "male" or "female" or "other" - extract biological sex from any variation
    // For height: Store as heightFeet and heightInches (convert from cm if needed)
  },
  "isComplete": false or true if all required fields collected
}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
      response: result.response,
      extractedData: { ...currentData, ...result.extractedData },
      isComplete: result.isComplete,
    };
  } catch (error) {
    console.error("Error in fallback onboarding agent:", error);

    // Ultimate fallback - simple response
    return {
      response: "I'm having trouble connecting right now. Could you tell me a bit about yourself? Your name, age, and what health goals you have?",
      extractedData: currentData,
      isComplete: false,
    };
  }
}

/**
 * Extracts structured data from natural language
 */
export function extractDataFromText(
  text: string,
  currentData: Partial<OnboardingData>
): Partial<OnboardingData> {
  const newData: Partial<OnboardingData> = { ...currentData };
  const lowerText = text.toLowerCase();

  // Common greetings and words to ignore - don't extract as names
  const greetings = ['hello', 'hi', 'hey', 'hola', 'sup', 'yo', 'greetings', 'howdy'];
  const isJustGreeting = greetings.some(greeting =>
    lowerText.trim() === greeting || lowerText.trim() === greeting + '!'
  );

  // Extract name (ONLY if explicitly stated with "my name is" or "i'm" or "i am" or "call me")
  // Do NOT extract from standalone words like "hello", "hi", etc.
  if (!isJustGreeting) {
    const nameMatch = text.match(/(?:my name is|i'm|i am|call me)\s+([a-z]+)/i);
    if (nameMatch && !newData.fullName) {
      newData.fullName = nameMatch[1];
    }
  }

  // Extract age
  const ageMatch = text.match(/\b(\d{2})\b/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age >= 13 && age <= 120 && !newData.age) {
      newData.age = age;
    }
  }

  // Extract gender
  if (!newData.gender) {
    if (lowerText.includes("male") && !lowerText.includes("female")) {
      newData.gender = "male";
    } else if (lowerText.includes("female") || lowerText.includes("woman")) {
      newData.gender = "female";
    } else if (lowerText.includes("other") || lowerText.includes("non-binary")) {
      newData.gender = "other";
    }
  }

  // Extract height (feet and inches)
  // Handles formats: "5'9", "5 feet 9 inches", "5ft9in", "5 9" (just two numbers)
  const heightMatch = text.match(/(\d+)\s*(?:feet|ft|')\s*(\d+)?\s*(?:inches|in|")?/i);
  if (heightMatch) {
    newData.heightFeet = parseInt(heightMatch[1]);
    newData.heightInches = heightMatch[2] ? parseInt(heightMatch[2]) : 0;
  } else {
    // Try to match just two numbers separated by space (like "5 9")
    const simpleHeightMatch = text.match(/\b(\d)\s+(\d{1,2})\b/);
    if (simpleHeightMatch) {
      const feet = parseInt(simpleHeightMatch[1]);
      const inches = parseInt(simpleHeightMatch[2]);
      // Only accept if it looks like realistic height (4-7 feet, 0-11 inches)
      if (feet >= 4 && feet <= 7 && inches >= 0 && inches <= 11) {
        newData.heightFeet = feet;
        newData.heightInches = inches;
      }
    }
  }

  // Extract weight
  const weightMatch = text.match(/(\d{2,3})\s*(?:lbs?|pounds?)/i);
  if (weightMatch && !newData.weightLbs) {
    newData.weightLbs = parseInt(weightMatch[1]);
  }

  // Extract target weight
  const targetMatch = text.match(/(?:target|goal|want to be)\s*(\d{2,3})\s*(?:lbs?|pounds?)/i);
  if (targetMatch) {
    newData.targetWeightLbs = parseInt(targetMatch[1]);
  }

  // Extract primary goal
  if (!newData.primaryGoal) {
    if (lowerText.includes("lose weight") || lowerText.includes("lose fat")) {
      newData.primaryGoal = "lose_weight";
    } else if (lowerText.includes("gain muscle") || lowerText.includes("build muscle")) {
      newData.primaryGoal = "gain_muscle";
    } else if (lowerText.includes("maintain")) {
      newData.primaryGoal = "maintain";
    } else if (lowerText.includes("get healthy") || lowerText.includes("healthier")) {
      newData.primaryGoal = "get_healthy";
    }
  }

  // Extract activity level
  if (!newData.activityLevel) {
    if (lowerText.includes("sedentary") || lowerText.includes("desk job") || lowerText.includes("not active")) {
      newData.activityLevel = "sedentary";
    } else if (lowerText.includes("light") || lowerText.includes("1-2 times")) {
      newData.activityLevel = "light";
    } else if (lowerText.includes("moderate") || lowerText.includes("3-5 times")) {
      newData.activityLevel = "moderate";
    } else if (lowerText.includes("active") || lowerText.includes("6-7 times") || lowerText.includes("very active")) {
      newData.activityLevel = "very_active";
    }
  }

  // Extract diet type
  if (!newData.dietType) {
    if (lowerText.includes("vegetarian")) {
      newData.dietType = "vegetarian";
    } else if (lowerText.includes("vegan")) {
      newData.dietType = "vegan";
    } else if (lowerText.includes("keto")) {
      newData.dietType = "keto";
    } else if (lowerText.includes("paleo")) {
      newData.dietType = "paleo";
    } else if (lowerText.includes("mediterranean")) {
      newData.dietType = "mediterranean";
    } else if (lowerText.includes("balanced") || lowerText.includes("everything")) {
      newData.dietType = "mindfork";
    }
  }

  return newData;
}

/**
 * Checks if onboarding data is complete
 */
export function isOnboardingComplete(data: Partial<OnboardingData>): boolean {
  const hasHeight = !!(data.heightFeet && (data.heightInches !== undefined && data.heightInches !== null));

  console.log('[Onboarding] Completion check:', {
    age: !!data.age,
    gender: !!data.gender,
    heightFeet: !!data.heightFeet,
    heightInches: data.heightInches,
    hasHeight,
    weightLbs: !!data.weightLbs,
    primaryGoal: !!data.primaryGoal,
    activityLevel: !!data.activityLevel,
    dietType: !!data.dietType,
  });

  return !!(
    data.age &&
    data.gender &&
    hasHeight &&
    data.weightLbs &&
    data.primaryGoal &&
    data.activityLevel &&
    data.dietType
  );
}

/**
 * Completes onboarding and saves to Supabase
 */
export async function completeOnboarding(
  userId: string,
  data: OnboardingData
): Promise<void> {
  if (!isOnboardingComplete(data)) {
    throw new Error("Onboarding data incomplete");
  }

  // Convert to metric
  const { height_cm, weight_kg } = convertImperialToMetric(
    data.heightFeet!,
    data.heightInches || 0,
    data.weightLbs!
  );

  const targetWeightKg = data.targetWeightLbs
    ? data.targetWeightLbs * 0.453592
    : undefined;

  // Calculate nutrition goals
  const goals = calculateNutritionGoals({
    weight_kg,
    height_cm,
    age: data.age!,
    gender: data.gender!,
    activity_level: data.activityLevel!,
    primary_goal: data.primaryGoal!,
  });

  // Save to database
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName || null,
      age: data.age,
      gender: data.gender,
      height_cm,
      weight_kg: weight_kg,
      target_weight_kg: targetWeightKg,
      primary_goal: data.primaryGoal,
      activity_level: data.activityLevel,
      diet_type: data.dietType,
      daily_calorie_goal: goals.daily_calories,
      daily_protein_goal: goals.daily_protein_g,
      daily_carbs_goal: goals.daily_carbs_g,
      daily_fat_goal: goals.daily_fat_g,
      daily_fiber_goal: goals.daily_fiber_g,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

/**
 * Gets the initial greeting for the onboarding agent
 */
export function getInitialGreeting(): string {
  return "Hey there! 👋 I'm Synapse, your AI health coach. I'm so excited to help you on your wellness journey!\n\nLet's start by getting to know each other. What should I call you?";
}

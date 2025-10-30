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
1. Name (first name is fine)
2. Age (must be 13-120)
3. Biological sex (male/female/other) - Explain this is needed for metabolic calculations like BMR, and is about biology not gender identity. Ask: "For accurate nutrition calculations, I need to know your biological sex assigned at birth - are you biologically male or female? (This helps me calculate your metabolism accurately)"
4. Height (feet and inches, or cm)
5. Weight (lbs or kg)
6. Target weight (optional, only if they want to lose/gain weight)
7. Primary goal: lose_weight, gain_muscle, maintain, or get_healthy
8. Activity level: sedentary, light, moderate, active, or very_active
9. Diet preferences: mindfork (balanced), vegetarian, vegan, keto, paleo, or mediterranean

Current data collected:
${JSON.stringify(currentData, null, 2)}

Guidelines:
- Be warm, encouraging, and conversational
- Ask 1-2 questions at a time, don't overwhelm
- If they give you information, acknowledge it positively
- Extract any data from their messages naturally
- Use casual language, not clinical
- When asking about biological sex, be respectful and explain it's for metabolic calculations
- If you have all required fields, congratulate them and say you are setting up their personalized experience

Respond in JSON format:
{
  "response": "Your natural conversational response",
  "extractedData": {
    // Any new data extracted from their last message
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

  // Extract name (if "my name is" or "i'm" or "i am")
  const nameMatch =
    text.match(/(?:my name is|i'm|i am|call me)\s+([a-z]+)/i) ||
    text.match(/^([A-Z][a-z]+)\s*$/);
  if (nameMatch && !newData.fullName) {
    newData.fullName = nameMatch[1];
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
  const heightMatch = text.match(/(\d+)\s*(?:feet|ft|')\s*(\d+)?\s*(?:inches|in|")?/i);
  if (heightMatch) {
    newData.heightFeet = parseInt(heightMatch[1]);
    newData.heightInches = heightMatch[2] ? parseInt(heightMatch[2]) : 0;
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
  return !!(
    data.age &&
    data.gender &&
    data.heightFeet &&
    data.heightInches !== undefined &&
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

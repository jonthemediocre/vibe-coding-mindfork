/**
 * Goal Calculations Utility
 * Calculates personalized calorie and macro goals based on user profile
 */

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'get_healthy';
export type DietType = 'mindfork' | 'keto' | 'paleo' | 'mediterranean' | 'vegan' | 'vegetarian';

export interface UserProfile {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: Gender;
  activity_level: ActivityLevel;
  primary_goal: Goal;
  diet_type?: DietType;
}

export interface NutritionGoals {
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  daily_fiber_g: number;
}

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
 * Most accurate formula for modern populations
 */
export function calculateBMR(weight_kg: number, height_cm: number, age: number, gender: Gender): number {
  // Base calculation for male
  let bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age;

  if (gender === 'male') {
    bmr += 5;
  } else if (gender === 'female') {
    bmr -= 161;
  } else {
    // For 'other', use average
    bmr -= 78;
  }

  return Math.round(bmr);
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * BMR multiplied by activity factor
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const activityMultipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,      // Little or no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    active: 1.725,       // Heavy exercise 6-7 days/week
    very_active: 1.9,    // Very heavy exercise, physical job
  };

  const multiplier = activityMultipliers[activityLevel] || 1.55;
  return Math.round(bmr * multiplier);
}

/**
 * Adjust TDEE based on user goal
 */
export function adjustCaloriesForGoal(tdee: number, goal: Goal): number {
  switch (goal) {
    case 'lose_weight':
      // 500 calorie deficit for ~0.5kg per week weight loss
      return Math.round(tdee - 500);
    case 'gain_muscle':
      // 300 calorie surplus for muscle gain
      return Math.round(tdee + 300);
    case 'maintain':
    case 'get_healthy':
    default:
      // Maintain weight
      return tdee;
  }
}

/**
 * Calculate protein goal based on weight and goal
 */
export function calculateProteinGoal(weight_kg: number, goal: Goal): number {
  let gramsPerKg = 1.6; // Default for general health

  switch (goal) {
    case 'gain_muscle':
      gramsPerKg = 2.0; // Higher protein for muscle building
      break;
    case 'lose_weight':
      gramsPerKg = 1.8; // Higher protein to preserve muscle during weight loss
      break;
    case 'maintain':
    case 'get_healthy':
    default:
      gramsPerKg = 1.6; // Moderate protein for maintenance
      break;
  }

  return Math.round(weight_kg * gramsPerKg);
}

/**
 * Calculate macro distribution based on diet type and calories
 */
export function calculateMacros(
  dailyCalories: number,
  proteinGrams: number,
  dietType: DietType = 'mindfork'
): { carbs: number; fat: number } {
  // Protein provides 4 calories per gram
  const proteinCalories = proteinGrams * 4;
  const remainingCalories = dailyCalories - proteinCalories;

  let carbPercentage = 0.45; // Default: 45% of remaining calories
  let fatPercentage = 0.35;  // Default: 35% of remaining calories

  // Adjust based on diet type
  switch (dietType) {
    case 'keto':
      carbPercentage = 0.05; // Very low carb
      fatPercentage = 0.75;  // Very high fat
      break;
    case 'paleo':
      carbPercentage = 0.30; // Moderate-low carb
      fatPercentage = 0.40;  // Moderate-high fat
      break;
    case 'mediterranean':
      carbPercentage = 0.40; // Moderate carb
      fatPercentage = 0.35;  // Moderate fat (healthy fats)
      break;
    case 'vegan':
    case 'vegetarian':
      carbPercentage = 0.50; // Higher carb
      fatPercentage = 0.30;  // Moderate fat
      break;
    case 'mindfork':
    default:
      carbPercentage = 0.45; // Balanced
      fatPercentage = 0.35;  // Balanced
      break;
  }

  // Calculate grams (carbs = 4 cal/g, fat = 9 cal/g)
  const carbCalories = remainingCalories * carbPercentage;
  const fatCalories = remainingCalories * fatPercentage;

  return {
    carbs: Math.round(carbCalories / 4),
    fat: Math.round(fatCalories / 9),
  };
}

/**
 * Calculate fiber goal (based on calories)
 */
export function calculateFiberGoal(dailyCalories: number): number {
  // Recommended: 14g per 1000 calories
  return Math.round((dailyCalories / 1000) * 14);
}

/**
 * Main function: Calculate all nutrition goals from user profile
 */
export function calculateNutritionGoals(profile: UserProfile): NutritionGoals {
  // Step 1: Calculate BMR
  const bmr = calculateBMR(
    profile.weight_kg,
    profile.height_cm,
    profile.age,
    profile.gender
  );

  // Step 2: Calculate TDEE
  const tdee = calculateTDEE(bmr, profile.activity_level);

  // Step 3: Adjust for goal
  const dailyCalories = adjustCaloriesForGoal(tdee, profile.primary_goal);

  // Step 4: Calculate protein
  const proteinGrams = calculateProteinGoal(profile.weight_kg, profile.primary_goal);

  // Step 5: Calculate macros
  const { carbs, fat } = calculateMacros(
    dailyCalories,
    proteinGrams,
    profile.diet_type || 'mindfork'
  );

  // Step 6: Calculate fiber
  const fiber = calculateFiberGoal(dailyCalories);

  return {
    daily_calories: dailyCalories,
    daily_protein_g: proteinGrams,
    daily_carbs_g: carbs,
    daily_fat_g: fat,
    daily_fiber_g: fiber,
  };
}

/**
 * Validate nutrition goals are within healthy ranges
 */
export function validateNutritionGoals(goals: NutritionGoals): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (goals.daily_calories < 1200 || goals.daily_calories > 4000) {
    errors.push('Daily calories should be between 1200 and 4000');
  }

  if (goals.daily_protein_g < 50 || goals.daily_protein_g > 300) {
    errors.push('Daily protein should be between 50g and 300g');
  }

  if (goals.daily_carbs_g < 50 || goals.daily_carbs_g > 500) {
    errors.push('Daily carbs should be between 50g and 500g');
  }

  if (goals.daily_fat_g < 30 || goals.daily_fat_g > 150) {
    errors.push('Daily fat should be between 30g and 150g');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert imperial units to metric
 */
export function convertImperialToMetric(
  heightFeet: number,
  heightInches: number,
  weightLbs: number
): { height_cm: number; weight_kg: number } {
  const totalInches = heightFeet * 12 + heightInches;
  const height_cm = totalInches * 2.54;
  const weight_kg = weightLbs * 0.453592;

  return {
    height_cm: Math.round(height_cm * 10) / 10,
    weight_kg: Math.round(weight_kg * 10) / 10,
  };
}

/**
 * Quick calculation example
 */
export function exampleCalculation(): NutritionGoals {
  const profile: UserProfile = {
    weight_kg: 75,
    height_cm: 175,
    age: 30,
    gender: 'male',
    activity_level: 'moderate',
    primary_goal: 'maintain',
    diet_type: 'mindfork',
  };

  return calculateNutritionGoals(profile);
}

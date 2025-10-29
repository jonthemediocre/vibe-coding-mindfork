/**
 * Smart Food Recommendation Engine Types
 * 
 * Core TypeScript interfaces and types for the recommendation system
 */

// Core recommendation types
export interface RecommendationContext {
  userId: string;
  currentDate: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  remainingTargets: RemainingTargets;
  userPreferences: UserDietaryPreferences;
  recentFoodLogs: FoodLogEntry[];
  workoutSchedule?: WorkoutContext;
  location?: LocationContext;
  fastingStatus?: FastingStatus;
}

export interface FoodRecommendation {
  id: string; // Unique recommendation ID
  foodId: string;
  name: string;
  brand?: string;
  compatibilityScore: number; // 0-100
  recommendedPortion: RecommendedPortion;
  reasonsForRecommendation: RecommendationReason[];
  nutritionalHighlights: string[];
  preparationSuggestions?: string[];
  alternativePortions: PortionOption[];
  mindForkTier: MindForkTier;
  estimatedSatisfaction?: number; // 0-100 based on user history
}

export interface RecommendedPortion {
  amount: number;
  unit: string;
  calories: number;
  macros: MacroNutrients;
  micronutrients?: MicroNutrients;
}

export interface PortionOption {
  amount: number;
  unit: string;
  calories: number;
  macros: MacroNutrients;
  fitScore: number; // 0-100
  description: string; // "Light snack", "Full meal", etc.
}

export interface RecommendationReason {
  type: RecommendationReasonType;
  description: string;
  importance: 'high' | 'medium' | 'low';
  icon?: string; // Emoji or icon name
}

export type RecommendationReasonType = 
  | 'macro_fit' 
  | 'nutrient_gap' 
  | 'goal_alignment' 
  | 'preference_match' 
  | 'timing_appropriate'
  | 'energy_density'
  | 'satiety_factor'
  | 'variety_boost'
  | 'seasonal_fresh'
  | 'quick_prep';

// Remaining daily targets
export interface RemainingTargets {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber: number; // grams
  percentageOfDayRemaining: number; // 0-100
  mealsRemaining: number;
  hoursUntilBedtime?: number;
}

// Macro compatibility scoring
export interface MacroCompatibility {
  overallScore: number; // 0-100
  caloriesFit: number; // How well calories fit (-100 to 100)
  proteinFit: number;
  carbsFit: number;
  fatFit: number;
  fiberFit: number;
  wouldExceedTargets: boolean;
  excessAmount?: ExcessMacros;
  balanceScore: number; // How well it balances remaining ratios
}

export interface ExcessMacros {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface OptimizedPortion {
  recommendedAmount: number;
  unit: string;
  macroFitScore: number;
  alternativePortions: PortionOption[];
  reasoning: string;
}

// User dietary preferences
export interface UserDietaryPreferences {
  dietType: DietType;
  foodExclusions: string[]; // Food IDs or names to avoid
  allergens: string[]; // Allergen categories to avoid
  culturalPreferences?: CulturalDietPreferences;
  customRestrictions?: CustomRestriction[];
  preferredCuisines?: string[];
  dislikedIngredients?: string[];
  cookingSkillLevel?: 'beginner' | 'intermediate' | 'advanced';
  availableTime?: 'quick' | 'moderate' | 'extended'; // Cooking time preference
}

export type DietType = 
  | 'mindfork' 
  | 'vegan' 
  | 'vegetarian' 
  | 'keto' 
  | 'paleo' 
  | 'mediterranean' 
  | 'low_carb' 
  | 'high_protein'
  | 'intermittent_fasting'
  | 'whole30'
  | 'dash';

export interface CulturalDietPreferences {
  region?: string; // 'mediterranean', 'asian', 'latin', etc.
  religiousRestrictions?: string[]; // 'halal', 'kosher', 'hindu_vegetarian'
  traditionalFoods?: string[]; // Preferred traditional foods
}

export interface CustomRestriction {
  name: string;
  description: string;
  restrictedIngredients: string[];
  severity: 'strict' | 'preference';
}

export interface PreferenceCompatibility {
  isCompatible: boolean;
  violatedRestrictions: string[];
  compatibilityScore: number; // 0-100
  suggestedModifications?: string[];
  alternativeFoods?: string[]; // Food IDs for alternatives
}

// Nutrient analysis
export interface NutrientGapAnalysis {
  topDeficiencies: NutrientDeficiency[];
  overConsumption: NutrientExcess[];
  balanceScore: number; // 0-100
  recommendations: string[];
  priorityNutrients: string[]; // Nutrients to focus on today
}

export interface NutrientDeficiency {
  nutrient: string;
  currentIntake: number;
  targetIntake: number;
  deficitPercentage: number;
  importance: 'critical' | 'moderate' | 'minor';
  healthImpact?: string;
}

export interface NutrientExcess {
  nutrient: string;
  currentIntake: number;
  recommendedLimit: number;
  excessPercentage: number;
  healthConcern?: string;
}

export interface NutrientRichFood {
  foodId: string;
  name: string;
  keyNutrients: KeyNutrient[];
  nutrientDensityScore: number; // 0-100
  synergisticNutrients?: string[]; // Nutrients that work well together
  bioavailability?: number; // 0-100, how well nutrients are absorbed
}

export interface KeyNutrient {
  nutrient: string;
  amountPer100g: number;
  percentDailyValue: number;
  bioavailabilityFactor?: number;
}

export interface NutrientCombination {
  foods: string[]; // Food IDs
  combinedNutrients: string[];
  synergisticBenefits: string[];
  preparationSuggestion: string;
  totalNutrientScore: number;
}

// Compatibility scoring
export interface CompatibilityScore {
  overallScore: number; // 0-100
  componentScores: ComponentScores;
  confidenceLevel: number; // 0-100
  reasoning: string[];
  improvementSuggestions?: string[];
}

export interface ComponentScores {
  macroFit: number; // 0-100
  nutrientDensity: number; // 0-100
  preferenceMatch: number; // 0-100
  goalAlignment: number; // 0-100
  timingAppropriate: number; // 0-100
  personalPreference: number; // 0-100
  varietyBonus: number; // 0-100
  seasonalBonus: number; // 0-100
}

export interface MindForkFoodScore {
  tier: MindForkTier;
  score: number; // 0-100
  energyDensity: number; // kcal per 100g
  processingLevel: ProcessingLevel;
  nutrientDensity: number; // Nutrients per 100 kcal
  polyphenolBonus: number;
  omega3Bonus: number;
  upfPenalty: number; // Ultra-processed food penalty
  satietyScore: number; // 0-100
}

export type MindForkTier = 
  | 'pink_fire'    // Exceptional (90-100)
  | 'brain_smart'  // Excellent (80-89)
  | 'good'         // Good (70-79)
  | 'caution'      // Moderate (60-69)
  | 'heavy'        // Poor (40-59)
  | 'soot_bad';    // Avoid (0-39)

export type ProcessingLevel = 1 | 2 | 3 | 4; // 1=unprocessed, 4=ultra-processed

// Personalization
export interface PersonalizationFactors {
  userHistory: PersonalFoodHistory;
  learningConfidence: number; // 0-100
  interactionCount: number;
  preferenceStrength: PreferenceStrength;
  seasonalTrends?: SeasonalTrends;
}

export interface PersonalFoodHistory {
  frequentlyChosenFoods: string[]; // Food IDs
  frequentlyIgnoredFoods: string[]; // Food IDs
  averagePortionSizes: Record<string, number>; // Food category -> portion size
  mealTimingPatterns: MealTimingPattern[];
  macroPreferences: MacroPreferencePattern;
  cuisinePreferences: Record<string, number>; // Cuisine -> preference score
}

export interface PreferenceStrength {
  dietary: number; // 0-100, how strictly user follows diet
  portion: number; // 0-100, how consistent portion sizes are
  timing: number; // 0-100, how consistent meal timing is
  variety: number; // 0-100, how much user likes variety
}

export interface MealTimingPattern {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  averageTime: string; // HH:MM format
  consistency: number; // 0-100
  preferredFoodTypes: string[];
}

export interface MacroPreferencePattern {
  proteinPreference: number; // -100 to 100 (negative = avoids, positive = seeks)
  carbPreference: number;
  fatPreference: number;
  fiberPreference: number;
  consistencyScore: number; // 0-100
}

export interface SeasonalTrends {
  spring: string[]; // Preferred food categories
  summer: string[];
  fall: string[];
  winter: string[];
  currentSeason: 'spring' | 'summer' | 'fall' | 'winter';
}

// Context types
export interface TimeContext {
  currentTime: string; // HH:MM format
  mealWindow: MealWindow;
  dayOfWeek: number; // 0-6, Sunday = 0
  isWeekend: boolean;
  timeUntilNextMeal?: number; // Hours
}

export interface MealWindow {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'late_night';
  appropriateness: number; // 0-100
  typicalFoods: string[]; // Food categories typically eaten at this time
}

export interface WorkoutContext {
  hasWorkoutToday: boolean;
  workoutTime?: string; // HH:MM format
  workoutType?: 'cardio' | 'strength' | 'mixed' | 'yoga' | 'sports';
  isPreWorkout: boolean;
  isPostWorkout: boolean;
  hoursUntilWorkout?: number;
  hoursSinceWorkout?: number;
}

export interface LocationContext {
  country?: string;
  region?: string;
  seasonalAvailability?: string[]; // Foods in season
  localCuisine?: string[];
  culturalFoods?: string[];
}

export interface FastingStatus {
  isCurrentlyFasting: boolean;
  fastingType?: '16:8' | '18:6' | '20:4' | '24h' | 'custom';
  hoursIntoFast?: number;
  hoursUntilBreakFast?: number;
  isBreakingFast: boolean;
}

// Goal alignment
export interface GoalAlignment {
  primaryGoal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'get_healthy';
  alignmentScore: number; // 0-100
  goalSpecificFactors: GoalSpecificFactors;
  progressTowardGoal: number; // 0-100
}

export interface GoalSpecificFactors {
  satietyImportance?: number; // For weight loss
  proteinImportance?: number; // For muscle gain
  balanceImportance?: number; // For maintenance
  nutrientDensityImportance?: number; // For health
  energyTimingImportance?: number; // For performance
}

// User interactions and feedback
export interface UserInteraction {
  type: InteractionType;
  foodId?: string;
  recommendationId?: string;
  timestamp: string;
  context: InteractionContext;
  feedback?: UserFeedback;
}

export type InteractionType = 
  | 'recommendation_viewed'
  | 'recommendation_selected'
  | 'recommendation_ignored'
  | 'recommendation_saved'
  | 'recommendation_dismissed'
  | 'food_logged'
  | 'feedback_given'
  | 'portion_adjusted';

export interface InteractionContext {
  screenName: string;
  mealType?: string;
  timeOfDay: string;
  remainingCalories: number;
  recommendationRank?: number; // Position in recommendation list
}

export interface UserFeedback {
  rating: number; // 1-5
  comment?: string;
  categories?: FeedbackCategory[];
  wouldRecommendAgain: boolean;
}

export type FeedbackCategory = 
  | 'taste_good'
  | 'easy_to_prepare'
  | 'filling'
  | 'healthy'
  | 'convenient'
  | 'affordable'
  | 'too_much_prep'
  | 'not_filling'
  | 'too_expensive'
  | 'didnt_like_taste';

// Recipe recommendations
export interface RecipeRecommendation {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  totalNutrition: MacroNutrients & { micronutrients?: MicroNutrients };
  prepTime: number; // minutes
  cookTime: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  compatibilityScore: number; // 0-100
  mindForkScore: number; // 0-100
  tags: string[];
  substitutions?: IngredientSubstitution[];
}

export interface RecipeIngredient {
  foodId: string;
  name: string;
  amount: number;
  unit: string;
  isOptional: boolean;
  nutrition: MacroNutrients;
}

export interface IngredientSubstitution {
  originalIngredient: string;
  substitute: string;
  reason: string; // "For vegan diet", "Lower calories", etc.
  nutritionImpact: string;
}

// Shared nutrition types
export interface MacroNutrients {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber: number; // grams
  sugar?: number; // grams
  sodium?: number; // mg
}

export interface MicroNutrients {
  vitaminA?: number; // mcg
  vitaminC?: number; // mg
  vitaminD?: number; // mcg
  vitaminE?: number; // mg
  vitaminK?: number; // mcg
  thiamine?: number; // mg
  riboflavin?: number; // mg
  niacin?: number; // mg
  vitaminB6?: number; // mg
  folate?: number; // mcg
  vitaminB12?: number; // mcg
  calcium?: number; // mg
  iron?: number; // mg
  magnesium?: number; // mg
  phosphorus?: number; // mg
  potassium?: number; // mg
  zinc?: number; // mg
  selenium?: number; // mcg
  omega3?: number; // g
  polyphenols?: number; // mg
}

export interface FoodLogEntry {
  id: string;
  userId: string;
  foodId: string;
  amount: number;
  unit: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  loggedAt: string;
  nutrition: MacroNutrients;
}

// Error types
export class RecommendationError extends Error {
  constructor(
    message: string,
    public code: RecommendationErrorCode,
    public context?: any
  ) {
    super(message);
    this.name = 'RecommendationError';
  }
}

export enum RecommendationErrorCode {
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  NO_COMPATIBLE_FOODS = 'NO_COMPATIBLE_FOODS',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  INVALID_PREFERENCES = 'INVALID_PREFERENCES',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

// Service configuration
export interface RecommendationServiceConfig {
  maxRecommendations: number; // Default: 10
  cacheTimeout: number; // milliseconds, default: 5 minutes
  enablePersonalization: boolean; // Default: true
  enableSeasonalBoosts: boolean; // Default: true
  enableMindForkScoring: boolean; // Default: true
  fallbackStrategy: 'popular_foods' | 'random_compatible' | 'cached_only';
  performanceMode: 'fast' | 'balanced' | 'comprehensive';
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  contextHash: string;
}

export interface RecommendationCacheEntry extends CacheEntry<FoodRecommendation[]> {
  userId: string;
  context: Partial<RecommendationContext>;
}

// Analytics and monitoring
export interface RecommendationMetrics {
  totalRecommendations: number;
  averageCompatibilityScore: number;
  selectionRate: number; // Percentage of recommendations selected
  userSatisfactionScore: number; // Average rating
  cacheHitRate: number;
  averageResponseTime: number; // milliseconds
  errorRate: number;
}

export interface PerformanceMetrics {
  calculationTime: number; // milliseconds
  databaseQueryTime: number; // milliseconds
  cacheOperationTime: number; // milliseconds
  totalResponseTime: number; // milliseconds
  memoryUsage?: number; // bytes
}

// Export utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
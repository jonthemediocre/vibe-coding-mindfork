/**
 * CompatibilityScorer
 * 
 * Calculates overall compatibility scores and integrates MindFork food scoring
 */

import { supabase } from '../../lib/supabase';
import type {
  CompatibilityScore,
  ComponentScores,
  MindForkFoodScore,
  MindForkTier,
  ProcessingLevel,
  PersonalizationFactors,
  MacroCompatibility,
  NutrientGapAnalysis,
  UserDietaryPreferences,
  TimeContext,
  GoalAlignment,
  PersonalFoodHistory,
  FoodRecommendation,
} from '../../types/recommendations';
import type { FoodItem } from './MacroCalculator';

export interface ScoringContext {
  macroCompatibility: MacroCompatibility;
  nutrientGaps: NutrientGapAnalysis;
  userPreferences: UserDietaryPreferences;
  timeContext: TimeContext;
  goalAlignment: GoalAlignment;
  personalHistory: PersonalFoodHistory;
}

export interface FoodProcessingData {
  processingLevel: ProcessingLevel;
  ingredients: string[];
  additives: string[];
  preservatives: string[];
  artificialIngredients: string[];
}

export class CompatibilityScorer {
  private static instance: CompatibilityScorer;
  private mindForkScoreCache: Map<string, MindForkFoodScore>;
  private processingDatabase: Map<string, FoodProcessingData>;
  private polyphenolDatabase: Map<string, number>; // foodId -> polyphenol content (mg/100g)
  private omega3Database: Map<string, number>; // foodId -> omega-3 content (g/100g)

  private constructor() {
    this.mindForkScoreCache = new Map();
    this.processingDatabase = new Map();
    this.polyphenolDatabase = new Map();
    this.omega3Database = new Map();
    this.initializeProcessingDatabase();
    this.initializePolyphenolDatabase();
    this.initializeOmega3Database();
  }

  public static getInstance(): CompatibilityScorer {
    if (!CompatibilityScorer.instance) {
      CompatibilityScorer.instance = new CompatibilityScorer();
    }
    return CompatibilityScorer.instance;
  }

  /**
   * Calculate MindFork food score with 6-tier system
   */
  public async calculateMindForkScore(food: FoodItem): Promise<MindForkFoodScore> {
    try {
      // Check cache first
      const cached = this.mindForkScoreCache.get(food.id);
      if (cached) {
        return cached;
      }

      // Calculate energy density (kcal per 100g)
      const energyDensity = food.nutrition_per_100g.calories;

      // Get processing level
      const processingData = this.processingDatabase.get(food.id);
      const processingLevel = processingData?.processingLevel || this.estimateProcessingLevel(food);

      // Calculate nutrient density (nutrients per 100 kcal)
      const nutrientDensity = this.calculateNutrientDensityScore(food);

      // Get polyphenol content and calculate bonus
      const polyphenolContent = this.polyphenolDatabase.get(food.id) || 0;
      const polyphenolBonus = this.calculatePolyphenolBonus(polyphenolContent);

      // Get omega-3 content and calculate bonus
      const omega3Content = this.omega3Database.get(food.id) || 0;
      const omega3Bonus = this.calculateOmega3Bonus(omega3Content);

      // Calculate ultra-processed food (UPF) penalty
      const upfPenalty = this.calculateUPFPenalty(processingLevel, processingData);

      // Calculate satiety score
      const satietyScore = this.calculateSatietyScore(food);

      // Calculate base score using sigmoid function
      const baseScore = this.calculateBaseScore(energyDensity, nutrientDensity, satietyScore);

      // Apply bonuses and penalties
      let finalScore = baseScore + polyphenolBonus + omega3Bonus - upfPenalty;
      finalScore = Math.max(0, Math.min(100, finalScore));

      // Determine tier based on final score
      const tier = this.determineMindForkTier(finalScore);

      const mindForkScore: MindForkFoodScore = {
        tier,
        score: Math.round(finalScore),
        energyDensity,
        processingLevel,
        nutrientDensity,
        polyphenolBonus,
        omega3Bonus,
        upfPenalty,
        satietyScore,
      };

      // Cache the result
      this.mindForkScoreCache.set(food.id, mindForkScore);

      // Store in database for future use
      await this.cacheMindForkScore(food.id, mindForkScore);

      return mindForkScore;
    } catch (error) {
      console.error('CompatibilityScorer: Error calculating MindFork score:', error);
      return this.getDefaultMindForkScore();
    }
  }

  /**
   * Calculate overall compatibility score combining all factors
   */
  public async calculateOverallScore(
    food: FoodItem, 
    context: ScoringContext
  ): Promise<CompatibilityScore> {
    try {
      // Calculate component scores
      const macroFit = context.macroCompatibility.overallScore;
      const nutrientDensity = await this.calculateNutrientDensityComponent(food, context.nutrientGaps);
      const preferenceMatch = await this.calculatePreferenceMatchComponent(food, context.userPreferences);
      const goalAlignment = this.calculateGoalAlignmentComponent(food, context.goalAlignment);
      const timingAppropriate = this.calculateTimingComponent(food, context.timeContext);
      const personalPreference = this.calculatePersonalPreferenceComponent(food, context.personalHistory);
      const varietyBonus = this.calculateVarietyBonus(food, context.personalHistory);
      const seasonalBonus = this.calculateSeasonalBonus(food, context.timeContext);

      const componentScores: ComponentScores = {
        macroFit,
        nutrientDensity,
        preferenceMatch,
        goalAlignment,
        timingAppropriate,
        personalPreference,
        varietyBonus,
        seasonalBonus,
      };

      // Calculate weighted overall score
      const overallScore = this.calculateWeightedScore(componentScores);

      // Calculate confidence level based on data quality
      const confidenceLevel = this.calculateConfidenceLevel(context, food);

      // Generate reasoning for the score
      const reasoning = this.generateScoreReasoning(componentScores, food);

      // Generate improvement suggestions if score is low
      const improvementSuggestions = overallScore < 70 ? 
        this.generateImprovementSuggestions(componentScores, food) : 
        undefined;

      return {
        overallScore: Math.round(overallScore),
        componentScores,
        confidenceLevel: Math.round(confidenceLevel),
        reasoning,
        improvementSuggestions,
      };
    } catch (error) {
      console.error('CompatibilityScorer: Error calculating overall score:', error);
      return this.getDefaultCompatibilityScore();
    }
  }

  /**
   * Apply personalization boosts based on user interaction history
   */
  public calculatePersonalizationBoost(
    food: FoodItem, 
    personalizationFactors: PersonalizationFactors
  ): number {
    try {
      let boost = 0;
      const { userHistory, learningConfidence, preferenceStrength } = personalizationFactors;

      // Boost for frequently chosen foods
      if (userHistory.frequentlyChosenFoods.includes(food.id)) {
        boost += 15 * (learningConfidence / 100);
      }

      // Penalty for frequently ignored foods
      if (userHistory.frequentlyIgnoredFoods.includes(food.id)) {
        boost -= 20 * (learningConfidence / 100);
      }

      // Boost for preferred food categories
      const foodCategory = this.getFoodCategory(food);
      const categoryPreference = this.getCategoryPreference(foodCategory, userHistory);
      boost += categoryPreference * (preferenceStrength.dietary / 100);

      // Boost for preferred cuisines
      const cuisineMatch = this.getCuisineMatch(food, userHistory.cuisinePreferences);
      boost += cuisineMatch * 0.1;

      // Seasonal preferences
      if (personalizationFactors.seasonalTrends) {
        const seasonalMatch = this.getSeasonalMatch(food, personalizationFactors.seasonalTrends);
        boost += seasonalMatch * 5;
      }

      return Math.max(-30, Math.min(30, boost)); // Cap boost between -30 and +30
    } catch (error) {
      console.error('CompatibilityScorer: Error calculating personalization boost:', error);
      return 0;
    }
  }

  /**
   * Rank and sort recommendations by compatibility score
   */
  public rankRecommendations(recommendations: FoodRecommendation[]): FoodRecommendation[] {
    try {
      // Sort by compatibility score (highest first)
      const ranked = [...recommendations].sort((a, b) => {
        // Primary sort: compatibility score
        if (b.compatibilityScore !== a.compatibilityScore) {
          return b.compatibilityScore - a.compatibilityScore;
        }

        // Secondary sort: estimated satisfaction (if available)
        if (b.estimatedSatisfaction && a.estimatedSatisfaction) {
          return b.estimatedSatisfaction - a.estimatedSatisfaction;
        }

        // Tertiary sort: MindFork tier (Pink Fire > Brain Smart > etc.)
        const tierOrder = {
          pink_fire: 6,
          brain_smart: 5,
          good: 4,
          caution: 3,
          heavy: 2,
          soot_bad: 1,
        };

        return tierOrder[b.mindForkTier] - tierOrder[a.mindForkTier];
      });

      // Apply diversity scoring to ensure variety
      return this.applyDiversityScoring(ranked);
    } catch (error) {
      console.error('CompatibilityScorer: Error ranking recommendations:', error);
      return recommendations;
    }
  }

  // Private helper methods

  private calculateNutrientDensityScore(food: FoodItem): number {
    const nutrition = food.nutrition_per_100g;
    const calories = nutrition.calories || 1; // Avoid division by zero

    // Calculate nutrients per 100 kcal
    const proteinPer100kcal = (nutrition.protein / calories) * 100;
    const fiberPer100kcal = (nutrition.fiber / calories) * 100;

    // Score based on protein and fiber density
    let score = 0;
    
    // Protein scoring (higher is better)
    if (proteinPer100kcal >= 20) score += 30;
    else if (proteinPer100kcal >= 15) score += 25;
    else if (proteinPer100kcal >= 10) score += 20;
    else if (proteinPer100kcal >= 5) score += 10;

    // Fiber scoring (higher is better)
    if (fiberPer100kcal >= 10) score += 25;
    else if (fiberPer100kcal >= 7) score += 20;
    else if (fiberPer100kcal >= 5) score += 15;
    else if (fiberPer100kcal >= 3) score += 10;

    // Calorie density penalty (lower is better for most foods)
    if (calories <= 100) score += 20;
    else if (calories <= 200) score += 15;
    else if (calories <= 300) score += 10;
    else if (calories <= 400) score += 5;

    return Math.min(75, score); // Cap at 75 for base nutrient density
  }

  private estimateProcessingLevel(food: FoodItem): ProcessingLevel {
    const name = food.name.toLowerCase();
    const id = food.id.toLowerCase();

    // Ultra-processed (Level 4)
    if (name.includes('processed') || name.includes('packaged') || 
        name.includes('frozen meal') || name.includes('instant')) {
      return 4;
    }

    // Processed (Level 3)
    if (name.includes('canned') || name.includes('jarred') || 
        name.includes('bottled') || name.includes('preserved')) {
      return 3;
    }

    // Minimally processed (Level 2)
    if (name.includes('dried') || name.includes('frozen') || 
        name.includes('pasteurized') || name.includes('ground')) {
      return 2;
    }

    // Unprocessed (Level 1)
    return 1;
  }

  private calculatePolyphenolBonus(polyphenolContent: number): number {
    // Bonus based on polyphenol content (mg/100g)
    if (polyphenolContent >= 500) return 15;
    if (polyphenolContent >= 300) return 10;
    if (polyphenolContent >= 100) return 5;
    return 0;
  }

  private calculateOmega3Bonus(omega3Content: number): number {
    // Bonus based on omega-3 content (g/100g)
    if (omega3Content >= 2.0) return 15;
    if (omega3Content >= 1.0) return 10;
    if (omega3Content >= 0.5) return 5;
    return 0;
  }

  private calculateUPFPenalty(
    processingLevel: ProcessingLevel, 
    processingData?: FoodProcessingData
  ): number {
    let penalty = 0;

    // Base penalty for processing level
    switch (processingLevel) {
      case 4: penalty += 25; break; // Ultra-processed
      case 3: penalty += 15; break; // Processed
      case 2: penalty += 5; break;  // Minimally processed
      case 1: penalty += 0; break;  // Unprocessed
    }

    // Additional penalties for specific additives
    if (processingData) {
      penalty += processingData.additives.length * 2;
      penalty += processingData.preservatives.length * 3;
      penalty += processingData.artificialIngredients.length * 4;
    }

    return Math.min(40, penalty); // Cap penalty at 40 points
  }

  private calculateSatietyScore(food: FoodItem): number {
    const nutrition = food.nutrition_per_100g;
    
    // Satiety factors: protein, fiber, water content (estimated), fat
    let score = 0;
    
    // Protein contribution (most satiating)
    score += (nutrition.protein || 0) * 2;
    
    // Fiber contribution
    score += (nutrition.fiber || 0) * 3;
    
    // Fat contribution (moderate satiety)
    score += (nutrition.fat || 0) * 0.5;
    
    // Penalty for high sugar (less satiating)
    if (nutrition.sugar) {
      score -= nutrition.sugar * 0.5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateBaseScore(
    energyDensity: number, 
    nutrientDensity: number, 
    satietyScore: number
  ): number {
    // Sigmoid function for smooth scoring
    const energyScore = 100 / (1 + Math.exp((energyDensity - 200) / 50));
    const nutrientScore = nutrientDensity;
    const satietyWeight = satietyScore / 100;

    // Weighted combination
    return (energyScore * 0.4) + (nutrientScore * 0.4) + (satietyScore * 0.2);
  }

  private determineMindForkTier(score: number): MindForkTier {
    if (score >= 90) return 'pink_fire';
    if (score >= 80) return 'brain_smart';
    if (score >= 70) return 'good';
    if (score >= 60) return 'caution';
    if (score >= 40) return 'heavy';
    return 'soot_bad';
  }

  private async calculateNutrientDensityComponent(
    food: FoodItem, 
    nutrientGaps: NutrientGapAnalysis
  ): Promise<number> {
    let score = 50; // Base score

    // Boost for foods that address nutrient deficiencies
    for (const deficiency of nutrientGaps.topDeficiencies.slice(0, 3)) {
      if (this.foodContainsNutrient(food, deficiency.nutrient)) {
        score += 15; // Boost for addressing deficiency
      }
    }

    // General nutrient density from MindFork scoring
    const mindForkScore = await this.calculateMindForkScore(food);
    score += (mindForkScore.score - 50) * 0.3; // 30% weight from MindFork score

    return Math.max(0, Math.min(100, score));
  }

  private async calculatePreferenceMatchComponent(
    food: FoodItem, 
    preferences: UserDietaryPreferences
  ): Promise<number> {
    // This would integrate with PreferenceFilter
    // For now, return a simplified calculation
    let score = 100;

    // Check diet type compatibility
    if (preferences.dietType !== 'mindfork') {
      // Simplified diet checking
      if (preferences.dietType === 'vegan' && this.containsAnimalProducts(food)) {
        score -= 50;
      }
      if (preferences.dietType === 'keto' && this.isHighCarb(food)) {
        score -= 40;
      }
    }

    // Check food exclusions
    if (preferences.foodExclusions?.some(exclusion => 
      food.name.toLowerCase().includes(exclusion.toLowerCase())
    )) {
      score -= 30;
    }

    return Math.max(0, score);
  }

  private calculateGoalAlignmentComponent(food: FoodItem, goalAlignment: GoalAlignment): number {
    let score = 50; // Base score

    const nutrition = food.nutrition_per_100g;

    switch (goalAlignment.primaryGoal) {
      case 'lose_weight':
        // Favor low-calorie, high-satiety foods
        if (nutrition.calories < 150) score += 20;
        if ((nutrition.protein + nutrition.fiber) > 15) score += 15;
        break;

      case 'gain_muscle':
        // Favor high-protein foods
        if (nutrition.protein > 20) score += 25;
        if (nutrition.protein > 15) score += 15;
        break;

      case 'maintain':
        // Favor balanced foods
        const isBalanced = nutrition.protein >= 10 && nutrition.carbs >= 10 && nutrition.fat >= 5;
        if (isBalanced) score += 20;
        break;

      case 'get_healthy':
        // Favor nutrient-dense, whole foods
        if (nutrition.fiber > 5) score += 15;
        if (nutrition.protein > 10) score += 10;
        break;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateTimingComponent(food: FoodItem, timeContext: TimeContext): number {
    let score = 70; // Base score

    const nutrition = food.nutrition_per_100g;

    switch (timeContext.mealWindow.type) {
      case 'breakfast':
        // Favor energizing foods
        if (nutrition.carbs > 15) score += 15;
        if (nutrition.protein > 10) score += 10;
        break;

      case 'lunch':
        // Favor balanced, sustaining foods
        if (nutrition.protein > 15) score += 15;
        if (nutrition.fiber > 5) score += 10;
        break;

      case 'dinner':
        // Favor lighter, easier to digest foods
        if (nutrition.calories < 200) score += 10;
        if (nutrition.fat < 10) score += 10;
        break;

      case 'snack':
        // Favor portion-controlled, satisfying foods
        if (nutrition.calories < 150) score += 15;
        if (nutrition.protein > 5) score += 10;
        break;

      case 'late_night':
        // Favor very light foods
        if (nutrition.calories < 100) score += 20;
        break;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculatePersonalPreferenceComponent(
    food: FoodItem, 
    personalHistory: PersonalFoodHistory
  ): number {
    let score = 50; // Neutral base

    // Boost for frequently chosen foods
    if (personalHistory.frequentlyChosenFoods.includes(food.id)) {
      score += 30;
    }

    // Penalty for frequently ignored foods
    if (personalHistory.frequentlyIgnoredFoods.includes(food.id)) {
      score -= 40;
    }

    // Check cuisine preferences
    const cuisineScore = this.getCuisineMatch(food, personalHistory.cuisinePreferences);
    score += cuisineScore * 0.2;

    return Math.max(0, Math.min(100, score));
  }

  private calculateVarietyBonus(food: FoodItem, personalHistory: PersonalFoodHistory): number {
    // Boost foods that add variety to recent choices
    const recentFoods = personalHistory.frequentlyChosenFoods.slice(-10); // Last 10 foods
    
    if (!recentFoods.includes(food.id)) {
      const foodCategory = this.getFoodCategory(food);
      const recentCategories = recentFoods.map(foodId => this.getFoodCategoryById(foodId));
      
      if (!recentCategories.includes(foodCategory)) {
        return 15; // Bonus for new food category
      }
      return 10; // Bonus for new food in existing category
    }
    
    return 0; // No bonus for recently eaten foods
  }

  private calculateSeasonalBonus(food: FoodItem, timeContext: TimeContext): number {
    // This would check seasonal availability
    // For now, return a simple bonus for certain foods
    const seasonalFoods: Record<string, string[]> = {
      spring: ['asparagus', 'peas', 'strawberries'],
      summer: ['tomatoes', 'berries', 'stone_fruits'],
      fall: ['apples', 'pumpkin', 'squash'],
      winter: ['citrus', 'root_vegetables', 'hearty_grains'],
    };

    const currentSeason = this.getCurrentSeason();
    const seasonalItems = seasonalFoods[currentSeason] || [];
    
    const foodName = food.name.toLowerCase();
    const isSeasonalFood = seasonalItems.some(item => foodName.includes(item));
    
    return isSeasonalFood ? 10 : 0;
  }

  private calculateWeightedScore(componentScores: ComponentScores): number {
    // Weighted average of component scores
    const weights = {
      macroFit: 0.30,
      nutrientDensity: 0.25,
      preferenceMatch: 0.20,
      goalAlignment: 0.15,
      timingAppropriate: 0.05,
      personalPreference: 0.03,
      varietyBonus: 0.01,
      seasonalBonus: 0.01,
    };

    return (
      componentScores.macroFit * weights.macroFit +
      componentScores.nutrientDensity * weights.nutrientDensity +
      componentScores.preferenceMatch * weights.preferenceMatch +
      componentScores.goalAlignment * weights.goalAlignment +
      componentScores.timingAppropriate * weights.timingAppropriate +
      componentScores.personalPreference * weights.personalPreference +
      componentScores.varietyBonus * weights.varietyBonus +
      componentScores.seasonalBonus * weights.seasonalBonus
    );
  }

  private calculateConfidenceLevel(context: ScoringContext, food: FoodItem): number {
    let confidence = 100;

    // Reduce confidence for incomplete data
    if (!context.macroCompatibility) confidence -= 20;
    if (!context.nutrientGaps) confidence -= 15;
    if (!context.personalHistory.frequentlyChosenFoods.length) confidence -= 15;
    if (!this.mindForkScoreCache.has(food.id)) confidence -= 10;

    return Math.max(30, confidence);
  }

  private generateScoreReasoning(componentScores: ComponentScores, food: FoodItem): string[] {
    const reasoning: string[] = [];

    if (componentScores.macroFit >= 80) {
      reasoning.push('Excellent fit for your remaining daily targets');
    } else if (componentScores.macroFit >= 60) {
      reasoning.push('Good fit for your macro goals');
    }

    if (componentScores.nutrientDensity >= 80) {
      reasoning.push('High in essential nutrients');
    }

    if (componentScores.goalAlignment >= 80) {
      reasoning.push('Perfectly aligned with your fitness goals');
    }

    if (componentScores.personalPreference >= 80) {
      reasoning.push('Based on your preferences, you\'ll likely enjoy this');
    }

    if (componentScores.varietyBonus > 0) {
      reasoning.push('Adds variety to your recent meals');
    }

    return reasoning.slice(0, 3); // Limit to top 3 reasons
  }

  private generateImprovementSuggestions(
    componentScores: ComponentScores, 
    food: FoodItem
  ): string[] {
    const suggestions: string[] = [];

    if (componentScores.macroFit < 60) {
      suggestions.push('Consider a smaller portion to better fit your remaining targets');
    }

    if (componentScores.preferenceMatch < 60) {
      suggestions.push('This food may not align with your dietary preferences');
    }

    if (componentScores.timingAppropriate < 60) {
      suggestions.push('This might be better suited for a different meal time');
    }

    return suggestions;
  }

  private applyDiversityScoring(recommendations: FoodRecommendation[]): FoodRecommendation[] {
    // Ensure variety in food categories
    const categories = new Set<string>();
    const diversified: FoodRecommendation[] = [];

    for (const rec of recommendations) {
      const category = this.getFoodCategoryById(rec.foodId);
      
      if (!categories.has(category) || diversified.length < 5) {
        diversified.push(rec);
        categories.add(category);
      } else if (diversified.length < 10 && Math.random() > 0.5) {
        // Randomly include some duplicates for variety
        diversified.push(rec);
      }
    }

    return diversified;
  }

  // Utility methods

  private async cacheMindForkScore(foodId: string, score: MindForkFoodScore): Promise<void> {
    try {
      await supabase
        .from('food_compatibility_scores')
        .upsert({
          food_id: foodId,
          diet_type: 'mindfork',
          compatibility_data: score,
          mindfork_score: score.score,
          tier: score.tier,
          energy_density: score.energyDensity,
          processing_level: score.processingLevel,
          nutrient_density_score: score.nutrientDensity,
        });
    } catch (error) {
      console.error('CompatibilityScorer: Error caching MindFork score:', error);
    }
  }

  private foodContainsNutrient(food: FoodItem, nutrient: string): boolean {
    // Simplified nutrient checking
    const nutrientFoods: Record<string, string[]> = {
      iron: ['spinach', 'beef', 'lentils'],
      vitaminC: ['citrus', 'berries', 'peppers'],
      calcium: ['dairy', 'leafy_greens', 'almonds'],
      vitaminD: ['salmon', 'tuna', 'fortified'],
    };

    const foods = nutrientFoods[nutrient] || [];
    return foods.some(item => food.name.toLowerCase().includes(item));
  }

  private containsAnimalProducts(food: FoodItem): boolean {
    const animalKeywords = ['meat', 'chicken', 'beef', 'pork', 'fish', 'dairy', 'cheese', 'milk', 'egg'];
    const name = food.name.toLowerCase();
    return animalKeywords.some(keyword => name.includes(keyword));
  }

  private isHighCarb(food: FoodItem): boolean {
    return (food.nutrition_per_100g.carbs || 0) > 20;
  }

  private getFoodCategory(food: FoodItem): string {
    const name = food.name.toLowerCase();
    
    if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) return 'protein';
    if (name.includes('vegetable') || name.includes('spinach') || name.includes('broccoli')) return 'vegetables';
    if (name.includes('fruit') || name.includes('apple') || name.includes('berry')) return 'fruits';
    if (name.includes('grain') || name.includes('bread') || name.includes('rice')) return 'grains';
    if (name.includes('dairy') || name.includes('cheese') || name.includes('milk')) return 'dairy';
    if (name.includes('nut') || name.includes('seed')) return 'nuts_seeds';
    
    return 'other';
  }

  private getFoodCategoryById(foodId: string): string {
    // This would typically query a food database
    // For now, use simple ID-based categorization
    if (foodId.includes('meat') || foodId.includes('chicken') || foodId.includes('beef')) return 'protein';
    if (foodId.includes('vegetable') || foodId.includes('spinach')) return 'vegetables';
    if (foodId.includes('fruit') || foodId.includes('berry')) return 'fruits';
    
    return 'other';
  }

  private getCategoryPreference(category: string, history: PersonalFoodHistory): number {
    // Calculate preference score for food category based on history
    const categoryFoods = history.frequentlyChosenFoods.filter(foodId => 
      this.getFoodCategoryById(foodId) === category
    );
    
    return Math.min(20, categoryFoods.length * 2); // Max 20 point boost
  }

  private getCuisineMatch(food: FoodItem, cuisinePreferences: Record<string, number>): number {
    // Simple cuisine matching based on food name
    const name = food.name.toLowerCase();
    
    for (const [cuisine, preference] of Object.entries(cuisinePreferences)) {
      if (name.includes(cuisine.toLowerCase())) {
        return preference;
      }
    }
    
    return 0;
  }

  private getSeasonalMatch(food: FoodItem, seasonalTrends: any): number {
    // Simplified seasonal matching
    return 0;
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private getDefaultMindForkScore(): MindForkFoodScore {
    return {
      tier: 'good',
      score: 50,
      energyDensity: 200,
      processingLevel: 2,
      nutrientDensity: 50,
      polyphenolBonus: 0,
      omega3Bonus: 0,
      upfPenalty: 0,
      satietyScore: 50,
    };
  }

  private getDefaultCompatibilityScore(): CompatibilityScore {
    return {
      overallScore: 50,
      componentScores: {
        macroFit: 50,
        nutrientDensity: 50,
        preferenceMatch: 50,
        goalAlignment: 50,
        timingAppropriate: 50,
        personalPreference: 50,
        varietyBonus: 0,
        seasonalBonus: 0,
      },
      confidenceLevel: 50,
      reasoning: ['Default scoring due to insufficient data'],
    };
  }

  // Initialize databases
  private initializeProcessingDatabase(): void {
    this.processingDatabase.set('salmon_fillet', {
      processingLevel: 1,
      ingredients: ['salmon'],
      additives: [],
      preservatives: [],
      artificialIngredients: [],
    });

    this.processingDatabase.set('processed_cheese', {
      processingLevel: 4,
      ingredients: ['milk', 'cheese', 'emulsifiers'],
      additives: ['sodium_phosphate', 'artificial_color'],
      preservatives: ['potassium_sorbate'],
      artificialIngredients: ['artificial_flavor'],
    });
  }

  private initializePolyphenolDatabase(): void {
    this.polyphenolDatabase.set('blueberries', 560);
    this.polyphenolDatabase.set('dark_chocolate', 1664);
    this.polyphenolDatabase.set('green_tea', 89);
    this.polyphenolDatabase.set('red_wine', 101);
    this.polyphenolDatabase.set('spinach', 119);
  }

  private initializeOmega3Database(): void {
    this.omega3Database.set('salmon_fillet', 2.3);
    this.omega3Database.set('walnuts', 2.5);
    this.omega3Database.set('flaxseeds', 22.8);
    this.omega3Database.set('chia_seeds', 17.8);
    this.omega3Database.set('sardines', 2.2);
  }
}

// Export singleton instance
export const compatibilityScorer = CompatibilityScorer.getInstance();
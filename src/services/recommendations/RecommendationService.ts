/**
 * RecommendationService
 * 
 * Main orchestrator that coordinates all recommendation components
 */

import { supabase } from '../../lib/supabase';
import { profileService } from '../ProfileService';
import { macroCalculator } from './MacroCalculator';
import { preferenceFilter } from './PreferenceFilter';
import { nutrientAnalyzer } from './NutrientAnalyzer';
import { compatibilityScorer } from './CompatibilityScorer';
import type {
  RecommendationContext,
  FoodRecommendation,
  UserDietaryPreferences,
  RemainingTargets,
  NutrientGapAnalysis,
  FoodLogEntry,
  UserFeedback,
  UserInteraction,
  RecommendationServiceConfig,
  RecommendationCacheEntry,
  PerformanceMetrics,
} from '../../types/recommendations';
import type { FoodItem, ScoringContext } from './CompatibilityScorer';
import crypto from 'crypto';

// Error types
export class RecommendationError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'RecommendationError';
    this.code = code;
  }
}

export type RecommendationErrorCode = 'CACHE_ERROR' | 'FETCH_ERROR' | 'INVALID_INPUT' | 'SERVICE_ERROR';

export class RecommendationService {
  private static instance: RecommendationService;
  private config: RecommendationServiceConfig;
  private cache: Map<string, RecommendationCacheEntry>;
  private performanceMetrics: PerformanceMetrics[];

  private constructor() {
    this.config = {
      maxRecommendations: 10,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      enablePersonalization: true,
      enableSeasonalBoosts: true,
      enableMindForkScoring: true,
      fallbackStrategy: 'popular_foods',
      performanceMode: 'balanced',
    };
    this.cache = new Map();
    this.performanceMetrics = [];
  }

  public static getInstance(): RecommendationService {
    if (!RecommendationService.instance) {
      RecommendationService.instance = new RecommendationService();
    }
    return RecommendationService.instance;
  }

  /**
   * Get personalized food recommendations for a user
   */
  public async getRecommendations(context: RecommendationContext): Promise<FoodRecommendation[]> {
    const startTime = Date.now();
    
    try {
      // Generate context hash for caching
      const contextHash = this.generateContextHash(context);
      
      // Check cache first
      const cached = await this.getCachedRecommendations(context.userId, contextHash);
      if (cached) {
        this.recordPerformanceMetric('cache_hit', Date.now() - startTime);
        return cached;
      }

      // Build recommendation context
      const fullContext = await this.buildFullContext(context);
      
      // Get candidate foods from database
      const candidateFoods = await this.getCandidateFoods(fullContext);
      
      // Filter foods by preferences
      const compatibleFoods = preferenceFilter.filterFoodsByPreferences(
        candidateFoods, 
        fullContext.userPreferences
      );

      if (compatibleFoods.length === 0) {
        return this.handleNoCompatibleFoods(fullContext);
      }

      // Score and rank foods
      const scoredRecommendations = await this.scoreAndRankFoods(
        compatibleFoods, 
        fullContext
      );

      // Apply personalization boosts
      const personalizedRecommendations = await this.applyPersonalization(
        scoredRecommendations,
        fullContext
      );

      // Limit to max recommendations
      const finalRecommendations = personalizedRecommendations.slice(0, this.config.maxRecommendations);

      // Cache the results
      await this.cacheRecommendations(context.userId, contextHash, finalRecommendations);

      // Record performance metrics
      this.recordPerformanceMetric('success', Date.now() - startTime);

      return finalRecommendations;

    } catch (error) {
      console.error('RecommendationService: Error getting recommendations:', error);
      this.recordPerformanceMetric('error', Date.now() - startTime);
      
      // Return fallback recommendations
      return this.getFallbackRecommendations(context);
    }
  }

  /**
   * Get recommendations for a scanned food item
   */
  public async getRecommendationsForScannedFood(
    foodId: string, 
    context: RecommendationContext
  ): Promise<{ compatibility: any; alternatives: FoodRecommendation[] }> {
    try {
      // Get the scanned food details
      const scannedFood = await this.getFoodById(foodId);
      if (!scannedFood) {
        throw new RecommendationError(
          'Scanned food not found',
          'FETCH_ERROR'
        );
      }

      // Check compatibility with user preferences
      const compatibility = preferenceFilter.checkFoodCompatibility(
        scannedFood, 
        context.userPreferences
      );

      // If compatible, calculate macro compatibility
      if (compatibility.isCompatible) {
        const macroCompatibility = macroCalculator.calculateMacroCompatibility(
          scannedFood,
          100, // Default 100g portion
          context.remainingTargets
        );
        
        Object.assign(compatibility, { macroCompatibility });
      }

      // Get alternative recommendations if not compatible or user wants options
      const alternatives = compatibility.isCompatible ? 
        await this.getSimilarFoods(scannedFood, context) :
        await this.getAlternativeFoods(scannedFood, context);

      return {
        compatibility,
        alternatives: alternatives.slice(0, 5), // Limit to 5 alternatives
      };

    } catch (error) {
      console.error('RecommendationService: Error analyzing scanned food:', error);
      throw error;
    }
  }

  /**
   * Update recommendations after user logs food
   */
  public async updateRecommendationsAfterFoodLog(foodLogEntry: FoodLogEntry): Promise<void> {
    try {
      const startTime = Date.now();

      // Invalidate cache for this user
      await this.invalidateUserCache(foodLogEntry.userId);

      // Update nutrient gap analysis cache
      await nutrientAnalyzer.analyzeNutrientGaps(
        foodLogEntry.userId, 
        foodLogEntry.loggedAt.split('T')[0]
      );

      // Record interaction for personalization
      await this.recordUserInteraction({
        type: 'food_logged',
        foodId: foodLogEntry.foodId,
        timestamp: foodLogEntry.loggedAt,
        context: {
          screenName: 'food_log',
          mealType: foodLogEntry.mealType,
          timeOfDay: new Date(foodLogEntry.loggedAt).getHours().toString(),
          remainingCalories: 0, // Will be calculated
        },
      });

      console.log(`RecommendationService: Updated recommendations after food log in ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error('RecommendationService: Error updating after food log:', error);
    }
  }

  /**
   * Record user feedback on recommendations
   */
  public async recordRecommendationFeedback(
    recommendationId: string, 
    feedback: UserFeedback
  ): Promise<void> {
    try {
      // Store feedback in database
      await supabase
        .from('user_food_interactions')
        .insert({
          user_id: this.getCurrentUserId(),
          recommendation_id: recommendationId,
          interaction_type: 'rated',
          feedback_score: feedback.rating,
          context: {
            comment: feedback.comment,
            categories: feedback.categories,
            would_recommend_again: feedback.wouldRecommendAgain,
          },
        });

      console.log('RecommendationService: Recorded feedback for recommendation:', recommendationId);

    } catch (error) {
      console.error('RecommendationService: Error recording feedback:', error);
    }
  }

  /**
   * Record food selection from recommendations
   */
  public async recordFoodSelection(recommendationId: string, selectedFood: string): Promise<void> {
    try {
      await supabase
        .from('user_food_interactions')
        .insert({
          user_id: this.getCurrentUserId(),
          food_id: selectedFood,
          recommendation_id: recommendationId,
          interaction_type: 'selected',
          context: {
            timestamp: new Date().toISOString(),
          },
        });

      console.log('RecommendationService: Recorded food selection:', selectedFood);

    } catch (error) {
      console.error('RecommendationService: Error recording selection:', error);
    }
  }

  /**
   * Invalidate cache for a user
   */
  public async invalidateCache(userId: string): Promise<void> {
    try {
      // Clear in-memory cache
      for (const [key, entry] of this.cache.entries()) {
        if (entry.userId === userId) {
          this.cache.delete(key);
        }
      }

      // Clear database cache
      await supabase
        .from('recommendation_cache')
        .delete()
        .eq('user_id', userId);

      console.log('RecommendationService: Cache invalidated for user:', userId);

    } catch (error) {
      console.error('RecommendationService: Error invalidating cache:', error);
    }
  }

  // Private helper methods

  private async buildFullContext(context: RecommendationContext): Promise<RecommendationContext> {
    try {
      // Load user profile if not provided
      if (!context.userPreferences) {
        const profile = await profileService.loadProfile(context.userId);
        context.userPreferences = this.extractDietaryPreferences(profile);
      }

      // Calculate remaining targets if not provided
      if (!context.remainingTargets) {
        context.remainingTargets = await macroCalculator.calculateRemainingTargets(
          context.userId, 
          context.currentDate
        );
      }

      // Get recent food logs if not provided
      if (!context.recentFoodLogs || context.recentFoodLogs.length === 0) {
        context.recentFoodLogs = await this.getRecentFoodLogs(context.userId);
      }

      // Set time context
      context.timeOfDay = this.determineTimeOfDay();
      context.mealType = this.determineMealType(context.timeOfDay);

      return context;

    } catch (error) {
      console.error('RecommendationService: Error building context:', error);
      throw error;
    }
  }

  private async getCandidateFoods(context: RecommendationContext): Promise<FoodItem[]> {
    try {
      // This would typically query a comprehensive food database
      // For now, return a sample set of foods
      const sampleFoods: FoodItem[] = [
        {
          id: 'salmon_fillet',
          name: 'Salmon Fillet',
          nutrition_per_100g: {
            calories: 208,
            protein: 25,
            carbs: 0,
            fat: 12,
            fiber: 0,
          },
        },
        {
          id: 'chicken_breast',
          name: 'Chicken Breast',
          nutrition_per_100g: {
            calories: 165,
            protein: 31,
            carbs: 0,
            fat: 3.6,
            fiber: 0,
          },
        },
        {
          id: 'spinach',
          name: 'Fresh Spinach',
          nutrition_per_100g: {
            calories: 23,
            protein: 2.9,
            carbs: 3.6,
            fat: 0.4,
            fiber: 2.2,
          },
        },
        {
          id: 'almonds',
          name: 'Raw Almonds',
          nutrition_per_100g: {
            calories: 579,
            protein: 21,
            carbs: 22,
            fat: 50,
            fiber: 12,
          },
        },
        {
          id: 'greek_yogurt',
          name: 'Greek Yogurt',
          nutrition_per_100g: {
            calories: 100,
            protein: 10,
            carbs: 4,
            fat: 5,
            fiber: 0,
          },
        },
        {
          id: 'quinoa',
          name: 'Cooked Quinoa',
          nutrition_per_100g: {
            calories: 120,
            protein: 4.4,
            carbs: 22,
            fat: 1.9,
            fiber: 2.8,
          },
        },
        {
          id: 'avocado',
          name: 'Fresh Avocado',
          nutrition_per_100g: {
            calories: 160,
            protein: 2,
            carbs: 9,
            fat: 15,
            fiber: 7,
          },
        },
        {
          id: 'sweet_potato',
          name: 'Baked Sweet Potato',
          nutrition_per_100g: {
            calories: 86,
            protein: 1.6,
            carbs: 20,
            fat: 0.1,
            fiber: 3,
          },
        },
      ];

      return sampleFoods;

    } catch (error) {
      console.error('RecommendationService: Error getting candidate foods:', error);
      return [];
    }
  }

  private async scoreAndRankFoods(
    foods: FoodItem[], 
    context: RecommendationContext
  ): Promise<FoodRecommendation[]> {
    try {
      const recommendations: FoodRecommendation[] = [];

      // Get nutrient gaps for scoring
      const nutrientGaps = await nutrientAnalyzer.analyzeNutrientGaps(
        context.userId, 
        context.currentDate
      );

      for (const food of foods) {
        // Calculate macro compatibility
        const macroCompatibility = macroCalculator.calculateMacroCompatibility(
          food,
          100, // Default 100g portion for scoring
          context.remainingTargets
        );

        // Optimize portion size
        const optimizedPortion = macroCalculator.optimizePortionForTargets(
          food,
          context.remainingTargets
        );

        // Build scoring context
        const scoringContext: ScoringContext = {
          macroCompatibility,
          nutrientGaps,
          userPreferences: context.userPreferences,
          timeContext: {
            currentTime: new Date().toTimeString().slice(0, 5),
            mealWindow: {
              type: context.mealType || 'snack',
              appropriateness: 80,
              typicalFoods: [],
            },
            dayOfWeek: new Date().getDay(),
            isWeekend: [0, 6].includes(new Date().getDay()),
          },
          goalAlignment: {
            primaryGoal: this.extractPrimaryGoal(context.userPreferences),
            alignmentScore: 75,
            goalSpecificFactors: {},
            progressTowardGoal: 50,
          },
          personalHistory: await this.getPersonalHistory(context.userId),
        };

        // Calculate overall compatibility score
        const compatibilityScore = await compatibilityScorer.calculateOverallScore(
          food,
          scoringContext
        );

        // Calculate MindFork score
        const mindForkScore = await compatibilityScorer.calculateMindForkScore(food);

        // Generate recommendation reasons
        const reasons = this.generateRecommendationReasons(
          compatibilityScore,
          macroCompatibility,
          mindForkScore
        );

        // Create recommendation
        const recommendation: FoodRecommendation = {
          id: `rec_${food.id}_${Date.now()}`,
          foodId: food.id,
          name: food.name,
          compatibilityScore: compatibilityScore.overallScore,
          recommendedPortion: {
            amount: optimizedPortion.recommendedAmount,
            unit: optimizedPortion.unit,
            calories: Math.round((food.nutrition_per_100g.calories * optimizedPortion.recommendedAmount) / 100),
            macros: this.calculatePortionMacros(food, optimizedPortion.recommendedAmount),
          },
          reasonsForRecommendation: reasons,
          nutritionalHighlights: this.generateNutritionalHighlights(food, nutrientGaps),
          alternativePortions: optimizedPortion.alternativePortions,
          mindForkTier: mindForkScore.tier,
          estimatedSatisfaction: this.estimateSatisfaction(food, scoringContext.personalHistory),
        };

        recommendations.push(recommendation);
      }

      // Rank recommendations
      return compatibilityScorer.rankRecommendations(recommendations);

    } catch (error) {
      console.error('RecommendationService: Error scoring foods:', error);
      return [];
    }
  }

  private async applyPersonalization(
    recommendations: FoodRecommendation[],
    context: RecommendationContext
  ): Promise<FoodRecommendation[]> {
    if (!this.config.enablePersonalization) {
      return recommendations;
    }

    try {
      const personalHistory = await this.getPersonalHistory(context.userId);
      
      return recommendations.map(rec => {
        // Apply personalization boost to compatibility score
        const personalizationFactors = {
          userHistory: personalHistory,
          learningConfidence: 75, // This would be calculated based on interaction count
          interactionCount: personalHistory.frequentlyChosenFoods.length,
          preferenceStrength: {
            dietary: 80,
            portion: 70,
            timing: 60,
            variety: 85,
          },
        };

        const boost = compatibilityScorer.calculatePersonalizationBoost(
          { id: rec.foodId } as FoodItem,
          personalizationFactors
        );

        return {
          ...rec,
          compatibilityScore: Math.max(0, Math.min(100, rec.compatibilityScore + boost)),
          estimatedSatisfaction: rec.estimatedSatisfaction ? 
            Math.max(0, Math.min(100, rec.estimatedSatisfaction + boost * 0.5)) : 
            undefined,
        };
      });

    } catch (error) {
      console.error('RecommendationService: Error applying personalization:', error);
      return recommendations;
    }
  }

  private generateContextHash(context: RecommendationContext): string {
    const hashData = {
      userId: context.userId,
      date: context.currentDate,
      timeOfDay: context.timeOfDay,
      remainingCalories: context.remainingTargets?.calories || 0,
      dietType: context.userPreferences?.dietType || 'mindfork',
    };

    return crypto.createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex')
      .substring(0, 16);
  }

  private async getCachedRecommendations(
    userId: string, 
    contextHash: string
  ): Promise<FoodRecommendation[] | null> {
    try {
      // Check in-memory cache first
      const cacheKey = `${userId}_${contextHash}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }

      // Check database cache
      const { data, error } = await supabase
        .from('recommendation_cache')
        .select('recommendations, expires_at')
        .eq('user_id', userId)
        .eq('context_hash', contextHash)
        .single();

      if (error || !data) {
        return null;
      }

      if (new Date(data.expires_at) > new Date()) {
        return data.recommendations as FoodRecommendation[];
      }

      return null;

    } catch (error) {
      console.error('RecommendationService: Error getting cached recommendations:', error);
      return null;
    }
  }

  private async cacheRecommendations(
    userId: string, 
    contextHash: string, 
    recommendations: FoodRecommendation[]
  ): Promise<void> {
    try {
      const expiresAt = Date.now() + this.config.cacheTimeout;
      const expiresAtDate = new Date(expiresAt);

      // Cache in memory
      const cacheKey = `${userId}_${contextHash}`;
      this.cache.set(cacheKey, {
        data: recommendations,
        timestamp: Date.now(),
        expiresAt,
        contextHash,
        userId,
        context: {},
      });

      // Cache in database
      await supabase
        .from('recommendation_cache')
        .upsert({
          user_id: userId,
          context_hash: contextHash,
          recommendations,
          expires_at: expiresAtDate.toISOString(),
        });

    } catch (error) {
      console.error('RecommendationService: Error caching recommendations:', error);
    }
  }

  private async handleNoCompatibleFoods(context: RecommendationContext): Promise<FoodRecommendation[]> {
    console.warn('RecommendationService: No compatible foods found, using fallback strategy');
    
    switch (this.config.fallbackStrategy) {
      case 'popular_foods':
        return this.getPopularFoodsForGoal(context);
      case 'random_compatible':
        return this.getRandomCompatibleFoods(context);
      case 'cached_only':
        return [];
      default:
        return this.getPopularFoodsForGoal(context);
    }
  }

  private async getFallbackRecommendations(context: RecommendationContext): Promise<FoodRecommendation[]> {
    try {
      // Return simple, safe recommendations
      return [
        {
          id: 'fallback_1',
          foodId: 'water',
          name: 'Water',
          compatibilityScore: 100,
          recommendedPortion: {
            amount: 250,
            unit: 'ml',
            calories: 0,
            macros: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          },
          reasonsForRecommendation: [
            {
              type: 'goal_alignment',
              description: 'Always a good choice for hydration',
              importance: 'high',
            },
          ],
          nutritionalHighlights: ['Zero calories', 'Essential for hydration'],
          alternativePortions: [],
          mindForkTier: 'pink_fire',
        },
      ];
    } catch (error) {
      console.error('RecommendationService: Error getting fallback recommendations:', error);
      return [];
    }
  }

  // Utility methods

  private extractDietaryPreferences(profile: any): UserDietaryPreferences {
    return {
      dietType: profile.diet_type || 'mindfork',
      foodExclusions: profile.food_exclusions || [],
      allergens: profile.allergens || [],
    };
  }

  private extractPrimaryGoal(preferences: UserDietaryPreferences): 'lose_weight' | 'gain_muscle' | 'maintain' | 'get_healthy' {
    // This would be extracted from user profile
    return 'get_healthy';
  }

  private determineTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  private determineMealType(timeOfDay: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
    switch (timeOfDay) {
      case 'morning': return 'breakfast';
      case 'afternoon': return 'lunch';
      case 'evening': return 'dinner';
      default: return 'snack';
    }
  }

  private async getRecentFoodLogs(userId: string): Promise<FoodLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('logged_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('RecommendationService: Error getting recent food logs:', error);
      return [];
    }
  }

  private async getPersonalHistory(userId: string): Promise<any> {
    // This would query user interaction history
    return {
      frequentlyChosenFoods: [],
      frequentlyIgnoredFoods: [],
      averagePortionSizes: {},
      mealTimingPatterns: [],
      macroPreferences: {
        proteinPreference: 0,
        carbPreference: 0,
        fatPreference: 0,
        fiberPreference: 0,
        consistencyScore: 50,
      },
      cuisinePreferences: {},
    };
  }

  private calculatePortionMacros(food: FoodItem, portionGrams: number): any {
    const multiplier = portionGrams / 100;
    return {
      calories: Math.round(food.nutrition_per_100g.calories * multiplier),
      protein: Math.round(food.nutrition_per_100g.protein * multiplier * 10) / 10,
      carbs: Math.round(food.nutrition_per_100g.carbs * multiplier * 10) / 10,
      fat: Math.round(food.nutrition_per_100g.fat * multiplier * 10) / 10,
      fiber: Math.round(food.nutrition_per_100g.fiber * multiplier * 10) / 10,
    };
  }

  private generateRecommendationReasons(compatibilityScore: any, macroCompatibility: any, mindForkScore: any): any[] {
    const reasons = [];

    if (macroCompatibility.overallScore >= 80) {
      reasons.push({
        type: 'macro_fit',
        description: 'Perfect fit for your remaining daily targets',
        importance: 'high',
      });
    }

    if (mindForkScore.tier === 'pink_fire' || mindForkScore.tier === 'brain_smart') {
      reasons.push({
        type: 'nutrient_gap',
        description: 'High-quality, nutrient-dense choice',
        importance: 'high',
      });
    }

    return reasons.slice(0, 3);
  }

  private generateNutritionalHighlights(food: FoodItem, nutrientGaps: NutrientGapAnalysis): string[] {
    const highlights = [];

    if (food.nutrition_per_100g.protein > 15) {
      highlights.push('High in protein');
    }

    if (food.nutrition_per_100g.fiber > 5) {
      highlights.push('Good source of fiber');
    }

    if (food.nutrition_per_100g.calories < 100) {
      highlights.push('Low calorie option');
    }

    return highlights.slice(0, 3);
  }

  private estimateSatisfaction(food: FoodItem, personalHistory: any): number {
    // Simple satisfaction estimation based on food properties
    let satisfaction = 70; // Base satisfaction

    // Boost for high protein (more satiating)
    if (food.nutrition_per_100g.protein > 15) satisfaction += 10;

    // Boost for high fiber (more filling)
    if (food.nutrition_per_100g.fiber > 5) satisfaction += 10;

    return Math.min(100, satisfaction);
  }

  private async getFoodById(foodId: string): Promise<FoodItem | null> {
    // This would query the food database
    // For now, return null
    return null;
  }

  private async getSimilarFoods(food: FoodItem, context: RecommendationContext): Promise<FoodRecommendation[]> {
    // This would find similar foods
    return [];
  }

  private async getAlternativeFoods(food: FoodItem, context: RecommendationContext): Promise<FoodRecommendation[]> {
    // This would find alternative foods
    return [];
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidateCache(userId);
  }

  private async recordUserInteraction(interaction: UserInteraction): Promise<void> {
    try {
      await supabase
        .from('user_food_interactions')
        .insert({
          user_id: this.getCurrentUserId(),
          food_id: interaction.foodId,
          interaction_type: interaction.type,
          context: interaction.context,
        });
    } catch (error) {
      console.error('RecommendationService: Error recording interaction:', error);
    }
  }

  private getCurrentUserId(): string {
    // This would get the current user ID from auth context
    return 'current_user_id';
  }

  private recordPerformanceMetric(type: string, duration: number): void {
    this.performanceMetrics.push({
      calculationTime: duration,
      databaseQueryTime: 0,
      cacheOperationTime: 0,
      totalResponseTime: duration,
    });

    // Keep only last 100 metrics
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics.shift();
    }
  }

  private async getPopularFoodsForGoal(context: RecommendationContext): Promise<FoodRecommendation[]> {
    // Return popular foods based on goal
    return [];
  }

  private async getRandomCompatibleFoods(context: RecommendationContext): Promise<FoodRecommendation[]> {
    // Return random compatible foods
    return [];
  }
}

// Export singleton instance
export const recommendationService = RecommendationService.getInstance();
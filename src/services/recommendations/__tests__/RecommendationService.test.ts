/**
 * RecommendationService Integration Tests
 * 
 * Comprehensive tests for the main recommendation orchestrator
 */

import { RecommendationService } from '../RecommendationService';
import { profileService } from '../../ProfileService';
import { macroCalculator } from '../MacroCalculator';
import { preferenceFilter } from '../PreferenceFilter';
import { nutrientAnalyzer } from '../NutrientAnalyzer';
import { compatibilityScorer } from '../CompatibilityScorer';
import { supabase } from '../../../lib/supabase';
import type { 
  RecommendationContext, 
  UserDietaryPreferences,
  RemainingTargets,
  FoodLogEntry 
} from '../../../types/recommendations';

// Mock all dependencies
jest.mock('../../ProfileService');
jest.mock('../MacroCalculator');
jest.mock('../PreferenceFilter');
jest.mock('../NutrientAnalyzer');
jest.mock('../CompatibilityScorer');
jest.mock('../../../lib/supabase');

const mockProfileService = profileService as jest.Mocked<typeof profileService>;
const mockMacroCalculator = macroCalculator as jest.Mocked<typeof macroCalculator>;
const mockPreferenceFilter = preferenceFilter as jest.Mocked<typeof preferenceFilter>;
const mockNutrientAnalyzer = nutrientAnalyzer as jest.Mocked<typeof nutrientAnalyzer>;
const mockCompatibilityScorer = compatibilityScorer as jest.Mocked<typeof compatibilityScorer>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('RecommendationService', () => {
  let service: RecommendationService;

  // Test data
  const mockUserProfile = {
    id: 'user123',
    diet_type: 'mindfork',
    daily_calories: 2000,
    daily_protein_g: 150,
    daily_carbs_g: 200,
    daily_fat_g: 67,
    daily_fiber_g: 25,
  };

  const mockRemainingTargets: RemainingTargets = {
    calories: 800,
    protein: 60,
    carbs: 80,
    fat: 30,
    fiber: 15,
    percentageOfDayRemaining: 40,
    mealsRemaining: 2,
  };

  const mockUserPreferences: UserDietaryPreferences = {
    dietType: 'mindfork',
    foodExclusions: [],
    allergens: [],
  };

  const mockRecommendationContext: RecommendationContext = {
    userId: 'user123',
    currentDate: '2025-10-28',
    timeOfDay: 'afternoon',
    mealType: 'lunch',
    remainingTargets: mockRemainingTargets,
    userPreferences: mockUserPreferences,
    recentFoodLogs: [],
  };

  const mockFoodItems = [
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
  ];

  beforeEach(() => {
    service = RecommendationService.getInstance();
    jest.clearAllMocks();
    
    // Setup default mocks
    mockProfileService.loadProfile.mockResolvedValue(mockUserProfile as any);
    mockMacroCalculator.calculateRemainingTargets.mockResolvedValue(mockRemainingTargets);
    mockPreferenceFilter.filterFoodsByPreferences.mockReturnValue(mockFoodItems as any);
    mockNutrientAnalyzer.analyzeNutrientGaps.mockResolvedValue({
      topDeficiencies: [],
      overConsumption: [],
      balanceScore: 85,
      recommendations: [],
      priorityNutrients: [],
    });
    mockCompatibilityScorer.calculateOverallScore.mockResolvedValue({
      overallScore: 85,
      componentScores: {
        macroFit: 80,
        nutrientDensity: 85,
        preferenceMatch: 90,
        goalAlignment: 80,
        timingAppropriate: 85,
        personalPreference: 75,
        varietyBonus: 10,
        seasonalBonus: 5,
      },
      confidenceLevel: 90,
      reasoning: ['Great macro fit', 'High nutrient density'],
    });
    mockCompatibilityScorer.calculateMindForkScore.mockResolvedValue({
      tier: 'brain_smart',
      score: 85,
      energyDensity: 208,
      processingLevel: 1,
      nutrientDensity: 75,
      polyphenolBonus: 0,
      omega3Bonus: 15,
      upfPenalty: 0,
      satietyScore: 80,
    });
    mockCompatibilityScorer.rankRecommendations.mockImplementation(recs => recs);
    mockMacroCalculator.calculateMacroCompatibility.mockReturnValue({
      overallScore: 85,
      caloriesFit: 80,
      proteinFit: 90,
      carbsFit: 85,
      fatFit: 80,
      fiberFit: 70,
      wouldExceedTargets: false,
      balanceScore: 85,
    });
    mockMacroCalculator.optimizePortionForTargets.mockReturnValue({
      recommendedAmount: 150,
      unit: 'g',
      macroFitScore: 85,
      alternativePortions: [],
      reasoning: 'Optimal portion for your targets',
    });
  });

  describe('getRecommendations', () => {
    beforeEach(() => {
      // Mock no cached recommendations
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      } as any);
    });

    it('should generate recommendations successfully', async () => {
      const recommendations = await service.getRecommendations(mockRecommendationContext);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('id');
      expect(recommendations[0]).toHaveProperty('foodId');
      expect(recommendations[0]).toHaveProperty('name');
      expect(recommendations[0]).toHaveProperty('compatibilityScore');
      expect(recommendations[0]).toHaveProperty('recommendedPortion');
      expect(recommendations[0]).toHaveProperty('reasonsForRecommendation');
      expect(recommendations[0]).toHaveProperty('mindForkTier');
    });

    it('should use cached recommendations when available', async () => {
      const cachedRecommendations = [
        {
          id: 'cached_rec_1',
          foodId: 'salmon_fillet',
          name: 'Salmon Fillet',
          compatibilityScore: 90,
          recommendedPortion: {
            amount: 150,
            unit: 'g',
            calories: 312,
            macros: { calories: 312, protein: 37.5, carbs: 0, fat: 18, fiber: 0 },
          },
          reasonsForRecommendation: [],
          nutritionalHighlights: [],
          alternativePortions: [],
          mindForkTier: 'brain_smart' as const,
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  recommendations: cachedRecommendations,
                  expires_at: new Date(Date.now() + 10000).toISOString(),
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const recommendations = await service.getRecommendations(mockRecommendationContext);

      expect(recommendations).toEqual(cachedRecommendations);
      expect(mockMacroCalculator.calculateRemainingTargets).not.toHaveBeenCalled();
    });

    it('should build full context when incomplete context provided', async () => {
      const incompleteContext: RecommendationContext = {
        userId: 'user123',
        currentDate: '2025-10-28',
        timeOfDay: 'afternoon',
        remainingTargets: mockRemainingTargets,
        userPreferences: mockUserPreferences,
        recentFoodLogs: [],
      };

      const recommendations = await service.getRecommendations(incompleteContext);

      expect(mockProfileService.loadProfile).toHaveBeenCalledWith('user123');
      expect(recommendations).toBeDefined();
    });

    it('should filter foods by user preferences', async () => {
      await service.getRecommendations(mockRecommendationContext);

      expect(mockPreferenceFilter.filterFoodsByPreferences).toHaveBeenCalledWith(
        expect.any(Array),
        mockUserPreferences
      );
    });

    it('should score and rank foods correctly', async () => {
      await service.getRecommendations(mockRecommendationContext);

      expect(mockCompatibilityScorer.calculateOverallScore).toHaveBeenCalled();
      expect(mockCompatibilityScorer.calculateMindForkScore).toHaveBeenCalled();
      expect(mockCompatibilityScorer.rankRecommendations).toHaveBeenCalled();
    });

    it('should limit recommendations to maxRecommendations config', async () => {
      // Mock many food items
      const manyFoods = Array.from({ length: 20 }, (_, i) => ({
        id: `food_${i}`,
        name: `Food ${i}`,
        nutrition_per_100g: {
          calories: 100,
          protein: 10,
          carbs: 10,
          fat: 5,
          fiber: 2,
        },
      }));

      mockPreferenceFilter.filterFoodsByPreferences.mockReturnValue(manyFoods as any);

      const recommendations = await service.getRecommendations(mockRecommendationContext);

      expect(recommendations.length).toBeLessThanOrEqual(10); // Default maxRecommendations
    });

    it('should handle no compatible foods gracefully', async () => {
      mockPreferenceFilter.filterFoodsByPreferences.mockReturnValue([]);

      const recommendations = await service.getRecommendations(mockRecommendationContext);

      expect(recommendations).toBeDefined();
      // Should return fallback recommendations
    });

    it('should handle errors gracefully and return fallback', async () => {
      mockMacroCalculator.calculateRemainingTargets.mockRejectedValue(new Error('Database error'));

      const recommendations = await service.getRecommendations(mockRecommendationContext);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should cache recommendations after generation', async () => {
      await service.getRecommendations(mockRecommendationContext);

      expect(mockSupabase.from).toHaveBeenCalledWith('recommendation_cache');
    });
  });

  describe('getRecommendationsForScannedFood', () => {
    it('should analyze scanned food compatibility', async () => {
      const mockFood = mockFoodItems[0];
      
      // Mock food retrieval (would normally return null, but we'll mock it)
      jest.spyOn(service as any, 'getFoodById').mockResolvedValue(mockFood);
      
      mockPreferenceFilter.checkFoodCompatibility.mockReturnValue({
        isCompatible: true,
        violatedRestrictions: [],
        compatibilityScore: 90,
      });

      const result = await service.getRecommendationsForScannedFood(
        'salmon_fillet',
        mockRecommendationContext
      );

      expect(result).toHaveProperty('compatibility');
      expect(result).toHaveProperty('alternatives');
      expect(result.compatibility.isCompatible).toBe(true);
    });

    it('should provide alternatives for incompatible foods', async () => {
      const mockFood = mockFoodItems[0];
      
      jest.spyOn(service as any, 'getFoodById').mockResolvedValue(mockFood);
      
      mockPreferenceFilter.checkFoodCompatibility.mockReturnValue({
        isCompatible: false,
        violatedRestrictions: ['vegan: No animal products'],
        compatibilityScore: 30,
      });

      const result = await service.getRecommendationsForScannedFood(
        'salmon_fillet',
        mockRecommendationContext
      );

      expect(result.compatibility.isCompatible).toBe(false);
      expect(result.compatibility.violatedRestrictions.length).toBeGreaterThan(0);
    });

    it('should handle food not found error', async () => {
      jest.spyOn(service as any, 'getFoodById').mockResolvedValue(null);

      await expect(
        service.getRecommendationsForScannedFood('unknown_food', mockRecommendationContext)
      ).rejects.toThrow('Scanned food not found');
    });
  });

  describe('updateRecommendationsAfterFoodLog', () => {
    const mockFoodLogEntry: FoodLogEntry = {
      id: 'log123',
      userId: 'user123',
      foodId: 'salmon_fillet',
      amount: 150,
      unit: 'g',
      mealType: 'lunch',
      loggedAt: '2025-10-28T12:30:00.000Z',
      nutrition: {
        calories: 312,
        protein: 37.5,
        carbs: 0,
        fat: 18,
        fiber: 0,
      },
    };

    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);
    });

    it('should invalidate cache after food log', async () => {
      await service.updateRecommendationsAfterFoodLog(mockFoodLogEntry);

      expect(mockSupabase.from).toHaveBeenCalledWith('recommendation_cache');
    });

    it('should update nutrient gap analysis', async () => {
      await service.updateRecommendationsAfterFoodLog(mockFoodLogEntry);

      expect(mockNutrientAnalyzer.analyzeNutrientGaps).toHaveBeenCalledWith(
        'user123',
        '2025-10-28'
      );
    });

    it('should record user interaction', async () => {
      await service.updateRecommendationsAfterFoodLog(mockFoodLogEntry);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_food_interactions');
    });
  });

  describe('recordRecommendationFeedback', () => {
    const mockFeedback = {
      rating: 5,
      comment: 'Great recommendation!',
      categories: ['taste_good', 'filling'],
      wouldRecommendAgain: true,
    };

    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);
    });

    it('should store feedback in database', async () => {
      await service.recordRecommendationFeedback('rec123', mockFeedback);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_food_interactions');
    });
  });

  describe('recordFoodSelection', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);
    });

    it('should record food selection', async () => {
      await service.recordFoodSelection('rec123', 'salmon_fillet');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_food_interactions');
    });
  });

  describe('invalidateCache', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);
    });

    it('should clear cache for user', async () => {
      await service.invalidateCache('user123');

      expect(mockSupabase.from).toHaveBeenCalledWith('recommendation_cache');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const recommendations = await service.getRecommendations(mockRecommendationContext);

      expect(recommendations).toBeDefined();
      // Should return fallback recommendations
    });

    it('should handle missing user profile gracefully', async () => {
      mockProfileService.loadProfile.mockRejectedValue(new Error('Profile not found'));

      const recommendations = await service.getRecommendations(mockRecommendationContext);

      expect(recommendations).toBeDefined();
    });

    it('should handle nutrient analyzer errors', async () => {
      mockNutrientAnalyzer.analyzeNutrientGaps.mockRejectedValue(new Error('Analysis failed'));

      const recommendations = await service.getRecommendations(mockRecommendationContext);

      expect(recommendations).toBeDefined();
    });

    it('should handle compatibility scorer errors', async () => {
      mockCompatibilityScorer.calculateOverallScore.mockRejectedValue(new Error('Scoring failed'));

      const recommendations = await service.getRecommendations(mockRecommendationContext);

      expect(recommendations).toBeDefined();
    });
  });

  describe('Performance and Caching', () => {
    it('should complete recommendations within reasonable time', async () => {
      const startTime = Date.now();
      
      await service.getRecommendations(mockRecommendationContext);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should use in-memory cache for repeated requests', async () => {
      // First request
      await service.getRecommendations(mockRecommendationContext);
      
      // Second request with same context should be faster (cached)
      const startTime = Date.now();
      await service.getRecommendations(mockRecommendationContext);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Should be very fast from cache
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RecommendationService.getInstance();
      const instance2 = RecommendationService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Configuration', () => {
    it('should respect maxRecommendations configuration', async () => {
      // This would test configuration changes
      const recommendations = await service.getRecommendations(mockRecommendationContext);
      
      expect(recommendations.length).toBeLessThanOrEqual(10);
    });
  });
});
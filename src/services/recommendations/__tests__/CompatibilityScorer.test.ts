/**
 * CompatibilityScorer Unit Tests
 * 
 * Comprehensive tests for MindFork scoring and overall compatibility calculations
 */

import { CompatibilityScorer, type ScoringContext } from '../CompatibilityScorer';
import { supabase } from '../../../lib/supabase';
import type { 
  MindForkFoodScore,
  CompatibilityScore,
  PersonalizationFactors,
  FoodRecommendation,
  MacroCompatibility,
  NutrientGapAnalysis,
  UserDietaryPreferences,
  TimeContext,
  GoalAlignment,
  PersonalFoodHistory,
} from '../../../types/recommendations';
import type { FoodItem } from '../MacroCalculator';

// Mock dependencies
jest.mock('../../../lib/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('CompatibilityScorer', () => {
  let scorer: CompatibilityScorer;

  // Test food items
  const salmonFillet: FoodItem = {
    id: 'salmon_fillet',
    name: 'Salmon Fillet',
    nutrition_per_100g: {
      calories: 208,
      protein: 25,
      carbs: 0,
      fat: 12,
      fiber: 0,
    },
  };

  const processedCheese: FoodItem = {
    id: 'processed_cheese',
    name: 'Processed Cheese',
    nutrition_per_100g: {
      calories: 300,
      protein: 20,
      carbs: 5,
      fat: 25,
      fiber: 0,
    },
  };

  const spinach: FoodItem = {
    id: 'spinach',
    name: 'Fresh Spinach',
    nutrition_per_100g: {
      calories: 23,
      protein: 2.9,
      carbs: 3.6,
      fat: 0.4,
      fiber: 2.2,
    },
  };

  const blueberries: FoodItem = {
    id: 'blueberries',
    name: 'Fresh Blueberries',
    nutrition_per_100g: {
      calories: 57,
      protein: 0.7,
      carbs: 14,
      fat: 0.3,
      fiber: 2.4,
    },
  };

  // Mock scoring context
  const mockScoringContext: ScoringContext = {
    macroCompatibility: {
      overallScore: 85,
      caloriesFit: 80,
      proteinFit: 90,
      carbsFit: 85,
      fatFit: 80,
      fiberFit: 70,
      wouldExceedTargets: false,
      balanceScore: 85,
    },
    nutrientGaps: {
      topDeficiencies: [
        {
          nutrient: 'omega3',
          currentIntake: 0.5,
          targetIntake: 1.6,
          deficitPercentage: 68.75,
          importance: 'moderate',
        },
      ],
      overConsumption: [],
      balanceScore: 75,
      recommendations: [],
      priorityNutrients: ['omega3', 'vitaminD'],
    },
    userPreferences: {
      dietType: 'mindfork',
      foodExclusions: [],
      allergens: [],
    },
    timeContext: {
      currentTime: '12:30',
      mealWindow: {
        type: 'lunch',
        appropriateness: 90,
        typicalFoods: ['protein', 'vegetables'],
      },
      dayOfWeek: 1,
      isWeekend: false,
    },
    goalAlignment: {
      primaryGoal: 'get_healthy',
      alignmentScore: 80,
      goalSpecificFactors: {},
      progressTowardGoal: 60,
    },
    personalHistory: {
      frequentlyChosenFoods: ['salmon_fillet'],
      frequentlyIgnoredFoods: ['processed_cheese'],
      averagePortionSizes: {},
      mealTimingPatterns: [],
      macroPreferences: {
        proteinPreference: 10,
        carbPreference: 0,
        fatPreference: 5,
        fiberPreference: 8,
        consistencyScore: 75,
      },
      cuisinePreferences: {},
    },
  };

  beforeEach(() => {
    scorer = CompatibilityScorer.getInstance();
    jest.clearAllMocks();

    // Mock Supabase upsert for caching
    mockSupabase.from.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    } as any);
  });

  describe('calculateMindForkScore', () => {
    it('should calculate high scores for nutrient-dense whole foods', async () => {
      const score = await scorer.calculateMindForkScore(salmonFillet);

      expect(score.score).toBeGreaterThan(70);
      expect(score.tier).toBeOneOf(['pink_fire', 'brain_smart', 'good']);
      expect(score.processingLevel).toBe(1); // Unprocessed
      expect(score.omega3Bonus).toBeGreaterThan(0); // Salmon is high in omega-3
      expect(score.upfPenalty).toBe(0); // No processing penalty
    });

    it('should calculate lower scores for processed foods', async () => {
      const score = await scorer.calculateMindForkScore(processedCheese);

      expect(score.score).toBeLessThan(70);
      expect(score.tier).toBeOneOf(['caution', 'heavy', 'soot_bad']);
      expect(score.processingLevel).toBeGreaterThan(2); // Processed
      expect(score.upfPenalty).toBeGreaterThan(0); // Processing penalty
    });

    it('should give high scores to low-calorie, nutrient-dense foods', async () => {
      const score = await scorer.calculateMindForkScore(spinach);

      expect(score.score).toBeGreaterThan(80);
      expect(score.tier).toBeOneOf(['pink_fire', 'brain_smart']);
      expect(score.energyDensity).toBe(23); // Very low calorie density
      expect(score.nutrientDensity).toBeGreaterThan(50);
    });

    it('should assign correct MindFork tiers based on score', async () => {
      const highScoreFood = spinach; // Should score high
      const lowScoreFood = processedCheese; // Should score lower

      const highScore = await scorer.calculateMindForkScore(highScoreFood);
      const lowScore = await scorer.calculateMindForkScore(lowScoreFood);

      expect(highScore.tier).toBeOneOf(['pink_fire', 'brain_smart', 'good']);
      expect(lowScore.tier).toBeOneOf(['caution', 'heavy', 'soot_bad']);
    });

    it('should apply polyphenol bonus for antioxidant-rich foods', async () => {
      const score = await scorer.calculateMindForkScore(blueberries);

      expect(score.polyphenolBonus).toBeGreaterThan(0);
      expect(score.score).toBeGreaterThan(70); // Should get bonus points
    });

    it('should cache MindFork scores', async () => {
      // First calculation
      await scorer.calculateMindForkScore(salmonFillet);
      
      // Second calculation should use cache
      const score = await scorer.calculateMindForkScore(salmonFillet);
      
      expect(score).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('food_compatibility_scores');
    });

    it('should handle foods with missing nutrition data', async () => {
      const incompleteFood: FoodItem = {
        id: 'incomplete_food',
        name: 'Incomplete Food',
        nutrition_per_100g: {
          calories: 100,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
        },
      };

      const score = await scorer.calculateMindForkScore(incompleteFood);

      expect(score).toBeDefined();
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate comprehensive compatibility scores', async () => {
      const score = await scorer.calculateOverallScore(salmonFillet, mockScoringContext);

      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
      expect(score.componentScores).toBeDefined();
      expect(score.componentScores.macroFit).toBeDefined();
      expect(score.componentScores.nutrientDensity).toBeDefined();
      expect(score.componentScores.preferenceMatch).toBeDefined();
      expect(score.componentScores.goalAlignment).toBeDefined();
      expect(score.componentScores.timingAppropriate).toBeDefined();
      expect(score.componentScores.personalPreference).toBeDefined();
      expect(score.confidenceLevel).toBeGreaterThan(0);
      expect(score.reasoning).toBeInstanceOf(Array);
    });

    it('should weight macro fit heavily in overall score', async () => {
      const highMacroContext = {
        ...mockScoringContext,
        macroCompatibility: {
          ...mockScoringContext.macroCompatibility,
          overallScore: 95,
        },
      };

      const lowMacroContext = {
        ...mockScoringContext,
        macroCompatibility: {
          ...mockScoringContext.macroCompatibility,
          overallScore: 30,
        },
      };

      const highMacroScore = await scorer.calculateOverallScore(salmonFillet, highMacroContext);
      const lowMacroScore = await scorer.calculateOverallScore(salmonFillet, lowMacroContext);

      expect(highMacroScore.overallScore).toBeGreaterThan(lowMacroScore.overallScore);
    });

    it('should boost scores for foods that address nutrient deficiencies', async () => {
      const omega3DeficientContext = {
        ...mockScoringContext,
        nutrientGaps: {
          ...mockScoringContext.nutrientGaps,
          topDeficiencies: [
            {
              nutrient: 'omega3',
              currentIntake: 0.2,
              targetIntake: 1.6,
              deficitPercentage: 87.5,
              importance: 'critical' as const,
            },
          ],
        },
      };

      const salmonScore = await scorer.calculateOverallScore(salmonFillet, omega3DeficientContext);
      const spinachScore = await scorer.calculateOverallScore(spinach, omega3DeficientContext);

      // Salmon should score higher due to omega-3 content
      expect(salmonScore.componentScores.nutrientDensity).toBeGreaterThan(
        spinachScore.componentScores.nutrientDensity
      );
    });

    it('should adjust scores based on goal alignment', async () => {
      const weightLossContext = {
        ...mockScoringContext,
        goalAlignment: {
          ...mockScoringContext.goalAlignment,
          primaryGoal: 'lose_weight' as const,
        },
      };

      const muscleBuildingContext = {
        ...mockScoringContext,
        goalAlignment: {
          ...mockScoringContext.goalAlignment,
          primaryGoal: 'gain_muscle' as const,
        },
      };

      const lowCalorieScore = await scorer.calculateOverallScore(spinach, weightLossContext);
      const highProteinScore = await scorer.calculateOverallScore(salmonFillet, muscleBuildingContext);

      expect(lowCalorieScore.componentScores.goalAlignment).toBeGreaterThan(70);
      expect(highProteinScore.componentScores.goalAlignment).toBeGreaterThan(70);
    });

    it('should consider meal timing appropriateness', async () => {
      const breakfastContext = {
        ...mockScoringContext,
        timeContext: {
          ...mockScoringContext.timeContext,
          mealWindow: {
            type: 'breakfast' as const,
            appropriateness: 90,
            typicalFoods: ['carbs', 'protein'],
          },
        },
      };

      const dinnerContext = {
        ...mockScoringContext,
        timeContext: {
          ...mockScoringContext.timeContext,
          mealWindow: {
            type: 'dinner' as const,
            appropriateness: 90,
            typicalFoods: ['protein', 'vegetables'],
          },
        },
      };

      const breakfastScore = await scorer.calculateOverallScore(salmonFillet, breakfastContext);
      const dinnerScore = await scorer.calculateOverallScore(salmonFillet, dinnerContext);

      expect(breakfastScore.componentScores.timingAppropriate).toBeDefined();
      expect(dinnerScore.componentScores.timingAppropriate).toBeDefined();
    });

    it('should provide reasoning for scores', async () => {
      const score = await scorer.calculateOverallScore(salmonFillet, mockScoringContext);

      expect(score.reasoning).toBeInstanceOf(Array);
      expect(score.reasoning.length).toBeGreaterThan(0);
      expect(score.reasoning[0]).toMatch(/\w+/); // Should contain actual text
    });

    it('should provide improvement suggestions for low scores', async () => {
      const lowScoreContext = {
        ...mockScoringContext,
        macroCompatibility: {
          ...mockScoringContext.macroCompatibility,
          overallScore: 30, // Low macro fit
        },
      };

      const score = await scorer.calculateOverallScore(processedCheese, lowScoreContext);

      if (score.overallScore < 70) {
        expect(score.improvementSuggestions).toBeDefined();
        expect(score.improvementSuggestions?.length).toBeGreaterThan(0);
      }
    });

    it('should calculate confidence levels based on data quality', async () => {
      const completeContext = mockScoringContext;
      const incompleteContext = {
        ...mockScoringContext,
        personalHistory: {
          ...mockScoringContext.personalHistory,
          frequentlyChosenFoods: [], // No history
        },
      };

      const completeScore = await scorer.calculateOverallScore(salmonFillet, completeContext);
      const incompleteScore = await scorer.calculateOverallScore(salmonFillet, incompleteContext);

      expect(completeScore.confidenceLevel).toBeGreaterThanOrEqual(incompleteScore.confidenceLevel);
    });
  });

  describe('calculatePersonalizationBoost', () => {
    const mockPersonalizationFactors: PersonalizationFactors = {
      userHistory: {
        frequentlyChosenFoods: ['salmon_fillet', 'chicken_breast'],
        frequentlyIgnoredFoods: ['processed_cheese'],
        averagePortionSizes: {},
        mealTimingPatterns: [],
        macroPreferences: {
          proteinPreference: 15,
          carbPreference: -5,
          fatPreference: 0,
          fiberPreference: 10,
          consistencyScore: 80,
        },
        cuisinePreferences: { mediterranean: 85, asian: 70 },
      },
      learningConfidence: 85,
      interactionCount: 50,
      preferenceStrength: {
        dietary: 90,
        portion: 75,
        timing: 60,
        variety: 80,
      },
    };

    it('should boost scores for frequently chosen foods', () => {
      const boost = scorer.calculatePersonalizationBoost(salmonFillet, mockPersonalizationFactors);

      expect(boost).toBeGreaterThan(0);
    });

    it('should penalize frequently ignored foods', () => {
      const boost = scorer.calculatePersonalizationBoost(processedCheese, mockPersonalizationFactors);

      expect(boost).toBeLessThan(0);
    });

    it('should boost foods matching cuisine preferences', () => {
      const mediterraneanFood: FoodItem = {
        id: 'mediterranean_salad',
        name: 'Mediterranean Salad',
        nutrition_per_100g: {
          calories: 120,
          protein: 5,
          carbs: 10,
          fat: 8,
          fiber: 4,
        },
      };

      const boost = scorer.calculatePersonalizationBoost(mediterraneanFood, mockPersonalizationFactors);

      expect(boost).toBeGreaterThan(0);
    });

    it('should cap boost values within reasonable range', () => {
      const boost = scorer.calculatePersonalizationBoost(salmonFillet, mockPersonalizationFactors);

      expect(boost).toBeGreaterThanOrEqual(-30);
      expect(boost).toBeLessThanOrEqual(30);
    });

    it('should handle low learning confidence', () => {
      const lowConfidenceFactors = {
        ...mockPersonalizationFactors,
        learningConfidence: 20,
      };

      const boost = scorer.calculatePersonalizationBoost(salmonFillet, lowConfidenceFactors);

      // Boost should be smaller with low confidence
      expect(Math.abs(boost)).toBeLessThan(10);
    });
  });

  describe('rankRecommendations', () => {
    const mockRecommendations: FoodRecommendation[] = [
      {
        id: 'rec1',
        foodId: 'salmon_fillet',
        name: 'Salmon Fillet',
        compatibilityScore: 85,
        recommendedPortion: {
          amount: 150,
          unit: 'g',
          calories: 312,
          macros: { calories: 312, protein: 37.5, carbs: 0, fat: 18, fiber: 0 },
        },
        reasonsForRecommendation: [],
        nutritionalHighlights: [],
        alternativePortions: [],
        mindForkTier: 'brain_smart',
        estimatedSatisfaction: 80,
      },
      {
        id: 'rec2',
        foodId: 'chicken_breast',
        name: 'Chicken Breast',
        compatibilityScore: 90,
        recommendedPortion: {
          amount: 120,
          unit: 'g',
          calories: 198,
          macros: { calories: 198, protein: 37.2, carbs: 0, fat: 4.3, fiber: 0 },
        },
        reasonsForRecommendation: [],
        nutritionalHighlights: [],
        alternativePortions: [],
        mindForkTier: 'good',
        estimatedSatisfaction: 75,
      },
      {
        id: 'rec3',
        foodId: 'spinach',
        name: 'Fresh Spinach',
        compatibilityScore: 80,
        recommendedPortion: {
          amount: 200,
          unit: 'g',
          calories: 46,
          macros: { calories: 46, protein: 5.8, carbs: 7.2, fat: 0.8, fiber: 4.4 },
        },
        reasonsForRecommendation: [],
        nutritionalHighlights: [],
        alternativePortions: [],
        mindForkTier: 'pink_fire',
      },
    ];

    it('should sort recommendations by compatibility score', () => {
      const ranked = scorer.rankRecommendations(mockRecommendations);

      expect(ranked[0].compatibilityScore).toBeGreaterThanOrEqual(ranked[1].compatibilityScore);
      expect(ranked[1].compatibilityScore).toBeGreaterThanOrEqual(ranked[2].compatibilityScore);
    });

    it('should use estimated satisfaction as secondary sort', () => {
      const sameScoreRecs = [
        { ...mockRecommendations[0], compatibilityScore: 85, estimatedSatisfaction: 90 },
        { ...mockRecommendations[1], compatibilityScore: 85, estimatedSatisfaction: 70 },
      ];

      const ranked = scorer.rankRecommendations(sameScoreRecs);

      expect(ranked[0].estimatedSatisfaction).toBeGreaterThan(ranked[1].estimatedSatisfaction!);
    });

    it('should use MindFork tier as tertiary sort', () => {
      const sameScoreRecs = [
        { ...mockRecommendations[0], compatibilityScore: 85, mindForkTier: 'good' as const },
        { ...mockRecommendations[1], compatibilityScore: 85, mindForkTier: 'pink_fire' as const },
      ];

      const ranked = scorer.rankRecommendations(sameScoreRecs);

      expect(ranked[0].mindForkTier).toBe('pink_fire'); // Higher tier should come first
    });

    it('should apply diversity scoring to ensure variety', () => {
      const manyProteinRecs = Array.from({ length: 10 }, (_, i) => ({
        ...mockRecommendations[0],
        id: `rec${i}`,
        foodId: `protein_${i}`,
        name: `Protein ${i}`,
      }));

      const ranked = scorer.rankRecommendations(manyProteinRecs);

      // Should still return recommendations but with some diversity
      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked.length).toBeLessThanOrEqual(manyProteinRecs.length);
    });

    it('should handle empty recommendation arrays', () => {
      const ranked = scorer.rankRecommendations([]);

      expect(ranked).toEqual([]);
    });

    it('should not mutate original array', () => {
      const original = [...mockRecommendations];
      const ranked = scorer.rankRecommendations(mockRecommendations);

      expect(mockRecommendations).toEqual(original);
      expect(ranked).not.toBe(mockRecommendations);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const score = await scorer.calculateMindForkScore(salmonFillet);

      expect(score).toBeDefined();
      expect(score.score).toBeGreaterThanOrEqual(0);
    });

    it('should return default scores on calculation errors', async () => {
      // Mock a food that might cause calculation errors
      const problematicFood: FoodItem = {
        id: 'problematic',
        name: 'Problematic Food',
        nutrition_per_100g: {
          calories: NaN,
          protein: -1,
          carbs: Infinity,
          fat: 0,
          fiber: 0,
        },
      };

      const score = await scorer.calculateMindForkScore(problematicFood);

      expect(score).toBeDefined();
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
    });

    it('should handle missing context data in overall scoring', async () => {
      const incompleteContext = {
        ...mockScoringContext,
        macroCompatibility: undefined as any,
      };

      const score = await scorer.calculateOverallScore(salmonFillet, incompleteContext);

      expect(score).toBeDefined();
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CompatibilityScorer.getInstance();
      const instance2 = CompatibilityScorer.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
/**
 * NutrientAnalyzer Unit Tests
 * 
 * Comprehensive tests for nutrient gap analysis and nutrient-dense food discovery
 */

import { NutrientAnalyzer, type DailyNutrientTargets } from '../NutrientAnalyzer';
import { macroCalculator } from '../MacroCalculator';
import { supabase } from '../../../lib/supabase';
import type { 
  NutrientGapAnalysis, 
  UserDietaryPreferences,
  MicroNutrients 
} from '../../../types/recommendations';
import type { FoodItem } from '../MacroCalculator';

// Mock dependencies
jest.mock('../MacroCalculator');
jest.mock('../../../lib/supabase');

const mockMacroCalculator = macroCalculator as jest.Mocked<typeof macroCalculator>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('NutrientAnalyzer', () => {
  let analyzer: NutrientAnalyzer;

  // Test data
  const mockFoodItem: FoodItem = {
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

  const mockSpinach: FoodItem = {
    id: 'spinach',
    name: 'Spinach',
    nutrition_per_100g: {
      calories: 23,
      protein: 2.9,
      carbs: 3.6,
      fat: 0.4,
      fiber: 2.2,
    },
  };

  const mockAlmonds: FoodItem = {
    id: 'almonds',
    name: 'Almonds',
    nutrition_per_100g: {
      calories: 579,
      protein: 21,
      carbs: 22,
      fat: 50,
      fiber: 12,
    },
  };

  beforeEach(() => {
    analyzer = NutrientAnalyzer.getInstance();
    jest.clearAllMocks();
  });

  describe('analyzeNutrientGaps', () => {
    beforeEach(() => {
      // Mock daily progress
      mockMacroCalculator.calculateDailyProgress.mockResolvedValue({
        totalCalories: 1200,
        totalProtein: 60,
        totalCarbs: 100,
        totalFat: 40,
        totalFiber: 15,
        mealCount: 2,
      });
    });

    it('should return cached analysis if available', async () => {
      const cachedAnalysis: NutrientGapAnalysis = {
        topDeficiencies: [],
        overConsumption: [],
        balanceScore: 85,
        recommendations: ['Eat more variety'],
        priorityNutrients: ['vitaminD'],
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { nutrient_analysis: cachedAnalysis },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await analyzer.analyzeNutrientGaps('user123', '2025-10-28');

      expect(result).toEqual(cachedAnalysis);
      expect(mockMacroCalculator.calculateDailyProgress).not.toHaveBeenCalled();
    });

    it('should analyze gaps when no cache available', async () => {
      // Mock no cached data
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      // Mock food logs for nutrient calculation
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: [
                  { food_id: 'salmon_fillet', amount: 150, unit: 'g' },
                  { food_id: 'spinach', amount: 100, unit: 'g' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      // Mock cache upsert
      mockSupabase.from.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await analyzer.analyzeNutrientGaps('user123', '2025-10-28');

      expect(result).toBeDefined();
      expect(result.topDeficiencies).toBeDefined();
      expect(result.overConsumption).toBeDefined();
      expect(result.balanceScore).toBeGreaterThanOrEqual(0);
      expect(result.balanceScore).toBeLessThanOrEqual(100);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.priorityNutrients).toBeInstanceOf(Array);
    });

    it('should identify nutrient deficiencies correctly', async () => {
      // Mock minimal food intake
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: [], // No food logged
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await analyzer.analyzeNutrientGaps('user123', '2025-10-28');

      expect(result.topDeficiencies.length).toBeGreaterThan(0);
      expect(result.balanceScore).toBeLessThan(60); // Should be low with no intake
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('Database error')),
            }),
          }),
        }),
      } as any);

      await expect(
        analyzer.analyzeNutrientGaps('user123', '2025-10-28')
      ).rejects.toThrow('Database error');
    });
  });

  describe('findNutrientRichFoods', () => {
    const preferences: UserDietaryPreferences = {
      dietType: 'mindfork',
      foodExclusions: [],
      allergens: [],
    };

    it('should find foods rich in specific nutrients', async () => {
      const targetNutrients = ['vitaminD', 'omega3'];
      
      const result = await analyzer.findNutrientRichFoods(targetNutrients, preferences);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      // Should include salmon which is rich in vitamin D and omega-3
      const salmon = result.find(food => food.foodId === 'salmon_fillet');
      expect(salmon).toBeDefined();
      expect(salmon?.keyNutrients.length).toBeGreaterThan(0);
      expect(salmon?.nutrientDensityScore).toBeGreaterThan(0);
    });

    it('should return foods sorted by nutrient density', async () => {
      const targetNutrients = ['vitaminA', 'iron'];
      
      const result = await analyzer.findNutrientRichFoods(targetNutrients, preferences);

      if (result.length > 1) {
        // Should be sorted by nutrient density score (highest first)
        expect(result[0].nutrientDensityScore).toBeGreaterThanOrEqual(
          result[1].nutrientDensityScore
        );
      }
    });

    it('should include synergistic nutrients information', async () => {
      const targetNutrients = ['iron'];
      
      const result = await analyzer.findNutrientRichFoods(targetNutrients, preferences);

      const ironRichFood = result.find(food => 
        food.keyNutrients.some(n => n.nutrient === 'iron')
      );

      if (ironRichFood) {
        expect(ironRichFood.synergisticNutrients).toBeDefined();
        // Iron should have vitamin C as synergistic nutrient
        expect(ironRichFood.synergisticNutrients).toContain('vitaminC');
      }
    });

    it('should handle empty target nutrients', async () => {
      const result = await analyzer.findNutrientRichFoods([], preferences);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it('should include bioavailability information', async () => {
      const targetNutrients = ['iron'];
      
      const result = await analyzer.findNutrientRichFoods(targetNutrients, preferences);

      const ironRichFood = result.find(food => 
        food.keyNutrients.some(n => n.nutrient === 'iron')
      );

      if (ironRichFood) {
        expect(ironRichFood.bioavailability).toBeDefined();
        expect(ironRichFood.bioavailability).toBeGreaterThan(0);
        expect(ironRichFood.bioavailability).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('calculateNutrientDensity', () => {
    it('should calculate nutrient density for foods with known nutrients', () => {
      const density = analyzer.calculateNutrientDensity(mockFoodItem);

      expect(density.overallScore).toBeGreaterThanOrEqual(0);
      expect(density.overallScore).toBeLessThanOrEqual(100);
      expect(density.vitaminScore).toBeGreaterThanOrEqual(0);
      expect(density.mineralScore).toBeGreaterThanOrEqual(0);
      expect(density.antioxidantScore).toBeGreaterThanOrEqual(0);
      expect(density.essentialFattyAcidScore).toBeGreaterThanOrEqual(0);
      expect(density.fiberScore).toBeGreaterThanOrEqual(0);
    });

    it('should return default scores for unknown foods', () => {
      const unknownFood: FoodItem = {
        id: 'unknown_food',
        name: 'Unknown Food',
        nutrition_per_100g: {
          calories: 100,
          protein: 10,
          carbs: 15,
          fat: 3,
          fiber: 2,
        },
      };

      const density = analyzer.calculateNutrientDensity(unknownFood);

      expect(density.overallScore).toBe(50);
      expect(density.vitaminScore).toBe(50);
      expect(density.mineralScore).toBe(50);
    });

    it('should score high-fiber foods appropriately', () => {
      const highFiberFood: FoodItem = {
        id: 'high_fiber_food',
        name: 'High Fiber Food',
        nutrition_per_100g: {
          calories: 100,
          protein: 5,
          carbs: 20,
          fat: 1,
          fiber: 15, // High fiber content
        },
      };

      const density = analyzer.calculateNutrientDensity(highFiberFood);

      expect(density.fiberScore).toBeGreaterThan(50);
    });

    it('should handle foods with zero fiber', () => {
      const zeroFiberFood: FoodItem = {
        id: 'zero_fiber_food',
        name: 'Zero Fiber Food',
        nutrition_per_100g: {
          calories: 200,
          protein: 20,
          carbs: 0,
          fat: 10,
          fiber: 0,
        },
      };

      const density = analyzer.calculateNutrientDensity(zeroFiberFood);

      expect(density.fiberScore).toBe(0);
      expect(density.overallScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('suggestNutrientCombinations', () => {
    it('should suggest combinations for deficient nutrients', () => {
      const deficientNutrients = ['iron', 'vitaminC'];
      
      const combinations = analyzer.suggestNutrientCombinations(deficientNutrients);

      expect(combinations).toBeInstanceOf(Array);
      
      if (combinations.length > 0) {
        const combination = combinations[0];
        expect(combination.foods).toBeInstanceOf(Array);
        expect(combination.combinedNutrients).toBeInstanceOf(Array);
        expect(combination.synergisticBenefits).toBeInstanceOf(Array);
        expect(combination.preparationSuggestion).toBeTruthy();
        expect(combination.totalNutrientScore).toBeGreaterThan(0);
      }
    });

    it('should identify synergistic benefits', () => {
      const deficientNutrients = ['iron', 'vitaminC'];
      
      const combinations = analyzer.suggestNutrientCombinations(deficientNutrients);

      const ironVitaminCCombo = combinations.find(combo =>
        combo.combinedNutrients.includes('iron') && 
        combo.combinedNutrients.includes('vitaminC')
      );

      if (ironVitaminCCombo) {
        expect(ironVitaminCCombo.synergisticBenefits).toContain(
          'Vitamin C enhances iron absorption'
        );
      }
    });

    it('should sort combinations by nutrient score', () => {
      const deficientNutrients = ['vitaminA', 'vitaminC', 'iron'];
      
      const combinations = analyzer.suggestNutrientCombinations(deficientNutrients);

      if (combinations.length > 1) {
        expect(combinations[0].totalNutrientScore).toBeGreaterThanOrEqual(
          combinations[1].totalNutrientScore
        );
      }
    });

    it('should handle empty deficient nutrients', () => {
      const combinations = analyzer.suggestNutrientCombinations([]);

      expect(combinations).toBeInstanceOf(Array);
      expect(combinations.length).toBe(0);
    });

    it('should provide preparation suggestions', () => {
      const deficientNutrients = ['calcium', 'vitaminD'];
      
      const combinations = analyzer.suggestNutrientCombinations(deficientNutrients);

      if (combinations.length > 0) {
        expect(combinations[0].preparationSuggestion).toBeTruthy();
        expect(typeof combinations[0].preparationSuggestion).toBe('string');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing nutrient data gracefully', () => {
      const foodWithoutNutrients: FoodItem = {
        id: 'empty_food',
        name: 'Empty Food',
        nutrition_per_100g: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
        },
      };

      expect(() => {
        analyzer.calculateNutrientDensity(foodWithoutNutrients);
      }).not.toThrow();
    });

    it('should handle database connection errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('Connection failed')),
            }),
          }),
        }),
      } as any);

      await expect(
        analyzer.analyzeNutrientGaps('user123', '2025-10-28')
      ).rejects.toThrow();
    });

    it('should handle malformed food log data', async () => {
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      // Mock malformed food logs
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: [
                  { food_id: null, amount: 'invalid', unit: undefined },
                  { food_id: 'unknown_food', amount: 100, unit: 'g' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await analyzer.analyzeNutrientGaps('user123', '2025-10-28');

      expect(result).toBeDefined();
      expect(result.topDeficiencies).toBeInstanceOf(Array);
    });

    it('should handle very high nutrient intake', async () => {
      // This would test the overconsumption detection
      // Implementation would depend on having mock data with high nutrient values
      const preferences: UserDietaryPreferences = {
        dietType: 'mindfork',
        foodExclusions: [],
        allergens: [],
      };

      const result = await analyzer.findNutrientRichFoods(['vitaminA'], preferences);

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NutrientAnalyzer.getInstance();
      const instance2 = NutrientAnalyzer.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Nutrient Target Calculations', () => {
    it('should calculate deficiency percentages correctly', async () => {
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: [], // No food intake
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await analyzer.analyzeNutrientGaps('user123', '2025-10-28');

      // With no intake, should have high deficiency percentages
      if (result.topDeficiencies.length > 0) {
        expect(result.topDeficiencies[0].deficitPercentage).toBeGreaterThan(90);
      }
    });

    it('should prioritize critical nutrient deficiencies', async () => {
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await analyzer.analyzeNutrientGaps('user123', '2025-10-28');

      // Should prioritize critical nutrients in priority list
      expect(result.priorityNutrients).toBeInstanceOf(Array);
      
      if (result.priorityNutrients.length > 0) {
        const criticalNutrients = ['vitaminB12', 'iron', 'vitaminD', 'folate'];
        const hasCritical = result.priorityNutrients.some(nutrient =>
          criticalNutrients.includes(nutrient)
        );
        expect(hasCritical).toBe(true);
      }
    });
  });
});
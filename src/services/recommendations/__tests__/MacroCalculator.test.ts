/**
 * MacroCalculator Unit Tests
 * 
 * Comprehensive tests for macro calculation and compatibility scoring
 */

import { MacroCalculator, type FoodItem } from '../MacroCalculator';
import { profileService } from '../../ProfileService';
import { supabase } from '../../../lib/supabase';
import type { RemainingTargets, MacroNutrients } from '../../../types/recommendations';

// Mock dependencies
jest.mock('../../ProfileService');
jest.mock('../../../lib/supabase');

const mockProfileService = profileService as jest.Mocked<typeof profileService>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('MacroCalculator', () => {
  let calculator: MacroCalculator;

  // Test data
  const mockUserProfile = {
    id: 'user123',
    daily_calories: 2000,
    daily_protein_g: 150,
    daily_carbs_g: 200,
    daily_fat_g: 67,
    daily_fiber_g: 25,
  };

  const mockFoodItem: FoodItem = {
    id: 'chicken_breast',
    name: 'Chicken Breast',
    nutrition_per_100g: {
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
    },
    typical_serving_size: 150,
    typical_serving_unit: 'g',
  };

  const mockHighCalorieFoodItem: FoodItem = {
    id: 'pizza_slice',
    name: 'Pizza Slice',
    nutrition_per_100g: {
      calories: 266,
      protein: 11,
      carbs: 33,
      fat: 10,
      fiber: 2,
    },
    typical_serving_size: 100,
    typical_serving_unit: 'g',
  };

  beforeEach(() => {
    calculator = MacroCalculator.getInstance();
    jest.clearAllMocks();
  });

  describe('calculateRemainingTargets', () => {
    beforeEach(() => {
      mockProfileService.loadProfile.mockResolvedValue(mockUserProfile as any);
    });

    it('should calculate remaining targets correctly with no food logged', async () => {
      // Mock empty food logs
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const remaining = await calculator.calculateRemainingTargets('user123', '2025-10-28');

      expect(remaining.calories).toBe(2000);
      expect(remaining.protein).toBe(150);
      expect(remaining.carbs).toBe(200);
      expect(remaining.fat).toBe(67);
      expect(remaining.fiber).toBe(25);
      expect(remaining.percentageOfDayRemaining).toBeGreaterThan(0);
      expect(remaining.mealsRemaining).toBeGreaterThan(0);
    });

    it('should calculate remaining targets correctly with some food logged', async () => {
      // Mock food logs with some intake
      const mockFoodLogs = [
        {
          calories: 300,
          protein: 25,
          carbs: 30,
          fat: 10,
          fiber: 5,
          meal_type: 'breakfast',
          logged_at: '2025-10-28T08:00:00.000Z',
        },
        {
          calories: 450,
          protein: 35,
          carbs: 40,
          fat: 15,
          fiber: 8,
          meal_type: 'lunch',
          logged_at: '2025-10-28T12:30:00.000Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockFoodLogs,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const remaining = await calculator.calculateRemainingTargets('user123', '2025-10-28');

      expect(remaining.calories).toBe(1250); // 2000 - 750
      expect(remaining.protein).toBe(90);    // 150 - 60
      expect(remaining.carbs).toBe(130);     // 200 - 70
      expect(remaining.fat).toBe(42);        // 67 - 25
      expect(remaining.fiber).toBe(12);      // 25 - 13
    });

    it('should handle case where targets are exceeded', async () => {
      // Mock food logs that exceed daily targets
      const mockFoodLogs = [
        {
          calories: 2500,
          protein: 200,
          carbs: 250,
          fat: 100,
          fiber: 30,
          meal_type: 'breakfast',
          logged_at: '2025-10-28T08:00:00.000Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockFoodLogs,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const remaining = await calculator.calculateRemainingTargets('user123', '2025-10-28');

      // Should return 0 for exceeded targets, not negative
      expect(remaining.calories).toBe(0);
      expect(remaining.protein).toBe(0);
      expect(remaining.carbs).toBe(0);
      expect(remaining.fat).toBe(0);
      expect(remaining.fiber).toBe(0);
    });

    it('should throw error when profile missing nutrition goals', async () => {
      mockProfileService.loadProfile.mockResolvedValue({
        id: 'user123',
        // Missing daily_calories
      } as any);

      await expect(
        calculator.calculateRemainingTargets('user123', '2025-10-28')
      ).rejects.toThrow('User profile missing nutrition goals');
    });
  });

  describe('calculateMacroCompatibility', () => {
    const mockRemainingTargets: RemainingTargets = {
      calories: 500,
      protein: 40,
      carbs: 50,
      fat: 20,
      fiber: 10,
      percentageOfDayRemaining: 30,
      mealsRemaining: 1,
    };

    it('should calculate high compatibility for well-fitting food', () => {
      // 150g chicken breast = ~248 calories, 46.5g protein
      const compatibility = calculator.calculateMacroCompatibility(
        mockFoodItem,
        150,
        mockRemainingTargets
      );

      expect(compatibility.overallScore).toBeGreaterThan(70);
      expect(compatibility.caloriesFit).toBeGreaterThan(70);
      expect(compatibility.proteinFit).toBeGreaterThan(70);
      expect(compatibility.wouldExceedTargets).toBe(false);
      expect(compatibility.excessAmount).toBeUndefined();
    });

    it('should calculate low compatibility for oversized portions', () => {
      // 300g chicken breast = ~495 calories (close to limit but high protein)
      const compatibility = calculator.calculateMacroCompatibility(
        mockFoodItem,
        300,
        mockRemainingTargets
      );

      expect(compatibility.overallScore).toBeLessThan(80);
      expect(compatibility.caloriesFit).toBeLessThan(80);
      expect(compatibility.wouldExceedTargets).toBe(false); // Just under limit
    });

    it('should detect target exceedance', () => {
      // Large pizza slice that exceeds calorie target
      const compatibility = calculator.calculateMacroCompatibility(
        mockHighCalorieFoodItem,
        300, // 300g = ~798 calories
        mockRemainingTargets
      );

      expect(compatibility.wouldExceedTargets).toBe(true);
      expect(compatibility.excessAmount).toBeDefined();
      expect(compatibility.excessAmount?.calories).toBeGreaterThan(0);
      expect(compatibility.overallScore).toBeLessThan(50);
    });

    it('should handle zero remaining targets', () => {
      const zeroTargets: RemainingTargets = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        percentageOfDayRemaining: 0,
        mealsRemaining: 0,
      };

      const compatibility = calculator.calculateMacroCompatibility(
        mockFoodItem,
        100,
        zeroTargets
      );

      expect(compatibility.overallScore).toBeLessThan(30);
      expect(compatibility.wouldExceedTargets).toBe(true);
    });

    it('should calculate balance score correctly', () => {
      // Test with a balanced food item
      const balancedFood: FoodItem = {
        id: 'balanced_meal',
        name: 'Balanced Meal',
        nutrition_per_100g: {
          calories: 200,
          protein: 15, // 30% of calories
          carbs: 25,   // 50% of calories
          fat: 4.4,    // 20% of calories
          fiber: 5,
        },
      };

      const compatibility = calculator.calculateMacroCompatibility(
        balancedFood,
        100,
        mockRemainingTargets
      );

      expect(compatibility.balanceScore).toBeGreaterThan(50);
      expect(compatibility.overallScore).toBeGreaterThan(60);
    });
  });

  describe('optimizePortionForTargets', () => {
    const mockRemainingTargets: RemainingTargets = {
      calories: 400,
      protein: 30,
      carbs: 40,
      fat: 15,
      fiber: 8,
      percentageOfDayRemaining: 25,
      mealsRemaining: 1,
    };

    it('should optimize portion size for calorie constraint', () => {
      const optimized = calculator.optimizePortionForTargets(
        mockFoodItem,
        mockRemainingTargets
      );

      expect(optimized.recommendedAmount).toBeGreaterThan(0);
      expect(optimized.recommendedAmount).toBeLessThan(300); // Should be reasonable
      expect(optimized.unit).toBe('g');
      expect(optimized.macroFitScore).toBeGreaterThan(50);
      expect(optimized.alternativePortions).toHaveLength(3);
      expect(optimized.reasoning).toContain('calories');
    });

    it('should provide alternative portion sizes', () => {
      const optimized = calculator.optimizePortionForTargets(
        mockFoodItem,
        mockRemainingTargets
      );

      const alternatives = optimized.alternativePortions;
      expect(alternatives).toHaveLength(3);
      
      // Should be sorted by fit score (highest first)
      expect(alternatives[0].fitScore).toBeGreaterThanOrEqual(alternatives[1].fitScore);
      expect(alternatives[1].fitScore).toBeGreaterThanOrEqual(alternatives[2].fitScore);

      // Each alternative should have required properties
      alternatives.forEach(alt => {
        expect(alt.amount).toBeGreaterThan(0);
        expect(alt.unit).toBe('g');
        expect(alt.calories).toBeGreaterThan(0);
        expect(alt.macros).toBeDefined();
        expect(alt.fitScore).toBeGreaterThanOrEqual(0);
        expect(alt.description).toBeTruthy();
      });
    });

    it('should handle very low remaining targets', () => {
      const lowTargets: RemainingTargets = {
        calories: 50,
        protein: 5,
        carbs: 5,
        fat: 2,
        fiber: 1,
        percentageOfDayRemaining: 5,
        mealsRemaining: 0,
      };

      const optimized = calculator.optimizePortionForTargets(
        mockFoodItem,
        lowTargets
      );

      expect(optimized.recommendedAmount).toBeGreaterThanOrEqual(10); // Minimum viable portion
      expect(optimized.recommendedAmount).toBeLessThan(50); // Should be small
      expect(optimized.reasoning).toContain('calories');
    });

    it('should handle high-calorie foods appropriately', () => {
      const optimized = calculator.optimizePortionForTargets(
        mockHighCalorieFoodItem,
        mockRemainingTargets
      );

      // Should recommend smaller portion for high-calorie food
      expect(optimized.recommendedAmount).toBeLessThan(200);
      expect(optimized.macroFitScore).toBeGreaterThan(30);
    });
  });

  describe('calculateDailyProgress', () => {
    it('should calculate progress correctly with multiple food logs', async () => {
      const mockFoodLogs = [
        {
          calories: 300,
          protein: 25,
          carbs: 30,
          fat: 10,
          fiber: 5,
          meal_type: 'breakfast',
          logged_at: '2025-10-28T08:00:00.000Z',
        },
        {
          calories: 150,
          protein: 10,
          carbs: 15,
          fat: 5,
          fiber: 3,
          meal_type: 'snack',
          logged_at: '2025-10-28T10:30:00.000Z',
        },
        {
          calories: 450,
          protein: 35,
          carbs: 40,
          fat: 15,
          fiber: 8,
          meal_type: 'lunch',
          logged_at: '2025-10-28T12:30:00.000Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockFoodLogs,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const progress = await calculator.calculateDailyProgress('user123', '2025-10-28');

      expect(progress.totalCalories).toBe(900);
      expect(progress.totalProtein).toBe(70);
      expect(progress.totalCarbs).toBe(85);
      expect(progress.totalFat).toBe(30);
      expect(progress.totalFiber).toBe(16);
      expect(progress.mealCount).toBe(3); // breakfast, snack, lunch
      expect(progress.lastMealTime).toBe('2025-10-28T12:30:00.000Z');
    });

    it('should return zero progress with no food logs', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const progress = await calculator.calculateDailyProgress('user123', '2025-10-28');

      expect(progress.totalCalories).toBe(0);
      expect(progress.totalProtein).toBe(0);
      expect(progress.totalCarbs).toBe(0);
      expect(progress.totalFat).toBe(0);
      expect(progress.totalFiber).toBe(0);
      expect(progress.mealCount).toBe(0);
      expect(progress.lastMealTime).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        }),
      } as any);

      await expect(
        calculator.calculateDailyProgress('user123', '2025-10-28')
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle foods with zero calories', () => {
      const zeroCalorieFood: FoodItem = {
        id: 'water',
        name: 'Water',
        nutrition_per_100g: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
        },
      };

      const remaining: RemainingTargets = {
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 5,
        fiber: 2,
        percentageOfDayRemaining: 50,
        mealsRemaining: 1,
      };

      const compatibility = calculator.calculateMacroCompatibility(
        zeroCalorieFood,
        500,
        remaining
      );

      expect(compatibility.overallScore).toBeGreaterThan(80); // Should be high for zero-calorie foods
      expect(compatibility.wouldExceedTargets).toBe(false);
    });

    it('should handle very small portions', () => {
      const remaining: RemainingTargets = {
        calories: 1000,
        protein: 50,
        carbs: 100,
        fat: 30,
        fiber: 15,
        percentageOfDayRemaining: 80,
        mealsRemaining: 3,
      };

      const optimized = calculator.optimizePortionForTargets(
        mockFoodItem,
        remaining
      );

      expect(optimized.recommendedAmount).toBeGreaterThanOrEqual(10); // Minimum portion
      expect(optimized.macroFitScore).toBeGreaterThan(0);
    });

    it('should handle missing optional nutrition data', () => {
      const incompleteFood: FoodItem = {
        id: 'incomplete_food',
        name: 'Incomplete Food',
        nutrition_per_100g: {
          calories: 100,
          protein: 10,
          carbs: 15,
          fat: 3,
          fiber: 2,
          // Missing sugar and sodium
        },
      };

      const remaining: RemainingTargets = {
        calories: 200,
        protein: 20,
        carbs: 25,
        fat: 8,
        fiber: 5,
        percentageOfDayRemaining: 40,
        mealsRemaining: 2,
      };

      expect(() => {
        calculator.calculateMacroCompatibility(incompleteFood, 100, remaining);
      }).not.toThrow();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MacroCalculator.getInstance();
      const instance2 = MacroCalculator.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
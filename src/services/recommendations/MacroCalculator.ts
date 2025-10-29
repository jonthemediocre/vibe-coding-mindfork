/**
 * MacroCalculator
 * 
 * Calculates remaining daily targets and macro compatibility for food recommendations
 */

import { supabase } from '../../lib/supabase';
import { profileService } from '../ProfileService';
import type {
  RemainingTargets,
  MacroCompatibility,
  OptimizedPortion,
  MacroNutrients,
  FoodLogEntry,
  ExcessMacros,
  PortionOption,
} from '../../types/recommendations';

export interface FoodItem {
  id: string;
  name: string;
  nutrition_per_100g: MacroNutrients;
  typical_serving_size?: number;
  typical_serving_unit?: string;
}

export interface DailyProgress {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  mealCount: number;
  lastMealTime?: string;
}

export class MacroCalculator {
  private static instance: MacroCalculator;

  private constructor() {}

  public static getInstance(): MacroCalculator {
    if (!MacroCalculator.instance) {
      MacroCalculator.instance = new MacroCalculator();
    }
    return MacroCalculator.instance;
  }

  /**
   * Calculate remaining daily targets for a user
   */
  public async calculateRemainingTargets(
    userId: string, 
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<RemainingTargets> {
    try {
      // Get user's daily goals from profile
      const profile = await profileService.loadProfile(userId, { includeNutritionGoals: true });
      
      if (!profile.daily_calories) {
        throw new Error('User profile missing nutrition goals');
      }

      // Get current day's food logs
      const dailyProgress = await this.calculateDailyProgress(userId, date);

      // Calculate remaining amounts
      const remainingCalories = Math.max(0, profile.daily_calories - dailyProgress.totalCalories);
      const remainingProtein = Math.max(0, (profile.daily_protein_g || 0) - dailyProgress.totalProtein);
      const remainingCarbs = Math.max(0, (profile.daily_carbs_g || 0) - dailyProgress.totalCarbs);
      const remainingFat = Math.max(0, (profile.daily_fat_g || 0) - dailyProgress.totalFat);
      const remainingFiber = Math.max(0, (profile.daily_fiber_g || 0) - dailyProgress.totalFiber);

      // Calculate percentage of day remaining (based on typical meal schedule)
      const currentHour = new Date().getHours();
      const percentageOfDayRemaining = this.calculateDayPercentageRemaining(currentHour);

      // Estimate meals remaining based on current progress and time
      const mealsRemaining = this.estimateMealsRemaining(dailyProgress.mealCount, currentHour);

      // Calculate hours until typical bedtime (assuming 10 PM)
      const hoursUntilBedtime = this.calculateHoursUntilBedtime(currentHour);

      return {
        calories: remainingCalories,
        protein: remainingProtein,
        carbs: remainingCarbs,
        fat: remainingFat,
        fiber: remainingFiber,
        percentageOfDayRemaining,
        mealsRemaining,
        hoursUntilBedtime,
      };
    } catch (error) {
      console.error('MacroCalculator: Error calculating remaining targets:', error);
      throw error;
    }
  }

  /**
   * Calculate macro compatibility for a food item with remaining targets
   */
  public calculateMacroCompatibility(
    food: FoodItem, 
    portionGrams: number, 
    remaining: RemainingTargets
  ): MacroCompatibility {
    try {
      // Calculate nutrition for the specified portion
      const portionNutrition = this.calculatePortionNutrition(food, portionGrams);

      // Calculate fit scores using sigmoid function for smooth scoring
      const caloriesFit = this.calculateFitScore(portionNutrition.calories, remaining.calories);
      const proteinFit = this.calculateFitScore(portionNutrition.protein, remaining.protein);
      const carbsFit = this.calculateFitScore(portionNutrition.carbs, remaining.carbs);
      const fatFit = this.calculateFitScore(portionNutrition.fat, remaining.fat);
      const fiberFit = this.calculateFitScore(portionNutrition.fiber, remaining.fiber);

      // Check if food would exceed targets
      const wouldExceedTargets = this.checkTargetExceedance(portionNutrition, remaining);
      const excessAmount = wouldExceedTargets ? this.calculateExcess(portionNutrition, remaining) : undefined;

      // Calculate balance score (how well it balances remaining macro ratios)
      const balanceScore = this.calculateBalanceScore(portionNutrition, remaining);

      // Calculate overall score (weighted average)
      const overallScore = this.calculateOverallMacroScore({
        caloriesFit,
        proteinFit,
        carbsFit,
        fatFit,
        fiberFit,
        balanceScore,
        wouldExceedTargets,
      });

      return {
        overallScore,
        caloriesFit,
        proteinFit,
        carbsFit,
        fatFit,
        fiberFit,
        wouldExceedTargets,
        excessAmount,
        balanceScore,
      };
    } catch (error) {
      console.error('MacroCalculator: Error calculating macro compatibility:', error);
      throw error;
    }
  }

  /**
   * Optimize portion size to fit remaining targets
   */
  public optimizePortionForTargets(food: FoodItem, remaining: RemainingTargets): OptimizedPortion {
    try {
      // Start with typical serving size or 100g
      const basePortionGrams = food.typical_serving_size || 100;
      
      // Calculate optimal portion based on calorie constraint (most limiting factor)
      let optimalPortion = basePortionGrams;
      
      if (remaining.calories > 0) {
        const caloriesPer100g = food.nutrition_per_100g.calories;
        const maxPortionByCalories = (remaining.calories / caloriesPer100g) * 100;
        optimalPortion = Math.min(optimalPortion, maxPortionByCalories);
      }

      // Ensure minimum viable portion (at least 10g)
      optimalPortion = Math.max(10, optimalPortion);

      // Calculate macro fit score for optimal portion
      const compatibility = this.calculateMacroCompatibility(food, optimalPortion, remaining);
      
      // Generate alternative portion options
      const alternativePortions = this.generateAlternativePortions(food, optimalPortion, remaining);

      // Generate reasoning for the recommendation
      const reasoning = this.generatePortionReasoning(food, optimalPortion, remaining, compatibility);

      return {
        recommendedAmount: Math.round(optimalPortion),
        unit: 'g',
        macroFitScore: compatibility.overallScore,
        alternativePortions,
        reasoning,
      };
    } catch (error) {
      console.error('MacroCalculator: Error optimizing portion:', error);
      throw error;
    }
  }

  /**
   * Get current daily progress for a user
   */
  public async calculateDailyProgress(userId: string, date: string): Promise<DailyProgress> {
    try {
      const { data: foodLogs, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', `${date}T00:00:00.000Z`)
        .lt('logged_at', `${date}T23:59:59.999Z`)
        .order('logged_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (!foodLogs || foodLogs.length === 0) {
        return {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalFiber: 0,
          mealCount: 0,
        };
      }

      // Sum up all nutrition from food logs
      const totals = foodLogs.reduce(
        (acc, log) => ({
          totalCalories: acc.totalCalories + (log.calories || 0),
          totalProtein: acc.totalProtein + (log.protein || 0),
          totalCarbs: acc.totalCarbs + (log.carbs || 0),
          totalFat: acc.totalFat + (log.fat || 0),
          totalFiber: acc.totalFiber + (log.fiber || 0),
        }),
        {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalFiber: 0,
        }
      );

      // Count unique meals (group by meal_type and approximate time)
      const uniqueMeals = new Set(
        foodLogs.map(log => `${log.meal_type}_${log.logged_at.split('T')[0]}`)
      );

      const lastMealTime = foodLogs[foodLogs.length - 1]?.logged_at;

      return {
        ...totals,
        mealCount: uniqueMeals.size,
        lastMealTime,
      };
    } catch (error) {
      console.error('MacroCalculator: Error calculating daily progress:', error);
      throw error;
    }
  }

  // Private helper methods

  private calculatePortionNutrition(food: FoodItem, portionGrams: number): MacroNutrients {
    const multiplier = portionGrams / 100;
    const nutrition = food.nutrition_per_100g;

    return {
      calories: Math.round(nutrition.calories * multiplier),
      protein: Math.round(nutrition.protein * multiplier * 10) / 10,
      carbs: Math.round(nutrition.carbs * multiplier * 10) / 10,
      fat: Math.round(nutrition.fat * multiplier * 10) / 10,
      fiber: Math.round(nutrition.fiber * multiplier * 10) / 10,
      sugar: nutrition.sugar ? Math.round(nutrition.sugar * multiplier * 10) / 10 : undefined,
      sodium: nutrition.sodium ? Math.round(nutrition.sodium * multiplier) : undefined,
    };
  }

  private calculateFitScore(amount: number, remaining: number): number {
    if (remaining <= 0) {
      return amount === 0 ? 100 : 0;
    }

    // Sigmoid function for smooth scoring
    // Perfect fit = 100, exceeding by 50% = 0
    const ratio = amount / remaining;
    const score = 100 / (1 + Math.exp(5 * (ratio - 1)));
    
    return Math.max(0, Math.min(100, score));
  }

  private checkTargetExceedance(nutrition: MacroNutrients, remaining: RemainingTargets): boolean {
    return (
      nutrition.calories > remaining.calories * 1.1 || // 10% tolerance
      nutrition.protein > remaining.protein * 1.2 ||   // 20% tolerance for protein
      nutrition.carbs > remaining.carbs * 1.1 ||
      nutrition.fat > remaining.fat * 1.1
    );
  }

  private calculateExcess(nutrition: MacroNutrients, remaining: RemainingTargets): ExcessMacros {
    const excess: ExcessMacros = {};

    if (nutrition.calories > remaining.calories) {
      excess.calories = nutrition.calories - remaining.calories;
    }
    if (nutrition.protein > remaining.protein) {
      excess.protein = nutrition.protein - remaining.protein;
    }
    if (nutrition.carbs > remaining.carbs) {
      excess.carbs = nutrition.carbs - remaining.carbs;
    }
    if (nutrition.fat > remaining.fat) {
      excess.fat = nutrition.fat - remaining.fat;
    }

    return excess;
  }

  private calculateBalanceScore(nutrition: MacroNutrients, remaining: RemainingTargets): number {
    // Calculate how well the food balances the remaining macro ratios
    if (remaining.calories <= 0) return 50; // Neutral score if no calories remaining

    const remainingProteinRatio = (remaining.protein * 4) / remaining.calories;
    const remainingCarbRatio = (remaining.carbs * 4) / remaining.calories;
    const remainingFatRatio = (remaining.fat * 9) / remaining.calories;

    const foodProteinRatio = (nutrition.protein * 4) / nutrition.calories;
    const foodCarbRatio = (nutrition.carbs * 4) / nutrition.calories;
    const foodFatRatio = (nutrition.fat * 9) / nutrition.calories;

    // Calculate how close the food's ratios are to the remaining ratios
    const proteinDiff = Math.abs(foodProteinRatio - remainingProteinRatio);
    const carbDiff = Math.abs(foodCarbRatio - remainingCarbRatio);
    const fatDiff = Math.abs(foodFatRatio - remainingFatRatio);

    const averageDiff = (proteinDiff + carbDiff + fatDiff) / 3;
    
    // Convert to score (lower difference = higher score)
    return Math.max(0, 100 - (averageDiff * 200));
  }

  private calculateOverallMacroScore(scores: {
    caloriesFit: number;
    proteinFit: number;
    carbsFit: number;
    fatFit: number;
    fiberFit: number;
    balanceScore: number;
    wouldExceedTargets: boolean;
  }): number {
    // Weighted average of all scores
    const weights = {
      calories: 0.35,  // Most important
      protein: 0.25,
      carbs: 0.15,
      fat: 0.15,
      fiber: 0.05,
      balance: 0.05,
    };

    let weightedScore = 
      scores.caloriesFit * weights.calories +
      scores.proteinFit * weights.protein +
      scores.carbsFit * weights.carbs +
      scores.fatFit * weights.fat +
      scores.fiberFit * weights.fiber +
      scores.balanceScore * weights.balance;

    // Apply penalty for exceeding targets
    if (scores.wouldExceedTargets) {
      weightedScore *= 0.7; // 30% penalty
    }

    return Math.max(0, Math.min(100, Math.round(weightedScore)));
  }

  private generateAlternativePortions(
    food: FoodItem, 
    optimalPortion: number, 
    remaining: RemainingTargets
  ): PortionOption[] {
    const portions: PortionOption[] = [];

    // Generate 3 alternative sizes: small (50%), medium (75%), large (150%)
    const alternatives = [
      { multiplier: 0.5, description: 'Light snack' },
      { multiplier: 0.75, description: 'Small portion' },
      { multiplier: 1.5, description: 'Large portion' },
    ];

    for (const alt of alternatives) {
      const portionSize = Math.round(optimalPortion * alt.multiplier);
      const nutrition = this.calculatePortionNutrition(food, portionSize);
      const compatibility = this.calculateMacroCompatibility(food, portionSize, remaining);

      portions.push({
        amount: portionSize,
        unit: 'g',
        calories: nutrition.calories,
        macros: nutrition,
        fitScore: compatibility.overallScore,
        description: alt.description,
      });
    }

    return portions.sort((a, b) => b.fitScore - a.fitScore);
  }

  private generatePortionReasoning(
    food: FoodItem,
    portion: number,
    remaining: RemainingTargets,
    compatibility: MacroCompatibility
  ): string {
    const nutrition = this.calculatePortionNutrition(food, portion);
    
    if (compatibility.overallScore >= 80) {
      return `Perfect fit! This portion provides ${nutrition.calories} calories, fitting well within your remaining ${remaining.calories} calorie budget.`;
    } else if (compatibility.overallScore >= 60) {
      return `Good fit. This portion gives you ${nutrition.calories} calories and ${nutrition.protein}g protein from your remaining targets.`;
    } else if (compatibility.wouldExceedTargets) {
      return `This portion would exceed your remaining targets. Consider a smaller serving or save for tomorrow.`;
    } else {
      return `Moderate fit. This portion provides ${nutrition.calories} calories toward your remaining ${remaining.calories} calorie goal.`;
    }
  }

  private calculateDayPercentageRemaining(currentHour: number): number {
    // Assume eating window from 7 AM to 9 PM (14 hours)
    const eatingStartHour = 7;
    const eatingEndHour = 21;
    
    if (currentHour < eatingStartHour) {
      return 100; // Full day ahead
    } else if (currentHour >= eatingEndHour) {
      return 0; // Eating window closed
    } else {
      const hoursIntoEatingWindow = currentHour - eatingStartHour;
      const totalEatingHours = eatingEndHour - eatingStartHour;
      return Math.max(0, 100 - (hoursIntoEatingWindow / totalEatingHours) * 100);
    }
  }

  private estimateMealsRemaining(currentMealCount: number, currentHour: number): number {
    // Typical meal schedule: breakfast (7-9), lunch (12-14), dinner (18-20)
    let expectedMeals = 0;
    
    if (currentHour < 9) expectedMeals++; // Breakfast
    if (currentHour < 14) expectedMeals++; // Lunch
    if (currentHour < 20) expectedMeals++; // Dinner
    
    // Add snacks if there's time
    if (currentHour < 16) expectedMeals += 0.5; // Afternoon snack
    if (currentHour < 21) expectedMeals += 0.5; // Evening snack
    
    return Math.max(0, Math.ceil(expectedMeals - currentMealCount));
  }

  private calculateHoursUntilBedtime(currentHour: number): number {
    const bedtimeHour = 22; // 10 PM
    
    if (currentHour <= bedtimeHour) {
      return bedtimeHour - currentHour;
    } else {
      return (24 - currentHour) + bedtimeHour; // Next day
    }
  }
}

// Export singleton instance
export const macroCalculator = MacroCalculator.getInstance();
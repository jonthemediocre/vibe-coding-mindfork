/**
 * NutrientAnalyzer
 * 
 * Analyzes micronutrient gaps and suggests nutrient-dense foods
 */

import { supabase } from '../../lib/supabase';
import { macroCalculator } from './MacroCalculator';
import type {
  NutrientGapAnalysis,
  NutrientDeficiency,
  NutrientExcess,
  NutrientRichFood,
  KeyNutrient,
  NutrientCombination,
  UserDietaryPreferences,
  MicroNutrients,
} from '../../types/recommendations';
import type { FoodItem } from './MacroCalculator';

export interface NutrientDensityScore {
  overallScore: number; // 0-100
  vitaminScore: number;
  mineralScore: number;
  antioxidantScore: number;
  essentialFattyAcidScore: number;
  fiberScore: number;
}

export interface DailyNutrientTargets {
  // Vitamins (daily values)
  vitaminA: number; // mcg
  vitaminC: number; // mg
  vitaminD: number; // mcg
  vitaminE: number; // mg
  vitaminK: number; // mcg
  thiamine: number; // mg
  riboflavin: number; // mg
  niacin: number; // mg
  vitaminB6: number; // mg
  folate: number; // mcg
  vitaminB12: number; // mcg
  
  // Minerals (daily values)
  calcium: number; // mg
  iron: number; // mg
  magnesium: number; // mg
  phosphorus: number; // mg
  potassium: number; // mg
  zinc: number; // mg
  selenium: number; // mcg
  
  // Other nutrients
  omega3: number; // g
  polyphenols: number; // mg
}

export class NutrientAnalyzer {
  private static instance: NutrientAnalyzer;
  private nutrientTargets: Map<string, DailyNutrientTargets>;
  private nutrientDatabase: Map<string, MicroNutrients>; // foodId -> nutrients
  private synergisticCombinations: Map<string, string[]>; // nutrient -> synergistic nutrients

  private constructor() {
    this.nutrientTargets = new Map();
    this.nutrientDatabase = new Map();
    this.synergisticCombinations = new Map();
    this.initializeNutrientTargets();
    this.initializeNutrientDatabase();
    this.initializeSynergisticCombinations();
  }

  public static getInstance(): NutrientAnalyzer {
    if (!NutrientAnalyzer.instance) {
      NutrientAnalyzer.instance = new NutrientAnalyzer();
    }
    return NutrientAnalyzer.instance;
  }

  /**
   * Analyze nutrient gaps for a user on a specific date
   */
  public async analyzeNutrientGaps(
    userId: string, 
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<NutrientGapAnalysis> {
    try {
      // Check cache first
      const cachedAnalysis = await this.getCachedNutrientGaps(userId, date);
      if (cachedAnalysis) {
        return cachedAnalysis;
      }

      // Get user's daily progress
      const dailyProgress = await macroCalculator.calculateDailyProgress(userId, date);
      
      // Get user's nutrient targets (based on age, gender, activity level)
      const targets = await this.getUserNutrientTargets(userId);
      
      // Calculate current nutrient intake from food logs
      const currentIntake = await this.calculateCurrentNutrientIntake(userId, date);
      
      // Identify deficiencies
      const topDeficiencies = this.identifyDeficiencies(currentIntake, targets);
      
      // Identify overconsumption
      const overConsumption = this.identifyOverconsumption(currentIntake, targets);
      
      // Calculate balance score
      const balanceScore = this.calculateNutrientBalanceScore(currentIntake, targets);
      
      // Generate recommendations
      const recommendations = this.generateNutrientRecommendations(topDeficiencies, overConsumption);
      
      // Identify priority nutrients for today
      const priorityNutrients = this.identifyPriorityNutrients(topDeficiencies, balanceScore);

      const analysis: NutrientGapAnalysis = {
        topDeficiencies,
        overConsumption,
        balanceScore,
        recommendations,
        priorityNutrients,
      };

      // Cache the analysis
      await this.cacheNutrientGaps(userId, date, analysis, balanceScore);

      return analysis;
    } catch (error) {
      console.error('NutrientAnalyzer: Error analyzing nutrient gaps:', error);
      throw error;
    }
  }

  /**
   * Find foods rich in specific nutrients
   */
  public async findNutrientRichFoods(
    targetNutrients: string[], 
    preferences: UserDietaryPreferences
  ): Promise<NutrientRichFood[]> {
    try {
      // This would typically query a comprehensive food database
      // For now, use our limited nutrient database
      const nutrientRichFoods: NutrientRichFood[] = [];

      for (const [foodId, nutrients] of this.nutrientDatabase.entries()) {
        const keyNutrients: KeyNutrient[] = [];
        let totalNutrientScore = 0;

        // Check each target nutrient
        for (const nutrient of targetNutrients) {
          const amount = this.getNutrientAmount(nutrients, nutrient);
          if (amount > 0) {
            const dailyValue = this.getDailyValuePercentage(nutrient, amount);
            if (dailyValue >= 10) { // At least 10% DV per 100g
              keyNutrients.push({
                nutrient,
                amountPer100g: amount,
                percentDailyValue: dailyValue,
                bioavailabilityFactor: this.getBioavailabilityFactor(nutrient, foodId),
              });
              totalNutrientScore += dailyValue;
            }
          }
        }

        if (keyNutrients.length > 0) {
          // Calculate nutrient density score
          const densityScore = this.calculateNutrientDensity({ id: foodId } as FoodItem);
          
          // Find synergistic nutrients
          const synergisticNutrients = this.findSynergisticNutrients(targetNutrients);

          nutrientRichFoods.push({
            foodId,
            name: this.getFoodName(foodId),
            keyNutrients,
            nutrientDensityScore: densityScore.overallScore,
            synergisticNutrients,
            bioavailability: this.calculateOverallBioavailability(keyNutrients),
          });
        }
      }

      // Sort by nutrient density score and relevance
      return nutrientRichFoods
        .sort((a, b) => b.nutrientDensityScore - a.nutrientDensityScore)
        .slice(0, 20); // Return top 20 foods
    } catch (error) {
      console.error('NutrientAnalyzer: Error finding nutrient-rich foods:', error);
      return [];
    }
  }

  /**
   * Calculate nutrient density for a food item
   */
  public calculateNutrientDensity(food: FoodItem): NutrientDensityScore {
    try {
      const nutrients = this.nutrientDatabase.get(food.id);
      if (!nutrients) {
        return {
          overallScore: 50, // Default score
          vitaminScore: 50,
          mineralScore: 50,
          antioxidantScore: 50,
          essentialFattyAcidScore: 50,
          fiberScore: 50,
        };
      }

      // Calculate scores for different nutrient categories
      const vitaminScore = this.calculateVitaminScore(nutrients);
      const mineralScore = this.calculateMineralScore(nutrients);
      const antioxidantScore = this.calculateAntioxidantScore(nutrients);
      const essentialFattyAcidScore = this.calculateEssentialFattyAcidScore(nutrients);
      const fiberScore = this.calculateFiberScore(food);

      // Calculate overall score (weighted average)
      const overallScore = (
        vitaminScore * 0.25 +
        mineralScore * 0.25 +
        antioxidantScore * 0.20 +
        essentialFattyAcidScore * 0.15 +
        fiberScore * 0.15
      );

      return {
        overallScore: Math.round(overallScore),
        vitaminScore: Math.round(vitaminScore),
        mineralScore: Math.round(mineralScore),
        antioxidantScore: Math.round(antioxidantScore),
        essentialFattyAcidScore: Math.round(essentialFattyAcidScore),
        fiberScore: Math.round(fiberScore),
      };
    } catch (error) {
      console.error('NutrientAnalyzer: Error calculating nutrient density:', error);
      return {
        overallScore: 50,
        vitaminScore: 50,
        mineralScore: 50,
        antioxidantScore: 50,
        essentialFattyAcidScore: 50,
        fiberScore: 50,
      };
    }
  }

  /**
   * Suggest nutrient combinations for optimal absorption
   */
  public suggestNutrientCombinations(deficientNutrients: string[]): NutrientCombination[] {
    try {
      const combinations: NutrientCombination[] = [];

      // Find foods that contain multiple deficient nutrients
      for (const [foodId, nutrients] of this.nutrientDatabase.entries()) {
        const containedNutrients: string[] = [];
        
        for (const nutrient of deficientNutrients) {
          const amount = this.getNutrientAmount(nutrients, nutrient);
          if (amount > 0 && this.getDailyValuePercentage(nutrient, amount) >= 5) {
            containedNutrients.push(nutrient);
          }
        }

        if (containedNutrients.length >= 2) {
          // Find synergistic benefits
          const synergisticBenefits = this.findSynergisticBenefits(containedNutrients);
          
          // Generate preparation suggestion
          const preparationSuggestion = this.generatePreparationSuggestion(foodId, containedNutrients);
          
          // Calculate total nutrient score
          const totalNutrientScore = containedNutrients.reduce((sum, nutrient) => {
            const amount = this.getNutrientAmount(nutrients, nutrient);
            return sum + this.getDailyValuePercentage(nutrient, amount);
          }, 0);

          combinations.push({
            foods: [foodId],
            combinedNutrients: containedNutrients,
            synergisticBenefits,
            preparationSuggestion,
            totalNutrientScore,
          });
        }
      }

      // Sort by total nutrient score
      return combinations
        .sort((a, b) => b.totalNutrientScore - a.totalNutrientScore)
        .slice(0, 10);
    } catch (error) {
      console.error('NutrientAnalyzer: Error suggesting combinations:', error);
      return [];
    }
  }

  // Private helper methods

  private async getCachedNutrientGaps(userId: string, date: string): Promise<NutrientGapAnalysis | null> {
    try {
      const { data, error } = await supabase
        .from('daily_nutrient_gaps')
        .select('nutrient_analysis')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

      if (error || !data) {
        return null;
      }

      return data.nutrient_analysis as NutrientGapAnalysis;
    } catch (error) {
      console.error('NutrientAnalyzer: Error getting cached gaps:', error);
      return null;
    }
  }

  private async cacheNutrientGaps(
    userId: string, 
    date: string, 
    analysis: NutrientGapAnalysis, 
    balanceScore: number
  ): Promise<void> {
    try {
      await supabase
        .from('daily_nutrient_gaps')
        .upsert({
          user_id: userId,
          date,
          nutrient_analysis: analysis,
          top_deficiencies: analysis.topDeficiencies,
          balance_score: balanceScore,
        });
    } catch (error) {
      console.error('NutrientAnalyzer: Error caching gaps:', error);
    }
  }

  private async getUserNutrientTargets(userId: string): Promise<DailyNutrientTargets> {
    // This would typically be based on user profile (age, gender, activity level)
    // For now, return adult targets
    return this.nutrientTargets.get('adult_default') || this.getDefaultNutrientTargets();
  }

  private async calculateCurrentNutrientIntake(userId: string, date: string): Promise<MicroNutrients> {
    try {
      // Get food logs for the day
      const { data: foodLogs, error } = await supabase
        .from('food_logs')
        .select('food_id, amount, unit')
        .eq('user_id', userId)
        .gte('logged_at', `${date}T00:00:00.000Z`)
        .lt('logged_at', `${date}T23:59:59.999Z`);

      if (error || !foodLogs) {
        return {};
      }

      // Sum up nutrients from all logged foods
      const totalIntake: MicroNutrients = {};

      for (const log of foodLogs) {
        const foodNutrients = this.nutrientDatabase.get(log.food_id);
        if (foodNutrients) {
          // Calculate portion multiplier (assuming amount is in grams)
          const portionMultiplier = (log.amount || 100) / 100;
          
          // Add nutrients to total
          this.addNutrients(totalIntake, foodNutrients, portionMultiplier);
        }
      }

      return totalIntake;
    } catch (error) {
      console.error('NutrientAnalyzer: Error calculating current intake:', error);
      return {};
    }
  }

  private identifyDeficiencies(
    currentIntake: MicroNutrients, 
    targets: DailyNutrientTargets
  ): NutrientDeficiency[] {
    const deficiencies: NutrientDeficiency[] = [];

    // Check each nutrient
    for (const [nutrient, target] of Object.entries(targets)) {
      const current = this.getNutrientAmount(currentIntake, nutrient);
      const deficitPercentage = Math.max(0, ((target - current) / target) * 100);

      if (deficitPercentage > 20) { // More than 20% deficit
        const importance = this.getDeficiencyImportance(nutrient, deficitPercentage);
        
        deficiencies.push({
          nutrient,
          currentIntake: current,
          targetIntake: target,
          deficitPercentage,
          importance,
          healthImpact: this.getHealthImpact(nutrient, deficitPercentage),
        });
      }
    }

    // Sort by importance and deficit percentage
    return deficiencies
      .sort((a, b) => {
        const importanceOrder = { critical: 3, moderate: 2, minor: 1 };
        const aScore = importanceOrder[a.importance] * a.deficitPercentage;
        const bScore = importanceOrder[b.importance] * b.deficitPercentage;
        return bScore - aScore;
      })
      .slice(0, 5); // Top 5 deficiencies
  }

  private identifyOverconsumption(
    currentIntake: MicroNutrients, 
    targets: DailyNutrientTargets
  ): NutrientExcess[] {
    const excesses: NutrientExcess[] = [];

    // Define upper limits (typically 2-3x the target for most nutrients)
    const upperLimits: Partial<DailyNutrientTargets> = {
      vitaminA: targets.vitaminA * 3,
      vitaminD: targets.vitaminD * 2,
      iron: targets.iron * 2.5,
      zinc: targets.zinc * 3,
      selenium: targets.selenium * 2,
    };

    for (const [nutrient, limit] of Object.entries(upperLimits)) {
      const current = this.getNutrientAmount(currentIntake, nutrient);
      if (current > limit) {
        const excessPercentage = ((current - limit) / limit) * 100;
        
        excesses.push({
          nutrient,
          currentIntake: current,
          recommendedLimit: limit,
          excessPercentage,
          healthConcern: this.getExcessHealthConcern(nutrient, excessPercentage),
        });
      }
    }

    return excesses.sort((a, b) => b.excessPercentage - a.excessPercentage);
  }

  private calculateNutrientBalanceScore(
    currentIntake: MicroNutrients, 
    targets: DailyNutrientTargets
  ): number {
    let totalScore = 0;
    let nutrientCount = 0;

    for (const [nutrient, target] of Object.entries(targets)) {
      const current = this.getNutrientAmount(currentIntake, nutrient);
      const percentage = (current / target) * 100;
      
      // Optimal range is 80-120% of target
      let score: number;
      if (percentage >= 80 && percentage <= 120) {
        score = 100;
      } else if (percentage >= 60 && percentage <= 150) {
        score = 80;
      } else if (percentage >= 40 && percentage <= 200) {
        score = 60;
      } else {
        score = 40;
      }

      totalScore += score;
      nutrientCount++;
    }

    return nutrientCount > 0 ? Math.round(totalScore / nutrientCount) : 50;
  }

  private generateNutrientRecommendations(
    deficiencies: NutrientDeficiency[], 
    excesses: NutrientExcess[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommendations for deficiencies
    for (const deficiency of deficiencies.slice(0, 3)) { // Top 3
      const foodSuggestions = this.getFoodSuggestionsForNutrient(deficiency.nutrient);
      recommendations.push(
        `Increase ${deficiency.nutrient}: Try ${foodSuggestions.join(', ')}`
      );
    }

    // Recommendations for excesses
    for (const excess of excesses.slice(0, 2)) { // Top 2
      recommendations.push(
        `Reduce ${excess.nutrient}: Consider limiting foods high in this nutrient`
      );
    }

    // General recommendations
    if (deficiencies.length > 3) {
      recommendations.push('Consider a varied diet with colorful fruits and vegetables');
    }

    return recommendations;
  }

  private identifyPriorityNutrients(
    deficiencies: NutrientDeficiency[], 
    balanceScore: number
  ): string[] {
    // Focus on critical and moderate deficiencies
    return deficiencies
      .filter(d => d.importance === 'critical' || d.importance === 'moderate')
      .slice(0, 3)
      .map(d => d.nutrient);
  }

  // Initialize data methods

  private initializeNutrientTargets(): void {
    // Adult default targets (based on RDA/AI values)
    this.nutrientTargets.set('adult_default', {
      vitaminA: 900, // mcg
      vitaminC: 90, // mg
      vitaminD: 20, // mcg
      vitaminE: 15, // mg
      vitaminK: 120, // mcg
      thiamine: 1.2, // mg
      riboflavin: 1.3, // mg
      niacin: 16, // mg
      vitaminB6: 1.7, // mg
      folate: 400, // mcg
      vitaminB12: 2.4, // mcg
      calcium: 1000, // mg
      iron: 8, // mg (men) / 18 (women)
      magnesium: 400, // mg
      phosphorus: 700, // mg
      potassium: 4700, // mg
      zinc: 11, // mg
      selenium: 55, // mcg
      omega3: 1.6, // g
      polyphenols: 500, // mg
    });
  }

  private initializeNutrientDatabase(): void {
    // Sample nutrient data for common foods
    this.nutrientDatabase.set('salmon_fillet', {
      vitaminD: 11,
      vitaminB12: 4.8,
      omega3: 2.3,
      selenium: 36,
      phosphorus: 200,
      potassium: 628,
    });

    this.nutrientDatabase.set('spinach', {
      vitaminA: 469,
      vitaminC: 28,
      vitaminK: 483,
      folate: 194,
      iron: 2.7,
      magnesium: 79,
      potassium: 558,
    });

    this.nutrientDatabase.set('almonds', {
      vitaminE: 25.6,
      magnesium: 270,
      phosphorus: 481,
      calcium: 269,
      riboflavin: 1.1,
    });

    this.nutrientDatabase.set('sweet_potato', {
      vitaminA: 709,
      vitaminC: 2.4,
      potassium: 337,
      magnesium: 25,
    });

    this.nutrientDatabase.set('blueberries', {
      vitaminC: 9.7,
      vitaminK: 19.3,
      polyphenols: 560,
    });
  }

  private initializeSynergisticCombinations(): void {
    this.synergisticCombinations.set('iron', ['vitaminC', 'vitaminA']);
    this.synergisticCombinations.set('calcium', ['vitaminD', 'vitaminK']);
    this.synergisticCombinations.set('vitaminD', ['calcium', 'magnesium']);
    this.synergisticCombinations.set('vitaminA', ['iron', 'zinc']);
    this.synergisticCombinations.set('omega3', ['vitaminE']);
  }

  // Utility methods

  private getNutrientAmount(nutrients: MicroNutrients, nutrient: string): number {
    return (nutrients as any)[nutrient] || 0;
  }

  private getDailyValuePercentage(nutrient: string, amount: number): number {
    const targets = this.nutrientTargets.get('adult_default');
    if (!targets) return 0;
    
    const target = (targets as any)[nutrient];
    return target ? (amount / target) * 100 : 0;
  }

  private getBioavailabilityFactor(nutrient: string, foodId: string): number {
    // Simplified bioavailability factors
    const factors: Record<string, number> = {
      iron: foodId.includes('meat') ? 0.8 : 0.3, // Heme vs non-heme iron
      calcium: foodId.includes('dairy') ? 0.9 : 0.5,
      vitaminA: foodId.includes('fat') ? 0.8 : 0.4, // Fat-soluble
    };
    
    return factors[nutrient] || 0.7; // Default
  }

  private calculateOverallBioavailability(keyNutrients: KeyNutrient[]): number {
    if (keyNutrients.length === 0) return 50;
    
    const avgBioavailability = keyNutrients.reduce(
      (sum, nutrient) => sum + (nutrient.bioavailabilityFactor || 0.7), 
      0
    ) / keyNutrients.length;
    
    return Math.round(avgBioavailability * 100);
  }

  private addNutrients(
    total: MicroNutrients, 
    nutrients: MicroNutrients, 
    multiplier: number
  ): void {
    for (const [key, value] of Object.entries(nutrients)) {
      if (typeof value === 'number') {
        (total as any)[key] = ((total as any)[key] || 0) + (value * multiplier);
      }
    }
  }

  private getDeficiencyImportance(nutrient: string, deficitPercentage: number): 'critical' | 'moderate' | 'minor' {
    const criticalNutrients = ['vitaminB12', 'iron', 'vitaminD', 'folate'];
    
    if (criticalNutrients.includes(nutrient) && deficitPercentage > 50) {
      return 'critical';
    } else if (deficitPercentage > 40) {
      return 'moderate';
    } else {
      return 'minor';
    }
  }

  private getHealthImpact(nutrient: string, deficitPercentage: number): string {
    const impacts: Record<string, string> = {
      iron: 'May cause fatigue and weakness',
      vitaminD: 'Important for bone health and immune function',
      vitaminB12: 'Essential for nerve function and energy',
      folate: 'Important for cell division and DNA synthesis',
      vitaminC: 'Supports immune system and collagen production',
    };
    
    return impacts[nutrient] || 'Important for overall health';
  }

  private getExcessHealthConcern(nutrient: string, excessPercentage: number): string {
    const concerns: Record<string, string> = {
      vitaminA: 'High doses may cause toxicity',
      iron: 'Excess iron can cause digestive issues',
      zinc: 'Too much zinc can interfere with copper absorption',
    };
    
    return concerns[nutrient] || 'Monitor intake levels';
  }

  private getFoodSuggestionsForNutrient(nutrient: string): string[] {
    const suggestions: Record<string, string[]> = {
      iron: ['spinach', 'lean meat', 'lentils'],
      vitaminD: ['fatty fish', 'fortified foods', 'sunlight exposure'],
      vitaminC: ['citrus fruits', 'berries', 'bell peppers'],
      calcium: ['dairy products', 'leafy greens', 'almonds'],
      omega3: ['salmon', 'walnuts', 'flaxseeds'],
    };
    
    return suggestions[nutrient] || ['varied whole foods'];
  }

  private calculateVitaminScore(nutrients: MicroNutrients): number {
    const vitamins = ['vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'vitaminB12'];
    let score = 0;
    let count = 0;

    for (const vitamin of vitamins) {
      const amount = this.getNutrientAmount(nutrients, vitamin);
      if (amount > 0) {
        const dvPercentage = this.getDailyValuePercentage(vitamin, amount);
        score += Math.min(100, dvPercentage);
        count++;
      }
    }

    return count > 0 ? score / count : 0;
  }

  private calculateMineralScore(nutrients: MicroNutrients): number {
    const minerals = ['calcium', 'iron', 'magnesium', 'potassium', 'zinc', 'selenium'];
    let score = 0;
    let count = 0;

    for (const mineral of minerals) {
      const amount = this.getNutrientAmount(nutrients, mineral);
      if (amount > 0) {
        const dvPercentage = this.getDailyValuePercentage(mineral, amount);
        score += Math.min(100, dvPercentage);
        count++;
      }
    }

    return count > 0 ? score / count : 0;
  }

  private calculateAntioxidantScore(nutrients: MicroNutrients): number {
    const polyphenols = nutrients.polyphenols || 0;
    const vitaminC = nutrients.vitaminC || 0;
    const vitaminE = nutrients.vitaminE || 0;

    // Simple scoring based on antioxidant content
    return Math.min(100, (polyphenols / 10) + (vitaminC * 2) + (vitaminE * 3));
  }

  private calculateEssentialFattyAcidScore(nutrients: MicroNutrients): number {
    const omega3 = nutrients.omega3 || 0;
    const targets = this.nutrientTargets.get('adult_default');
    
    if (!targets) return 0;
    
    return Math.min(100, (omega3 / targets.omega3) * 100);
  }

  private calculateFiberScore(food: FoodItem): number {
    const fiber = food.nutrition_per_100g.fiber || 0;
    // Score based on fiber content (25g daily target)
    return Math.min(100, (fiber / 25) * 100 * 4); // Per 100g, so multiply by 4
  }

  private findSynergisticNutrients(nutrients: string[]): string[] {
    const synergistic: string[] = [];
    
    for (const nutrient of nutrients) {
      const partners = this.synergisticCombinations.get(nutrient) || [];
      synergistic.push(...partners);
    }
    
    return [...new Set(synergistic)]; // Remove duplicates
  }

  private findSynergisticBenefits(nutrients: string[]): string[] {
    const benefits: string[] = [];
    
    if (nutrients.includes('iron') && nutrients.includes('vitaminC')) {
      benefits.push('Vitamin C enhances iron absorption');
    }
    
    if (nutrients.includes('calcium') && nutrients.includes('vitaminD')) {
      benefits.push('Vitamin D improves calcium absorption');
    }
    
    return benefits;
  }

  private generatePreparationSuggestion(foodId: string, nutrients: string[]): string {
    if (nutrients.includes('iron') && nutrients.includes('vitaminC')) {
      return 'Combine with vitamin C-rich foods for better iron absorption';
    }
    
    if (nutrients.includes('vitaminA') || nutrients.includes('vitaminE')) {
      return 'Consume with healthy fats for better absorption';
    }
    
    return 'Enjoy as part of a balanced meal';
  }

  private getFoodName(foodId: string): string {
    const names: Record<string, string> = {
      salmon_fillet: 'Salmon Fillet',
      spinach: 'Spinach',
      almonds: 'Almonds',
      sweet_potato: 'Sweet Potato',
      blueberries: 'Blueberries',
    };
    
    return names[foodId] || foodId.replace(/_/g, ' ');
  }

  private getDefaultNutrientTargets(): DailyNutrientTargets {
    return this.nutrientTargets.get('adult_default')!;
  }
}

// Export singleton instance
export const nutrientAnalyzer = NutrientAnalyzer.getInstance();
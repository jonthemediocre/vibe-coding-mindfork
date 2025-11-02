/**
 * PreferenceFilter
 * 
 * Filters foods based on dietary preferences, restrictions, and user exclusions
 */

import type {
  UserDietaryPreferences,
  DietType,
  PreferenceCompatibility,
  CustomRestriction,
  CulturalDietPreferences,
} from '../../types/recommendations';
import type { FoodItem } from './MacroCalculator';

export interface FoodRestriction {
  type: 'ingredient' | 'category' | 'preparation_method' | 'allergen';
  restriction: string;
  severity: 'strict' | 'preference';
  description?: string;
}

export interface DietTypeConfig {
  name: DietType;
  restrictions: FoodRestriction[];
  allowedCategories: string[];
  forbiddenIngredients: string[];
  description: string;
}

export class PreferenceFilter {
  private static instance: PreferenceFilter;
  private dietConfigs: Map<DietType, DietTypeConfig>;
  private allergenDatabase: Map<string, string[]>; // allergen -> food ingredients
  private ingredientSubstitutions: Map<string, string[]>; // ingredient -> alternatives

  private constructor() {
    this.dietConfigs = new Map();
    this.allergenDatabase = new Map();
    this.ingredientSubstitutions = new Map();
    this.initializeDietConfigs();
    this.initializeAllergenDatabase();
    this.initializeSubstitutions();
  }

  public static getInstance(): PreferenceFilter {
    if (!PreferenceFilter.instance) {
      PreferenceFilter.instance = new PreferenceFilter();
    }
    return PreferenceFilter.instance;
  }

  /**
   * Filter foods based on user dietary preferences
   */
  public filterFoodsByPreferences(
    foods: FoodItem[], 
    preferences: UserDietaryPreferences
  ): FoodItem[] {
    try {
      return foods.filter(food => {
        const compatibility = this.checkFoodCompatibility(food, preferences);
        return compatibility.isCompatible;
      });
    } catch (error) {
      console.error('PreferenceFilter: Error filtering foods:', error);
      return foods; // Return unfiltered on error
    }
  }

  /**
   * Check compatibility of a single food item with user preferences
   */
  public checkFoodCompatibility(
    food: FoodItem, 
    preferences: UserDietaryPreferences
  ): PreferenceCompatibility {
    try {
      const violatedRestrictions: string[] = [];
      let compatibilityScore = 100;

      // Check diet type restrictions
      const dietRestrictions = this.getDietTypeRestrictions(preferences.dietType);
      for (const restriction of dietRestrictions) {
        if (this.violatesRestriction(food, restriction)) {
          violatedRestrictions.push(`${preferences.dietType}: ${restriction.description || restriction.restriction}`);
          compatibilityScore -= restriction.severity === 'strict' ? 50 : 20;
        }
      }

      // Check food exclusions
      if (preferences.foodExclusions?.length > 0) {
        for (const exclusion of preferences.foodExclusions) {
          if (this.matchesFoodExclusion(food, exclusion)) {
            violatedRestrictions.push(`Excluded food: ${exclusion}`);
            compatibilityScore -= 30;
          }
        }
      }

      // Check allergens
      if (preferences.allergens?.length > 0) {
        for (const allergen of preferences.allergens) {
          if (this.containsAllergen(food, allergen)) {
            violatedRestrictions.push(`Allergen: ${allergen}`);
            compatibilityScore -= 40;
          }
        }
      }

      // Check cultural preferences
      if (preferences.culturalPreferences) {
        const culturalScore = this.checkCulturalCompatibility(food, preferences.culturalPreferences);
        compatibilityScore = Math.min(compatibilityScore, culturalScore);
      }

      // Check custom restrictions
      if (preferences.customRestrictions?.length > 0) {
        for (const restriction of preferences.customRestrictions) {
          if (this.violatesCustomRestriction(food, restriction)) {
            violatedRestrictions.push(`Custom: ${restriction.name}`);
            compatibilityScore -= restriction.severity === 'strict' ? 35 : 15;
          }
        }
      }

      // Check disliked ingredients
      if (preferences.dislikedIngredients?.length > 0) {
        for (const ingredient of preferences.dislikedIngredients) {
          if (this.containsIngredient(food, ingredient)) {
            violatedRestrictions.push(`Disliked ingredient: ${ingredient}`);
            compatibilityScore -= 10;
          }
        }
      }

      // Boost score for preferred cuisines
      if (preferences.preferredCuisines?.length > 0) {
        const cuisineMatch = this.matchesPreferredCuisine(food, preferences.preferredCuisines);
        if (cuisineMatch) {
          compatibilityScore += 15;
        }
      }

      compatibilityScore = Math.max(0, Math.min(100, compatibilityScore));
      const isCompatible = violatedRestrictions.length === 0 && compatibilityScore >= 60;

      // Generate suggested modifications if not compatible
      const suggestedModifications = !isCompatible ? 
        this.generateModificationSuggestions(food, violatedRestrictions, preferences) : 
        undefined;

      // Generate alternative foods if not compatible
      const alternativeFoods = !isCompatible ? 
        this.findAlternativeFoods(food, preferences) : 
        undefined;

      return {
        isCompatible,
        violatedRestrictions,
        compatibilityScore,
        suggestedModifications,
        alternativeFoods,
      };
    } catch (error) {
      console.error('PreferenceFilter: Error checking compatibility:', error);
      return {
        isCompatible: true, // Default to compatible on error
        violatedRestrictions: [],
        compatibilityScore: 50,
      };
    }
  }

  /**
   * Suggest alternative foods for excluded items
   */
  public suggestAlternatives(
    excludedFood: FoodItem,
    preferences: UserDietaryPreferences
  ): string[] {
    try {
      // This would typically query a food database
      // For now, return conceptual alternatives based on food category
      return this.findAlternativeFoods(excludedFood, preferences) || [];
    } catch (error) {
      console.error('PreferenceFilter: Error suggesting alternatives:', error);
      return [];
    }
  }

  /**
   * Get diet type restrictions
   */
  public getDietTypeRestrictions(dietType: DietType): FoodRestriction[] {
    const config = this.dietConfigs.get(dietType);
    return config?.restrictions || [];
  }

  // Private helper methods

  private initializeDietConfigs(): void {
    // Vegan diet configuration
    this.dietConfigs.set('vegan', {
      name: 'vegan',
      restrictions: [
        { type: 'category', restriction: 'meat', severity: 'strict', description: 'No animal products' },
        { type: 'category', restriction: 'dairy', severity: 'strict', description: 'No dairy products' },
        { type: 'category', restriction: 'eggs', severity: 'strict', description: 'No eggs' },
        { type: 'ingredient', restriction: 'honey', severity: 'strict', description: 'No honey' },
        { type: 'ingredient', restriction: 'gelatin', severity: 'strict', description: 'No gelatin' },
      ],
      allowedCategories: ['vegetables', 'fruits', 'grains', 'legumes', 'nuts', 'seeds'],
      forbiddenIngredients: ['beef', 'chicken', 'pork', 'fish', 'milk', 'cheese', 'butter', 'eggs', 'honey'],
      description: 'Plant-based diet excluding all animal products',
    });

    // Vegetarian diet configuration
    this.dietConfigs.set('vegetarian', {
      name: 'vegetarian',
      restrictions: [
        { type: 'category', restriction: 'meat', severity: 'strict', description: 'No meat or fish' },
        { type: 'category', restriction: 'fish', severity: 'strict', description: 'No seafood' },
      ],
      allowedCategories: ['vegetables', 'fruits', 'grains', 'legumes', 'nuts', 'seeds', 'dairy', 'eggs'],
      forbiddenIngredients: ['beef', 'chicken', 'pork', 'fish', 'seafood'],
      description: 'Plant-based diet that includes dairy and eggs',
    });

    // Keto diet configuration
    this.dietConfigs.set('keto', {
      name: 'keto',
      restrictions: [
        { type: 'category', restriction: 'high_carb', severity: 'strict', description: 'Very low carbohydrate' },
        { type: 'ingredient', restriction: 'sugar', severity: 'strict', description: 'No added sugars' },
        { type: 'category', restriction: 'grains', severity: 'strict', description: 'No grains' },
        { type: 'category', restriction: 'starchy_vegetables', severity: 'preference', description: 'Limited starchy vegetables' },
      ],
      allowedCategories: ['meat', 'fish', 'eggs', 'high_fat_dairy', 'nuts', 'seeds', 'low_carb_vegetables'],
      forbiddenIngredients: ['bread', 'pasta', 'rice', 'potatoes', 'sugar', 'fruits_high_sugar'],
      description: 'Very low carb, high fat diet',
    });

    // Paleo diet configuration
    this.dietConfigs.set('paleo', {
      name: 'paleo',
      restrictions: [
        { type: 'category', restriction: 'grains', severity: 'strict', description: 'No grains' },
        { type: 'category', restriction: 'legumes', severity: 'strict', description: 'No legumes' },
        { type: 'category', restriction: 'dairy', severity: 'strict', description: 'No dairy' },
        { type: 'category', restriction: 'processed', severity: 'strict', description: 'No processed foods' },
      ],
      allowedCategories: ['meat', 'fish', 'eggs', 'vegetables', 'fruits', 'nuts', 'seeds'],
      forbiddenIngredients: ['wheat', 'rice', 'beans', 'lentils', 'milk', 'cheese', 'processed_foods'],
      description: 'Whole foods diet based on presumed ancient eating patterns',
    });

    // Mediterranean diet configuration
    this.dietConfigs.set('mediterranean', {
      name: 'mediterranean',
      restrictions: [
        { type: 'category', restriction: 'processed_meat', severity: 'preference', description: 'Limited processed meats' },
        { type: 'category', restriction: 'refined_grains', severity: 'preference', description: 'Prefer whole grains' },
      ],
      allowedCategories: ['fish', 'vegetables', 'fruits', 'whole_grains', 'legumes', 'nuts', 'olive_oil'],
      forbiddenIngredients: [],
      description: 'Traditional Mediterranean eating pattern',
    });

    // Low carb diet configuration
    this.dietConfigs.set('low_carb', {
      name: 'low_carb',
      restrictions: [
        { type: 'category', restriction: 'high_carb', severity: 'preference', description: 'Limited carbohydrates' },
        { type: 'ingredient', restriction: 'sugar', severity: 'strict', description: 'No added sugars' },
      ],
      allowedCategories: ['meat', 'fish', 'eggs', 'dairy', 'nuts', 'seeds', 'low_carb_vegetables'],
      forbiddenIngredients: ['sugar', 'bread', 'pasta', 'rice'],
      description: 'Reduced carbohydrate intake',
    });

    // High protein diet configuration
    this.dietConfigs.set('high_protein', {
      name: 'high_protein',
      restrictions: [],
      allowedCategories: ['meat', 'fish', 'eggs', 'dairy', 'legumes', 'nuts', 'protein_supplements'],
      forbiddenIngredients: [],
      description: 'Emphasis on high protein foods',
    });

    // Default MindFork diet (no restrictions)
    this.dietConfigs.set('mindfork', {
      name: 'mindfork',
      restrictions: [],
      allowedCategories: [],
      forbiddenIngredients: [],
      description: 'Balanced approach with MindFork food scoring',
    });
  }

  private initializeAllergenDatabase(): void {
    this.allergenDatabase.set('gluten', [
      'wheat', 'barley', 'rye', 'oats', 'bread', 'pasta', 'flour', 'beer', 'soy_sauce'
    ]);
    
    this.allergenDatabase.set('dairy', [
      'milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'lactose'
    ]);
    
    this.allergenDatabase.set('nuts', [
      'almonds', 'walnuts', 'pecans', 'cashews', 'pistachios', 'hazelnuts', 'brazil_nuts'
    ]);
    
    this.allergenDatabase.set('peanuts', [
      'peanuts', 'peanut_butter', 'peanut_oil'
    ]);
    
    this.allergenDatabase.set('shellfish', [
      'shrimp', 'crab', 'lobster', 'oysters', 'mussels', 'clams', 'scallops'
    ]);
    
    this.allergenDatabase.set('fish', [
      'salmon', 'tuna', 'cod', 'halibut', 'sardines', 'anchovies'
    ]);
    
    this.allergenDatabase.set('eggs', [
      'eggs', 'egg_whites', 'egg_yolks', 'mayonnaise'
    ]);
    
    this.allergenDatabase.set('soy', [
      'soybeans', 'tofu', 'tempeh', 'soy_sauce', 'miso', 'edamame'
    ]);
  }

  private initializeSubstitutions(): void {
    // Dairy substitutions
    this.ingredientSubstitutions.set('milk', [
      'almond_milk', 'oat_milk', 'soy_milk', 'coconut_milk'
    ]);
    
    this.ingredientSubstitutions.set('cheese', [
      'nutritional_yeast', 'cashew_cheese', 'almond_cheese'
    ]);
    
    this.ingredientSubstitutions.set('butter', [
      'coconut_oil', 'olive_oil', 'avocado', 'vegan_butter'
    ]);

    // Meat substitutions
    this.ingredientSubstitutions.set('beef', [
      'lentils', 'mushrooms', 'tempeh', 'seitan', 'beyond_meat'
    ]);
    
    this.ingredientSubstitutions.set('chicken', [
      'tofu', 'cauliflower', 'jackfruit', 'chickpeas'
    ]);

    // Grain substitutions
    this.ingredientSubstitutions.set('wheat_flour', [
      'almond_flour', 'coconut_flour', 'rice_flour', 'oat_flour'
    ]);
    
    this.ingredientSubstitutions.set('pasta', [
      'zucchini_noodles', 'shirataki_noodles', 'spaghetti_squash'
    ]);
  }

  private violatesRestriction(food: FoodItem, restriction: FoodRestriction): boolean {
    switch (restriction.type) {
      case 'category':
        return this.belongsToCategory(food, restriction.restriction);
      case 'ingredient':
        return this.containsIngredient(food, restriction.restriction);
      case 'preparation_method':
        return this.hasPreparationMethod(food, restriction.restriction);
      case 'allergen':
        return this.containsAllergen(food, restriction.restriction);
      default:
        return false;
    }
  }

  private belongsToCategory(food: FoodItem, category: string): boolean {
    // This would typically check against food database categories
    // For now, use simple name-based matching
    const foodName = food.name.toLowerCase();
    const foodId = food.id.toLowerCase();
    
    const categoryMappings: Record<string, string[]> = {
      'meat': ['beef', 'chicken', 'pork', 'lamb', 'turkey', 'meat'],
      'dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt'],
      'fish': ['fish', 'salmon', 'tuna', 'cod', 'seafood'],
      'eggs': ['egg', 'eggs'],
      'grains': ['bread', 'pasta', 'rice', 'wheat', 'oats', 'barley'],
      'legumes': ['beans', 'lentils', 'chickpeas', 'peas'],
      'high_carb': ['bread', 'pasta', 'rice', 'potato', 'sugar'],
      'processed': ['processed', 'packaged', 'frozen_meal'],
    };

    const keywords = categoryMappings[category] || [];
    return keywords.some(keyword => 
      foodName.includes(keyword) || foodId.includes(keyword)
    );
  }

  private containsIngredient(food: FoodItem, ingredient: string): boolean {
    const foodName = food.name.toLowerCase();
    const foodId = food.id.toLowerCase();
    const ingredientLower = ingredient.toLowerCase();
    
    return foodName.includes(ingredientLower) || foodId.includes(ingredientLower);
  }

  private hasPreparationMethod(food: FoodItem, method: string): boolean {
    const foodName = food.name.toLowerCase();
    const methodLower = method.toLowerCase();
    
    const methodKeywords: Record<string, string[]> = {
      'fried': ['fried', 'deep_fried', 'pan_fried'],
      'processed': ['processed', 'canned', 'packaged'],
      'smoked': ['smoked', 'cured'],
    };

    const keywords = methodKeywords[methodLower] || [methodLower];
    return keywords.some(keyword => foodName.includes(keyword));
  }

  private containsAllergen(food: FoodItem, allergen: string): boolean {
    const allergenIngredients = this.allergenDatabase.get(allergen.toLowerCase()) || [];
    return allergenIngredients.some(ingredient => 
      this.containsIngredient(food, ingredient)
    );
  }

  private violatesCustomRestriction(food: FoodItem, restriction: CustomRestriction): boolean {
    return restriction.restrictedIngredients.some(ingredient =>
      this.containsIngredient(food, ingredient)
    );
  }

  private checkCulturalCompatibility(
    food: FoodItem, 
    cultural: CulturalDietPreferences
  ): number {
    let score = 100;

    // Check religious restrictions
    if (cultural.religiousRestrictions?.includes('halal')) {
      if (this.containsIngredient(food, 'pork') || this.containsIngredient(food, 'alcohol')) {
        score -= 50;
      }
    }

    if (cultural.religiousRestrictions?.includes('kosher')) {
      if (this.containsIngredient(food, 'pork') || this.containsIngredient(food, 'shellfish')) {
        score -= 50;
      }
    }

    if (cultural.religiousRestrictions?.includes('hindu_vegetarian')) {
      if (this.belongsToCategory(food, 'meat')) {
        score -= 50;
      }
    }

    // Boost for traditional foods
    if (cultural.traditionalFoods?.length > 0) {
      const matchesTraditional = cultural.traditionalFoods.some(traditional =>
        this.containsIngredient(food, traditional)
      );
      if (matchesTraditional) {
        score += 20;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private matchesPreferredCuisine(food: FoodItem, preferredCuisines: string[]): boolean {
    const foodName = food.name.toLowerCase();
    return preferredCuisines.some(cuisine =>
      foodName.includes(cuisine.toLowerCase())
    );
  }

  private matchesFoodExclusion(food: FoodItem, exclusion: string): boolean {
    const foodName = food.name.toLowerCase();
    const foodId = food.id.toLowerCase();
    const exclusionLower = exclusion.toLowerCase();
    
    return foodName.includes(exclusionLower) || 
           foodId.includes(exclusionLower) ||
           foodName === exclusionLower ||
           foodId === exclusionLower;
  }

  private generateModificationSuggestions(
    food: FoodItem,
    violations: string[],
    preferences: UserDietaryPreferences
  ): string[] {
    const suggestions: string[] = [];

    // Suggest ingredient substitutions
    for (const violation of violations) {
      if (violation.includes('dairy')) {
        suggestions.push('Try dairy-free alternatives like almond or oat milk');
      }
      if (violation.includes('meat')) {
        suggestions.push('Consider plant-based protein alternatives');
      }
      if (violation.includes('gluten')) {
        suggestions.push('Look for gluten-free versions');
      }
      if (violation.includes('sugar')) {
        suggestions.push('Choose unsweetened or naturally sweetened options');
      }
    }

    // Suggest preparation modifications
    if (violations.some(v => v.includes('processed'))) {
      suggestions.push('Choose fresh, whole food versions');
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private findAlternativeFoods(
    food: FoodItem,
    preferences: UserDietaryPreferences
  ): string[] | undefined {
    // This would typically query a food database for similar foods
    // For now, return conceptual alternatives based on substitution mappings
    const alternatives: string[] = [];

    // Check if we have substitutions for ingredients in this food
    for (const [ingredient, substitutes] of this.ingredientSubstitutions.entries()) {
      if (this.containsIngredient(food, ingredient)) {
        alternatives.push(...substitutes);
      }
    }

    return alternatives.length > 0 ? alternatives.slice(0, 5) : undefined;
  }
}

// Export singleton instance
export const preferenceFilter = PreferenceFilter.getInstance();
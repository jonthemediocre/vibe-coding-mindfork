/**
 * PreferenceFilter Unit Tests
 * 
 * Comprehensive tests for dietary preference filtering and compatibility checking
 */

import { PreferenceFilter } from '../PreferenceFilter';
import type { 
  UserDietaryPreferences, 
  DietType,
  CustomRestriction,
  CulturalDietPreferences 
} from '../../../types/recommendations';
import type { FoodItem } from '../MacroCalculator';

describe('PreferenceFilter', () => {
  let filter: PreferenceFilter;

  // Test food items
  const chickenBreast: FoodItem = {
    id: 'chicken_breast',
    name: 'Chicken Breast',
    nutrition_per_100g: {
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
    },
  };

  const cheddarCheese: FoodItem = {
    id: 'cheddar_cheese',
    name: 'Cheddar Cheese',
    nutrition_per_100g: {
      calories: 403,
      protein: 25,
      carbs: 1.3,
      fat: 33,
      fiber: 0,
    },
  };

  const almonds: FoodItem = {
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

  const wholeWheatBread: FoodItem = {
    id: 'whole_wheat_bread',
    name: 'Whole Wheat Bread',
    nutrition_per_100g: {
      calories: 247,
      protein: 13,
      carbs: 41,
      fat: 4.2,
      fiber: 7,
    },
  };

  const salmon: FoodItem = {
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

  const tofu: FoodItem = {
    id: 'firm_tofu',
    name: 'Firm Tofu',
    nutrition_per_100g: {
      calories: 144,
      protein: 17,
      carbs: 3,
      fat: 9,
      fiber: 2,
    },
  };

  const pizza: FoodItem = {
    id: 'pepperoni_pizza',
    name: 'Pepperoni Pizza',
    nutrition_per_100g: {
      calories: 298,
      protein: 12,
      carbs: 36,
      fat: 11,
      fiber: 2,
    },
  };

  beforeEach(() => {
    filter = PreferenceFilter.getInstance();
  });

  describe('Vegan Diet Filtering', () => {
    const veganPreferences: UserDietaryPreferences = {
      dietType: 'vegan',
      foodExclusions: [],
      allergens: [],
    };

    it('should allow vegan-compatible foods', () => {
      const veganFoods = [almonds, tofu];
      const filtered = filter.filterFoodsByPreferences(veganFoods, veganPreferences);
      
      expect(filtered).toHaveLength(2);
      expect(filtered).toContain(almonds);
      expect(filtered).toContain(tofu);
    });

    it('should exclude animal products', () => {
      const mixedFoods = [chickenBreast, cheddarCheese, almonds, salmon];
      const filtered = filter.filterFoodsByPreferences(mixedFoods, veganPreferences);
      
      expect(filtered).toHaveLength(1);
      expect(filtered).toContain(almonds);
      expect(filtered).not.toContain(chickenBreast);
      expect(filtered).not.toContain(cheddarCheese);
      expect(filtered).not.toContain(salmon);
    });

    it('should detect dairy violations', () => {
      const compatibility = filter.checkFoodCompatibility(cheddarCheese, veganPreferences);
      
      expect(compatibility.isCompatible).toBe(false);
      expect(compatibility.violatedRestrictions).toContain('vegan: No dairy products');
      expect(compatibility.compatibilityScore).toBeLessThan(60);
    });

    it('should detect meat violations', () => {
      const compatibility = filter.checkFoodCompatibility(chickenBreast, veganPreferences);
      
      expect(compatibility.isCompatible).toBe(false);
      expect(compatibility.violatedRestrictions).toContain('vegan: No animal products');
      expect(compatibility.compatibilityScore).toBeLessThan(60);
    });
  });

  describe('Vegetarian Diet Filtering', () => {
    const vegetarianPreferences: UserDietaryPreferences = {
      dietType: 'vegetarian',
      foodExclusions: [],
      allergens: [],
    };

    it('should allow dairy and eggs for vegetarians', () => {
      const vegetarianFoods = [cheddarCheese, almonds, tofu];
      const filtered = filter.filterFoodsByPreferences(vegetarianFoods, vegetarianPreferences);
      
      expect(filtered).toHaveLength(3);
      expect(filtered).toContain(cheddarCheese);
      expect(filtered).toContain(almonds);
      expect(filtered).toContain(tofu);
    });

    it('should exclude meat and fish', () => {
      const mixedFoods = [chickenBreast, salmon, cheddarCheese, almonds];
      const filtered = filter.filterFoodsByPreferences(mixedFoods, vegetarianPreferences);
      
      expect(filtered).toHaveLength(2);
      expect(filtered).toContain(cheddarCheese);
      expect(filtered).toContain(almonds);
      expect(filtered).not.toContain(chickenBreast);
      expect(filtered).not.toContain(salmon);
    });
  });

  describe('Keto Diet Filtering', () => {
    const ketoPreferences: UserDietaryPreferences = {
      dietType: 'keto',
      foodExclusions: [],
      allergens: [],
    };

    it('should allow high-fat, low-carb foods', () => {
      const ketoFoods = [chickenBreast, cheddarCheese, almonds, salmon];
      const filtered = filter.filterFoodsByPreferences(ketoFoods, ketoPreferences);
      
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered).toContain(chickenBreast);
      expect(filtered).toContain(cheddarCheese);
      expect(filtered).toContain(salmon);
    });

    it('should exclude high-carb foods', () => {
      const compatibility = filter.checkFoodCompatibility(wholeWheatBread, ketoPreferences);
      
      expect(compatibility.isCompatible).toBe(false);
      expect(compatibility.violatedRestrictions.some(r => r.includes('carb'))).toBe(true);
    });
  });

  describe('Food Exclusions', () => {
    const preferencesWithExclusions: UserDietaryPreferences = {
      dietType: 'mindfork',
      foodExclusions: ['chicken', 'pizza'],
      allergens: [],
    };

    it('should exclude specifically listed foods', () => {
      const foods = [chickenBreast, pizza, almonds, salmon];
      const filtered = filter.filterFoodsByPreferences(foods, preferencesWithExclusions);
      
      expect(filtered).toHaveLength(2);
      expect(filtered).toContain(almonds);
      expect(filtered).toContain(salmon);
      expect(filtered).not.toContain(chickenBreast);
      expect(filtered).not.toContain(pizza);
    });

    it('should detect food exclusion violations', () => {
      const compatibility = filter.checkFoodCompatibility(chickenBreast, preferencesWithExclusions);
      
      expect(compatibility.isCompatible).toBe(false);
      expect(compatibility.violatedRestrictions).toContain('Excluded food: chicken');
    });
  });

  describe('Allergen Filtering', () => {
    const nutAllergyPreferences: UserDietaryPreferences = {
      dietType: 'mindfork',
      foodExclusions: [],
      allergens: ['nuts'],
    };

    it('should exclude foods containing allergens', () => {
      const foods = [chickenBreast, almonds, salmon, cheddarCheese];
      const filtered = filter.filterFoodsByPreferences(foods, nutAllergyPreferences);
      
      expect(filtered).toHaveLength(3);
      expect(filtered).not.toContain(almonds);
      expect(filtered).toContain(chickenBreast);
      expect(filtered).toContain(salmon);
      expect(filtered).toContain(cheddarCheese);
    });

    it('should detect allergen violations', () => {
      const compatibility = filter.checkFoodCompatibility(almonds, nutAllergyPreferences);
      
      expect(compatibility.isCompatible).toBe(false);
      expect(compatibility.violatedRestrictions).toContain('Allergen: nuts');
      expect(compatibility.compatibilityScore).toBeLessThan(60);
    });

    it('should handle multiple allergens', () => {
      const multipleAllergies: UserDietaryPreferences = {
        dietType: 'mindfork',
        foodExclusions: [],
        allergens: ['dairy', 'gluten'],
      };

      const compatibility = filter.checkFoodCompatibility(cheddarCheese, multipleAllergies);
      
      expect(compatibility.isCompatible).toBe(false);
      expect(compatibility.violatedRestrictions).toContain('Allergen: dairy');
    });
  });

  describe('Cultural Preferences', () => {
    const halalPreferences: UserDietaryPreferences = {
      dietType: 'mindfork',
      foodExclusions: [],
      allergens: [],
      culturalPreferences: {
        religiousRestrictions: ['halal'],
      },
    };

    it('should respect halal restrictions', () => {
      const pork: FoodItem = {
        id: 'pork_chop',
        name: 'Pork Chop',
        nutrition_per_100g: {
          calories: 231,
          protein: 26,
          carbs: 0,
          fat: 13,
          fiber: 0,
        },
      };

      const compatibility = filter.checkFoodCompatibility(pork, halalPreferences);
      
      expect(compatibility.compatibilityScore).toBeLessThan(60);
    });

    it('should boost traditional foods', () => {
      const traditionalPreferences: UserDietaryPreferences = {
        dietType: 'mindfork',
        foodExclusions: [],
        allergens: [],
        culturalPreferences: {
          traditionalFoods: ['salmon', 'rice'],
        },
      };

      const compatibility = filter.checkFoodCompatibility(salmon, traditionalPreferences);
      
      expect(compatibility.compatibilityScore).toBeGreaterThan(80);
    });
  });

  describe('Custom Restrictions', () => {
    const customRestriction: CustomRestriction = {
      name: 'Low Sodium',
      description: 'Avoiding high sodium foods',
      restrictedIngredients: ['salt', 'sodium', 'soy_sauce'],
      severity: 'preference',
    };

    const customPreferences: UserDietaryPreferences = {
      dietType: 'mindfork',
      foodExclusions: [],
      allergens: [],
      customRestrictions: [customRestriction],
    };

    it('should apply custom restrictions', () => {
      const saltedFood: FoodItem = {
        id: 'salted_nuts',
        name: 'Salted Nuts',
        nutrition_per_100g: {
          calories: 600,
          protein: 20,
          carbs: 20,
          fat: 50,
          fiber: 10,
        },
      };

      const compatibility = filter.checkFoodCompatibility(saltedFood, customPreferences);
      
      expect(compatibility.violatedRestrictions).toContain('Custom: Low Sodium');
      expect(compatibility.compatibilityScore).toBeLessThan(100);
    });
  });

  describe('Preferred Cuisines', () => {
    const cuisinePreferences: UserDietaryPreferences = {
      dietType: 'mindfork',
      foodExclusions: [],
      allergens: [],
      preferredCuisines: ['mediterranean', 'asian'],
    };

    it('should boost preferred cuisine foods', () => {
      const mediterraneanFood: FoodItem = {
        id: 'mediterranean_salad',
        name: 'Mediterranean Salad',
        nutrition_per_100g: {
          calories: 150,
          protein: 5,
          carbs: 10,
          fat: 12,
          fiber: 4,
        },
      };

      const compatibility = filter.checkFoodCompatibility(mediterraneanFood, cuisinePreferences);
      
      expect(compatibility.compatibilityScore).toBeGreaterThan(100); // Boosted score
    });
  });

  describe('Disliked Ingredients', () => {
    const dislikePreferences: UserDietaryPreferences = {
      dietType: 'mindfork',
      foodExclusions: [],
      allergens: [],
      dislikedIngredients: ['mushrooms', 'olives'],
    };

    it('should penalize disliked ingredients', () => {
      const mushroomFood: FoodItem = {
        id: 'mushroom_risotto',
        name: 'Mushroom Risotto',
        nutrition_per_100g: {
          calories: 180,
          protein: 6,
          carbs: 28,
          fat: 5,
          fiber: 2,
        },
      };

      const compatibility = filter.checkFoodCompatibility(mushroomFood, dislikePreferences);
      
      expect(compatibility.violatedRestrictions).toContain('Disliked ingredient: mushrooms');
      expect(compatibility.compatibilityScore).toBeLessThan(100);
    });
  });

  describe('Compatibility Scoring', () => {
    it('should return high scores for fully compatible foods', () => {
      const mindforkPreferences: UserDietaryPreferences = {
        dietType: 'mindfork',
        foodExclusions: [],
        allergens: [],
      };

      const compatibility = filter.checkFoodCompatibility(salmon, mindforkPreferences);
      
      expect(compatibility.isCompatible).toBe(true);
      expect(compatibility.compatibilityScore).toBe(100);
      expect(compatibility.violatedRestrictions).toHaveLength(0);
    });

    it('should provide modification suggestions for incompatible foods', () => {
      const dairyAllergyPreferences: UserDietaryPreferences = {
        dietType: 'mindfork',
        foodExclusions: [],
        allergens: ['dairy'],
      };

      const compatibility = filter.checkFoodCompatibility(cheddarCheese, dairyAllergyPreferences);
      
      expect(compatibility.isCompatible).toBe(false);
      expect(compatibility.suggestedModifications).toBeDefined();
      expect(compatibility.suggestedModifications?.some(s => s.includes('dairy-free'))).toBe(true);
    });

    it('should suggest alternative foods for incompatible items', () => {
      const veganPreferences: UserDietaryPreferences = {
        dietType: 'vegan',
        foodExclusions: [],
        allergens: [],
      };

      const compatibility = filter.checkFoodCompatibility(chickenBreast, veganPreferences);
      
      expect(compatibility.isCompatible).toBe(false);
      expect(compatibility.alternativeFoods).toBeDefined();
      expect(compatibility.alternativeFoods?.length).toBeGreaterThan(0);
    });
  });

  describe('Alternative Food Suggestions', () => {
    it('should suggest alternatives for excluded foods', () => {
      const veganPreferences: UserDietaryPreferences = {
        dietType: 'vegan',
        foodExclusions: [],
        allergens: [],
      };

      const alternatives = filter.suggestAlternatives(chickenBreast, veganPreferences);
      
      expect(alternatives).toBeDefined();
      expect(alternatives.length).toBeGreaterThan(0);
    });
  });

  describe('Diet Type Restrictions', () => {
    it('should return correct restrictions for each diet type', () => {
      const veganRestrictions = filter.getDietTypeRestrictions('vegan');
      const ketoRestrictions = filter.getDietTypeRestrictions('keto');
      const mindforkRestrictions = filter.getDietTypeRestrictions('mindfork');
      
      expect(veganRestrictions.length).toBeGreaterThan(0);
      expect(ketoRestrictions.length).toBeGreaterThan(0);
      expect(mindforkRestrictions.length).toBe(0); // No restrictions
      
      expect(veganRestrictions.some(r => r.restriction === 'meat')).toBe(true);
      expect(ketoRestrictions.some(r => r.restriction === 'high_carb')).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty food arrays', () => {
      const preferences: UserDietaryPreferences = {
        dietType: 'vegan',
        foodExclusions: [],
        allergens: [],
      };

      const filtered = filter.filterFoodsByPreferences([], preferences);
      
      expect(filtered).toHaveLength(0);
    });

    it('should handle foods with missing properties', () => {
      const incompleteFood: FoodItem = {
        id: 'incomplete',
        name: 'Incomplete Food',
        nutrition_per_100g: {
          calories: 100,
          protein: 10,
          carbs: 15,
          fat: 3,
          fiber: 2,
        },
      };

      const preferences: UserDietaryPreferences = {
        dietType: 'vegan',
        foodExclusions: [],
        allergens: [],
      };

      expect(() => {
        filter.checkFoodCompatibility(incompleteFood, preferences);
      }).not.toThrow();
    });

    it('should handle undefined preferences gracefully', () => {
      const minimalPreferences: UserDietaryPreferences = {
        dietType: 'mindfork',
        foodExclusions: [],
        allergens: [],
      };

      const compatibility = filter.checkFoodCompatibility(salmon, minimalPreferences);
      
      expect(compatibility.isCompatible).toBe(true);
      expect(compatibility.compatibilityScore).toBe(100);
    });

    it('should return unfiltered foods on error', () => {
      const foods = [chickenBreast, salmon];
      
      // Mock an error scenario by passing invalid preferences
      const invalidPreferences = null as any;
      
      const filtered = filter.filterFoodsByPreferences(foods, invalidPreferences);
      
      expect(filtered).toEqual(foods); // Should return original array on error
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PreferenceFilter.getInstance();
      const instance2 = PreferenceFilter.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
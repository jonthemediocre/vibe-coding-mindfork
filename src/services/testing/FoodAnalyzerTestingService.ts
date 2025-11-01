/**
 * Food Analyzer Testing Service
 *
 * Tests AI food recognition with synthetic test cases to ensure:
 * - Food name accuracy
 * - Calorie estimation accuracy
 * - Macro nutrient accuracy
 * - Allergen detection
 */

import { supabase } from '@/lib/supabase';

// Types
interface GroundTruth {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  allergens?: string[];
  serving_size?: string;
}

interface FoodTestCase {
  id: string;
  category: 'basic' | 'complex' | 'allergen' | 'edge_case';
  image_url: string;
  ground_truth: GroundTruth;
  description: string;
}

interface AccuracyMetrics {
  name_match: boolean;
  calorie_error_pct: number;
  macro_error_pct: number;
  allergen_detection: boolean;
}

interface FoodTestResult {
  test_id: string;
  detected_food: string;
  detected_data: any;
  accuracy_metrics: AccuracyMetrics;
  passed: boolean;
  timestamp: string;
}

interface FoodTestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  avg_calorie_error: number;
  avg_macro_error: number;
  allergen_accuracy: number;
  results: FoodTestResult[];
}

export class FoodAnalyzerTestingService {
  /**
   * Load test cases from database
   */
  static async loadTestCases(): Promise<FoodTestCase[]> {
    try {
      const { data, error } = await supabase
        .from('ai_test_scenarios')
        .select('*')
        .eq('test_type', 'food')
        .eq('active', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No food test cases in DB, using defaults');
        return this.getDefaultTestCases();
      }

      return data.map((row: any) => ({
        id: row.scenario_id,
        category: row.category,
        image_url: row.scenario_data.image_url,
        ground_truth: row.scenario_data.ground_truth,
        description: row.scenario_data.description || ''
      }));
    } catch (error) {
      console.error('Error loading food test cases:', error);
      return this.getDefaultTestCases();
    }
  }

  /**
   * Get default test cases (fallback)
   *
   * NOTE: In production, you should:
   * 1. Use real food images with known nutritional data
   * 2. Generate synthetic images with DALL-E/Midjourney
   * 3. Use public datasets (Food-101, USDA images)
   */
  private static getDefaultTestCases(): FoodTestCase[] {
    return [
      // Basic foods
      {
        id: 'food_001',
        category: 'basic',
        image_url: 'test_apple',
        ground_truth: {
          food_name: 'Apple',
          calories: 95,
          protein_g: 0.5,
          carbs_g: 25,
          fat_g: 0.3,
          serving_size: '1 medium'
        },
        description: 'Single red apple'
      },
      {
        id: 'food_002',
        category: 'basic',
        image_url: 'test_banana',
        ground_truth: {
          food_name: 'Banana',
          calories: 105,
          protein_g: 1.3,
          carbs_g: 27,
          fat_g: 0.4,
          serving_size: '1 medium'
        },
        description: 'Single banana'
      },

      // Allergen foods
      {
        id: 'food_003',
        category: 'allergen',
        image_url: 'test_peanut_butter_sandwich',
        ground_truth: {
          food_name: 'Peanut Butter Sandwich',
          calories: 350,
          protein_g: 14,
          carbs_g: 35,
          fat_g: 18,
          allergens: ['peanuts', 'wheat', 'gluten'],
          serving_size: '1 sandwich'
        },
        description: 'Peanut butter sandwich on wheat bread'
      },
      {
        id: 'food_004',
        category: 'allergen',
        image_url: 'test_shrimp_dish',
        ground_truth: {
          food_name: 'Grilled Shrimp',
          calories: 200,
          protein_g: 40,
          carbs_g: 2,
          fat_g: 3,
          allergens: ['shellfish', 'seafood'],
          serving_size: '6 oz'
        },
        description: 'Grilled shrimp with lemon'
      },

      // Complex dishes
      {
        id: 'food_005',
        category: 'complex',
        image_url: 'test_chicken_salad',
        ground_truth: {
          food_name: 'Chicken Caesar Salad',
          calories: 450,
          protein_g: 35,
          carbs_g: 20,
          fat_g: 28,
          allergens: ['dairy', 'wheat'],
          serving_size: '1 bowl'
        },
        description: 'Mixed dish with chicken, lettuce, parmesan, croutons'
      },
      {
        id: 'food_006',
        category: 'complex',
        image_url: 'test_stir_fry',
        ground_truth: {
          food_name: 'Chicken Stir Fry',
          calories: 380,
          protein_g: 30,
          carbs_g: 35,
          fat_g: 12,
          allergens: ['soy'],
          serving_size: '2 cups'
        },
        description: 'Chicken with mixed vegetables and rice'
      },

      // Edge cases
      {
        id: 'food_007',
        category: 'edge_case',
        image_url: 'test_half_eaten_burger',
        ground_truth: {
          food_name: 'Hamburger',
          calories: 300,
          protein_g: 20,
          carbs_g: 25,
          fat_g: 12,
          allergens: ['wheat', 'dairy'],
          serving_size: '1/2 burger (remaining)'
        },
        description: 'Half-eaten burger (50% remaining)'
      },
      {
        id: 'food_008',
        category: 'edge_case',
        image_url: 'test_mixed_plate',
        ground_truth: {
          food_name: 'Mixed Plate',
          calories: 650,
          protein_g: 45,
          carbs_g: 60,
          fat_g: 22,
          serving_size: '1 plate'
        },
        description: 'Plate with chicken, rice, broccoli, and bread'
      }
    ];
  }

  /**
   * Simulate food scanning (mock for testing framework)
   *
   * NOTE: In production, replace this with actual call to your food scanner:
   * const result = await AIFoodScanService.scanFood(imageUrl);
   */
  private static async mockFoodScan(testCase: FoodTestCase): Promise<any> {
    // This is a mock - in production, call your actual food scanning API
    // For now, we'll simulate realistic variations

    const truth = testCase.ground_truth;

    // Simulate realistic AI variations
    const calorieVariation = 0.8 + Math.random() * 0.4; // 80-120% of actual
    const macroVariation = 0.85 + Math.random() * 0.3; // 85-115% of actual

    // Simulate name matching (sometimes gets it wrong)
    let detectedName = truth.food_name;
    if (testCase.category === 'complex' && Math.random() > 0.7) {
      // Sometimes complex dishes get generic names
      detectedName = 'Mixed Dish';
    }

    // Simulate allergen detection (sometimes misses them)
    let detectedAllergens = truth.allergens || [];
    if (Math.random() > 0.9 && detectedAllergens.length > 0) {
      // 10% chance to miss an allergen (this is bad!)
      detectedAllergens = detectedAllergens.slice(0, -1);
    }

    return {
      food_name: detectedName,
      calories: Math.round(truth.calories * calorieVariation),
      protein_g: Math.round(truth.protein_g * macroVariation * 10) / 10,
      carbs_g: Math.round(truth.carbs_g * macroVariation * 10) / 10,
      fat_g: Math.round(truth.fat_g * macroVariation * 10) / 10,
      allergens: detectedAllergens,
      confidence: 0.7 + Math.random() * 0.3
    };
  }

  /**
   * Run a single food test
   */
  static async runFoodTest(testCase: FoodTestCase): Promise<FoodTestResult> {
    console.log(`\n🍕 Testing: ${testCase.id} - ${testCase.category}`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Expected: ${testCase.ground_truth.food_name} (${testCase.ground_truth.calories} cal)`);

    try {
      // Scan food (in production, call actual API)
      const scanResult = await this.mockFoodScan(testCase);

      console.log(`   Detected: ${scanResult.food_name} (${scanResult.calories} cal)`);

      // Calculate accuracy metrics
      const nameMatch = this.checkNameMatch(
        scanResult.food_name,
        testCase.ground_truth.food_name
      );

      const calorieError = Math.abs(
        ((scanResult.calories - testCase.ground_truth.calories) /
        testCase.ground_truth.calories) * 100
      );

      const macroError = this.calculateMacroError(scanResult, testCase.ground_truth);

      const allergenDetection = this.checkAllergenDetection(
        scanResult.allergens || [],
        testCase.ground_truth.allergens || []
      );

      // Pass criteria
      const passed = nameMatch &&
                     calorieError < 30 &&
                     macroError < 40 &&
                     allergenDetection;

      console.log(`   Name Match: ${nameMatch ? '✅' : '❌'}`);
      console.log(`   Calorie Error: ${calorieError.toFixed(1)}%`);
      console.log(`   Macro Error: ${macroError.toFixed(1)}%`);
      console.log(`   Allergen Detection: ${allergenDetection ? '✅' : '⚠️  FAILED'}`);
      console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

      const result: FoodTestResult = {
        test_id: testCase.id,
        detected_food: scanResult.food_name,
        detected_data: scanResult,
        accuracy_metrics: {
          name_match: nameMatch,
          calorie_error_pct: calorieError,
          macro_error_pct: macroError,
          allergen_detection: allergenDetection
        },
        passed,
        timestamp: new Date().toISOString()
      };

      // Save to database
      await this.saveFoodTestResult(result, testCase);

      return result;
    } catch (error) {
      console.error(`   Error: ${error}`);
      throw error;
    }
  }

  /**
   * Check if detected name matches ground truth (fuzzy matching)
   */
  private static checkNameMatch(detected: string, actual: string): boolean {
    const detectedLower = detected.toLowerCase();
    const actualLower = actual.toLowerCase();

    // Exact match
    if (detectedLower === actualLower) return true;

    // Contains match
    if (detectedLower.includes(actualLower) || actualLower.includes(detectedLower)) {
      return true;
    }

    // Word overlap match (at least 50% words in common)
    const detectedWords = detectedLower.split(' ');
    const actualWords = actualLower.split(' ');
    const commonWords = detectedWords.filter(w => actualWords.includes(w));

    const overlapPct = commonWords.length / Math.max(detectedWords.length, actualWords.length);
    return overlapPct >= 0.5;
  }

  /**
   * Calculate macro nutrient error percentage
   */
  private static calculateMacroError(detected: any, truth: GroundTruth): number {
    const proteinError = Math.abs((detected.protein_g - truth.protein_g) / truth.protein_g * 100);
    const carbsError = Math.abs((detected.carbs_g - truth.carbs_g) / truth.carbs_g * 100);
    const fatError = Math.abs((detected.fat_g - truth.fat_g) / truth.fat_g * 100);

    return (proteinError + carbsError + fatError) / 3;
  }

  /**
   * Check if all allergens were detected
   */
  private static checkAllergenDetection(detected: string[], actual: string[]): boolean {
    if (actual.length === 0) return true; // No allergens to detect

    // All actual allergens must be detected
    return actual.every(allergen =>
      detected.some(d => d.toLowerCase().includes(allergen.toLowerCase()))
    );
  }

  /**
   * Save food test result to database
   */
  private static async saveFoodTestResult(result: FoodTestResult, testCase: FoodTestCase) {
    try {
      const { error } = await supabase.from('food_analyzer_test_results').insert({
        test_id: result.test_id,
        category: testCase.category,
        image_url: testCase.image_url,
        ground_truth: testCase.ground_truth,
        detected_food: result.detected_food,
        detected_data: result.detected_data,
        name_match: result.accuracy_metrics.name_match,
        calorie_error_pct: result.accuracy_metrics.calorie_error_pct,
        macro_error_pct: result.accuracy_metrics.macro_error_pct,
        allergen_detection: result.accuracy_metrics.allergen_detection,
        passed: result.passed,
        test_timestamp: result.timestamp
      });

      if (error) {
        console.error('Error saving food test result:', error);
      }
    } catch (error) {
      console.error('Error saving food test result:', error);
    }
  }

  /**
   * Run full food analyzer test suite
   */
  static async runFullTestSuite(): Promise<FoodTestSuiteResult> {
    console.log('═══════════════════════════════════════════');
    console.log('🍕 FOOD ANALYZER TEST SUITE');
    console.log('═══════════════════════════════════════════\n');

    const startTime = Date.now();
    const testCases = await this.loadTestCases();
    const results: FoodTestResult[] = [];

    let passed = 0;
    let failed = 0;
    let totalCalorieError = 0;
    let totalMacroError = 0;
    let allergenTests = 0;
    let allergenSuccesses = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n[${i + 1}/${testCases.length}]`);

      try {
        const result = await this.runFoodTest(testCase);
        results.push(result);

        if (result.passed) {
          passed++;
        } else {
          failed++;
        }

        totalCalorieError += result.accuracy_metrics.calorie_error_pct;
        totalMacroError += result.accuracy_metrics.macro_error_pct;

        if (testCase.ground_truth.allergens && testCase.ground_truth.allergens.length > 0) {
          allergenTests++;
          if (result.accuracy_metrics.allergen_detection) {
            allergenSuccesses++;
          }
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`   ❌ Test failed with error: ${error}`);
        failed++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const passRate = ((passed / testCases.length) * 100).toFixed(1);
    const allergenAccuracy = allergenTests > 0
      ? ((allergenSuccesses / allergenTests) * 100).toFixed(1)
      : 'N/A';

    console.log('\n═══════════════════════════════════════════');
    console.log('📊 TEST SUITE COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log(`Duration: ${duration}s`);
    console.log(`Total Tests: ${testCases.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log('\nAccuracy Metrics:');
    console.log(`  Avg Calorie Error: ${(totalCalorieError / testCases.length).toFixed(1)}%`);
    console.log(`  Avg Macro Error: ${(totalMacroError / testCases.length).toFixed(1)}%`);
    console.log(`  Allergen Detection: ${allergenAccuracy}% (${allergenSuccesses}/${allergenTests})`);
    console.log('═══════════════════════════════════════════\n');

    return {
      total: testCases.length,
      passed,
      failed,
      avg_calorie_error: totalCalorieError / testCases.length,
      avg_macro_error: totalMacroError / testCases.length,
      allergen_accuracy: allergenTests > 0 ? (allergenSuccesses / allergenTests) * 100 : 100,
      results
    };
  }
}

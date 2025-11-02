/**
 * USDA FoodData Central API Service
 * Official government nutrition database with 380,000+ verified foods
 * API Docs: https://fdc.nal.usda.gov/api-guide.html
 *
 * Features:
 * - Search 380K+ foods by name
 * - Lookup by FDC ID or barcode
 * - 150+ nutrients per food (vs our current 6-8)
 * - Free API with 3,600 req/hour limit
 * - 24-hour caching to minimize API calls
 */

import Constants from 'expo-constants';

const USDA_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_USDA_API_KEY ||
                     process.env.EXPO_PUBLIC_USDA_API_KEY;
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string; // e.g., "203" for protein
  unitName: string;
  value: number;
}

export interface USDAFoodItem {
  fdcId: number;
  description: string;
  dataType: 'Foundation' | 'SR Legacy' | 'Branded' | 'Survey';
  brandName?: string;
  brandOwner?: string;
  gtinUpc?: string; // Barcode
  foodNutrients: USDANutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string; // e.g., "1 cup"
  foodCategory?: string;
}

export interface USDASearchResult {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDAFoodItem[];
}

export class USDAFoodDataService {
  private static readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Search USDA foods by name
   */
  static async searchFoods(
    query: string,
    options: {
      pageSize?: number;
      pageNumber?: number;
      dataType?: string[]; // ['Foundation', 'SR Legacy', 'Branded', 'Survey']
      sortBy?: 'dataType.keyword' | 'publishedDate' | 'fdcId';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<USDASearchResult> {
    const {
      pageSize = 20,
      pageNumber = 1,
      dataType,
      sortBy = 'dataType.keyword',
      sortOrder = 'asc'
    } = options;

    const cacheKey = `search:${query}:${pageSize}:${pageNumber}:${dataType?.join(',')}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`[USDA] Cache hit for: ${query}`);
      return cached;
    }

    try {
      const params = new URLSearchParams({
        query,
        pageSize: pageSize.toString(),
        pageNumber: pageNumber.toString(),
        sortBy,
        sortOrder,
        api_key: USDA_API_KEY!
      });

      if (dataType) {
        params.append('dataType', dataType.join(','));
      }

      console.log(`[USDA] Searching: ${query}`);
      const response = await fetch(`${USDA_BASE_URL}/foods/search?${params}`);

      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.saveToCache(cacheKey, data);
      console.log(`[USDA] Found ${data.totalHits} results for: ${query}`);
      return data;
    } catch (error) {
      console.error('[USDA] Search error:', error);
      throw error;
    }
  }

  /**
   * Get detailed food data by FDC ID
   */
  static async getFoodById(fdcId: number): Promise<USDAFoodItem | null> {
    const cacheKey = `food:${fdcId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`[USDA] Cache hit for FDC ID: ${fdcId}`);
      return cached;
    }

    try {
      console.log(`[USDA] Fetching FDC ID: ${fdcId}`);
      const response = await fetch(
        `${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[USDA] FDC ID not found: ${fdcId}`);
          return null;
        }
        throw new Error(`USDA API error: ${response.status}`);
      }

      const data = await response.json();
      this.saveToCache(cacheKey, data);
      console.log(`[USDA] Fetched: ${data.description}`);
      return data;
    } catch (error) {
      console.error(`[USDA] Get food ${fdcId} error:`, error);
      return null;
    }
  }

  /**
   * Get multiple foods by FDC IDs (bulk lookup)
   */
  static async getFoodsByIds(fdcIds: number[]): Promise<USDAFoodItem[]> {
    if (fdcIds.length === 0) return [];

    try {
      console.log(`[USDA] Bulk lookup: ${fdcIds.length} foods`);
      const response = await fetch(`${USDA_BASE_URL}/foods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fdcIds,
          format: 'full',
          nutrients: [] // Empty = get all nutrients
        })
      });

      if (!response.ok) {
        throw new Error(`USDA bulk API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[USDA] Bulk fetch complete: ${data.length} foods`);
      return data;
    } catch (error) {
      console.error('[USDA] Bulk lookup error:', error);
      return [];
    }
  }

  /**
   * Search by barcode (GTIN/UPC)
   */
  static async searchByBarcode(barcode: string): Promise<USDAFoodItem | null> {
    const cacheKey = `barcode:${barcode}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`[USDA] Cache hit for barcode: ${barcode}`);
      return cached;
    }

    try {
      console.log(`[USDA] Searching barcode: ${barcode}`);
      const result = await this.searchFoods(barcode, {
        pageSize: 5,
        dataType: ['Branded'] // Only branded foods have barcodes
      });

      // Find exact barcode match
      const match = result.foods.find(f => f.gtinUpc === barcode);
      if (match) {
        this.saveToCache(cacheKey, match);
        console.log(`[USDA] Barcode match: ${match.description}`);
        return match;
      }

      console.log(`[USDA] No barcode match for: ${barcode}`);
      return null;
    } catch (error) {
      console.error('[USDA] Barcode search error:', error);
      return null;
    }
  }

  /**
   * Convert USDA food to UnifiedFood format
   */
  static toUnifiedFood(usdaFood: USDAFoodItem): any {
    const getNutrientValue = (nutrientNumber: string): number => {
      const nutrient = usdaFood.foodNutrients.find(
        n => n.nutrientNumber === nutrientNumber
      );
      return nutrient?.value || 0;
    };

    return {
      name: usdaFood.description,
      brand: usdaFood.brandName,
      barcode: usdaFood.gtinUpc,
      usda_fdc_id: usdaFood.fdcId.toString(),

      // Macronutrients (per 100g for USDA data)
      calories_per_serving: getNutrientValue('208'), // Energy (kcal)
      protein_g: getNutrientValue('203'),
      carbs_g: getNutrientValue('205'),
      fat_g: getNutrientValue('204'),
      fiber_g: getNutrientValue('291'),
      sugar_g: getNutrientValue('269'),
      sodium_mg: getNutrientValue('307'),

      // Micronutrients
      vitamin_a_mcg: getNutrientValue('320'),
      vitamin_c_mg: getNutrientValue('401'),
      vitamin_d_mcg: getNutrientValue('328'),
      calcium_mg: getNutrientValue('301'),
      iron_mg: getNutrientValue('303'),
      potassium_mg: getNutrientValue('306'),

      // Serving info
      serving_size: usdaFood.servingSize || 100,
      serving_unit: usdaFood.servingSizeUnit || 'g',

      // Metadata
      source: 'usda' as const,
      is_verified: true,
      data_quality_score: 1.0, // USDA = highest quality
      food_category: usdaFood.foodCategory
    };
  }

  /**
   * Get nutrient by standard name
   */
  static getNutrient(food: USDAFoodItem, nutrientNumber: string): number {
    const nutrient = food.foodNutrients.find(n => n.nutrientNumber === nutrientNumber);
    return nutrient?.value || 0;
  }

  // Standard nutrient numbers (from USDA documentation)
  static NUTRIENT_IDS = {
    ENERGY_KCAL: '208',
    PROTEIN: '203',
    CARBS: '205',
    FAT: '204',
    FIBER: '291',
    SUGAR: '269',
    SODIUM: '307',
    VITAMIN_A: '320',
    VITAMIN_C: '401',
    VITAMIN_D: '328',
    CALCIUM: '301',
    IRON: '303',
    POTASSIUM: '306',
    SATURATED_FAT: '606',
    TRANS_FAT: '605',
    CHOLESTEROL: '601',
    VITAMIN_E: '323',
    VITAMIN_K: '430',
    THIAMIN: '404',
    RIBOFLAVIN: '405',
    NIACIN: '406',
    VITAMIN_B6: '415',
    FOLATE: '417',
    VITAMIN_B12: '418',
    MAGNESIUM: '304',
    PHOSPHORUS: '305',
    ZINC: '309',
    COPPER: '312',
    SELENIUM: '317'
  };

  // Cache helpers
  private static getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION_MS;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private static saveToCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });

    // Limit cache size to 1000 entries
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  static clearCache(): void {
    console.log(`[USDA] Clearing cache (${this.cache.size} entries)`);
    this.cache.clear();
  }

  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const usdaFoodService = new USDAFoodDataService();

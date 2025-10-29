/**
 * Extended Food types for advanced search and database integration
 */

export interface USDAFood {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  gtinUpc?: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    nutrientNumber: string;
    unitName: string;
    value: number;
  }>;
  servingSize?: number;
  servingSizeUnit?: string;
}

export interface UnifiedFood {
  id?: string;
  name: string;
  brand?: string;
  barcode?: string;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  serving_size: number;
  serving_unit: string;
  food_category?: string;
  image_url?: string;
  source: 'database' | 'usda' | 'open_food_facts' | 'recent';
  confidence?: number;
  usda_fdc_id?: string;
}

export interface FavoriteFood {
  id: string;
  user_id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  serving_size: number;
  serving_unit: string;
  created_at: string;
}

export interface RecentFood {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  serving_size: number;
  serving_unit: string;
  last_logged: string;
  frequency: number;
}

export interface BarcodeResult {
  type: string;
  data: string;
}

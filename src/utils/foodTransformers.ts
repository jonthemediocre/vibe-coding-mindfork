/**
 * Food Transformation Utilities
 *
 * Utilities for transforming food data between different formats
 * used across the application.
 */

import type { UnifiedFood, RecentFood, FavoriteFood } from '../types/food';
import type { CreateFoodEntryInput } from '../types/models';

/**
 * Maps a UnifiedFood object to CreateFoodEntryInput format
 *
 * @param food - The unified food object from various sources (barcode, search, etc.)
 * @returns CreateFoodEntryInput suitable for logging food entries
 */
export const mapUnifiedFoodToEntry = (food: UnifiedFood): CreateFoodEntryInput => ({
  food_name: food.name,
  serving_size: `${food.serving_size} ${food.serving_unit}`,
  calories: Math.round(food.calories_per_serving),
  protein_g: Math.round(food.protein_g ?? 0),
  carbs_g: Math.round(food.carbs_g ?? 0),
  fat_g: Math.round(food.fat_g ?? 0),
  fiber_g: Math.round(food.fiber_g ?? 0),
  sodium_mg: Math.round(food.sodium_mg ?? 0),
  sugar_g: null,
  meal_type: null,
  photo_url: null,
  consumed_at: new Date().toISOString(),
});

/**
 * Maps a RecentFood object to CreateFoodEntryInput format
 *
 * @param food - Recently logged food item
 * @returns CreateFoodEntryInput suitable for re-logging
 */
export const mapRecentFoodToEntry = (food: RecentFood): CreateFoodEntryInput => ({
  food_name: food.food_name,
  serving_size: `${food.serving_size ?? 1} ${food.serving_unit ?? 'serving'}`,
  calories: food.calories,
  protein_g: food.protein ?? 0,
  carbs_g: food.carbs ?? 0,
  fat_g: food.fat ?? 0,
  fiber_g: food.fiber ?? 0,
  sodium_mg: null,
  sugar_g: null,
  meal_type: null,
  photo_url: null,
  consumed_at: new Date().toISOString(),
});

/**
 * Maps a FavoriteFood object to CreateFoodEntryInput format
 *
 * @param food - Favorited food item
 * @returns CreateFoodEntryInput suitable for logging
 */
export const mapFavoriteFoodToEntry = (food: FavoriteFood): CreateFoodEntryInput => ({
  food_name: food.food_name,
  serving_size: `${food.serving_size} ${food.serving_unit}`,
  calories: food.calories,
  protein_g: food.protein,
  carbs_g: food.carbs,
  fat_g: food.fat,
  fiber_g: food.fiber,
  sodium_mg: null,
  sugar_g: null,
  meal_type: null,
  photo_url: null,
  consumed_at: new Date().toISOString(),
});

/**
 * Formats food macros for display
 *
 * @param entry - Food entry with macro information
 * @returns Formatted macro string (e.g., "P: 20g | C: 30g | F: 10g")
 */
export const formatMacros = (entry: CreateFoodEntryInput): string => {
  const parts: string[] = [];

  if (entry.protein_g !== undefined && entry.protein_g !== null) parts.push(`P: ${entry.protein_g}g`);
  if (entry.carbs_g !== undefined && entry.carbs_g !== null) parts.push(`C: ${entry.carbs_g}g`);
  if (entry.fat_g !== undefined && entry.fat_g !== null) parts.push(`F: ${entry.fat_g}g`);

  return parts.join(' | ');
};

/**
 * Formats food entry for confirmation dialogs
 *
 * @param entry - Food entry to format
 * @param brand - Optional brand name
 * @returns Formatted string for display
 */
export const formatFoodEntryForConfirmation = (
  entry: CreateFoodEntryInput,
  brand?: string
): string => {
  const brandText = brand ? ` (${brand})` : '';
  const macros = formatMacros(entry);
  return `${entry.food_name}${brandText}\n${entry.calories} cal | ${macros}`;
};

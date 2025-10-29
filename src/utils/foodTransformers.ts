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
  name: food.name,
  serving: `${food.serving_size} ${food.serving_unit}`,
  calories: Math.round(food.calories_per_serving),
  protein: Math.round(food.protein_g ?? 0),
  carbs: Math.round(food.carbs_g ?? 0),
  fat: Math.round(food.fat_g ?? 0),
  fiber: Math.round(food.fiber_g ?? 0),
});

/**
 * Maps a RecentFood object to CreateFoodEntryInput format
 *
 * @param food - Recently logged food item
 * @returns CreateFoodEntryInput suitable for re-logging
 */
export const mapRecentFoodToEntry = (food: RecentFood): CreateFoodEntryInput => ({
  name: food.food_name,
  serving: `${food.serving_size ?? 1} ${food.serving_unit ?? 'serving'}`,
  calories: food.calories,
  protein: food.protein ?? 0,
  carbs: food.carbs ?? 0,
  fat: food.fat ?? 0,
  fiber: food.fiber ?? 0,
});

/**
 * Maps a FavoriteFood object to CreateFoodEntryInput format
 *
 * @param food - Favorited food item
 * @returns CreateFoodEntryInput suitable for logging
 */
export const mapFavoriteFoodToEntry = (food: FavoriteFood): CreateFoodEntryInput => ({
  name: food.food_name,
  serving: `${food.serving_size} ${food.serving_unit}`,
  calories: food.calories,
  protein: food.protein,
  carbs: food.carbs,
  fat: food.fat,
  fiber: food.fiber,
});

/**
 * Formats food macros for display
 *
 * @param entry - Food entry with macro information
 * @returns Formatted macro string (e.g., "P: 20g | C: 30g | F: 10g")
 */
export const formatMacros = (entry: CreateFoodEntryInput): string => {
  const parts: string[] = [];

  if (entry.protein !== undefined) parts.push(`P: ${entry.protein}g`);
  if (entry.carbs !== undefined) parts.push(`C: ${entry.carbs}g`);
  if (entry.fat !== undefined) parts.push(`F: ${entry.fat}g`);

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
  return `${entry.name}${brandText}\n${entry.calories} cal | ${macros}`;
};

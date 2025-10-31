/**
 * PROFILE UPDATE SERVICE
 *
 * Handles updating user profile with automatic goal recalculation
 * Ensures nutrition targets stay accurate when physical metrics change
 */

import { supabase } from '../lib/supabase';
import { calculateNutritionGoals } from '../utils/goalCalculations';
import type { UserProfile, UserProfileUpdate } from '../types/profile';
import type { Goal, ActivityLevel, DietType, Gender } from '../utils/goalCalculations';

export interface ProfileUpdateResult {
  success: boolean;
  profile?: UserProfile;
  recalculatedGoals?: {
    daily_calories: number;
    daily_protein_g: number;
    daily_carbs_g: number;
    daily_fat_g: number;
    daily_fiber_g: number;
  };
  error?: string;
}

/**
 * Update user profile with automatic goal recalculation
 */
export async function updateUserProfile(
  userId: string,
  updates: UserProfileUpdate,
  options: {
    recalculateGoals?: boolean;
  } = { recalculateGoals: true }
): Promise<ProfileUpdateResult> {

  try {
    // Get current profile
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !currentProfile) {
      return {
        success: false,
        error: 'Failed to fetch current profile'
      };
    }

    // Check if metrics changed that require goal recalculation
    const metricsChanged =
      updates.age !== undefined ||
      updates.gender !== undefined ||
      updates.height_cm !== undefined ||
      updates.weight_kg !== undefined ||
      updates.target_weight_kg !== undefined ||
      updates.activity_level !== undefined ||
      updates.primary_goal !== undefined ||
      updates.diet_type !== undefined;

    let recalculatedGoals;

    // Recalculate nutrition goals if metrics changed
    if (options.recalculateGoals && metricsChanged) {
      const profileForCalc = {
        ...currentProfile,
        ...updates
      };

      // Ensure all required fields are present
      if (
        profileForCalc.age &&
        profileForCalc.gender &&
        profileForCalc.height_cm &&
        profileForCalc.weight_kg &&
        profileForCalc.activity_level &&
        profileForCalc.primary_goal
      ) {
        // Build profile matching goalCalculations requirements
        const calcProfile = {
          weight_kg: profileForCalc.weight_kg,
          height_cm: profileForCalc.height_cm,
          age: profileForCalc.age,
          gender: profileForCalc.gender,
          activity_level: profileForCalc.activity_level,
          primary_goal: profileForCalc.primary_goal,
          diet_type: profileForCalc.diet_type
        };

        recalculatedGoals = calculateNutritionGoals(calcProfile as any);

        // Add calculated goals to updates
        updates.daily_calories = recalculatedGoals.daily_calories;
        updates.daily_protein_g = recalculatedGoals.daily_protein_g;
        updates.daily_carbs_g = recalculatedGoals.daily_carbs_g;
        updates.daily_fat_g = recalculatedGoals.daily_fat_g;
        updates.daily_fiber_g = recalculatedGoals.daily_fiber_g;
      }
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError || !updatedProfile) {
      return {
        success: false,
        error: updateError?.message || 'Failed to update profile'
      };
    }

    return {
      success: true,
      profile: updatedProfile as UserProfile,
      recalculatedGoals
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error updating profile'
    };
  }
}

/**
 * Update user settings (non-profile fields)
 */
export async function updateUserSettings(
  userId: string,
  settings: {
    height_unit?: 'ft' | 'cm';
    weight_unit?: 'lbs' | 'kg';
    timezone?: string;
  }
): Promise<{ success: boolean; error?: string }> {

  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update settings'
    };
  }
}

/**
 * Get complete user profile with settings
 */
export async function getCompleteUserProfile(
  userId: string
): Promise<{
  profile: UserProfile;
  settings: any;
} | null> {

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) return null;

    return {
      profile: profile as UserProfile,
      settings: settings || {}
    };

  } catch (error) {
    console.error('Failed to fetch complete profile:', error);
    return null;
  }
}

/**
 * Convert units for display
 */
export function convertHeight(cm: number, toUnit: 'ft' | 'cm'): { value: number; display: string } {
  if (toUnit === 'cm') {
    return { value: cm, display: `${Math.round(cm)} cm` };
  }

  // Convert to feet and inches
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);

  return {
    value: cm,
    display: `${feet}'${inches}"`
  };
}

export function convertWeight(kg: number, toUnit: 'lbs' | 'kg'): { value: number; display: string } {
  if (toUnit === 'kg') {
    return { value: kg, display: `${kg.toFixed(1)} kg` };
  }

  const lbs = kg * 2.20462;
  return { value: kg, display: `${Math.round(lbs)} lbs` };
}

/**
 * Validate profile update
 */
export function validateProfileUpdate(updates: UserProfileUpdate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (updates.age !== undefined) {
    if (updates.age < 13 || updates.age > 120) {
      errors.push('Age must be between 13 and 120');
    }
  }

  if (updates.height_cm !== undefined) {
    if (updates.height_cm < 100 || updates.height_cm > 250) {
      errors.push('Height must be between 100cm and 250cm');
    }
  }

  if (updates.weight_kg !== undefined) {
    if (updates.weight_kg < 30 || updates.weight_kg > 300) {
      errors.push('Weight must be between 30kg and 300kg');
    }
  }

  if (updates.target_weight_kg !== undefined) {
    if (updates.target_weight_kg < 30 || updates.target_weight_kg > 300) {
      errors.push('Target weight must be between 30kg and 300kg');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

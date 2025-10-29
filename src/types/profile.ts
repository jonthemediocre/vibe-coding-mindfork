/**
 * Enhanced User Profile Types for Onboarding Integration
 * Includes all onboarding fields and nutrition goals
 */

import type { 
  Gender, 
  ActivityLevel, 
  Goal, 
  DietType, 
  NutritionGoals 
} from '../utils/goalCalculations';

export interface UserProfile {
  // Core identity
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;

  // Basic demographics (from onboarding)
  age?: number;
  gender?: Gender;

  // Physical metrics (from onboarding)
  height_cm?: number;
  weight_kg?: number;
  target_weight_kg?: number;

  // Unit preferences (from onboarding)
  height_unit?: 'ft' | 'cm';
  weight_unit?: 'lbs' | 'kg';

  // Goals and preferences (from onboarding)
  primary_goal?: Goal;
  activity_level?: ActivityLevel;
  diet_type?: DietType;

  // Calculated nutrition goals (from goal calculations)
  daily_calories?: number;
  daily_protein_g?: number;
  daily_carbs_g?: number;
  daily_fat_g?: number;
  daily_fiber_g?: number;

  // Onboarding status
  onboarding_completed?: boolean;
  onboarding_step?: number;

  // App preferences
  tier?: 'free' | 'premium' | 'savage';
  phone_number?: string;
  timezone?: string;

  // Timestamps
  created_at: string;
  updated_at?: string;
}

export interface UserProfileUpdate extends Partial<Omit<UserProfile, 'id' | 'created_at'>> {
  // Explicitly allow updating all fields except id and created_at
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProfileCacheEntry {
  profile: UserProfile;
  timestamp: number;
  version: string;
}

// Profile service interfaces
export interface ProfileServiceConfig {
  cacheTimeout: number; // milliseconds
  offlineMode: boolean;
  autoSync: boolean;
}

export interface ProfileLoadOptions {
  forceRefresh?: boolean;
  includeNutritionGoals?: boolean;
  fallbackToCache?: boolean;
}

export interface ProfileUpdateOptions {
  optimistic?: boolean;
  recalculateGoals?: boolean;
  syncImmediately?: boolean;
}
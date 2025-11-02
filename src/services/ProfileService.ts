/**
 * User Profile Service
 * Handles profile loading, caching, updating, and offline support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { 
  calculateNutritionGoals, 
  validateNutritionGoals,
  type NutritionGoals 
} from '../utils/goalCalculations';
import type {
  UserProfile,
  UserProfileUpdate,
  ProfileValidationResult,
  ProfileCacheEntry,
  ProfileServiceConfig,
  ProfileLoadOptions,
  ProfileUpdateOptions,
} from '../types/profile';

// Storage keys
const PROFILE_CACHE_KEY = '@mindfork/profile_cache';
const PROFILE_CONFIG_KEY = '@mindfork/profile_config';

// Default configuration
const DEFAULT_CONFIG: ProfileServiceConfig = {
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  offlineMode: false,
  autoSync: true,
};

export class ProfileService {
  private static instance: ProfileService;
  private config: ProfileServiceConfig = DEFAULT_CONFIG;
  private cachedProfile: UserProfile | null = null;
  private cacheTimestamp: number = 0;

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  /**
   * Load user profile with caching and offline support
   */
  public async loadProfile(
    userId: string,
    options: ProfileLoadOptions = {}
  ): Promise<UserProfile> {
    const {
      forceRefresh = false,
      includeNutritionGoals = true,
      fallbackToCache = true,
    } = options;

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh && this.isCacheValid()) {
        console.log('ProfileService: Using cached profile');
        return this.cachedProfile!;
      }

      // Try to load from Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

      if (error) {
        console.error('ProfileService: Supabase error:', error);

        // Fallback to cache if available
        if (fallbackToCache && this.cachedProfile) {
          console.log('ProfileService: Falling back to cached profile');
          return this.cachedProfile;
        }

        throw new ProfileLoadError(`Failed to load profile: ${error.message}`);
      }

      if (!data) {
        // No profile exists yet - this is OK for new users
        console.log('ProfileService: No profile found for user (new user?)');
        throw new ProfileNotFoundError('Profile not found - user needs to complete onboarding');
      }

      // Validate and process profile
      const profile = this.processRawProfile(data);
      const validation = this.validateProfile(profile);
      
      if (!validation.valid) {
        console.warn('ProfileService: Profile validation warnings:', validation.warnings);
      }

      // Add calculated nutrition goals if requested
      if (includeNutritionGoals && this.canCalculateGoals(profile)) {
        const goals = this.calculateNutritionGoals(profile);
        Object.assign(profile, goals);
      }

      // Cache the profile
      await this.cacheProfile(profile);
      this.cachedProfile = profile;
      this.cacheTimestamp = Date.now();

      console.log('ProfileService: Profile loaded successfully');
      return profile;

    } catch (error) {
      console.error('ProfileService: Load error:', error);
      
      // Final fallback to cache
      if (fallbackToCache && this.cachedProfile) {
        console.log('ProfileService: Using cached profile as final fallback');
        return this.cachedProfile;
      }

      // Return default profile if nothing else works
      return this.getDefaultProfile(userId);
    }
  }

  /**
   * Update user profile with optimistic updates and error handling
   */
  public async updateProfile(
    userId: string,
    updates: UserProfileUpdate,
    options: ProfileUpdateOptions = {}
  ): Promise<UserProfile> {
    const {
      optimistic = true,
      recalculateGoals = true,
      syncImmediately = true,
    } = options;

    try {
      // Get current profile
      const currentProfile = await this.loadProfile(userId, { fallbackToCache: true });
      
      // Apply updates
      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Optimistic update (update cache immediately)
      if (optimistic) {
        this.cachedProfile = updatedProfile;
        this.cacheTimestamp = Date.now();
        await this.cacheProfile(updatedProfile);
      }

      // Recalculate nutrition goals if needed
      if (recalculateGoals && this.canCalculateGoals(updatedProfile)) {
        const goals = this.calculateNutritionGoals(updatedProfile);
        Object.assign(updatedProfile, goals);
        
        // Update cache with new goals
        if (optimistic) {
          this.cachedProfile = updatedProfile;
          await this.cacheProfile(updatedProfile);
        }
      }

      // Sync to Supabase
      if (syncImmediately) {
        const { error } = await supabase
          .from('profiles')
          .upsert(this.prepareForDatabase(updatedProfile));

        if (error) {
          console.error('ProfileService: Update error:', error);
          
          // Rollback optimistic update
          if (optimistic) {
            this.cachedProfile = currentProfile;
            await this.cacheProfile(currentProfile);
          }
          
          throw new ProfileUpdateError(`Failed to update profile: ${error.message}`);
        }
      }

      console.log('ProfileService: Profile updated successfully');
      return updatedProfile;

    } catch (error) {
      console.error('ProfileService: Update failed:', error);
      throw error;
    }
  }

  /**
   * Get nutrition goals for current profile
   */
  public getNutritionGoals(profile?: UserProfile): NutritionGoals | null {
    const targetProfile = profile || this.cachedProfile;
    
    if (!targetProfile || !this.canCalculateGoals(targetProfile)) {
      return null;
    }

    return this.calculateNutritionGoals(targetProfile);
  }

  /**
   * Check if onboarding is complete
   */
  public isOnboardingComplete(profile?: UserProfile): boolean {
    const targetProfile = profile || this.cachedProfile;
    return targetProfile?.onboarding_completed === true;
  }

  /**
   * Clear cache and force refresh on next load
   */
  public async clearCache(): Promise<void> {
    this.cachedProfile = null;
    this.cacheTimestamp = 0;
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    console.log('ProfileService: Cache cleared');
  }

  // Private helper methods

  private async loadConfig(): Promise<void> {
    try {
      const configJson = await AsyncStorage.getItem(PROFILE_CONFIG_KEY);
      if (configJson) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configJson) };
      }
    } catch (error) {
      console.warn('ProfileService: Failed to load config, using defaults');
    }
  }

  private isCacheValid(): boolean {
    if (!this.cachedProfile || this.cacheTimestamp === 0) {
      return false;
    }
    
    const age = Date.now() - this.cacheTimestamp;
    return age < this.config.cacheTimeout;
  }

  private async cacheProfile(profile: UserProfile): Promise<void> {
    try {
      const cacheEntry: ProfileCacheEntry = {
        profile,
        timestamp: Date.now(),
        version: '1.0',
      };
      
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn('ProfileService: Failed to cache profile:', error);
    }
  }

  private processRawProfile(rawData: any): UserProfile {
    // Convert database fields to proper types
    return {
      id: rawData.id,
      email: rawData.email,
      full_name: rawData.full_name,
      avatar_url: rawData.avatar_url,
      age: rawData.age,
      gender: rawData.gender,
      height_cm: rawData.height_cm ? Number(rawData.height_cm) : undefined,
      weight_kg: rawData.weight_kg ? Number(rawData.weight_kg) : undefined,
      target_weight_kg: rawData.target_weight_kg ? Number(rawData.target_weight_kg) : undefined,
      height_unit: rawData.height_unit || 'cm',
      weight_unit: rawData.weight_unit || 'kg',
      primary_goal: rawData.primary_goal,
      activity_level: rawData.activity_level,
      diet_type: rawData.diet_type || 'mindfork',
      daily_calories: rawData.daily_calories,
      daily_protein_g: rawData.daily_protein_g,
      daily_carbs_g: rawData.daily_carbs_g,
      daily_fat_g: rawData.daily_fat_g,
      daily_fiber_g: rawData.daily_fiber_g,
      onboarding_completed: rawData.onboarding_completed || false,
      onboarding_step: rawData.onboarding_step || 0,
      tier: rawData.tier || 'free',
      phone_number: rawData.phone_number,
      timezone: rawData.timezone,
      created_at: rawData.created_at,
      updated_at: rawData.updated_at,
    };
  }

  private validateProfile(profile: UserProfile): ProfileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!profile.id) errors.push('Profile ID is required');
    if (!profile.created_at) errors.push('Created timestamp is required');

    // Age validation
    if (profile.age !== undefined) {
      if (profile.age < 13 || profile.age > 120) {
        errors.push('Age must be between 13 and 120');
      }
    }

    // Weight validation
    if (profile.weight_kg !== undefined) {
      if (profile.weight_kg < 30 || profile.weight_kg > 300) {
        errors.push('Weight must be between 30kg and 300kg');
      }
    }

    // Height validation
    if (profile.height_cm !== undefined) {
      if (profile.height_cm < 100 || profile.height_cm > 250) {
        errors.push('Height must be between 100cm and 250cm');
      }
    }

    // Onboarding completeness warnings
    if (profile.onboarding_completed && !this.canCalculateGoals(profile)) {
      warnings.push('Onboarding marked complete but missing required fields for goal calculation');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private canCalculateGoals(profile: UserProfile): boolean {
    return !!(
      profile.age &&
      profile.gender &&
      profile.height_cm &&
      profile.weight_kg &&
      profile.activity_level &&
      profile.primary_goal
    );
  }

  private calculateNutritionGoals(profile: UserProfile): NutritionGoals {
    if (!this.canCalculateGoals(profile)) {
      throw new Error('Cannot calculate goals: missing required profile fields');
    }

    const goals = calculateNutritionGoals({
      weight_kg: profile.weight_kg!,
      height_cm: profile.height_cm!,
      age: profile.age!,
      gender: profile.gender!,
      activity_level: profile.activity_level!,
      primary_goal: profile.primary_goal!,
      diet_type: profile.diet_type || 'mindfork',
    });

    const validation = validateNutritionGoals(goals);
    if (!validation.valid) {
      console.warn('ProfileService: Invalid nutrition goals:', validation.errors);
    }

    return goals;
  }

  private prepareForDatabase(profile: UserProfile): any {
    // Remove computed fields and prepare for database
    const { 
      daily_calories, 
      daily_protein_g, 
      daily_carbs_g, 
      daily_fat_g, 
      daily_fiber_g,
      ...dbProfile 
    } = profile;

    return {
      ...dbProfile,
      // Include nutrition goals if they exist
      ...(daily_calories && {
        daily_calories,
        daily_protein_g,
        daily_carbs_g,
        daily_fat_g,
        daily_fiber_g,
      }),
    };
  }

  private getDefaultProfile(userId: string): UserProfile {
    return {
      id: userId,
      tier: 'free',
      height_unit: 'cm',
      weight_unit: 'kg',
      diet_type: 'mindfork',
      onboarding_completed: false,
      onboarding_step: 0,
      created_at: new Date().toISOString(),
    };
  }
}

// Custom error classes
export class ProfileLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileLoadError';
  }
}

export class ProfileNotFoundError extends Error {
  constructor(message: string = 'Profile not found') {
    super(message);
    this.name = 'ProfileNotFoundError';
  }
}

export class ProfileUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileUpdateError';
  }
}

// Export singleton instance
export const profileService = ProfileService.getInstance();
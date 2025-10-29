/**
 * Profile Context Provider
 * Provides app-wide access to user profile data and methods
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { profileService, ProfileLoadError, ProfileUpdateError } from '../services/ProfileService';
import { useAuth } from './AuthContext';
import type { 
  UserProfile, 
  UserProfileUpdate, 
  ProfileLoadOptions, 
  ProfileUpdateOptions 
} from '../types/profile';
import type { NutritionGoals } from '../utils/goalCalculations';

interface ProfileContextValue {
  // Profile state
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  // Profile methods
  loadProfile: (options?: ProfileLoadOptions) => Promise<void>;
  updateProfile: (updates: UserProfileUpdate, options?: ProfileUpdateOptions) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearCache: () => Promise<void>;

  // Computed values
  nutritionGoals: NutritionGoals | null;
  isOnboardingComplete: boolean;
  canCalculateGoals: boolean;

  // Utility methods
  clearError: () => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

interface ProfileProviderProps {
  children: React.ReactNode;
  autoLoad?: boolean;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ 
  children, 
  autoLoad = true 
}) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profile
  const loadProfile = useCallback(async (options: ProfileLoadOptions = {}) => {
    if (!user?.id) {
      setError('No authenticated user');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedProfile = await profileService.loadProfile(user.id, options);
      setProfile(loadedProfile);
      console.log('ProfileContext: Profile loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof ProfileLoadError 
        ? err.message 
        : 'Failed to load profile';
      
      console.error('ProfileContext: Load error:', err);
      setError(errorMessage);
      
      // Don't clear profile on error - keep cached version if available
      if (!profile) {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile]);

  // Update profile
  const updateProfile = useCallback(async (
    updates: UserProfileUpdate, 
    options: ProfileUpdateOptions = {}
  ) => {
    if (!user?.id) {
      setError('No authenticated user');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedProfile = await profileService.updateProfile(user.id, updates, options);
      setProfile(updatedProfile);
      console.log('ProfileContext: Profile updated successfully');
    } catch (err) {
      const errorMessage = err instanceof ProfileUpdateError 
        ? err.message 
        : 'Failed to update profile';
      
      console.error('ProfileContext: Update error:', err);
      setError(errorMessage);
      
      // Reload profile to get current state
      await loadProfile({ forceRefresh: true, fallbackToCache: true });
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadProfile]);

  // Refresh profile (force reload)
  const refreshProfile = useCallback(async () => {
    await loadProfile({ forceRefresh: true });
  }, [loadProfile]);

  // Clear cache
  const clearCache = useCallback(async () => {
    await profileService.clearCache();
    setProfile(null);
    console.log('ProfileContext: Cache cleared');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const nutritionGoals = profile ? profileService.getNutritionGoals(profile) : null;
  const isOnboardingComplete = profile ? profileService.isOnboardingComplete(profile) : false;
  const canCalculateGoals = !!(
    profile?.age &&
    profile?.gender &&
    profile?.height_cm &&
    profile?.weight_kg &&
    profile?.activity_level &&
    profile?.primary_goal
  );

  // Auto-load profile when user changes
  useEffect(() => {
    if (autoLoad && user?.id && !profile && !loading) {
      console.log('ProfileContext: Auto-loading profile for user:', user.id);
      loadProfile();
    }
  }, [user?.id, profile, loading, autoLoad, loadProfile]);

  // Clear profile when user logs out
  useEffect(() => {
    if (!user?.id && profile) {
      console.log('ProfileContext: Clearing profile (user logged out)');
      setProfile(null);
      setError(null);
    }
  }, [user?.id, profile]);

  const contextValue: ProfileContextValue = {
    // State
    profile,
    loading,
    error,

    // Methods
    loadProfile,
    updateProfile,
    refreshProfile,
    clearCache,

    // Computed values
    nutritionGoals,
    isOnboardingComplete,
    canCalculateGoals,

    // Utilities
    clearError,
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

// Hook to use profile context
export const useProfile = (): ProfileContextValue => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

// Hook for profile loading state
export const useProfileLoading = () => {
  const { loading, error } = useProfile();
  return { loading, error };
};

// Hook for profile data only
export const useProfileData = () => {
  const { profile, nutritionGoals, isOnboardingComplete, canCalculateGoals } = useProfile();
  return { profile, nutritionGoals, isOnboardingComplete, canCalculateGoals };
};

// Hook for profile actions only
export const useProfileActions = () => {
  const { loadProfile, updateProfile, refreshProfile, clearCache, clearError } = useProfile();
  return { loadProfile, updateProfile, refreshProfile, clearCache, clearError };
};
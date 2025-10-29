/**
 * ProfileService Tests
 * Tests for profile loading, caching, updating, and error handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileService, ProfileLoadError, ProfileNotFoundError } from '../ProfileService';
import { supabase } from '../../lib/supabase';
import type { UserProfile } from '../../types/profile';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../lib/supabase');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ProfileService', () => {
  let profileService: ProfileService;
  const mockUserId = 'test-user-123';

  const mockProfileData = {
    id: mockUserId,
    email: 'test@example.com',
    full_name: 'Test User',
    age: 30,
    gender: 'male',
    height_cm: 175,
    weight_kg: 75,
    activity_level: 'moderate',
    primary_goal: 'maintain',
    diet_type: 'mindfork',
    onboarding_completed: true,
    onboarding_step: 7,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    profileService = ProfileService.getInstance();
    
    // Clear cache before each test
    profileService.clearCache();
  });

  describe('loadProfile', () => {
    it('should load profile from Supabase successfully', async () => {
      // Mock successful Supabase response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfileData,
              error: null,
            }),
          }),
        }),
      } as any);

      const profile = await profileService.loadProfile(mockUserId);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(mockUserId);
      expect(profile.full_name).toBe('Test User');
      expect(profile.daily_calories).toBeDefined(); // Should calculate nutrition goals
    });

    it('should handle Supabase errors gracefully', async () => {
      // Mock Supabase error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Network error' },
            }),
          }),
        }),
      } as any);

      // Should return default profile instead of throwing
      const profile = await profileService.loadProfile(mockUserId);
      
      expect(profile).toBeDefined();
      expect(profile.id).toBe(mockUserId);
      expect(profile.tier).toBe('free');
      expect(profile.onboarding_completed).toBe(false);
    });

    it('should use cached profile when available and valid', async () => {
      // First load - should hit Supabase
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfileData,
              error: null,
            }),
          }),
        }),
      } as any);

      const profile1 = await profileService.loadProfile(mockUserId);
      
      // Clear mock to ensure second call doesn't hit Supabase
      jest.clearAllMocks();
      
      // Second load - should use cache
      const profile2 = await profileService.loadProfile(mockUserId);
      
      expect(profile1).toEqual(profile2);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should force refresh when requested', async () => {
      // First load
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfileData,
              error: null,
            }),
          }),
        }),
      } as any);

      await profileService.loadProfile(mockUserId);
      
      // Force refresh should hit Supabase again
      await profileService.loadProfile(mockUserId, { forceRefresh: true });
      
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      // Mock initial load
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfileData,
              error: null,
            }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({
          error: null,
        }),
      } as any);

      const updates = { full_name: 'Updated Name', age: 31 };
      const updatedProfile = await profileService.updateProfile(mockUserId, updates);

      expect(updatedProfile.full_name).toBe('Updated Name');
      expect(updatedProfile.age).toBe(31);
      expect(mockSupabase.from().upsert).toHaveBeenCalled();
    });

    it('should recalculate nutrition goals when profile changes', async () => {
      // Mock initial load
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfileData,
              error: null,
            }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({
          error: null,
        }),
      } as any);

      const updates = { weight_kg: 80, primary_goal: 'lose_weight' as const };
      const updatedProfile = await profileService.updateProfile(mockUserId, updates);

      expect(updatedProfile.weight_kg).toBe(80);
      expect(updatedProfile.primary_goal).toBe('lose_weight');
      expect(updatedProfile.daily_calories).toBeDefined();
      expect(updatedProfile.daily_calories).not.toBe(mockProfileData.daily_calories);
    });

    it('should handle update errors gracefully', async () => {
      // Mock successful load but failed update
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfileData,
              error: null,
            }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      } as any);

      const updates = { full_name: 'Updated Name' };
      
      await expect(
        profileService.updateProfile(mockUserId, updates)
      ).rejects.toThrow('Failed to update profile');
    });
  });

  describe('getNutritionGoals', () => {
    it('should return nutrition goals for complete profile', () => {
      const completeProfile: UserProfile = {
        ...mockProfileData,
        age: 30,
        gender: 'male',
        height_cm: 175,
        weight_kg: 75,
        activity_level: 'moderate',
        primary_goal: 'maintain',
        diet_type: 'mindfork',
      };

      const goals = profileService.getNutritionGoals(completeProfile);
      
      expect(goals).toBeDefined();
      expect(goals!.daily_calories).toBeGreaterThan(0);
      expect(goals!.daily_protein_g).toBeGreaterThan(0);
      expect(goals!.daily_carbs_g).toBeGreaterThan(0);
      expect(goals!.daily_fat_g).toBeGreaterThan(0);
    });

    it('should return null for incomplete profile', () => {
      const incompleteProfile: UserProfile = {
        id: mockUserId,
        full_name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
        // Missing required fields for goal calculation
      };

      const goals = profileService.getNutritionGoals(incompleteProfile);
      expect(goals).toBeNull();
    });
  });

  describe('isOnboardingComplete', () => {
    it('should return true for completed onboarding', () => {
      const profile: UserProfile = {
        ...mockProfileData,
        onboarding_completed: true,
      };

      const isComplete = profileService.isOnboardingComplete(profile);
      expect(isComplete).toBe(true);
    });

    it('should return false for incomplete onboarding', () => {
      const profile: UserProfile = {
        ...mockProfileData,
        onboarding_completed: false,
      };

      const isComplete = profileService.isOnboardingComplete(profile);
      expect(isComplete).toBe(false);
    });
  });

  describe('caching', () => {
    it('should cache profile to AsyncStorage', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfileData,
              error: null,
            }),
          }),
        }),
      } as any);

      await profileService.loadProfile(mockUserId);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@mindfork/profile_cache',
        expect.stringContaining(mockUserId)
      );
    });

    it('should clear cache when requested', async () => {
      await profileService.clearCache();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@mindfork/profile_cache'
      );
    });
  });
});
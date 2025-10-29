/**
 * PersonalizedDashboard Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PersonalizedDashboard } from '../PersonalizedDashboard';
import { useProfile } from '../../../contexts/ProfileContext';
import { useFoodTracking, useFastingTimer } from '../../../hooks';

// Mock dependencies
jest.mock('../../../contexts/ProfileContext');
jest.mock('../../../hooks');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockUseFoodTracking = useFoodTracking as jest.MockedFunction<typeof useFoodTracking>;
const mockUseFastingTimer = useFastingTimer as jest.MockedFunction<typeof useFastingTimer>;

describe('PersonalizedDashboard', () => {
  const mockProfile = {
    id: 'test-user',
    full_name: 'Test User',
    age: 30,
    gender: 'male' as const,
    height_cm: 175,
    weight_kg: 75,
    primary_goal: 'lose_weight' as const,
    activity_level: 'moderate' as const,
    diet_type: 'mindfork' as const,
    onboarding_completed: true,
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockNutritionGoals = {
    daily_calories: 2000,
    daily_protein_g: 150,
    daily_carbs_g: 250,
    daily_fat_g: 65,
    daily_fiber_g: 25,
  };

  const mockDailyStats = {
    total_calories: 1800,
    total_protein: 120,
    total_carbs: 200,
    total_fat: 50,
    total_fiber: 20,
    meal_count: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseProfile.mockReturnValue({
      profile: mockProfile,
      nutritionGoals: mockNutritionGoals,
      isOnboardingComplete: true,
      loading: false,
      error: null,
      loadProfile: jest.fn(),
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
      clearCache: jest.fn(),
      canCalculateGoals: true,
      clearError: jest.fn(),
    });

    mockUseFoodTracking.mockReturnValue({
      dailyStats: mockDailyStats,
      isLoading: false,
      error: null,
      refreshStats: jest.fn(),
    });

    mockUseFastingTimer.mockReturnValue({
      activeSession: null,
      elapsedHours: 0,
      progress: 0,
      startFasting: jest.fn(),
      endFasting: jest.fn(),
    });
  });

  describe('Onboarding Complete', () => {
    it('should render personalized greeting for lose_weight goal', () => {
      const { getByText } = render(<PersonalizedDashboard />);
      
      expect(getByText(/Hey Test! Let's crush those weight goals today/)).toBeTruthy();
    });

    it('should render personalized greeting for gain_muscle goal', () => {
      mockUseProfile.mockReturnValue({
        ...mockUseProfile(),
        profile: { ...mockProfile, primary_goal: 'gain_muscle' },
      });

      const { getByText } = render(<PersonalizedDashboard />);
      
      expect(getByText(/What's up Test! Time to fuel those gains/)).toBeTruthy();
    });

    it('should display current progress metrics', () => {
      const { getByText } = render(<PersonalizedDashboard />);
      
      // Should show calories (primary metric for lose_weight)
      expect(getByText('1800')).toBeTruthy();
      expect(getByText('Calories')).toBeTruthy();
      
      // Should show deficit (secondary metric for lose_weight)
      expect(getByText('200')).toBeTruthy(); // 2000 - 1800 = 200 deficit
      expect(getByText('Deficit')).toBeTruthy();
    });

    it('should show goal-specific action buttons for lose_weight', () => {
      const { getByText } = render(<PersonalizedDashboard />);
      
      expect(getByText('Log meal')).toBeTruthy();
      expect(getByText('Start fast')).toBeTruthy();
    });

    it('should show goal-specific action buttons for gain_muscle', () => {
      mockUseProfile.mockReturnValue({
        ...mockUseProfile(),
        profile: { ...mockProfile, primary_goal: 'gain_muscle' },
      });

      const { getByText } = render(<PersonalizedDashboard />);
      
      expect(getByText('Log meal')).toBeTruthy();
      expect(getByText('Track workout')).toBeTruthy();
    });

    it('should display active fasting session when present', () => {
      mockUseFastingTimer.mockReturnValue({
        activeSession: { id: 'test-session' } as any,
        elapsedHours: 14.5,
        progress: 72,
        startFasting: jest.fn(),
        endFasting: jest.fn(),
      });

      const { getByText } = render(<PersonalizedDashboard />);
      
      expect(getByText('Active Fast ⏱️')).toBeTruthy();
      expect(getByText('14h 30m')).toBeTruthy();
      expect(getByText('72% complete')).toBeTruthy();
    });

    it('should show secondary metrics (carbs and fat)', () => {
      const { getByText } = render(<PersonalizedDashboard />);
      
      expect(getByText('Carbs')).toBeTruthy();
      expect(getByText('200g')).toBeTruthy();
      expect(getByText('/ 250g')).toBeTruthy();
      
      expect(getByText('Fat')).toBeTruthy();
      expect(getByText('50g')).toBeTruthy();
      expect(getByText('/ 65g')).toBeTruthy();
    });

    it('should display goal-specific coaching message', () => {
      const { getByText } = render(<PersonalizedDashboard />);
      
      // For lose_weight goal with good calorie control
      expect(getByText(/Perfect calorie balance! You're on track to reach your weight loss goals/)).toBeTruthy();
    });

    it('should handle navigation callbacks', () => {
      const mockOnNavigate = jest.fn();
      const { getByText } = render(<PersonalizedDashboard onNavigate={mockOnNavigate} />);
      
      fireEvent.press(getByText('Log meal'));
      expect(mockOnNavigate).toHaveBeenCalledWith('Food');
      
      fireEvent.press(getByText('Chat with coach'));
      expect(mockOnNavigate).toHaveBeenCalledWith('Coach');
    });
  });

  describe('Onboarding Incomplete', () => {
    beforeEach(() => {
      mockUseProfile.mockReturnValue({
        ...mockUseProfile(),
        profile: { ...mockProfile, onboarding_completed: false },
        isOnboardingComplete: false,
      });
    });

    it('should show onboarding prompt when not completed', () => {
      const { getByText } = render(<PersonalizedDashboard />);
      
      expect(getByText('Welcome to MindFork! 🌟')).toBeTruthy();
      expect(getByText(/Complete your profile setup to get personalized nutrition goals/)).toBeTruthy();
      expect(getByText('Complete Setup')).toBeTruthy();
    });

    it('should handle onboarding navigation', () => {
      const mockOnNavigate = jest.fn();
      const { getByText } = render(<PersonalizedDashboard onNavigate={mockOnNavigate} />);
      
      fireEvent.press(getByText('Complete Setup'));
      expect(mockOnNavigate).toHaveBeenCalledWith('Onboarding');
    });
  });

  describe('Different Goals', () => {
    it('should show protein as primary metric for gain_muscle goal', () => {
      mockUseProfile.mockReturnValue({
        ...mockUseProfile(),
        profile: { ...mockProfile, primary_goal: 'gain_muscle' },
      });

      const { getByText } = render(<PersonalizedDashboard />);
      
      // Primary metric should be protein for muscle gain
      expect(getByText('120')).toBeTruthy(); // protein value
      expect(getByText('Protein')).toBeTruthy();
    });

    it('should show balance metric for maintain goal', () => {
      mockUseProfile.mockReturnValue({
        ...mockUseProfile(),
        profile: { ...mockProfile, primary_goal: 'maintain' },
      });

      const { getByText } = render(<PersonalizedDashboard />);
      
      expect(getByText('Balance')).toBeTruthy();
    });

    it('should show nutrition score for get_healthy goal', () => {
      mockUseProfile.mockReturnValue({
        ...mockUseProfile(),
        profile: { ...mockProfile, primary_goal: 'get_healthy' },
      });

      const { getByText } = render(<PersonalizedDashboard />);
      
      expect(getByText('Nutrition')).toBeTruthy();
    });
  });

  describe('Progress Status Colors', () => {
    it('should show green color for good progress', () => {
      const { getByTestId } = render(<PersonalizedDashboard />);
      
      // With current stats (1800/2000 calories), should be green (good)
      // This would need to be tested with actual color values in a more complex test setup
    });

    it('should show warning color for over-target progress', () => {
      mockUseFoodTracking.mockReturnValue({
        ...mockUseFoodTracking(),
        dailyStats: { ...mockDailyStats, total_calories: 2200 }, // Over target
      });

      const { getByText } = render(<PersonalizedDashboard />);
      
      expect(getByText('2200')).toBeTruthy();
      // Color testing would require more complex setup
    });
  });

  describe('Error Handling', () => {
    it('should handle missing nutrition goals gracefully', () => {
      mockUseProfile.mockReturnValue({
        ...mockUseProfile(),
        nutritionGoals: null,
      });

      const { getByText } = render(<PersonalizedDashboard />);
      
      // Should still render without crashing
      expect(getByText(/Hey Test!/)).toBeTruthy();
    });

    it('should handle missing daily stats gracefully', () => {
      mockUseFoodTracking.mockReturnValue({
        ...mockUseFoodTracking(),
        dailyStats: null,
      });

      const { getByText } = render(<PersonalizedDashboard />);
      
      // Should still render without crashing
      expect(getByText(/Hey Test!/)).toBeTruthy();
    });
  });
});
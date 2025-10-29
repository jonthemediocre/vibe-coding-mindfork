/**
 * Integration tests for Coach Context system
 * Tests the complete flow from profile data to personalized coaching
 */

import { CoachContextService } from '../CoachContextService';
import { CoachService } from '../coachService';
import type { UserProfile } from '../../types/profile';
import type { DailyStats } from '../../types/models';

// Mock user profile for testing
const mockProfile: UserProfile = {
  id: 'test-user',
  user_id: 'test-user',
  primary_goal: 'lose_weight',
  daily_calories: 1800,
  daily_protein_g: 140,
  daily_carbs_g: 180,
  daily_fat_g: 60,
  daily_fiber_g: 25,
  diet_type: 'mindfork',
  activity_level: 'moderate',
  weight_kg: 75,
  target_weight_kg: 70,
  height_cm: 170,
  age: 30,
  gender: 'female',
  weight_unit: 'kg',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Mock daily stats
const mockDailyStats: DailyStats = {
  date: '2024-01-15',
  user_id: 'test-user',
  total_calories: 1200, // Under target
  total_protein: 80,    // Under target
  total_carbs: 150,
  total_fat: 45,
  total_fiber: 15,      // Under target
  meal_count: 2,        // Low meal count
};

// Mock weekly stats (7 days of varying consistency)
const mockWeeklyStats: DailyStats[] = [
  { ...mockDailyStats, date: '2024-01-09', meal_count: 3, total_calories: 1600 },
  { ...mockDailyStats, date: '2024-01-10', meal_count: 1, total_calories: 800 },  // Poor day
  { ...mockDailyStats, date: '2024-01-11', meal_count: 3, total_calories: 1750 },
  { ...mockDailyStats, date: '2024-01-12', meal_count: 2, total_calories: 1400 },
  { ...mockDailyStats, date: '2024-01-13', meal_count: 3, total_calories: 1850 },
  { ...mockDailyStats, date: '2024-01-14', meal_count: 2, total_calories: 1300 },
  mockDailyStats, // Today
];

describe('Coach Context Integration', () => {
  describe('Context Generation', () => {
    it('should generate comprehensive context from user data', () => {
      const context = CoachContextService.generateContext(
        mockProfile,
        mockDailyStats,
        mockWeeklyStats
      );

      expect(context).toBeDefined();
      expect(context.userGoals.primary_goal).toBe('lose_weight');
      expect(context.userGoals.daily_calories).toBe(1800);
      expect(context.userGoals.diet_type).toBe('mindfork');
      
      // Should identify current progress
      expect(context.currentProgress.calories_consumed).toBe(1200);
      expect(context.currentProgress.days_tracked).toBe(7);
      
      // Should identify challenges
      expect(context.challenges.length).toBeGreaterThan(0);
      const proteinChallenge = context.challenges.find(c => c.type === 'low_protein');
      expect(proteinChallenge).toBeDefined();
      
      // Should calculate consistency
      expect(context.currentProgress.consistency_score).toBeGreaterThan(0);
    });

    it('should identify dietary restrictions based on diet type', () => {
      const veganProfile = { ...mockProfile, diet_type: 'vegan' as const };
      const context = CoachContextService.generateContext(veganProfile);
      
      expect(context.restrictions).toContain('no animal products');
      expect(context.restrictions).toContain('plant-based only');
    });

    it('should generate time-appropriate metadata', () => {
      const context = CoachContextService.generateContext(mockProfile);
      
      expect(context.metadata.time_of_day).toMatch(/morning|afternoon|evening|night/);
      expect(context.metadata.days_since_onboarding).toBeGreaterThan(0);
      expect(context.metadata.upcoming_goals).toContain('maintain calorie deficit');
    });
  });

  describe('Coach Prompt Generation', () => {
    it('should generate personalized prompts with context', () => {
      const context = CoachContextService.generateContext(
        mockProfile,
        mockDailyStats,
        mockWeeklyStats
      );

      const prompt = CoachContextService.generateCoachPrompt(
        context,
        'Gentle & Supportive',
        'What should I eat for dinner?'
      );

      expect(prompt).toContain('lose_weight'); // Goal mentioned
      expect(prompt).toContain('1200'); // Current calories
      expect(prompt).toContain('1800'); // Target calories
      expect(prompt).toContain('What should I eat for dinner?'); // Original message
      expect(prompt).toContain('Gentle & Supportive'); // Coach personality
    });

    it('should include challenge information in prompts', () => {
      const context = CoachContextService.generateContext(
        mockProfile,
        mockDailyStats,
        mockWeeklyStats
      );

      const prompt = CoachContextService.generateCoachPrompt(
        context,
        'Disciplined & Structured',
        'Help me stay on track'
      );

      // Should mention protein challenge
      expect(prompt.toLowerCase()).toContain('protein');
      expect(prompt).toContain('80g'); // Current protein
      expect(prompt).toContain('140g'); // Target protein
    });
  });

  describe('Coach Service Integration', () => {
    it('should track mock responses in development', () => {
      const initialCount = CoachService.getMockResponseCount();
      
      // This will use mock response since we're in test environment
      const response = CoachService['getMockResponse']('synapse', 'Test message');
      
      expect(response.response).toContain('[MOCK RESPONSE');
      expect(response.coach_id).toBe('synapse');
      expect(response.message).toBe('Test message');
    });

    it('should indicate when not using real AI', () => {
      expect(CoachService.isUsingRealAI()).toBe(false);
    });
  });

  describe('Context Validation and Safety', () => {
    it('should sanitize sensitive information', () => {
      const sensitiveProfile = {
        ...mockProfile,
        age: 12, // Under 13
      };

      const context = CoachContextService.generateContext(sensitiveProfile);
      
      // Age should be removed for safety
      expect(context.preferences.age).toBeUndefined();
    });

    it('should limit context size for API efficiency', () => {
      // Create profile with many achievements and challenges
      const statsWithManyEntries = Array.from({ length: 20 }, (_, i) => ({
        ...mockDailyStats,
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        total_protein: 200, // High protein to create achievements
        meal_count: 4,
      }));

      const context = CoachContextService.generateContext(
        mockProfile,
        mockDailyStats,
        statsWithManyEntries
      );

      // Should limit arrays for API efficiency
      expect(context.achievements.length).toBeLessThanOrEqual(5);
      expect(context.challenges.length).toBeLessThanOrEqual(3);
      expect(context.restrictions.length).toBeLessThanOrEqual(5);
    });

    it('should provide safe defaults for invalid data', () => {
      const invalidProfile = {
        ...mockProfile,
        daily_calories: 100, // Too low
      };

      const context = CoachContextService.generateContext(invalidProfile);
      
      // Should use safe default
      expect(context.userGoals.daily_calories).toBe(2000);
    });
  });
});
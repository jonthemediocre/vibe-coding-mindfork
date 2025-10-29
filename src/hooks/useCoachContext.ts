/**
 * useCoachContext Hook
 * Provides easy access to personalized coach context generation
 */

import { useMemo } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { useFoodTracking } from './useFoodTracking';
import { CoachContextService, type CoachContext } from '../services/CoachContextService';

interface UseCoachContextOptions {
  includeWeightData?: boolean;
  includePastWeek?: boolean;
}

interface UseCoachContextReturn {
  context: CoachContext | null;
  generatePrompt: (coachPersonality: string, userMessage: string) => string | null;
  isReady: boolean;
  contextSummary: {
    goalsSet: boolean;
    hasProgress: boolean;
    achievementCount: number;
    challengeCount: number;
  };
}

export const useCoachContext = (
  options: UseCoachContextOptions = {}
): UseCoachContextReturn => {
  const { includeWeightData = false, includePastWeek = true } = options;
  
  const { profile, nutritionGoals, isOnboardingComplete } = useProfile();
  const { dailyStats, weeklyStats } = useFoodTracking();

  // Generate coach context
  const context = useMemo(() => {
    if (!profile || !isOnboardingComplete) {
      return null;
    }

    // Use weekly stats if available and requested
    const recentStats = includePastWeek ? weeklyStats : undefined;
    
    // TODO: Add weight data integration when weight tracking is implemented
    const weightData = includeWeightData ? undefined : undefined;

    return CoachContextService.generateContext(
      profile,
      dailyStats || undefined,
      recentStats,
      weightData
    );
  }, [profile, isOnboardingComplete, dailyStats, weeklyStats, includePastWeek, includeWeightData]);

  // Generate coach prompt
  const generatePrompt = (coachPersonality: string, userMessage: string): string | null => {
    if (!context) return null;
    
    return CoachContextService.generateCoachPrompt(context, coachPersonality, userMessage);
  };

  // Context summary for UI display
  const contextSummary = useMemo(() => {
    if (!context) {
      return {
        goalsSet: false,
        hasProgress: false,
        achievementCount: 0,
        challengeCount: 0,
      };
    }

    return {
      goalsSet: !!context.userGoals.primary_goal,
      hasProgress: context.currentProgress.days_tracked > 0,
      achievementCount: context.achievements.length,
      challengeCount: context.challenges.length,
    };
  }, [context]);

  return {
    context,
    generatePrompt,
    isReady: !!context,
    contextSummary,
  };
};

// Hook for getting specific context insights
export const useCoachInsights = () => {
  const { context } = useCoachContext();

  const insights = useMemo(() => {
    if (!context) return null;

    const { currentProgress, userGoals, challenges, achievements } = context;

    // Calculate progress percentages
    const calorieProgress = (currentProgress.calories_consumed / userGoals.daily_calories) * 100;
    const proteinProgress = (currentProgress.macros_consumed.protein_g / userGoals.macro_targets.protein_g) * 100;

    // Determine overall status
    let overallStatus: 'excellent' | 'good' | 'needs_attention' | 'getting_started';
    
    if (currentProgress.days_tracked === 0) {
      overallStatus = 'getting_started';
    } else if (challenges.length === 0 && achievements.length > 0) {
      overallStatus = 'excellent';
    } else if (challenges.filter(c => c.severity === 'high').length === 0) {
      overallStatus = 'good';
    } else {
      overallStatus = 'needs_attention';
    }

    // Get primary focus area based on goal
    let primaryFocus: string;
    switch (userGoals.primary_goal) {
      case 'lose_weight':
        primaryFocus = calorieProgress > 110 ? 'calorie control' : 'consistency';
        break;
      case 'gain_muscle':
        primaryFocus = proteinProgress < 80 ? 'protein intake' : 'calorie surplus';
        break;
      case 'maintain':
        primaryFocus = Math.abs(calorieProgress - 100) > 15 ? 'calorie balance' : 'nutrition quality';
        break;
      case 'get_healthy':
      default:
        primaryFocus = 'balanced nutrition';
        break;
    }

    return {
      overallStatus,
      primaryFocus,
      calorieProgress: Math.round(calorieProgress),
      proteinProgress: Math.round(proteinProgress),
      consistencyScore: Math.round(currentProgress.consistency_score),
      topChallenge: challenges[0]?.description || null,
      latestAchievement: achievements[0]?.description || null,
    };
  }, [context]);

  return insights;
};

// Hook for coach personality matching
export const useCoachPersonalityMatch = () => {
  const { context } = useCoachContext();

  const getRecommendedCoaches = useMemo(() => {
    if (!context) return [];

    const { userGoals, currentProgress, challenges } = context;
    const recommendations: Array<{ coachId: string; reason: string; match: number }> = [];

    // Beginner-friendly coaches for new users
    if (currentProgress.days_tracked < 7) {
      recommendations.push({
        coachId: 'synapse',
        reason: 'Perfect for beginners with gentle, analytical guidance',
        match: 90,
      });
    }

    // Goal-specific recommendations
    switch (userGoals.primary_goal) {
      case 'lose_weight':
        recommendations.push({
          coachId: 'veloura',
          reason: 'Disciplined approach perfect for weight loss goals',
          match: 85,
        });
        break;
      case 'gain_muscle':
        recommendations.push({
          coachId: 'vetra',
          reason: 'High energy motivation for muscle building',
          match: 85,
        });
        break;
      case 'maintain':
        recommendations.push({
          coachId: 'verdant',
          reason: 'Calm, sustainable approach for maintenance',
          match: 85,
        });
        break;
      case 'get_healthy':
        recommendations.push({
          coachId: 'decibel',
          reason: 'Positive, social support for overall wellness',
          match: 85,
        });
        break;
    }

    // Challenge-based recommendations
    if (challenges.some(c => c.severity === 'high')) {
      recommendations.push({
        coachId: 'maya-rival',
        reason: 'Competitive motivation to overcome challenges',
        match: 75,
      });
    }

    // Recovery and resilience
    if (currentProgress.consistency_score < 50) {
      recommendations.push({
        coachId: 'aetheris',
        reason: 'Helps you bounce back from setbacks',
        match: 80,
      });
    }

    return recommendations
      .sort((a, b) => b.match - a.match)
      .slice(0, 3); // Top 3 recommendations
  }, [context]);

  return getRecommendedCoaches;
};
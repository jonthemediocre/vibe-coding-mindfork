/**
 * Personalized Dashboard Component
 * Adapts layout and content based on user's primary goal and preferences
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from '../../ui';
import { useProfile } from '../../contexts/ProfileContext';
import { useFoodTracking, useFastingTimer } from '../../hooks';
import { useNavigation } from '@react-navigation/native';
import type { Goal } from '../../utils/goalCalculations';

// Goal-specific dashboard configurations
interface DashboardConfig {
  primaryMetrics: string[];
  secondaryMetrics: string[];
  coachingFocus: string;
  actionButtons: Array<{
    title: string;
    action: string;
    variant: 'primary' | 'secondary' | 'outline';
  }>;
}

const GOAL_CONFIGS: Record<Goal, DashboardConfig> = {
  lose_weight: {
    primaryMetrics: ['calories', 'deficit'],
    secondaryMetrics: ['protein', 'steps'],
    coachingFocus: 'calorie deficit and sustainable habits',
    actionButtons: [
      { title: 'Log meal', action: 'Food', variant: 'primary' },
      { title: 'Start fast', action: 'Fasting', variant: 'secondary' },
    ],
  },
  gain_muscle: {
    primaryMetrics: ['protein', 'calories'],
    secondaryMetrics: ['carbs', 'workouts'],
    coachingFocus: 'protein intake and muscle building',
    actionButtons: [
      { title: 'Log meal', action: 'Food', variant: 'primary' },
      { title: 'Track workout', action: 'Fitness', variant: 'secondary' },
    ],
  },
  maintain: {
    primaryMetrics: ['calories', 'balance'],
    secondaryMetrics: ['protein', 'fiber'],
    coachingFocus: 'balanced nutrition and consistency',
    actionButtons: [
      { title: 'Log meal', action: 'Food', variant: 'primary' },
      { title: 'View trends', action: 'Analytics', variant: 'outline' },
    ],
  },
  get_healthy: {
    primaryMetrics: ['balance', 'variety'],
    secondaryMetrics: ['fiber', 'nutrients'],
    coachingFocus: 'overall wellness and healthy habits',
    actionButtons: [
      { title: 'Log meal', action: 'Food', variant: 'primary' },
      { title: 'Health insights', action: 'Analytics', variant: 'secondary' },
    ],
  },
};

interface PersonalizedDashboardProps {
  onNavigate?: (screen: string) => void;
}

export const PersonalizedDashboard: React.FC<PersonalizedDashboardProps> = ({ 
  onNavigate 
}) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const { profile, nutritionGoals, isOnboardingComplete } = useProfile();
  const { dailyStats, isLoading: foodLoading } = useFoodTracking();
  const { activeSession, elapsedHours, progress } = useFastingTimer();

  // Get goal-specific configuration
  const primaryGoal = profile?.primary_goal || 'get_healthy';
  const config = GOAL_CONFIGS[primaryGoal];

  // Handle navigation
  const handleNavigation = (screen: string) => {
    if (onNavigate) {
      onNavigate(screen);
    } else {
      navigation.navigate(screen as never);
    }
  };

  // Get personalized greeting
  const getGreeting = (): string => {
    const name = profile?.full_name?.split(' ')[0] || 
                 profile?.email?.split('@')[0] || 
                 'there';
    
    const goalMessages = {
      lose_weight: `Hey ${name}! Let's crush those weight goals today 💪`,
      gain_muscle: `What's up ${name}! Time to fuel those gains 🔥`,
      maintain: `Hi ${name}! Staying balanced and consistent 🌟`,
      get_healthy: `Hello ${name}! Another day of healthy choices 🌱`,
    };

    return goalMessages[primaryGoal];
  };

  // Calculate progress based on goal
  const getGoalProgress = () => {
    if (!nutritionGoals || !dailyStats) return null;

    const calorieProgress = (dailyStats.total_calories / nutritionGoals.daily_calories) * 100;
    const proteinProgress = (dailyStats.total_protein / nutritionGoals.daily_protein_g) * 100;

    switch (primaryGoal) {
      case 'lose_weight':
        return {
          primary: {
            label: 'Calories',
            current: Math.round(dailyStats.total_calories),
            target: nutritionGoals.daily_calories,
            progress: calorieProgress,
            status: calorieProgress <= 100 ? 'good' : 'over',
          },
          secondary: {
            label: 'Deficit',
            current: Math.max(0, nutritionGoals.daily_calories - dailyStats.total_calories),
            target: 500, // Typical deficit goal
            progress: Math.min(100, ((nutritionGoals.daily_calories - dailyStats.total_calories) / 500) * 100),
            status: calorieProgress <= 100 ? 'good' : 'attention',
          },
        };

      case 'gain_muscle':
        return {
          primary: {
            label: 'Protein',
            current: Math.round(dailyStats.total_protein),
            target: nutritionGoals.daily_protein_g,
            progress: proteinProgress,
            status: proteinProgress >= 80 ? 'good' : 'attention',
          },
          secondary: {
            label: 'Calories',
            current: Math.round(dailyStats.total_calories),
            target: nutritionGoals.daily_calories,
            progress: calorieProgress,
            status: calorieProgress >= 90 ? 'good' : 'attention',
          },
        };

      case 'maintain':
        return {
          primary: {
            label: 'Balance',
            current: Math.round(calorieProgress),
            target: 100,
            progress: 100 - Math.abs(calorieProgress - 100),
            status: Math.abs(calorieProgress - 100) <= 10 ? 'good' : 'attention',
          },
          secondary: {
            label: 'Protein',
            current: Math.round(dailyStats.total_protein),
            target: nutritionGoals.daily_protein_g,
            progress: proteinProgress,
            status: proteinProgress >= 70 ? 'good' : 'attention',
          },
        };

      case 'get_healthy':
      default:
        const fiberProgress = (dailyStats.total_fiber / nutritionGoals.daily_fiber_g) * 100;
        return {
          primary: {
            label: 'Nutrition',
            current: Math.round((calorieProgress + proteinProgress + fiberProgress) / 3),
            target: 100,
            progress: (calorieProgress + proteinProgress + fiberProgress) / 3,
            status: (calorieProgress + proteinProgress + fiberProgress) / 3 >= 70 ? 'good' : 'attention',
          },
          secondary: {
            label: 'Fiber',
            current: Math.round(dailyStats.total_fiber),
            target: nutritionGoals.daily_fiber_g,
            progress: fiberProgress,
            status: fiberProgress >= 70 ? 'good' : 'attention',
          },
        };
    }
  };

  // Get goal-specific coaching message
  const getCoachingMessage = (): string => {
    if (!dailyStats || !nutritionGoals) {
      return "Start logging your meals to get personalized insights!";
    }

    const calorieProgress = (dailyStats.total_calories / nutritionGoals.daily_calories) * 100;
    const proteinProgress = (dailyStats.total_protein / nutritionGoals.daily_protein_g) * 100;

    switch (primaryGoal) {
      case 'lose_weight':
        if (calorieProgress < 70) {
          return "You're doing great with portion control! Make sure you're eating enough to fuel your body.";
        } else if (calorieProgress > 110) {
          return "A bit over today, but that's normal! Focus on protein and fiber for your next meal.";
        } else {
          return "Perfect calorie balance! You're on track to reach your weight loss goals.";
        }

      case 'gain_muscle':
        if (proteinProgress < 70) {
          return "Your protein intake could be higher. Try adding lean meats, eggs, or protein powder.";
        } else if (calorieProgress < 90) {
          return "Great protein intake! Consider adding more calories to support muscle growth.";
        } else {
          return "Excellent nutrition for muscle building! Keep up the consistent protein intake.";
        }

      case 'maintain':
        if (Math.abs(calorieProgress - 100) <= 10) {
          return "Perfect balance! You're maintaining your weight with consistent nutrition.";
        } else {
          return "Small adjustments can help you stay balanced. Focus on consistent meal timing.";
        }

      case 'get_healthy':
      default:
        const fiberProgress = (dailyStats.total_fiber / nutritionGoals.daily_fiber_g) * 100;
        if (fiberProgress < 50) {
          return "Add more fruits, vegetables, and whole grains to boost your fiber intake!";
        } else if (proteinProgress < 70) {
          return "Great fiber intake! Consider adding more protein sources for complete nutrition.";
        } else {
          return "Fantastic balanced nutrition! You're building healthy habits that last.";
        }
    }
  };

  if (!isOnboardingComplete) {
    return (
      <Screen>
        <View style={styles.onboardingPrompt}>
          <Text variant="headingMedium" style={styles.onboardingTitle}>
            Welcome to MindFork! 🌟
          </Text>
          <Text variant="body" style={styles.onboardingText}>
            Complete your profile setup to get personalized nutrition goals and insights.
          </Text>
          <Button
            title="Complete Setup"
            variant="primary"
            onPress={() => handleNavigation('Onboarding')}
            containerStyle={styles.onboardingButton}
          />
        </View>
      </Screen>
    );
  }

  const goalProgress = getGoalProgress();

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      {/* Personalized Greeting */}
      <Text variant="headingSmall" style={styles.greeting}>
        {getGreeting()}
      </Text>

      {/* Primary Goal Metrics */}
      {goalProgress && (
        <Card elevation={2} style={styles.primaryCard}>
          <Text variant="titleSmall" style={styles.cardTitle}>
            Today's Progress
          </Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text variant="headingMedium" style={[
                styles.metricValue,
                { color: goalProgress.primary.status === 'good' ? colors.success : colors.warning }
              ]}>
                {goalProgress.primary.current}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {goalProgress.primary.label}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(goalProgress.primary.progress, 100)}%`,
                      backgroundColor: goalProgress.primary.status === 'good' ? colors.success : colors.warning,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.metricItem}>
              <Text variant="headingMedium" style={[
                styles.metricValue,
                { color: goalProgress.secondary.status === 'good' ? colors.success : colors.warning }
              ]}>
                {goalProgress.secondary.current}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {goalProgress.secondary.label}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(goalProgress.secondary.progress, 100)}%`,
                      backgroundColor: goalProgress.secondary.status === 'good' ? colors.success : colors.warning,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Goal-specific action buttons */}
          <View style={styles.actionButtons}>
            {config.actionButtons.map((button, index) => (
              <Button
                key={index}
                title={button.title}
                variant={button.variant}
                onPress={() => handleNavigation(button.action)}
                containerStyle={[
                  styles.actionButton,
                  index === 0 ? styles.primaryActionButton : styles.secondaryActionButton
                ]}
              />
            ))}
          </View>
        </Card>
      )}

      {/* Active Fasting Session */}
      {activeSession && (
        <Card elevation={2}>
          <Text variant="titleSmall">Active Fast ⏱️</Text>
          <View style={styles.fastingRow}>
            <View>
              <Text variant="headingMedium">
                {Math.floor(elapsedHours)}h {Math.floor((elapsedHours % 1) * 60)}m
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {Math.round(progress)}% complete
              </Text>
            </View>
            <Button
              title="View Details"
              variant="outline"
              size="small"
              onPress={() => handleNavigation('Fasting')}
            />
          </View>
        </Card>
      )}

      {/* Secondary Metrics Grid */}
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Card>
            <Text variant="caption" color={colors.textSecondary}>
              Carbs
            </Text>
            <Text variant="titleLarge">
              {Math.round(dailyStats?.total_carbs || 0)}g
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              / {nutritionGoals?.daily_carbs_g || 0}g
            </Text>
          </Card>
        </View>
        <View style={styles.gridItem}>
          <Card>
            <Text variant="caption" color={colors.textSecondary}>
              Fat
            </Text>
            <Text variant="titleLarge">
              {Math.round(dailyStats?.total_fat || 0)}g
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              / {nutritionGoals?.daily_fat_g || 0}g
            </Text>
          </Card>
        </View>
      </View>

      {/* Personalized Coaching */}
      <Card elevation={1}>
        <Text variant="titleSmall">
          💡 Your {config.coachingFocus} coach
        </Text>
        <Text variant="body" color={colors.textSecondary} style={styles.coachingText}>
          {getCoachingMessage()}
        </Text>
        <Button
          title="Chat with coach"
          variant="secondary"
          onPress={() => handleNavigation('Coach')}
          containerStyle={styles.coachingButton}
        />
      </Card>
    </Screen>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
    },
    onboardingPrompt: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    onboardingTitle: {
      textAlign: 'center',
      marginBottom: 16,
    },
    onboardingText: {
      textAlign: 'center',
      marginBottom: 32,
    },
    onboardingButton: {
      minWidth: 200,
    },
    greeting: {
      marginBottom: 20,
    },
    primaryCard: {
      marginBottom: 16,
    },
    cardTitle: {
      marginBottom: 16,
    },
    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    metricItem: {
      flex: 1,
      alignItems: 'center',
    },
    metricValue: {
      marginBottom: 4,
    },
    progressBar: {
      width: '100%',
      height: 6,
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderRadius: 3,
      overflow: 'hidden',
      marginTop: 8,
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
    },
    primaryActionButton: {
      // Primary button gets more emphasis
    },
    secondaryActionButton: {
      // Secondary button styling
    },
    fastingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    grid: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
    },
    gridItem: {
      flex: 1,
    },
    coachingText: {
      marginTop: 8,
      marginBottom: 16,
    },
    coachingButton: {
      // Coaching button styling
    },
  });
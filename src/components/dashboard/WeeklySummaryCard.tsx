/**
 * Weekly Summary Card Component
 * Shows weekly progress summary with achievements and insights
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useThemeColors, useThemedStyles } from '../../ui';
import type { Goal } from '../../utils/goalCalculations';

interface DailyStats {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  meal_count: number;
}

interface NutritionGoals {
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  daily_fiber_g: number;
}

interface WeeklySummaryCardProps {
  weeklyData: DailyStats[];
  nutritionGoals: NutritionGoals;
  primaryGoal: Goal;
  weekStartDate: Date;
}

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({
  weeklyData,
  nutritionGoals,
  primaryGoal,
  weekStartDate,
}) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  // Calculate weekly metrics
  const weeklyMetrics = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return null;
    }

    const totalDays = weeklyData.length;
    const avgCalories = weeklyData.reduce((sum, day) => sum + day.total_calories, 0) / totalDays;
    const avgProtein = weeklyData.reduce((sum, day) => sum + day.total_protein, 0) / totalDays;
    const avgCarbs = weeklyData.reduce((sum, day) => sum + day.total_carbs, 0) / totalDays;
    const avgFat = weeklyData.reduce((sum, day) => sum + day.total_fat, 0) / totalDays;
    const avgFiber = weeklyData.reduce((sum, day) => sum + day.total_fiber, 0) / totalDays;
    const totalMeals = weeklyData.reduce((sum, day) => sum + day.meal_count, 0);

    // Calculate adherence rates
    const calorieAdherence = weeklyData.filter(day => {
      const progress = (day.total_calories / nutritionGoals.daily_calories) * 100;
      return progress >= 80 && progress <= 120; // Within 20% of goal
    }).length / totalDays;

    const proteinAdherence = weeklyData.filter(day => {
      const progress = (day.total_protein / nutritionGoals.daily_protein_g) * 100;
      return progress >= 80; // At least 80% of protein goal
    }).length / totalDays;

    const consistencyScore = weeklyData.filter(day => day.meal_count >= 2).length / totalDays;

    return {
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      avgFiber,
      totalMeals,
      calorieAdherence,
      proteinAdherence,
      consistencyScore,
      totalDays,
    };
  }, [weeklyData, nutritionGoals]);

  // Get achievements based on metrics
  const getAchievements = (): string[] => {
    if (!weeklyMetrics) return [];

    const achievements: string[] = [];

    if (weeklyMetrics.consistencyScore >= 0.8) {
      achievements.push('🎯 Consistent Logging');
    }

    if (weeklyMetrics.calorieAdherence >= 0.7) {
      achievements.push('⚖️ Great Calorie Balance');
    }

    if (weeklyMetrics.proteinAdherence >= 0.8) {
      achievements.push('💪 Protein Champion');
    }

    if (weeklyMetrics.totalMeals >= 14) {
      achievements.push('🍽️ Meal Master');
    }

    if (weeklyMetrics.avgFiber >= nutritionGoals.daily_fiber_g * 0.8) {
      achievements.push('🌱 Fiber Hero');
    }

    // Goal-specific achievements
    switch (primaryGoal) {
      case 'lose_weight':
        if (weeklyMetrics.avgCalories <= nutritionGoals.daily_calories * 1.05) {
          achievements.push('🔥 Calorie Control');
        }
        break;
      case 'gain_muscle':
        if (weeklyMetrics.proteinAdherence >= 0.9) {
          achievements.push('🏋️ Muscle Builder');
        }
        break;
      case 'maintain':
        if (Math.abs(weeklyMetrics.avgCalories - nutritionGoals.daily_calories) <= nutritionGoals.daily_calories * 0.1) {
          achievements.push('⚖️ Perfect Balance');
        }
        break;
      case 'get_healthy':
        if (achievements.length >= 3) {
          achievements.push('🌟 Health Champion');
        }
        break;
    }

    return achievements;
  };

  // Get weekly insights
  const getWeeklyInsights = (): string => {
    if (!weeklyMetrics) {
      return "Start logging your meals to get weekly insights!";
    }

    const { avgCalories, avgProtein, calorieAdherence, proteinAdherence, consistencyScore } = weeklyMetrics;

    // Goal-specific insights
    switch (primaryGoal) {
      case 'lose_weight':
        if (calorieAdherence >= 0.7) {
          return `Excellent calorie control this week! You averaged ${Math.round(avgCalories)} calories daily, staying on track for your weight loss goals.`;
        } else if (avgCalories > nutritionGoals.daily_calories * 1.2) {
          return `Calories were higher than target this week. Focus on portion control and protein-rich foods to stay satisfied.`;
        } else {
          return `Good progress! Try to be more consistent with your calorie targets for better results.`;
        }

      case 'gain_muscle':
        if (proteinAdherence >= 0.8 && avgCalories >= nutritionGoals.daily_calories * 0.95) {
          return `Perfect muscle-building week! Great protein intake (${Math.round(avgProtein)}g daily) and sufficient calories.`;
        } else if (proteinAdherence < 0.7) {
          return `Boost your protein intake! Aim for ${nutritionGoals.daily_protein_g}g daily to support muscle growth.`;
        } else {
          return `Good protein intake! Consider increasing overall calories to maximize muscle building potential.`;
        }

      case 'maintain':
        if (calorieAdherence >= 0.8) {
          return `Excellent maintenance! You're staying consistent with your nutrition goals and building sustainable habits.`;
        } else {
          return `Focus on consistency for better maintenance. Small daily adjustments lead to long-term success.`;
        }

      case 'get_healthy':
      default:
        if (consistencyScore >= 0.8) {
          return `Fantastic consistency! You're building healthy habits that will serve you well long-term.`;
        } else {
          return `Keep building those healthy habits! Consistency is key to lasting wellness improvements.`;
        }
    }
  };

  // Format week range
  const getWeekRange = (): string => {
    const endDate = new Date(weekStartDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const startStr = weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return `${startStr} - ${endStr}`;
  };

  const achievements = getAchievements();

  return (
    <Card elevation={2} style={styles.card}>
      <Text variant="titleSmall" style={styles.cardTitle}>
        Weekly Summary
      </Text>
      
      <Text variant="caption" style={styles.weekRange}>
        {getWeekRange()}
      </Text>

      {weeklyMetrics && (
        <>
          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text variant="headingSmall" style={styles.metricValue}>
                {Math.round(weeklyMetrics.avgCalories)}
              </Text>
              <Text variant="caption" style={styles.metricLabel}>
                Avg Calories
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text variant="headingSmall" style={styles.metricValue}>
                {Math.round(weeklyMetrics.avgProtein)}g
              </Text>
              <Text variant="caption" style={styles.metricLabel}>
                Avg Protein
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text variant="headingSmall" style={styles.metricValue}>
                {weeklyMetrics.totalMeals}
              </Text>
              <Text variant="caption" style={styles.metricLabel}>
                Meals Logged
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text variant="headingSmall" style={[
                styles.metricValue,
                { color: weeklyMetrics.consistencyScore >= 0.8 ? colors.success : colors.warning }
              ]}>
                {Math.round(weeklyMetrics.consistencyScore * 100)}%
              </Text>
              <Text variant="caption" style={styles.metricLabel}>
                Consistency
              </Text>
            </View>
          </View>

          {/* Achievements */}
          {achievements.length > 0 && (
            <View style={styles.achievementsSection}>
              <Text variant="titleSmall" style={styles.achievementsTitle}>
                This Week's Achievements
              </Text>
              <View style={styles.achievementsList}>
                {achievements.map((achievement, index) => (
                  <Text key={index} variant="caption" style={styles.achievement}>
                    {achievement}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Weekly Insight */}
          <View style={styles.insightSection}>
            <Text variant="body" style={styles.insight}>
              {getWeeklyInsights()}
            </Text>
          </View>

          {/* Adherence Bars */}
          <View style={styles.adherenceSection}>
            <Text variant="caption" style={styles.adherenceTitle}>
              Goal Adherence
            </Text>
            
            <View style={styles.adherenceBar}>
              <Text variant="caption" style={styles.adherenceLabel}>
                Calories
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[
                  styles.progressBar,
                  { 
                    width: `${Math.min(weeklyMetrics.calorieAdherence * 100, 100)}%`,
                    backgroundColor: weeklyMetrics.calorieAdherence >= 0.7 ? colors.success : colors.warning
                  }
                ]} />
              </View>
              <Text variant="caption" style={styles.adherencePercent}>
                {Math.round(weeklyMetrics.calorieAdherence * 100)}%
              </Text>
            </View>

            <View style={styles.adherenceBar}>
              <Text variant="caption" style={styles.adherenceLabel}>
                Protein
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[
                  styles.progressBar,
                  { 
                    width: `${Math.min(weeklyMetrics.proteinAdherence * 100, 100)}%`,
                    backgroundColor: weeklyMetrics.proteinAdherence >= 0.8 ? colors.success : colors.warning
                  }
                ]} />
              </View>
              <Text variant="caption" style={styles.adherencePercent}>
                {Math.round(weeklyMetrics.proteinAdherence * 100)}%
              </Text>
            </View>
          </View>
        </>
      )}
    </Card>
  );
};

const createStyles = () =>
  StyleSheet.create({
    card: {
      marginBottom: 16,
    },
    cardTitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    weekRange: {
      textAlign: 'center',
      marginBottom: 16,
      opacity: 0.7,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    metricItem: {
      width: '48%',
      alignItems: 'center',
      marginBottom: 12,
    },
    metricValue: {
      marginBottom: 4,
    },
    metricLabel: {
      opacity: 0.7,
    },
    achievementsSection: {
      marginBottom: 16,
    },
    achievementsTitle: {
      marginBottom: 8,
    },
    achievementsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    achievement: {
      backgroundColor: 'rgba(0,0,0,0.05)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      fontSize: 12,
    },
    insightSection: {
      marginBottom: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.1)',
    },
    insight: {
      textAlign: 'center',
      fontStyle: 'italic',
    },
    adherenceSection: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.1)',
    },
    adherenceTitle: {
      marginBottom: 8,
      fontWeight: '600',
    },
    adherenceBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    adherenceLabel: {
      width: 60,
      fontSize: 12,
    },
    progressBarContainer: {
      flex: 1,
      height: 6,
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderRadius: 3,
      marginHorizontal: 8,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 3,
    },
    adherencePercent: {
      width: 35,
      textAlign: 'right',
      fontSize: 12,
    },
  });
/**
 * Nutrition Progress Card Component
 * Shows nutrition progress with visual rings and goal-specific insights
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useThemeColors, useThemedStyles } from '../../ui';
import { ProgressRing, MultiProgressRing } from './ProgressRing';
import type { Goal } from '../../utils/goalCalculations';

interface NutritionData {
  calories: { current: number; target: number };
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
  fiber: { current: number; target: number };
}

interface NutritionProgressCardProps {
  data: NutritionData;
  primaryGoal: Goal;
  showMultiRing?: boolean;
}

export const NutritionProgressCard: React.FC<NutritionProgressCardProps> = ({
  data,
  primaryGoal,
  showMultiRing = false,
}) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  // Calculate progress percentages
  const calorieProgress = (data.calories.current / data.calories.target) * 100;
  const proteinProgress = (data.protein.current / data.protein.target) * 100;
  const carbsProgress = (data.carbs.current / data.carbs.target) * 100;
  const fatProgress = (data.fat.current / data.fat.target) * 100;
  const fiberProgress = (data.fiber.current / data.fiber.target) * 100;

  // Get status for each metric
  const getStatus = (progress: number, metric: string): 'good' | 'warning' | 'over' | 'under' => {
    if (metric === 'calories') {
      if (progress <= 100) return 'good';
      if (progress <= 110) return 'warning';
      return 'over';
    }
    
    if (progress >= 80) return 'good';
    if (progress >= 60) return 'warning';
    return 'under';
  };

  // Goal-specific ring configurations
  const getRingConfiguration = () => {
    switch (primaryGoal) {
      case 'lose_weight':
        return [
          {
            progress: calorieProgress,
            current: data.calories.current,
            target: data.calories.target,
            label: 'Calories',
            unit: 'kcal',
            status: getStatus(calorieProgress, 'calories'),
            color: colors.primary,
          },
          {
            progress: proteinProgress,
            current: data.protein.current,
            target: data.protein.target,
            label: 'Protein',
            unit: 'g',
            status: getStatus(proteinProgress, 'protein'),
            color: colors.success,
          },
        ];

      case 'gain_muscle':
        return [
          {
            progress: proteinProgress,
            current: data.protein.current,
            target: data.protein.target,
            label: 'Protein',
            unit: 'g',
            status: getStatus(proteinProgress, 'protein'),
            color: colors.success,
          },
          {
            progress: calorieProgress,
            current: data.calories.current,
            target: data.calories.target,
            label: 'Calories',
            unit: 'kcal',
            status: getStatus(calorieProgress, 'calories'),
            color: colors.primary,
          },
        ];

      case 'maintain':
        return [
          {
            progress: calorieProgress,
            current: data.calories.current,
            target: data.calories.target,
            label: 'Calories',
            unit: 'kcal',
            status: getStatus(calorieProgress, 'calories'),
            color: colors.primary,
          },
          {
            progress: proteinProgress,
            current: data.protein.current,
            target: data.protein.target,
            label: 'Protein',
            unit: 'g',
            status: getStatus(proteinProgress, 'protein'),
            color: colors.success,
          },
          {
            progress: fiberProgress,
            current: data.fiber.current,
            target: data.fiber.target,
            label: 'Fiber',
            unit: 'g',
            status: getStatus(fiberProgress, 'fiber'),
            color: colors.info,
          },
        ];

      case 'get_healthy':
      default:
        return [
          {
            progress: calorieProgress,
            current: data.calories.current,
            target: data.calories.target,
            label: 'Calories',
            unit: 'kcal',
            status: getStatus(calorieProgress, 'calories'),
            color: colors.primary,
          },
          {
            progress: proteinProgress,
            current: data.protein.current,
            target: data.protein.target,
            label: 'Protein',
            unit: 'g',
            status: getStatus(proteinProgress, 'protein'),
            color: colors.success,
          },
          {
            progress: fiberProgress,
            current: data.fiber.current,
            target: data.fiber.target,
            label: 'Fiber',
            unit: 'g',
            status: getStatus(fiberProgress, 'fiber'),
            color: colors.info,
          },
          {
            progress: carbsProgress,
            current: data.carbs.current,
            target: data.carbs.target,
            label: 'Carbs',
            unit: 'g',
            status: getStatus(carbsProgress, 'carbs'),
            color: colors.warning,
          },
        ];
    }
  };

  const ringConfig = getRingConfiguration();

  // Get goal-specific title
  const getCardTitle = (): string => {
    switch (primaryGoal) {
      case 'lose_weight':
        return 'Weight Loss Progress';
      case 'gain_muscle':
        return 'Muscle Building Progress';
      case 'maintain':
        return 'Maintenance Progress';
      case 'get_healthy':
      default:
        return 'Nutrition Progress';
    }
  };

  // Get progress summary
  const getProgressSummary = (): string => {
    const onTrackCount = ringConfig.filter(ring => ring.status === 'good').length;
    const totalCount = ringConfig.length;
    
    if (onTrackCount === totalCount) {
      return `Excellent! All ${totalCount} metrics on track 🎯`;
    } else if (onTrackCount >= totalCount * 0.7) {
      return `Good progress! ${onTrackCount}/${totalCount} metrics on track 👍`;
    } else {
      return `Keep going! ${onTrackCount}/${totalCount} metrics on track 💪`;
    }
  };

  if (showMultiRing) {
    return (
      <Card elevation={2} style={styles.card}>
        <Text variant="titleSmall" style={styles.cardTitle}>
          {getCardTitle()}
        </Text>
        
        <View style={styles.multiRingContainer}>
          <MultiProgressRing rings={ringConfig} size={160} />
          
          <View style={styles.ringLegend}>
            {ringConfig.slice(1).map((ring, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: ring.color }]} />
                <Text variant="caption" style={styles.legendText}>
                  {ring.label}: {Math.round(ring.current || 0)}/{Math.round(ring.target || 0)}{ring.unit}
                </Text>
              </View>
            ))}
          </View>
        </View>
        
        <Text variant="caption" style={styles.summary}>
          {getProgressSummary()}
        </Text>
      </Card>
    );
  }

  return (
    <Card elevation={2} style={styles.card}>
      <Text variant="titleSmall" style={styles.cardTitle}>
        {getCardTitle()}
      </Text>
      
      <View style={styles.ringsContainer}>
        {ringConfig.slice(0, 2).map((ring, index) => (
          <View key={index} style={styles.ringWrapper}>
            <ProgressRing
              size={100}
              progress={ring.progress}
              current={ring.current}
              target={ring.target}
              label={ring.label}
              unit={ring.unit}
              status={ring.status}
              color={ring.color}
              animated={true}
            />
          </View>
        ))}
      </View>
      
      {/* Secondary metrics */}
      {ringConfig.length > 2 && (
        <View style={styles.secondaryMetrics}>
          {ringConfig.slice(2).map((ring, index) => (
            <View key={index} style={styles.secondaryMetric}>
              <Text variant="caption" color={colors.textSecondary}>
                {ring.label}
              </Text>
              <Text variant="titleSmall" style={[
                styles.secondaryValue,
                { color: ring.status === 'good' ? colors.success : colors.warning }
              ]}>
                {Math.round(ring.current || 0)}{ring.unit}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                / {Math.round(ring.target || 0)}{ring.unit}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      <Text variant="caption" style={styles.summary}>
        {getProgressSummary()}
      </Text>
    </Card>
  );
};

const createStyles = () =>
  StyleSheet.create({
    card: {
      marginBottom: 16,
    },
    cardTitle: {
      marginBottom: 16,
      textAlign: 'center',
    },
    ringsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16,
    },
    ringWrapper: {
      alignItems: 'center',
    },
    multiRingContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    ringLegend: {
      marginTop: 12,
      alignItems: 'flex-start',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    legendText: {
      fontSize: 12,
    },
    secondaryMetrics: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.1)',
    },
    secondaryMetric: {
      alignItems: 'center',
    },
    secondaryValue: {
      marginVertical: 2,
    },
    summary: {
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });
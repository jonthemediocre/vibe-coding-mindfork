/**
 * Weight Progress Chart Component
 * Shows weight progress over time with trend analysis and goal tracking
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Card, Text, useThemeColors, useThemedStyles } from '../../ui';
import type { Goal } from '../../utils/goalCalculations';

const screenWidth = Dimensions.get('window').width;

interface WeightEntry {
  date: string;
  weight: number;
}

interface WeightProgressChartProps {
  weightData: WeightEntry[];
  currentWeight?: number;
  targetWeight?: number;
  startWeight?: number;
  primaryGoal: Goal;
  weightUnit?: 'kg' | 'lbs';
}

export const WeightProgressChart: React.FC<WeightProgressChartProps> = ({
  weightData,
  currentWeight,
  targetWeight,
  startWeight,
  primaryGoal,
  weightUnit = 'kg',
}) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  // Process weight data for chart
  const chartData = useMemo(() => {
    if (!weightData || weightData.length === 0) {
      return null;
    }

    // Sort by date and take last 30 entries
    const sortedData = weightData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30);

    const weights = sortedData.map(entry => entry.weight);
    const labels = sortedData.map(entry => {
      const date = new Date(entry.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    return {
      labels,
      datasets: [
        {
          data: weights,
          color: (opacity = 1) => colors.primary,
          strokeWidth: 3,
        },
      ],
    };
  }, [weightData, colors.primary]);

  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    if (!currentWeight || !startWeight) {
      return null;
    }

    const totalChange = currentWeight - startWeight;
    const targetChange = targetWeight ? targetWeight - startWeight : 0;
    
    let progressPercentage = 0;
    if (targetChange !== 0) {
      progressPercentage = (totalChange / targetChange) * 100;
    }

    // Calculate trend (last 7 days vs previous 7 days)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (weightData.length >= 14) {
      const recent = weightData.slice(-7);
      const previous = weightData.slice(-14, -7);
      
      const recentAvg = recent.reduce((sum, entry) => sum + entry.weight, 0) / recent.length;
      const previousAvg = previous.reduce((sum, entry) => sum + entry.weight, 0) / previous.length;
      
      const difference = recentAvg - previousAvg;
      if (Math.abs(difference) > 0.1) {
        trend = difference > 0 ? 'up' : 'down';
      }
    }

    // Estimate time to goal (based on recent trend)
    let estimatedWeeksToGoal: number | null = null;
    if (targetWeight && weightData.length >= 4) {
      const recentEntries = weightData.slice(-4);
      const weightChange = recentEntries[recentEntries.length - 1].weight - recentEntries[0].weight;
      const timeSpan = (new Date(recentEntries[recentEntries.length - 1].date).getTime() - 
                       new Date(recentEntries[0].date).getTime()) / (1000 * 60 * 60 * 24 * 7);
      
      if (timeSpan > 0 && weightChange !== 0) {
        const weeklyRate = weightChange / timeSpan;
        const remainingChange = targetWeight - currentWeight;
        
        if ((weeklyRate > 0 && remainingChange > 0) || (weeklyRate < 0 && remainingChange < 0)) {
          estimatedWeeksToGoal = Math.abs(remainingChange / weeklyRate);
        }
      }
    }

    return {
      totalChange,
      progressPercentage,
      trend,
      estimatedWeeksToGoal,
    };
  }, [currentWeight, startWeight, targetWeight, weightData]);

  // Get goal-specific messages
  const getProgressMessage = (): string => {
    if (!progressMetrics) {
      return "Start tracking your weight to see progress insights!";
    }

    const { totalChange, trend, progressPercentage } = progressMetrics;
    const absChange = Math.abs(totalChange);

    switch (primaryGoal) {
      case 'lose_weight':
        if (totalChange <= -0.5) {
          return `Great progress! You've lost ${absChange.toFixed(1)}${weightUnit}. ${
            trend === 'down' ? 'Keep up the momentum!' : 
            trend === 'stable' ? 'Staying consistent.' : 
            'Recent uptick is normal - stay focused.'
          }`;
        } else if (totalChange <= 0) {
          return `You're maintaining well. Small fluctuations are normal - focus on the trend.`;
        } else {
          return `Weight is up ${absChange.toFixed(1)}${weightUnit}. This could be water retention or muscle gain.`;
        }

      case 'gain_muscle':
        if (totalChange >= 0.5) {
          return `Excellent! You've gained ${absChange.toFixed(1)}${weightUnit}. ${
            trend === 'up' ? 'Building momentum!' : 
            'Keep focusing on protein and strength training.'
          }`;
        } else if (totalChange >= 0) {
          return `Slow and steady gains. Make sure you're eating enough to support muscle growth.`;
        } else {
          return `Weight is down ${absChange.toFixed(1)}${weightUnit}. Consider increasing calories for muscle building.`;
        }

      case 'maintain':
        if (Math.abs(totalChange) <= 1) {
          return `Perfect maintenance! Weight stable within ${absChange.toFixed(1)}${weightUnit}.`;
        } else {
          return `Weight has ${totalChange > 0 ? 'increased' : 'decreased'} by ${absChange.toFixed(1)}${weightUnit}. Small adjustments may help.`;
        }

      case 'get_healthy':
      default:
        return `Your weight has ${
          totalChange > 0 ? 'increased' : totalChange < 0 ? 'decreased' : 'remained stable'
        } by ${absChange.toFixed(1)}${weightUnit}. Focus on consistent healthy habits.`;
    }
  };

  const getTimeToGoalMessage = (): string | null => {
    if (!progressMetrics?.estimatedWeeksToGoal || !targetWeight) {
      return null;
    }

    const weeks = Math.round(progressMetrics.estimatedWeeksToGoal);
    if (weeks <= 0 || weeks > 104) { // Don't show if more than 2 years
      return null;
    }

    if (weeks <= 4) {
      return `At current pace, you could reach your goal in ~${weeks} weeks! 🎯`;
    } else if (weeks <= 12) {
      return `Estimated ${weeks} weeks to reach your goal. Stay consistent! 💪`;
    } else {
      return `Long-term goal: ~${Math.round(weeks / 4)} months at current pace. 🌟`;
    }
  };

  if (!chartData) {
    return (
      <Card elevation={2} style={styles.card}>
        <Text variant="titleSmall" style={styles.cardTitle}>
          Weight Progress
        </Text>
        <View style={styles.noDataContainer}>
          <Text variant="body" style={styles.noDataText}>
            Start logging your weight to see progress charts and insights!
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card elevation={2} style={styles.card}>
      <Text variant="titleSmall" style={styles.cardTitle}>
        Weight Progress
      </Text>

      {/* Current Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text variant="headingSmall" style={styles.statValue}>
            {currentWeight?.toFixed(1) || '--'}
          </Text>
          <Text variant="caption" style={styles.statLabel}>
            Current ({weightUnit})
          </Text>
        </View>

        {targetWeight && (
          <View style={styles.statItem}>
            <Text variant="headingSmall" style={styles.statValue}>
              {targetWeight.toFixed(1)}
            </Text>
            <Text variant="caption" style={styles.statLabel}>
              Target ({weightUnit})
            </Text>
          </View>
        )}

        {progressMetrics && (
          <View style={styles.statItem}>
            <Text variant="headingSmall" style={[
              styles.statValue,
              { 
                color: progressMetrics.totalChange > 0 ? 
                  (primaryGoal === 'gain_muscle' ? colors.success : colors.warning) :
                  (primaryGoal === 'lose_weight' ? colors.success : colors.warning)
              }
            ]}>
              {progressMetrics.totalChange > 0 ? '+' : ''}{progressMetrics.totalChange.toFixed(1)}
            </Text>
            <Text variant="caption" style={styles.statLabel}>
              Change ({weightUnit})
            </Text>
          </View>
        )}
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={screenWidth - 80}
          height={200}
          chartConfig={{
            backgroundColor: colors.background,
            backgroundGradientFrom: colors.background,
            backgroundGradientTo: colors.background,
            decimalPlaces: 1,
            color: (opacity = 1) => colors.primary,
            labelColor: (opacity = 1) => colors.textSecondary,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: colors.primary,
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Progress Message */}
      <Text variant="body" style={styles.progressMessage}>
        {getProgressMessage()}
      </Text>

      {/* Time to Goal */}
      {getTimeToGoalMessage() && (
        <Text variant="caption" style={styles.timeToGoal}>
          {getTimeToGoalMessage()}
        </Text>
      )}

      {/* Trend Indicator */}
      {progressMetrics && (
        <View style={styles.trendContainer}>
          <Text variant="caption" style={styles.trendLabel}>
            Recent trend: 
          </Text>
          <Text variant="caption" style={[
            styles.trendValue,
            { 
              color: progressMetrics.trend === 'up' ? colors.warning : 
                     progressMetrics.trend === 'down' ? colors.success : 
                     colors.textSecondary 
            }
          ]}>
            {progressMetrics.trend === 'up' ? '↗️ Increasing' : 
             progressMetrics.trend === 'down' ? '↘️ Decreasing' : 
             '➡️ Stable'}
          </Text>
        </View>
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
      marginBottom: 16,
      textAlign: 'center',
    },
    noDataContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    noDataText: {
      textAlign: 'center',
      opacity: 0.7,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 20,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      marginBottom: 4,
    },
    statLabel: {
      opacity: 0.7,
    },
    chartContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    chart: {
      marginVertical: 8,
      borderRadius: 16,
    },
    progressMessage: {
      textAlign: 'center',
      marginBottom: 8,
      paddingHorizontal: 8,
    },
    timeToGoal: {
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: 8,
    },
    trendContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    trendLabel: {
      marginRight: 4,
    },
    trendValue: {
      fontWeight: '600',
    },
  });
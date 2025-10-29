/**
 * Analytics Screen
 * Comprehensive nutrition analytics dashboard with charts, trends, and insights
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LineChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { Screen, Card, Text, useThemeColors, useThemedStyles } from '../../ui';
import { useNutritionTrends } from '../../hooks/useNutritionTrends';
import type { DailyNutritionData } from '../../services/AnalyticsService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40; // 20px padding on each side

export const AnalyticsScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const { data, isLoading, error, refresh, setPeriod, currentPeriod } = useNutritionTrends();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handlePeriodChange = (period: 'week' | 'month') => {
    setPeriod(period);
  };

  if (isLoading && !data) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="body" style={styles.loadingText}>
            Loading analytics...
          </Text>
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text variant="titleLarge" color={colors.error}>
            Error loading analytics
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.errorMessage}>
            {error}
          </Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text variant="body" color={colors.primary}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headingLarge">Analytics</Text>
          <Text variant="body" color={colors.textSecondary}>
            Your nutrition insights
          </Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              currentPeriod === 'week' && styles.periodButtonActive,
            ]}
            onPress={() => handlePeriodChange('week')}
          >
            <Text
              variant="body"
              color={currentPeriod === 'week' ? colors.onPrimary : colors.text}
            >
              7 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              currentPeriod === 'month' && styles.periodButtonActive,
            ]}
            onPress={() => handlePeriodChange('month')}
          >
            <Text
              variant="body"
              color={currentPeriod === 'month' ? colors.onPrimary : colors.text}
            >
              30 Days
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <Card elevation={1} style={styles.statCard}>
            <Text variant="caption" color={colors.textSecondary}>
              Streak
            </Text>
            <View style={styles.statRow}>
              <Text variant="headingLarge" style={styles.streakText}>
                {data?.streak || 0}
              </Text>
              <Text variant="titleSmall" style={styles.fireEmoji}>
                🔥
              </Text>
            </View>
            <Text variant="caption" color={colors.textSecondary}>
              consecutive days
            </Text>
          </Card>

          <Card elevation={1} style={styles.statCard}>
            <Text variant="caption" color={colors.textSecondary}>
              Adherence
            </Text>
            <Text variant="headingLarge" style={styles.adherenceText}>
              {Math.round(data?.goalAdherence || 0)}%
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              goal tracking
            </Text>
          </Card>
        </View>

        {/* Nutrition Summary Cards */}
        <Card elevation={2}>
          <Text variant="titleSmall" style={styles.cardTitle}>
            Nutrition Summary
          </Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text variant="caption" color={colors.textSecondary}>
                Calories
              </Text>
              <Text variant="titleLarge">{Math.round(data?.avgCaloriesPerDay || 0)}</Text>
              <Text variant="caption" color={colors.textSecondary}>
                avg/day
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text variant="caption" color={colors.textSecondary}>
                Protein
              </Text>
              <Text variant="titleLarge" style={{ color: colors.success }}>
                {Math.round(data?.totalProtein || 0)}g
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                total
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text variant="caption" color={colors.textSecondary}>
                Carbs
              </Text>
              <Text variant="titleLarge" style={{ color: colors.warning }}>
                {Math.round(data?.totalCarbs || 0)}g
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                total
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text variant="caption" color={colors.textSecondary}>
                Fat
              </Text>
              <Text variant="titleLarge" style={{ color: colors.info }}>
                {Math.round(data?.totalFat || 0)}g
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                total
              </Text>
            </View>
          </View>
        </Card>

        {/* Calorie Trends Chart */}
        {data && data.dailyData.length > 0 && (
          <Card elevation={2}>
            <Text variant="titleSmall" style={styles.cardTitle}>
              Calorie Trends
            </Text>
            <LineChart
              data={getCalorieTrendData(data.dailyData, colors)}
              width={CHART_WIDTH - 32}
              height={220}
              chartConfig={getChartConfig(colors)}
              bezier
              style={styles.chart}
              withDots={true}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withShadow={false}
            />
          </Card>
        )}

        {/* Macro Distribution Pie Chart */}
        {data && data.macroDistribution && (
          <Card elevation={2}>
            <Text variant="titleSmall" style={styles.cardTitle}>
              Macro Distribution
            </Text>
            <PieChart
              data={getMacroDistributionData(data.macroDistribution, colors)}
              width={CHART_WIDTH - 32}
              height={220}
              chartConfig={getChartConfig(colors)}
              accessor="percentage"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 0]}
              absolute={false}
              hasLegend={true}
            />
            <View style={styles.macroLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text variant="caption" color={colors.textSecondary}>
                  Protein: {Math.round(data.macroDistribution.protein)}%
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                <Text variant="caption" color={colors.textSecondary}>
                  Carbs: {Math.round(data.macroDistribution.carbs)}%
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
                <Text variant="caption" color={colors.textSecondary}>
                  Fat: {Math.round(data.macroDistribution.fat)}%
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Daily Progress Chart */}
        {data && data.dailyData.length > 0 && (
          <Card elevation={2}>
            <Text variant="titleSmall" style={styles.cardTitle}>
              Goal Progress
            </Text>
            <ProgressChart
              data={getProgressData(data.dailyData, colors)}
              width={CHART_WIDTH - 32}
              height={220}
              strokeWidth={16}
              radius={32}
              chartConfig={getChartConfig(colors)}
              hideLegend={false}
            />
          </Card>
        )}

        {/* Insights Card */}
        <Card elevation={1}>
          <Text variant="titleSmall" style={styles.cardTitle}>
            💡 Insights
          </Text>
          <View style={styles.insightsContainer}>
            {generateInsights(data).map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <Text variant="body" style={styles.insightIcon}>
                  {insight.icon}
                </Text>
                <Text variant="body" color={colors.textSecondary} style={styles.insightText}>
                  {insight.text}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Empty State */}
        {(!data || data.dailyData.length === 0) && (
          <Card elevation={1}>
            <View style={styles.emptyState}>
              <Text variant="headingSmall" style={styles.emptyTitle}>
                No data yet
              </Text>
              <Text variant="body" color={colors.textSecondary} style={styles.emptyMessage}>
                Start logging your meals to see analytics and trends
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
};

// Helper functions for chart data

function getCalorieTrendData(dailyData: DailyNutritionData[], colors: any) {
  const last7Days = dailyData.slice(-7);
  return {
    labels: last7Days.map(d => new Date(d.date).getDate().toString()),
    datasets: [
      {
        data: last7Days.map(d => d.calories),
        color: (opacity = 1) => colors.primary,
        strokeWidth: 2,
      },
    ],
    legend: ['Calories'],
  };
}

function getMacroDistributionData(macroDistribution: any, colors: any) {
  return [
    {
      name: 'Protein',
      percentage: macroDistribution.protein,
      color: colors.success,
      legendFontColor: colors.text,
      legendFontSize: 12,
    },
    {
      name: 'Carbs',
      percentage: macroDistribution.carbs,
      color: colors.warning,
      legendFontColor: colors.text,
      legendFontSize: 12,
    },
    {
      name: 'Fat',
      percentage: macroDistribution.fat,
      color: colors.info,
      legendFontColor: colors.text,
      legendFontSize: 12,
    },
  ];
}

function getProgressData(dailyData: DailyNutritionData[], colors: any) {
  const avgCalories = dailyData.reduce((sum, d) => sum + d.calories, 0) / dailyData.length;
  const avgProtein = dailyData.reduce((sum, d) => sum + d.protein, 0) / dailyData.length;
  const avgCarbs = dailyData.reduce((sum, d) => sum + d.carbs, 0) / dailyData.length;

  // Normalize to goals (example: 2000 cal, 150g protein, 250g carbs)
  return {
    labels: ['Calories', 'Protein', 'Carbs'],
    data: [
      Math.min(avgCalories / 2000, 1),
      Math.min(avgProtein / 150, 1),
      Math.min(avgCarbs / 250, 1),
    ],
    colors: [colors.primary, colors.success, colors.warning],
  };
}

function getChartConfig(colors: any) {
  return {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 107, 157, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1,
    },
  };
}

function generateInsights(data: any): Array<{ icon: string; text: string }> {
  if (!data || data.dailyData.length === 0) {
    return [
      {
        icon: '📊',
        text: 'Start tracking meals to unlock personalized insights',
      },
    ];
  }

  const insights = [];

  // Streak insight
  if (data.streak >= 7) {
    insights.push({
      icon: '🔥',
      text: `Amazing! You've tracked ${data.streak} days in a row!`,
    });
  } else if (data.streak >= 3) {
    insights.push({
      icon: '💪',
      text: `Keep it up! ${data.streak} day streak going strong!`,
    });
  }

  // Calorie insight
  const avgCal = data.avgCaloriesPerDay;
  if (avgCal < 1500) {
    insights.push({
      icon: '⚠️',
      text: 'Your calorie intake seems low. Consider eating more nutrient-dense foods.',
    });
  } else if (avgCal > 2500) {
    insights.push({
      icon: '📈',
      text: 'Your calorie intake is high. Make sure it aligns with your goals.',
    });
  }

  // Macro balance insight
  const { protein, carbs, fat } = data.macroDistribution;
  if (protein < 20) {
    insights.push({
      icon: '🥩',
      text: 'Try increasing protein intake for better satiety and muscle support.',
    });
  }

  // Adherence insight
  if (data.goalAdherence >= 80) {
    insights.push({
      icon: '✨',
      text: 'Excellent tracking consistency! Keep up the great work!',
    });
  } else if (data.goalAdherence < 50) {
    insights.push({
      icon: '📝',
      text: 'Try logging at least 2 meals per day for better insights.',
    });
  }

  return insights.length > 0
    ? insights
    : [{ icon: '👍', text: "You're doing great! Keep tracking your nutrition." }];
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    errorMessage: {
      marginTop: 8,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
    },
    header: {
      marginBottom: 16,
    },
    periodSelector: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    periodButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      padding: 16,
      alignItems: 'center',
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginVertical: 8,
    },
    streakText: {
      color: theme.colors.primary,
    },
    fireEmoji: {
      fontSize: 24,
    },
    adherenceText: {
      color: theme.colors.success,
      marginVertical: 8,
    },
    cardTitle: {
      marginBottom: 16,
    },
    nutritionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    nutritionItem: {
      flex: 1,
      minWidth: '45%',
      alignItems: 'center',
      paddingVertical: 12,
    },
    chart: {
      marginVertical: 8,
      borderRadius: theme.borderRadius.md,
    },
    macroLegend: {
      marginTop: 16,
      gap: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    insightsContainer: {
      gap: 12,
    },
    insightItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    insightIcon: {
      fontSize: 20,
    },
    insightText: {
      flex: 1,
      lineHeight: 20,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyTitle: {
      marginBottom: 8,
    },
    emptyMessage: {
      textAlign: 'center',
    },
  });

export default AnalyticsScreen;

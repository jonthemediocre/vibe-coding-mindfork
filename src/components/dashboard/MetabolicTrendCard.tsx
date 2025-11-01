/**
 * METABOLIC TREND CARD
 *
 * Displays user's weight trend with metabolic adaptation notifications.
 * Shows both raw daily weight (noisy) and trend weight (smooth 7-day EMA).
 *
 * Features:
 * - Line chart with raw weight (gray) and trend weight (blue)
 * - Coach explanation when adaptation is detected
 * - Visual indicator of metabolic adaptation type
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { MetabolicAdaptationService } from '../../services/MetabolicAdaptationService';
import type { AdaptationResult } from '../../services/MetabolicAdaptationService';

const screenWidth = Dimensions.get('window').width;

interface MetabolicTrendCardProps {
  userId: string;
  onAdaptationDetected?: (adaptation: AdaptationResult) => void;
}

export const MetabolicTrendCard: React.FC<MetabolicTrendCardProps> = ({
  userId,
  onAdaptationDetected,
}) => {
  const [loading, setLoading] = useState(true);
  const [recentAdaptation, setRecentAdaptation] = useState<any>(null);
  const [trendData, setTrendData] = useState<{
    labels: string[];
    rawWeights: number[];
    trendWeights: number[];
  } | null>(null);

  useEffect(() => {
    loadMetabolicData();
  }, [userId]);

  const loadMetabolicData = async () => {
    try {
      setLoading(true);

      // Get recent adaptations
      const adaptations = await MetabolicAdaptationService.getRecentAdaptations(userId, 1);
      if (adaptations.length > 0) {
        setRecentAdaptation(adaptations[0]);
      }

      // Get metabolic summary
      const summary = await MetabolicAdaptationService.getMetabolicSummary(userId);

      // For now, we'll show a placeholder chart
      // In production, you'd fetch the actual weight data from metabolic_tracking
      setTrendData({
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        rawWeights: [180, 179, 178, 177],  // Placeholder
        trendWeights: [180, 179.2, 178.5, 177.3],  // Placeholder
      });

    } catch (error) {
      console.error('Failed to load metabolic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAdaptation = async () => {
    try {
      const result = await MetabolicAdaptationService.detectAdaptation(userId);
      if (result?.adapted) {
        setRecentAdaptation({
          adaptation_type: result.type,
          adaptation_magnitude: result.magnitude,
          old_daily_calories: result.oldCalories,
          new_daily_calories: result.newCalories,
          coach_message: result.coachExplanation,
          detected_at: new Date().toISOString(),
        });
        onAdaptationDetected?.(result);
      }
    } catch (error) {
      console.error('Failed to check adaptation:', error);
    }
  };

  if (loading) {
    return (
      <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const getAdaptationIcon = (type: string) => {
    switch (type) {
      case 'deficit_stall':
        return 'trending-down';
      case 'surplus_slow':
        return 'trending-up';
      default:
        return 'analytics';
    }
  };

  const getAdaptationColor = (type: string) => {
    switch (type) {
      case 'deficit_stall':
        return 'text-orange-600 dark:text-orange-400';
      case 'surplus_slow':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getAdaptationTitle = (type: string) => {
    switch (type) {
      case 'deficit_stall':
        return 'Metabolic Adaptation Detected';
      case 'surplus_slow':
        return 'Metabolic Increase Detected';
      default:
        return 'Metabolic Update';
    }
  };

  return (
    <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow-sm">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          Your Weight Trend
        </Text>
        <Pressable
          onPress={handleCheckAdaptation}
          className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full"
        >
          <Text className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Check Adaptation
          </Text>
        </Pressable>
      </View>

      {/* Chart */}
      {trendData && (
        <View className="mb-4">
          <LineChart
            data={{
              labels: trendData.labels,
              datasets: [
                {
                  data: trendData.rawWeights,
                  color: (opacity = 1) => `rgba(150, 150, 150, ${opacity * 0.3})`,
                  strokeWidth: 2,
                },
                {
                  data: trendData.trendWeights,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  strokeWidth: 3,
                },
              ],
              legend: ['Daily Weight', 'Trend (7-day EMA)'],
            }}
            width={screenWidth - 64}
            height={200}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#f9fafb',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.7})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
              },
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />

          {/* Legend */}
          <View className="flex-row justify-center gap-4 mt-2">
            <View className="flex-row items-center">
              <View className="w-4 h-1 bg-gray-300 mr-2" />
              <Text className="text-xs text-gray-600 dark:text-gray-400">Daily Weight</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-1 bg-blue-500 mr-2" />
              <Text className="text-xs text-gray-600 dark:text-gray-400">Trend</Text>
            </View>
          </View>
        </View>
      )}

      {/* Adaptation Notification */}
      {recentAdaptation && (
        <View className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <View className="flex-row items-start mb-2">
            <Ionicons
              name={getAdaptationIcon(recentAdaptation.adaptation_type) as any}
              size={24}
              className={getAdaptationColor(recentAdaptation.adaptation_type)}
            />
            <View className="flex-1 ml-3">
              <Text className={`text-sm font-semibold mb-1 ${getAdaptationColor(recentAdaptation.adaptation_type)}`}>
                {getAdaptationTitle(recentAdaptation.adaptation_type)}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {new Date(recentAdaptation.detected_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Calorie Change */}
          <View className="flex-row items-center justify-between mb-3 p-2 bg-white dark:bg-gray-800 rounded">
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              Calories Adjusted:
            </Text>
            <Text className="text-sm font-bold text-gray-900 dark:text-white">
              {recentAdaptation.old_daily_calories} → {recentAdaptation.new_daily_calories}
            </Text>
          </View>

          {/* Coach Message */}
          <Text className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {recentAdaptation.coach_message}
          </Text>

          {/* Acknowledge Button */}
          {!recentAdaptation.user_acknowledged && (
            <Pressable
              onPress={() => {
                // Mark as acknowledged in database
                setRecentAdaptation({ ...recentAdaptation, user_acknowledged: true });
              }}
              className="mt-3 py-2 bg-blue-600 rounded-lg"
            >
              <Text className="text-center text-white font-medium text-sm">
                Got it, thanks!
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Info Note */}
      <View className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <Text className="text-xs text-gray-600 dark:text-gray-400 text-center">
          💡 Trend weight smooths daily fluctuations (water, food, etc.) to show your true progress
        </Text>
      </View>
    </View>
  );
};

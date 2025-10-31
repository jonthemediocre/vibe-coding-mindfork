import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { DietColor } from "@/types/supabase";
import { FoodClassificationService } from "@/services/FoodClassificationService";

interface ColorCodedFoodCardProps {
  name: string;
  serving: string;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  dietColor?: DietColor | null;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack" | null;
  onPress?: () => void;
  showColorLabel?: boolean;
}

/**
 * ColorCodedFoodCard - Display food entries with color-coded visual indicators
 *
 * Green = Great choice (vegetables, fruits, lean proteins)
 * Yellow = Moderate (track portions)
 * Red = Limit (occasional treats)
 */
export function ColorCodedFoodCard({
  name,
  serving,
  calories,
  protein,
  carbs,
  fat,
  dietColor = "neutral",
  mealType,
  onPress,
  showColorLabel = true,
}: ColorCodedFoodCardProps) {
  const color = dietColor || "neutral";
  const colors = FoodClassificationService.COLORS[color];
  const emoji = FoodClassificationService.getColorEmoji(color);
  const label = FoodClassificationService.getColorLabel(color);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-xl bg-white"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <View className="p-4">
        {/* Header with meal type and color indicator */}
        <View className="mb-2 flex-row items-center justify-between">
          {mealType && (
            <View className="rounded-full bg-gray-100 px-3 py-1">
              <Text className="text-xs font-medium capitalize text-gray-600">
                {mealType}
              </Text>
            </View>
          )}
          {showColorLabel && (
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: colors.light }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: colors.text }}
              >
                {emoji} {label}
              </Text>
            </View>
          )}
        </View>

        {/* Food name and serving */}
        <View className="mb-3">
          <Text className="text-lg font-bold text-gray-900">{name}</Text>
          <Text className="text-sm text-gray-500">{serving}</Text>
        </View>

        {/* Nutrition summary */}
        <View className="flex-row items-center justify-between border-t border-gray-100 pt-3">
          <View className="flex-row items-center space-x-4">
            {/* Calories */}
            <View className="flex-row items-center">
              <Ionicons name="flame" size={16} color="#F59E0B" />
              <Text className="ml-1 text-sm font-semibold text-gray-700">
                {calories}
              </Text>
              <Text className="ml-0.5 text-xs text-gray-400">cal</Text>
            </View>

            {/* Protein */}
            {protein != null && (
              <View className="flex-row items-center">
                <Ionicons name="fitness" size={16} color="#EF4444" />
                <Text className="ml-1 text-sm font-semibold text-gray-700">
                  {Math.round(protein)}
                </Text>
                <Text className="ml-0.5 text-xs text-gray-400">P</Text>
              </View>
            )}

            {/* Carbs */}
            {carbs != null && (
              <View className="flex-row items-center">
                <Ionicons name="leaf" size={16} color="#FBBF24" />
                <Text className="ml-1 text-sm font-semibold text-gray-700">
                  {Math.round(carbs)}
                </Text>
                <Text className="ml-0.5 text-xs text-gray-400">C</Text>
              </View>
            )}

            {/* Fat */}
            {fat != null && (
              <View className="flex-row items-center">
                <Ionicons name="water" size={16} color="#14B8A6" />
                <Text className="ml-1 text-sm font-semibold text-gray-700">
                  {Math.round(fat)}
                </Text>
                <Text className="ml-0.5 text-xs text-gray-400">F</Text>
              </View>
            )}
          </View>

          {onPress && (
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          )}
        </View>
      </View>

      {/* Color indicator bar at bottom */}
      <View
        className="h-1"
        style={{ backgroundColor: colors.primary }}
      />
    </Pressable>
  );
}

/**
 * ColorDistributionBar - Visual summary of daily color balance
 */
interface ColorDistributionBarProps {
  distribution: {
    green: { count: number; calories: number };
    yellow: { count: number; calories: number };
    red: { count: number; calories: number };
    neutral: { count: number; calories: number };
  };
}

export function ColorDistributionBar({ distribution }: ColorDistributionBarProps) {
  const total =
    distribution.green.count +
    distribution.yellow.count +
    distribution.red.count +
    distribution.neutral.count;

  if (total === 0) {
    return (
      <View className="rounded-xl bg-gray-50 p-4">
        <Text className="text-center text-sm text-gray-500">
          Log meals to see your color balance
        </Text>
      </View>
    );
  }

  const greenPercent = (distribution.green.count / total) * 100;
  const yellowPercent = (distribution.yellow.count / total) * 100;
  const redPercent = (distribution.red.count / total) * 100;
  const neutralPercent = (distribution.neutral.count / total) * 100;

  const score = FoodClassificationService.calculateColorScore(distribution);

  return (
    <View className="rounded-xl bg-white p-4 shadow-sm">
      <Text className="mb-3 text-sm font-semibold text-gray-700">
        Today{"'"}s Balance
      </Text>

      {/* Color bars */}
      <View className="mb-3 h-4 flex-row overflow-hidden rounded-full">
        {greenPercent > 0 && (
          <View
            style={{
              width: `${greenPercent}%`,
              backgroundColor: FoodClassificationService.COLORS.green.primary,
            }}
          />
        )}
        {yellowPercent > 0 && (
          <View
            style={{
              width: `${yellowPercent}%`,
              backgroundColor: FoodClassificationService.COLORS.yellow.primary,
            }}
          />
        )}
        {redPercent > 0 && (
          <View
            style={{
              width: `${redPercent}%`,
              backgroundColor: FoodClassificationService.COLORS.red.primary,
            }}
          />
        )}
        {neutralPercent > 0 && (
          <View
            style={{
              width: `${neutralPercent}%`,
              backgroundColor: FoodClassificationService.COLORS.neutral.primary,
            }}
          />
        )}
      </View>

      {/* Legend */}
      <View className="flex-row justify-between">
        <View className="flex-row items-center">
          <View
            className="mr-2 h-3 w-3 rounded-full"
            style={{
              backgroundColor: FoodClassificationService.COLORS.green.primary,
            }}
          />
          <Text className="text-xs text-gray-600">
            Green: {distribution.green.count}
          </Text>
        </View>

        <View className="flex-row items-center">
          <View
            className="mr-2 h-3 w-3 rounded-full"
            style={{
              backgroundColor: FoodClassificationService.COLORS.yellow.primary,
            }}
          />
          <Text className="text-xs text-gray-600">
            Yellow: {distribution.yellow.count}
          </Text>
        </View>

        <View className="flex-row items-center">
          <View
            className="mr-2 h-3 w-3 rounded-full"
            style={{
              backgroundColor: FoodClassificationService.COLORS.red.primary,
            }}
          />
          <Text className="text-xs text-gray-600">
            Red: {distribution.red.count}
          </Text>
        </View>
      </View>

      {/* Score */}
      <View className="mt-3 items-center border-t border-gray-100 pt-3">
        <Text className="text-2xl font-bold" style={{ color: score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444" }}>
          {Math.round(score)}
        </Text>
        <Text className="text-xs text-gray-500">Balance Score</Text>
      </View>
    </View>
  );
}

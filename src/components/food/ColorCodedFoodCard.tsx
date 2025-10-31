import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
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
      style={[
        styles.card,
        {
          borderLeftWidth: 4,
          borderLeftColor: colors.primary,
        },
      ]}
    >
      <View style={styles.cardContent}>
        {/* Header with meal type and color indicator */}
        <View style={styles.header}>
          {mealType && (
            <View style={styles.mealTypeBadge}>
              <Text style={styles.mealTypeText}>{mealType}</Text>
            </View>
          )}
          {showColorLabel && (
            <View style={[styles.colorLabel, { backgroundColor: colors.light }]}>
              <Text style={[styles.colorLabelText, { color: colors.text }]}>
                {emoji} {label}
              </Text>
            </View>
          )}
        </View>

        {/* Food name and serving */}
        <View style={styles.nameContainer}>
          <Text style={styles.foodName}>{name}</Text>
          <Text style={styles.serving}>{serving}</Text>
        </View>

        {/* Nutrition summary */}
        <View style={styles.nutritionContainer}>
          <View style={styles.nutritionRow}>
            {/* Calories */}
            <View style={styles.nutritionItem}>
              <Ionicons name="flame" size={16} color="#F59E0B" />
              <Text style={styles.nutritionValue}>{calories}</Text>
              <Text style={styles.nutritionUnit}>cal</Text>
            </View>

            {/* Protein */}
            {protein != null && (
              <View style={styles.nutritionItem}>
                <Ionicons name="fitness" size={16} color="#EF4444" />
                <Text style={styles.nutritionValue}>{Math.round(protein)}</Text>
                <Text style={styles.nutritionUnit}>P</Text>
              </View>
            )}

            {/* Carbs */}
            {carbs != null && (
              <View style={styles.nutritionItem}>
                <Ionicons name="leaf" size={16} color="#FBBF24" />
                <Text style={styles.nutritionValue}>{Math.round(carbs)}</Text>
                <Text style={styles.nutritionUnit}>C</Text>
              </View>
            )}

            {/* Fat */}
            {fat != null && (
              <View style={styles.nutritionItem}>
                <Ionicons name="water" size={16} color="#14B8A6" />
                <Text style={styles.nutritionValue}>{Math.round(fat)}</Text>
                <Text style={styles.nutritionUnit}>F</Text>
              </View>
            )}
          </View>

          {onPress && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
        </View>
      </View>

      {/* Color indicator bar at bottom */}
      <View style={[styles.colorBar, { backgroundColor: colors.primary }]} />
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
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
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
    <View style={styles.distributionCard}>
      <Text style={styles.distributionTitle}>Today's Balance</Text>

      {/* Color bars */}
      <View style={styles.barContainer}>
        {greenPercent > 0 && (
          <View
            style={{
              width: `${greenPercent}%`,
              height: '100%',
              backgroundColor: FoodClassificationService.COLORS.green.primary,
            }}
          />
        )}
        {yellowPercent > 0 && (
          <View
            style={{
              width: `${yellowPercent}%`,
              height: '100%',
              backgroundColor: FoodClassificationService.COLORS.yellow.primary,
            }}
          />
        )}
        {redPercent > 0 && (
          <View
            style={{
              width: `${redPercent}%`,
              height: '100%',
              backgroundColor: FoodClassificationService.COLORS.red.primary,
            }}
          />
        )}
        {neutralPercent > 0 && (
          <View
            style={{
              width: `${neutralPercent}%`,
              height: '100%',
              backgroundColor: FoodClassificationService.COLORS.neutral.primary,
            }}
          />
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: FoodClassificationService.COLORS.green.primary },
            ]}
          />
          <Text style={styles.legendText}>Green: {distribution.green.count}</Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: FoodClassificationService.COLORS.yellow.primary },
            ]}
          />
          <Text style={styles.legendText}>Yellow: {distribution.yellow.count}</Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: FoodClassificationService.COLORS.red.primary },
            ]}
          />
          <Text style={styles.legendText}>Red: {distribution.red.count}</Text>
        </View>
      </View>

      {/* Score */}
      <View style={styles.scoreContainer}>
        <Text
          style={[
            styles.scoreValue,
            {
              color: score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444",
            },
          ]}
        >
          {Math.round(score)}
        </Text>
        <Text style={styles.scoreLabel}>Balance Score</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ColorCodedFoodCard styles
  card: {
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  mealTypeBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4B5563",
    textTransform: "capitalize",
  },
  colorLabel: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  colorLabelText: {
    fontSize: 12,
    fontWeight: "600",
  },
  nameContainer: {
    marginBottom: 12,
  },
  foodName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  serving: {
    fontSize: 14,
    color: "#6B7280",
  },
  nutritionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  nutritionItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 4,
  },
  nutritionUnit: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 2,
  },
  colorBar: {
    height: 4,
  },

  // ColorDistributionBar styles
  emptyState: {
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  emptyStateText: {
    textAlign: "center",
    fontSize: 14,
    color: "#6B7280",
  },
  distributionCard: {
    borderRadius: 12,
    backgroundColor: "#FFF",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  barContainer: {
    height: 16,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 8,
    marginBottom: 12,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: "#4B5563",
  },
  scoreContainer: {
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
    marginTop: 12,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "700",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
});

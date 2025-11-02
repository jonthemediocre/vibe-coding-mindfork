/**
 * DraggableFoodItem - Draggable food entry component
 * Note: React Native doesn't have native drag & drop like web.
 * This component uses long-press and visual feedback as an alternative.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useTheme } from '../../app-components/components/ThemeProvider';
import type { FoodEntry } from '../../types/models';

interface DraggableFoodItemProps {
  food: FoodEntry;
  onPress: () => void;
  onAddToMeal: () => void;
}

export const DraggableFoodItem: React.FC<DraggableFoodItemProps> = ({
  food,
  onPress,
  onAddToMeal,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Determine category color based on macros
  const getCategoryColor = (): string => {
    const protein = food.protein_g || 0;
    const carbs = food.carbs_g || 0;
    const fat = food.fat_g || 0;

    if (protein > carbs && protein > fat) return '#E91E63'; // High protein
    if (carbs > protein && carbs > fat) return '#FF9800'; // High carbs
    if (fat > protein && fat > carbs) return '#607D8B'; // High fat
    return '#4CAF50'; // Balanced
  };

  const categoryColor = getCategoryColor();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: `${categoryColor}40`,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={[styles.indicator, { backgroundColor: categoryColor }]} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {food.food_name}
          </Text>
          <Text style={[styles.serving, { color: colors.textSecondary }]}>
            {food.serving_size}
          </Text>
          <View style={styles.macros}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: '#E91E63' }]}>
                {Math.round(food.protein_g || 0)}g
              </Text>
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>P</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: '#FF9800' }]}>
                {Math.round(food.carbs_g || 0)}g
              </Text>
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>C</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: '#607D8B' }]}>
                {Math.round(food.fat_g || 0)}g
              </Text>
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>F</Text>
            </View>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={[styles.calories, { color: colors.text }]}>
            {food.calories}
          </Text>
          <Text style={[styles.caloriesLabel, { color: colors.textSecondary }]}>cal</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={onAddToMeal}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="plus" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  indicator: {
    width: 4,
    height: 50,
    borderRadius: 2,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  serving: {
    fontSize: 12,
    marginBottom: 6,
  },
  macros: {
    flexDirection: 'row',
    gap: 12,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  macroLabel: {
    fontSize: 11,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  calories: {
    fontSize: 18,
    fontWeight: '700',
  },
  caloriesLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * MealSlot - Droppable area for a specific meal type (breakfast/lunch/dinner/snack)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useTheme } from '../../app-components/components/ThemeProvider';
import type { MealPlanEntry } from '../../services/MealPlanningService';

interface MealSlotProps {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: string;
  meals: MealPlanEntry[];
  targetCalories?: number;
  onAddMeal: () => void;
  onRemoveMeal: (mealId: string) => void;
  onMealPress?: (meal: MealPlanEntry) => void;
}

const MEAL_CONFIG = {
  breakfast: {
    icon: 'coffee' as const,
    label: 'Breakfast',
    time: '8:00 AM',
    color: '#FF9800',
  },
  lunch: {
    icon: 'sun' as const,
    label: 'Lunch',
    time: '12:30 PM',
    color: '#FFA8D2',
  },
  dinner: {
    icon: 'moon' as const,
    label: 'Dinner',
    time: '7:00 PM',
    color: '#9C27B0',
  },
  snack: {
    icon: 'package' as const,
    label: 'Snacks',
    time: 'Throughout day',
    color: '#4CAF50',
  },
};

export const MealSlot: React.FC<MealSlotProps> = ({
  mealType,
  date,
  meals,
  targetCalories = 400,
  onAddMeal,
  onRemoveMeal,
  onMealPress,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const config = MEAL_CONFIG[mealType];

  // Calculate total calories in this slot
  const totalCalories = meals.reduce((sum, meal) => {
    // Note: In real implementation, fetch actual calorie data from recipes/food entries
    return sum + (meal.servings || 1) * 100; // Placeholder
  }, 0);

  const progress = Math.min((totalCalories / targetCalories) * 100, 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
            <Icon name={config.icon} size={20} color={config.color} />
          </View>
          <View>
            <Text style={[styles.label, { color: colors.text }]}>{config.label}</Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>{config.time}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.calories, { color: colors.text }]}>
            {totalCalories}/{targetCalories} cal
          </Text>
          <View style={[styles.progressBar, { backgroundColor: `${colors.primary}20` }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: config.color,
                  width: `${progress}%`,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Meal Items */}
      {meals.length === 0 ? (
        <TouchableOpacity
          style={[styles.emptySlot, { borderColor: colors.border }]}
          onPress={onAddMeal}
        >
          <Icon name="plus-circle" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Tap to add meals
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.mealsContainer}>
          {meals.map((meal, index) => (
            <MealItem
              key={meal.id}
              meal={meal}
              color={config.color}
              onRemove={() => onRemoveMeal(meal.id)}
              onPress={() => onMealPress?.(meal)}
            />
          ))}
          <TouchableOpacity
            style={[styles.addButton, { borderColor: colors.border }]}
            onPress={onAddMeal}
          >
            <Icon name="plus" size={16} color={colors.primary} />
            <Text style={[styles.addButtonText, { color: colors.primary }]}>Add more</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// MealItem Sub-component
const MealItem: React.FC<{
  meal: MealPlanEntry;
  color: string;
  onRemove: () => void;
  onPress: () => void;
}> = ({ meal, color, onRemove, onPress }) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <TouchableOpacity
      style={[
        styles.mealItem,
        {
          backgroundColor: colors.background,
          borderColor: color,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.mealItemContent}>
        <View style={styles.mealItemLeft}>
          <View style={[styles.mealDot, { backgroundColor: color }]} />
          <View style={styles.mealDetails}>
            <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={1}>
              {meal.recipe_id ? 'Recipe' : 'Food'} {/* Placeholder */}
            </Text>
            <Text style={[styles.mealServings, { color: colors.textSecondary }]}>
              {meal.servings} serving{meal.servings > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="x" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  calories: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptySlot: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  mealsContainer: {
    gap: 8,
  },
  mealItem: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    padding: 12,
  },
  mealItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mealDetails: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
  },
  mealServings: {
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

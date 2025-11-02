/**
 * MealPlanningScreen - Comprehensive meal planning with drag & drop
 *
 * Features:
 * - 7-day calendar view with horizontal scroll
 * - Drag & drop meal assignment
 * - Meal templates (save and reuse)
 * - Recipe library integration
 * - Shopping list generation
 * - Daily macro preview
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useTheme } from '../../app-components/components/ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { useMealPlanning } from '../../hooks/useMealPlanning';
import { FoodService } from '../../services/FoodService';
import { MealPlanningService } from '../../services/MealPlanningService';
import { CalendarView } from '../../components/meal-planning/CalendarView';
import { MealSlot } from '../../components/meal-planning/MealSlot';
import { DraggableFoodItem } from '../../components/meal-planning/DraggableFoodItem';
import { RecipeBrowser } from '../../components/meal-planning/RecipeBrowser';
import { MealTemplateModal } from '../../components/meal-planning/MealTemplateModal';
import { ShoppingListView } from '../../components/meal-planning/ShoppingListView';
import type { FoodEntry } from '../../types/models';
import type { Recipe, MealTemplate } from '../../services/MealPlanningService';
import { showAlert } from '../../utils/alerts';
import { logger } from '../../utils/logger';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const MealPlanningScreen: React.FC = () => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();

  // State
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1); // Get Monday of current week
    return monday.toISOString().split('T')[0];
  });
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [recentFoods, setRecentFoods] = useState<FoodEntry[]>([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);

  // Modals
  const [showRecipeBrowser, setShowRecipeBrowser] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateMode, setTemplateMode] = useState<'save' | 'load'>('load');
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showFoodSelector, setShowFoodSelector] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  } | null>(null);

  // Meal planning hook
  const {
    mealPlan,
    isLoading,
    error,
    macroSummaries,
    addMeal,
    removeMeal,
    updateMeal,
    refreshMealPlan,
    getMealsForSlot,
    getMacrosForDate,
  } = useMealPlanning({
    startDate: selectedDate,
    numberOfDays: 7,
    autoRefresh: true,
  });

  // Load recent foods
  React.useEffect(() => {
    loadRecentFoods();
  }, []);

  const loadRecentFoods = async () => {
    setIsLoadingFoods(true);
    try {
      const { data } = await FoodService.getTodaysFoodEntries(user?.id || '');
      if (data) {
        setRecentFoods(data);
      }
    } catch (err) {
      console.error('Error loading recent foods', err);
    } finally {
      setIsLoadingFoods(false);
    }
  };

  // Week navigation
  const handleWeekChange = useCallback((direction: 'prev' | 'next') => {
    const currentMonday = new Date(selectedDate);
    const newMonday = new Date(currentMonday);
    newMonday.setDate(currentMonday.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newMonday.toISOString().split('T')[0]);
  }, [selectedDate]);

  // Add meal handlers
  const handleAddMealSlot = (date: string, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setSelectedSlot({ date, mealType });
    setShowFoodSelector(true);
  };

  const handleFoodSelect = async (food: FoodEntry) => {
    if (!selectedSlot) return;

    await addMeal(selectedSlot.date, selectedSlot.mealType, {
      mealName: food.food_name,
      mealDescription: `${food.serving_size || '1 serving'}`,
      estimatedCalories: food.calories || 0,
      estimatedProteinG: food.protein_g || 0,
      estimatedCarbsG: food.carbs_g || 0,
      estimatedFatG: food.fat_g || 0,
      servings: 1,
    });

    setShowFoodSelector(false);
    setSelectedSlot(null);
  };

  const handleRecipeSelect = async (recipe: Recipe) => {
    if (!selectedSlot) return;

    await addMeal(selectedSlot.date, selectedSlot.mealType, {
      mealName: recipe.name,
      mealDescription: recipe.description || '',
      estimatedCalories: recipe.calories_per_serving || 0,
      estimatedProteinG: recipe.protein_g || 0,
      estimatedCarbsG: recipe.carbs_g || 0,
      estimatedFatG: recipe.fat_g || 0,
      servings: 1,
    });

    setShowRecipeBrowser(false);
    setSelectedSlot(null);
  };

  const handleMealRemove = async (mealId: string) => {
    await removeMeal(mealId);
  };

  // Template handlers
  const handleSaveTemplate = () => {
    const meals = getMealsForSlot(currentDate, MEAL_TYPES[0]); // Get all meals for current date
    if (meals.length === 0) {
      showAlert.error('Error', 'No meals to save as template');
      return;
    }
    setTemplateMode('save');
    setShowTemplateModal(true);
  };

  const handleLoadTemplate = () => {
    setTemplateMode('load');
    setShowTemplateModal(true);
  };

  const handleApplyTemplate = async (template: MealTemplate) => {
    if (!user?.id) return;

    try {
      const { data, error } = await MealPlanningService.applyTemplate(
        user.id,
        template.id,
        currentDate
      );

      if (error) {
        showAlert.error('Error', error);
        return;
      }

      // Refresh meal plan after applying template
      await refreshMealPlan();
      setShowTemplateModal(false);
      showAlert.success('Success', `Template "${template.name}" applied successfully`);
    } catch (err) {
      logger.error('Error applying template', err as Error);
      showAlert.error('Error', 'Failed to apply template');
    }
  };

  // Get meals for current date
  const currentMacros = getMacrosForDate(currentDate);

  // Calculate end date for shopping list
  const getEndDate = () => {
    const start = new Date(selectedDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end.toISOString().split('T')[0];
  };

  if (isLoading && mealPlan.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading meal plan...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshMealPlan}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Meal Planning</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Plan your weekly meals and track nutrition
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.shoppingButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowShoppingList(true)}
        >
          <Icon name="shopping-cart" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Calendar View */}
      <CalendarView
        startDate={selectedDate}
        selectedDate={currentDate}
        onDateSelect={setCurrentDate}
        onWeekChange={handleWeekChange}
        macroSummaries={macroSummaries}
      />

      {/* Daily Macro Summary */}
      {currentMacros && (
        <View style={[styles.macroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.macroTitle, { color: colors.text }]}>Daily Targets</Text>
          <View style={styles.macroGrid}>
            <MacroItem
              label="Calories"
              value={currentMacros.planned_calories}
              target={currentMacros.target_calories}
              color="#FFA8D2"
            />
            <MacroItem
              label="Protein"
              value={currentMacros.planned_protein}
              target={currentMacros.target_protein}
              color="#E91E63"
            />
            <MacroItem
              label="Carbs"
              value={currentMacros.planned_carbs}
              target={currentMacros.target_carbs}
              color="#FF9800"
            />
            <MacroItem
              label="Fat"
              value={currentMacros.planned_fat}
              target={currentMacros.target_fat}
              color="#607D8B"
            />
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleSaveTemplate}
        >
          <Icon name="bookmark" size={18} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Save Template</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleLoadTemplate}
        >
          <Icon name="folder" size={18} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Load Template</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            setSelectedSlot({ date: currentDate, mealType: 'breakfast' });
            setShowRecipeBrowser(true);
          }}
        >
          <Icon name="book-open" size={18} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Browse Recipes</Text>
        </TouchableOpacity>
      </View>

      {/* Meal Slots */}
      <View style={styles.mealsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {new Date(currentDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        {MEAL_TYPES.map(mealType => (
          <MealSlot
            key={mealType}
            mealType={mealType}
            date={currentDate}
            meals={getMealsForSlot(currentDate, mealType)}
            targetCalories={
              mealType === 'breakfast' ? 400 :
              mealType === 'lunch' ? 500 :
              mealType === 'dinner' ? 600 : 200
            }
            onAddMeal={() => handleAddMealSlot(currentDate, mealType)}
            onRemoveMeal={handleMealRemove}
          />
        ))}
      </View>

      {/* Food Selector Modal */}
      <Modal
        visible={showFoodSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFoodSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add to Meal</Text>
              <TouchableOpacity
                onPress={() => setShowFoodSelector(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.foodList}>
              {isLoadingFoods ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : recentFoods.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No recent foods found
                </Text>
              ) : (
                recentFoods.map(food => (
                  <DraggableFoodItem
                    key={food.id}
                    food={food}
                    onPress={() => {}}
                    onAddToMeal={() => handleFoodSelect(food)}
                  />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Recipe Browser Modal */}
      {showRecipeBrowser && (
        <Modal visible={true} animationType="slide">
          <RecipeBrowser
            onRecipeSelect={handleRecipeSelect}
            onClose={() => {
              setShowRecipeBrowser(false);
              setSelectedSlot(null);
            }}
          />
        </Modal>
      )}

      {/* Template Modal */}
      <MealTemplateModal
        visible={showTemplateModal}
        mode={templateMode}
        currentMeals={
          mealPlan
            .filter(m => m.date === currentDate)
            .map(m => ({
              meal_type: m.meal_type,
              recipe_id: m.recipe_id || undefined,
              food_entry_id: m.food_entry_id || undefined,
              servings: m.servings || 1,
            }))
        }
        onClose={() => setShowTemplateModal(false)}
        onTemplateLoad={handleApplyTemplate}
      />

      {/* Shopping List Modal */}
      <ShoppingListView
        visible={showShoppingList}
        startDate={selectedDate}
        endDate={getEndDate()}
        onClose={() => setShowShoppingList(false)}
      />
    </ScrollView>
  );
};

// Macro Item Component
const MacroItem: React.FC<{
  label: string;
  value: number;
  target?: number;
  color: string;
}> = ({ label, value, target, color }) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const percentage = target ? Math.min((value / target) * 100, 100) : 0;

  return (
    <View style={styles.macroItem}>
      <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.macroValue, { color }]}>
        {value}{target ? `/${target}` : ''}
      </Text>
      {target && (
        <View style={[styles.macroBar, { backgroundColor: `${color}20` }]}>
          <View
            style={[styles.macroBarFill, { backgroundColor: color, width: `${percentage}%` }]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  shoppingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  macroTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  macroItem: {
    flex: 1,
    minWidth: '45%',
  },
  macroLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  macroBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mealsSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  foodList: {
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});

export default MealPlanningScreen;

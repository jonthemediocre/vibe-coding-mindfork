import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Screen, Text, useThemeColors } from "../../ui";
import { useFoodTracking } from "../../hooks";
import { useAuth } from "../../contexts/AuthContext";
import { useProfile } from "../../contexts/ProfileContext";
import { useTheme } from "../../app-components/components/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AIFoodScanService } from "../../services/AIFoodScanService";
import type { CreateFoodEntryInput } from "../../types/models";

const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner", "Snacks"];

export const FoodScreen: React.FC = () => {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { profile } = useProfile();
  const {
    entries,
    dailyStats,
    isLoading,
    error,
    addFoodEntry,
    deleteFoodEntry,
    clearError,
  } = useFoodTracking();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Calculate remaining calories
  const goalCalories = profile?.daily_calories || 2000;
  const consumedCalories = dailyStats?.total_calories || 0;
  const remainingCalories = goalCalories - consumedCalories;
  const progress = (consumedCalories / goalCalories) * 100;

  // Group entries by meal type
  const entriesByMeal = entries.reduce(
    (acc, entry) => {
      const mealType = entry.meal_type || "snack";
      if (!acc[mealType]) acc[mealType] = [];
      acc[mealType].push(entry);
      return acc;
    },
    {} as Record<string, typeof entries>
  );

  const handleAddFood = () => {
    setShowAddModal(true);
  };

  const handleScanFood = async () => {
    setShowAddModal(false);
    setIsScanning(true);

    try {
      const foodData = await AIFoodScanService.scanFoodImage();

      if (foodData) {
        await addFoodEntry(foodData);
      }
    } catch (err) {
      // Error will be shown via the error state from useFoodTracking
    } finally {
      setIsScanning(false);
    }
  };

  const handleSearchFood = () => {
    setShowAddModal(false);
    // TODO: Implement food search - for now just close modal
    // This would navigate to a search screen or show a search modal
  };

  const handleQuickAdd = () => {
    setShowAddModal(false);
    // TODO: Implement quick add - for now just close modal
    // This would show a form to manually enter calories
  };

  const handleDeleteEntry = async (entryId: string) => {
    await deleteFoodEntry(entryId);
    setShowDeleteConfirm(null);
  };

  const getMealIcon = (mealType: string) => {
    const icons: Record<string, any> = {
      breakfast: "sunny",
      lunch: "restaurant",
      dinner: "moon",
      snack: "fast-food",
    };
    return icons[mealType] || "fast-food";
  };

  const getMealCalories = (mealType: string) => {
    return entriesByMeal[mealType]?.reduce((sum, e) => sum + (e.calories || 0), 0) || 0;
  };

  if (isLoading && entries.length === 0) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">
            Loading food entries...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 py-6">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            Food
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {/* Calorie Progress Card */}
        <View className="px-5 mb-6">
          <LinearGradient
            colors={
              remainingCalories >= 0
                ? isDark
                  ? ["#065F46", "#047857"]
                  : ["#D1FAE5", "#A7F3D0"]
                : isDark
                ? ["#991B1B", "#B91C1C"]
                : ["#FEE2E2", "#FECACA"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 24,
            }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text
                  className={`text-sm font-semibold mb-1 ${
                    isDark
                      ? remainingCalories >= 0
                        ? "text-green-300"
                        : "text-red-300"
                      : remainingCalories >= 0
                      ? "text-green-800"
                      : "text-red-800"
                  }`}
                >
                  {remainingCalories >= 0 ? "REMAINING" : "OVER GOAL"}
                </Text>
                <Text
                  className={`text-5xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {Math.abs(remainingCalories)}
                </Text>
                <Text
                  className={`text-base ${
                    isDark
                      ? remainingCalories >= 0
                        ? "text-green-200"
                        : "text-red-200"
                      : remainingCalories >= 0
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  calories
                </Text>
              </View>
              <View className="items-end">
                <Text
                  className={`text-base ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {consumedCalories} / {goalCalories}
                </Text>
                <Text
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  consumed
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View className="h-3 bg-white/20 rounded-full overflow-hidden">
              <View
                className={`h-full ${
                  remainingCalories >= 0 ? "bg-white" : "bg-red-500"
                } rounded-full`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </View>

            {/* Macros */}
            <View className="flex-row justify-around mt-6 pt-6 border-t border-white/20">
              <View className="items-center">
                <Text
                  className={`text-2xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {Math.round(dailyStats?.total_protein || 0)}g
                </Text>
                <Text
                  className={`text-xs mt-1 ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Protein
                </Text>
              </View>
              <View className="items-center">
                <Text
                  className={`text-2xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {Math.round(dailyStats?.total_carbs || 0)}g
                </Text>
                <Text
                  className={`text-xs mt-1 ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Carbs
                </Text>
              </View>
              <View className="items-center">
                <Text
                  className={`text-2xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {Math.round(dailyStats?.total_fat || 0)}g
                </Text>
                <Text
                  className={`text-xs mt-1 ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Fat
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Meals */}
        <View className="px-5">
          {MEAL_TIMES.map((mealTime) => {
            const mealType = mealTime.toLowerCase();
            const mealEntries = entriesByMeal[mealType] || [];
            const mealCalories = getMealCalories(mealType);

            return (
              <View key={mealTime} className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Ionicons
                      name={getMealIcon(mealType)}
                      size={24}
                      color={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                    <Text className="text-xl font-bold text-gray-900 dark:text-white ml-2">
                      {mealTime}
                    </Text>
                    {mealCalories > 0 && (
                      <Text className="text-sm text-gray-600 dark:text-gray-400 ml-3">
                        {mealCalories} cal
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={handleAddFood}
                    className="p-2"
                  >
                    <Ionicons
                      name="add-circle"
                      size={28}
                      color={isDark ? "#A78BFA" : "#8B5CF6"}
                    />
                  </Pressable>
                </View>

                {mealEntries.length > 0 ? (
                  <View className="gap-2">
                    {mealEntries.map((entry) => (
                      <Pressable
                        key={entry.id}
                        onLongPress={() => setShowDeleteConfirm(entry.id)}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 flex-row justify-between items-center border border-gray-200 dark:border-gray-700"
                      >
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-gray-900 dark:text-white">
                            {entry.food_name}
                          </Text>
                          {entry.serving_size && (
                            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {entry.serving_size}
                            </Text>
                          )}
                        </View>
                        <View className="items-end">
                          <Text className="text-lg font-bold text-gray-900 dark:text-white">
                            {entry.calories || 0}
                          </Text>
                          <Text className="text-xs text-gray-600 dark:text-gray-400">
                            cal
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Pressable
                    onPress={handleAddFood}
                    className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 items-center border-2 border-dashed border-gray-300 dark:border-gray-600"
                  >
                    <Ionicons
                      name="add"
                      size={32}
                      color={isDark ? "#6B7280" : "#9CA3AF"}
                    />
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Add food
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {error && (
          <View className="mx-5 mb-6 bg-red-100 dark:bg-red-900/30 rounded-2xl p-4">
            <Text className="text-red-800 dark:text-red-200 text-sm">
              {error}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <View className="absolute bottom-6 right-6">
        <Pressable
          onPress={handleAddFood}
          className="bg-purple-500 rounded-full w-16 h-16 items-center justify-center shadow-lg"
        >
          <Ionicons name="add" size={32} color="white" />
        </Pressable>
      </View>

      {/* Add Food Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="bg-white dark:bg-gray-900 rounded-t-3xl px-6 py-6"
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                Add Food
              </Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons
                  name="close"
                  size={28}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
              </Pressable>
            </View>

            <View className="gap-3">
              <Pressable
                onPress={handleScanFood}
                className="bg-purple-500 rounded-2xl p-5 flex-row items-center"
              >
                <Ionicons name="camera" size={28} color="white" />
                <View className="ml-4 flex-1">
                  <Text className="text-lg font-bold text-white">
                    Scan Food
                  </Text>
                  <Text className="text-sm text-purple-100 mt-1">
                    Take a photo to analyze
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="white" />
              </Pressable>

              <Pressable
                onPress={handleSearchFood}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 flex-row items-center border border-gray-200 dark:border-gray-700"
              >
                <Ionicons
                  name="search"
                  size={28}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
                <View className="ml-4 flex-1">
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    Search Foods
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    380,000+ verified foods
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
              </Pressable>

              <Pressable
                onPress={handleQuickAdd}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 flex-row items-center border border-gray-200 dark:border-gray-700"
              >
                <Ionicons
                  name="flash"
                  size={28}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
                <View className="ml-4 flex-1">
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    Quick Add
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Enter calories manually
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDeleteConfirm(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              Delete Entry?
            </Text>
            <Text className="text-base text-gray-600 dark:text-gray-400 mb-6 text-center">
              This action cannot be undone.
            </Text>
            <View className="gap-3">
              <Pressable
                onPress={() => showDeleteConfirm && handleDeleteEntry(showDeleteConfirm)}
                className="bg-red-500 rounded-2xl py-4 items-center"
              >
                <Text className="text-white text-lg font-bold">Delete</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowDeleteConfirm(null)}
                className="bg-gray-200 dark:bg-gray-700 rounded-2xl py-4 items-center"
              >
                <Text className="text-gray-900 dark:text-white text-base font-semibold">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Scanning Modal */}
      <Modal
        visible={isScanning}
        animationType="fade"
        transparent
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white dark:bg-gray-900 rounded-3xl p-8 items-center">
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mt-4">
              Analyzing food...
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              This may take a moment
            </Text>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

export default FoodScreen;

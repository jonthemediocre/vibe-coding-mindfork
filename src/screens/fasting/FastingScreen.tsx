import React, { useState, useEffect } from "react";
import {
  View,
  Pressable,
  ActivityIndicator,
  Animated,
  ScrollView,
  Modal,
} from "react-native";
import { Screen, Text, useThemeColors } from "../../ui";
import { useFastingTimer } from "../../hooks";
import { useTheme } from "../../app-components/components/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const FASTING_PRESETS = [
  { id: "16-8", label: "16:8", fastingHours: 16, eatingHours: 8, description: "Most popular" },
  { id: "18-6", label: "18:6", fastingHours: 18, eatingHours: 6, description: "Intermediate" },
  { id: "20-4", label: "20:4", fastingHours: 20, eatingHours: 4, description: "Advanced" },
  { id: "14-10", label: "14:10", fastingHours: 14, eatingHours: 10, description: "Beginner friendly" },
];

export const FastingScreen: React.FC = () => {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const {
    activeSession,
    isLoading,
    error,
    elapsedHours,
    progress,
    startFasting,
    endFasting,
    cancelFasting,
    clearError,
  } = useFastingTimer();

  const [selectedPreset, setSelectedPreset] = useState(FASTING_PRESETS[0]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  // Pulse animation for active timer
  useEffect(() => {
    if (activeSession) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [activeSession, pulseAnim]);

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return { hours: h, minutes: m };
  };

  const formatHour = (hour: number) => {
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour >= 12 ? "PM" : "AM";
    return `${h}:00 ${period}`;
  };

  const handleStartFasting = async () => {
    await startFasting(selectedPreset.fastingHours);
  };

  const handleEndFasting = async () => {
    await endFasting();
    setShowConfirmEnd(false);
  };

  const remainingHours = activeSession
    ? Math.max(0, (activeSession.target_duration_hours || 16) - elapsedHours)
    : selectedPreset.fastingHours;

  const remainingTime = formatTime(remainingHours);
  const elapsedTime = formatTime(elapsedHours);

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">
            Loading fasting data...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            Fasting
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 mt-1">
            {activeSession ? "Fast in progress" : "Ready to start"}
          </Text>
        </View>

        {/* Main Timer/Status Card */}
        <LinearGradient
          colors={
            activeSession
              ? isDark
                ? ["#065F46", "#047857", "#059669"]
                : ["#D1FAE5", "#A7F3D0", "#6EE7B7"]
              : isDark
              ? ["#374151", "#4B5563", "#6B7280"]
              : ["#F3F4F6", "#E5E7EB", "#D1D5DB"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            padding: 32,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          {activeSession ? (
            <>
              {/* Active Timer */}
              <Text
                className={`text-sm font-semibold mb-2 ${
                  isDark ? "text-green-300" : "text-green-800"
                }`}
              >
                TIME REMAINING
              </Text>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Text
                  className={`text-7xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {remainingTime.hours}
                  <Text className="text-5xl">h</Text>
                </Text>
                <Text
                  className={`text-4xl font-semibold text-center ${
                    isDark ? "text-green-200" : "text-green-700"
                  }`}
                >
                  {remainingTime.minutes}
                  <Text className="text-2xl">m</Text>
                </Text>
              </Animated.View>

              <View className="w-full h-2 bg-white/20 rounded-full mt-6 mb-4">
                <View
                  className="h-full bg-white rounded-full"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </View>

              <Text
                className={`text-sm font-medium ${
                  isDark ? "text-green-200" : "text-green-800"
                }`}
              >
                {elapsedTime.hours}h {elapsedTime.minutes}m elapsed •{" "}
                {Math.round(progress)}% complete
              </Text>

              {activeSession.start_time && (
                <Text
                  className={`text-xs mt-2 ${
                    isDark ? "text-green-300/70" : "text-green-700/70"
                  }`}
                >
                  Started at{" "}
                  {new Date(activeSession.start_time).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              )}
            </>
          ) : (
            <>
              {/* Preset Selection */}
              <Ionicons
                name="time-outline"
                size={48}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
              <Text
                className={`text-2xl font-bold mt-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {selectedPreset.label}
              </Text>
              <Text
                className={`text-base mt-2 ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {selectedPreset.fastingHours} hours fasting •{" "}
                {selectedPreset.eatingHours} hours eating
              </Text>
              <Text
                className={`text-sm mt-1 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {selectedPreset.description}
              </Text>

              <Pressable
                onPress={() => setShowPresetModal(true)}
                className="mt-6 px-6 py-2 bg-white/20 rounded-full"
              >
                <Text
                  className={`text-sm font-semibold ${
                    isDark ? "text-white" : "text-gray-800"
                  }`}
                >
                  Change Plan
                </Text>
              </Pressable>
            </>
          )}
        </LinearGradient>

        {/* Action Buttons */}
        {activeSession ? (
          <View className="gap-3">
            <Pressable
              onPress={() => setShowConfirmEnd(true)}
              className="bg-red-500 rounded-2xl py-5 items-center shadow-lg"
            >
              <Text className="text-white text-lg font-bold">End Fast</Text>
            </Pressable>
            <Pressable
              onPress={cancelFasting}
              className="bg-gray-200 dark:bg-gray-700 rounded-2xl py-4 items-center"
            >
              <Text className="text-gray-900 dark:text-white text-base font-semibold">
                Cancel
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleStartFasting}
            disabled={isLoading}
            className="bg-green-500 rounded-2xl py-5 items-center shadow-lg"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-lg font-bold">Start Fast</Text>
            )}
          </Pressable>
        )}

        {/* Info Cards */}
        <View className="mt-8 gap-4">
          <View className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-5">
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="water-outline"
                size={24}
                color={isDark ? "#C084FC" : "#9333EA"}
              />
              <Text className="text-lg font-bold text-gray-900 dark:text-white ml-3">
                Stay Hydrated
              </Text>
            </View>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Drink plenty of water, black coffee, or unsweetened tea during your fast.
            </Text>
          </View>

          <View className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5">
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="restaurant-outline"
                size={24}
                color={isDark ? "#60A5FA" : "#3B82F6"}
              />
              <Text className="text-lg font-bold text-gray-900 dark:text-white ml-3">
                Eating Window
              </Text>
            </View>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Break your fast with nutrient-dense foods. Focus on protein, healthy fats, and
              vegetables.
            </Text>
          </View>
        </View>

        {error && (
          <View className="mt-4 bg-red-100 dark:bg-red-900/30 rounded-2xl p-4">
            <Text className="text-red-800 dark:text-red-200 text-sm">
              {error}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Preset Selection Modal */}
      <Modal
        visible={showPresetModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPresetModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="bg-white dark:bg-gray-900 rounded-t-3xl px-6 py-6"
            style={{ maxHeight: "80%" }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                Choose Your Plan
              </Text>
              <Pressable onPress={() => setShowPresetModal(false)}>
                <Ionicons
                  name="close"
                  size={28}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {FASTING_PRESETS.map((preset) => {
                const isSelected = preset.id === selectedPreset.id;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => {
                      setSelectedPreset(preset);
                      setShowPresetModal(false);
                    }}
                    className={`mb-4 p-5 rounded-2xl border-2 ${
                      isSelected
                        ? "bg-purple-100 dark:bg-purple-900/30 border-purple-500"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text
                        className={`text-2xl font-bold ${
                          isSelected
                            ? "text-purple-600 dark:text-purple-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {preset.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={28}
                          color={isDark ? "#C084FC" : "#9333EA"}
                        />
                      )}
                    </View>
                    <Text className="text-base text-gray-700 dark:text-gray-300 mb-1">
                      {preset.fastingHours} hours fasting • {preset.eatingHours} hours
                      eating
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {preset.description}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirm End Modal */}
      <Modal
        visible={showConfirmEnd}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConfirmEnd(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              End Your Fast?
            </Text>
            <Text className="text-base text-gray-600 dark:text-gray-400 mb-6 text-center">
              You've fasted for {elapsedTime.hours}h {elapsedTime.minutes}m. Great job!
            </Text>
            <View className="gap-3">
              <Pressable
                onPress={handleEndFasting}
                className="bg-green-500 rounded-2xl py-4 items-center"
              >
                <Text className="text-white text-lg font-bold">
                  Complete Fast
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowConfirmEnd(false)}
                className="bg-gray-200 dark:bg-gray-700 rounded-2xl py-4 items-center"
              >
                <Text className="text-gray-900 dark:text-white text-base font-semibold">
                  Keep Going
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

export default FastingScreen;

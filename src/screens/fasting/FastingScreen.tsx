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
                ? [colors.success, colors.success, colors.success]
                : [colors.success + "20", colors.success + "40", colors.success + "60"]
              : isDark
              ? [colors.secondary, colors.secondary, colors.secondary]
              : [colors.surface, colors.surface, colors.surface]
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
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: activeSession ? colors.onPrimary : colors.text,
                  opacity: 0.9,
                }}
              >
                TIME REMAINING
              </Text>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Text
                  style={{
                    fontSize: 72,
                    fontWeight: "bold",
                    color: activeSession ? colors.onPrimary : colors.text,
                  }}
                >
                  {remainingTime.hours}
                  <Text style={{ fontSize: 48 }}>h</Text>
                </Text>
                <Text
                  style={{
                    fontSize: 36,
                    fontWeight: "600",
                    textAlign: "center",
                    color: activeSession ? colors.onPrimary : colors.text,
                    opacity: 0.8,
                  }}
                >
                  {remainingTime.minutes}
                  <Text style={{ fontSize: 24 }}>m</Text>
                </Text>
              </Animated.View>

              <View className="w-full h-2 bg-white/20 rounded-full mt-6 mb-4">
                <View
                  className="h-full bg-white rounded-full"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </View>

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: activeSession ? colors.onPrimary : colors.text,
                  opacity: 0.8,
                }}
              >
                {elapsedTime.hours}h {elapsedTime.minutes}m elapsed •{" "}
                {Math.round(progress)}% complete
              </Text>

              {activeSession.start_time && (
                <Text
                  style={{
                    fontSize: 12,
                    marginTop: 8,
                    color: activeSession ? colors.onPrimary : colors.text,
                    opacity: 0.7,
                  }}
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
                color={colors.textSecondary}
              />
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  marginTop: 16,
                  color: colors.text,
                }}
              >
                {selectedPreset.label}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  marginTop: 8,
                  color: colors.textSecondary,
                }}
              >
                {selectedPreset.fastingHours} hours fasting •{" "}
                {selectedPreset.eatingHours} hours eating
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  marginTop: 4,
                  color: colors.textSecondary,
                  opacity: 0.8,
                }}
              >
                {selectedPreset.description}
              </Text>

              <Pressable
                onPress={() => setShowPresetModal(true)}
                style={{
                  marginTop: 24,
                  paddingHorizontal: 24,
                  paddingVertical: 8,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.text,
                  }}
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
              style={{
                backgroundColor: colors.error,
                borderRadius: 16,
                paddingVertical: 20,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "bold" }}>End Fast</Text>
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
            style={{
              backgroundColor: colors.success,
              borderRadius: 16,
              paddingVertical: 20,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "bold" }}>Start Fast</Text>
            )}
          </Pressable>
        )}

        {/* Info Cards */}
        <View className="mt-8 gap-4">
          <View
            style={{
              backgroundColor: isDark ? colors.primary + "20" : colors.primary + "15",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="water-outline"
                size={24}
                color={colors.primary}
              />
              <Text className="text-lg font-bold text-gray-900 dark:text-white ml-3">
                Stay Hydrated
              </Text>
            </View>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Drink plenty of water, black coffee, or unsweetened tea during your fast.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: isDark ? colors.info + "20" : colors.info + "15",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="restaurant-outline"
                size={24}
                color={colors.info}
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
          <View
            style={{
              marginTop: 16,
              backgroundColor: isDark ? colors.error + "30" : colors.error + "15",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Text style={{ color: colors.error, fontSize: 14 }}>
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
                  color={colors.textSecondary}
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
                    style={{
                      marginBottom: 16,
                      padding: 20,
                      borderRadius: 16,
                      borderWidth: 2,
                      backgroundColor: isSelected
                        ? isDark
                          ? colors.primary + "30"
                          : colors.primary + "15"
                        : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text
                        style={{
                          fontSize: 24,
                          fontWeight: "bold",
                          color: isSelected ? colors.primary : colors.text,
                        }}
                      >
                        {preset.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={28}
                          color={colors.primary}
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
                style={{
                  backgroundColor: colors.success,
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "bold" }}>
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

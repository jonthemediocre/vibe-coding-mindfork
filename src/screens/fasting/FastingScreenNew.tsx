import React, { useMemo, useState, useEffect } from "react";
import { View, StyleSheet, Switch, ActivityIndicator, ScrollView } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import Animated, { useSharedValue, useAnimatedProps, withTiming } from "react-native-reanimated";
import { showAlert } from "../../utils/alerts";
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from "../../ui";
import { useFastingTimer } from "../../hooks";
import { RadialTimePicker } from "../../components/fasting/RadialTimePicker";
import { QuickActions } from "../../components/fasting/QuickActions";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const FASTING_PRESETS = [
  { id: "16-8", label: "16:8", fastingHours: 16, eatingHours: 8 },
  { id: "18-6", label: "18:6", fastingHours: 18, eatingHours: 6 },
  { id: "20-4", label: "20:4 (Warrior)", fastingHours: 20, eatingHours: 4 },
  { id: "omad", label: "OMAD", fastingHours: 23, eatingHours: 1 },
];

export const FastingScreenNew: React.FC = () => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // Window times (local)
  const [windowStart, setWindowStart] = useState(() => {
    const now = new Date();
    now.setHours(20, 0, 0, 0); // Default: 8 PM
    return now;
  });

  const [windowEnd, setWindowEnd] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    now.setHours(12, 0, 0, 0); // Default: 12 PM next day
    return now;
  });

  const [anchor, setAnchor] = useState<'start' | 'finish'>('start');

  // Duration in minutes (locked)
  const durationMinutes = selectedPreset.fastingHours * 60;

  const handleStartFasting = async () => {
    try {
      const success = await startFasting(selectedPreset.fastingHours);
      if (!success && error) {
        showAlert.error("Error", error);
        clearError();
      }
    } catch (err) {
      console.error('[FastingScreenNew] Failed to start fasting:', err);
    }
  };

  const handleEndFasting = async () => {
    showAlert.confirm(
      "End Fasting",
      `You've fasted for ${elapsedHours.toFixed(1)} hours. End this session?`,
      async () => {
        try {
          const success = await endFasting();
          if (!success && error) {
            showAlert.error("Error", error);
            clearError();
          }
        } catch (err) {
          console.error('[FastingScreenNew] Failed to end fasting:', err);
        }
      }
    );
  };

  const handleCancelFasting = async () => {
    showAlert.confirm(
      "Cancel Fasting",
      "Are you sure you want to cancel this fasting session?",
      async () => {
        try {
          const success = await cancelFasting();
          if (!success && error) {
            showAlert.error("Error", error);
            clearError();
          }
        } catch (err) {
          console.error('[FastingScreenNew] Failed to cancel fasting:', err);
        }
      }
    );
  };

  // Quick Actions
  const handleStartNow = () => {
    const now = new Date();
    setWindowStart(now);
    const newEnd = new Date(now.getTime() + durationMinutes * 60000);
    setWindowEnd(newEnd);
    handleStartFasting();
  };

  const handlePush30 = () => {
    const newStart = new Date(windowStart.getTime() + 30 * 60000);
    setWindowStart(newStart);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
    setWindowEnd(newEnd);
  };

  const handleExtend30 = () => {
    const newEnd = new Date(windowEnd.getTime() + 30 * 60000);
    setWindowEnd(newEnd);
    // Note: This would need to update the active session's target
  };

  const handleFinishNow = () => {
    handleEndFasting();
  };

  const handleSkipToday = () => {
    if (activeSession) {
      handleCancelFasting();
    } else {
      showAlert.success("Skipped", "Today's fast has been skipped");
    }
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (isLoading && !activeSession) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="body" style={styles.loadingText}>
            Loading fasting data...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headingSmall" style={styles.heading}>
          Fasting Schedule
        </Text>

        {error && (
          <Card elevation={1} style={{ backgroundColor: colors.error, marginBottom: 12 }}>
            <Text variant="body" color="#FFF">
              {error}
            </Text>
            <Button
              title="Dismiss"
              variant="ghost"
              size="small"
              onPress={clearError}
              containerStyle={styles.errorButton}
            />
          </Card>
        )}

        {activeSession ? (
          <Card elevation={2} style={styles.activeCard}>
            <Text variant="titleSmall" style={styles.activeTitle}>
              Fasting Active
            </Text>
            <Text variant="headingLarge" style={styles.elapsedTime}>
              {formatTime(elapsedHours)}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress, 100)}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
            <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8 }}>
              Target: {activeSession.target_duration_hours}h ({Math.round(progress)}% complete)
            </Text>

            <QuickActions
              onStartNow={handleStartNow}
              onPush30={handlePush30}
              onExtend30={handleExtend30}
              onSkipToday={handleSkipToday}
              onFinishNow={handleFinishNow}
              isActive={true}
            />

            <View style={styles.buttonRow}>
              <Button
                title="End Fast"
                variant="primary"
                onPress={handleEndFasting}
                containerStyle={styles.fastButton}
              />
              <Button
                title="Cancel"
                variant="outline"
                onPress={handleCancelFasting}
                containerStyle={styles.fastButton}
              />
            </View>
          </Card>
        ) : (
          <>
            {/* Plan Selection */}
            <Card elevation={2}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Choose Your Plan
              </Text>
              <View style={styles.presetRow}>
                {FASTING_PRESETS.map((preset) => {
                  const isActive = preset.id === selectedPreset.id;
                  return (
                    <Button
                      key={preset.id}
                      title={preset.label}
                      variant={isActive ? "primary" : "outline"}
                      size="small"
                      onPress={() => {
                        setSelectedPreset(preset);
                        // Adjust window end to match new duration
                        const newEnd = new Date(
                          windowStart.getTime() + preset.fastingHours * 60 * 60000
                        );
                        setWindowEnd(newEnd);
                      }}
                      containerStyle={styles.presetButton}
                    />
                  );
                })}
              </View>
              <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 12 }}>
                {selectedPreset.fastingHours}h fasting · {selectedPreset.eatingHours}h eating
              </Text>
            </Card>

            {/* Radial Time Picker */}
            {showPicker ? (
              <Card elevation={2} style={styles.pickerCard}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Set Your Window
                </Text>
                <RadialTimePicker
                  startTime={windowStart}
                  endTime={windowEnd}
                  durationMinutes={durationMinutes}
                  anchor={anchor}
                  onStartChange={setWindowStart}
                  onEndChange={setWindowEnd}
                  onAnchorChange={setAnchor}
                  roundingMinutes={5}
                />
                <Button
                  title="Confirm Window"
                  variant="primary"
                  onPress={() => setShowPicker(false)}
                  containerStyle={{ marginTop: 16 }}
                />
              </Card>
            ) : (
              <Card elevation={2}>
                <Text variant="titleSmall">Your Window</Text>
                <View style={styles.windowSummary}>
                  <View style={styles.windowTime}>
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      Fast Ends
                    </Text>
                    <Text variant="titleMedium" style={styles.timeText}>
                      {windowStart.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.windowArrow}>
                    <Text variant="headingMedium" color={colors.textSecondary}>
                      →
                    </Text>
                  </View>
                  <View style={styles.windowTime}>
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      Eating Starts
                    </Text>
                    <Text variant="titleMedium" style={styles.timeText}>
                      {windowEnd.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
                <Button
                  title="Customize Window"
                  variant="outline"
                  size="small"
                  onPress={() => setShowPicker(true)}
                  containerStyle={{ marginTop: 12 }}
                />
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <QuickActions
                onStartNow={handleStartNow}
                onPush30={handlePush30}
                onExtend30={handleExtend30}
                onSkipToday={handleSkipToday}
                isActive={false}
              />
            </Card>

            {/* Start Button */}
            <Button
              title="Start Fasting"
              variant="primary"
              onPress={handleStartFasting}
              loading={isLoading}
              containerStyle={{ marginVertical: 16 }}
            />
          </>
        )}

        {/* Settings */}
        <Card>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text variant="titleSmall">Reminders</Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Notifications for start and end times
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              thumbColor={notificationsEnabled ? colors.primary : undefined}
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 16,
    },
    heading: {
      marginBottom: 16,
    },
    activeCard: {
      alignItems: "center",
      paddingVertical: 24,
    },
    activeTitle: {
      marginBottom: 12,
    },
    elapsedTime: {
      marginVertical: 16,
      fontWeight: "700",
      fontSize: 42,
    },
    progressBar: {
      height: 8,
      width: "100%",
      backgroundColor: "rgba(0,0,0,0.1)",
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 12,
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
    },
    buttonRow: {
      flexDirection: "row",
      marginTop: 16,
      gap: 8,
      width: "100%",
    },
    fastButton: {
      flex: 1,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    presetRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -4,
    },
    presetButton: {
      marginHorizontal: 4,
      marginBottom: 8,
      minWidth: 88,
    },
    pickerCard: {
      paddingVertical: 20,
    },
    windowSummary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 16,
    },
    windowTime: {
      flex: 1,
      alignItems: "center",
    },
    windowArrow: {
      marginHorizontal: 12,
    },
    timeText: {
      marginTop: 4,
      fontWeight: "700",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rowText: {
      flex: 1,
      paddingRight: 16,
    },
    errorButton: {
      marginTop: 8,
    },
  });

export default FastingScreenNew;

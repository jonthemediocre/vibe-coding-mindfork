import React, { useMemo, useState } from "react";
import { View, StyleSheet, Switch, Alert, ActivityIndicator } from "react-native";
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from "../../ui";
import { useFastingTimer } from "../../hooks";
import { CircularFastingDial } from "../../components/fasting/CircularFastingDialSimple";

const FASTING_PRESETS = [
  { id: "16-8", label: "16 : 8", fastingHours: 16 },
  { id: "18-6", label: "18 : 6", fastingHours: 18 },
  { id: "20-4", label: "20 : 4", fastingHours: 20 },
];

export const FastingScreen: React.FC = () => {
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
  const [fastingStartHour, setFastingStartHour] = useState(20);

  // Calculate end hour based on start hour and selected preset duration
  const fastingEndHour = (fastingStartHour + selectedPreset.fastingHours) % 24;

  // When user drags the start handle, update start time (end time moves with it to maintain duration)
  const handleStartHourChange = (hour: number) => {
    setFastingStartHour(hour);
  };

  // When user drags the end handle, calculate new start time to maintain the preset duration
  const handleEndHourChange = (hour: number) => {
    // Work backwards from end time to maintain the preset duration
    let newStartHour = hour - selectedPreset.fastingHours;
    if (newStartHour < 0) newStartHour += 24;
    setFastingStartHour(newStartHour);
  };

  const handleStartFasting = async () => {
    const success = await startFasting(selectedPreset.fastingHours);
    if (!success && error) {
      Alert.alert("Error", error);
      clearError();
    }
  };

  const handleEndFasting = async () => {
    Alert.alert(
      "End Fasting",
      `You've fasted for ${elapsedHours.toFixed(1)} hours. End this session?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Fast",
          onPress: async () => {
            const success = await endFasting();
            if (!success && error) {
              Alert.alert("Error", error);
              clearError();
            }
          },
        },
      ]
    );
  };

  const handleCancelFasting = async () => {
    Alert.alert(
      "Cancel Fasting",
      "Are you sure you want to cancel this fasting session?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancel Fast",
          style: "destructive",
          onPress: async () => {
            const success = await cancelFasting();
            if (!success && error) {
              Alert.alert("Error", error);
              clearError();
            }
          },
        },
      ]
    );
  };

  const windowText = useMemo(() => {
    const targetHours = activeSession?.target_duration_hours || selectedPreset.fastingHours;
    const startHour = 20;
    const eatingHours = 24 - targetHours;
    const endHour = (startHour + eatingHours) % 24;

    const format = (hour: number) => {
      const normalized = (hour + 24) % 24;
      const suffix = normalized >= 12 ? "PM" : "AM";
      const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
      return `${hour12} ${suffix}`;
    };

    return `${format(startHour)} – ${format(endHour)}`;
  }, [activeSession, selectedPreset]);

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
    <Screen scrollable contentContainerStyle={styles.container}>
      <Text variant="headingSmall" style={styles.heading}>
        Fasting schedule
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

      {/* BEAUTIFUL CIRCULAR FASTING DIAL - 24-hour clock face */}
      <Card elevation={2} style={styles.dialCard}>
        <CircularFastingDial
          fastingStartHour={fastingStartHour}
          fastingEndHour={fastingEndHour}
          onStartChange={handleStartHourChange}
          onEndChange={handleEndHourChange}
          currentTime={new Date()}
          size={340}
          interactive={!activeSession}
          elapsedHours={activeSession ? elapsedHours : undefined}
        />

        {activeSession && (
          <View style={styles.statusBadge}>
            <Text variant="bodySmall" style={styles.statusText}>
              🟢 Fasting in progress
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {Math.round(progress)}% complete
            </Text>
          </View>
        )}
      </Card>

      {activeSession ? (
        <Card elevation={1}>
          <Text variant="titleSmall">Time Elapsed</Text>
          <Text variant="headingLarge" style={styles.currentPreset}>
            {formatTime(elapsedHours)}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: 4 }}>
            Target: {activeSession.target_duration_hours}h
          </Text>
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
        <Card elevation={1}>
          <Text variant="titleSmall">Ready to Start</Text>
          <Text variant="headingMedium" style={styles.currentPreset}>
            {selectedPreset.label} Fast
          </Text>
          <Text variant="body" color={colors.textSecondary}>
            Eating window: {windowText}
          </Text>
          <Button
            title="Start Fasting"
            variant="primary"
            onPress={handleStartFasting}
            loading={isLoading}
            containerStyle={{ marginTop: 16 }}
          />
        </Card>
      )}

      {!activeSession && (
        <Card>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Choose a preset
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
                  onPress={() => setSelectedPreset(preset)}
                  containerStyle={styles.presetButton}
                />
              );
            })}
          </View>
        </Card>
      )}

      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text variant="titleSmall">Reminders</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Evening and window-open notifications
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            thumbColor={notificationsEnabled ? colors.primary : undefined}
          />
        </View>
        <Button title="Log hydration" variant="secondary" containerStyle={styles.actionButton} />
      </Card>
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
    dialCard: {
      marginBottom: 16,
      alignItems: "center",
      paddingVertical: 20,
    },
    statusBadge: {
      marginTop: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: "#F0FDF4",
      borderRadius: 12,
      alignItems: "center",
    },
    statusText: {
      color: "#15803D",
      fontWeight: "600",
    },
    currentPreset: {
      marginVertical: 10,
    },
    progressBar: {
      height: 8,
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
      minWidth: 96,
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
    actionButton: {
      marginTop: 16,
    },
    errorButton: {
      marginTop: 8,
    },
  });

export default FastingScreen;

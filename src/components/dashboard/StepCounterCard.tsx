import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Card, Text, Button, useThemeColors } from '../../ui';
// @ts-ignore - hook exists but may not be exported yet
import { useStepCounter } from '../../hooks';
import Svg, { Circle } from 'react-native-svg';

export const StepCounterCard: React.FC = () => {
  const colors = useThemeColors();
  const {
    steps,
    dailyGoal,
    progress,
    caloriesBurned,
    permissionStatus,
    isLoading,
    error,
    requestPermission,
  } = useStepCounter();

  // Calculate circle progress
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset = circumference - (progress / 100) * circumference;

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Please enable step tracking in your device settings to track your daily activity.',
        [{ text: 'OK' }]
      );
    }
  };

  if (isLoading) {
    return (
      <Card elevation={2}>
        <Text variant="titleSmall">Daily Steps</Text>
        <View style={styles.loadingContainer}>
          <Text variant="body" color={colors.textSecondary}>
            Loading step data...
          </Text>
        </View>
      </Card>
    );
  }

  if (permissionStatus === 'denied' || error?.includes('permission')) {
    return (
      <Card elevation={2}>
        <Text variant="titleSmall">Daily Steps</Text>
        <View style={styles.permissionContainer}>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginBottom: 16 }}>
            Enable step tracking to monitor your daily activity
          </Text>
          <Button
            title="Enable Step Tracking"
            variant="primary"
            onPress={handleRequestPermission}
          />
        </View>
      </Card>
    );
  }

  if (error && !error.includes('permission')) {
    return (
      <Card elevation={2}>
        <Text variant="titleSmall">Daily Steps</Text>
        <View style={styles.errorContainer}>
          <Text variant="body" color={colors.error} style={{ textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card elevation={2}>
      <View style={styles.header}>
        <Text variant="titleSmall">Daily Steps</Text>
        <Text variant="caption" color={colors.textSecondary}>
          Goal: {dailyGoal.toLocaleString()}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Circular Progress Ring */}
        <View style={styles.circleContainer}>
          <Svg width={size} height={size}>
            {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={progress >= 100 ? colors.success : colors.primary}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>

          {/* Center Text */}
          <View style={styles.centerText}>
            <Text variant="headingLarge" style={{ fontWeight: '700' }}>
              {steps.toLocaleString()}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              steps
            </Text>
            <View style={styles.percentageContainer}>
              <Text variant="body" color={progress >= 100 ? colors.success : colors.primary}>
                {Math.round(progress)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="caption" color={colors.textSecondary}>
              Remaining
            </Text>
            <Text variant="titleMedium">
              {Math.max(0, dailyGoal - steps).toLocaleString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text variant="caption" color={colors.textSecondary}>
              Calories Burned
            </Text>
            <Text variant="titleMedium">
              {caloriesBurned}
            </Text>
          </View>
        </View>
      </View>

      {/* Achievement Badge */}
      {progress >= 100 && (
        <View style={[styles.achievementBadge, { backgroundColor: colors.success + '20' }]}>
          <Text variant="body" style={{ color: colors.success, fontWeight: '600' }}>
            🎉 Goal Achieved!
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  content: {
    alignItems: 'center',
  },
  circleContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  centerText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageContainer: {
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
  },
  achievementBadge: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  permissionContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});

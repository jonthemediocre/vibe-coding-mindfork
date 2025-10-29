/**
 * CreateGoalModal - Modal for creating new goals
 *
 * Features:
 * - Goal type selector with icons
 * - Target value input
 * - Timeframe picker
 * - Description field
 * - Form validation
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Text, Button, useThemeColors } from '../../ui';
import type { GoalType, GoalCategory } from '../../types/models';

interface GoalOption {
  type: GoalType;
  category: GoalCategory;
  label: string;
  icon: string;
  unit: string;
  color: string;
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    type: 'weight',
    category: 'weight',
    label: 'Weight Goal',
    icon: '⚖️',
    unit: 'lbs',
    color: '#FFA8D2',
  },
  {
    type: 'calories',
    category: 'nutrition',
    label: 'Daily Calories',
    icon: '🔥',
    unit: 'kcal',
    color: '#FF9800',
  },
  {
    type: 'protein',
    category: 'nutrition',
    label: 'Daily Protein',
    icon: '💪',
    unit: 'g',
    color: '#4CAF50',
  },
  {
    type: 'water',
    category: 'hydration',
    label: 'Daily Water',
    icon: '💧',
    unit: 'glasses',
    color: '#2196F3',
  },
  {
    type: 'exercise',
    category: 'exercise',
    label: 'Exercise Minutes',
    icon: '🏃',
    unit: 'min',
    color: '#9C27B0',
  },
  {
    type: 'sleep',
    category: 'sleep',
    label: 'Sleep Hours',
    icon: '😴',
    unit: 'hours',
    color: '#673AB7',
  },
  {
    type: 'streak',
    category: 'habits',
    label: 'Daily Streak',
    icon: '🔥',
    unit: 'days',
    color: '#FF5722',
  },
  {
    type: 'custom',
    category: 'custom',
    label: 'Custom Goal',
    icon: '🎯',
    unit: 'units',
    color: '#607D8B',
  },
];

const TIMEFRAME_OPTIONS = [
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: 'Ongoing', days: null },
];

interface CreateGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (goal: {
    type: GoalType;
    category: GoalCategory;
    title: string;
    description: string;
    target_value: number;
    current_value: number;
    unit: string;
    target_date?: string;
  }) => void;
}

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const colors = useThemeColors();
  const [selectedGoal, setSelectedGoal] = useState<GoalOption | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<number | null>(null);

  const handleSubmit = () => {
    if (!selectedGoal || !targetValue) {
      return;
    }

    const targetDate = selectedTimeframe
      ? new Date(Date.now() + selectedTimeframe * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    onSubmit({
      type: selectedGoal.type,
      category: selectedGoal.category,
      title: title || selectedGoal.label,
      description,
      target_value: parseFloat(targetValue),
      current_value: parseFloat(currentValue) || 0,
      unit: selectedGoal.type === 'custom' ? customUnit : selectedGoal.unit,
      target_date: targetDate,
    });

    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setSelectedGoal(null);
    setTitle('');
    setDescription('');
    setTargetValue('');
    setCurrentValue('');
    setCustomUnit('');
    setSelectedTimeframe(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headingSmall">Create New Goal</Text>
          <TouchableOpacity onPress={handleClose}>
            <Text variant="body" style={{ color: colors.primary }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Goal Type Selection */}
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Select Goal Type
          </Text>
          <View style={styles.goalGrid}>
            {GOAL_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.goalOption,
                  {
                    backgroundColor:
                      selectedGoal?.type === option.type
                        ? `${option.color}20`
                        : colors.cardBackground,
                    borderColor:
                      selectedGoal?.type === option.type
                        ? option.color
                        : colors.border,
                  },
                ]}
                onPress={() => setSelectedGoal(option)}
              >
                <Text style={styles.goalIcon}>{option.icon}</Text>
                <Text
                  variant="caption"
                  style={[
                    styles.goalLabel,
                    {
                      color:
                        selectedGoal?.type === option.type
                          ? option.color
                          : colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedGoal && (
            <>
              {/* Custom Title */}
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Goal Title (Optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.cardBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder={selectedGoal.label}
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
              />

              {/* Current Value */}
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Current Value
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.flexInput,
                    {
                      backgroundColor: colors.cardBackground,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={currentValue}
                  onChangeText={setCurrentValue}
                  keyboardType="numeric"
                />
                <Text variant="body" style={styles.unitLabel}>
                  {selectedGoal.type === 'custom' && customUnit
                    ? customUnit
                    : selectedGoal.unit}
                </Text>
              </View>

              {/* Target Value */}
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Target Value
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.flexInput,
                    {
                      backgroundColor: colors.cardBackground,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Enter target"
                  placeholderTextColor={colors.textSecondary}
                  value={targetValue}
                  onChangeText={setTargetValue}
                  keyboardType="numeric"
                />
                <Text variant="body" style={styles.unitLabel}>
                  {selectedGoal.type === 'custom' && customUnit
                    ? customUnit
                    : selectedGoal.unit}
                </Text>
              </View>

              {/* Custom Unit for Custom Goals */}
              {selectedGoal.type === 'custom' && (
                <>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Unit of Measurement
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.cardBackground,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="e.g., steps, pages, reps"
                    placeholderTextColor={colors.textSecondary}
                    value={customUnit}
                    onChangeText={setCustomUnit}
                  />
                </>
              )}

              {/* Timeframe */}
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Timeframe
              </Text>
              <View style={styles.timeframeGrid}>
                {TIMEFRAME_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.timeframeOption,
                      {
                        backgroundColor:
                          selectedTimeframe === option.days
                            ? `${colors.primary}20`
                            : colors.cardBackground,
                        borderColor:
                          selectedTimeframe === option.days
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedTimeframe(option.days)}
                  >
                    <Text
                      variant="body"
                      style={{
                        color:
                          selectedTimeframe === option.days
                            ? colors.primary
                            : colors.text,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description */}
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Description (Optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.cardBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Add notes or motivation for this goal..."
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            title="Create Goal"
            variant="primary"
            onPress={handleSubmit}
            disabled={!selectedGoal || !targetValue}
            containerStyle={styles.createButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalOption: {
    width: '47%',
    aspectRatio: 1.5,
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalLabel: {
    textAlign: 'center',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flexInput: {
    flex: 1,
  },
  unitLabel: {
    minWidth: 60,
  },
  textArea: {
    minHeight: 100,
  },
  timeframeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeframeOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  createButton: {
    width: '100%',
  },
});

/**
 * QuickAddModal - Fast calorie logging without full macro breakdown
 * Infers meal type from time of day, allows users to log in <10 seconds
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../app-components/components/ThemeProvider';

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (calories: number, mealType: string) => Promise<void>;
}

/**
 * Infer meal type from current time of day
 */
const inferMealType = (): string => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
};

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();
  const [calories, setCalories] = useState('');
  const [mealType, setMealType] = useState(inferMealType());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset meal type when modal opens
  useEffect(() => {
    if (visible) {
      setMealType(inferMealType());
      setCalories('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    const calorieValue = parseInt(calories, 10);

    if (!calorieValue || calorieValue <= 0) {
      return; // Invalid input
    }

    setIsSubmitting(true);
    try {
      await onSubmit(calorieValue, mealType);
      setCalories('');
      onClose();
    } catch (error) {
      console.error('Quick add failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast', icon: 'sunny' },
    { value: 'lunch', label: 'Lunch', icon: 'restaurant' },
    { value: 'dinner', label: 'Dinner', icon: 'moon' },
    { value: 'snack', label: 'Snack', icon: 'fast-food' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        >
          <Pressable
            style={{
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: Platform.OS === 'ios' ? 40 : 24,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: '600', color: theme.colors.text }}>
                Quick Add
              </Text>
              <Pressable onPress={onClose} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            {/* Calorie Input */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: theme.colors.text, marginBottom: 8 }}>
                Calories
              </Text>
              <TextInput
                value={calories}
                onChangeText={setCalories}
                placeholder="Enter calories"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="number-pad"
                autoFocus
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 17,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              />
            </View>

            {/* Meal Type Selector */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: theme.colors.text, marginBottom: 12 }}>
                Meal Type
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {mealTypes.map((meal) => (
                  <Pressable
                    key={meal.value}
                    onPress={() => setMealType(meal.value)}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: '45%',
                      backgroundColor: mealType === meal.value ? theme.colors.primary : theme.colors.surface,
                      borderRadius: 12,
                      padding: 16,
                      alignItems: 'center',
                      opacity: pressed ? 0.7 : 1,
                      borderWidth: 1,
                      borderColor: mealType === meal.value ? theme.colors.primary : theme.colors.border,
                    })}
                  >
                    <Ionicons
                      name={meal.icon as any}
                      size={24}
                      color={mealType === meal.value ? '#FFFFFF' : theme.colors.text}
                    />
                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 15,
                        fontWeight: '500',
                        color: mealType === meal.value ? '#FFFFFF' : theme.colors.text,
                      }}
                    >
                      {meal.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={!calories || isSubmitting}
              style={({ pressed }) => ({
                backgroundColor: (!calories || isSubmitting)
                  ? theme.colors.secondary
                  : theme.colors.primary,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                opacity: (!calories || isSubmitting) ? 0.5 : (pressed ? 0.8 : 1),
              })}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>
                {isSubmitting ? 'Adding...' : 'Add to Diary'}
              </Text>
            </Pressable>

            {/* Helper Text */}
            <Text
              style={{
                marginTop: 12,
                textAlign: 'center',
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Estimated based on time: {mealType}
            </Text>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

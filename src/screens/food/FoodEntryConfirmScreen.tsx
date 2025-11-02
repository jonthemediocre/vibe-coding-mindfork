import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { FoodService } from '../../services/FoodService';
import type { CreateFoodEntryInput } from '../../types/models';
import { showAlert } from '../../utils/alerts';
import { logger } from '../../utils/logger';
import { supabase as typedSupabase } from '../../lib/supabase';

// Use untyped supabase for RPC calls
const supabase = typedSupabase as any;

interface FoodEntryConfirmScreenProps {
  route: {
    params: {
      foodData: CreateFoodEntryInput;
      visionLogId?: string; // From food-analysis edge function
      onConfirm?: () => void;
    };
  };
  navigation: any;
}

export function FoodEntryConfirmScreen({ route, navigation }: FoodEntryConfirmScreenProps) {
  const { user } = useAuth();
  const { foodData: initialData, visionLogId, onConfirm } = route.params;

  const [foodData, setFoodData] = useState<CreateFoodEntryInput>(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (feedbackType: 'correct' | 'incorrect' | 'partial') => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Save the food entry
      const result = await FoodService.createFoodEntry(user.id, foodData);

      if (result.error) {
        showAlert.error('Error', result.error);
        return;
      }

      // Submit feedback for reinforcement learning
      if (visionLogId) {
        await submitFeedback(feedbackType);
      }

      // Add to recent foods
      await FoodService.addToRecentFoods(user.id, foodData.food_name);

      showAlert.success('Success', `Added ${foodData.food_name} - ${foodData.calories} kcal`);

      // Navigate back and refresh
      onConfirm?.();
      navigation.goBack();
    } catch (error) {
      logger.error('Failed to save food entry', error as Error);
      showAlert.error('Error', 'Failed to save food entry');
    } finally {
      setIsSaving(false);
    }
  };

  const submitFeedback = async (feedbackType: 'correct' | 'incorrect' | 'partial') => {
    if (!user || !visionLogId) return;

    try {
      const correctedNutrition =
        feedbackType !== 'correct'
          ? {
              calories: foodData.calories,
              protein_g: foodData.protein_g || 0,
              carbs_g: foodData.carbs_g || 0,
              fat_g: foodData.fat_g || 0,
              fiber_g: foodData.fiber_g || 0,
            }
          : null;

      await supabase.rpc('submit_food_correction', {
        p_vision_log_id: visionLogId,
        p_user_id: user.id,
        p_feedback_type: feedbackType,
        p_corrected_food_name: feedbackType !== 'correct' ? foodData.food_name : null,
        p_corrected_nutrition: correctedNutrition,
        p_correction_source: 'manual',
      } as any);

      logger.info('Feedback submitted', { feedbackType, visionLogId });
    } catch (error) {
      // Don't block saving if feedback fails
      logger.warn('Failed to submit feedback', { error });
    }
  };

  const handleConfirmCorrect = () => {
    Alert.alert(
      'Confirm Accuracy',
      'Is this nutrition information accurate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Accurate',
          onPress: () => handleSave('correct'),
        },
      ]
    );
  };

  const handleSaveEdited = () => {
    Alert.alert(
      'Save Changes',
      'You edited the data. Was the AI analysis mostly correct or completely wrong?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mostly Correct',
          onPress: () => handleSave('partial'),
        },
        {
          text: 'Completely Wrong',
          onPress: () => handleSave('incorrect'),
          style: 'destructive',
        },
      ]
    );
  };

  const updateField = (field: keyof CreateFoodEntryInput, value: any) => {
    setFoodData((prev) => ({ ...prev, [field]: value }));
    if (!isEditing) setIsEditing(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="x" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Food Entry</Text>
        <TouchableOpacity
          onPress={isEditing ? handleSaveEdited : handleConfirmCorrect}
          disabled={isSaving}
          style={styles.saveButton}
        >
          <Icon name="check" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Food Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Food Name</Text>
          <TextInput
            style={styles.input}
            value={foodData.food_name}
            onChangeText={(text) => updateField('food_name', text)}
            placeholder="Food name"
          />
        </View>

        {/* Serving Size */}
        <View style={styles.section}>
          <Text style={styles.label}>Serving Size</Text>
          <TextInput
            style={styles.input}
            value={foodData.serving_size || ''}
            onChangeText={(text) => updateField('serving_size', text)}
            placeholder="1 serving"
          />
        </View>

        {/* Calories - Large Display */}
        <View style={styles.caloriesSection}>
          <Text style={styles.caloriesLabel}>Calories</Text>
          <TextInput
            style={styles.caloriesInput}
            value={String(foodData.calories)}
            onChangeText={(text) => updateField('calories', Number(text) || 0)}
            keyboardType="numeric"
            placeholder="0"
          />
          <Text style={styles.caloriesUnit}>kcal</Text>
        </View>

        {/* Macronutrients Grid */}
        <View style={styles.macrosGrid}>
          <View style={styles.macroCard}>
            <Icon name="activity" size={20} color="#FF6B6B" />
            <Text style={styles.macroLabel}>Protein</Text>
            <TextInput
              style={styles.macroInput}
              value={foodData.protein_g ? String(foodData.protein_g) : ''}
              onChangeText={(text) => updateField('protein_g', Number(text) || undefined)}
              keyboardType="numeric"
              placeholder="0"
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>

          <View style={styles.macroCard}>
            <Icon name="zap" size={20} color="#FFD93D" />
            <Text style={styles.macroLabel}>Carbs</Text>
            <TextInput
              style={styles.macroInput}
              value={foodData.carbs_g ? String(foodData.carbs_g) : ''}
              onChangeText={(text) => updateField('carbs_g', Number(text) || undefined)}
              keyboardType="numeric"
              placeholder="0"
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>

          <View style={styles.macroCard}>
            <Icon name="droplet" size={20} color="#4ECDC4" />
            <Text style={styles.macroLabel}>Fat</Text>
            <TextInput
              style={styles.macroInput}
              value={foodData.fat_g ? String(foodData.fat_g) : ''}
              onChangeText={(text) => updateField('fat_g', Number(text) || undefined)}
              keyboardType="numeric"
              placeholder="0"
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>

          <View style={styles.macroCard}>
            <Icon name="feather" size={20} color="#95E1D3" />
            <Text style={styles.macroLabel}>Fiber</Text>
            <TextInput
              style={styles.macroInput}
              value={foodData.fiber_g ? String(foodData.fiber_g) : ''}
              onChangeText={(text) => updateField('fiber_g', Number(text) || undefined)}
              keyboardType="numeric"
              placeholder="0"
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>
        </View>

        {/* Feedback Notice */}
        {visionLogId && (
          <View style={styles.feedbackNotice}>
            <Icon name="info" size={16} color="#2196F3" />
            <Text style={styles.feedbackText}>
              {isEditing
                ? 'Your corrections help improve AI accuracy for everyone!'
                : 'Confirm if this analysis is accurate to help improve the AI.'}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isEditing ? (
            <TouchableOpacity
              style={styles.saveEditedButton}
              onPress={handleSaveEdited}
              disabled={isSaving}
            >
              <Icon name="save" size={20} color="#fff" />
              <Text style={styles.saveEditedText}>
                {isSaving ? 'Saving...' : 'Save Corrected Entry'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmCorrect}
              disabled={isSaving}
            >
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.confirmText}>
                {isSaving ? 'Saving...' : 'Looks Good - Save'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  caloriesSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFA8D2',
  },
  caloriesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  caloriesInput: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    minWidth: 150,
  },
  caloriesUnit: {
    fontSize: 20,
    color: '#666',
    marginTop: 8,
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  macroCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
  },
  macroInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    minWidth: 60,
  },
  macroUnit: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  feedbackNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  actions: {
    gap: 12,
    marginBottom: 32,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveEditedButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveEditedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

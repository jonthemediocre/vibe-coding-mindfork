/**
 * Enhanced Settings/Profile Screen
 * Complete profile management with editable onboarding data and goal recalculation
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Modal, TextInput, Platform } from 'react-native';
import { Screen, Card, Text, Button, PhoneInput, useThemeColors } from '../../ui';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import {
  updateUserProfile,
  convertHeight,
  convertWeight,
  validateProfileUpdate,
  getCompleteUserProfile
} from '../../services/ProfileUpdateService';
import type { UserProfile, UserProfileUpdate } from '../../types/profile';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

type EditField = 'age' | 'gender' | 'height' | 'weight' | 'target_weight' | 'primary_goal' | 'activity_level' | 'diet_type' | null;

const GENDER_OPTIONS = ['male', 'female', 'other'];
const GOAL_OPTIONS = ['lose_weight', 'gain_muscle', 'maintain', 'get_healthy'];
const ACTIVITY_OPTIONS = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'];
const DIET_OPTIONS = ['none', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'mediterranean'];

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Lose Weight',
  gain_muscle: 'Gain Muscle',
  maintain: 'Maintain Weight',
  get_healthy: 'Get Healthy'
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (little/no exercise)',
  lightly_active: 'Lightly Active (1-3 days/week)',
  moderately_active: 'Moderately Active (3-5 days/week)',
  very_active: 'Very Active (6-7 days/week)',
  extremely_active: 'Extremely Active (athlete)'
};

export function SettingsScreen({ navigation }: { navigation?: any }) {
  const { user, signOut } = useAuth();
  const colors = useThemeColors();
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<EditField>(null);
  const [editValue, setEditValue] = useState('');
  const [useImperial, setUseImperial] = useState(false);

  const hasPhoneChanged = phoneNumber !== (user?.phone_number || '');

  // Load complete profile
  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      console.log('[SettingsScreen] Loading profile for user:', user.id);

      const result = await getCompleteUserProfile(user.id);

      console.log('[SettingsScreen] Profile loaded:', {
        hasProfile: !!result,
        hasSettings: !!result?.settings,
        profileData: result?.profile ? {
          age: result.profile.age,
          gender: result.profile.gender,
          height_cm: result.profile.height_cm,
          weight_kg: result.profile.weight_kg,
          primary_goal: result.profile.primary_goal,
          activity_level: result.profile.activity_level,
          diet_type: result.profile.diet_type
        } : null
      });

      if (result) {
        setProfile(result.profile);
        setUseImperial(result.settings?.height_unit === 'ft' || false);
      } else {
        console.warn('[SettingsScreen] No profile data returned');
      }
    } catch (error) {
      console.error('[SettingsScreen] Failed to load profile:', error);
      logger.error('Failed to load profile', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePhone = async () => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length !== 11 || cleaned[0] !== '1') {
      Alert.alert('Invalid Phone Number', 'Please enter a valid US phone number');
      return;
    }

    try {
      setSaving(true);

      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase.auth.updateUser({
        data: {
          phone_number: phoneNumber,
        }
      });

      if (error) {
        throw error;
      }

      logger.info('Phone number updated from settings', {
        userId: user?.id,
        phone: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
      });

      Alert.alert('Saved!', 'Your phone number has been updated.');
    } catch (error: any) {
      logger.error('Failed to update phone number', error as Error);
      Alert.alert('Error', 'Failed to save phone number. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (field: EditField, currentValue: any) => {
    console.log('[SettingsScreen] Opening edit modal:', { field, currentValue });
    setEditingField(field);
    setEditValue(String(currentValue || ''));
  };

  const closeEditModal = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSaveField = async () => {
    if (!user?.id || !editingField) return;

    console.log('[SettingsScreen] Saving field:', { field: editingField, value: editValue });

    const updates: UserProfileUpdate = {};

    // Parse and validate the edit value
    switch (editingField) {
      case 'age':
        updates.age = parseInt(editValue);
        break;
      case 'gender':
        updates.gender = editValue as any;
        break;
      case 'height':
        updates.height_cm = parseFloat(editValue);
        break;
      case 'weight':
        updates.weight_kg = parseFloat(editValue);
        break;
      case 'target_weight':
        updates.target_weight_kg = parseFloat(editValue);
        break;
      case 'primary_goal':
        updates.primary_goal = editValue as any;
        break;
      case 'activity_level':
        updates.activity_level = editValue as any;
        break;
      case 'diet_type':
        updates.diet_type = editValue as any;
        break;
    }

    // Validate
    const validation = validateProfileUpdate(updates);
    if (!validation.valid) {
      Alert.alert('Invalid Input', validation.errors.join('\n'));
      return;
    }

    try {
      setSaving(true);

      const result = await updateUserProfile(user.id, updates);

      console.log('[SettingsScreen] Update result:', {
        success: result.success,
        hasProfile: !!result.profile,
        hasRecalculatedGoals: !!result.recalculatedGoals,
        error: result.error
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Update local state
      if (result.profile) {
        setProfile(result.profile);
      }

      // Show success with goal recalculation info
      if (result.recalculatedGoals) {
        Alert.alert(
          'Saved!',
          `Your profile has been updated.\n\nYour nutrition goals have been automatically recalculated:\n• Calories: ${result.recalculatedGoals.daily_calories}\n• Protein: ${result.recalculatedGoals.daily_protein_g}g\n• Carbs: ${result.recalculatedGoals.daily_carbs_g}g\n• Fat: ${result.recalculatedGoals.daily_fat_g}g`
        );
      } else {
        Alert.alert('Saved!', 'Your profile has been updated.');
      }

      closeEditModal();
    } catch (error: any) {
      console.error('[SettingsScreen] Save error:', error);
      logger.error('Failed to update profile field', error as Error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const renderEditableField = (
    label: string,
    value: string | number | undefined,
    field: EditField,
    icon: keyof typeof Ionicons.glyphMap
  ) => (
    <Pressable
      style={styles.editableRow}
      onPress={() => openEditModal(field, value)}
    >
      <View style={styles.fieldLeft}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
        <View style={styles.fieldTextContainer}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {label}
          </Text>
          <Text variant="body" style={!value ? styles.notSetText : undefined}>
            {value || 'Not set - tap to add'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </Pressable>
  );

  const renderEditModal = () => {
    if (!editingField) return null;

    const isPickerField = ['gender', 'primary_goal', 'activity_level', 'diet_type'].includes(editingField);
    const isNumericField = ['age', 'height', 'weight', 'target_weight'].includes(editingField);

    return (
      <Modal
        visible={true}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text variant="headingSmall">
                Edit {editingField.replace(/_/g, ' ')}
              </Text>
              <Pressable onPress={closeEditModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {isPickerField ? (
              <View style={[styles.pickerContainer, {
                backgroundColor: colors.surface,
                borderColor: colors.border
              }]}>
                <Picker
                  selectedValue={editValue}
                  onValueChange={setEditValue}
                  style={{ color: colors.text }}
                >
                  {editingField === 'gender' && GENDER_OPTIONS.map(opt => (
                    <Picker.Item key={opt} label={opt.charAt(0).toUpperCase() + opt.slice(1)} value={opt} />
                  ))}
                  {editingField === 'primary_goal' && GOAL_OPTIONS.map(opt => (
                    <Picker.Item key={opt} label={GOAL_LABELS[opt] || opt} value={opt} />
                  ))}
                  {editingField === 'activity_level' && ACTIVITY_OPTIONS.map(opt => (
                    <Picker.Item key={opt} label={ACTIVITY_LABELS[opt] || opt} value={opt} />
                  ))}
                  {editingField === 'diet_type' && DIET_OPTIONS.map(opt => (
                    <Picker.Item key={opt} label={opt.charAt(0).toUpperCase() + opt.slice(1)} value={opt} />
                  ))}
                </Picker>
              </View>
            ) : (
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={`Enter ${editingField.replace(/_/g, ' ')}`}
                placeholderTextColor={colors.textSecondary}
                keyboardType={isNumericField ? 'numeric' : 'default'}
                autoFocus
              />
            )}

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={closeEditModal}
                containerStyle={styles.modalButton}
              />
              <Button
                title="Save"
                variant="primary"
                onPress={handleSaveField}
                loading={saving}
                disabled={saving || !editValue}
                containerStyle={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Text variant="body" color={colors.textSecondary}>Loading profile...</Text>
        </View>
      </Screen>
    );
  }

  const formatGoal = (goal: string | undefined) => {
    if (!goal) return undefined;
    return GOAL_LABELS[goal] || goal;
  };

  const formatActivity = (activity: string | undefined) => {
    if (!activity) return undefined;
    return ACTIVITY_LABELS[activity] || activity;
  };

  const formatGender = (gender: string | undefined) => {
    if (!gender) return undefined;
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  const formatDiet = (diet: string | undefined) => {
    if (!diet) return undefined;
    return diet.charAt(0).toUpperCase() + diet.slice(1);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Basic Info Section */}
        <Card style={styles.card}>
          <Text variant="headingSmall" style={styles.sectionTitle}>
            Basic Information
          </Text>

          {renderEditableField(
            'Age',
            profile?.age,
            'age',
            'calendar-outline'
          )}

          {renderEditableField(
            'Gender',
            formatGender(profile?.gender),
            'gender',
            'person-outline'
          )}
        </Card>

        {/* Physical Metrics Section */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text variant="headingSmall">
              Physical Metrics
            </Text>
            <Pressable onPress={() => setUseImperial(!useImperial)}>
              <Text variant="bodySmall" color={colors.primary}>
                {useImperial ? 'ft/lbs' : 'cm/kg'}
              </Text>
            </Pressable>
          </View>

          {renderEditableField(
            'Height',
            profile?.height_cm
              ? useImperial
                ? convertHeight(profile.height_cm, 'ft').display
                : convertHeight(profile.height_cm, 'cm').display
              : undefined,
            'height',
            'resize-outline'
          )}

          {renderEditableField(
            'Current Weight',
            profile?.weight_kg
              ? useImperial
                ? convertWeight(profile.weight_kg, 'lbs').display
                : convertWeight(profile.weight_kg, 'kg').display
              : undefined,
            'weight',
            'fitness-outline'
          )}

          {renderEditableField(
            'Target Weight',
            profile?.target_weight_kg
              ? useImperial
                ? convertWeight(profile.target_weight_kg, 'lbs').display
                : convertWeight(profile.target_weight_kg, 'kg').display
              : undefined,
            'target_weight',
            'flag-outline'
          )}
        </Card>

        {/* Goals & Activity Section */}
        <Card style={styles.card}>
          <Text variant="headingSmall" style={styles.sectionTitle}>
            Goals & Activity
          </Text>

          {renderEditableField(
            'Primary Goal',
            formatGoal(profile?.primary_goal),
            'primary_goal',
            'trophy-outline'
          )}

          {renderEditableField(
            'Activity Level',
            formatActivity(profile?.activity_level),
            'activity_level',
            'walk-outline'
          )}

          {renderEditableField(
            'Diet Type',
            formatDiet(profile?.diet_type) || 'None',
            'diet_type',
            'nutrition-outline'
          )}

          <View style={[styles.infoBox, { marginTop: 12 }]}>
            <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.infoText}>
              Your diet type affects food color ratings (🟢🟡🔴). Foods are personalized to match your chosen diet!
            </Text>
          </View>
        </Card>

        {/* Calculated Nutrition Targets Section */}
        {profile?.daily_calories && (
          <Card style={styles.card}>
            <Text variant="headingSmall" style={styles.sectionTitle}>
              Daily Nutrition Targets (Auto)
            </Text>

            <Text variant="bodySmall" color={colors.textSecondary} style={styles.description}>
              These are automatically calculated based on your physical metrics and goals
            </Text>

            <View style={styles.targetsGrid}>
              <View style={styles.targetItem}>
                <Text variant="bodySmall" color={colors.textSecondary}>Calories</Text>
                <Text variant="headingSmall">{profile.daily_calories}</Text>
              </View>
              <View style={styles.targetItem}>
                <Text variant="bodySmall" color={colors.textSecondary}>Protein</Text>
                <Text variant="headingSmall">{profile.daily_protein_g}g</Text>
              </View>
              <View style={styles.targetItem}>
                <Text variant="bodySmall" color={colors.textSecondary}>Carbs</Text>
                <Text variant="headingSmall">{profile.daily_carbs_g}g</Text>
              </View>
              <View style={styles.targetItem}>
                <Text variant="bodySmall" color={colors.textSecondary}>Fat</Text>
                <Text variant="headingSmall">{profile.daily_fat_g}g</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text variant="bodySmall" color={colors.textSecondary} style={styles.infoText}>
                Your dashboard will automatically update to reflect these targets
              </Text>
            </View>
          </Card>
        )}

        {/* Profile Section */}
        <Card style={styles.card}>
          <Text variant="headingSmall" style={styles.sectionTitle}>
            Profile
          </Text>

          <View style={styles.profileInfo}>
            {user?.avatar_url && (
              <View style={[styles.avatar, { borderColor: colors.border }]}>
                <Text variant="headingLarge">{user.name?.[0] || user.email[0].toUpperCase()}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Name
              </Text>
              <Text variant="body">{user?.name || 'Not set'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Email
              </Text>
              <Text variant="body">{user?.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Subscription
              </Text>
              <Text variant="body">{user?.tier || 'Free'}</Text>
            </View>
          </View>
        </Card>

        {/* Phone Number Section */}
        <Card style={styles.card}>
          <Text variant="headingSmall" style={styles.sectionTitle}>
            Phone Number
          </Text>

          <Text variant="bodySmall" color={colors.textSecondary} style={styles.description}>
            Required for voice calls with your AI coach
          </Text>

          <View style={styles.phoneSection}>
            <PhoneInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+1 (555) 123-4567"
            />

            {hasPhoneChanged && (
              <Button
                title="Save Phone Number"
                variant="primary"
                onPress={handleSavePhone}
                disabled={saving || phoneNumber.replace(/\D/g, '').length !== 11}
                loading={saving}
                containerStyle={styles.saveButton}
              />
            )}
          </View>
        </Card>

        {/* Account Section */}
        <Card style={styles.card}>
          <Text variant="headingSmall" style={styles.sectionTitle}>
            Account
          </Text>

          <Button
            title="Developer Tools"
            variant="outline"
            onPress={() => navigation?.navigate('DevTools')}
            containerStyle={styles.devToolsButton}
          />

          <Button
            title="Database Migration"
            variant="outline"
            onPress={() => navigation?.navigate('MigrationCheck')}
            containerStyle={styles.devToolsButton}
          />

          <Button
            title="Sign Out"
            variant="outline"
            onPress={handleSignOut}
            containerStyle={styles.signOutButton}
          />
        </Card>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.appVersion}>
            MindFork v1.0.0
          </Text>
        </View>
      </ScrollView>

      {renderEditModal()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  editableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fieldTextContainer: {
    gap: 4,
    flex: 1,
  },
  notSetText: {
    fontStyle: 'italic',
    opacity: 0.6,
  },
  targetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  targetItem: {
    flex: 1,
    minWidth: '45%',
    gap: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  profileInfo: {
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  infoRow: {
    gap: 4,
  },
  description: {
    marginBottom: 16,
    lineHeight: 20,
  },
  phoneSection: {
    gap: 12,
  },
  saveButton: {
    marginTop: 4,
  },
  devToolsButton: {
    marginBottom: 8,
  },
  signOutButton: {
    marginTop: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appVersion: {
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 20,
  },
  pickerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});

export default SettingsScreen;

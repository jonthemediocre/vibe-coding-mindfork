/**
 * Phone Number Onboarding Screen
 * Collects phone number from new users who signed up via OAuth
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Screen, Card, Text, Button, PhoneInput, useThemeColors } from '../../ui';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';

export interface PhoneOnboardingScreenProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function PhoneOnboardingScreen({ onComplete, onSkip }: PhoneOnboardingScreenProps) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    // Validate phone number
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 11 || cleaned[0] !== '1') {
      Alert.alert('Invalid Phone Number', 'Please enter a valid US phone number');
      return;
    }

    try {
      setLoading(true);

      // Update user metadata with phone number
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase.auth.updateUser({
        data: {
          phone_number: phone,
        }
      });

      if (error) {
        throw error;
      }

      logger.info('Phone number added during onboarding', {
        userId: user?.id,
        phone: phone.replace(/\d(?=\d{4})/g, '*'), // Masked for privacy
      });

      Alert.alert(
        'Phone Number Saved!',
        'You can now receive calls from your AI coach.',
        [
          {
            text: 'OK',
            onPress: onComplete,
          },
        ]
      );
    } catch (error: any) {
      logger.error('Failed to save phone number', error as Error);
      Alert.alert('Error', 'Failed to save phone number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Phone Number?',
      'You won\'t be able to receive calls from your AI coach without a phone number.',
      [
        {
          text: 'Add Phone Number',
          style: 'cancel',
        },
        {
          text: 'Skip for Now',
          style: 'destructive',
          onPress: onSkip,
        },
      ]
    );
  };

  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text variant="headingLarge" style={styles.title}>
          📞 Add Your Phone Number
        </Text>

        <Text variant="body" color={colors.textSecondary} style={styles.description}>
          Enable voice calling with your AI coach. Your coach can call you for check-ins, reminders, and support.
        </Text>

        <Card style={styles.card}>
          <View style={styles.benefitsContainer}>
            <View style={styles.benefit}>
              <Text variant="body">✓ Real-time voice coaching</Text>
            </View>
            <View style={styles.benefit}>
              <Text variant="body">✓ Personalized check-ins</Text>
            </View>
            <View style={styles.benefit}>
              <Text variant="body">✓ Emergency support calls</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.inputCard}>
          <Text variant="titleSmall" style={styles.inputLabel}>
            Your Phone Number
          </Text>

          <PhoneInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 (555) 123-4567"
            autoFocus
          />

          <Text variant="bodySmall" color={colors.textSecondary} style={styles.privacyNote}>
            🔒 Your phone number is kept private and only used for AI coach calls
          </Text>
        </Card>

        <Button
          title="Save Phone Number"
          variant="primary"
          onPress={handleSave}
          disabled={loading || phone.replace(/\D/g, '').length !== 11}
          loading={loading}
          containerStyle={styles.saveButton}
        />

        <Button
          title="Skip for Now"
          variant="ghost"
          onPress={handleSkip}
          disabled={loading}
          containerStyle={styles.skipButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    padding: 16,
    marginBottom: 20,
  },
  benefitsContainer: {
    gap: 12,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputCard: {
    padding: 20,
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 12,
  },
  privacyNote: {
    marginTop: 8,
    lineHeight: 18,
  },
  saveButton: {
    marginBottom: 12,
  },
  skipButton: {
    marginBottom: 8,
  },
});

export default PhoneOnboardingScreen;

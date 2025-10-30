/**
 * Settings/Profile Screen
 * Allows users to view and edit their profile including phone number
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Screen, Card, Text, Button, PhoneInput, useThemeColors } from '../../ui';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';

export function SettingsScreen({ navigation }: { navigation?: any }) {
  const { user, signOut } = useAuth();
  const colors = useThemeColors();
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [saving, setSaving] = useState(false);

  const hasPhoneChanged = phoneNumber !== (user?.phone_number || '');

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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
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
});

export default SettingsScreen;

import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Screen, Text, Button } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { resetOnboardingStatus } from '../services/OnboardingAgentService';
import { supabase } from '../lib/supabase';

/**
 * Developer Tools Screen
 *
 * Provides utilities for debugging and resetting app state.
 * This screen should only be accessible in development or for testing.
 */
export const DevToolsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const [isResetting, setIsResetting] = useState(false);

  const handleResetOnboarding = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No user ID found. Please log in first.');
      return;
    }

    Alert.alert(
      'Reset Onboarding',
      'This will reset your onboarding status and you will need to complete onboarding again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              console.log('[DevTools] Resetting onboarding for user:', user.id);

              // Use authenticated session to update profile
              const { error } = await supabase
                .from('profiles')
                .update({
                  onboarding_completed: false,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id);

              if (error) {
                console.error('[DevTools] Error resetting onboarding:', error);
                Alert.alert(
                  'Error',
                  `Failed to reset onboarding: ${error.message}\n\nThis might be due to Row Level Security policies. You may need to run the SQL script manually in Supabase dashboard.`
                );
                return;
              }

              console.log('[DevTools] Onboarding reset successful');

              // Refresh profile to trigger navigation
              await refreshProfile();

              Alert.alert(
                'Success',
                'Onboarding has been reset. The app will now navigate to onboarding.',
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              console.error('[DevTools] Error:', error);
              Alert.alert('Error', error.message || 'Unknown error occurred');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will sign you out and clear all cached data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              Alert.alert('Success', 'Cache cleared. Please log in again.');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <ScrollView className="flex-1 px-4 py-6">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Developer Tools
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Debug utilities and state management tools
          </Text>
        </View>

        {/* User Info */}
        <View className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            User Information
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300 mb-1">
            User ID: {user?.id || 'Not logged in'}
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300 mb-1">
            Email: {user?.email || 'N/A'}
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            Onboarding Complete: {profile?.onboarding_completed ? 'Yes' : 'No'}
          </Text>
        </View>

        {/* Onboarding Tools */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Onboarding
          </Text>

          <Button
            title={isResetting ? "Resetting..." : "Reset Onboarding Status"}
            onPress={handleResetOnboarding}
            disabled={isResetting || !user}
            variant="outline"
            containerStyle={{ marginBottom: 12 }}
          />

          <View className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Text className="text-xs text-yellow-800 dark:text-yellow-200">
              This will set onboarding_completed to false and trigger the onboarding flow again.
            </Text>
          </View>
        </View>

        {/* Database Tools */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Database
          </Text>

          <Button
            title="View Profile Data"
            onPress={() => {
              console.log('[DevTools] Current profile:', profile);
              Alert.alert(
                'Profile Data',
                JSON.stringify(profile, null, 2),
                [{ text: 'OK' }]
              );
            }}
            variant="outline"
            containerStyle={{ marginBottom: 12 }}
          />

          <Button
            title="Refresh Profile"
            onPress={async () => {
              await refreshProfile();
              Alert.alert('Success', 'Profile refreshed');
            }}
            variant="outline"
            containerStyle={{ marginBottom: 12 }}
          />
        </View>

        {/* Auth Tools */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Authentication
          </Text>

          <Button
            title="Clear Cache & Sign Out"
            onPress={handleClearCache}
            variant="outline"
            containerStyle={{ marginBottom: 12 }}
          />
        </View>

        {/* Navigation */}
        <View className="mb-6">
          <Button
            title="Back to Settings"
            onPress={() => navigation.goBack()}
            variant="primary"
          />
        </View>

        {/* Warning */}
        <View className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <Text className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
            ⚠️ Developer Tools
          </Text>
          <Text className="text-xs text-red-700 dark:text-red-300">
            These tools are for debugging purposes only. Use with caution as they can affect your app data.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
};

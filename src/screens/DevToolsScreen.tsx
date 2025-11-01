import React, { useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Screen, Text, Button } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { resetOnboardingStatus } from '../services/OnboardingAgentService';
import { supabase } from '../lib/supabase';
import { CoachTestingService } from '../services/testing/CoachTestingService';
import { FoodAnalyzerTestingService } from '../services/testing/FoodAnalyzerTestingService';
import { ContinuousImprovementService } from '../services/testing/ContinuousImprovementService';
import { MetabolicAdaptationService } from '../services/MetabolicAdaptationService';

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
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<string>('');

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

        {/* AI Testing Section */}
        <View className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            🧪 AI Testing & Quality Assurance
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Test AI coaches and food analyzer for safety and accuracy
          </Text>

          {/* Test AI Coaches */}
          <Button
            title={testRunning ? "⏳ Testing Coaches..." : "🤖 Test AI Coaches"}
            onPress={async () => {
              if (testRunning) return;
              setTestRunning(true);
              setTestResults('Running coach tests...\nThis may take 30-60 seconds...');

              try {
                console.log('[DevTools] Starting coach tests...');
                const results = await CoachTestingService.runFullTestSuite();
                const summary = `✅ Coach Tests Complete!\n\nPassed: ${results.passed}/${results.total}\nSuccess Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n\nAverage Scores:\n- Safety: ${results.summary.safety_avg}\n- Personality: ${results.summary.personality_avg}\n- Goal Alignment: ${results.summary.goal_alignment_avg}`;
                setTestResults(summary);
                Alert.alert('Tests Complete', summary);
              } catch (error: any) {
                console.error('[DevTools] Coach test error:', error);
                const errorMsg = `Error: ${error.message || String(error)}`;
                setTestResults(errorMsg);
                Alert.alert('Error', errorMsg);
              } finally {
                setTestRunning(false);
              }
            }}
            disabled={testRunning}
            variant={testRunning ? 'outline' : 'primary'}
            containerStyle={{ marginBottom: 12 }}
          />

          {/* Test Food Analyzer */}
          <Button
            title={testRunning ? "⏳ Testing Food..." : "🍕 Test Food Analyzer"}
            onPress={async () => {
              if (testRunning) return;
              setTestRunning(true);
              setTestResults('Running food analyzer tests...\nThis may take 30-60 seconds...');

              try {
                console.log('[DevTools] Starting food tests...');
                const results = await FoodAnalyzerTestingService.runFullTestSuite();
                const summary = `✅ Food Tests Complete!\n\nPassed: ${results.passed}/${results.total}\n\nAccuracy Metrics:\n- Calorie Error: ${results.avg_calorie_error.toFixed(1)}%\n- Macro Error: ${results.avg_macro_error.toFixed(1)}%\n- Allergen Detection: ${results.allergen_accuracy.toFixed(1)}%`;
                setTestResults(summary);
                Alert.alert('Tests Complete', summary);
              } catch (error: any) {
                console.error('[DevTools] Food test error:', error);
                const errorMsg = `Error: ${error.message || String(error)}`;
                setTestResults(errorMsg);
                Alert.alert('Error', errorMsg);
              } finally {
                setTestRunning(false);
              }
            }}
            disabled={testRunning}
            variant={testRunning ? 'outline' : 'primary'}
            containerStyle={{ marginBottom: 12 }}
          />

          {/* Run Full Daily Tests */}
          <Button
            title={testRunning ? "⏳ Running Full Suite..." : "🔄 Run Full Daily Tests"}
            onPress={async () => {
              if (testRunning) return;
              setTestRunning(true);
              setTestResults('Running full test suite...\nThis may take 1-2 minutes...');

              try {
                console.log('[DevTools] Starting daily tests...');
                const report = await ContinuousImprovementService.runDailyTests();
                const summary = `✅ Full Suite Complete!\n\nOverall Health: ${report.overall_health}%\nTotal Tests: ${report.total_tests}\nPassed: ${report.tests_passed}\nFailed: ${report.tests_failed}\nCritical Failures: ${report.critical_failures}`;
                setTestResults(summary);
                Alert.alert('Tests Complete', summary);
              } catch (error: any) {
                console.error('[DevTools] Daily test error:', error);
                const errorMsg = `Error: ${error.message || String(error)}`;
                setTestResults(errorMsg);
                Alert.alert('Error', errorMsg);
              } finally {
                setTestRunning(false);
              }
            }}
            disabled={testRunning}
            variant={testRunning ? 'outline' : 'primary'}
            containerStyle={{ marginBottom: 12 }}
          />

          {/* View Trends */}
          <Button
            title="📊 View 30-Day Trends"
            onPress={async () => {
              if (testRunning) return;
              setTestRunning(true);

              try {
                console.log('[DevTools] Analyzing trends...');
                const trends = await ContinuousImprovementService.analyzeTrends(30);
                const summary = `📈 30-Day Trends\n\nAvg Health: ${trends.avg_health.toFixed(1)}%\nRecent Health: ${trends.recent_health.toFixed(1)}%\nTrend: ${trends.trend}\n\nCritical Issues: ${trends.critical_issues.length}\nRecommendations: ${trends.recommendations.length}`;
                Alert.alert('Trend Analysis', summary);
              } catch (error: any) {
                console.error('[DevTools] Trend analysis error:', error);
                Alert.alert('Error', error.message || String(error));
              } finally {
                setTestRunning(false);
              }
            }}
            disabled={testRunning}
            variant="outline"
            containerStyle={{ marginBottom: 12 }}
          />

          {/* Test Metabolic Adaptation */}
          <Button
            title={testRunning ? "⏳ Testing..." : "🔥 Test Metabolic Adaptation"}
            onPress={async () => {
              if (testRunning || !user?.id) return;
              setTestRunning(true);
              setTestResults('Checking for metabolic adaptation...');

              try {
                console.log('[DevTools] Testing metabolic adaptation...');
                const result = await MetabolicAdaptationService.detectAdaptation(user.id);

                if (result?.adapted) {
                  const summary = `✅ Adaptation Detected!\n\nType: ${result.type}\nMagnitude: ${(result.magnitude * 100).toFixed(1)}%\nOld Calories: ${result.oldCalories}\nNew Calories: ${result.newCalories}\nConfidence: ${(result.confidence * 100).toFixed(0)}%\n\nCoach Explanation:\n${result.coachExplanation.substring(0, 200)}...`;
                  setTestResults(summary);
                  Alert.alert('Adaptation Detected!', summary);
                } else {
                  const summary = '❌ No Adaptation Detected\n\nNeed at least 3 weeks of consistent weight + food logging to detect metabolic adaptation.\n\nTip: Run the synthetic data script in the migration file to test with fake data.';
                  setTestResults(summary);
                  Alert.alert('No Adaptation', summary);
                }
              } catch (error: any) {
                console.error('[DevTools] Metabolic adaptation test error:', error);
                const errorMsg = `Error: ${error.message || String(error)}`;
                setTestResults(errorMsg);
                Alert.alert('Error', errorMsg);
              } finally {
                setTestRunning(false);
              }
            }}
            disabled={testRunning || !user?.id}
            variant="secondary"
            containerStyle={{ marginBottom: 12 }}
          />

          {/* Test Results Display */}
          {testResults !== '' && (
            <View className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
              <Text className="text-xs font-mono text-gray-800 dark:text-gray-200">
                {testResults}
              </Text>
            </View>
          )}

          {/* Instructions */}
          <View className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Text className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
              📋 First Time Setup Required
            </Text>
            <Text className="text-xs text-yellow-700 dark:text-yellow-300">
              Before running tests, you must run the database migration in Supabase Dashboard:{'\n\n'}
              1. Go to Supabase SQL Editor{'\n'}
              2. Copy/paste: database/migrations/ai_testing_schema.sql{'\n'}
              3. Click Run{'\n\n'}
              See AUTOMATED_AI_TESTING_PLAN.md for details.
            </Text>
          </View>
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

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkMigrationStatus } from '../services/MigrationService';

export default function MigrationCheckScreen() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{
    recipesExists: boolean;
    ingredientsExists: boolean;
    columnsExist: boolean;
    migrationComplete: boolean;
    error?: string;
  } | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    const result = await checkMigrationStatus();
    setStatus(result);
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1 px-4">
        <View className="py-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Database Migration Status
          </Text>
          <Text className="text-sm text-gray-600 mb-6">
            Checking if recipes and ingredients tables exist
          </Text>

          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#6366f1" />
              <Text className="text-gray-600 mt-4">Checking database...</Text>
            </View>
          ) : status ? (
            <>
              <View className="bg-gray-50 rounded-lg p-4 mb-4">
                <View className="flex-row items-center mb-3">
                  <Text className="text-lg mr-2">
                    {status.recipesExists ? '✅' : '❌'}
                  </Text>
                  <Text className="text-base text-gray-900">
                    Recipes Table: {status.recipesExists ? 'EXISTS' : 'NOT FOUND'}
                  </Text>
                </View>

                <View className="flex-row items-center mb-3">
                  <Text className="text-lg mr-2">
                    {status.ingredientsExists ? '✅' : '❌'}
                  </Text>
                  <Text className="text-base text-gray-900">
                    Recipe Ingredients Table: {status.ingredientsExists ? 'EXISTS' : 'NOT FOUND'}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Text className="text-lg mr-2">
                    {status.columnsExist ? '✅' : '❌'}
                  </Text>
                  <Text className="text-base text-gray-900">
                    Planned Meals Columns: {status.columnsExist ? 'EXISTS' : 'NOT FOUND'}
                  </Text>
                </View>
              </View>

              {status.migrationComplete ? (
                <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <Text className="text-lg font-semibold text-green-900 mb-2">
                    ✅ Migration Complete!
                  </Text>
                  <Text className="text-sm text-green-800">
                    All database tables and columns are ready. Recipe features are enabled.
                  </Text>
                </View>
              ) : (
                <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <Text className="text-lg font-semibold text-yellow-900 mb-3">
                    ⚠️ Migration Required
                  </Text>
                  <Text className="text-sm text-yellow-800 mb-4">
                    The database needs to be updated to enable recipe and shopping list features.
                  </Text>

                  <Text className="text-sm font-semibold text-gray-900 mb-2">
                    How to run the migration:
                  </Text>
                  <View className="bg-white rounded p-3 mb-3">
                    <Text className="text-xs text-gray-700 mb-2">
                      1. Go to your Supabase Dashboard
                    </Text>
                    <Text className="text-xs text-gray-700 mb-2">
                      2. Navigate to SQL Editor (left sidebar)
                    </Text>
                    <Text className="text-xs text-gray-700 mb-2">
                      3. Open file: database/migrations/20250102_add_recipes_and_ingredients.sql
                    </Text>
                    <Text className="text-xs text-gray-700 mb-2">
                      4. Copy all SQL content
                    </Text>
                    <Text className="text-xs text-gray-700 mb-2">
                      5. Paste into SQL Editor and click "Run"
                    </Text>
                  </View>

                  <Text className="text-xs text-gray-600 italic">
                    After running the migration, come back here and tap "Refresh Status" to verify.
                  </Text>
                </View>
              )}

              <Pressable
                onPress={checkStatus}
                className="bg-indigo-600 rounded-lg py-3 px-4 items-center active:bg-indigo-700"
              >
                <Text className="text-white font-semibold text-base">
                  Refresh Status
                </Text>
              </Pressable>

              {status.error && (
                <View className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <Text className="text-sm font-semibold text-red-900 mb-1">Error:</Text>
                  <Text className="text-xs text-red-800">{status.error}</Text>
                </View>
              )}
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

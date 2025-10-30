import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text } from '../../ui';
import { useTheme } from '../../app-components/components/ThemeProvider';
import {
  generateWelcomeImage,
  getShareMessage,
} from '../../services/WelcomeImageService';

interface ShareableImageScreenProps {
  navigation: any;
  route: {
    params: {
      userPhotoUri: string;
      userName: string;
      userGoal?: string;
    };
  };
}

const { width } = Dimensions.get('window');

export const ShareableImageScreen: React.FC<ShareableImageScreenProps> = ({
  navigation,
  route,
}) => {
  const { theme } = useTheme();
  const { userPhotoUri, userName, userGoal } = route.params;

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    generateWelcomeImageAsync();
  }, []);

  const generateWelcomeImageAsync = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const imageUrl = await generateWelcomeImage({
        userPhotoUri,
        userName,
        userGoal,
      });

      setGeneratedImageUrl(imageUrl);
    } catch (err) {
      console.error('Error generating welcome image:', err);
      setError('Failed to create your welcome image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!generatedImageUrl) return;

    try {
      setIsSaving(true);

      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need permission to save images to your photo library.'
        );
        setIsSaving(false);
        return;
      }

      // Download the image
      const fileUri = `${FileSystem.cacheDirectory}mindfork-welcome-${Date.now()}.png`;
      const downloadResult = await FileSystem.downloadAsync(generatedImageUrl, fileUri);

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(downloadResult.uri);

      Alert.alert(
        'Success! 📸',
        'Your welcome image has been saved to your photo library.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Error saving image:', err);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!generatedImageUrl) return;

    try {
      const message = getShareMessage(userName, userGoal);

      await Share.share({
        message,
        url: generatedImageUrl,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleContinue = () => {
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const handleSkip = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <Screen
      scrollable
      safeAreaEdges={['top', 'bottom']}
      style={{ backgroundColor: theme.colors.background }}
    >
      <View className="flex-1 px-6 py-8">
        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-center mb-3">
            Welcome to MindFork! 🎉
          </Text>
          <Text className="text-base text-center text-gray-600 dark:text-gray-400">
            We created a special image for you to share your wellness journey!
          </Text>
        </View>

        {/* Image Container */}
        <View
          className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden mb-8"
          style={{
            width: width - 48,
            height: width - 48,
            alignSelf: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {isGenerating ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text className="text-center mt-4 text-gray-600 dark:text-gray-400">
                Creating your welcome image...
              </Text>
              <Text className="text-center mt-2 text-sm text-gray-500 dark:text-gray-500">
                This may take 10-15 seconds
              </Text>
            </View>
          ) : error ? (
            <View className="flex-1 items-center justify-center p-6">
              <Ionicons
                name="alert-circle-outline"
                size={64}
                color={theme.colors.error}
              />
              <Text className="text-center mt-4 text-gray-700 dark:text-gray-300">
                {error}
              </Text>
              <Pressable
                onPress={generateWelcomeImageAsync}
                className="mt-6 px-6 py-3 rounded-xl"
                style={{ backgroundColor: theme.colors.primary }}
              >
                <Text className="text-white font-semibold">Try Again</Text>
              </Pressable>
            </View>
          ) : generatedImageUrl ? (
            <Image
              source={{ uri: generatedImageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : null}
        </View>

        {/* Action Buttons */}
        {generatedImageUrl && !error && (
          <View className="space-y-3">
            {/* Share Button */}
            <Pressable
              onPress={handleShare}
              className="flex-row items-center justify-center py-4 rounded-2xl"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Ionicons name="share-social" size={24} color="white" />
              <Text className="text-white font-bold text-lg ml-2">
                Share on Social Media
              </Text>
            </Pressable>

            {/* Save Button */}
            <Pressable
              onPress={handleSaveToGallery}
              disabled={isSaving}
              className="flex-row items-center justify-center py-4 rounded-2xl border-2"
              style={{
                borderColor: theme.colors.primary,
                backgroundColor: 'transparent',
              }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons
                    name="download-outline"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text
                    className="font-bold text-lg ml-2"
                    style={{ color: theme.colors.primary }}
                  >
                    Save to Photos
                  </Text>
                </>
              )}
            </Pressable>

            {/* Continue Button */}
            <Pressable
              onPress={handleContinue}
              className="py-4 rounded-2xl mt-4"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <Text
                className="text-center font-semibold text-base"
                style={{ color: theme.colors.primary }}
              >
                Continue to App
              </Text>
            </Pressable>
          </View>
        )}

        {/* Skip Link */}
        <Pressable onPress={handleSkip} className="mt-6 py-3">
          <Text className="text-center text-gray-500 dark:text-gray-500">
            Skip for now
          </Text>
        </Pressable>

        {/* Promo Message */}
        <View className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <Text className="text-sm text-center text-gray-700 dark:text-gray-300">
            💡 Sharing helps promote MindFork and inspires others to start their
            wellness journey!
          </Text>
        </View>
      </View>
    </Screen>
  );
};

export default ShareableImageScreen;

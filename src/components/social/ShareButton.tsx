/**
 * ShareButton - Platform-specific sharing button
 *
 * Supports:
 * - Instagram Stories
 * - Twitter/X
 * - Facebook
 * - Generic sharing (SMS, email, etc.)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../app-components/components/ThemeProvider';
import type { ProgressCardData } from '../../hooks/useProgressCard';

interface ShareButtonProps {
  onGenerateImage: () => Promise<string | null>;
  isGenerating: boolean;
  cardData: ProgressCardData;
}

type SharePlatform = 'instagram' | 'twitter' | 'facebook' | 'generic';

const ShareButton: React.FC<ShareButtonProps> = ({ onGenerateImage, isGenerating, cardData }) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async (platform: SharePlatform) => {
    if (isGenerating || isSharing) return;

    try {
      setIsSharing(true);

      // Generate the image
      const imageUri = await onGenerateImage();
      if (!imageUri) {
        Alert.alert('Error', 'Failed to generate image. Please try again.');
        return;
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      switch (platform) {
        case 'instagram':
          await shareToInstagram(imageUri);
          break;
        case 'twitter':
          await shareToTwitter(imageUri);
          break;
        case 'facebook':
          await shareToFacebook(imageUri);
          break;
        case 'generic':
          await shareGeneric(imageUri);
          break;
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const shareToInstagram = async (imageUri: string) => {
    // Note: Instagram Stories sharing requires the Instagram app
    // On iOS, you can use custom URL schemes
    // On Android, you can use intents
    // For now, we'll use generic sharing which will show Instagram as an option
    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share to Instagram',
    });
  };

  const shareToTwitter = async (imageUri: string) => {
    const { dailyStats, totalProgress, elapsedHours } = cardData;
    const tweetText = `My #MindFork progress today:\n${dailyStats?.total_calories || 0} calories logged\n${totalProgress}% of my goals complete\n${Math.floor(elapsedHours)}h fasting\n\nJoin me on my health journey! 💪`;

    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: tweetText,
    });
  };

  const shareToFacebook = async (imageUri: string) => {
    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share to Facebook',
    });
  };

  const shareGeneric = async (imageUri: string) => {
    const { dailyStats, totalProgress } = cardData;
    const message = `Check out my MindFork progress! 🎯\n${dailyStats?.total_calories || 0} calories | ${totalProgress}% goals complete`;

    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: message,
    });
  };

  const platforms: Array<{ id: SharePlatform; label: string; icon: string; color: string }> = [
    { id: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
    { id: 'twitter', label: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
    { id: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#4267B2' },
    { id: 'generic', label: 'More', icon: 'share-social', color: colors.primary },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Share Your Progress
      </Text>

      {(isGenerating || isSharing) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {isGenerating ? 'Generating image...' : 'Preparing to share...'}
          </Text>
        </View>
      )}

      <View style={styles.platformsGrid}>
        {platforms.map((platform) => (
          <TouchableOpacity
            key={platform.id}
            style={[
              styles.platformButton,
              { backgroundColor: colors.surface },
            ]}
            onPress={() => handleShare(platform.id)}
            disabled={isGenerating || isSharing}
          >
            <View style={[styles.iconContainer, { backgroundColor: platform.color }]}>
              <Ionicons name={platform.icon as any} size={28} color="#fff" />
            </View>
            <Text style={[styles.platformLabel, { color: colors.text }]}>
              {platform.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Choose a platform to share your progress card
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  loadingOverlay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  platformButton: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default ShareButton;

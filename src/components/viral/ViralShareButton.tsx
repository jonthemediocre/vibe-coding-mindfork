/**
 * Viral Share Button Component
 *
 * Beautiful, engaging button for sharing achievements via NANO-BANANA
 * Includes haptic feedback for premium feel
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image, Share, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { quickShareAchievement, getReferralStats } from '../../services/NanoBananaService';
import { useAuth } from '../../contexts/AuthContext';

interface ViralShareButtonProps {
  achievementText: string;
  coachName: string;
  variant?: 'primary' | 'secondary' | 'minimal';
  userPhotoUri?: string;
  onShareComplete?: () => void;
}

export const ViralShareButton: React.FC<ViralShareButtonProps> = ({
  achievementText,
  coachName,
  variant = 'primary',
  userPhotoUri,
  onShareComplete,
}) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [referralStats, setReferralStats] = useState<{ totalReferrals: number; freeMonthsEarned: number } | null>(null);

  const handleShare = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to share');
      return;
    }

    // Heavy haptic for important action
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      setIsGenerating(true);

      // Generate the NANO-BANANA viral image
      const result = await quickShareAchievement(
        user.id,
        coachName,
        achievementText,
        userPhotoUri
      );

      // Success haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Share the image
      await Share.share({
        message: `${achievementText}\n\nJoin me on MindFork! Use code ${result.referralCode} for a special bonus.\n\n${result.shareUrl}`,
        url: result.imageUri,
        title: 'My MindFork Achievement',
      });

      // Load referral stats to show user their progress
      const stats = await getReferralStats(user.id);
      setReferralStats(stats);

      onShareComplete?.();

    } catch (error: any) {
      console.error('[ViralShare] Error:', error);

      // Error haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Alert.alert('Error', 'Failed to create shareable image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (variant === 'minimal') {
    return (
      <Pressable
        onPress={handleShare}
        disabled={isGenerating}
        className="flex-row items-center justify-center py-2"
      >
        {isGenerating ? (
          <ActivityIndicator size="small" color="#10B981" />
        ) : (
          <>
            <Feather name="share-2" size={18} color="#10B981" />
            <Text className="ml-2 text-green-600 dark:text-green-400 font-semibold">
              Share Achievement
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={handleShare}
        disabled={isGenerating}
        className="border-2 border-green-500 rounded-xl py-3 px-6 active:opacity-70"
      >
        <View className="flex-row items-center justify-center">
          {isGenerating ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <>
              <Feather name="share-2" size={20} color="#10B981" />
              <Text className="ml-2 text-green-600 dark:text-green-400 font-bold text-base">
                Share & Earn
              </Text>
            </>
          )}
        </View>
        {referralStats && referralStats.totalReferrals > 0 && (
          <Text className="text-center text-xs text-gray-600 dark:text-gray-400 mt-1">
            {referralStats.freeMonthsEarned} free months earned!
          </Text>
        )}
      </Pressable>
    );
  }

  // Primary variant - big, beautiful, eye-catching
  return (
    <Pressable
      onPress={handleShare}
      disabled={isGenerating}
      className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl py-4 px-8 shadow-lg active:opacity-90"
    >
      <View className="items-center">
        {isGenerating ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <>
            <View className="flex-row items-center mb-2">
              <Feather name="share-2" size={24} color="#FFFFFF" />
              <Text className="ml-3 text-white font-bold text-xl">
                Share Your Success
              </Text>
            </View>
            <Text className="text-white/90 text-sm text-center mb-2">
              Create a custom image with your AI coach
            </Text>
            {referralStats && (
              <View className="bg-white/20 rounded-full px-4 py-1">
                <Text className="text-white font-semibold text-xs">
                  {referralStats.totalReferrals} friends invited • {referralStats.freeMonthsEarned} months free
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
};

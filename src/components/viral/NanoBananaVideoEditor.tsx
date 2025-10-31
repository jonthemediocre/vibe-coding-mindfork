/**
 * NANO-BANANA Video Editor Component
 *
 * CapCut-style video editor for creating viral wellness content
 * Simple, beautiful, mobile-first design
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, Share, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import {
  getVideoTemplates,
  createNanoBananaVideo,
  VideoTemplate,
  NanoBananaVideoConfig
} from '../../services/NanoBananaVideoService';
import { generateReferralCode } from '../../services/NanoBananaService';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

interface VideoEditorProps {
  achievementData: {
    metric: string;
    before: number;
    after: number;
    timeframe: string;
  };
  coachName: string;
  userPhotoUri?: string;
  onClose: () => void;
}

export const NanoBananaVideoEditor: React.FC<VideoEditorProps> = ({
  achievementData,
  coachName,
  userPhotoUri,
  onClose,
}) => {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const templates = getVideoTemplates();

  const handleTemplateSelect = async (template: VideoTemplate) => {
    // Selection haptic
    await Haptics.selectionAsync();
    setSelectedTemplate(template);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !user?.id) return;

    // Heavy haptic for important action
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      setIsGenerating(true);

      const referralCode = await generateReferralCode(user.id);

      const config: NanoBananaVideoConfig = {
        userId: user.id,
        templateId: selectedTemplate.id,
        userPhotoUri,
        achievementData,
        referralCode,
      };

      const result = await createNanoBananaVideo(config);

      // Success haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setPreviewUri(result.videoUri);

    } catch (error: any) {
      console.error('[VideoEditor] Error:', error);

      // Error haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Alert.alert('Error', 'Failed to generate video. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!previewUri || !selectedTemplate) return;

    // Medium haptic
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const referralCode = await generateReferralCode(user?.id || '');
    const shareUrl = `https://mindfork.app/join?ref=${referralCode}`;

    await Share.share({
      message: `🔥 My wellness journey!\n\nJoin me on MindFork - Use code ${referralCode} for a bonus!\n\n${shareUrl}`,
      url: previewUri,
      title: 'My MindFork Transformation',
    });

    // Success haptic
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <Pressable onPress={onClose} className="p-2">
          <Feather name="x" size={24} color="#6B7280" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          Create Video
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {!selectedTemplate ? (
        // Template Selection
        <ScrollView className="flex-1 px-4 py-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Choose a Style
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 mb-6">
            Pick a template for your viral video
          </Text>

          {templates.map((template) => (
            <Pressable
              key={template.id}
              onPress={() => handleTemplateSelect(template)}
              className="mb-4 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 active:opacity-80"
            >
              <View className="p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    {template.name}
                  </Text>
                  <View className="bg-green-500 rounded-full px-3 py-1">
                    <Text className="text-white text-xs font-semibold">
                      {template.duration}s
                    </Text>
                  </View>
                </View>

                <Text className="text-gray-600 dark:text-gray-400 mb-3">
                  {template.description}
                </Text>

                <View className="flex-row flex-wrap gap-2">
                  {template.hashtags.map((tag, idx) => (
                    <View key={idx} className="bg-blue-100 dark:bg-blue-900 rounded-full px-3 py-1">
                      <Text className="text-blue-700 dark:text-blue-300 text-xs">
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {template.aspectRatio === '9:16' ? '📱 Reels/TikTok' :
                     template.aspectRatio === '1:1' ? '📷 Instagram' :
                     '🎬 YouTube'}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}

          <View className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 mt-4">
            <Text className="text-white font-bold text-lg mb-2">
              💡 Pro Tip
            </Text>
            <Text className="text-white/90 text-sm">
              Reels and TikTok formats (9:16) get 3x more engagement than square videos!
            </Text>
          </View>
        </ScrollView>
      ) : !previewUri ? (
        // Template Preview & Generate
        <ScrollView className="flex-1 px-4 py-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {selectedTemplate.name}
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 mb-6">
            Your video will include:
          </Text>

          {/* Scene Preview */}
          {selectedTemplate.scenes.map((scene, idx) => (
            <View key={idx} className="mb-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <View className="flex-row items-center mb-2">
                <View className="bg-green-500 w-8 h-8 rounded-full items-center justify-center mr-3">
                  <Text className="text-white font-bold text-sm">{idx + 1}</Text>
                </View>
                <Text className="text-gray-900 dark:text-white font-semibold">
                  {scene.type.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>

              {scene.textOverlay && (
                <Text className="text-gray-600 dark:text-gray-400 text-sm ml-11">
                  "{scene.textOverlay.text}"
                </Text>
              )}

              {scene.coachAnimation && (
                <View className="flex-row items-center ml-11 mt-2">
                  <Feather name="user" size={14} color="#10B981" />
                  <Text className="text-green-600 dark:text-green-400 text-xs ml-1">
                    Coach {scene.coachAnimation.animation}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {/* Achievement Preview */}
          <View className="mt-6 p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl">
            <Text className="text-white font-bold text-xl mb-4">Your Stats</Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white/80 text-sm">Before</Text>
                <Text className="text-white font-bold text-3xl">
                  {achievementData.before}
                </Text>
              </View>
              <Feather name="arrow-right" size={32} color="white" />
              <View>
                <Text className="text-white/80 text-sm">After</Text>
                <Text className="text-white font-bold text-3xl">
                  {achievementData.after}
                </Text>
              </View>
            </View>
            <Text className="text-white/90 text-sm mt-3">
              in {achievementData.timeframe}
            </Text>
          </View>

          {/* Actions */}
          <View className="mt-8 gap-3">
            <Pressable
              onPress={handleGenerate}
              disabled={isGenerating}
              className="bg-green-500 rounded-2xl py-4 items-center active:opacity-80"
            >
              {isGenerating ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center">
                  <Feather name="zap" size={20} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">
                    Generate Video
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => setSelectedTemplate(null)}
              className="border-2 border-gray-300 dark:border-gray-700 rounded-2xl py-3 items-center"
            >
              <Text className="text-gray-700 dark:text-gray-300 font-semibold">
                Choose Different Style
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        // Preview & Share
        <ScrollView className="flex-1 px-4 py-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Your Video is Ready! 🎉
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 mb-6">
            Preview and share your creation
          </Text>

          {/* Video Preview */}
          <View className="bg-black rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: 9/16 }}>
            <Image
              source={{ uri: previewUri }}
              className="w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 items-center justify-center">
              <View className="bg-white/20 backdrop-blur-lg rounded-full p-4">
                <Feather name="play" size={40} color="white" />
              </View>
            </View>
          </View>

          {/* Share Button */}
          <Pressable
            onPress={handleShare}
            className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl py-4 items-center mb-4 active:opacity-90"
          >
            <View className="flex-row items-center">
              <Feather name="share-2" size={24} color="white" />
              <Text className="text-white font-bold text-xl ml-3">
                Share to Social Media
              </Text>
            </View>
          </Pressable>

          {/* Platform Buttons */}
          <View className="flex-row gap-3">
            <Pressable className="flex-1 bg-pink-500 rounded-xl py-3 items-center">
              <Text className="text-white font-semibold">Instagram</Text>
            </Pressable>
            <Pressable className="flex-1 bg-black rounded-xl py-3 items-center">
              <Text className="text-white font-semibold">TikTok</Text>
            </Pressable>
          </View>

          {/* Try Another */}
          <Pressable
            onPress={() => {
              setPreviewUri(null);
              setSelectedTemplate(null);
            }}
            className="mt-4 py-3 items-center"
          >
            <Text className="text-green-600 dark:text-green-400 font-semibold">
              Create Another Video
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
};

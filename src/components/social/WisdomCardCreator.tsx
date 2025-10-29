/**
 * WisdomCardCreator - Share AI coach wisdom and quotes
 *
 * Features:
 * - Extract coach messages
 * - Create shareable quote cards
 * - Include coach attribution
 */

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useTheme } from '../../app-components/components/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

interface WisdomCardCreatorProps {
  coachMessage: string;
  coachName: string;
  coachImageUrl?: string;
  coachImageSource?: any; // For local require() images
  gradientColors?: string[];
}

export const WisdomCardCreator: React.FC<WisdomCardCreatorProps> = ({
  coachMessage,
  coachName,
  coachImageUrl,
  coachImageSource,
  gradientColors = ['#667eea', '#764ba2'],
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const cardRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;

    try {
      setIsSharing(true);

      if (!cardRef.current) {
        Alert.alert('Error', 'Card not ready. Please try again.');
        return;
      }

      // Capture the card as an image
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      // Share the image
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Wisdom from ${coachName}`,
      });
    } catch (error) {
      console.error('Error sharing wisdom card:', error);
      Alert.alert('Error', 'Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  // Truncate long messages
  const truncatedMessage = coachMessage.length > 280
    ? coachMessage.substring(0, 277) + '...'
    : coachMessage;

  return (
    <View style={styles.container}>
      <View ref={cardRef} collapsable={false}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* MindFork Logo */}
          <View style={styles.cardHeader}>
            <Text style={styles.logoText}>MindFork</Text>
            <Ionicons name="chatbox-ellipses" size={24} color="#fff" />
          </View>

          {/* Quote Icon */}
          <View style={styles.quoteIconContainer}>
            <Ionicons name="chatbox-ellipses-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{truncatedMessage}</Text>
          </View>

          {/* Coach Attribution */}
          <View style={styles.attributionContainer}>
            {(coachImageSource || coachImageUrl) && (
              <Image 
                source={coachImageSource || { uri: coachImageUrl }} 
                style={styles.coachAvatar} 
              />
            )}
            <View style={styles.coachInfo}>
              <Text style={styles.coachName}>— {coachName}</Text>
              <Text style={styles.coachTitle}>Your MindFork Coach</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>Get your own coach at mindfork.app</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Share Button */}
      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: colors.primary }]}
        onPress={handleShare}
        disabled={isSharing}
      >
        {isSharing ? (
          <Text style={[styles.shareButtonText, { color: colors.onPrimary }]}>
            Sharing...
          </Text>
        ) : (
          <>
            <Ionicons name="share-social" size={20} color={colors.onPrimary} />
            <Text style={[styles.shareButtonText, { color: colors.onPrimary }]}>
              Share This Wisdom
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: 340,
    minHeight: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  quoteIconContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 24,
  },
  messageText: {
    fontSize: 20,
    lineHeight: 30,
    color: '#fff',
    fontStyle: 'italic',
  },
  attributionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  coachTitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  cardFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  footerText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 20,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WisdomCardCreator;

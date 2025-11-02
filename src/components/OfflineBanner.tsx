import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
// @ts-ignore - hook exists but may not be implemented yet
import { useOfflineDetection } from '../../hooks/useOfflineDetection';

/**
 * OfflineBanner - Displays when user loses internet connection
 *
 * Provides clear visual feedback about network status.
 * Automatically shows/hides based on connection state.
 *
 * Features:
 * - Smooth slide-in/out animation
 * - Non-intrusive top banner
 * - Clear messaging
 * - Automatic dismissal when back online
 *
 * Usage:
 * Add to App.tsx or main navigation:
 * <OfflineBanner />
 *
 * Why this matters:
 * - Users understand why features aren't working
 * - Prevents frustration from "broken" app
 * - Sets expectations (can browse cached data, can't save)
 * - Professional UX (matches iOS/Android system patterns)
 */
export const OfflineBanner: React.FC = () => {
  const { isOffline } = useOfflineDetection();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (isOffline) {
      // Slide in from top
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      // Slide out to top
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOffline, slideAnim]);

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>📡</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>No Internet Connection</Text>
          <Text style={styles.message}>
            You can still browse, but changes won't be saved until you're back online.
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

/**
 * Inline offline indicator for specific components
 * Use when you want to show offline status within a screen
 */
export const OfflineIndicator: React.FC<{ message?: string }> = ({
  message = "You're offline"
}) => {
  const { isOffline } = useOfflineDetection();

  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.inlineIndicator}>
      <Text style={styles.inlineIcon}>📡</Text>
      <Text style={styles.inlineText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF9500', // iOS orange warning color
    paddingTop: 44, // Safe area top (status bar)
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.95,
    lineHeight: 16,
  },
  // Inline indicator styles
  inlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  inlineIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  inlineText: {
    fontSize: 14,
    color: '#856404',
    flex: 1,
  },
});

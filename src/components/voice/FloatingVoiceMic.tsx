/**
 * Floating Voice Microphone Button
 * [SCOPE: A] - Atomic draggable FAB for voice interaction
 *
 * A floating action button that can be positioned anywhere on screen
 * Features: Drag & drop, pulse animations, state-based visual feedback
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../ui';
import { VoiceCoachScreen } from '../../screens/coach/VoiceCoachScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type VoiceMicState = 'idle' | 'listening' | 'speaking' | 'error';

interface FloatingVoiceMicProps {
  coachId: string;
  userId: string;
  initialX?: number;
  initialY?: number;
  onStateChange?: (state: VoiceMicState) => void;
}

const BUTTON_SIZE = 60;
const HITSLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const WAVEFORM_BARS = 12;

export const FloatingVoiceMic: React.FC<FloatingVoiceMicProps> = ({
  coachId,
  userId,
  initialX = SCREEN_WIDTH - BUTTON_SIZE - 20,
  initialY = SCREEN_HEIGHT - BUTTON_SIZE - 100,
  onStateChange,
}) => {
  const colors = useThemeColors();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [micState, setMicState] = useState<VoiceMicState>('idle');
  const [isDragging, setIsDragging] = useState(false);

  // Position animations
  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;

  // Visual effect animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Waveform animations (array of animated values for bars)
  const waveformAnims = useRef(
    Array.from({ length: WAVEFORM_BARS }, () => new Animated.Value(0.3))
  ).current;

  // Handle state changes
  useEffect(() => {
    onStateChange?.(micState);

    // Stop all animations first
    pulseAnim.stopAnimation();
    glowAnim.stopAnimation();
    rotateAnim.stopAnimation();
    waveformAnims.forEach(anim => anim.stopAnimation());

    // Start appropriate animations based on state
    switch (micState) {
      case 'idle':
        startIdleAnimation();
        break;
      case 'listening':
        startListeningAnimation();
        break;
      case 'speaking':
        startSpeakingAnimation();
        break;
      case 'error':
        startErrorAnimation();
        break;
    }

    return () => {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
      rotateAnim.stopAnimation();
      waveformAnims.forEach(anim => anim.stopAnimation());
    };
  }, [micState]);

  // Idle animation: Gentle pulse
  const startIdleAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Listening animation: Fast pulse + glow + waveform
  const startListeningAnimation = () => {
    // Fast pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Waveform bars animation
    const waveformAnimations = waveformAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.8 + Math.random() * 0.2,
            duration: 300 + index * 50,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 300 + index * 50,
            useNativeDriver: true,
          }),
        ])
      )
    );

    waveformAnimations.forEach(anim => anim.start());
  };

  // Speaking animation: Rotation
  const startSpeakingAnimation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  };

  // Error animation: Shake
  const startErrorAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only start dragging if moved more than 5 pixels
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        setIsDragging(false);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10) {
          setIsDragging(true);
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(_, gestureState);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        // Add velocity physics
        const vx = gestureState.vx;
        const vy = gestureState.vy;

        if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
          // Deceleration animation
          Animated.decay(pan, {
            velocity: { x: vx * 1000, y: vy * 1000 },
            deceleration: 0.95,
            useNativeDriver: false,
          }).start();
        }

        // Keep within screen bounds
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;

        const boundedX = Math.max(0, Math.min(SCREEN_WIDTH - BUTTON_SIZE, currentX));
        const boundedY = Math.max(0, Math.min(SCREEN_HEIGHT - BUTTON_SIZE, currentY));

        if (currentX !== boundedX || currentY !== boundedY) {
          Animated.spring(pan, {
            toValue: { x: boundedX, y: boundedY },
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }).start();
        }

        // Open modal if it was a tap (not a drag)
        setTimeout(() => {
          if (!isDragging) {
            handlePress();
          }
          setIsDragging(false);
        }, 50);
      },
    })
  ).current;

  const handlePress = () => {
    if (!isDragging) {
      setIsModalVisible(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  // Get colors based on state
  const getStateColors = (): [string, string] => {
    switch (micState) {
      case 'listening':
        return [colors.primary, '#FF8FB5'];
      case 'speaking':
        return [colors.secondary, '#9CA3AF'];
      case 'error':
        return [colors.error, '#EF4444'];
      default:
        return [colors.primary, colors.secondary];
    }
  };

  const [gradientStart, gradientEnd] = getStateColors();

  // Rotation interpolation
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Glow opacity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: pulseAnim },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Glow effect layer */}
        <Animated.View
          style={[
            styles.glowLayer,
            {
              opacity: glowOpacity,
              backgroundColor: gradientStart,
            },
          ]}
        />

        {/* Waveform visualization (only visible when listening) */}
        {micState === 'listening' && (
          <View style={styles.waveformContainer}>
            {waveformAnims.map((anim, index) => {
              const angle = (index / WAVEFORM_BARS) * 360;
              const radius = BUTTON_SIZE / 2 + 15;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      left: BUTTON_SIZE / 2 + x - 2,
                      top: BUTTON_SIZE / 2 + y - 2,
                      transform: [
                        { scaleY: anim },
                        { rotate: `${angle}deg` },
                      ],
                      backgroundColor: gradientStart,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}

        {/* Main button */}
        <Animated.View
          style={[
            styles.button,
            {
              transform: [{ rotate }],
            },
          ]}
        >
          <LinearGradient
            colors={[gradientStart, gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Feather
              name={micState === 'error' ? 'alert-circle' : 'mic'}
              size={28}
              color={colors.onPrimary}
            />
          </LinearGradient>
        </Animated.View>

        {/* Shadow/elevation */}
        <View style={styles.shadow} />
      </Animated.View>

      {/* Voice Coach Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <VoiceCoachScreen coachId={coachId} userId={userId} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleCloseModal}
          hitSlop={HITSLOP}
        >
          <Feather name="x" size={24} color={colors.text} />
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    zIndex: 1000,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
    zIndex: 2,
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BUTTON_SIZE / 2,
  },
  shadow: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#000',
    opacity: 0.2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
    zIndex: 1,
  },
  glowLayer: {
    position: 'absolute',
    width: BUTTON_SIZE + 20,
    height: BUTTON_SIZE + 20,
    borderRadius: (BUTTON_SIZE + 20) / 2,
    top: -10,
    left: -10,
    zIndex: 0,
  },
  waveformContainer: {
    position: 'absolute',
    width: BUTTON_SIZE + 40,
    height: BUTTON_SIZE + 40,
    left: -20,
    top: -20,
    zIndex: 1,
  },
  waveformBar: {
    position: 'absolute',
    width: 4,
    height: 12,
    borderRadius: 2,
    opacity: 0.7,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 22,
    zIndex: 1001,
  },
});

/**
 * Voice Coach Screen - Mobile Implementation
 * [SCOPE: M] - Molecular voice conversation interface for React Native
 *
 * Mobile-optimized voice conversation with coach
 * Uses expo-av for recording and playback
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { Screen, Card, Text, Button, useThemeColors } from '../../ui';
import type { VoiceMessage, VoiceState, CoachVoice } from './VoiceCoach.types';

interface VoiceCoachScreenProps {
  coachId: string;
  userId: string;
}

const AVAILABLE_VOICES: CoachVoice[] = ['cedar', 'marin', 'ash', 'ballad'];

export const VoiceCoachScreen: React.FC<VoiceCoachScreenProps> = ({
  coachId,
  userId,
}) => {
  const colors = useThemeColors();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<CoachVoice>('cedar');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0));
  const [error, setError] = useState<string | undefined>();

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const sessionStartRef = useRef<number>(0);
  const levelAnimationRef = useRef<any>(null);

  // Animated values for mic button
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initialize audio permissions
  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();
  }, []);

  // Animate mic button based on state
  useEffect(() => {
    if (voiceState === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceState, pulseAnim]);

  // Simulate audio level visualization
  useEffect(() => {
    if (voiceState === 'listening') {
      levelAnimationRef.current = setInterval(() => {
        const newLevels = new Array(20).fill(0).map(() => Math.random());
        setAudioLevels(newLevels);
      }, 100);
    } else {
      if (levelAnimationRef.current) {
        clearInterval(levelAnimationRef.current);
      }
      setAudioLevels(new Array(20).fill(0));
    }

    return () => {
      if (levelAnimationRef.current) {
        clearInterval(levelAnimationRef.current);
      }
    };
  }, [voiceState]);

  // Update session duration
  useEffect(() => {
    if (voiceState === 'idle') return;

    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      setSessionDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, [voiceState]);

  // Start recording
  const startRecording = async () => {
    try {
      setError(undefined);
      setVoiceState('listening');
      sessionStartRef.current = Date.now();

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone');
      setVoiceState('error');
    }
  };

  // Stop recording and process
  const stopRecording = async () => {
    if (!recordingRef.current) return;

    setVoiceState('processing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        await processRecording(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError('Failed to process recording');
      setVoiceState('error');
    }
  };

  // Process recorded audio
  const processRecording = async (audioUri: string) => {
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);

      // Transcribe
      const transcribeResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/voice/transcribe`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed');
      }

      const { text } = await transcribeResponse.json();

      // Add user message
      const userMessage: VoiceMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Get coach response
      const coachResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/ai/voice/speak`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            coachId,
            userId,
            voice: selectedVoice,
          }),
        }
      );

      if (!coachResponse.ok) {
        throw new Error('Coach response failed');
      }

      const { text: responseText, audioUrl } = await coachResponse.json();

      // Add coach message
      const coachMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        audioUrl,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, coachMessage]);

      // Play audio response
      if (audioUrl) {
        await playAudioResponse(audioUrl);
      } else {
        setVoiceState('idle');
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process recording');
      setVoiceState('error');
    }
  };

  // Play audio response
  const playAudioResponse = async (audioUrl: string) => {
    setVoiceState('speaking');

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setVoiceState('idle');
          soundRef.current?.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (err) {
      console.error('Playback error:', err);
      setError('Failed to play response');
      setVoiceState('error');
    }
  };

  // Handle mic button press
  const handleMicPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (voiceState === 'listening') {
      stopRecording();
    } else if (voiceState === 'idle') {
      startRecording();
    }
  };

  // Clear session
  const clearSession = () => {
    setMessages([]);
    setSessionDuration(0);
    setError(undefined);
    setVoiceState('idle');
  };

  // Get mic button color
  const getMicButtonColor = () => {
    switch (voiceState) {
      case 'listening':
        return '#FF6B6B';
      case 'speaking':
        return colors.success || '#4CAF50';
      case 'error':
        return '#FF0000';
      default:
        return colors.primary || '#FFA8D2';
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Screen contentContainerStyle={styles.container}>
      {/* Header with Duration */}
      <Card elevation={2} style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" color={colors.text}>
            Voice Coach
          </Text>
          {sessionDuration > 0 && (
            <Text variant="bodySmall" color={colors.textSecondary}>
              {formatDuration(sessionDuration)}
            </Text>
          )}
        </View>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {voiceState === 'idle' ? 'Ready to listen' : 'Active session'}
        </Text>
      </Card>

      {/* Error Alert */}
      {error && (
        <Card style={[styles.errorCard, { backgroundColor: 'rgba(255, 0, 0, 0.1)' }]}>
          <Text variant="body" color="#FF6B6B">
            {error}
          </Text>
        </Card>
      )}

      {/* Waveform Visualization */}
      <Card elevation={2} style={styles.waveformCard}>
        <View style={styles.waveformContainer}>
          {audioLevels.map((level, index) => (
            <View
              key={index}
              style={[
                styles.waveformBar,
                {
                  height: `${Math.max(level * 100, 2)}%`,
                  backgroundColor: getMicButtonColor(),
                  opacity: 0.7 + level * 0.3,
                },
              ]}
            />
          ))}
        </View>
      </Card>

      {/* Mic Button with Animation */}
      <View style={styles.micButtonContainer}>
        <Animated.View
          style={[
            styles.micButtonPulse,
            {
              transform: [{ scale: pulseAnim }],
              backgroundColor: getMicButtonColor(),
              opacity: voiceState === 'listening' ? 0.3 : 0,
            },
          ]}
        />
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={handleMicPress}
            disabled={voiceState === 'processing'}
            style={[
              styles.micButton,
              { backgroundColor: getMicButtonColor() },
            ]}
          >
            <Text variant="titleLarge" color="#FFFFFF">
              {voiceState === 'listening' ? '⏹' : '🎤'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.micLabel}>
          {voiceState === 'listening'
            ? 'Tap to stop'
            : voiceState === 'processing'
            ? 'Processing...'
            : voiceState === 'speaking'
            ? 'Coach speaking...'
            : 'Tap to speak'}
        </Text>
      </View>

      {/* Voice Selection */}
      <Card elevation={1} style={styles.voiceCard}>
        <Text variant="titleSmall" style={styles.voiceTitle}>
          Voice
        </Text>
        <View style={styles.voiceGrid}>
          {AVAILABLE_VOICES.map((voice) => (
            <TouchableOpacity
              key={voice}
              onPress={() => setSelectedVoice(voice)}
              style={[
                styles.voiceButton,
                {
                  backgroundColor:
                    selectedVoice === voice ? colors.primary : colors.surface,
                },
              ]}
            >
              <Text
                variant="bodySmall"
                color={selectedVoice === voice ? '#FFFFFF' : colors.text}
              >
                {voice.charAt(0).toUpperCase() + voice.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Conversation History */}
      {messages.length > 0 && (
        <Card elevation={2} style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text variant="titleSmall">Conversation</Text>
            <Button
              title="Clear"
              variant="outline"
              onPress={clearSession}
              containerStyle={styles.clearButton}
            />
          </View>

          <ScrollView style={styles.messagesScroll}>
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.role === 'user'
                    ? { backgroundColor: colors.primary, alignSelf: 'flex-end' }
                    : { backgroundColor: colors.surface, alignSelf: 'flex-start' },
                ]}
              >
                <Text
                  variant="bodySmall"
                  color={message.role === 'user' ? '#FFFFFF' : colors.textSecondary}
                  style={styles.messageRole}
                >
                  {message.role === 'user' ? 'You' : 'Coach'}
                </Text>
                <Text
                  variant="body"
                  color={message.role === 'user' ? '#FFFFFF' : colors.text}
                >
                  {message.content}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Card>
      )}

      {/* Empty State */}
      {messages.length === 0 && voiceState === 'idle' && (
        <Card style={styles.emptyCard}>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            Start a Conversation
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.emptyText}>
            Tap the microphone to talk with your AI coach
          </Text>
        </Card>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerCard: {
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorCard: {
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  waveformCard: {
    padding: 16,
    marginBottom: 24,
    height: 100,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 2,
  },
  waveformBar: {
    flex: 1,
    minHeight: 2,
    borderRadius: 2,
  },
  micButtonContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  micButtonPulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  micLabel: {
    marginTop: 12,
  },
  voiceCard: {
    padding: 16,
    marginBottom: 16,
  },
  voiceTitle: {
    marginBottom: 12,
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  voiceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  historyCard: {
    padding: 16,
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    marginBottom: 0,
  },
  messagesScroll: {
    maxHeight: 300,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '80%',
  },
  messageRole: {
    marginBottom: 4,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});

export default VoiceCoachScreen;

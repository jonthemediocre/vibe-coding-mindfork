import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, ScrollView, ActivityIndicator, Modal } from "react-native";
import { Screen, Card, Text, Button, PhoneInput, useThemeColors, useThemedStyles } from "../../ui";
import type { Theme } from "../../app-components/components/ThemeProvider";
import { useAuth } from "../../contexts/AuthContext";
import { voiceCallService, Call, InitiateCallRequest } from "../../services/VoiceCallService";
import { logger } from "../../utils/logger";

export const CoachCallScreen: React.FC = () => {
  const { user, session } = useAuth();
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  const [loading, setLoading] = useState(false);
  const [callHistory, setCallHistory] = useState<Call[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  // Default coach ID (can be made dynamic)
  const defaultCoachId = "coach-1";

  useEffect(() => {
    loadCallHistory();
  }, []);

  const loadCallHistory = async () => {
    if (!session?.access_token) return;

    try {
      setLoadingHistory(true);
      const response = await voiceCallService.getCallHistory(session.access_token, {
        limit: 10,
      });

      if ('calls' in response) {
        setCallHistory(response.calls);
      }
    } catch (error) {
      console.error('[CoachCallScreen] Failed to load call history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleInitiateCall = async (callType: 'reminder' | 'check_in' | 'emergency' | 'scheduled') => {
    if (!user?.phone_number) {
      // Show inline phone prompt instead of just alert
      setShowPhonePrompt(true);
      return;
    }

    if (!session?.access_token) {
      Alert.alert("Authentication Error", "Please sign in again.");
      return;
    }

    try {
      setLoading(true);

      const request: InitiateCallRequest = {
        phoneNumber: user.phone_number,
        coachId: defaultCoachId,
        callType,
        message: getCallMessage(callType),
      };

      const response = await voiceCallService.initiateCall(session.access_token, request);

      Alert.alert(
        "Call Initiated",
        `${response.message}\n\nYour coach will call you at ${voiceCallService.formatPhoneNumber(user.phone_number)} shortly.`,
        [
          {
            text: "OK",
            onPress: () => loadCallHistory(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Call Failed",
        error.message || "Failed to initiate call. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getCallMessage = (callType: string): string => {
    switch (callType) {
      case 'check_in':
        return "Let's check in on your nutrition goals and progress.";
      case 'reminder':
        return "Quick reminder about your meal plan and hydration.";
      case 'emergency':
        return "I'm here to help with any urgent nutrition questions.";
      default:
        return "Your AI coach calling to support your health journey.";
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return colors.success || '#4CAF50';
      case 'failed':
      case 'no-answer':
      case 'busy':
        return colors.error || '#F44336';
      case 'in-progress':
      case 'ringing':
        return colors.warning || '#FF9800';
      default:
        return colors.textSecondary;
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleSavePhone = async () => {
    // Validate
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length !== 11 || cleaned[0] !== '1') {
      Alert.alert('Invalid Phone Number', 'Please enter a valid US phone number');
      return;
    }

    try {
      setSavingPhone(true);

      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase.auth.updateUser({
        data: {
          phone_number: phoneNumber,
        }
      });

      if (error) {
        throw error;
      }

      logger.info('Phone number added from call screen', {
        userId: user?.id,
        phone: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
      });

      setShowPhonePrompt(false);

      Alert.alert(
        'Phone Number Saved!',
        'You can now receive calls from your AI coach. Please tap the call button again.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      logger.error('Failed to save phone number', error as Error);
      Alert.alert('Error', 'Failed to save phone number. Please try again.');
    } finally {
      setSavingPhone(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.container}>
      {/* Phone Number Prompt Modal */}
      <Modal
        visible={showPhonePrompt}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPhonePrompt(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text variant="headingSmall">Add Your Phone Number</Text>
            <Button
              title="✕"
              variant="ghost"
              onPress={() => setShowPhonePrompt(false)}
              containerStyle={styles.closeButton}
            />
          </View>

          <View style={styles.modalContent}>
            <Text variant="body" color={colors.textSecondary} style={styles.modalDescription}>
              To receive calls from your AI coach, we need your phone number.
            </Text>

            <Card style={styles.phoneCard}>
              <Text variant="titleSmall" style={styles.phoneLabel}>
                Phone Number
              </Text>

              <PhoneInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+1 (555) 123-4567"
                autoFocus
              />
            </Card>

            <Button
              title="Save & Continue"
              variant="primary"
              onPress={handleSavePhone}
              disabled={savingPhone || phoneNumber.replace(/\D/g, '').length !== 11}
              loading={savingPhone}
              containerStyle={styles.savePhoneButton}
            />

            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowPhonePrompt(false)}
              disabled={savingPhone}
            />
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Card elevation={2} padding="lg" style={styles.headerCard}>
          <Text variant="headingSmall" style={styles.heading}>
            Talk to Your Coach
          </Text>
          <Text variant="body" color={colors.textSecondary}>
            {user?.phone_number
              ? `Your coach will call you at ${voiceCallService.formatPhoneNumber(user.phone_number)}`
              : "Add your phone number in profile to receive calls"}
          </Text>
        </Card>

        <Card style={styles.actionsCard}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Request a Call
          </Text>

          <Button
            title="Check-In Call"
            variant="primary"
            onPress={() => handleInitiateCall('check_in')}
            disabled={loading || !user?.phone_number}
            containerStyle={styles.actionButton}
          />

          <Button
            title="Reminder Call"
            variant="outline"
            onPress={() => handleInitiateCall('reminder')}
            disabled={loading || !user?.phone_number}
            containerStyle={styles.actionButton}
          />

          <Button
            title="Emergency Support"
            variant="outline"
            onPress={() => handleInitiateCall('emergency')}
            disabled={loading || !user?.phone_number}
            containerStyle={styles.actionButton}
          />

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text variant="bodySmall" color={colors.textSecondary} style={styles.loadingText}>
                Initiating call...
              </Text>
            </View>
          )}
        </Card>

        <Card style={styles.historyCard}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Recent Calls
          </Text>

          {loadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : callHistory.length === 0 ? (
            <Text variant="body" color={colors.textSecondary} style={styles.emptyText}>
              No call history yet. Request your first call above!
            </Text>
          ) : (
            callHistory.map((call) => (
              <View key={call.id} style={[styles.callItem, { borderBottomColor: colors.border }]}>
                <View style={styles.callItemHeader}>
                  <Text variant="body" style={styles.callType}>
                    {call.call_type.charAt(0).toUpperCase() + call.call_type.slice(1).replace('_', ' ')}
                  </Text>
                  <Text variant="bodySmall" color={getStatusColor(call.status)}>
                    {call.status}
                  </Text>
                </View>
                <View style={styles.callItemDetails}>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {formatDate(call.created_at)}
                  </Text>
                  {call.duration_seconds ? (
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      Duration: {formatDuration(call.duration_seconds)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerCard: {
      marginBottom: 16,
    },
    heading: {
      marginBottom: 8,
    },
    actionsCard: {
      marginBottom: 16,
      padding: 16,
    },
    sectionTitle: {
      marginBottom: 16,
    },
    actionButton: {
      marginBottom: 12,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    loadingText: {
      marginLeft: 8,
    },
    historyCard: {
      padding: 16,
      marginBottom: 16,
    },
    emptyText: {
      textAlign: 'center',
      paddingVertical: 20,
    },
    callItem: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    callItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    callType: {
      fontWeight: '600',
    },
    callItemDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalContainer: {
      flex: 1,
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingTop: 20,
    },
    closeButton: {
      width: 40,
      minHeight: 40,
    },
    modalContent: {
      flex: 1,
    },
    modalDescription: {
      marginBottom: 24,
      lineHeight: 22,
    },
    phoneCard: {
      padding: 20,
      marginBottom: 20,
    },
    phoneLabel: {
      marginBottom: 12,
    },
    savePhoneButton: {
      marginBottom: 12,
    },
  });

export default CoachCallScreen;

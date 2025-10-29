import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from "../../ui";
import type { Theme } from "../../app-components/components/ThemeProvider";
import { useAuth } from "../../contexts/AuthContext";
import { smsService, SMSMessage, SendSMSRequest, Conversation } from "../../services/SMSService";

export const CoachSMSScreen: React.FC = () => {
  const { user, session } = useAuth();
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageHistory, setMessageHistory] = useState<SMSMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  // Default coach ID
  const defaultCoachId = "coach-1";

  useEffect(() => {
    loadMessageHistory();
  }, []);

  const loadMessageHistory = async () => {
    if (!session?.access_token) return;

    try {
      setLoadingHistory(true);
      const response = await smsService.getMessageHistory(session.access_token, {
        limit: 50,
      });

      if ('messages' in response) {
        setMessageHistory(response.messages);
        setConversations(response.conversations);
      }
    } catch (error) {
      console.error('[CoachSMSScreen] Failed to load message history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendMessage = async (messageType: 'custom' | 'check_in' | 'motivation' = 'custom') => {
    if (!user?.phone_number) {
      Alert.alert(
        "Phone Number Required",
        "Please add your phone number in your profile to send SMS.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!message.trim() && messageType === 'custom') {
      Alert.alert("Message Required", "Please enter a message to send.");
      return;
    }

    if (!session?.access_token) {
      Alert.alert("Authentication Error", "Please sign in again.");
      return;
    }

    if (!smsService.isValidMessageLength(message)) {
      Alert.alert(
        "Message Too Long",
        "Message exceeds maximum length of 1600 characters (10 SMS segments)."
      );
      return;
    }

    try {
      setLoading(true);

      const request: SendSMSRequest = {
        phoneNumber: user.phone_number,
        message: message.trim(),
        coachId: defaultCoachId,
        messageType,
      };

      const response = await smsService.sendSMS(session.access_token, request);

      setMessage("");
      setShowQuickReplies(false);

      Alert.alert(
        "Message Sent",
        `${response.message}\n\nSegments: ${response.segments || 1}`,
        [
          {
            text: "OK",
            onPress: () => loadMessageHistory(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Send Failed",
        error.message || "Failed to send message. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = (template: { message: string; type: string }) => {
    setMessage(template.message);
    setShowQuickReplies(false);
  };

  const segments = smsService.calculateSegments(message);
  const remaining = smsService.getRemainingChars(message);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return colors.success || '#4CAF50';
      case 'failed':
        return colors.error || '#F44336';
      case 'queued':
        return colors.warning || '#FF9800';
      default:
        return colors.textSecondary;
    }
  };

  return (
    <Screen contentContainerStyle={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card elevation={2} padding="lg" style={styles.headerCard}>
          <Text variant="headingSmall" style={styles.heading}>
            Message Your Coach
          </Text>
          <Text variant="body" color={colors.textSecondary}>
            {user?.phone_number
              ? `Send SMS to your coach from ${smsService.formatPhoneNumber?.(user.phone_number) || user.phone_number}`
              : "Add your phone number in profile to send messages"}
          </Text>
        </Card>

        <Card style={styles.composeCard}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Compose Message
          </Text>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message to your coach..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1600}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />

          <View style={styles.messageInfo}>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {message.length}/1600 characters
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {segments} segment{segments !== 1 ? 's' : ''} ({remaining} chars remaining)
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <Button
              title="Quick Replies"
              variant="outline"
              onPress={() => setShowQuickReplies(!showQuickReplies)}
              containerStyle={styles.actionButtonLeft}
              disabled={loading}
            />
            <Button
              title={loading ? "Sending..." : "Send"}
              variant="primary"
              onPress={() => handleSendMessage('custom')}
              disabled={loading || !message.trim() || !user?.phone_number}
              containerStyle={styles.actionButtonRight}
            />
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text variant="bodySmall" color={colors.textSecondary} style={styles.loadingText}>
                Sending message...
              </Text>
            </View>
          )}

          {showQuickReplies && (
            <View style={styles.quickRepliesContainer}>
              <Text variant="bodySmall" color={colors.textSecondary} style={styles.quickRepliesTitle}>
                Quick Replies:
              </Text>
              {smsService.getQuickReplyTemplates().map((template, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleQuickReply(template)}
                  style={[styles.quickReplyButton, { borderColor: colors.border }]}
                >
                  <Text variant="body" color={colors.primary}>
                    {template.label}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={1}>
                    {template.message}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.historyCard}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Recent Messages
          </Text>

          {loadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : messageHistory.length === 0 ? (
            <Text variant="body" color={colors.textSecondary} style={styles.emptyText}>
              No message history yet. Send your first message above!
            </Text>
          ) : (
            messageHistory.slice(0, 10).map((msg) => (
              <View key={msg.id} style={[styles.messageItem, { borderBottomColor: colors.border }]}>
                <View style={styles.messageHeader}>
                  <View style={styles.messageHeaderLeft}>
                    <Text
                      variant="bodySmall"
                      color={msg.direction === 'outbound' ? colors.primary : colors.textSecondary}
                      style={styles.messageDirection}
                    >
                      {msg.direction === 'outbound' ? 'You' : 'Coach'}
                    </Text>
                    <Text variant="bodySmall" color={getStatusColor(msg.status)}>
                      {msg.status}
                    </Text>
                  </View>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {formatDate(msg.created_at)}
                  </Text>
                </View>
                <Text variant="body" style={styles.messageBody} numberOfLines={3}>
                  {msg.body}
                </Text>
              </View>
            ))
          )}
        </Card>

        {conversations.length > 0 && (
          <Card style={styles.conversationsCard}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Conversations
            </Text>
            {conversations.map((conv, index) => (
              <View key={index} style={[styles.conversationItem, { borderBottomColor: colors.border }]}>
                <View style={styles.conversationHeader}>
                  <Text variant="body" style={styles.conversationType}>
                    Coach {conv.coachId}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {conv.messageCount} messages
                  </Text>
                </View>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Last message: {formatDate(conv.lastMessageAt)}
                </Text>
              </View>
            ))}
          </Card>
        )}
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
    composeCard: {
      marginBottom: 16,
      padding: 16,
    },
    sectionTitle: {
      marginBottom: 16,
    },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 12,
      padding: 12,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: 8,
    },
    messageInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    actionButtons: {
      flexDirection: 'row',
    },
    actionButton: {
      marginBottom: 8,
    },
    actionButtonLeft: {
      flex: 1,
      marginRight: 8,
      marginBottom: 8,
    },
    actionButtonRight: {
      flex: 1,
      marginBottom: 8,
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
    quickRepliesContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    quickRepliesTitle: {
      marginBottom: 8,
    },
    quickReplyButton: {
      padding: 12,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: 8,
    },
    historyCard: {
      padding: 16,
      marginBottom: 16,
    },
    emptyText: {
      textAlign: 'center',
      paddingVertical: 20,
    },
    messageItem: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    messageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    messageHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    messageDirection: {
      fontWeight: '600',
      marginRight: 8,
    },
    messageBody: {
      marginTop: 4,
    },
    conversationsCard: {
      padding: 16,
      marginBottom: 16,
    },
    conversationItem: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    conversationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    conversationType: {
      fontWeight: '600',
    },
  });

export default CoachSMSScreen;

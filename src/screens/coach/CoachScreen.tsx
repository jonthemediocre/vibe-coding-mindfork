import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from "../../ui";
import { useAuth } from "../../contexts/AuthContext";
import { useAgentStream } from "../../hooks/useAgentStream";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../../utils/logger";
import { useCoachContext, useCoachInsights } from "../../hooks/useCoachContext";
import { useProfile } from "../../contexts/ProfileContext";
import { CoachService } from "../../services/coachService";

interface Coach {
  id: string;
  name: string;
  personality: string;
  expertise: string[];
  level: number;
  is_active: boolean;
}

const SELECTED_COACH_KEY = "mindfork:selected_coach";

// Helper function to determine if a coach is recommended for a specific diet type
const isCoachRecommendedForDiet = (coach: Coach, dietType: string): boolean => {
  const recommendations: Record<string, string[]> = {
    'vegan': ['verdant', 'synapse'], // Plant-focused coaches
    'vegetarian': ['verdant', 'decibel'], // Plant-friendly coaches
    'keto': ['veloura', 'sato'], // Disciplined, structured coaches
    'paleo': ['aetheris', 'veloura'], // Natural, disciplined approaches
    'mediterranean': ['decibel', 'verdant'], // Social, balanced coaches
    'mindfork': ['synapse', 'vetra'], // Balanced, energetic coaches
  };
  
  return recommendations[dietType]?.includes(coach.id) || false;
};

export const CoachScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const { user, session } = useAuth();
  const { profile } = useProfile();
  const navigation = useNavigation();
  const [draft, setDraft] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [showCoachSelector, setShowCoachSelector] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get personalized coach context
  const { context, generatePrompt, isReady, contextSummary } = useCoachContext({
    includeWeightData: true,
    includePastWeek: true,
  });
  
  // Get coach insights for UI display
  const insights = useCoachInsights();

  // Fetch coaches from database
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const { data, error } = await supabase
          .from('coaches')
          .select('*')
          .eq('is_active', true)
          .order('level');

        if (error) throw error;

        const coaches = (data as Coach[]) || [];
        setCoaches(coaches);

        // Load saved coach selection
        const savedCoachId = await AsyncStorage.getItem(SELECTED_COACH_KEY);
        if (savedCoachId && coaches.some(c => c.id === savedCoachId)) {
          setSelectedCoachId(savedCoachId);
        } else if (coaches.length > 0) {
          // Default to first coach if none selected
          setSelectedCoachId(coaches[0].id);
        }
      } catch (error) {
        logger.error('Failed to fetch coaches from database', error as Error, {
          operation: 'fetchCoaches',
          fallback: 'nora_gentle'
        });
        // Fallback to default if database fails
        setSelectedCoachId('nora_gentle');
      } finally {
        setLoading(false);
      }
    };

    fetchCoaches();
  }, []);

  const selectedCoach = coaches.find(c => c.id === selectedCoachId);

  // Map coach personality to persona for agent
  const coachPersona = selectedCoach?.personality?.toLowerCase() || 'gentle';
  const roastLevel = selectedCoach?.level || 3;
  const isPremium = user?.tier ? user.tier !== "free" : false;

  const agent = useAgentStream({
    userId: user?.id ?? "demo-user",
    coachPersona,
    roastLevel,
    isPremium,
    accessToken: session?.access_token,
    includeCredentials: false,
  });

  const { state, sendMessage, cancel } = agent;

  useEffect(() => () => cancel(), [cancel]);

  const handleSelectCoach = async (coachId: string) => {
    setSelectedCoachId(coachId);
    await AsyncStorage.setItem(SELECTED_COACH_KEY, coachId);
    setShowCoachSelector(false);
  };

  const handleSend = async () => {
    if (!draft.trim()) return;
    const userMessage = draft.trim();
    setDraft("");

    try {
      // Use personalized context if available
      if (context && selectedCoach && profile) {
        // Generate personalized prompt with context
        const personalizedPrompt = generatePrompt(selectedCoach.personality, userMessage);
        
        if (personalizedPrompt) {
          // Send with context-aware prompt
          await sendMessage(personalizedPrompt);
        } else {
          // Fallback to regular message
          await sendMessage(userMessage);
        }
      } else {
        // No context available, send regular message
        await sendMessage(userMessage);
      }
    } catch (error) {
      logger.error('Failed to send coach message', error as Error, {
        operation: 'handleSend',
        coachId: selectedCoachId,
        hasContext: !!context,
      });
      // Error will surface via state.error
    }
  };

  const isResponding = state.thinking || state.status === "streaming";

  const knowledgeSummary = useMemo(() => {
    if (!state.knowledge) return null;
    const { itemsUsed, sources, categories } = state.knowledge;
    return {
      itemsUsed: itemsUsed ?? 0,
      sources: sources ?? [],
      categories: categories ?? [],
    };
  }, [state.knowledge]);

  return (
    <Screen contentContainerStyle={styles.container}>
      {/* Voice & SMS Quick Actions */}
      <Card elevation={2} style={styles.quickActionsCard}>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Connect with Your Coach
        </Text>
        <View style={styles.quickActionsRow}>
          <Button
            title="Phone Call"
            variant="primary"
            onPress={() => navigation.navigate('CoachCall' as never)}
            containerStyle={styles.quickActionButtonLeft}
          />
          <Button
            title="Send SMS"
            variant="outline"
            onPress={() => navigation.navigate('CoachSMS' as never)}
            containerStyle={styles.quickActionButtonRight}
          />
        </View>
      </Card>

      <View style={styles.cardSpacing}>
        <Card elevation={2} style={styles.threadCard}>
          <View style={styles.coachHeader}>
            <View style={styles.coachInfo}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                {selectedCoach?.name || "Loading..."}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {selectedCoach?.personality} • Level {selectedCoach?.level}
              </Text>
              {/* Context Status Indicator */}
              {isReady && contextSummary && (
                <View style={styles.contextStatus}>
                  <Text variant="caption" color={colors.primary} style={styles.contextIndicator}>
                    🧠 Personalized • {contextSummary.achievementCount} achievements • {contextSummary.challengeCount} focus areas
                  </Text>
                </View>
              )}
              {!isReady && profile && (
                <Text variant="caption" color={colors.textSecondary} style={styles.contextIndicator}>
                  ⚡ Loading personalization...
                </Text>
              )}
            </View>
            <Button
              title="Change Coach"
              variant="outline"
              onPress={() => setShowCoachSelector(!showCoachSelector)}
              containerStyle={styles.changeCoachButton}
            />
          </View>

          {/* Coach Selection UI */}
          {showCoachSelector && (
            <View style={styles.coachSelector}>
              <Text variant="body" style={styles.coachSelectorTitle}>
                Choose Your Coach:
              </Text>
              {context && context.userGoals.diet_type && (
                <Text variant="caption" color={colors.textSecondary} style={styles.dietTypeNote}>
                  Recommendations for {context.userGoals.diet_type} diet
                </Text>
              )}
              {coaches.map(coach => {
                const isSelected = coach.id === selectedCoachId;
                
                // Check if coach is recommended for user's diet type
                const isRecommended = context && isCoachRecommendedForDiet(coach, context.userGoals.diet_type);
                
                return (
                  <TouchableOpacity
                    key={coach.id}
                    style={[
                      styles.coachOption,
                      isSelected && { backgroundColor: colors.surface, borderColor: colors.primary },
                      isRecommended && !isSelected && { borderColor: colors.secondary, borderWidth: 1 }
                    ]}
                    onPress={() => handleSelectCoach(coach.id)}
                  >
                    <View style={styles.coachOptionHeader}>
                      <Text variant="titleSmall" color={isSelected ? colors.primary : colors.text}>
                        {coach.name}
                        {isRecommended && !isSelected && (
                          <Text variant="caption" color={colors.secondary}> ⭐</Text>
                        )}
                      </Text>
                      {isSelected && (
                        <Text variant="caption" color={colors.primary}>
                          ✓ Active
                        </Text>
                      )}
                    </View>
                    <Text variant="caption" color={colors.textSecondary}>
                      {coach.personality} • Level {coach.level}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary} style={styles.coachExpertise}>
                      {coach.expertise?.join(', ')}
                    </Text>
                    {isRecommended && (
                      <Text variant="caption" color={colors.secondary} style={styles.recommendationReason}>
                        Recommended for your {context?.userGoals.diet_type} goals
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {/* Progress Insights Display */}
          {insights && state.messages.length === 0 && (
            <View style={[styles.messageBubble, styles.coachBubble, { backgroundColor: colors.surface }]}>
              <Text variant="body" color={colors.text}>
                {insights.overallStatus === 'excellent' && "Amazing work! You're crushing your goals! 🔥"}
                {insights.overallStatus === 'good' && "You're doing great! Keep up the momentum! 💪"}
                {insights.overallStatus === 'needs_attention' && `Let's focus on ${insights.primaryFocus} today.`}
                {insights.overallStatus === 'getting_started' && "Welcome! I'm here to help you succeed. Let's start strong! 🚀"}
              </Text>
              {insights.topChallenge && (
                <Text variant="caption" color={colors.textSecondary} style={styles.insightDetail}>
                  Focus area: {insights.topChallenge}
                </Text>
              )}
              {insights.latestAchievement && (
                <Text variant="caption" color={colors.primary} style={styles.insightDetail}>
                  Recent win: {insights.latestAchievement}
                </Text>
              )}
            </View>
          )}
          
          {/* Fallback welcome message */}
          {!insights && state.messages.length === 0 && (
            <View style={[styles.messageBubble, styles.coachBubble, { backgroundColor: colors.surface }]}>
              <Text variant="body" color={colors.text}>
                Great job staying consistent! How can I support you today?
              </Text>
            </View>
          )}
          {state.messages.map(message => {
            const isUser = message.role === "user";
            const isAssistant = message.role === "assistant";
            const containerStyles = isUser
              ? [styles.messageBubble, styles.userBubble, { backgroundColor: colors.primary }]
              : isAssistant
              ? [styles.messageBubble, styles.coachBubble, { backgroundColor: colors.surface }]
              : [styles.messageBubble, styles.toolBubble, { backgroundColor: colors.surface }];

            const textColor = isUser ? colors.onPrimary : colors.text;

            return (
              <View key={message.id} style={containerStyles}>
                {!isUser && !isAssistant ? (
                  <Text variant="bodySmall" color={colors.textSecondary} style={styles.toolLabel}>
                    Tool insight
                  </Text>
                ) : null}
                <Text variant="body" color={textColor}>
                  {message.content}
                </Text>
              </View>
            );
          })}
      {isResponding ? (
        <Text variant="bodySmall" color={colors.textSecondary}>
          Coach is thinking...
        </Text>
      ) : null}
        {state.steps.length ? (
          <Text variant="bodySmall" color={colors.textSecondary}>
            Active steps: {state.steps.join(", ")}
          </Text>
        ) : null}
        </Card>
      </View>

      {knowledgeSummary ? (
        <Card style={styles.knowledgeCard}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Retrieval Highlights
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            Evidence gathered from the knowledge base before responding.
          </Text>
          <View style={styles.knowledgeRow}>
            <Text variant="body">Matches</Text>
            <Text variant="bodyLarge">{knowledgeSummary.itemsUsed}</Text>
          </View>
          {knowledgeSummary.sources.length ? (
            <View style={styles.knowledgeBlock}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Sources
              </Text>
              {knowledgeSummary.sources.map(source => (
                <Text key={source} variant="body">
                  • {source}
                </Text>
              ))}
            </View>
          ) : null}
          {knowledgeSummary.categories.length ? (
            <View style={styles.knowledgeBlock}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Categories
              </Text>
              <Text variant="body">
                {knowledgeSummary.categories.join(", ")}
              </Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {state.error ? (
        <Card style={styles.errorCard}>
          <Text variant="body" color={colors.error}>
            {state.error}
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Ask anything
        </Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="e.g. What should I eat pre-workout?"
          placeholderTextColor={colors.textSecondary}
          multiline
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
        <Button
          title={isResponding ? "Waiting..." : "Send"}
          variant="primary"
          onPress={handleSend}
          disabled={isResponding}
          containerStyle={styles.sendButton}
        />
      </Card>
    </Screen>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    quickActionsCard: {
      marginBottom: 16,
      padding: 16,
    },
    quickActionsRow: {
      flexDirection: 'row',
    },
    quickActionButton: {
      marginBottom: 0,
    },
    quickActionButtonLeft: {
      flex: 1,
      marginRight: 8,
      marginBottom: 0,
    },
    quickActionButtonRight: {
      flex: 1,
      marginBottom: 0,
    },
    cardSpacing: {
      marginBottom: 16,
    },
    threadCard: {
      minHeight: 240,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    messageBubble: {
      padding: 12,
      borderRadius: 16,
      marginBottom: 10,
    },
    userBubble: {
      alignSelf: "flex-end",
    },
    coachBubble: {
      alignSelf: "flex-start",
    },
    toolBubble: {
      alignSelf: "flex-start",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.1)",
    },
    toolLabel: {
      marginBottom: 4,
    },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 12,
      padding: 12,
      minHeight: 80,
      textAlignVertical: "top",
    },
    sendButton: {
      marginTop: 12,
    },
    knowledgeCard: {
      marginBottom: 16,
      padding: 16,
    },
    knowledgeRow: {
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    knowledgeBlock: {
      marginTop: 12,
    },
    errorCard: {
      backgroundColor: "rgba(229, 57, 53, 0.1)",
      borderColor: "rgba(229,57,53,0.3)",
      borderWidth: StyleSheet.hairlineWidth,
      padding: 12,
      marginBottom: 16,
    },
    coachHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    coachInfo: {
      flex: 1,
      marginRight: 12,
    },
    contextStatus: {
      marginTop: 4,
    },
    contextIndicator: {
      fontSize: 11,
      fontWeight: '500',
    },
    insightDetail: {
      marginTop: 4,
      fontStyle: 'italic',
    },
    changeCoachButton: {
      marginBottom: 0,
    },
    coachSelector: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    coachSelectorTitle: {
      marginBottom: 12,
      fontWeight: '600',
    },
    coachOption: {
      padding: 12,
      marginBottom: 8,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0,0,0,0.1)',
    },
    coachOptionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    coachExpertise: {
      marginTop: 4,
    },
    dietTypeNote: {
      marginBottom: 8,
      fontStyle: 'italic',
    },
    recommendationReason: {
      marginTop: 4,
      fontWeight: '500',
    },
  });

export default CoachScreen;

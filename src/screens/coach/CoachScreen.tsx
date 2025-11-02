import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { Screen, Text, TextInput, useThemeColors } from "../../ui";
import { useAuth } from "../../contexts/AuthContext";
import { useAgentStream } from "../../hooks/useAgentStream";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../../utils/logger";
import { useCoachContext, useCoachInsights } from "../../hooks/useCoachContext";
import { useProfile } from "../../contexts/ProfileContext";
import { useTheme } from "../../app-components/components/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

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
    vegan: ["verdant", "synapse"],
    vegetarian: ["verdant", "decibel"],
    keto: ["veloura", "sato"],
    paleo: ["aetheris", "veloura"],
    mediterranean: ["decibel", "verdant"],
    mindfork: ["synapse", "vetra"],
  };

  return recommendations[dietType]?.includes(coach.id) || false;
};

// Map coach ID to avatar image
const getCoachAvatar = (coachId: string) => {
  const avatars: Record<string, any> = {
    synapse: require("../../../assets/coaches/assets_coaches_coach_synapse.png"),
    vetra: require("../../../assets/coaches/assets_coaches_coach_vetra.png"),
    verdant: require("../../../assets/coaches/assets_coaches_coach_verdant.png"),
    veloura: require("../../../assets/coaches/assets_coaches_coach_veloura.png"),
    aetheris: require("../../../assets/coaches/assets_coaches_coach_aetheris.png"),
    decibel: require("../../../assets/coaches/assets_coaches_coach_decibel.png"),
  };
  return avatars[coachId] || avatars.synapse;
};

export const CoachScreen: React.FC = () => {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const { user, session } = useAuth();
  const { profile } = useProfile();
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [showCoachSelector, setShowCoachSelector] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get personalized coach context
  const { context, isReady, contextSummary } = useCoachContext({
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
          .from("coaches")
          .select("*")
          .eq("is_active", true)
          .order("level");

        if (error) throw error;

        const coaches = (data as Coach[]) || [];
        setCoaches(coaches);

        // Load saved coach selection
        const savedCoachId = await AsyncStorage.getItem(SELECTED_COACH_KEY);
        if (savedCoachId && coaches.some((c) => c.id === savedCoachId)) {
          setSelectedCoachId(savedCoachId);
        } else if (coaches.length > 0) {
          // Default to first coach if none selected
          setSelectedCoachId(coaches[0].id);
        }
      } catch (error) {
        logger.error("Failed to fetch coaches from database", error as Error, {
          operation: "fetchCoaches",
          fallback: "synapse",
        });
        // Fallback to default if database fails
        setSelectedCoachId("synapse");
      } finally {
        setLoading(false);
      }
    };

    fetchCoaches();
  }, []);

  const selectedCoach = coaches.find((c) => c.id === selectedCoachId);

  // Map coach personality to persona for agent
  const coachPersona = selectedCoach?.personality?.toLowerCase() || "gentle";
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [state.messages]);

  const handleSelectCoach = async (coachId: string) => {
    try {
      setSelectedCoachId(coachId);
      await AsyncStorage.setItem(SELECTED_COACH_KEY, coachId);
      setShowCoachSelector(false);
    } catch (error) {
      logger.error("Failed to select coach", error as Error, {
        operation: "handleSelectCoach",
        coachId,
      });
      // Still set the coach ID even if saving fails
      setSelectedCoachId(coachId);
      setShowCoachSelector(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || state.thinking) return;

    const userMessage = inputText.trim();
    setInputText("");

    try {
      await sendMessage(userMessage);
    } catch (error) {
      logger.error("Failed to send coach message", error as Error, {
        operation: "handleSend",
        coachId: selectedCoachId,
        hasContext: !!context,
      });
    }
  };

  const renderMessage = (message: any, index: number) => {
    const isUser = message.role === "user";

    return (
      <View
        key={message.id || index}
        className={`mb-4 ${isUser ? "items-end" : "items-start"}`}
      >
        <View
          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-blue-500"
              : "bg-purple-100 dark:bg-purple-900/30"
          }`}
        >
          <Text
            className={`text-base ${
              isUser
                ? "text-white"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

  const renderWelcomeMessage = () => {
    if (state.messages.length > 0) return null;

    let welcomeText = "Hi! How can I help you today?";

    if (insights) {
      if (insights.overallStatus === "excellent") {
        welcomeText = "Amazing work! You're crushing your goals! 🔥 What can I help with today?";
      } else if (insights.overallStatus === "good") {
        welcomeText = "You're doing great! Keep up the momentum! 💪 How can I support you?";
      } else if (insights.overallStatus === "needs_attention") {
        welcomeText = `Let's focus on ${insights.primaryFocus} today. What's on your mind?`;
      } else if (insights.overallStatus === "getting_started") {
        welcomeText = "Welcome! I'm here to help you succeed. Let's start strong! 🚀";
      }
    }

    return (
      <View className="mb-4 items-start">
        <View className="max-w-[80%] rounded-2xl px-4 py-3 bg-purple-100 dark:bg-purple-900/30">
          <Text className="text-base text-gray-900 dark:text-gray-100">
            {welcomeText}
          </Text>
          {insights?.topChallenge && (
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Focus area: {insights.topChallenge}
            </Text>
          )}
          {insights?.latestAchievement && (
            <Text className="text-sm text-purple-600 dark:text-purple-400 mt-1">
              Recent win: {insights.latestAchievement}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  // Safety check: if no coaches loaded and no selected coach, show error
  if (!selectedCoachId || coaches.length === 0) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Coach Unavailable
          </Text>
          <Text className="text-center text-gray-600 dark:text-gray-400 mb-4">
            Unable to load coaches. Please check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              // Retry loading coaches
              const fetchCoaches = async () => {
                try {
                  const { data, error } = await supabase
                    .from("coaches")
                    .select("*")
                    .eq("is_active", true)
                    .order("level");

                  if (error) throw error;

                  const coaches = (data as Coach[]) || [];
                  setCoaches(coaches);

                  if (coaches.length > 0) {
                    setSelectedCoachId(coaches[0].id);
                  }
                } catch (error) {
                  logger.error("Failed to retry fetch coaches", error as Error);
                  setSelectedCoachId("synapse"); // Fallback
                } finally {
                  setLoading(false);
                }
              };
              fetchCoaches();
            }}
            className="bg-purple-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <View className="flex-1 px-4">
          {/* Header */}
          <View className="py-4 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Image
                  source={getCoachAvatar(selectedCoachId || "synapse")}
                  className="w-12 h-12 rounded-full mr-3"
                />
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedCoach?.name || "Your Coach"}
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedCoach?.personality} • Level {selectedCoach?.level}
                  </Text>
                  {isReady && contextSummary && (
                    <Text className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      🧠 {contextSummary.achievementCount} achievements • {contextSummary.challengeCount} focus areas
                    </Text>
                  )}
                </View>
              </View>

              {/* More options button */}
              <Pressable
                onPress={() => setShowCoachSelector(!showCoachSelector)}
                className="ml-2 p-2"
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={24}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
              </Pressable>
            </View>
          </View>

          {/* Coach Selection UI */}
          {showCoachSelector && (
            <View className="py-3 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Choose Your Coach:
              </Text>
              {context && context.userGoals.diet_type && (
                <Text className="text-xs text-gray-600 dark:text-gray-400 mb-2 italic">
                  Recommendations for {context.userGoals.diet_type} diet
                </Text>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                {coaches.map((coach) => {
                  const isSelected = coach.id === selectedCoachId;
                  const isRecommended = context && isCoachRecommendedForDiet(coach, context.userGoals.diet_type);

                  return (
                    <TouchableOpacity
                      key={coach.id}
                      onPress={() => handleSelectCoach(coach.id)}
                      className="mr-3"
                    >
                      <View
                        className={`p-3 rounded-xl border ${
                          isSelected
                            ? "bg-purple-100 dark:bg-purple-900/30 border-purple-500"
                            : isRecommended
                            ? "bg-gray-50 dark:bg-gray-800 border-yellow-500"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        }`}
                        style={{ width: 120 }}
                      >
                        <Image
                          source={getCoachAvatar(coach.id)}
                          className="w-16 h-16 rounded-full self-center mb-2"
                        />
                        <Text className="text-sm font-semibold text-center text-gray-900 dark:text-white">
                          {coach.name}
                          {isRecommended && !isSelected && " ⭐"}
                        </Text>
                        <Text className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">
                          Level {coach.level}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Quick Actions */}
              <View className="flex-row mt-3 gap-2">
                <Pressable
                  onPress={() => {
                    setShowCoachSelector(false);
                    navigation.navigate("CoachCall" as never);
                  }}
                  className="flex-1 bg-purple-500 rounded-xl py-3 items-center"
                >
                  <Ionicons name="call" size={20} color="white" />
                  <Text className="text-white text-xs font-semibold mt-1">
                    Phone Call
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowCoachSelector(false);
                    navigation.navigate("CoachSMS" as never);
                  }}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-xl py-3 items-center"
                >
                  <Ionicons
                    name="chatbubble"
                    size={20}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                  <Text className="text-gray-900 dark:text-white text-xs font-semibold mt-1">
                    Send SMS
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 py-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {renderWelcomeMessage()}
            {state.messages.map((message, index) => renderMessage(message, index))}

            {state.thinking && (
              <View className="items-start mb-4">
                <View className="bg-purple-100 dark:bg-purple-900/30 rounded-2xl px-4 py-3">
                  <ActivityIndicator size="small" color="#9333ea" />
                </View>
              </View>
            )}

            {state.error && (
              <View className="items-center mb-4">
                <View className="bg-red-100 dark:bg-red-900/30 rounded-2xl px-4 py-3 max-w-[80%]">
                  <Text className="text-sm text-red-800 dark:text-red-200">
                    {state.error}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View className="pb-4 border-t border-gray-200 dark:border-gray-700 pt-3">
            <View className="flex-row items-end">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask anything..."
                maxLength={500}
                className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 mr-2 text-gray-900 dark:text-white"
                editable={!state.thinking}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                returnKeyType="send"
              />
              <Pressable
                onPress={handleSend}
                disabled={!inputText.trim() || state.thinking}
                className={`rounded-full w-12 h-12 items-center justify-center ${
                  inputText.trim() && !state.thinking
                    ? "bg-purple-500"
                    : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() && !state.thinking ? "white" : "#9CA3AF"}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

export default CoachScreen;

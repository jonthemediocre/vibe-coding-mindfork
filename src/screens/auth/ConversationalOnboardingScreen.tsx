import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { Screen, Text, TextInput, useThemedStyles } from "../../ui";
import { useAuth } from "../../contexts/AuthContext";
import type { Theme } from "../../app-components/components/ThemeProvider";
import {
  sendOnboardingMessage,
  getInitialGreeting,
  isOnboardingComplete,
  completeOnboarding,
  extractDataFromText,
  type OnboardingData,
  type OnboardingMessage,
} from "../../services/OnboardingAgentService";
import { PhotoCaptureModal } from "../../components/PhotoCaptureModal";

interface ConversationalOnboardingScreenProps {
  navigation: any;
}

export const ConversationalOnboardingScreen: React.FC<
  ConversationalOnboardingScreenProps
> = ({ navigation }) => {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<OnboardingMessage[]>([
    {
      role: "assistant",
      content: getInitialGreeting(),
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: OnboardingMessage = {
      role: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Extract data from user's message using local parser
      const extractedData = extractDataFromText(inputText, onboardingData);
      setOnboardingData(extractedData);

      // Get AI response
      const result = await sendOnboardingMessage(
        [...messages, userMessage],
        extractedData
      );

      // Update data with AI extraction
      const finalData = { ...extractedData, ...result.extractedData };
      setOnboardingData(finalData);

      // Add AI response
      const aiMessage: OnboardingMessage = {
        role: "assistant",
        content: result.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Check if complete
      if (result.isComplete && isOnboardingComplete(finalData)) {
        await handleComplete(finalData as OnboardingData);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: OnboardingMessage = {
        role: "assistant",
        content: "I'm having trouble connecting right now. Let me try that again...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (data: OnboardingData) => {
    if (!user?.id) return;

    setIsCompleting(true);
    try {
      await completeOnboarding(user.id, data);

      // Show success message and prompt for photo
      const successMessage: OnboardingMessage = {
        role: "assistant",
        content: "Perfect! 🎉 I've got everything I need.\n\nBefore we get started, let's take a quick photo of you! I'll create a special welcome image you can share on social media to celebrate starting your wellness journey. 📸",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);

      // Wait a moment, then show photo capture
      setTimeout(() => {
        setShowPhotoCapture(true);
      }, 2000);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      const errorMessage: OnboardingMessage = {
        role: "assistant",
        content: "Oops, I had trouble saving your information. Could you try sending your last message again?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsCompleting(false);
    }
  };

  const handlePhotoCapture = (photoUri: string) => {
    setCapturedPhotoUri(photoUri);
    setShowPhotoCapture(false);

    // Navigate to shareable image screen
    const goalText = onboardingData.primaryGoal?.replace('_', ' ') || 'wellness journey';

    navigation.navigate('ShareableImage', {
      userPhotoUri: photoUri,
      userName: onboardingData.fullName || 'there',
      userGoal: goalText,
    });
  };

  const handleSkipPhoto = () => {
    setShowPhotoCapture(false);

    // Navigate directly to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const renderMessage = (message: OnboardingMessage, index: number) => {
    const isAssistant = message.role === "assistant";

    return (
      <View
        key={index}
        className={`mb-4 ${isAssistant ? "items-start" : "items-end"}`}
      >
        <View
          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
            isAssistant
              ? "bg-purple-100 dark:bg-purple-900/30"
              : "bg-blue-500"
          }`}
        >
          <Text
            className={`text-base ${
              isAssistant
                ? "text-gray-900 dark:text-gray-100"
                : "text-white"
            }`}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

  const renderDataPreview = () => {
    const fields = [];

    if (onboardingData.fullName) fields.push(`Name: ${onboardingData.fullName}`);
    if (onboardingData.age) fields.push(`Age: ${onboardingData.age}`);
    if (onboardingData.gender) fields.push(`Gender: ${onboardingData.gender}`);
    if (onboardingData.heightFeet) {
      fields.push(
        `Height: ${onboardingData.heightFeet}'${onboardingData.heightInches || 0}"`
      );
    }
    if (onboardingData.weightLbs) fields.push(`Weight: ${onboardingData.weightLbs} lbs`);
    if (onboardingData.primaryGoal) {
      const goalLabels = {
        lose_weight: "Lose Weight",
        gain_muscle: "Gain Muscle",
        maintain: "Maintain",
        get_healthy: "Get Healthy",
      };
      fields.push(`Goal: ${goalLabels[onboardingData.primaryGoal]}`);
    }
    if (onboardingData.activityLevel) {
      fields.push(`Activity: ${onboardingData.activityLevel}`);
    }
    if (onboardingData.dietType) {
      fields.push(`Diet: ${onboardingData.dietType}`);
    }

    if (fields.length === 0) return null;

    return (
      <View className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
        <Text className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          Information collected:
        </Text>
        {fields.map((field, idx) => (
          <Text
            key={idx}
            className="text-xs text-gray-700 dark:text-gray-300 mb-1"
          >
            • {field}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <Screen preset="fixed" safeAreaEdges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <View className="flex-1 px-4">
          {/* Header */}
          <View className="py-4 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              <Image
                source={require("../../../assets/coaches/assets_coaches_coach_synapse.png")}
                className="w-12 h-12 rounded-full mr-3"
              />
              <View>
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  Synapse
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Your AI Health Coach
                </Text>
              </View>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 py-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {messages.map((message, index) => renderMessage(message, index))}

            {isLoading && (
              <View className="items-start mb-4">
                <View className="bg-purple-100 dark:bg-purple-900/30 rounded-2xl px-4 py-3">
                  <ActivityIndicator size="small" color="#9333ea" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Data Preview */}
          {renderDataPreview()}

          {/* Input */}
          <View className="pb-4 border-t border-gray-200 dark:border-gray-700 pt-3">
            <View className="flex-row items-end">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                multiline
                maxLength={500}
                className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 mr-2 max-h-24"
                editable={!isCompleting}
                onSubmitEditing={handleSend}
              />
              <Pressable
                onPress={handleSend}
                disabled={!inputText.trim() || isLoading || isCompleting}
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  inputText.trim() && !isLoading && !isCompleting
                    ? "bg-blue-500"
                    : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <Text className="text-white text-xl">↑</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Photo Capture Modal */}
      <PhotoCaptureModal
        visible={showPhotoCapture}
        onClose={handleSkipPhoto}
        onPhotoCapture={handlePhotoCapture}
      />
    </Screen>
  );
};

const createStyles = (theme: Theme) => ({});

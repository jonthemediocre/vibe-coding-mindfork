import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { TabNavigator } from "./TabNavigator";
import { SignInScreen } from "../screens/auth/SignInScreen";
import { ConversationalOnboardingScreen } from "../screens/auth/ConversationalOnboardingScreen";
import { ShareableImageScreen } from "../screens/onboarding/ShareableImageScreen";
import { useTheme } from "../app-components/components/ThemeProvider";
import { useAuth } from "../contexts/AuthContext";
import { useProfile } from "../contexts/ProfileContext";

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.background,
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

export function AuthNavigator() {
  const { isAuthenticated, isInitialized, user, session } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { isDark } = useTheme();

  // Check if user needs onboarding based on profile existence or completion status
  const needsOnboarding = isAuthenticated && !profileLoading && (!profile || !profile.onboarding_completed);

  // Debug logging for navigation state
  React.useEffect(() => {
    if (__DEV__) {
      console.log("AuthNavigator state:", {
        isAuthenticated,
        isInitialized,
        hasUser: !!user,
        hasSession: !!session,
        userId: user?.id,
        hasProfile: !!profile,
        profileLoading,
        needsOnboarding,
      });
    }
  }, [isAuthenticated, isInitialized, user, session, profile, profileLoading, needsOnboarding]);

  if (!isInitialized || (isAuthenticated && profileLoading)) {
    return <LoadingScreen />;
  }

  const navigationTheme = isDark ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        id={undefined}
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Auth" component={SignInScreen} />
          </>
        ) : needsOnboarding ? (
          <>
            <Stack.Screen
              name="Onboarding"
              component={ConversationalOnboardingScreen}
              options={{ animationTypeForReplace: 'push' }}
            />
            <Stack.Screen
              name="ShareableImage"
              component={ShareableImageScreen}
              options={{ animationTypeForReplace: 'push' }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Main"
            component={TabNavigator}
            options={{ animationTypeForReplace: 'push' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AuthNavigator;

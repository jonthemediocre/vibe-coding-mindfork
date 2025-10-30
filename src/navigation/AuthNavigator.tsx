import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { TabNavigator } from "./TabNavigator";
import { SignInScreen } from "../screens/auth/SignInScreen";
import { ConversationalOnboardingScreen } from "../screens/auth/ConversationalOnboardingScreen";
import { useTheme } from "../app-components/components/ThemeProvider";
import { useAuth } from "../contexts/AuthContext";

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
  const { isDark } = useTheme();
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false);

  // Check if user needs onboarding
  React.useEffect(() => {
    if (isAuthenticated && user) {
      // For development bypass, always show onboarding to test it
      if (user.id === "dev-user-123") {
        setNeedsOnboarding(true);
        return;
      }
      
      // In real app, check if onboarding is completed
      // This would typically come from the user profile
      setNeedsOnboarding(false);
    }
  }, [isAuthenticated, user]);

  // Debug logging for navigation state
  React.useEffect(() => {
    if (__DEV__) {
      console.log("AuthNavigator state:", {
        isAuthenticated,
        isInitialized,
        hasUser: !!user,
        hasSession: !!session,
        userId: user?.id,
        needsOnboarding,
      });
    }
  }, [isAuthenticated, isInitialized, user, session, needsOnboarding]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  const navigationTheme = isDark ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
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
          <Stack.Screen
            name="Onboarding"
            component={ConversationalOnboardingScreen}
            options={{ animationTypeForReplace: 'push' }}
          />
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

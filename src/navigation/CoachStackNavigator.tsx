import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useTheme } from "../app-components/components/ThemeProvider";
import { CoachScreen } from "../screens/coach/CoachScreen";
import { CoachCallScreen } from "../screens/coach/CoachCallScreen";
import { CoachSMSScreen } from "../screens/coach/CoachSMSScreen";

const Stack = createStackNavigator();

export function CoachStackNavigator() {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen
        name="CoachMain"
        component={CoachScreen}
        options={{
          headerShown: false, // Hide header since it's shown in tab navigator
        }}
      />
      <Stack.Screen
        name="CoachCall"
        component={CoachCallScreen}
        options={{
          headerTitle: "Voice Call",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="CoachSMS"
        component={CoachSMSScreen}
        options={{
          headerTitle: "SMS Messages",
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
}

export default CoachStackNavigator;

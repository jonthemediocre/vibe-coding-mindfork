import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigationState } from "@react-navigation/native";
import { Feather as Icon } from "@expo/vector-icons";
import { useTheme } from "../app-components/components/ThemeProvider";
import { ThemeToggle } from "../components/ThemeToggle";
import { DashboardScreen } from "../screens/dashboard/DashboardScreen";
import { FoodScreen } from "../screens/food/FoodScreen";
import { FastingScreen } from "../screens/fasting/FastingScreen";
import { MealsScreen } from "../screens/meals/MealsScreen";
import { CoachStackNavigator } from "./CoachStackNavigator";
import { SettingsStackNavigator } from "./SettingsStackNavigator";
import { analytics } from "../utils/analytics";
import { performanceMonitor } from "../utils/performance";

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Track screen views with analytics and performance monitoring
  const navigationState = useNavigationState(state => state);

  useEffect(() => {
    if (navigationState) {
      const currentRoute = navigationState.routes[navigationState.index];
      const screenName = currentRoute.name;

      // Track screen view
      analytics.trackScreenView(screenName, {
        routeParams: currentRoute.params,
      });

      // Track performance
      performanceMonitor.startScreenRender(screenName);

      return () => {
        performanceMonitor.endScreenRender(screenName);
      };
    }
  }, [navigationState]);

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
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
        headerRight: () => <ThemeToggle size={20} style={{ marginRight: 16 }} />,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} />,
          headerTitle: "MindFork",
        }}
      />
      <Tab.Screen
        name="Food"
        component={FoodScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="camera" color={color} size={size} />,
          headerTitle: "Food tracking",
        }}
      />
      <Tab.Screen
        name="Fasting"
        component={FastingScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="clock" color={color} size={size} />,
          headerTitle: "Fasting",
        }}
      />
      <Tab.Screen
        name="Meals"
        component={MealsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="book-open" color={color} size={size} />,
          headerTitle: "Meal planning",
        }}
      />
      <Tab.Screen
        name="Coach"
        component={CoachStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="message-circle" color={color} size={size} />,
          headerTitle: "AI Coach",
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="settings" color={color} size={size} />,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

export default TabNavigator;


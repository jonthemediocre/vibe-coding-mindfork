import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { DevToolsScreen } from '../screens/DevToolsScreen';
import { useTheme } from '../app-components/components/ThemeProvider';
import { ThemeToggle } from '../components/ThemeToggle';

const Stack = createNativeStackNavigator();

export function SettingsStackNavigator() {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerRight: () => <ThemeToggle size={20} style={{ marginRight: 16 }} />,
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          headerTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="DevTools"
        component={DevToolsScreen}
        options={{
          headerTitle: 'Developer Tools',
        }}
      />
    </Stack.Navigator>
  );
}

export default SettingsStackNavigator;

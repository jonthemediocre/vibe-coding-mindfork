import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../app-components/components/ThemeProvider';
import { FoodScreen } from '../screens/food/FoodScreen';
import { FoodEntryConfirmScreen } from '../screens/food/FoodEntryConfirmScreen';
import { FoodStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<FoodStackParamList>();

export function FoodStackNavigator() {
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
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="FoodMain"
        component={FoodScreen}
        options={{
          headerShown: false, // Hide header since it's shown in tab navigator
        }}
      />
      <Stack.Screen
        name="FoodEntryConfirm"
        component={FoodEntryConfirmScreen}
        options={{
          headerShown: false, // Custom header in component
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

export default FoodStackNavigator;

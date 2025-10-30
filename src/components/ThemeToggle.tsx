import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../app-components/components/ThemeProvider';

export interface ThemeToggleProps {
  size?: number;
  style?: any;
}

/**
 * Theme toggle button component
 * Toggles between light and dark mode with smooth icon transition
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ size = 24, style }) => {
  const { isDark, toggleTheme, theme } = useTheme();

  return (
    <Pressable
      onPress={toggleTheme}
      style={[styles.container, style]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
        <Ionicons
          name={isDark ? 'sunny' : 'moon'}
          size={size}
          color={theme.colors.primary}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

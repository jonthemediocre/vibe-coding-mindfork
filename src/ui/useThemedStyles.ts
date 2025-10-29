import { useMemo } from "react";
import { StyleSheet } from "react-native";
import type { Theme } from "../app-components/components/ThemeProvider";
import { useTheme } from "../app-components/components/ThemeProvider";

/**
 * Helper hook to create memoized StyleSheet objects that respond to theme changes.
 */
export function useThemedStyles<T extends Record<string, any>>(
  factory: (theme: Theme) => T,
): T {
  const { theme } = useTheme();

  return useMemo(() => StyleSheet.create(factory(theme)), [factory, theme]);
}

/**
 * Convenience helper for accessing theme colors outside StyleSheet contexts.
 */
export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}

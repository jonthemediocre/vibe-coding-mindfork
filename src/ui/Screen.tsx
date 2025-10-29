import React from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, ViewProps, ViewStyle } from "react-native";
import { useTheme } from "../app-components/components/ThemeProvider";

export interface ScreenProps extends ViewProps {
  scrollable?: boolean;
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
}

export const Screen: React.FC<ScreenProps> = ({
  scrollable = false,
  children,
  style,
  contentContainerStyle,
  ...rest
}) => {
  const { theme, isDark } = useTheme();
  const backgroundColor = theme.colors.background;

  if (scrollable) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} {...rest}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ScrollView
          contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
          style={[styles.flex, style]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }, style]} {...rest}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
});

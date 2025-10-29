import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";
import { useTheme } from "../app-components/components/ThemeProvider";

export interface CardProps extends ViewProps {
  elevation?: 0 | 1 | 2 | 3;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevation = 1,
  padding = "md",
  ...rest
}) => {
  const { theme } = useTheme();
  const paddingValue = padding === "none" ? 0 : theme.spacing[padding];
  const elevationStyle = elevation === 0 ? null : theme.elevation[`level${elevation}` as const];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: paddingValue,
          borderColor: theme.colors.border,
        },
        elevationStyle,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default Card;

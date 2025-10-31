import React from "react";
import { ActivityIndicator, GestureResponderEvent, Pressable, PressableProps, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "./Text";
import type { TextVariant } from "./Text";
import { useTheme } from "../app-components/components/ThemeProvider";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  containerStyle?: ViewStyle;
  onPress?: (event: GestureResponderEvent) => void;
}

const sizeStyles: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; borderRadius: number; textVariant: TextVariant }> = {
  small: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, textVariant: "bodySmall" },
  medium: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 22, textVariant: "body" },
  large: { paddingVertical: 18, paddingHorizontal: 28, borderRadius: 24, textVariant: "bodyLarge" },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  size = "medium",
  loading = false,
  iconLeft,
  iconRight,
  containerStyle,
  disabled,
  ...pressableProps
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const sizeStyle = sizeStyles[size];

  const renderIcon = (icon: React.ReactNode, position: "left" | "right") => {
    if (!icon) return null;
    const spacerStyle = position === "left" ? styles.iconLeft : styles.iconRight;
    return <View style={spacerStyle}>{icon}</View>;
  };

  const baseStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: sizeStyle.borderRadius,
    paddingHorizontal: sizeStyle.paddingHorizontal,
    paddingVertical: sizeStyle.paddingVertical,
  } as ViewStyle;

  let variantStyle: ViewStyle;
  let textColor: string;

  switch (variant) {
    case "secondary":
      variantStyle = { backgroundColor: colors.surface };
      textColor = colors.text;
      break;
    case "outline":
      variantStyle = { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border };
      textColor = colors.text;
      break;
    case "ghost":
      variantStyle = { backgroundColor: "transparent" };
      textColor = colors.text;
      break;
    case "primary":
    default:
      variantStyle = { backgroundColor: colors.primary };
      textColor = colors.onPrimary;
      break;
  }

  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        baseStyle,
        variantStyle,
        pressed && !isDisabled ? styles.pressed : undefined,
        isDisabled ? styles.disabled : undefined,
        containerStyle,
      ]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.onPrimary : colors.text} />
      ) : (
        <>
          {renderIcon(iconLeft, "left")}
          <Text variant={sizeStyle.textVariant ?? "body"} color={textColor}>
            {title}
          </Text>
          {renderIcon(iconRight, "right")}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

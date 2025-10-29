import React from "react";
import { Text as RNText, TextProps as RNTextProps, TextStyle } from "react-native";
import { useTheme } from "../app-components/components/ThemeProvider";

export type TextVariant =
  | "headingLarge"
  | "headingMedium"
  | "headingSmall"
  | "titleLarge"
  | "titleMedium"
  | "titleSmall"
  | "bodyLarge"
  | "body"
  | "bodySmall"
  | "caption";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: "left" | "center" | "right";
}

const variantStyles: Record<TextVariant, { fontSize: number; fontWeight: TextStyle["fontWeight"]; lineHeight?: number }> = {
  headingLarge: { fontSize: 32, fontWeight: "700", lineHeight: 40 },
  headingMedium: { fontSize: 28, fontWeight: "700", lineHeight: 34 },
  headingSmall: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
  titleLarge: { fontSize: 22, fontWeight: "600", lineHeight: 28 },
  titleMedium: { fontSize: 20, fontWeight: "600", lineHeight: 26 },
  titleSmall: { fontSize: 18, fontWeight: "600", lineHeight: 24 },
  bodyLarge: { fontSize: 17, fontWeight: "500", lineHeight: 24 },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "400", lineHeight: 16 },
};

export const Text: React.FC<TextProps> = ({
  variant = "body",
  color,
  align = "left",
  style,
  children,
  ...rest
}) => {
  const { theme } = useTheme();
  const defaultColor = color ?? theme.colors.text;
  const variantStyle = variantStyles[variant];

  return (
    <RNText
      style={[
        {
          color: defaultColor,
          textAlign: align,
        },
        variantStyle,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};

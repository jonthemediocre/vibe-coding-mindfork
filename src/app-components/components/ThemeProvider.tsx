import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "mindfork-theme-preference";

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    onPrimary: string;
    onSurface: string;
  };
  elevation: {
    level1: ViewStyle;
    level2: ViewStyle;
    level3: ViewStyle;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
}

const lightTheme: Theme = {
  colors: {
    primary: "#FF6B9D",
    secondary: "#6B7280",
    background: "#FFFFFF",
    surface: "#F7F7F7",
    text: "#1A1A1A",
    textSecondary: "#4B5563",
    border: "rgba(0,0,0,0.12)",
    error: "#FF3B30",
    success: "#34C759",
    warning: "#FF9500",
    info: "#5AC8FA",
    onPrimary: "#FFFFFF",
    onSurface: "#1A1A1A",
  },
  elevation: {
    level1: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    level2: {
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    level3: {
      shadowColor: "#000",
      shadowOpacity: 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  },
  spacing: {
    xs: 6,
    sm: 12,
    md: 24,
    lg: 32,
    xl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 24,
    full: 9999,
  },
};

const darkTheme: Theme = {
  colors: {
    primary: "#FFA8D2",
    secondary: "#9E9E9E",
    background: "#1A1A1A",
    surface: "#2A2A2A",
    text: "#FFFFFF",
    textSecondary: "#9E9E9E",
    border: "rgba(255, 255, 255, 0.1)",
    error: "#FF453A",
    success: "#32D74B",
    warning: "#FF9F0A",
    info: "#64D2FF",
    onPrimary: "#1A1A1A",
    onSurface: "#FFFFFF",
  },
  elevation: {
    level1: {
      shadowColor: "#000",
      shadowOpacity: 0.4,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    level2: {
      shadowColor: "#000",
      shadowOpacity: 0.5,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    level3: {
      shadowColor: "#000",
      shadowOpacity: 0.6,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
};

export interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === "dark");
  const [isLoading, setIsLoading] = useState(true);
  const theme = isDark ? darkTheme : lightTheme;

  // Load saved theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved !== null) {
          setIsDark(saved === "dark");
        }
      } catch (error) {
        console.warn("Failed to load theme preference:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadThemePreference();
  }, []);

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    // Persist theme preference
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newIsDark ? "dark" : "light");
    } catch (error) {
      console.warn("Failed to save theme preference:", error);
    }
  };

  // Don't render children until theme is loaded
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeProvider;

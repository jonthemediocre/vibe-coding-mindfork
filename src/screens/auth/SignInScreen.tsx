import React, { useState, useRef } from "react";
import { View, StyleSheet, TextInput, Alert, Dimensions, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, Button, useThemeColors, useThemedStyles } from "../../ui";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../app-components/components/ThemeProvider";
import { ENV } from "../../config/env";

const { width } = Dimensions.get('window');
const PHI = 1.618; // Golden ratio

export const SignInScreen: React.FC = () => {
  const { signIn, signUp, bypassAuth, isLoading } = useAuth();
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const { isDark } = useTheme();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing information", "Please enter email and password.");
      return;
    }

    try {
      if (mode === "signin") {
        await signIn(email.trim().toLowerCase(), password);
      } else {
        await signUp(email.trim().toLowerCase(), password);
        Alert.alert("Check your inbox", "Confirm your email to finish creating your account.");
        setMode("signin");
      }
    } catch (error: any) {
      Alert.alert("Authentication error", error.message ?? "Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={isDark
          ? ['#1A1A1A', '#2A2A2A', '#1A1A1A']
          : ['#FFE5EF', '#FFF5F8', '#FFFFFF']
        }
        style={styles.gradient}
      />

      {/* Theme Toggle */}
      <View style={styles.themeToggleContainer}>
        <ThemeToggle />
      </View>

      {/* Content with ScrollView */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Branding */}
          <View style={styles.brandingContainer}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="bulb" size={60} color="#FFFFFF" />
            </View>
            <Text style={[styles.appName, {
              color: colors.text,
              textShadowColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }]}>
              MindFork
            </Text>
            <Text style={[styles.tagline, {
              color: colors.textSecondary,
              textShadowColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            }]}>
              Your AI-Powered Health Coach
            </Text>
          </View>

          {/* Auth Card */}
          <Card elevation={3} padding="lg" style={styles.card}>
            <Text variant="headingSmall" style={[styles.heading, { color: colors.text }]}>
              {mode === "signin" ? "Welcome Back" : "Join MindFork"}
            </Text>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {mode === "signin"
                ? "Sign in to continue your journey"
                : "Start your personalized wellness journey"
              }
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Email address"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
                style={[styles.input, {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: isDark ? colors.surface : colors.background,
                }]}
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.passwordContainer}>
                <TextInput
                  ref={passwordInputRef}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  blurOnSubmit={true}
                  enablesReturnKeyAutomatically={true}
                  textContentType="password"
                  autoComplete="password"
                  style={[styles.input, styles.passwordInput, {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: isDark ? colors.surface : colors.background,
                  }]}
                  placeholderTextColor={colors.textSecondary}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            <Button
              title={mode === "signin" ? "Sign In" : "Create Account"}
              onPress={handleSubmit}
              loading={isLoading}
              containerStyle={styles.submitButton}
            />

            <View style={styles.switchRow}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <Button
                title={mode === "signin" ? "Sign Up" : "Sign In"}
                variant="ghost"
                size="small"
                onPress={() => setMode(prev => (prev === "signin" ? "signup" : "signin"))}
              />
            </View>
          </Card>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <FeatureItem
              icon="fitness"
              text="Personalized Goals"
              color={colors.textSecondary}
            />
            <FeatureItem
              icon="chatbubble-ellipses"
              text="AI Coach"
              color={colors.textSecondary}
            />
            <FeatureItem
              icon="stats-chart"
              text="Track Progress"
              color={colors.textSecondary}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// Feature item component
const FeatureItem: React.FC<{ icon: string; text: string; color: string }> = ({ icon, text, color }) => (
  <View style={featureStyles.container}>
    <Ionicons name={icon as any} size={20} color={color} />
    <Text style={[featureStyles.text, { color }]}>{text}</Text>
  </View>
);

const featureStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    themeToggleContainer: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 10,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 100,
      paddingBottom: 40,
    },
    brandingContainer: {
      alignItems: 'center',
      marginBottom: 48,
    },
    logoContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Math.round(120 / PHI), // Golden ratio: 120 / 1.618 ≈ 74px
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 12,
    },
    logoText: {
      fontSize: 48,
    },
    appName: {
      fontSize: 42,
      fontWeight: '900',
      marginBottom: Math.round(42 / PHI / PHI), // 42 / PHI² ≈ 16px
      letterSpacing: -1.5,
    },
    tagline: {
      fontSize: 17,
      fontWeight: '600',
      textAlign: 'center',
    },
    card: {
      borderRadius: 24,
      marginBottom: 32,
    },
    heading: {
      marginBottom: 8,
      fontSize: 24,
      fontWeight: '700',
    },
    subtitle: {
      marginBottom: 24,
      fontSize: 15,
    },
    inputContainer: {
      gap: 12,
      marginBottom: 20,
    },
    passwordContainer: {
      position: 'relative',
    },
    input: {
      borderWidth: 2,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 16,
      fontSize: 16,
    },
    passwordInput: {
      paddingRight: 50, // Space for eye icon
    },
    passwordToggle: {
      position: 'absolute',
      right: 14,
      top: 16,
      padding: 4,
    },
    submitButton: {
      marginBottom: 16,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    featuresContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 16,
      marginBottom: 24,
    },
    devCard: {
      borderRadius: 16,
      alignItems: 'center',
    },
    devLabel: {
      marginBottom: 12,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      fontWeight: '600',
    },
    bypassButton: {
      width: '100%',
    },
  });

export default SignInScreen;


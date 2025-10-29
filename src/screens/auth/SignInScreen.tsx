import React, { useState } from "react";
import { View, StyleSheet, TextInput, Alert } from "react-native";
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from "../../ui";
import { useAuth } from "../../contexts/AuthContext";
import { ENV } from "../../config/env";

export const SignInScreen: React.FC = () => {
  const { signIn, signUp, bypassAuth, isLoading } = useAuth();
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    <Screen contentContainerStyle={styles.container}>
      <Card elevation={2} padding="lg">
        <Text variant="headingSmall" style={styles.heading}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </Text>
        <TextInput
          placeholder="you@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholderTextColor={colors.textSecondary}
        />
        <Button
          title={mode === "signin" ? "Sign in" : "Sign up"}
          onPress={handleSubmit}
          loading={isLoading}
          containerStyle={styles.submitButton}
        />
        <View style={styles.switchRow}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {mode === "signin" ? "Need an account?" : "Already have an account?"}
          </Text>
          <Button
            title={mode === "signin" ? "Create one" : "Sign in"}
            variant="ghost"
            size="small"
            onPress={() => setMode(prev => (prev === "signin" ? "signup" : "signin"))}
          />
        </View>
        
        {/* Development bypass auth button */}
        {ENV.BYPASS_AUTH && __DEV__ && (
          <View style={styles.devSection}>
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.devLabel}>
              Development Mode
            </Text>
            <Button
              title="🚀 Bypass Auth (Dev Only)"
              variant="outline"
              size="small"
              onPress={() => bypassAuth()}
              loading={isLoading}
              containerStyle={styles.bypassButton}
            />
          </View>
        )}
      </Card>
    </Screen>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    heading: {
      marginBottom: 16,
    },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
    },
    submitButton: {
      marginTop: 8,
    },
    switchRow: {
      marginTop: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    devSection: {
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(0,0,0,0.1)",
      alignItems: "center",
    },
    devLabel: {
      marginBottom: 8,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    bypassButton: {
      width: "100%",
    },
  });

export default SignInScreen;


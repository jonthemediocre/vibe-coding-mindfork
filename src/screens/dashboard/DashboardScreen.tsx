import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Screen, Text, useThemeColors, useThemedStyles } from "../../ui";
import { useProfile } from "../../contexts/ProfileContext";
import { PersonalizedDashboard } from "../../components/dashboard";
import { useNavigation } from "@react-navigation/native";

export const DashboardScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const { profile, loading, error } = useProfile();

  // Handle navigation from PersonalizedDashboard
  const handleNavigation = (screen: string) => {
    navigation.navigate(screen as never);
  };

  if (loading && !profile) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="body" style={styles.loadingText}>
            Loading your personalized dashboard...
          </Text>
        </View>
      </Screen>
    );
  }

  if (error && !profile) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text variant="headingSmall" style={styles.errorTitle}>
            Unable to load dashboard
          </Text>
          <Text variant="body" style={styles.errorText}>
            {error}
          </Text>
        </View>
      </Screen>
    );
  }

  return <PersonalizedDashboard onNavigate={handleNavigation} />;
};

const createStyles = () =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    errorTitle: {
      marginBottom: 16,
      textAlign: "center",
    },
    errorText: {
      textAlign: "center",
      opacity: 0.7,
    },
  });

export default DashboardScreen;

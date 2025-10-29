import React, { useState } from "react";
import { View, StyleSheet, TextInput, Alert } from "react-native";
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from "../../ui";
import type { Theme } from "../../app-components/components/ThemeProvider";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1');
  };

  const handleSavePhone = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert("Phone Number Required", "Please enter a phone number.");
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid 10-digit US phone number."
      );
      return;
    }

    try {
      setIsSaving(true);

      // Clean phone number for storage
      const cleaned = phoneNumber.replace(/\D/g, '');
      const formattedForStorage = cleaned.length === 10 ? `+1${cleaned}` : `+${cleaned}`;

      // Update user metadata in Supabase auth
      const { error } = await supabase.auth.updateUser({
        data: { phone_number: formattedForStorage }
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Success",
        "Phone number updated successfully!",
        [
          {
            text: "OK",
            onPress: () => setIsEditing(false),
          },
        ]
      );

      // Update local user object (this would typically be handled by your auth context)
      if (user) {
        user.phone_number = formattedForStorage;
      }
    } catch (error: any) {
      console.error('[ProfileScreen] Failed to update phone number:', error);
      Alert.alert(
        "Update Failed",
        error.message || "Failed to update phone number. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setPhoneNumber(user?.phone_number || "");
    setIsEditing(false);
  };

  return (
    <Screen contentContainerStyle={styles.container}>
      <Card elevation={2} padding="lg" style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text variant="titleLarge" color={colors.onPrimary}>
            {user?.email ? user.email[0]?.toUpperCase() : "M"}
          </Text>
        </View>
        <Text variant="titleMedium" style={styles.name}>
          {user?.email ?? "MindFork member"}
        </Text>
        <Text variant="body" color={colors.textSecondary}>
          Personalized nutrition coaching.
        </Text>
      </Card>

      <Card>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Account
        </Text>
        <View style={styles.row}>
          <Text variant="body">Email</Text>
          <Text variant="body" color={colors.textSecondary}>
            {user?.email ?? "--"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text variant="body">Status</Text>
          <Text variant="body" color={colors.textSecondary}>
            Active
          </Text>
        </View>
      </Card>

      <Card style={styles.phoneCard}>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Phone Number
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.phoneDescription}>
          Enable voice calls and SMS from your AI coach
        </Text>

        {isEditing ? (
          <>
            <TextInput
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              maxLength={14}
              style={[styles.phoneInput, { color: colors.text, borderColor: colors.border }]}
            />
            <View style={styles.phoneActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={handleCancelEdit}
                disabled={isSaving}
                containerStyle={styles.phoneButtonLeft}
              />
              <Button
                title={isSaving ? "Saving..." : "Save"}
                variant="primary"
                onPress={handleSavePhone}
                disabled={isSaving}
                containerStyle={styles.phoneButtonRight}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.phoneDisplay}>
              <Text variant="body" color={colors.text}>
                {user?.phone_number || "Not set"}
              </Text>
            </View>
            <Button
              title={user?.phone_number ? "Update Phone" : "Add Phone Number"}
              variant="outline"
              onPress={() => setIsEditing(true)}
              containerStyle={styles.editPhoneButton}
            />
          </>
        )}
      </Card>

      <Card>
        <Button title="Sign out" variant="outline" onPress={signOut} containerStyle={styles.signOutButton} />
      </Card>
    </Screen>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    profileCard: {
      alignItems: "center",
      marginBottom: 16,
    },
    avatarCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    name: {
      marginBottom: 4,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    phoneCard: {
      marginTop: 16,
      marginBottom: 16,
      padding: 16,
    },
    phoneDescription: {
      marginBottom: 16,
    },
    phoneInput: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      fontSize: 16,
    },
    phoneDisplay: {
      paddingVertical: 12,
      marginBottom: 12,
    },
    phoneActions: {
      flexDirection: 'row',
    },
    phoneButton: {
      marginBottom: 0,
    },
    phoneButtonLeft: {
      flex: 1,
      marginRight: 8,
      marginBottom: 0,
    },
    phoneButtonRight: {
      flex: 1,
      marginBottom: 0,
    },
    editPhoneButton: {
      marginTop: 4,
    },
    signOutButton: {
      marginTop: 0,
    },
  });

export default ProfileScreen;

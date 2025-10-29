/**
 * Wellness Notice Component
 * Informs users about wellness and fitness positioning
 */

import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Text, Button, useThemeColors } from '../../ui';

interface WellnessNoticeProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

export const WellnessNotice: React.FC<WellnessNoticeProps> = ({
  visible,
  onAccept,
  onDecline,
  onClose,
}) => {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text variant="titleLarge">Welcome to Your Wellness Journey</Text>
          <TouchableOpacity onPress={onClose}>
            <Text variant="body" color={colors.primary}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Card style={styles.welcomeCard}>
            <Text variant="titleMedium" color={colors.primary} style={styles.welcomeTitle}>
              🌟 Fitness & Wellness Platform
            </Text>
            <Text variant="body">
              Mindfork is your personal wellness and fitness companion, designed to help you achieve 
              your lifestyle goals through smart nutrition tracking and AI-powered guidance.
            </Text>
          </Card>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            How We Handle Your Wellness Information
          </Text>

          <Text variant="body" style={styles.listItem}>
            • <Text style={styles.bold}>Lifestyle preferences only</Text> - We collect fitness goals and food preferences
          </Text>
          <Text variant="body" style={styles.listItem}>
            • <Text style={styles.bold}>Secure storage</Text> - All your wellness data is protected
          </Text>
          <Text variant="body" style={styles.listItem}>
            • <Text style={styles.bold}>Privacy focused</Text> - Your personal information stays private
          </Text>
          <Text variant="body" style={styles.listItem}>
            • <Text style={styles.bold}>Your control</Text> - Manage your data and preferences anytime
          </Text>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Your AI Wellness Coaches
          </Text>

          <Text variant="body" style={styles.paragraph}>
            Our AI coaches are <Text style={styles.bold}>wellness mentors</Text> who provide lifestyle and fitness guidance. 
            Your preferences help them:
          </Text>

          <Text variant="body" style={styles.listItem}>
            • Suggest foods that match your dietary preferences
          </Text>
          <Text variant="body" style={styles.listItem}>
            • Provide personalized fitness and energy optimization tips
          </Text>
          <Text variant="body" style={styles.listItem}>
            • Support your wellness goals with motivational guidance
          </Text>

          <Card style={styles.disclaimerCard}>
            <Text variant="titleSmall" style={styles.disclaimerTitle}>
              Important Information
            </Text>
            <Text variant="body" color={colors.textSecondary}>
              Mindfork is a wellness and fitness platform designed to support your lifestyle goals. 
              We provide general wellness guidance and are not a medical service. For health concerns, 
              always consult qualified healthcare professionals.
            </Text>
          </Card>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Your Data Control
          </Text>

          <Text variant="body" style={styles.listItem}>
            • <Text style={styles.bold}>View</Text> - Access your wellness profile and preferences anytime
          </Text>
          <Text variant="body" style={styles.listItem}>
            • <Text style={styles.bold}>Update</Text> - Change your fitness goals and food preferences
          </Text>
          <Text variant="body" style={styles.listItem}>
            • <Text style={styles.bold}>Delete</Text> - Remove your data whenever you want
          </Text>
          <Text variant="body" style={styles.listItem}>
            • <Text style={styles.bold}>Export</Text> - Download your wellness profile
          </Text>

          <Text variant="caption" color={colors.textSecondary} style={styles.footer}>
            By continuing, you understand that Mindfork is a wellness and fitness platform that 
            provides lifestyle guidance to support your personal wellness journey.
          </Text>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Button
            title="Maybe Later"
            variant="outline"
            onPress={onDecline}
            containerStyle={styles.declineButton}
          />
          <Button
            title="Start My Wellness Journey"
            variant="primary"
            onPress={onAccept}
            containerStyle={styles.acceptButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  welcomeTitle: {
    marginBottom: 8,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 12,
  },
  listItem: {
    marginBottom: 8,
    lineHeight: 20,
  },
  paragraph: {
    marginBottom: 12,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
  },
  disclaimerCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginVertical: 20,
    padding: 16,
  },
  disclaimerTitle: {
    marginBottom: 8,
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  declineButton: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  acceptButton: {
    flex: 1,
    marginBottom: 0,
  },
});

// Export both for backward compatibility during transition
export const HIPAANotice = WellnessNotice;
export default WellnessNotice;
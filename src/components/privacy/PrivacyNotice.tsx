/**
 * Privacy Notice Component
 * Displays privacy information and controls for users
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Card, Text, Button, useThemeColors } from '../../ui';

interface PrivacyNoticeProps {
  context: 'coaching' | 'analytics' | 'recommendations';
  onAccept?: () => void;
  onDecline?: () => void;
  showFullNotice?: boolean;
}

export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({
  context,
  onAccept,
  onDecline,
  showFullNotice = false,
}) => {
  const colors = useThemeColors();
  const [showModal, setShowModal] = useState(false);

  const getContextDescription = () => {
    switch (context) {
      case 'coaching':
        return 'personalized nutrition coaching';
      case 'analytics':
        return 'progress analytics and insights';
      case 'recommendations':
        return 'food and meal recommendations';
      default:
        return 'app features';
    }
  };

  const getDataUsed = () => {
    switch (context) {
      case 'coaching':
        return [
          'Your nutrition goals and preferences',
          'Daily food intake and progress',
          'Achievement and challenge data',
          'General activity level (not specific workouts)',
        ];
      case 'analytics':
        return [
          'Nutrition tracking data',
          'Progress trends over time',
          'Goal achievement metrics',
        ];
      case 'recommendations':
        return [
          'Dietary preferences and restrictions',
          'Current macro targets',
          'Food logging history',
        ];
      default:
        return ['Basic app usage data'];
    }
  };

  const FullPrivacyModal = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text variant="titleLarge">Privacy Information</Text>
          <TouchableOpacity onPress={() => setShowModal(false)}>
            <Text variant="body" color={colors.primary}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Data Used for {getContextDescription()}
          </Text>
          
          {getDataUsed().map((item, index) => (
            <Text key={index} variant="body" style={styles.listItem}>
              • {item}
            </Text>
          ))}
          
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Privacy Protections
          </Text>
          
          <Text variant="body" style={styles.listItem}>
            • No medical information is collected or processed
          </Text>
          <Text variant="body" style={styles.listItem}>
            • Personal identifiers are removed before AI processing
          </Text>
          <Text variant="body" style={styles.listItem}>
            • Data is encrypted in transit and at rest
          </Text>
          <Text variant="body" style={styles.listItem}>
            • You can delete your data at any time
          </Text>
          <Text variant="body" style={styles.listItem}>
            • We provide wellness guidance, not medical advice
          </Text>
          
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Your Rights
          </Text>
          
          <Text variant="body" style={styles.listItem}>
            • Access your data anytime in Settings
          </Text>
          <Text variant="body" style={styles.listItem}>
            • Export your data in a portable format
          </Text>
          <Text variant="body" style={styles.listItem}>
            • Delete your account and all data
          </Text>
          <Text variant="body" style={styles.listItem}>
            • Opt out of specific features
          </Text>
          
          <Text variant="caption" color={colors.textSecondary} style={styles.disclaimer}>
            This app provides wellness and nutrition guidance only. Always consult healthcare 
            professionals for medical advice, diagnosis, or treatment.
          </Text>
        </View>
      </View>
    </Modal>
  );

  if (showFullNotice) {
    return (
      <>
        <Card style={styles.noticeCard}>
          <Text variant="titleSmall" style={styles.noticeTitle}>
            Privacy Notice
          </Text>
          <Text variant="body" color={colors.textSecondary}>
            We use your nutrition data to provide {getContextDescription()}. 
            Your privacy is protected and no medical information is processed.
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title="Learn More"
              variant="outline"
              onPress={() => setShowModal(true)}
              containerStyle={styles.learnMoreButton}
            />
            {onAccept && (
              <Button
                title="Continue"
                variant="primary"
                onPress={onAccept}
                containerStyle={styles.continueButton}
              />
            )}
          </View>
        </Card>
        <FullPrivacyModal />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.compactNotice}
        onPress={() => setShowModal(true)}
      >
        <Text variant="caption" color={colors.textSecondary}>
          🔒 Privacy protected • Tap for details
        </Text>
      </TouchableOpacity>
      <FullPrivacyModal />
    </>
  );
};

const styles = StyleSheet.create({
  noticeCard: {
    marginBottom: 16,
    padding: 16,
  },
  noticeTitle: {
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  learnMoreButton: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  continueButton: {
    flex: 1,
    marginBottom: 0,
  },
  compactNotice: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 12,
  },
  listItem: {
    marginBottom: 8,
    lineHeight: 20,
  },
  disclaimer: {
    marginTop: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default PrivacyNotice;
import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Text, Button, useThemeColors } from '../../ui';
import type { Coach } from '../../types/marketplace';

interface PurchaseModalProps {
  visible: boolean;
  coach: Coach | null;
  onClose: () => void;
  onPurchase: (coachId: string, withTrial: boolean) => Promise<void>;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  visible,
  coach,
  onClose,
  onPurchase,
}) => {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [withTrial, setWithTrial] = useState(false);

  if (!coach) return null;

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await onPurchase(coach.id, withTrial);
      onClose();
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = () => {
    if (coach.price_type === 'free' || coach.price_amount === 0) {
      return 'Free';
    }

    const price = `$${coach.price_amount.toFixed(2)}`;

    switch (coach.price_type) {
      case 'monthly':
        return `${price}/month`;
      case 'lifetime':
        return `${price} one-time`;
      case 'one_time':
        return `${price} one-time`;
      default:
        return price;
    }
  };

  const hasTrial = coach.trial_days > 0 && coach.price_type !== 'free';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
                <Text variant="headingLarge">{coach.avatar_url || '👤'}</Text>
              </View>
              <Text variant="headingSmall" style={styles.title}>
                {coach.name}
              </Text>
              <Text variant="body" color={colors.textSecondary} align="center">
                Level {coach.level} • {coach.tone}
              </Text>
            </View>

            {/* Description */}
            <Card elevation={1} style={styles.section}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                About
              </Text>
              <Text variant="body" color={colors.textSecondary}>
                {coach.description}
              </Text>
            </Card>

            {/* Features */}
            <Card elevation={1} style={styles.section}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Features
              </Text>
              <View style={styles.featureList}>
                <Text variant="body">✓ Personalized coaching</Text>
                <Text variant="body">✓ 24/7 AI support</Text>
                <Text variant="body">✓ Progress tracking</Text>
                <Text variant="body">✓ Custom meal planning</Text>
              </View>
            </Card>

            {/* Pricing */}
            <Card elevation={1} style={styles.section}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Pricing
              </Text>
              <View style={styles.pricingContainer}>
                <Text variant="headingSmall" color={colors.primary}>
                  {formatPrice()}
                </Text>
                {hasTrial && (
                  <View style={styles.trialBadge}>
                    <Text variant="caption" color={colors.success}>
                      🎁 {coach.trial_days}-day free trial
                    </Text>
                  </View>
                )}
              </View>
            </Card>

            {/* Trial Option */}
            {hasTrial && (
              <TouchableOpacity
                style={[
                  styles.trialOption,
                  {
                    backgroundColor: withTrial ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setWithTrial(!withTrial)}
                activeOpacity={0.7}
              >
                <View style={styles.trialCheckbox}>
                  {withTrial && <Text variant="body">✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge" color={withTrial ? '#FFF' : colors.text}>
                    Start with {coach.trial_days}-day free trial
                  </Text>
                  <Text
                    variant="bodySmall"
                    color={withTrial ? 'rgba(255,255,255,0.8)' : colors.textSecondary}
                  >
                    Cancel anytime. Auto-converts to paid after trial.
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                title={
                  coach.price_type === 'free'
                    ? 'Get Coach'
                    : withTrial
                    ? 'Start Free Trial'
                    : 'Purchase'
                }
                variant="primary"
                size="large"
                onPress={handlePurchase}
                loading={loading}
                containerStyle={styles.purchaseButton}
              />
              <Button
                title="Cancel"
                variant="ghost"
                size="large"
                onPress={onClose}
                disabled={loading}
                containerStyle={styles.cancelButton}
              />
            </View>

            {/* Terms */}
            <Text
              variant="caption"
              color={colors.textSecondary}
              align="center"
              style={styles.terms}
            >
              By purchasing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    marginBottom: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  featureList: {
    gap: 6,
  },
  pricingContainer: {
    alignItems: 'center',
  },
  trialBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  trialOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
  },
  trialCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actions: {
    marginBottom: 12,
  },
  purchaseButton: {
    marginBottom: 8,
  },
  cancelButton: {
    marginBottom: 8,
  },
  terms: {
    lineHeight: 16,
  },
});

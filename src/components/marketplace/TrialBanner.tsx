import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Button, useThemeColors } from '../../ui';
import type { Coach } from '../../types/marketplace';

interface TrialBannerProps {
  coach: Coach;
  onCancel: () => void;
  onConvert: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ coach, onCancel, onConvert }) => {
  const colors = useThemeColors();
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    if (coach.trial_ends_at) {
      const endDate = new Date(coach.trial_ends_at);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysLeft(Math.max(0, diffDays));
    }
  }, [coach.trial_ends_at]);

  if (!coach.is_trial || !coach.trial_ends_at) {
    return null;
  }

  const isExpiringSoon = daysLeft <= 2;

  return (
    <Card
      elevation={2}
      style={[
        styles.banner,
        {
          backgroundColor: isExpiringSoon ? '#FF9800' : '#4CAF50',
        },
      ]}
    >
      <View style={styles.content}>
        <Text variant="titleSmall" color="#FFF">
          🎁 Free Trial Active
        </Text>
        <Text variant="body" color="rgba(255,255,255,0.9)" style={{ marginTop: 4 }}>
          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining for {coach.name}
        </Text>
        <Text variant="bodySmall" color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>
          {isExpiringSoon
            ? 'Trial ending soon! Convert to keep access.'
            : 'Enjoying your trial? Convert to paid anytime.'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Convert to Paid"
          variant="secondary"
          size="small"
          onPress={onConvert}
          containerStyle={styles.button}
        />
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text variant="bodySmall" color="rgba(255,255,255,0.9)">
            Cancel Trial
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginBottom: 16,
  },
  content: {
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginRight: 12,
  },
  cancelButton: {
    padding: 8,
  },
});

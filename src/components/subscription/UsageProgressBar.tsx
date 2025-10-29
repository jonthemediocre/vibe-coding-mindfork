import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface UsageProgressBarProps {
  label: string;
  current: number;
  limit?: number;
  unit?: string;
  color?: string;
}

export function UsageProgressBar({
  label,
  current,
  limit,
  unit = '',
  color = '#FFA8D2',
}: UsageProgressBarProps) {
  const isUnlimited = limit === undefined;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const getStatusColor = () => {
    if (isUnlimited) return '#4CAF50';
    if (isAtLimit) return '#F44336';
    if (isNearLimit) return '#FF9800';
    return color;
  };

  const statusColor = getStatusColor();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: statusColor }]}>
          {isUnlimited ? (
            <Text style={styles.unlimited}>∞</Text>
          ) : (
            <>
              {current} / {limit} {unit}
            </>
          )}
        </Text>
      </View>

      {!isUnlimited && (
        <>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>

          {isAtLimit && (
            <Text style={styles.warningText}>Limit reached! Upgrade for unlimited</Text>
          )}

          {isNearLimit && !isAtLimit && (
            <Text style={styles.cautionText}>Running low! Consider upgrading</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  unlimited: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  cautionText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
  },
});

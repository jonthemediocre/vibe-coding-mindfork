import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { Text, useThemeColors } from '../../ui';

interface QuickActionsProps {
  onStartNow: () => void;
  onPush30: () => void;
  onExtend30: () => void;
  onSkipToday: () => void;
  onFinishNow?: () => void;
  isActive: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onStartNow,
  onPush30,
  onExtend30,
  onSkipToday,
  onFinishNow,
  isActive,
}) => {
  const colors = useThemeColors();

  const Action = ({
    icon,
    label,
    onPress,
    variant = 'default',
  }: {
    icon: string;
    label: string;
    onPress: () => void;
    variant?: 'default' | 'primary' | 'success';
  }) => {
    const bgColor =
      variant === 'primary'
        ? colors.primary
        : variant === 'success'
        ? '#10B981'
        : colors.surface;

    const textColor = variant !== 'default' ? '#FFF' : colors.text;

    return (
      <TouchableOpacity
        style={[styles.action, { backgroundColor: bgColor }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Icon
          name={icon as any}
          size={18}
          color={textColor}
          style={styles.icon}
        />
        <Text
          variant="bodySmall"
          style={[styles.actionText, { color: textColor }]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (!isActive) {
    // Before fasting starts
    return (
      <View style={styles.container}>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.header}>
          Quick Actions
        </Text>
        <View style={styles.row}>
          <Action
            icon="play-circle"
            label="Start Now"
            onPress={onStartNow}
            variant="primary"
          />
          <Action
            icon="clock"
            label="Push 30m"
            onPress={onPush30}
          />
          <Action
            icon="x-circle"
            label="Skip Today"
            onPress={onSkipToday}
          />
        </View>
      </View>
    );
  }

  // During fasting
  return (
    <View style={styles.container}>
      <Text variant="bodySmall" color={colors.textSecondary} style={styles.header}>
        Quick Actions
      </Text>
      <View style={styles.row}>
        {onFinishNow && (
          <Action
            icon="check-circle"
            label="Finish Now"
            onPress={onFinishNow}
            variant="success"
          />
        )}
        <Action
          icon="plus-circle"
          label="Extend 30m"
          onPress={onExtend30}
        />
        <Action
          icon="x-circle"
          label="Cancel"
          onPress={onSkipToday}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    marginBottom: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  icon: {
    marginRight: 2,
  },
  actionText: {
    fontWeight: '600',
    fontSize: 12,
  },
});

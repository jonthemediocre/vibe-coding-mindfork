import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import type { SubscriptionPlan } from '../../services/SubscriptionService';

interface PlanComparisonProps {
  plans: SubscriptionPlan[];
}

const COMPARISON_FEATURES = [
  { id: 'food_logging', name: 'Food Logging', free: '5/day', premium: 'Unlimited', savage: 'Unlimited' },
  { id: 'ai_messages', name: 'AI Messages', free: '10/day', premium: 'Unlimited', savage: 'Unlimited' },
  { id: 'analytics', name: 'Analytics', free: 'Basic', premium: 'Advanced', savage: 'Advanced' },
  { id: 'meal_planning', name: 'Meal Planning', free: false, premium: true, savage: true },
  { id: 'recipes', name: 'Recipe Library', free: false, premium: true, savage: true },
  { id: 'progress_tracking', name: 'Progress Tracking', free: 'Limited', premium: 'Full', savage: 'Full' },
  { id: 'web_dashboard', name: 'Web Dashboard', free: false, premium: true, savage: true },
  { id: 'savage_mode', name: 'Savage Mode AI', free: false, premium: false, savage: true },
  { id: 'phone_coaching', name: 'Phone Coaching', free: false, premium: false, savage: 'Monthly' },
  { id: 'custom_workouts', name: 'Custom Workouts', free: false, premium: false, savage: true },
  { id: 'vip_community', name: 'VIP Community', free: false, premium: false, savage: true },
  { id: 'priority_support', name: 'Priority Support', free: false, premium: true, savage: true },
  { id: 'early_access', name: 'Early Access', free: false, premium: false, savage: true },
];

export function PlanComparison({ plans }: PlanComparisonProps) {
  const renderFeatureValue = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Icon name="check" size={20} color="#4CAF50" />
      ) : (
        <Icon name="x" size={20} color="#E0E0E0" />
      );
    }
    return <Text style={styles.featureValue}>{value}</Text>;
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      <View style={styles.table}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.featureNameCell}>
            <Text style={styles.headerText}>Features</Text>
          </View>
          {plans.map((plan) => (
            <View key={plan.id} style={[styles.planCell, styles.headerCell]}>
              <View style={[styles.planDot, { backgroundColor: plan.color }]} />
              <Text style={styles.planName}>{plan.name}</Text>
            </View>
          ))}
        </View>

        {/* Feature Rows */}
        {COMPARISON_FEATURES.map((feature, index) => (
          <View
            key={feature.id}
            style={[styles.featureRow, index % 2 === 0 && styles.evenRow]}
          >
            <View style={styles.featureNameCell}>
              <Text style={styles.featureName}>{feature.name}</Text>
            </View>
            <View style={styles.planCell}>
              {renderFeatureValue(feature.free)}
            </View>
            <View style={styles.planCell}>
              {renderFeatureValue(feature.premium)}
            </View>
            <View style={styles.planCell}>
              {renderFeatureValue(feature.savage)}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  table: {
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  headerCell: {
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  featureRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  evenRow: {
    backgroundColor: '#FAFAFA',
  },
  featureNameCell: {
    width: 160,
    paddingRight: 16,
    justifyContent: 'center',
  },
  featureName: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  planCell: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  planDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  planName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  featureValue: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});

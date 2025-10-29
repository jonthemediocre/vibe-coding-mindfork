import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import type { SubscriptionPlan } from '../../services/SubscriptionService';

interface PlanCardProps {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  isCurrentPlan: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function PlanCard({
  plan,
  billingCycle,
  isCurrentPlan,
  onSelect,
  disabled = false,
}: PlanCardProps) {
  const price = plan.price[billingCycle];
  const monthlySavings =
    billingCycle === 'yearly' && price > 0 ? ((price * 12 * 0.2) / 12).toFixed(2) : null;

  return (
    <View
      style={[
        styles.container,
        isCurrentPlan && { borderColor: plan.color, borderWidth: 2 },
        plan.popular && styles.popularContainer,
      ]}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <View style={[styles.badge, { backgroundColor: plan.color }]}>
          <Text style={styles.badgeText}>Most Popular</Text>
        </View>
      )}

      {/* Web Only Badge */}
      {plan.webOnly && (
        <View style={[styles.badge, { backgroundColor: '#FF6B35' }]}>
          <Text style={styles.badgeText}>Web Exclusive</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${plan.color}20` }]}>
          <Icon
            name={plan.tier === 'free' ? 'camera' : plan.tier === 'premium' ? 'star' : 'zap'}
            size={24}
            color={plan.color}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planDescription}>{plan.description}</Text>
        </View>
      </View>

      {/* Pricing */}
      <View style={styles.pricing}>
        <View style={styles.priceRow}>
          <Text style={styles.priceAmount}>${price === 0 ? '0' : price.toFixed(2)}</Text>
          {price > 0 && (
            <Text style={styles.pricePeriod}>/{billingCycle === 'monthly' ? 'mo' : 'yr'}</Text>
          )}
        </View>
        {monthlySavings && (
          <Text style={styles.savings}>Save ${monthlySavings}/month</Text>
        )}
      </View>

      {/* Features */}
      <View style={styles.features}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Icon name="check" size={16} color="#4CAF50" style={styles.featureIcon} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}

        {plan.limitations?.map((limitation, index) => (
          <View key={index} style={styles.featureRow}>
            <Icon name="x" size={16} color="#F44336" style={styles.featureIcon} />
            <Text style={[styles.featureText, styles.limitationText]}>{limitation}</Text>
          </View>
        ))}
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.button,
          isCurrentPlan && styles.currentButton,
          disabled && styles.disabledButton,
          !isCurrentPlan &&
            plan.tier === 'savage' && {
              backgroundColor: plan.color,
            },
        ]}
        onPress={onSelect}
        disabled={disabled || isCurrentPlan}
      >
        {isCurrentPlan ? (
          <>
            <Icon name="check" size={16} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Current Plan</Text>
          </>
        ) : (
          <Text
            style={[
              styles.buttonText,
              plan.tier === 'savage' && { color: '#fff' },
            ]}
          >
            {plan.tier === 'free' ? 'Downgrade to Free' : `Upgrade to ${plan.name}`}
          </Text>
        )}
      </TouchableOpacity>

      {/* Web Only Notice */}
      {plan.webOnly && (
        <Text style={styles.webNotice}>Savage Mode available on web platform only</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularContainer: {
    transform: [{ scale: 1.02 }],
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  pricing: {
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  savings: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '500',
  },
  features: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  limitationText: {
    color: '#999',
  },
  button: {
    backgroundColor: '#FFA8D2',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  currentButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webNotice: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
});

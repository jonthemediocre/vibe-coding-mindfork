import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import type { PaymentMethod } from '../../services/SubscriptionService';

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod;
  onRemove: () => void;
  onSetDefault?: () => void;
}

export function PaymentMethodCard({
  paymentMethod,
  onRemove,
  onSetDefault,
}: PaymentMethodCardProps) {
  const getCardIcon = () => {
    if (paymentMethod.type === 'apple_pay') return 'smartphone';
    if (paymentMethod.type === 'google_pay') return 'smartphone';
    return 'credit-card';
  };

  const getCardBrand = () => {
    if (paymentMethod.type === 'apple_pay') return 'Apple Pay';
    if (paymentMethod.type === 'google_pay') return 'Google Pay';
    return paymentMethod.brand || 'Card';
  };

  return (
    <View style={[styles.container, paymentMethod.is_default && styles.defaultContainer]}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Icon name={getCardIcon()} size={24} color="#FFA8D2" />
        </View>

        {/* Card Info */}
        <View style={styles.info}>
          <View style={styles.row}>
            <Text style={styles.brand}>{getCardBrand()}</Text>
            {paymentMethod.is_default && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
          </View>

          {paymentMethod.last4 && (
            <Text style={styles.cardNumber}>•••• {paymentMethod.last4}</Text>
          )}

          {paymentMethod.exp_month && paymentMethod.exp_year && (
            <Text style={styles.expiry}>
              Expires {String(paymentMethod.exp_month).padStart(2, '0')}/
              {String(paymentMethod.exp_year).slice(-2)}
            </Text>
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
          <Icon name="trash-2" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>

      {/* Set Default Button */}
      {!paymentMethod.is_default && onSetDefault && (
        <TouchableOpacity style={styles.setDefaultButton} onPress={onSetDefault}>
          <Text style={styles.setDefaultText}>Set as default</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  defaultContainer: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFA8D220',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  brand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  cardNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  expiry: {
    fontSize: 12,
    color: '#999',
  },
  removeButton: {
    padding: 8,
  },
  setDefaultButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  setDefaultText: {
    fontSize: 14,
    color: '#FFA8D2',
    fontWeight: '500',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { CardField, useStripe } from '@stripe/stripe-react-native';

interface AddPaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (paymentMethodId: string) => void;
}

export function AddPaymentMethodModal({
  visible,
  onClose,
  onSuccess,
}: AddPaymentMethodModalProps) {
  const { createPaymentMethod } = useStripe();
  const [cardComplete, setCardComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddCard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { paymentMethod, error: pmError } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (pmError) {
        setError(pmError.message);
        return;
      }

      if (!paymentMethod) {
        setError('Failed to create payment method');
        return;
      }

      onSuccess(paymentMethod.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Payment Method</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Icon name="shield" size={20} color="#4CAF50" style={styles.securityIcon} />
              <View style={styles.securityText}>
                <Text style={styles.securityTitle}>Secure Payment</Text>
                <Text style={styles.securityDescription}>
                  Your payment information is encrypted and secure
                </Text>
              </View>
            </View>

            {/* Card Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Card Information</Text>
              <View style={styles.cardFieldContainer}>
                <CardField
                  postalCodeEnabled={false}
                  placeholders={{
                    number: '4242 4242 4242 4242',
                  }}
                  cardStyle={{
                    backgroundColor: '#FFFFFF',
                    textColor: '#1a1a1a',
                    fontSize: 16,
                  }}
                  style={styles.cardField}
                  onCardChange={(cardDetails) => {
                    setCardComplete(cardDetails.complete);
                    setError(null);
                  }}
                />
              </View>
              <Text style={styles.helperText}>
                We never store your full card number
              </Text>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" size={16} color="#F44336" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Supported Cards */}
            <View style={styles.supportedCards}>
              <Text style={styles.supportedTitle}>Supported Cards</Text>
              <View style={styles.cardBrands}>
                <Text style={styles.cardBrand}>Visa</Text>
                <Text style={styles.cardBrand}>Mastercard</Text>
                <Text style={styles.cardBrand}>Amex</Text>
                <Text style={styles.cardBrand}>Discover</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addButton, (!cardComplete || isLoading) && styles.disabledButton]}
              onPress={handleAddCard}
              disabled={!cardComplete || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>Add Card</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  securityNotice: {
    flexDirection: 'row',
    backgroundColor: '#4CAF5020',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  securityIcon: {
    marginRight: 12,
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  cardFieldContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4433620',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#F44336',
  },
  supportedCards: {
    marginTop: 8,
  },
  supportedTitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  cardBrands: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardBrand: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginRight: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  addButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA8D2',
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

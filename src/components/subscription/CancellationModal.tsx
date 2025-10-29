import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';

interface CancellationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, immediately: boolean) => Promise<void>;
  planName: string;
  nextBillingDate?: string;
}

const CANCELLATION_REASONS = [
  'Too expensive',
  'Not using enough',
  'Missing features',
  'Technical issues',
  'Switching to competitor',
  'No longer need it',
  'Other',
];

export function CancellationModal({
  visible,
  onClose,
  onConfirm,
  planName,
  nextBillingDate,
}: CancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    const reason = selectedReason === 'Other' ? customReason : selectedReason || '';

    try {
      setIsLoading(true);
      await onConfirm(reason, cancelImmediately);
      onClose();
    } catch (err) {
      console.error('Cancellation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'end of billing period';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cancel Subscription</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Warning Notice */}
            <View style={styles.warningNotice}>
              <Icon name="alert-circle" size={20} color="#FF9800" style={styles.warningIcon} />
              <View style={styles.warningText}>
                <Text style={styles.warningTitle}>Before you go...</Text>
                <Text style={styles.warningDescription}>
                  You'll lose access to all {planName} features
                </Text>
              </View>
            </View>

            {/* What You'll Lose */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What you'll lose:</Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Icon name="x" size={16} color="#F44336" style={styles.featureIcon} />
                  <Text style={styles.featureText}>Unlimited food logging</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="x" size={16} color="#F44336" style={styles.featureIcon} />
                  <Text style={styles.featureText}>Advanced AI conversations</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="x" size={16} color="#F44336" style={styles.featureIcon} />
                  <Text style={styles.featureText}>Detailed analytics</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="x" size={16} color="#F44336" style={styles.featureIcon} />
                  <Text style={styles.featureText}>Meal planning & recipes</Text>
                </View>
              </View>
            </View>

            {/* Cancellation Reason */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why are you canceling?</Text>
              <Text style={styles.sectionDescription}>
                Help us improve by sharing your reason
              </Text>

              <View style={styles.reasonList}>
                {CANCELLATION_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonButton,
                      selectedReason === reason && styles.selectedReason,
                    ]}
                    onPress={() => setSelectedReason(reason)}
                  >
                    <Text
                      style={[
                        styles.reasonText,
                        selectedReason === reason && styles.selectedReasonText,
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedReason === 'Other' && (
                <TextInput
                  style={styles.customReasonInput}
                  placeholder="Please tell us more..."
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}
            </View>

            {/* Cancellation Timing */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>When should we cancel?</Text>

              <TouchableOpacity
                style={[
                  styles.timingOption,
                  !cancelImmediately && styles.selectedTiming,
                ]}
                onPress={() => setCancelImmediately(false)}
              >
                <View style={styles.radio}>
                  {!cancelImmediately && <View style={styles.radioSelected} />}
                </View>
                <View style={styles.timingContent}>
                  <Text style={styles.timingTitle}>At period end</Text>
                  <Text style={styles.timingDescription}>
                    Keep access until {formatDate(nextBillingDate)}
                  </Text>
                </View>
                <Icon name="calendar" size={20} color="#4CAF50" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.timingOption,
                  cancelImmediately && styles.selectedTiming,
                ]}
                onPress={() => setCancelImmediately(true)}
              >
                <View style={styles.radio}>
                  {cancelImmediately && <View style={styles.radioSelected} />}
                </View>
                <View style={styles.timingContent}>
                  <Text style={styles.timingTitle}>Cancel immediately</Text>
                  <Text style={styles.timingDescription}>
                    Lose access now (no refund)
                  </Text>
                </View>
                <Icon name="zap" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>

            {/* Alternative: Pause Notice */}
            <View style={styles.alternativeNotice}>
              <Icon name="info" size={16} color="#2196F3" style={styles.infoIcon} />
              <Text style={styles.alternativeText}>
                Consider downgrading to Free instead of canceling
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.keepButton} onPress={onClose}>
              <Text style={styles.keepText}>Keep Subscription</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cancelButton,
                (!selectedReason || isLoading) && styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={!selectedReason || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
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
    maxHeight: '90%',
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
  warningNotice: {
    flexDirection: 'row',
    backgroundColor: '#FF980020',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  warningIcon: {
    marginRight: 12,
  },
  warningText: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 4,
  },
  warningDescription: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  featureList: {
    marginTop: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
  },
  reasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  reasonButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    margin: 4,
  },
  selectedReason: {
    borderColor: '#FFA8D2',
    backgroundColor: '#FFA8D220',
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedReasonText: {
    color: '#FFA8D2',
    fontWeight: '500',
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 80,
  },
  timingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 12,
  },
  selectedTiming: {
    borderColor: '#FFA8D2',
    backgroundColor: '#FFA8D210',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFA8D2',
  },
  timingContent: {
    flex: 1,
  },
  timingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  timingDescription: {
    fontSize: 12,
    color: '#666',
  },
  alternativeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F320',
    padding: 12,
    borderRadius: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  alternativeText: {
    flex: 1,
    fontSize: 12,
    color: '#2196F3',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  keepButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginRight: 12,
  },
  keepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

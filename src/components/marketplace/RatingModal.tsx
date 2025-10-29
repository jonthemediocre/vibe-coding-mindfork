import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Card, Text, Button, useThemeColors } from '../../ui';

interface RatingModalProps {
  visible: boolean;
  coachName: string;
  onClose: () => void;
  onSubmit: (rating: number, title?: string, reviewText?: string) => Promise<void>;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  coachName,
  onClose,
  onSubmit,
}) => {
  const colors = useThemeColors();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setLoading(true);
    try {
      await onSubmit(rating, title || undefined, reviewText || undefined);
      // Reset form
      setRating(0);
      setTitle('');
      setReviewText('');
      onClose();
    } catch (error) {
      console.error('Rating submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
            <Text variant="headingLarge" style={styles.star}>
              {star <= rating ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <Text variant="headingSmall" align="center" style={styles.title}>
            Rate {coachName}
          </Text>
          <Text variant="body" color={colors.textSecondary} align="center" style={styles.subtitle}>
            How was your experience?
          </Text>

          {/* Star Rating */}
          {renderStars()}

          {/* Optional Title */}
          <View style={styles.inputContainer}>
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.label}>
              Title (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Summarize your experience"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Optional Review */}
          <View style={styles.inputContainer}>
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.label}>
              Review (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Share details about your experience..."
              placeholderTextColor={colors.textSecondary}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
              {reviewText.length}/500
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Submit Review"
              variant="primary"
              size="large"
              onPress={handleSubmit}
              loading={loading}
              disabled={rating === 0}
              containerStyle={styles.submitButton}
            />
            <Button
              title="Cancel"
              variant="ghost"
              size="large"
              onPress={onClose}
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 16,
    padding: 24,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  star: {
    marginHorizontal: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: 8,
  },
  submitButton: {
    marginBottom: 8,
  },
});

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Text, Button, useThemeColors } from '../../ui';
import { CoachMarketplaceService } from '../../services/CoachMarketplaceService';
import type { Coach, CoachReview } from '../../types/marketplace';

interface CoachDetailsModalProps {
  visible: boolean;
  coachId: string | null;
  userId?: string;
  onClose: () => void;
  onPurchase: (coach: Coach) => void;
}

export const CoachDetailsModal: React.FC<CoachDetailsModalProps> = ({
  visible,
  coachId,
  userId,
  onClose,
  onPurchase,
}) => {
  const colors = useThemeColors();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [reviews, setReviews] = useState<CoachReview[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && coachId) {
      loadCoachDetails();
      loadReviews();
    }
  }, [visible, coachId]);

  const loadCoachDetails = async () => {
    if (!coachId) return;
    setLoading(true);
    const response = await CoachMarketplaceService.getCoachDetails(coachId, userId);
    setLoading(false);
    if (response.data) {
      setCoach(response.data);
    }
  };

  const loadReviews = async () => {
    if (!coachId) return;
    const response = await CoachMarketplaceService.getCoachReviews(coachId, 10);
    if (response.data) {
      setReviews(response.data);
    }
  };

  if (!coach) return null;

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.starsContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <Text key={`full-${i}`} variant="body">
            ⭐
          </Text>
        ))}
        {hasHalfStar && <Text variant="body">⭐</Text>}
        {[...Array(emptyStars)].map((_, i) => (
          <Text key={`empty-${i}`} variant="body" style={{ opacity: 0.3 }}>
            ☆
          </Text>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text variant="headingSmall">✕</Text>
              </TouchableOpacity>
              <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
                <Text variant="headingLarge">{coach.avatar_url || '👤'}</Text>
              </View>
              <Text variant="headingSmall" style={styles.title}>
                {coach.name}
              </Text>
              <Text variant="body" color={colors.textSecondary} align="center">
                Level {coach.level} • {coach.tone}
              </Text>

              {/* Rating */}
              <View style={styles.ratingContainer}>
                {renderStars(coach.rating)}
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginLeft: 8 }}>
                  {coach.rating.toFixed(1)} ({coach.total_ratings} reviews)
                </Text>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text variant="titleSmall">{coach.downloads}</Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    Downloads
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text variant="titleSmall">{coach.level}</Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    Level
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text variant="titleSmall">{coach.supported_modes.length}</Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    Modes
                  </Text>
                </View>
              </View>
            </View>

            {/* About */}
            <Card elevation={1} style={styles.section}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                About
              </Text>
              <Text variant="body" color={colors.textSecondary}>
                {coach.description}
              </Text>
            </Card>

            {/* Sample Interactions */}
            {coach.sample_interactions && coach.sample_interactions.length > 0 && (
              <Card elevation={1} style={styles.section}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Sample Interactions
                </Text>
                {coach.sample_interactions.map((interaction, index) => (
                  <View key={index} style={styles.interaction}>
                    <View style={[styles.bubble, styles.userBubble]}>
                      <Text variant="bodySmall">{interaction.user}</Text>
                    </View>
                    <View
                      style={[
                        styles.bubble,
                        styles.coachBubble,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text variant="bodySmall" color="#FFF">
                        {interaction.coach}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* Tags */}
            {coach.tags && coach.tags.length > 0 && (
              <Card elevation={1} style={styles.section}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Specialties
                </Text>
                <View style={styles.tagsContainer}>
                  {coach.tags.map((tag) => (
                    <View key={tag} style={[styles.tag, { backgroundColor: colors.surface }]}>
                      <Text variant="bodySmall" color={colors.textSecondary}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <Card elevation={1} style={styles.section}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Reviews ({coach.total_ratings})
                </Text>
                {reviews.slice(0, 3).map((review) => (
                  <View key={review.id} style={styles.review}>
                    <View style={styles.reviewHeader}>
                      {renderStars(review.rating)}
                      <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 8 }}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    {review.title && (
                      <Text variant="bodyLarge" style={styles.reviewTitle}>
                        {review.title}
                      </Text>
                    )}
                    {review.review_text && (
                      <Text variant="body" color={colors.textSecondary}>
                        {review.review_text}
                      </Text>
                    )}
                    {review.is_verified_purchase && (
                      <View style={styles.verifiedBadge}>
                        <Text variant="caption" color={colors.success}>
                          ✓ Verified Purchase
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </Card>
            )}

            {/* Purchase Button */}
            <View style={styles.purchaseSection}>
              {coach.is_purchased ? (
                <Card elevation={2} style={[styles.purchasedCard, { backgroundColor: '#4CAF50' }]}>
                  <Text variant="titleSmall" color="#FFF" align="center">
                    ✓ Already Purchased
                  </Text>
                  {coach.is_trial && coach.trial_ends_at && (
                    <Text variant="bodySmall" color="rgba(255,255,255,0.9)" align="center">
                      Trial ends{' '}
                      {new Date(coach.trial_ends_at).toLocaleDateString()}
                    </Text>
                  )}
                </Card>
              ) : (
                <Button
                  title={
                    coach.price_type === 'free'
                      ? 'Get Coach'
                      : `Purchase - $${coach.price_amount.toFixed(2)}`
                  }
                  variant="primary"
                  size="large"
                  onPress={() => onPurchase(coach)}
                  containerStyle={styles.purchaseButton}
                />
              )}
            </View>
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
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
    zIndex: 1,
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  stat: {
    alignItems: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  interaction: {
    marginBottom: 12,
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  userBubble: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  coachBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  review: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  verifiedBadge: {
    marginTop: 6,
  },
  purchaseSection: {
    marginTop: 8,
  },
  purchasedCard: {
    padding: 16,
  },
  purchaseButton: {
    marginBottom: 8,
  },
});

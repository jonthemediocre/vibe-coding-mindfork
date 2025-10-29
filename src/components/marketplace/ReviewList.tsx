import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, useThemeColors } from '../../ui';
import type { CoachReview } from '../../types/marketplace';

interface ReviewListProps {
  reviews: CoachReview[];
  emptyMessage?: string;
}

export const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  emptyMessage = 'No reviews yet',
}) => {
  const colors = useThemeColors();

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.starsContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <Text key={`full-${i}`} variant="bodySmall">
            ⭐
          </Text>
        ))}
        {hasHalfStar && <Text variant="bodySmall">⭐</Text>}
        {[...Array(emptyStars)].map((_, i) => (
          <Text key={`empty-${i}`} variant="bodySmall" style={{ opacity: 0.3 }}>
            ☆
          </Text>
        ))}
      </View>
    );
  };

  const renderReview = ({ item }: { item: CoachReview }) => (
    <View style={[styles.reviewCard, { backgroundColor: colors.surface }]}>
      <View style={styles.reviewHeader}>
        {renderStars(item.rating)}
        <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 'auto' }}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      {item.title && (
        <Text variant="bodyLarge" style={styles.reviewTitle}>
          {item.title}
        </Text>
      )}

      {item.review_text && (
        <Text variant="body" color={colors.textSecondary} style={styles.reviewText}>
          {item.review_text}
        </Text>
      )}

      <View style={styles.reviewFooter}>
        {item.is_verified_purchase && (
          <View style={styles.verifiedBadge}>
            <Text variant="caption" color={colors.success}>
              ✓ Verified Purchase
            </Text>
          </View>
        )}

        {(item.helpful_count > 0 || item.not_helpful_count > 0) && (
          <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 'auto' }}>
            {item.helpful_count} found helpful
          </Text>
        )}
      </View>
    </View>
  );

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text variant="body" color={colors.textSecondary} align="center">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => item.id}
      renderItem={renderReview}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      scrollEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  reviewCard: {
    padding: 14,
    borderRadius: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewTitle: {
    fontWeight: '600',
    marginBottom: 6,
  },
  reviewText: {
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  separator: {
    height: 12,
  },
  emptyState: {
    paddingVertical: 32,
  },
});

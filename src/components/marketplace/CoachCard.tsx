import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Card, Text, useThemeColors } from '../../ui';
import type { Coach } from '../../types/marketplace';
import { getCoachById } from '../../data/coachProfiles';

interface CoachCardProps {
  coach: Coach;
  onPress: () => void;
}

export const CoachCard: React.FC<CoachCardProps> = ({ coach, onPress }) => {
  const colors = useThemeColors();

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.starsContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <Text key={`full-${i}`} variant="caption" style={styles.star}>
            ⭐
          </Text>
        ))}
        {hasHalfStar && (
          <Text variant="caption" style={styles.star}>
            ⭐
          </Text>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Text key={`empty-${i}`} variant="caption" style={styles.starEmpty}>
            ☆
          </Text>
        ))}
      </View>
    );
  };

  const formatPrice = () => {
    if (coach.price_type === 'free' || coach.price_amount === 0) {
      return 'Free';
    }

    const price = `$${coach.price_amount.toFixed(2)}`;

    switch (coach.price_type) {
      case 'monthly':
        return `${price}/mo`;
      case 'lifetime':
        return `${price} lifetime`;
      case 'one_time':
        return price;
      default:
        return price;
    }
  };

  const getPriceBadgeColor = () => {
    if (coach.price_type === 'free') return colors.success;
    if (coach.is_featured) return '#FF66B3';
    return colors.primary;
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card
        elevation={2}
        style={[
          styles.card,
          coach.is_featured && {
            borderColor: '#FF66B3',
            borderWidth: 2,
          },
        ]}
      >
        {/* Featured Badge */}
        {coach.is_featured && (
          <View style={[styles.featuredBadge, { backgroundColor: '#FF66B3' }]}>
            <Text variant="caption" color="#FFF" style={styles.featuredText}>
              ✨ FEATURED
            </Text>
          </View>
        )}

        {/* Trial Badge */}
        {coach.is_trial && (
          <View style={[styles.trialBadge, { backgroundColor: '#4CAF50' }]}>
            <Text variant="caption" color="#FFF" style={styles.featuredText}>
              🎁 TRIAL
            </Text>
          </View>
        )}

        {/* Coach Avatar & Name */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
            {(() => {
              // Try to get coach image from coachProfiles
              const coachProfile = getCoachById(coach.id);
              if (coachProfile?.imageUrl) {
                return (
                  <Image 
                    source={coachProfile.imageUrl} 
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                );
              }
              // Fallback to avatar_url or emoji
              return (
                <Text variant="headingSmall">
                  {coach.avatar_url || coachProfile?.avatar || '👤'}
                </Text>
              );
            })()}
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" numberOfLines={1}>
              {coach.name}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Level {coach.level} • {coach.tone}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text
          variant="bodySmall"
          color={colors.textSecondary}
          numberOfLines={2}
          style={styles.description}
        >
          {coach.description}
        </Text>

        {/* Rating & Stats */}
        <View style={styles.stats}>
          <View style={styles.ratingContainer}>
            {renderStars(coach.rating)}
            <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 4 }}>
              ({coach.total_ratings})
            </Text>
          </View>
          <Text variant="caption" color={colors.textSecondary}>
            {coach.downloads} downloads
          </Text>
        </View>

        {/* Tags */}
        {coach.tags && coach.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {coach.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.surface }]}>
                <Text variant="caption" color={colors.textSecondary}>
                  {tag}
                </Text>
              </View>
            ))}
            {coach.tags.length > 3 && (
              <View style={[styles.tag, { backgroundColor: colors.surface }]}>
                <Text variant="caption" color={colors.textSecondary}>
                  +{coach.tags.length - 3}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Price */}
        <View style={[styles.priceContainer, { backgroundColor: getPriceBadgeColor() }]}>
          <Text variant="bodyLarge" color="#FFF" style={styles.priceText}>
            {formatPrice()}
          </Text>
          {coach.trial_days > 0 && coach.price_type !== 'free' && !coach.is_purchased && (
            <Text variant="caption" color="#FFF" style={styles.trialText}>
              {coach.trial_days}-day trial
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  featuredBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  trialBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  featuredText: {
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  description: {
    marginBottom: 8,
    lineHeight: 18,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    marginRight: 2,
  },
  starEmpty: {
    marginRight: 2,
    opacity: 0.3,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  priceText: {
    fontWeight: '600',
  },
  trialText: {
    fontWeight: '500',
  },
});

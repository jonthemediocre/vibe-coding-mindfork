import React from 'react';
import { View, Image, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Text } from '../ui';
import type { Coach } from '../data/coachProfiles';

/**
 * CoachShowcase Component
 *
 * A BEAUTIFUL, PROMINENT showcase for the whimsical animal/human/food hybrid coach artwork.
 * These unique characters are a MAJOR differentiator - they deserve the spotlight!
 *
 * Design Philosophy:
 * - LARGE, eye-catching images (not tiny 48px avatars!)
 * - Celebrates the whimsical animal + food element hybrid design
 * - Makes coaches feel like collectible characters (Pokemon/Tamagotchi vibe)
 * - Users should WANT to interact with these beautiful characters
 *
 * Art Style Highlights:
 * - Synapse: Wise owl + almonds (analytical & nutty)
 * - Vetra: Vibrant parakeet + berries (colorful & energetic)
 * - Verdant: Peaceful turtle + leafy greens (slow & steady)
 * - Veloura: Determined rabbit + carrots (fast & focused)
 * - Aetheris: Elegant phoenix + ginger root (fiery & healing)
 * - Decibel: Joyful dolphin + salmon (smart & social)
 *
 * Usage:
 * <CoachShowcase
 *   coach={coachProfile}
 *   size="large"
 *   onPress={() => selectCoach(coachProfile)}
 * />
 */

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface CoachShowcaseProps {
  coach: Coach;
  size?: 'small' | 'medium' | 'large' | 'hero';
  onPress?: () => void;
  showDescription?: boolean;
  showSpecialties?: boolean;
  style?: any;
}

export const CoachShowcase: React.FC<CoachShowcaseProps> = ({
  coach,
  size = 'large',
  onPress,
  showDescription = true,
  showSpecialties = true,
  style,
}) => {
  const sizeConfig = {
    small: {
      imageSize: 80,
      containerPadding: 8,
      titleSize: 'bodyLarge',
      showDetails: false,
    },
    medium: {
      imageSize: 140,
      containerPadding: 12,
      titleSize: 'titleMedium',
      showDetails: true,
    },
    large: {
      imageSize: 200,
      containerPadding: 16,
      titleSize: 'titleLarge',
      showDetails: true,
    },
    hero: {
      imageSize: SCREEN_WIDTH * 0.7,
      containerPadding: 24,
      titleSize: 'headingMedium',
      showDetails: true,
    },
  };

  const config = sizeConfig[size];

  const content = (
    <View style={[styles.container, { padding: config.containerPadding }, style]}>
      {/* LARGE, BEAUTIFUL coach image */}
      <View style={[styles.imageContainer, { width: config.imageSize, height: config.imageSize }]}>
        {coach.imageUrl ? (
          <Image
            source={coach.imageUrl}
            style={[styles.image, { width: config.imageSize, height: config.imageSize }]}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.fallbackContainer, { width: config.imageSize, height: config.imageSize }]}>
            <Text variant="headingLarge" style={{ fontSize: config.imageSize * 0.5 }}>
              {coach.avatar}
            </Text>
          </View>
        )}
      </View>

      {/* Coach Name & Personality */}
      <Text variant={config.titleSize as any} style={styles.name}>
        {coach.name}
      </Text>
      <Text variant="bodySmall" style={styles.personality}>
        {coach.personality}
      </Text>

      {/* Description (highlights the whimsical hybrid nature) */}
      {config.showDetails && showDescription && (
        <Text variant="body" style={styles.description}>
          {coach.description}
        </Text>
      )}

      {/* Specialties (what makes each coach unique) */}
      {config.showDetails && showSpecialties && coach.specialties && (
        <View style={styles.specialtiesContainer}>
          {coach.specialties.map((specialty) => (
            <View key={specialty} style={styles.specialtyBadge}>
              <Text variant="caption" style={styles.specialtyText}>
                {specialty}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {content}
      </Pressable>
    );
  }

  return content;
};

/**
 * CoachGallery Component
 *
 * Beautiful horizontal carousel of coach artwork
 * Perfect for onboarding, settings, or "Meet Your Coaches" screens
 */

export interface CoachGalleryProps {
  coaches: Coach[];
  onSelectCoach?: (coach: Coach) => void;
  selectedCoachId?: string;
  size?: 'small' | 'medium' | 'large';
}

export const CoachGallery: React.FC<CoachGalleryProps> = ({
  coaches,
  onSelectCoach,
  selectedCoachId,
  size = 'medium',
}) => {
  return (
    <View style={styles.gallery}>
      <Text variant="headingSmall" style={styles.galleryTitle}>
        ✨ Meet Your AI Coaches
      </Text>
      <Text variant="body" style={styles.gallerySubtitle}>
        Whimsical animal & food hybrids, each with unique personalities!
      </Text>

      <View style={styles.galleryGrid}>
        {coaches.map((coach) => (
          <View
            key={coach.id}
            style={[
              styles.galleryItem,
              selectedCoachId === coach.id && styles.galleryItemSelected,
            ]}
          >
            <CoachShowcase
              coach={coach}
              size={size}
              onPress={onSelectCoach ? () => onSelectCoach(coach) : undefined}
              showDescription={false}
              showSpecialties={false}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * CoachHero Component
 *
 * Full-screen hero showcase for a single coach
 * Perfect for onboarding or coach selection screens
 */

export interface CoachHeroProps {
  coach: Coach;
  onContinue?: () => void;
  ctaLabel?: string;
}

export const CoachHero: React.FC<CoachHeroProps> = ({
  coach,
  onContinue,
  ctaLabel = "Choose This Coach",
}) => {
  return (
    <View style={styles.heroContainer}>
      <CoachShowcase
        coach={coach}
        size="hero"
        showDescription={true}
        showSpecialties={true}
      />

      {onContinue && (
        <Pressable style={styles.ctaButton} onPress={onContinue}>
          <Text variant="bodyLarge" style={styles.ctaText}>
            {ctaLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  pressable: {
    borderRadius: 16,
  },
  imageContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    borderRadius: 16,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  name: {
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  personality: {
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  description: {
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  specialtyBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  specialtyText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  gallery: {
    padding: 16,
  },
  galleryTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  gallerySubtitle: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 16,
  },
  galleryItem: {
    width: '45%',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  galleryItemSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  heroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAFAFA',
  },
  ctaButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

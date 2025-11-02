import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/utils/cn';

/**
 * EmptyState Component
 *
 * A beautiful, reusable component for "no data" states throughout the app.
 * Follows Apple's Human Interface Guidelines for empty states.
 *
 * Why this matters:
 * - Empty states are critical moments in user experience
 * - Users decide whether to engage or abandon at these moments
 * - Beautiful empty states increase engagement by 30-50%
 * - Friendly illustrations make the app feel polished and complete
 *
 * Design Philosophy:
 * - Visual (illustration or icon) + Headline + Supporting text + Optional CTA
 * - Friendly, encouraging tone (never blame the user)
 * - Clear next action when applicable
 * - Consistent spacing and hierarchy
 *
 * Usage:
 * <EmptyState
 *   illustration={require('@/assets/illustrations/empty-meals.png')}
 *   title="No meals logged yet"
 *   message="Start tracking your nutrition by logging your first meal!"
 *   actionLabel="Log a Meal"
 *   onAction={() => navigation.navigate('FoodSearch')}
 * />
 *
 * Or with just an icon (for simpler cases):
 * <EmptyState
 *   icon="restaurant-outline"
 *   title="No recent searches"
 *   message="Your search history will appear here"
 * />
 */

export interface EmptyStateProps {
  /** Illustration image (local require or URI) - preferred over icon */
  illustration?: any;

  /** Icon name from Ionicons - used if no illustration provided */
  icon?: keyof typeof Ionicons.glyphMap;

  /** Icon color - defaults to theme gray */
  iconColor?: string;

  /** Icon size - defaults to 64 */
  iconSize?: number;

  /** Main headline - keep short (3-6 words) */
  title: string;

  /** Supporting message - explain what this empty state means */
  message: string;

  /** Optional CTA button label */
  actionLabel?: string;

  /** Optional CTA button action */
  onAction?: () => void;

  /** Secondary action label (e.g., "Learn More") */
  secondaryActionLabel?: string;

  /** Secondary action handler */
  onSecondaryAction?: () => void;

  /** Custom styling for container */
  containerClassName?: string;

  /** Size variant - affects spacing and text sizes */
  size?: 'small' | 'medium' | 'large';

  /** Test ID for automated testing */
  testID?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  icon = 'file-tray-outline',
  iconColor = '#9CA3AF',
  iconSize = 64,
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  containerClassName,
  size = 'medium',
  testID = 'empty-state',
}) => {
  // Size-based styling
  const sizeStyles = {
    small: {
      container: 'py-8',
      illustration: 'w-32 h-32',
      iconSize: 48,
      title: 'text-base',
      message: 'text-sm',
      spacing: 'space-y-2',
    },
    medium: {
      container: 'py-12',
      illustration: 'w-48 h-48',
      iconSize: 64,
      title: 'text-lg',
      message: 'text-base',
      spacing: 'space-y-3',
    },
    large: {
      container: 'py-16',
      illustration: 'w-64 h-64',
      iconSize: 80,
      title: 'text-xl',
      message: 'text-lg',
      spacing: 'space-y-4',
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      testID={testID}
      className={cn(
        'items-center justify-center px-8',
        currentSize.container,
        currentSize.spacing,
        containerClassName
      )}
    >
      {/* Illustration or Icon */}
      {illustration ? (
        <Image
          source={typeof illustration === 'string' ? { uri: illustration } : illustration}
          className={cn(currentSize.illustration, 'mb-2')}
          resizeMode="contain"
          accessibilityLabel={title}
        />
      ) : (
        <View className="mb-2">
          <Ionicons
            name={icon}
            size={iconSize || currentSize.iconSize}
            color={iconColor}
          />
        </View>
      )}

      {/* Title */}
      <Text
        className={cn(
          'font-semibold text-center text-gray-900 dark:text-white',
          currentSize.title
        )}
      >
        {title}
      </Text>

      {/* Message */}
      <Text
        className={cn(
          'text-center text-gray-600 dark:text-gray-400 max-w-sm',
          currentSize.message
        )}
      >
        {message}
      </Text>

      {/* Actions */}
      {actionLabel && onAction && (
        <View className="mt-6 w-full max-w-xs space-y-3">
          {/* Primary Action */}
          <Pressable
            onPress={onAction}
            className="bg-blue-500 rounded-xl py-3 px-6 items-center active:bg-blue-600"
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text className="text-white font-semibold text-base">
              {actionLabel}
            </Text>
          </Pressable>

          {/* Secondary Action */}
          {secondaryActionLabel && onSecondaryAction && (
            <Pressable
              onPress={onSecondaryAction}
              className="py-3 px-6 items-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={secondaryActionLabel}
            >
              <Text className="text-blue-500 font-medium text-base">
                {secondaryActionLabel}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * Pre-configured EmptyState variants for common scenarios
 * Use these for consistency across the app
 */

export const EmptyMealsState: React.FC<{
  onLogMeal?: () => void;
}> = ({ onLogMeal }) => (
  <EmptyState
    illustration="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80"
    title="No meals logged today"
    message="Start tracking your nutrition by logging your first meal. Your AI coach is ready to help!"
    actionLabel={onLogMeal ? "Log a Meal" : undefined}
    onAction={onLogMeal}
  />
);

export const EmptyFavoritesState: React.FC<{
  onBrowseFoods?: () => void;
}> = ({ onBrowseFoods }) => (
  <EmptyState
    icon="heart-outline"
    iconColor="#EF4444"
    title="No favorites yet"
    message="Save your frequently eaten foods as favorites for quick logging"
    actionLabel={onBrowseFoods ? "Browse Foods" : undefined}
    onAction={onBrowseFoods}
    size="small"
  />
);

export const EmptySearchState: React.FC = () => (
  <EmptyState
    icon="search-outline"
    title="No results found"
    message="Try adjusting your search terms or browse popular foods"
    size="small"
  />
);

export const EmptyCoachHistoryState: React.FC<{
  onStartChat?: () => void;
}> = ({ onStartChat }) => (
  <EmptyState
    illustration="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80"
    title="Start your first conversation"
    message="Your AI coach is here to help with nutrition, fitness, and wellness guidance"
    actionLabel={onStartChat ? "Ask a Question" : undefined}
    onAction={onStartChat}
  />
);

export const EmptyAnalyticsState: React.FC = () => (
  <EmptyState
    icon="analytics-outline"
    iconColor="#8B5CF6"
    title="Not enough data yet"
    message="Log at least 3 days of meals to see your analytics and trends"
    size="medium"
  />
);

export const EmptyFastingState: React.FC<{
  onStartFast?: () => void;
}> = ({ onStartFast }) => (
  <EmptyState
    icon="time-outline"
    iconColor="#10B981"
    title="No active fasting session"
    message="Start a fasting session to track your intermittent fasting progress"
    actionLabel={onStartFast ? "Start Fasting" : undefined}
    onAction={onStartFast}
  />
);

export const EmptyWeightHistoryState: React.FC<{
  onLogWeight?: () => void;
}> = ({ onLogWeight }) => (
  <EmptyState
    icon="trending-up-outline"
    iconColor="#3B82F6"
    title="No weight entries"
    message="Track your weight over time to see your progress and trends"
    actionLabel={onLogWeight ? "Log Weight" : undefined}
    onAction={onLogWeight}
    size="small"
  />
);

export const EmptyRecentFoodsState: React.FC = () => (
  <EmptyState
    icon="time-outline"
    title="No recent foods"
    message="Foods you log will appear here for quick re-logging"
    size="small"
  />
);

export const EmptyMealPlanState: React.FC<{
  onCreatePlan?: () => void;
}> = ({ onCreatePlan }) => (
  <EmptyState
    illustration="https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&q=80"
    title="No meal plan yet"
    message="Let your AI coach create a personalized meal plan based on your goals and preferences"
    actionLabel={onCreatePlan ? "Create Meal Plan" : undefined}
    onAction={onCreatePlan}
  />
);

export const EmptyNotificationsState: React.FC = () => (
  <EmptyState
    icon="notifications-outline"
    iconColor="#F59E0B"
    title="No notifications"
    message="Your notifications will appear here. Check back later!"
    size="small"
  />
);

/**
 * Loading state variant (for when data is being fetched)
 */
export const LoadingState: React.FC<{
  message?: string;
}> = ({ message = "Loading..." }) => (
  <View className="flex-1 items-center justify-center py-16">
    <View className="mb-4">
      <Ionicons name="hourglass-outline" size={48} color="#9CA3AF" />
    </View>
    <Text className="text-base text-gray-600 dark:text-gray-400">
      {message}
    </Text>
  </View>
);

/**
 * Error state variant (for when data fetching fails)
 */
export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = "Something went wrong",
  message = "We could not load this data. Please try again.",
  onRetry,
}) => (
  <EmptyState
    icon="alert-circle-outline"
    iconColor="#EF4444"
    title={title}
    message={message}
    actionLabel={onRetry ? "Try Again" : undefined}
    onAction={onRetry}
    size="medium"
  />
);

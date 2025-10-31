/**
 * GOAL SYSTEM TYPES
 *
 * Comprehensive goal tracking with AI suggestions, progress monitoring,
 * and dynamic goal unlocking based on user behavior
 */

export type GoalCategory =
  | 'weight_management'
  | 'nutrition'
  | 'fitness'
  | 'habits'
  | 'health_metrics'
  | 'fasting'
  | 'mental_wellness';

export type GoalStatus =
  | 'active'
  | 'completed'
  | 'paused'
  | 'failed'
  | 'archived';

export type GoalDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type GoalFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'one_time'
  | 'custom';

/**
 * Core Goal interface
 */
export interface Goal {
  id: string;
  user_id: string;

  // Goal details
  title: string;
  description: string;
  category: GoalCategory;
  difficulty: GoalDifficulty;

  // Status and progress
  status: GoalStatus;
  progress: number;              // 0-100
  current_value?: number;        // e.g., current weight, current steps
  target_value?: number;         // e.g., target weight, target steps

  // Frequency and duration
  frequency: GoalFrequency;
  frequency_count?: number;      // e.g., 3 times per week
  start_date: string;
  target_date?: string;
  completed_date?: string;

  // AI suggestion metadata
  is_ai_suggested: boolean;
  suggestion_reason?: string;    // Why AI suggested this
  unlocked_by?: string;          // Goal ID that unlocked this
  unlock_conditions?: string[];  // What needs to happen to unlock

  // Tracking
  streak_days: number;
  best_streak: number;
  times_completed: number;       // For recurring goals

  // Rewards and motivation
  points_value: number;
  celebration_message?: string;

  // Custom fields
  custom_data?: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_checked_at?: string;
}

/**
 * Goal progress tracking entry
 */
export interface GoalProgressEntry {
  id: string;
  goal_id: string;
  user_id: string;

  // Progress data
  value: number;                 // Progress amount
  notes?: string;
  recorded_at: string;

  // Source
  source: 'manual' | 'automatic' | 'ai_detected';
  source_metadata?: Record<string, any>;

  created_at: string;
}

/**
 * Goal suggestion from AI
 */
export interface GoalSuggestion {
  id: string;
  user_id: string;

  // Suggestion details
  suggested_goal: Partial<Goal>;
  reason: string;
  confidence: number;            // 0-1 how confident AI is
  priority: number;              // 1-10, higher = more important

  // Context that led to suggestion
  trigger_type: 'behavior_pattern' | 'achievement' | 'time_based' | 'health_risk';
  trigger_data?: Record<string, any>;

  // User interaction
  status: 'pending' | 'accepted' | 'dismissed' | 'expired';
  presented_at: string;
  responded_at?: string;

  // Display
  notification_sent: boolean;
  display_priority: number;

  created_at: string;
  expires_at?: string;
}

/**
 * Goal template (predefined goals)
 */
export interface GoalTemplate {
  id: string;
  category: GoalCategory;
  difficulty: GoalDifficulty;

  title: string;
  description: string;
  icon?: string;

  // Default values
  default_target_value?: number;
  default_frequency: GoalFrequency;
  default_frequency_count?: number;

  // Unlock conditions
  requires_goals?: string[];     // Template IDs that must be completed first
  min_days_active?: number;
  min_streak?: number;

  // Tags for filtering
  tags: string[];

  // Is this goal visible to all, or unlocked based on conditions?
  always_visible: boolean;

  created_at: string;
}

/**
 * User behavior pattern (for AI suggestions)
 */
export interface UserBehaviorPattern {
  id: string;
  user_id: string;

  // Pattern details
  pattern_type:
    | 'sedentary_detected'
    | 'good_nutrition_streak'
    | 'missing_macros'
    | 'consistent_logging'
    | 'low_protein'
    | 'high_sodium'
    | 'skipping_meals'
    | 'late_night_eating'
    | 'weekend_slipping'
    | 'fasting_ready'
    | 'plateau_detected';

  confidence: number;            // 0-1
  severity?: 'low' | 'medium' | 'high';

  // Data that supports this pattern
  supporting_data: Record<string, any>;

  // When detected
  first_detected_at: string;
  last_detected_at: string;
  detection_count: number;

  // Has AI suggested a goal for this pattern?
  goal_suggested: boolean;
  goal_suggestion_id?: string;

  created_at: string;
}

/**
 * Goal achievement milestone
 */
export interface GoalMilestone {
  id: string;
  goal_id: string;
  user_id: string;

  // Milestone details
  title: string;
  description: string;
  threshold: number;             // e.g., 50% progress, 30 days streak

  // Status
  achieved: boolean;
  achieved_at?: string;

  // Reward
  points_awarded: number;
  badge_id?: string;
  celebration_shown: boolean;

  created_at: string;
}

/**
 * Goal notification
 */
export interface GoalNotification {
  id: string;
  user_id: string;
  goal_id?: string;
  suggestion_id?: string;

  // Notification details
  type:
    | 'goal_unlocked'
    | 'goal_achieved'
    | 'milestone_reached'
    | 'streak_milestone'
    | 'suggestion_available'
    | 'goal_reminder'
    | 'goal_at_risk';

  title: string;
  message: string;
  action_label?: string;
  action_route?: string;

  // Priority
  priority: 'low' | 'medium' | 'high';

  // Status
  read: boolean;
  read_at?: string;
  dismissed: boolean;

  created_at: string;
  expires_at?: string;
}

/**
 * Goal analytics summary
 */
export interface GoalAnalytics {
  user_id: string;
  period: 'week' | 'month' | 'year' | 'all_time';

  // Counts
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  failed_goals: number;

  // Progress
  average_completion_rate: number;
  goals_on_track: number;
  goals_at_risk: number;

  // Streaks
  longest_streak: number;
  current_streaks: Array<{ goal_id: string; days: number }>;

  // Points and achievements
  total_points_earned: number;
  milestones_achieved: number;

  // Categories
  most_active_category: GoalCategory;
  category_breakdown: Record<GoalCategory, number>;

  // AI suggestions
  suggestions_accepted: number;
  suggestions_dismissed: number;
  suggestion_acceptance_rate: number;

  calculated_at: string;
}

/**
 * Create goal request
 */
export interface CreateGoalRequest {
  title: string;
  description?: string;
  category: GoalCategory;
  difficulty?: GoalDifficulty;
  target_value?: number;
  frequency: GoalFrequency;
  frequency_count?: number;
  target_date?: string;
  custom_data?: Record<string, any>;
}

/**
 * Update goal request
 */
export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  status?: GoalStatus;
  target_value?: number;
  target_date?: string;
  frequency?: GoalFrequency;
  frequency_count?: number;
  custom_data?: Record<string, any>;
}

/**
 * Record goal progress request
 */
export interface RecordProgressRequest {
  goal_id: string;
  value: number;
  notes?: string;
  source?: 'manual' | 'automatic' | 'ai_detected';
  source_metadata?: Record<string, any>;
}

/**
 * AI goal suggestion request
 */
export interface RequestGoalSuggestionParams {
  user_id: string;
  limit?: number;
  categories?: GoalCategory[];
  min_confidence?: number;
}

/**
 * Goal filter options
 */
export interface GoalFilterOptions {
  status?: GoalStatus[];
  category?: GoalCategory[];
  difficulty?: GoalDifficulty[];
  is_ai_suggested?: boolean;
  include_archived?: boolean;
}

/**
 * Goal sort options
 */
export type GoalSortField =
  | 'created_at'
  | 'updated_at'
  | 'progress'
  | 'target_date'
  | 'priority';

export type GoalSortDirection = 'asc' | 'desc';

export interface GoalSortOptions {
  field: GoalSortField;
  direction: GoalSortDirection;
}

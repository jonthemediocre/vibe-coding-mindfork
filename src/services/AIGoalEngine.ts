/**
 * AI GOAL SUGGESTION ENGINE
 *
 * Analyzes user behavior patterns and suggests personalized goals
 * Sophisticated detection of habits, deficiencies, and opportunities
 */

import { supabase } from '../lib/supabase';
import type {
  Goal,
  GoalSuggestion,
  UserBehaviorPattern,
  GoalCategory,
  GoalDifficulty,
  CreateGoalRequest
} from '../types/goals';
import type { UserProfile } from '../types/profile';

/**
 * Behavior pattern detection thresholds
 */
const DETECTION_THRESHOLDS = {
  // Nutrition patterns
  consistent_logging_days: 7,
  good_nutrition_streak: 5,
  low_protein_threshold: 0.7,      // 70% of target
  high_sodium_threshold: 1.3,      // 130% of recommended
  missing_macros_days: 3,

  // Activity patterns
  sedentary_steps_threshold: 3000,
  sedentary_days: 5,

  // Eating patterns
  late_night_eating_hour: 21,      // 9pm
  late_night_frequency: 3,
  skipping_meals_threshold: 0.5,   // Skipping 50%+ of meals

  // Progress patterns
  plateau_days: 14,
  plateau_weight_variance: 0.5,    // kg

  // Fasting readiness
  fasting_ready_streak: 7,
  fasting_ready_consistency: 0.8   // 80% on-track
};

/**
 * AI GOAL SUGGESTION ENGINE
 */
export class AIGoalEngine {

  /**
   * Generate goal suggestions for user based on behavior
   */
  static async generateSuggestions(
    userId: string,
    limit: number = 3
  ): Promise<GoalSuggestion[]> {

    // Step 1: Detect behavior patterns
    const patterns = await this.detectBehaviorPatterns(userId);

    // Step 2: Get existing goals to avoid duplicates
    const { data: existingGoals } = await supabase
      .from('goals')
      .select('category, title')
      .eq('user_id', userId)
      .in('status', ['active', 'paused']);

    const existingCategories: Set<GoalCategory> = new Set(
      (existingGoals || []).map(g => g.category as GoalCategory)
    );

    // Step 3: Generate suggestions from patterns
    const suggestions: Omit<GoalSuggestion, 'id' | 'created_at'>[] = [];

    for (const pattern of patterns) {
      const suggestion = await this.patternToSuggestion(
        userId,
        pattern,
        existingCategories
      );

      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // Step 4: Sort by priority and take top N
    suggestions.sort((a, b) => b.priority - a.priority);
    const topSuggestions = suggestions.slice(0, limit);

    // Step 5: Save to database
    const { data: saved } = await supabase
      .from('goal_suggestions')
      .insert(topSuggestions)
      .select();

    return (saved || []) as GoalSuggestion[];
  }

  /**
   * Detect behavior patterns from user data
   */
  private static async detectBehaviorPatterns(
    userId: string
  ): Promise<UserBehaviorPattern[]> {

    const patterns: Omit<UserBehaviorPattern, 'id' | 'created_at'>[] = [];
    const now = new Date();

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) return [];

    // Get last 30 days of food logs
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: foodLogs } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', thirtyDaysAgo.toISOString())
      .order('logged_at', { ascending: false });

    // Get nutrition goals
    const dailyProtein = profile.daily_protein_g || 150;
    const dailyCalories = profile.daily_calories || 2000;

    // PATTERN 1: Consistent logging (good behavior)
    const loggingDays = new Set(
      (foodLogs || []).map(log => new Date(log.logged_at).toDateString())
    ).size;

    if (loggingDays >= DETECTION_THRESHOLDS.consistent_logging_days) {
      const lastWeek = (foodLogs || []).filter(log => {
        const logDate = new Date(log.logged_at);
        return (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24) <= 7;
      });

      const avgCalories = lastWeek.reduce((sum, log) => sum + (log.calories || 0), 0) / 7;
      const calorieDeviation = Math.abs(avgCalories - dailyCalories) / dailyCalories;

      if (calorieDeviation < 0.15) { // Within 15% of target
        patterns.push({
          user_id: userId,
          pattern_type: 'good_nutrition_streak',
          confidence: 0.9,
          severity: 'low',
          supporting_data: {
            logging_days: loggingDays,
            avg_calories: avgCalories,
            target_calories: dailyCalories,
            consistency_score: 1 - calorieDeviation
          },
          first_detected_at: thirtyDaysAgo.toISOString(),
          last_detected_at: now.toISOString(),
          detection_count: 1,
          goal_suggested: false
        });
      }
    }

    // PATTERN 2: Low protein intake
    const recentLogs = (foodLogs || []).slice(0, 7);
    const avgProtein = recentLogs.reduce((sum, log) => sum + (log.protein_g || 0), 0) / Math.max(recentLogs.length, 1);
    const proteinRatio = avgProtein / dailyProtein;

    if (proteinRatio < DETECTION_THRESHOLDS.low_protein_threshold && recentLogs.length >= 3) {
      patterns.push({
        user_id: userId,
        pattern_type: 'low_protein',
        confidence: 0.85,
        severity: 'medium',
        supporting_data: {
          avg_protein: avgProtein,
          target_protein: dailyProtein,
          ratio: proteinRatio,
          sample_days: recentLogs.length
        },
        first_detected_at: thirtyDaysAgo.toISOString(),
        last_detected_at: now.toISOString(),
        detection_count: 1,
        goal_suggested: false
      });
    }

    // PATTERN 3: Sedentary behavior (if step tracking available)
    const { data: stepLogs } = await supabase
      .from('step_tracking')
      .select('steps, date')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (stepLogs && stepLogs.length >= 5) {
      const avgSteps = stepLogs.reduce((sum, log) => sum + log.steps, 0) / stepLogs.length;

      if (avgSteps < DETECTION_THRESHOLDS.sedentary_steps_threshold) {
        patterns.push({
          user_id: userId,
          pattern_type: 'sedentary_detected',
          confidence: 0.8,
          severity: 'high',
          supporting_data: {
            avg_steps: avgSteps,
            days_tracked: stepLogs.length,
            threshold: DETECTION_THRESHOLDS.sedentary_steps_threshold
          },
          first_detected_at: thirtyDaysAgo.toISOString(),
          last_detected_at: now.toISOString(),
          detection_count: 1,
          goal_suggested: false
        });
      }
    }

    // PATTERN 4: Late night eating
    const lateNightLogs = (foodLogs || []).filter(log => {
      const hour = new Date(log.logged_at).getHours();
      return hour >= DETECTION_THRESHOLDS.late_night_eating_hour;
    });

    if (lateNightLogs.length >= DETECTION_THRESHOLDS.late_night_frequency) {
      patterns.push({
        user_id: userId,
        pattern_type: 'late_night_eating',
        confidence: 0.75,
        severity: 'medium',
        supporting_data: {
          late_night_meals: lateNightLogs.length,
          total_meals: foodLogs?.length || 0,
          frequency: lateNightLogs.length / (foodLogs?.length || 1)
        },
        first_detected_at: thirtyDaysAgo.toISOString(),
        last_detected_at: now.toISOString(),
        detection_count: 1,
        goal_suggested: false
      });
    }

    // PATTERN 5: Weight plateau
    const { data: weightLogs } = await supabase
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', thirtyDaysAgo.toISOString())
      .order('logged_at', { ascending: false })
      .limit(10);

    if (weightLogs && weightLogs.length >= 5) {
      const weights = weightLogs.map(log => log.weight_kg);
      const maxWeight = Math.max(...weights);
      const minWeight = Math.min(...weights);
      const variance = maxWeight - minWeight;

      if (variance <= DETECTION_THRESHOLDS.plateau_weight_variance) {
        patterns.push({
          user_id: userId,
          pattern_type: 'plateau_detected',
          confidence: 0.7,
          severity: 'medium',
          supporting_data: {
            weight_variance: variance,
            days_tracked: weightLogs.length,
            current_weight: weights[0],
            goal: profile.primary_goal
          },
          first_detected_at: weightLogs[weightLogs.length - 1].logged_at,
          last_detected_at: weightLogs[0].logged_at,
          detection_count: 1,
          goal_suggested: false
        });
      }
    }

    // PATTERN 6: Fasting readiness (good streak + consistency)
    if (loggingDays >= DETECTION_THRESHOLDS.fasting_ready_streak && recentLogs.length >= 7) {
      const consistency = recentLogs.filter(log => {
        const calorieDeviation = Math.abs((log.calories || 0) - dailyCalories) / dailyCalories;
        return calorieDeviation < 0.2;
      }).length / recentLogs.length;

      if (consistency >= DETECTION_THRESHOLDS.fasting_ready_consistency) {
        patterns.push({
          user_id: userId,
          pattern_type: 'fasting_ready',
          confidence: 0.85,
          severity: 'low',
          supporting_data: {
            logging_days: loggingDays,
            consistency_score: consistency,
            ready_reason: 'consistent_nutrition'
          },
          first_detected_at: thirtyDaysAgo.toISOString(),
          last_detected_at: now.toISOString(),
          detection_count: 1,
          goal_suggested: false
        });
      }
    }

    return patterns as UserBehaviorPattern[];
  }

  /**
   * Convert behavior pattern to goal suggestion
   */
  private static async patternToSuggestion(
    userId: string,
    pattern: UserBehaviorPattern,
    existingCategories: Set<GoalCategory>
  ): Promise<Omit<GoalSuggestion, 'id' | 'created_at'> | null> {

    let suggestedGoal: Partial<Goal> | null = null;
    let reason = '';
    let priority = 5;
    let triggerType: GoalSuggestion['trigger_type'] = 'behavior_pattern';

    switch (pattern.pattern_type) {
      case 'sedentary_detected':
        if (!existingCategories.has('fitness')) {
          suggestedGoal = {
            title: 'Walk 5,000 Steps Daily',
            description: 'Build a foundation of daily movement by reaching 5,000 steps each day. This will boost your energy and support your weight goals.',
            category: 'fitness',
            difficulty: 'easy',
            target_value: 5000,
            frequency: 'daily',
            frequency_count: 7,
            points_value: 50,
            is_ai_suggested: true
          };
          reason = `I noticed your daily step count averages ${Math.round(pattern.supporting_data.avg_steps)} steps. Adding regular walking will accelerate your progress and improve overall health.`;
          priority = 9;
        }
        break;

      case 'low_protein':
        if (!existingCategories.has('nutrition')) {
          const targetProtein = pattern.supporting_data.target_protein;
          suggestedGoal = {
            title: `Hit ${targetProtein}g Protein Daily`,
            description: 'Protein helps preserve muscle, keeps you full longer, and boosts metabolism. Aim for lean meats, fish, eggs, or plant-based options.',
            category: 'nutrition',
            difficulty: 'medium',
            target_value: targetProtein,
            frequency: 'daily',
            frequency_count: 7,
            points_value: 75,
            is_ai_suggested: true
          };
          reason = `Your protein intake is averaging ${Math.round(pattern.supporting_data.avg_protein)}g, which is ${Math.round((1 - pattern.supporting_data.ratio) * 100)}% below your target. Increasing protein will help with satiety and results.`;
          priority = 8;
        }
        break;

      case 'late_night_eating':
        if (!existingCategories.has('habits')) {
          suggestedGoal = {
            title: 'Stop Eating by 8 PM',
            description: 'Give your body time to digest before bed. Late-night eating can disrupt sleep and slow progress.',
            category: 'habits',
            difficulty: 'medium',
            frequency: 'daily',
            frequency_count: 7,
            points_value: 60,
            is_ai_suggested: true
          };
          reason = `I detected ${pattern.supporting_data.late_night_meals} late-night meals recently. Finishing dinner earlier can improve sleep quality and accelerate fat loss.`;
          priority = 7;
        }
        break;

      case 'fasting_ready':
        if (!existingCategories.has('fasting')) {
          suggestedGoal = {
            title: 'Try 16:8 Intermittent Fasting',
            description: 'Fast for 16 hours (including sleep), eat within an 8-hour window. Start with 12pm-8pm eating window.',
            category: 'fasting',
            difficulty: 'medium',
            target_value: 16,
            frequency: 'daily',
            frequency_count: 5,
            points_value: 100,
            is_ai_suggested: true
          };
          reason = `You have built great consistency with ${pattern.supporting_data.logging_days} days of tracking and ${Math.round(pattern.supporting_data.consistency_score * 100)}% adherence. You are ready for intermittent fasting!`;
          priority = 8;
        }
        break;

      case 'plateau_detected':
        if (!existingCategories.has('fitness')) {
          suggestedGoal = {
            title: 'Add 2 Strength Training Sessions',
            description: 'Break through the plateau with resistance training. Build muscle to boost metabolism and reshape your body.',
            category: 'fitness',
            difficulty: 'medium',
            frequency: 'weekly',
            frequency_count: 2,
            points_value: 80,
            is_ai_suggested: true
          };
          reason = `Your weight has been stable for ${pattern.supporting_data.days_tracked} days. Adding strength training can break through plateaus by increasing muscle mass and metabolism.`;
          priority = 8;
        }
        break;

      case 'good_nutrition_streak':
        // Reward good behavior with advanced goal
        if (!existingCategories.has('nutrition')) {
          suggestedGoal = {
            title: 'Master Macro Tracking',
            description: 'Track not just calories, but hit your protein, carbs, and fat targets within 5g each day.',
            category: 'nutrition',
            difficulty: 'hard',
            frequency: 'daily',
            frequency_count: 7,
            points_value: 120,
            is_ai_suggested: true
          };
          reason = `You have maintained excellent consistency for ${pattern.supporting_data.logging_days} days with ${Math.round(pattern.supporting_data.consistency_score * 100)}% accuracy. You are ready for the next level!`;
          priority = 6;
          triggerType = 'achievement';
        }
        break;
    }

    if (!suggestedGoal) return null;

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return {
      user_id: userId,
      suggested_goal: suggestedGoal as Partial<Goal>,
      reason,
      confidence: pattern.confidence,
      priority,
      trigger_type: triggerType,
      trigger_data: pattern.supporting_data,
      status: 'pending',
      presented_at: new Date().toISOString(),
      notification_sent: false,
      display_priority: priority,
      expires_at: expiresAt.toISOString()
    };
  }

  /**
   * Accept a goal suggestion (convert to actual goal)
   */
  static async acceptSuggestion(
    suggestionId: string,
    userId: string
  ): Promise<Goal | null> {

    // Get suggestion
    const { data: suggestion } = await supabase
      .from('goal_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('user_id', userId)
      .single();

    if (!suggestion || suggestion.status !== 'pending') {
      return null;
    }

    // Create goal from suggestion
    const goalData: any = {
      ...suggestion.suggested_goal,
      user_id: userId,
      status: 'active',
      progress: 0,
      streak_days: 0,
      best_streak: 0,
      times_completed: 0,
      start_date: new Date().toISOString(),
      suggestion_reason: suggestion.reason
    };

    const { data: goal, error } = await supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single();

    if (error || !goal) {
      console.error('Failed to create goal from suggestion:', error);
      return null;
    }

    // Update suggestion status
    await supabase
      .from('goal_suggestions')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    // Update pattern to mark goal as suggested
    await supabase
      .from('user_behavior_patterns')
      .update({
        goal_suggested: true,
        goal_suggestion_id: suggestionId
      })
      .eq('user_id', userId)
      .eq('goal_suggested', false);

    return goal as Goal;
  }

  /**
   * Dismiss a goal suggestion
   */
  static async dismissSuggestion(
    suggestionId: string,
    userId: string
  ): Promise<void> {

    await supabase
      .from('goal_suggestions')
      .update({
        status: 'dismissed',
        responded_at: new Date().toISOString()
      })
      .eq('id', suggestionId)
      .eq('user_id', userId);
  }

  /**
   * Get pending suggestions for user
   */
  static async getPendingSuggestions(
    userId: string
  ): Promise<GoalSuggestion[]> {

    const { data } = await supabase
      .from('goal_suggestions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('display_priority', { ascending: false });

    return (data || []) as GoalSuggestion[];
  }
}

/**
 * HELPER: Trigger goal suggestion check (call periodically or after key events)
 */
export async function checkAndSuggestGoals(userId: string): Promise<number> {
  const suggestions = await AIGoalEngine.generateSuggestions(userId, 3);

  // Create notifications for high-priority suggestions
  for (const suggestion of suggestions) {
    if (suggestion.priority >= 8) {
      await supabase
        .from('goal_notifications')
        .insert({
          user_id: userId,
          suggestion_id: suggestion.id,
          type: 'suggestion_available',
          title: 'New Goal Suggestion',
          message: suggestion.reason,
          action_label: 'View Goal',
          action_route: '/goals/suggestions',
          priority: 'high',
          read: false,
          dismissed: false
        });
    }
  }

  return suggestions.length;
}

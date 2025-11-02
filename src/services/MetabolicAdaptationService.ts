/**
 * METABOLIC ADAPTATION SERVICE
 *
 * Implements MacroFactor-style metabolic tracking with MindFork personality.
 * Detects when user's metabolism adapts (slows down or speeds up) and
 * automatically adjusts calorie targets with AI coach explanation.
 *
 * Algorithm based on:
 * - 7-day EMA trend weight (smooths daily fluctuations)
 * - Energy balance equation (intake - expenditure = weight change * kcal_per_lb)
 * - Adaptive thermogenesis detection (deficit → metabolic slowdown)
 *
 * @example
 * // Check if user's metabolism has adapted
 * const result = await MetabolicAdaptationService.detectAdaptation(userId);
 * if (result?.adapted) {
 *   console.log(result.coachExplanation);
 *   await MetabolicAdaptationService.applyAdaptation(userId, result, 'synapse');
 * }
 */

import { supabase } from '../lib/supabase';
import { getCoachPersonality } from '../data/coachPersonalities';

// =====================================================================
// CONFIGURATION
// =====================================================================

interface Config {
  ema_halflife_days: number;        // 7 (smoothing for trend weight)
  kcal_per_lb: number;               // 3500.0 (default energy/weight ratio)
  adapt_floor: number;               // 0.10 (min adaptation %)
  adapt_ceiling: number;             // 0.25 (max adaptation %)
  adapt_gain: number;                // 0.45 (sensitivity)
  min_weighins_per_week: number;    // 1
  min_days_for_update: number;      // 3
  weekly_days: number;               // 7
}

const DEFAULT_CONFIG: Config = {
  ema_halflife_days: 7,
  kcal_per_lb: 3500.0,
  adapt_floor: 0.10,
  adapt_ceiling: 0.25,
  adapt_gain: 0.45,
  min_weighins_per_week: 1,
  min_days_for_update: 3,
  weekly_days: 7,
};

// =====================================================================
// TYPES
// =====================================================================

export interface MetabolicTrackingEntry {
  date: string;
  weight_lb: number | null;
  intake_kcal: number | null;
  trend_weight_lb?: number;
  estimated_ee_kcal?: number;
  adherence_score?: number;
}

export interface AdaptationResult {
  adapted: boolean;
  type: 'deficit_stall' | 'surplus_slow' | 'stable';
  magnitude: number;          // Percentage (e.g., -0.12 = 12% slowdown)
  oldCalories: number;
  newCalories: number;
  oldEE: number;
  newEE: number;
  weekStartWeight: number;
  weekEndWeight: number;
  weightChangeRate: number;   // lbs per day
  confidence: number;         // 0.0 to 1.0
  dataPoints: number;
  coachExplanation: string;
}

// =====================================================================
// MAIN SERVICE
// =====================================================================

export class MetabolicAdaptationService {
  private static config: Config = DEFAULT_CONFIG;

  /**
   * Calculate trend weight using Exponential Moving Average
   * Smooths daily weight fluctuations (water retention, food weight, etc.)
   */
  private static calculateTrendWeight(weights: (number | null)[]): number[] {
    const alpha = 1 - Math.exp(Math.log(0.5) / this.config.ema_halflife_days);
    const trend: number[] = [];

    // Forward fill missing values
    let lastValid = weights.find(w => w !== null) || 0;

    for (let i = 0; i < weights.length; i++) {
      const currentWeight = weights[i] !== null ? weights[i]! : lastValid;
      lastValid = currentWeight;

      if (i === 0) {
        trend[i] = currentWeight;
      } else {
        // EMA formula: new_trend = alpha * current + (1 - alpha) * prev_trend
        trend[i] = alpha * currentWeight + (1 - alpha) * trend[i - 1];
      }
    }

    return trend;
  }

  /**
   * Calculate average value, ignoring nulls
   */
  private static average(values: (number | null)[]): number {
    const valid = values.filter((v): v is number => v !== null);
    if (valid.length === 0) return 0;
    return valid.reduce((sum, v) => sum + v, 0) / valid.length;
  }

  /**
   * Clip value between min and max
   */
  private static clip(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Detect metabolic adaptation for a user
   *
   * Compares week 2 vs week 4 to detect if metabolism has adapted:
   * - Deficit stall: Weight loss slowed despite consistent deficit
   * - Surplus slow: Weight gain slowed despite consistent surplus
   *
   * @param userId - User's UUID
   * @returns Adaptation result with calorie adjustments and coach explanation, or null if no adaptation
   */
  static async detectAdaptation(userId: string): Promise<AdaptationResult | null> {
    try {
      // Get last 30 days of data
      const { data: trackingData, error } = await supabase
        .from('metabolic_tracking')
        .select('date, weight_lb, intake_kcal, adherence_score')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error || !trackingData || trackingData.length < 21) {
        // Need at least 3 weeks of data
        return null;
      }

      // Extract weights and intake
      const weights = trackingData.map(d => d.weight_lb);
      const intakes = trackingData.map(d => d.intake_kcal);
      const adherenceScores = trackingData.map(d => d.adherence_score || 0);

      // Calculate trend weights
      const trendWeights = this.calculateTrendWeight(weights);

      // Define week ranges
      const week2Start = 7;
      const week2End = 14;
      const week4Start = 21;
      const week4End = Math.min(28, trackingData.length);

      if (trackingData.length < week4Start + 3) {
        return null;  // Not enough data for week 4 comparison
      }

      // Get trend weights for each week
      const week2WeightStart = trendWeights[week2Start];
      const week2WeightEnd = trendWeights[week2End - 1];
      const week4WeightStart = trendWeights[week4Start];
      const week4WeightEnd = trendWeights[week4End - 1];

      // Calculate average intake for each week
      const week2Intakes = intakes.slice(week2Start, week2End).filter(i => i !== null) as number[];
      const week4Intakes = intakes.slice(week4Start, week4End).filter(i => i !== null) as number[];

      if (week2Intakes.length < 4 || week4Intakes.length < 4) {
        return null;  // Not enough intake data
      }

      const week2Intake = this.average(week2Intakes);
      const week4Intake = this.average(week4Intakes);

      // Calculate weight change rates (lbs per day)
      const week2Days = week2End - week2Start;
      const week4Days = week4End - week4Start;
      const week2Rate = (week2WeightEnd - week2WeightStart) / week2Days;
      const week4Rate = (week4WeightEnd - week4WeightStart) / week4Days;

      // Calculate adherence
      const avgAdherence = this.average(adherenceScores);

      // Check if intake is stable (within 200 kcal)
      const intakeStable = Math.abs(week4Intake - week2Intake) < 200;

      if (!intakeStable) {
        return null;  // Intake changed too much to detect adaptation
      }

      // Detect adaptation types
      const rateDifference = week4Rate - week2Rate;

      // Deficit stall: User is losing weight but loss rate slowed significantly
      const deficitStall = week2Rate < -0.1 && rateDifference > 0.05 && intakeStable;

      // Surplus slow: User is gaining weight but gain rate slowed significantly
      const surplusSlow = week2Rate > 0.1 && rateDifference < -0.05 && intakeStable;

      if (!deficitStall && !surplusSlow) {
        return null;  // No significant adaptation detected
      }

      // Calculate adaptation magnitude
      const adaptType: 'deficit_stall' | 'surplus_slow' = deficitStall ? 'deficit_stall' : 'surplus_slow';
      const magnitude = this.clip(
        Math.abs(rateDifference) / Math.abs(week2Rate),
        this.config.adapt_floor,
        this.config.adapt_ceiling
      );

      // Calculate energy expenditure
      const oldEE = Math.round(week2Intake - (week2Rate * this.config.kcal_per_lb));
      const newEE = Math.round(week4Intake - (week4Rate * this.config.kcal_per_lb));

      // Get current profile to determine old calories
      const { data: profile } = await supabase
        .from('profiles')
        .select('daily_calories, primary_goal')
        .eq('id', userId)
        .single();

      const oldCalories = profile?.daily_calories || Math.round(week4Intake);

      // Calculate new recommended calories
      const calorieAdjustment = deficitStall ?
        -Math.round(oldCalories * magnitude) :  // Reduce further for stalled deficit
        Math.round(oldCalories * magnitude);     // Increase for slowed surplus

      const newCalories = this.clip(
        oldCalories + calorieAdjustment,
        1200,  // Never go below 1200 (safe minimum)
        5000   // Never go above 5000 (sanity check)
      );

      // Calculate confidence score based on data quality
      const dataPoints = week2Intakes.length + week4Intakes.length;
      const confidence = this.clip(
        avgAdherence * (dataPoints / 14),  // Perfect score = 1.0 adherence * 14 data points
        0.5,
        1.0
      );

      // Generate coach explanation
      const coachExplanation = await this.generateCoachExplanation(
        userId,
        adaptType,
        magnitude,
        oldCalories,
        newCalories,
        week2Rate,
        week4Rate
      );

      return {
        adapted: true,
        type: adaptType,
        magnitude,
        oldCalories,
        newCalories,
        oldEE,
        newEE,
        weekStartWeight: week4WeightStart,
        weekEndWeight: week4WeightEnd,
        weightChangeRate: week4Rate,
        confidence,
        dataPoints,
        coachExplanation,
      };

    } catch (error) {
      console.error('[MetabolicAdaptationService] Detection error:', error);
      return null;
    }
  }

  /**
   * Generate personalized coach explanation for metabolic adaptation
   * Each coach has a unique way of explaining metabolic changes
   */
  private static async generateCoachExplanation(
    userId: string,
    adaptType: 'deficit_stall' | 'surplus_slow',
    magnitude: number,
    oldCalories: number,
    newCalories: number,
    oldRate: number,
    newRate: number
  ): Promise<string> {

    // Get user's most recently used coach
    const { data: recentChat } = await supabase
      .from('coach_messages')
      .select('coach_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const coachId = recentChat?.coach_id || 'synapse';  // Default to Synapse
    const personality = getCoachPersonality(coachId);

    const percentChange = Math.round(magnitude * 100);
    const calorieChange = newCalories - oldCalories;
    const oldRateWeekly = Math.abs(oldRate * 7).toFixed(1);
    const newRateWeekly = Math.abs(newRate * 7).toFixed(1);

    // Fallback generic explanation
    if (!personality) {
      return `Your metabolism has adapted! I'm adjusting your daily calories from ${oldCalories} to ${newCalories} to keep you progressing toward your goal.`;
    }

    // Generate personality-specific explanation
    if (adaptType === 'deficit_stall') {
      // Weight loss slowed despite consistent deficit
      switch (coachId) {
        case 'synapse':
          return `I've been analyzing your progress data, and I noticed something fascinating: even though you've been consistently hitting your ${oldCalories} calorie target, your weight loss rate has slowed from ${oldRateWeekly} lbs/week to ${newRateWeekly} lbs/week. This is metabolic adaptation - your body is becoming more efficient with energy. Research shows this happens to ~80% of dieters after 2-4 weeks. I'm adjusting your target to ${newCalories} calories (${Math.abs(calorieChange)} ${calorieChange < 0 ? 'fewer' : 'more'}). This isn't a punishment - it's personalization based on how YOUR body responds. Your metabolism isn't broken; it's adapting. Let's work with it.`;

        case 'vetra':
          return `ENERGY CHECK! 🔥 Your body is adapting! Even with consistent ${oldCalories} cal intake, your loss rate dropped ${percentChange}%. This is NORMAL - your metabolism is getting efficient! Time to level up: new target is ${newCalories} cal. This keeps the momentum going! You're not failing - you're EVOLVING! Let's GO! 💪`;

        case 'aetheris':
          return `I see you standing at a threshold. Your body, wise and protective, has slowed its release from ${oldRateWeekly} to ${newRateWeekly} lbs per week. This is not resistance - it's adaptation. Your metabolism isn't broken; it's transforming. We're adjusting from ${oldCalories} to ${newCalories} calories. This isn't restriction, it's recalibration. From these ashes of what was, we build what's next. Trust this process.`;

        case 'verdant':
          return `Slow down and breathe with me. Your body is speaking, and it's saying: "I'm adapting." Over these weeks, your weight release has naturally slowed from ${oldRateWeekly} to ${newRateWeekly} lbs per week. Like a tree growing deeper roots before reaching higher, your metabolism is finding its new rhythm. We're gently adjusting from ${oldCalories} to ${newCalories} calories - not forcing, just flowing with your body's wisdom. There's no rush. Sustainable change grows from patience.`;

        case 'veloura':
          return `Data analysis complete. Your weight loss rate dropped ${percentChange}% despite ${oldCalories} cal adherence. Diagnosis: metabolic adaptation. Solution: recalibrate to ${newCalories} cal. This is strategic adjustment, not failure. Your system adapted; we counter-adapt. New targets loaded. Execute.`;

        case 'decibel':
          return `Hey! So I noticed something cool (well, scientifically cool, maybe not "yay" cool 😅): your metabolism adapted! You've been crushing your ${oldCalories} cal target, but your loss rate slowed from ${oldRateWeekly} to ${newRateWeekly} lbs/week. Totally normal! We're adjusting to ${newCalories} cal - think of it as your personalized sweet spot. You're not broken, you're just efficient! Let's make this work deliciously! 🐬`;

        default:
          return `Your metabolism has adapted to your ${oldCalories} calorie intake. I'm adjusting your target to ${newCalories} calories to continue progressing toward your goal. This is a normal part of the process!`;
      }
    } else {
      // Surplus slow: Weight gain slowed despite consistent surplus (muscle building stalled)
      switch (coachId) {
        case 'synapse':
          return `Interesting data point: despite consistently eating ${oldCalories} calories in your surplus, your gain rate has slowed from ${(oldRate * 7).toFixed(1)} to ${(newRate * 7).toFixed(1)} lbs/week. Your metabolism is ramping up - this is actually a sign your body is efficiently using those calories for muscle building. I'm increasing your target to ${newCalories} calories (+${calorieChange}) to maintain your muscle-building momentum. This is precision nutrition based on YOUR metabolic response.`;

        case 'vetra':
          return `POWER MOVE ALERT! 💪 Your metabolism is LEVELING UP! Even at ${oldCalories} cal, your gains slowed ${percentChange}%. That means your body is BURNING MORE! New target: ${newCalories} cal to keep those gains coming! You're not stalling - you're ADAPTING UPWARD! Let's fuel this machine! 🔥`;

        case 'veloura':
          return `Performance analysis: gain rate decreased ${percentChange}% at ${oldCalories} cal. Metabolic capacity increased. New fuel requirement: ${newCalories} cal. This is optimization, not compensation. Your engine upgraded; we're supplying premium fuel. Execute.`;

        default:
          return `Your metabolism has increased! Moving from ${oldCalories} to ${newCalories} calories to maintain your muscle-building progress.`;
      }
    }
  }

  /**
   * Apply metabolic adaptation (SAFE MODE - Requires user approval by default)
   *
   * This sends a notification to the user but DOES NOT automatically change calories
   * unless autoApply is explicitly set to true.
   *
   * @param userId - User's UUID
   * @param adaptation - Adaptation result from detectAdaptation()
   * @param coachId - Which coach should explain the adaptation
   * @param autoApply - If true, automatically update calories without approval (default: false for safety)
   * @returns Success boolean
   */
  static async applyAdaptation(
    userId: string,
    adaptation: AdaptationResult,
    coachId?: string,
    autoApply: boolean = false
  ): Promise<boolean> {

    try {
      const finalCoachId = coachId || 'synapse';

      // SAFE MODE: Do NOT update profile automatically unless explicitly approved
      if (autoApply) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ daily_calories: adaptation.newCalories })
          .eq('id', userId);

        if (profileError) {
          console.error('[MetabolicAdaptationService] Profile update error:', profileError);
          throw profileError;
        }
      }

      // Get current date for week calculation
      const today = new Date();
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekEnd = today;

      // Record adaptation in database (but mark as pending approval if not auto-applied)
      const { data: adaptationRecord, error: adaptError } = await supabase
        .from('metabolic_adaptations')
        .insert({
          user_id: userId,
          week_start_date: weekStart.toISOString().split('T')[0],
          week_end_date: weekEnd.toISOString().split('T')[0],
          adaptation_type: adaptation.type,
          adaptation_magnitude: adaptation.magnitude,
          old_daily_calories: adaptation.oldCalories,
          new_daily_calories: adaptation.newCalories,
          old_ee_kcal: adaptation.oldEE,
          new_ee_kcal: adaptation.newEE,
          week_start_weight_lb: adaptation.weekStartWeight,
          week_end_weight_lb: adaptation.weekEndWeight,
          weight_change_rate_lb_per_day: adaptation.weightChangeRate,
          coach_id: finalCoachId,
          coach_message: adaptation.coachExplanation,
          data_points_used: adaptation.dataPoints,
          confidence_score: adaptation.confidence,
          // Track if this was auto-applied or needs approval
          user_acknowledged: autoApply,
        })
        .select()
        .single();

      if (adaptError) {
        console.error('[MetabolicAdaptationService] Adaptation record error:', adaptError);
        throw adaptError;
      }

      // Send notification with approval context (if not auto-applied)
      const notificationMessage = autoApply
        ? adaptation.coachExplanation
        : `${adaptation.coachExplanation}\n\n🔍 Review This Change:\n• Current: ${adaptation.oldCalories} cal/day\n• Recommended: ${adaptation.newCalories} cal/day\n• Change: ${adaptation.newCalories > adaptation.oldCalories ? '+' : ''}${adaptation.newCalories - adaptation.oldCalories} cal\n\nWould you like me to apply this adjustment? You can accept or decline in your dashboard.`;

      const { error: messageError } = await supabase
        .from('coach_messages')
        .insert({
          coach_id: finalCoachId,
          user_id: userId,
          message: autoApply ? 'system_metabolic_adaptation_applied' : 'system_metabolic_adaptation_pending',
          response: notificationMessage,
          created_at: new Date().toISOString(),
          // Store adaptation ID for approval flow
          metadata: { adaptation_id: adaptationRecord.id },
        });

      if (messageError) {
        console.error('[MetabolicAdaptationService] Message insert error:', messageError);
        // Non-fatal - continue even if message fails
      }

      if (autoApply) {
        console.log(`[MetabolicAdaptationService] ✅ Auto-applied ${adaptation.type} adaptation for user ${userId}: ${adaptation.oldCalories} → ${adaptation.newCalories} cal`);
      } else {
        console.log(`[MetabolicAdaptationService] 📋 Pending approval: ${adaptation.type} adaptation for user ${userId}: ${adaptation.oldCalories} → ${adaptation.newCalories} cal`);
      }

      return true;

    } catch (error) {
      console.error('[MetabolicAdaptationService] Failed to apply metabolic adaptation:', error);
      return false;
    }
  }

  /**
   * User approves pending adaptation
   * This will update the user's calorie target and mark the adaptation as acknowledged
   *
   * @param userId - User's UUID
   * @param adaptationId - ID of the pending adaptation
   * @returns Success boolean
   */
  static async approvePendingAdaptation(
    userId: string,
    adaptationId: string
  ): Promise<boolean> {
    try {
      // Get pending adaptation
      const { data: adaptation, error: fetchError } = await supabase
        .from('metabolic_adaptations')
        .select('*')
        .eq('id', adaptationId)
        .eq('user_id', userId)
        .eq('user_acknowledged', false)
        .single();

      if (fetchError || !adaptation) {
        console.error('[MetabolicAdaptationService] Adaptation not found or already applied');
        return false;
      }

      // Apply the change to user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ daily_calories: adaptation.new_daily_calories })
        .eq('id', userId);

      if (profileError) {
        console.error('[MetabolicAdaptationService] Failed to update profile:', profileError);
        return false;
      }

      // Mark as acknowledged
      await supabase
        .from('metabolic_adaptations')
        .update({
          user_acknowledged: true,
          user_acknowledged_at: new Date().toISOString()
        })
        .eq('id', adaptationId);

      console.log(`[MetabolicAdaptationService] ✅ User approved adaptation: ${adaptation.old_daily_calories} → ${adaptation.new_daily_calories} cal`);
      return true;

    } catch (error) {
      console.error('[MetabolicAdaptationService] Failed to approve adaptation:', error);
      return false;
    }
  }

  /**
   * User declines pending adaptation
   * This will mark the adaptation as acknowledged without applying changes
   *
   * @param userId - User's UUID
   * @param adaptationId - ID of the pending adaptation
   * @returns Success boolean
   */
  static async declinePendingAdaptation(
    userId: string,
    adaptationId: string
  ): Promise<boolean> {
    try {
      // Just mark as acknowledged without applying
      const { error } = await supabase
        .from('metabolic_adaptations')
        .update({
          user_acknowledged: true,
          user_acknowledged_at: new Date().toISOString()
        })
        .eq('id', adaptationId)
        .eq('user_id', userId);

      if (error) {
        console.error('[MetabolicAdaptationService] Failed to decline adaptation:', error);
        return false;
      }

      console.log(`[MetabolicAdaptationService] ❌ User declined adaptation ${adaptationId}`);
      return true;

    } catch (error) {
      console.error('[MetabolicAdaptationService] Failed to decline adaptation:', error);
      return false;
    }
  }

  /**
   * Log daily weight and intake to metabolic_tracking table
   * Call this whenever user logs weight or completes food logging for the day
   *
   * @param userId - User's UUID
   * @param date - Date string (YYYY-MM-DD)
   * @param weightLb - Weight in pounds (optional)
   * @param intakeKcal - Total calories consumed (optional)
   * @param adherenceScore - Logging adherence (0.0 to 1.0)
   */
  static async logDailyData(
    userId: string,
    date: string,
    weightLb?: number | null,
    intakeKcal?: number | null,
    adherenceScore?: number
  ): Promise<boolean> {

    try {
      // Upsert (insert or update)
      const { error } = await supabase
        .from('metabolic_tracking')
        .upsert({
          user_id: userId,
          date,
          weight_lb: weightLb,
          intake_kcal: intakeKcal,
          adherence_score: adherenceScore,
        }, {
          onConflict: 'user_id,date'
        });

      if (error) {
        console.error('[MetabolicAdaptationService] Log error:', error);
        return false;
      }

      return true;

    } catch (error) {
      console.error('[MetabolicAdaptationService] Failed to log daily data:', error);
      return false;
    }
  }

  /**
   * Get user's metabolic tracking summary (last 30 days)
   */
  static async getMetabolicSummary(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_metabolic_summary')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('[MetabolicAdaptationService] Summary error:', error);
        return null;
      }

      return data;

    } catch (error) {
      console.error('[MetabolicAdaptationService] Failed to get summary:', error);
      return null;
    }
  }

  /**
   * Get recent adaptations for user
   */
  static async getRecentAdaptations(userId: string, limit: number = 5) {
    try {
      const { data, error } = await supabase
        .from('metabolic_adaptations')
        .select('*')
        .eq('user_id', userId)
        .order('detected_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[MetabolicAdaptationService] Get adaptations error:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('[MetabolicAdaptationService] Failed to get adaptations:', error);
      return [];
    }
  }
}

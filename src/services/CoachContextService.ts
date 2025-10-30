/**
 * Coach Context Service
 * Generates personalized context for AI coaches based on user profile and progress
 * Now with deep personality integration for authentic, distinct coaching experiences
 */

import type { UserProfile } from '../types/profile';
import type { Goal, DietType, ActivityLevel } from '../utils/goalCalculations';
import { PrivacyComplianceService } from '../utils/privacyCompliance';
import { WellnessDataService } from '../utils/hipaaCompliance';
import { boundaryEnforcer } from '../utils/boundaryEnforcer';
import { terminologyMapper } from '../utils/wellnessTerminology';
import { getCoachPersonality } from '../data/coachPersonalities';

export interface CoachContext {
  // User goals and preferences
  userGoals: {
    primary_goal: Goal;
    daily_calories: number;
    macro_targets: MacroTargets;
    target_weight_kg?: number;
    diet_type: DietType;
    activity_level: ActivityLevel;
  };
  
  // Current progress data
  currentProgress: {
    calories_consumed: number;
    macros_consumed: MacroTargets;
    days_tracked: number;
    consistency_score: number;
    weight_change?: number;
  };
  
  // User preferences and constraints
  preferences: {
    diet_type: DietType;
    activity_level: ActivityLevel;
    units: 'imperial' | 'metric';
    age?: number;
    gender?: string;
  };
  
  // Dietary restrictions and considerations
  restrictions: string[];
  
  // Recent achievements and milestones
  achievements: Achievement[];
  
  // Areas needing attention
  challenges: Challenge[];
  
  // Contextual metadata
  metadata: {
    time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
    days_since_onboarding: number;
    last_meal_logged?: string;
    upcoming_goals?: string[];
  };
}

export interface MacroTargets {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface Achievement {
  type: 'consistency' | 'goal_reached' | 'milestone' | 'streak';
  description: string;
  date: string;
  value?: number;
}

export interface Challenge {
  type: 'low_protein' | 'high_calories' | 'inconsistent_logging' | 'missed_target';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface DailyStats {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  meal_count: number;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export class CoachContextService {
  /**
   * Generate comprehensive coach context from user data with wellness positioning
   */
  static generateContext(
    profile: UserProfile,
    dailyStats?: DailyStats,
    recentStats?: DailyStats[],
    weightData?: WeightEntry[]
  ): CoachContext {
    // WELLNESS DATA: Check for wellness preferences in profile data
    const wellnessCheck = WellnessDataService.containsWellnessData(profile);
    if (wellnessCheck.hasWellnessData) {
      console.log('Wellness preferences found:', wellnessCheck.wellnessFields);
      WellnessDataService.logWellnessDataAccess(
        profile.user_id, 
        'read', 
        'coaching_context_generation', 
        wellnessCheck.wellnessFields
      );
    }

    // Privacy compliance check
    if (!PrivacyComplianceService.canProcessData(profile.user_id, 'coach_context', 'coaching')) {
      throw new Error('User has not consented to coaching data processing');
    }

    // Use wellness-focused profile data
    const safeProfile = WellnessDataService.convertToWellnessData(profile);

    const context: CoachContext = {
      userGoals: this.extractUserGoals(safeProfile),
      currentProgress: this.calculateCurrentProgress(safeProfile, dailyStats, recentStats, weightData),
      preferences: this.extractPreferences(safeProfile),
      restrictions: this.identifyRestrictions(safeProfile),
      achievements: this.identifyAchievements(safeProfile, recentStats),
      challenges: this.identifyChallenges(safeProfile, dailyStats, recentStats),
      metadata: this.generateMetadata(safeProfile, dailyStats),
    };

    const sanitizedContext = this.validateAndSanitizeContext(context);
    
    // Wellness validation
    const hipaaValidation = PrivacyComplianceService.validateCoachingContext(sanitizedContext);
    if (!hipaaValidation.isValid) {
      const hipaaIssues = hipaaValidation.issues.filter(issue => issue.includes('HIPAA'));
      if (hipaaIssues.length > 0) {
        HIPAAComplianceService.reportHIPAAIncident({
          type: 'wellness_boundary_violation',
          description: 'Medical terminology found in coaching context',
          phiFields: phiCheck.phiFields,
          severity: 'high',
        });
        throw new Error('HIPAA violation: PHI detected in coaching context');
      }
      console.warn('Privacy validation issues:', hipaaValidation.issues);
    }

    return sanitizedContext;
  }

  /**
   * Extract user goals and targets
   */
  private static extractUserGoals(profile: UserProfile) {
    return {
      primary_goal: profile.primary_goal || 'get_healthy',
      daily_calories: profile.daily_calories || 2000,
      macro_targets: {
        protein_g: profile.daily_protein_g || 150,
        carbs_g: profile.daily_carbs_g || 250,
        fat_g: profile.daily_fat_g || 65,
        fiber_g: profile.daily_fiber_g || 25,
      },
      target_weight_kg: profile.target_weight_kg,
      diet_type: profile.diet_type || 'mindfork',
      activity_level: profile.activity_level || 'moderate',
    };
  }

  /**
   * Calculate current progress metrics
   */
  private static calculateCurrentProgress(
    profile: UserProfile,
    dailyStats?: DailyStats,
    recentStats?: DailyStats[],
    weightData?: WeightEntry[]
  ) {
    const daysTracked = recentStats?.length || 0;
    const consistencyScore = this.calculateConsistencyScore(recentStats);
    const weightChange = this.calculateWeightChange(weightData, profile.weight_kg);

    return {
      calories_consumed: dailyStats?.total_calories || 0,
      macros_consumed: {
        protein_g: dailyStats?.total_protein || 0,
        carbs_g: dailyStats?.total_carbs || 0,
        fat_g: dailyStats?.total_fat || 0,
        fiber_g: dailyStats?.total_fiber || 0,
      },
      days_tracked: daysTracked,
      consistency_score: consistencyScore,
      weight_change: weightChange,
    };
  }

  /**
   * Extract user preferences
   */
  private static extractPreferences(profile: UserProfile) {
    return {
      diet_type: profile.diet_type || 'mindfork',
      activity_level: profile.activity_level || 'moderate',
      units: (profile.weight_unit === 'lbs' ? 'imperial' : 'metric') as 'imperial' | 'metric',
      age: profile.age,
      gender: profile.gender,
    };
  }

  /**
   * Identify dietary restrictions based on diet type
   */
  private static identifyRestrictions(profile: UserProfile): string[] {
    const restrictions: string[] = [];
    
    switch (profile.diet_type) {
      case 'vegan':
        restrictions.push('no animal products', 'plant-based only');
        break;
      case 'vegetarian':
        restrictions.push('no meat', 'no fish');
        break;
      case 'keto':
        restrictions.push('very low carb', 'high fat', 'ketogenic');
        break;
      case 'paleo':
        restrictions.push('no grains', 'no legumes', 'no dairy', 'whole foods only');
        break;
      case 'mediterranean':
        restrictions.push('emphasis on olive oil', 'fish preferred', 'whole grains');
        break;
      case 'mindfork':
      default:
        // No specific restrictions for balanced approach
        break;
    }

    return restrictions;
  }

  /**
   * Identify recent achievements
   */
  private static identifyAchievements(
    profile: UserProfile,
    recentStats?: DailyStats[]
  ): Achievement[] {
    const achievements: Achievement[] = [];
    
    if (!recentStats || recentStats.length === 0) {
      return achievements;
    }

    // Check for consistency streaks
    const consistentDays = recentStats.filter(day => day.meal_count >= 2).length;
    if (consistentDays >= 7) {
      achievements.push({
        type: 'streak',
        description: `${consistentDays} days of consistent logging`,
        date: new Date().toISOString(),
        value: consistentDays,
      });
    }

    // Check for protein goals
    const proteinTarget = profile.daily_protein_g || 150;
    const proteinSuccessDays = recentStats.filter(day => 
      day.total_protein >= proteinTarget * 0.8
    ).length;
    
    if (proteinSuccessDays >= 5) {
      achievements.push({
        type: 'goal_reached',
        description: `Hit protein goals ${proteinSuccessDays} times this week`,
        date: new Date().toISOString(),
        value: proteinSuccessDays,
      });
    }

    // Check for calorie balance
    const calorieTarget = profile.daily_calories || 2000;
    const balancedDays = recentStats.filter(day => {
      const progress = (day.total_calories / calorieTarget) * 100;
      return progress >= 80 && progress <= 120;
    }).length;

    if (balancedDays >= 5) {
      achievements.push({
        type: 'milestone',
        description: `Maintained calorie balance for ${balancedDays} days`,
        date: new Date().toISOString(),
        value: balancedDays,
      });
    }

    return achievements;
  }

  /**
   * Identify current challenges and areas for improvement
   */
  private static identifyChallenges(
    profile: UserProfile,
    dailyStats?: DailyStats,
    recentStats?: DailyStats[]
  ): Challenge[] {
    const challenges: Challenge[] = [];
    
    if (!dailyStats) {
      challenges.push({
        type: 'inconsistent_logging',
        description: 'No meals logged today',
        severity: 'medium',
        suggestion: 'Start by logging your next meal to get back on track',
      });
      return challenges;
    }

    // Check protein intake
    const proteinTarget = profile.daily_protein_g || 150;
    const proteinProgress = (dailyStats.total_protein / proteinTarget) * 100;
    
    if (proteinProgress < 60) {
      challenges.push({
        type: 'low_protein',
        description: `Protein intake is ${Math.round(proteinProgress)}% of target`,
        severity: proteinProgress < 40 ? 'high' : 'medium',
        suggestion: 'Add lean protein sources like chicken, fish, or plant-based proteins',
      });
    }

    // Check calorie intake
    const calorieTarget = profile.daily_calories || 2000;
    const calorieProgress = (dailyStats.total_calories / calorieTarget) * 100;
    
    if (calorieProgress > 130) {
      challenges.push({
        type: 'high_calories',
        description: `Calories are ${Math.round(calorieProgress)}% of target`,
        severity: calorieProgress > 150 ? 'high' : 'medium',
        suggestion: 'Focus on portion control and nutrient-dense foods',
      });
    } else if (calorieProgress < 50) {
      challenges.push({
        type: 'missed_target',
        description: `Only ${Math.round(calorieProgress)}% of calorie target reached`,
        severity: 'medium',
        suggestion: 'Make sure you\'re eating enough to fuel your body properly',
      });
    }

    // Check consistency
    if (recentStats && recentStats.length >= 7) {
      const consistentDays = recentStats.filter(day => day.meal_count >= 2).length;
      const consistencyRate = (consistentDays / recentStats.length) * 100;
      
      if (consistencyRate < 70) {
        challenges.push({
          type: 'inconsistent_logging',
          description: `Only ${Math.round(consistencyRate)}% logging consistency this week`,
          severity: consistencyRate < 50 ? 'high' : 'medium',
          suggestion: 'Set daily reminders to log meals and build the habit',
        });
      }
    }

    return challenges;
  }

  /**
   * Generate contextual metadata
   */
  private static generateMetadata(profile: UserProfile, dailyStats?: DailyStats) {
    const now = new Date();
    const hour = now.getHours();
    
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else if (hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const onboardingDate = new Date(profile.created_at);
    const daysSinceOnboarding = Math.floor(
      (now.getTime() - onboardingDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const upcomingGoals: string[] = [];
    
    // Add goal-specific upcoming targets
    switch (profile.primary_goal) {
      case 'lose_weight':
        upcomingGoals.push('maintain calorie deficit', 'increase protein intake');
        break;
      case 'gain_muscle':
        upcomingGoals.push('hit protein targets', 'maintain calorie surplus');
        break;
      case 'maintain':
        upcomingGoals.push('balance macronutrients', 'consistent logging');
        break;
      case 'get_healthy':
        upcomingGoals.push('increase fiber intake', 'balanced nutrition');
        break;
    }

    return {
      time_of_day: timeOfDay,
      days_since_onboarding: daysSinceOnboarding,
      last_meal_logged: dailyStats?.meal_count ? 'today' : 'not today',
      upcoming_goals: upcomingGoals,
    };
  }

  /**
   * Calculate consistency score from recent stats
   */
  private static calculateConsistencyScore(recentStats?: DailyStats[]): number {
    if (!recentStats || recentStats.length === 0) return 0;
    
    const consistentDays = recentStats.filter(day => day.meal_count >= 2).length;
    return (consistentDays / recentStats.length) * 100;
  }

  /**
   * Calculate weight change from weight data
   */
  private static calculateWeightChange(
    weightData?: WeightEntry[],
    currentWeight?: number
  ): number | undefined {
    if (!weightData || weightData.length < 2 || !currentWeight) {
      return undefined;
    }

    const sortedData = weightData.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const startWeight = sortedData[0].weight;
    return currentWeight - startWeight;
  }

  /**
   * Validate and sanitize context for wellness positioning
   */
  private static validateAndSanitizeContext(context: CoachContext): CoachContext {
    // WELLNESS POSITIONING: Convert to wellness-focused language
    const sanitized = WellnessDataService.convertToWellnessData(context);
    
    // Ensure wellness terminology throughout
    const contextText = JSON.stringify(sanitized);
    const wellnessSafeText = boundaryEnforcer.makeWellnessSafe(contextText, 'coach_context');
    const wellnessSanitized = JSON.parse(wellnessSafeText);
    
    // Remove any remaining non-wellness fields
    delete (wellnessSanitized as any).health_conditions;
    delete (wellnessSanitized as any).medical_conditions;
    delete (wellnessSanitized as any).supplements;
    delete (wellnessSanitized as any).allergies;
    delete (wellnessSanitized as any).is_pregnant;
    
    // Remove potentially sensitive demographic data
    if (sanitized.preferences.age && (sanitized.preferences.age < 13 || sanitized.preferences.age > 120)) {
      delete sanitized.preferences.age;
    }
    
    // Remove exact gender for privacy - keep only for goal calculations if needed
    if (sanitized.preferences.gender) {
      // Only keep if essential for nutrition calculations, otherwise remove
      delete sanitized.preferences.gender;
    }

    // Validate and sanitize numeric values
    if (sanitized.userGoals.daily_calories < 800 || sanitized.userGoals.daily_calories > 5000) {
      sanitized.userGoals.daily_calories = 2000; // Safe default
    }

    // Remove any potential medical identifiers from achievements/challenges descriptions
    sanitized.achievements = sanitized.achievements.slice(0, 5).map(achievement => ({
      ...achievement,
      description: this.sanitizeMedicalDescription(achievement.description),
    }));
    
    sanitized.challenges = sanitized.challenges.slice(0, 3).map(challenge => ({
      ...challenge,
      description: this.sanitizeMedicalDescription(challenge.description),
      suggestion: this.sanitizeMedicalDescription(challenge.suggestion),
    }));
    
    // Filter out any medical-related dietary restrictions
    sanitized.restrictions = sanitized.restrictions
      .filter(restriction => !this.isMedicalRestriction(restriction))
      .slice(0, 5);

    // Remove any weight change data that could be sensitive
    if (sanitized.currentProgress.weight_change !== undefined) {
      // Only include general progress direction, not exact numbers
      const weightChange = sanitized.currentProgress.weight_change;
      if (Math.abs(weightChange) < 0.5) {
        sanitized.currentProgress.weight_change = undefined; // Minimal change
      } else {
        // Generalize to direction only
        sanitized.currentProgress.weight_change = weightChange > 0 ? 1 : -1;
      }
    }

    return sanitized;
  }

  /**
   * Check if a food preference needs wellness language conversion
   */
  private static needsWellnessConversion(preference: string): boolean {
    return terminologyMapper.containsMedicalTerms(preference);
  }

  /**
   * Convert food preference to wellness language
   */
  private static convertToWellnessPreference(preference: string): string {
    return terminologyMapper.convertToWellness(preference);
  }

  /**
   * Sanitize text descriptions to remove medical and personal identifiers
   */
  private static sanitizeMedicalDescription(description: string): string {
    // Remove medical terms and conditions
    let sanitized = description
      .replace(/\b(diabetes|diabetic|insulin|blood sugar|glucose)\b/gi, 'dietary needs')
      .replace(/\b(hypertension|blood pressure|cardiac|heart condition)\b/gi, 'health considerations')
      .replace(/\b(medication|prescription|pills?|drugs?)\b/gi, 'wellness support')
      .replace(/\b(allergy|allergic|intolerance)\b/gi, 'food preference')
      .replace(/\b(doctor|physician|medical|condition|disorder|disease)\b/gi, 'wellness professional')
      .replace(/\b\d{1,3}\.\d+\b/g, 'X.X') // Replace specific decimal numbers
      .replace(/\b\d+\s*(lbs?|kg|pounds?)\b/gi, 'X weight units') // Replace specific weights
      .replace(/\b\d+\s*days?\b/gi, 'several days') // Generalize day counts
      .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, 'recently'); // Remove specific days
    
    return sanitized;
  }

  /**
   * Sanitize text descriptions to remove potential personal identifiers
   */
  private static sanitizeDescription(description: string): string {
    // Remove any potential personal identifiers while keeping the core message
    return description
      .replace(/\b\d{1,3}\.\d+\b/g, 'X.X') // Replace specific decimal numbers
      .replace(/\b\d+\s*(lbs?|kg|pounds?)\b/gi, 'X weight units') // Replace specific weights
      .replace(/\b\d+\s*days?\b/gi, 'several days') // Generalize day counts
      .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, 'recently'); // Remove specific days
  }

  /**
   * Generate coach-specific context prompt with deep personality integration
   * Each coach now has a rich, distinct personality that shapes their responses
   */
  static generateCoachPrompt(
    context: CoachContext,
    coachIdOrPersonality: string,
    userMessage: string
  ): string {
    // Get deep personality profile for this coach
    const personality = getCoachPersonality(coachIdOrPersonality);

    if (!personality) {
      // Fallback to generic coaching if personality not found
      return this.generateGenericPrompt(context, coachIdOrPersonality, userMessage);
    }

    // PRIVACY NOTICE: This prompt contains only nutrition/fitness data, no medical information
    const prompt = `
${personality.corePersonality}

YOUR COMMUNICATION STYLE:
${personality.communicationStyle}

YOUR COACHING METHODOLOGY:
${personality.coachingMethodology}

YOUR SPECIALIZED KNOWLEDGE:
${personality.specializedKnowledge}

YOUR RESPONSE STRUCTURE:
${personality.responseStructure}

VOCABULARY PATTERNS YOU USE:
${personality.vocabularyPatterns.slice(0, 6).join(', ')}

YOUR MOTIVATIONAL APPROACH:
${personality.motivationalApproach}

TONE AND VOICE:
${personality.toneAndVoice}

---

USER'S CONTEXT:

GOALS:
- Primary goal: ${context.userGoals.primary_goal}
- Daily calories: ${context.userGoals.daily_calories} kcal
- Protein target: ${context.userGoals.macro_targets.protein_g}g
- Diet type: ${context.userGoals.diet_type}
- Activity level: ${context.userGoals.activity_level}

TODAY'S PROGRESS:
- Calories: ${context.currentProgress.calories_consumed}/${context.userGoals.daily_calories} (${Math.round((context.currentProgress.calories_consumed / context.userGoals.daily_calories) * 100)}%)
- Protein: ${context.currentProgress.macros_consumed.protein_g}g/${context.userGoals.macro_targets.protein_g}g
- Consistency score: ${Math.round(context.currentProgress.consistency_score)}%
- Days tracked: ${context.currentProgress.days_tracked}

RECENT ACHIEVEMENTS:
${context.achievements.length > 0 ? context.achievements.map(a => `- ${a.description}`).join('\n') : '- None yet (this is an opportunity to encourage!)'}

CURRENT CHALLENGES:
${context.challenges.length > 0 ? context.challenges.map(c => `- ${c.description}`).join('\n') : '- No challenges identified'}

DIETARY RESTRICTIONS:
${context.restrictions.length > 0 ? context.restrictions.join(', ') : 'None'}

TIME CONTEXT: ${context.metadata.time_of_day}, ${context.metadata.days_since_onboarding} days since starting

---

USER'S MESSAGE: "${userMessage}"

---

IMPORTANT GUIDELINES:
- Stay true to your unique personality and coaching style (as ${personality.name})
- Use your signature vocabulary patterns naturally
- Apply your specific coaching methodology to this situation
- Draw on your specialized knowledge when relevant
- Provide wellness and nutrition guidance only (not medical advice)
- Keep response under 200 words but make every word count
- End in a way consistent with your personality (check your example closers)
- Encourage consulting healthcare professionals for medical concerns

Remember: You are ${personality.name}, and your distinct voice is what makes you valuable. Don't be generic - be authentically YOU.
    `.trim();

    return prompt;
  }

  /**
   * Fallback generic prompt if personality not found
   */
  private static generateGenericPrompt(
    context: CoachContext,
    coachId: string,
    userMessage: string
  ): string {
    const prompt = `
You are a supportive nutrition coach providing wellness guidance.

GOALS:
- Primary goal: ${context.userGoals.primary_goal}
- Daily calories: ${context.userGoals.daily_calories}
- Diet type: ${context.userGoals.diet_type}
- Activity level: ${context.userGoals.activity_level}

TODAY'S PROGRESS:
- Calories consumed: ${context.currentProgress.calories_consumed}/${context.userGoals.daily_calories}
- Protein: ${context.currentProgress.macros_consumed.protein_g}g/${context.userGoals.macro_targets.protein_g}g
- Consistency score: ${Math.round(context.currentProgress.consistency_score)}%

RECENT ACHIEVEMENTS:
${context.achievements.map(a => `- ${a.description}`).join('\n') || '- None yet'}

CURRENT CHALLENGES:
${context.challenges.map(c => `- ${c.description}`).join('\n') || '- None identified'}

DIETARY RESTRICTIONS:
${context.restrictions.join(', ') || 'None'}

TIME CONTEXT: ${context.metadata.time_of_day}, ${context.metadata.days_since_onboarding} days since starting

User message: "${userMessage}"

RESPONSE GUIDELINES:
- Provide wellness and nutrition guidance only
- Focus on lifestyle support and fitness goals
- Keep response under 150 words
- Be encouraging and reference their progress when relevant
- Encourage consulting healthcare providers for medical concerns
    `.trim();

    return prompt;
  }
}

export default CoachContextService;
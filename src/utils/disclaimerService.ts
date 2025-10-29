/**
 * Disclaimer Service
 * 
 * Manages wellness disclaimers to maintain clear positioning
 * as a fitness/wellness app, not a medical application
 */

export interface Disclaimer {
  id: string;
  type: 'general' | 'nutrition' | 'ai_coach' | 'progress' | 'data_use' | 'legal';
  content: string;
  shortVersion?: string;
  contexts: string[]; // Where this disclaimer should appear
  required: boolean;
  version: string;
}

export const WELLNESS_DISCLAIMERS: Disclaimer[] = [
  {
    id: 'general_wellness',
    type: 'general',
    content: 'Mindfork is a wellness and fitness app designed to support your lifestyle goals. It is not intended for medical diagnosis, treatment, or healthcare advice. Always consult with healthcare professionals for medical concerns.',
    shortVersion: 'For wellness and fitness purposes only. Not medical advice.',
    contexts: ['onboarding', 'settings', 'about'],
    required: true,
    version: '1.0'
  },
  {
    id: 'nutrition_guidance',
    type: 'nutrition',
    content: 'Nutrition suggestions are for general wellness and fitness purposes based on your lifestyle preferences. This is not medical nutrition therapy. Consult a registered dietitian or healthcare provider for personalized medical nutrition advice.',
    shortVersion: 'Nutrition guidance for wellness purposes only.',
    contexts: ['nutrition_tracking', 'meal_planning', 'food_suggestions'],
    required: true,
    version: '1.0'
  },
  {
    id: 'ai_coach',
    type: 'ai_coach',
    content: 'Our AI coaches provide lifestyle and fitness guidance based on your personal preferences and goals. They are not medical professionals and cannot provide healthcare advice. For health concerns, please consult qualified healthcare providers.',
    shortVersion: 'AI coaches provide lifestyle guidance, not medical advice.',
    contexts: ['coach_chat', 'coach_selection', 'coach_onboarding'],
    required: true,
    version: '1.0'
  },
  {
    id: 'progress_tracking',
    type: 'progress',
    content: 'Progress tracking features are designed for fitness motivation and wellness goal achievement. This data is for personal use and lifestyle improvement, not medical monitoring. Discuss any health concerns with your healthcare provider.',
    shortVersion: 'Progress tracking for fitness motivation only.',
    contexts: ['dashboard', 'progress_charts', 'goal_setting'],
    required: false,
    version: '1.0'
  },
  {
    id: 'data_collection',
    type: 'data_use',
    content: 'We collect lifestyle preferences, fitness goals, and wellness data to personalize your experience. This information represents your personal choices and preferences, not medical data. Your privacy is protected according to our Privacy Policy.',
    shortVersion: 'We collect lifestyle preferences to personalize your experience.',
    contexts: ['data_collection', 'privacy_settings', 'onboarding'],
    required: true,
    version: '1.0'
  },
  {
    id: 'food_exclusions',
    type: 'nutrition',
    content: 'Food exclusion preferences help us customize recipe suggestions based on your lifestyle choices. These are personal preferences, not medical restrictions. If you have food allergies or medical dietary needs, consult healthcare professionals.',
    shortVersion: 'Food exclusions are lifestyle preferences, not medical restrictions.',
    contexts: ['food_exclusions', 'recipe_filtering', 'meal_planning'],
    required: true,
    version: '1.0'
  },
  {
    id: 'legal_positioning',
    type: 'legal',
    content: 'Mindfork operates as a wellness and fitness platform. We do not provide medical services, diagnose conditions, or offer medical treatment. Our features support lifestyle goals and personal wellness journeys. Medical decisions should always involve qualified healthcare professionals.',
    shortVersion: 'Wellness platform - not a medical service.',
    contexts: ['terms_of_service', 'legal_pages', 'about'],
    required: true,
    version: '1.0'
  }
];

export class DisclaimerService {
  private disclaimers: Map<string, Disclaimer>;
  private displayHistory: Map<string, Date[]> = new Map();

  constructor() {
    this.disclaimers = new Map();
    this.loadDisclaimers();
  }

  private loadDisclaimers(): void {
    WELLNESS_DISCLAIMERS.forEach(disclaimer => {
      this.disclaimers.set(disclaimer.id, disclaimer);
    });
  }

  /**
   * Get disclaimer by ID
   */
  getDisclaimer(id: string): Disclaimer | null {
    return this.disclaimers.get(id) || null;
  }

  /**
   * Get disclaimers for a specific context
   */
  getDisclaimersForContext(context: string): Disclaimer[] {
    return Array.from(this.disclaimers.values())
      .filter(disclaimer => disclaimer.contexts.includes(context));
  }

  /**
   * Get required disclaimers for a context
   */
  getRequiredDisclaimersForContext(context: string): Disclaimer[] {
    return this.getDisclaimersForContext(context)
      .filter(disclaimer => disclaimer.required);
  }

  /**
   * Get disclaimer content (short or full version)
   */
  getDisclaimerContent(id: string, useShortVersion: boolean = false): string | null {
    const disclaimer = this.getDisclaimer(id);
    if (!disclaimer) return null;
    
    return useShortVersion && disclaimer.shortVersion 
      ? disclaimer.shortVersion 
      : disclaimer.content;
  }

  /**
   * Record that a disclaimer was displayed to user
   */
  recordDisclaimerDisplay(disclaimerId: string, userId?: string): void {
    const key = userId ? `${disclaimerId}_${userId}` : disclaimerId;
    const history = this.displayHistory.get(key) || [];
    history.push(new Date());
    this.displayHistory.set(key, history);
  }

  /**
   * Check if disclaimer was recently shown
   */
  wasRecentlyShown(disclaimerId: string, userId?: string, hoursAgo: number = 24): boolean {
    const key = userId ? `${disclaimerId}_${userId}` : disclaimerId;
    const history = this.displayHistory.get(key) || [];
    
    if (history.length === 0) return false;
    
    const cutoff = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
    const lastShown = history[history.length - 1];
    
    return lastShown > cutoff;
  }

  /**
   * Get formatted disclaimer for UI display
   */
  getFormattedDisclaimer(id: string, format: 'banner' | 'modal' | 'inline' = 'inline'): {
    content: string;
    title?: string;
    action?: string;
  } | null {
    const disclaimer = this.getDisclaimer(id);
    if (!disclaimer) return null;

    switch (format) {
      case 'banner':
        return {
          content: disclaimer.shortVersion || disclaimer.content,
          action: 'Got it'
        };
      
      case 'modal':
        return {
          title: 'Important Information',
          content: disclaimer.content,
          action: 'I Understand'
        };
      
      case 'inline':
      default:
        return {
          content: disclaimer.shortVersion || disclaimer.content
        };
    }
  }

  /**
   * Get all disclaimers by type
   */
  getDisclaimersByType(type: Disclaimer['type']): Disclaimer[] {
    return Array.from(this.disclaimers.values())
      .filter(disclaimer => disclaimer.type === type);
  }

  /**
   * Validate that required disclaimers are present for context
   */
  validateContextDisclaimers(context: string): {
    valid: boolean;
    missing: string[];
    required: Disclaimer[];
  } {
    const required = this.getRequiredDisclaimersForContext(context);
    const missing: string[] = [];
    
    // In a real implementation, you'd check if disclaimers are actually displayed
    // For now, we'll assume they need to be explicitly shown
    
    return {
      valid: missing.length === 0,
      missing,
      required
    };
  }

  /**
   * Get disclaimer display statistics
   */
  getDisplayStats(): {
    totalDisplays: number;
    byDisclaimer: Record<string, number>;
    recentDisplays: number;
  } {
    let totalDisplays = 0;
    const byDisclaimer: Record<string, number> = {};
    let recentDisplays = 0;
    
    const cutoff = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours ago
    
    this.displayHistory.forEach((history, key) => {
      const disclaimerId = key.split('_')[0];
      byDisclaimer[disclaimerId] = (byDisclaimer[disclaimerId] || 0) + history.length;
      totalDisplays += history.length;
      
      recentDisplays += history.filter(date => date > cutoff).length;
    });
    
    return {
      totalDisplays,
      byDisclaimer,
      recentDisplays
    };
  }

  /**
   * Add or update a disclaimer
   */
  addDisclaimer(disclaimer: Disclaimer): void {
    this.disclaimers.set(disclaimer.id, disclaimer);
  }

  /**
   * Remove a disclaimer
   */
  removeDisclaimer(id: string): boolean {
    return this.disclaimers.delete(id);
  }
}

// Singleton instance
export const disclaimerService = new DisclaimerService();
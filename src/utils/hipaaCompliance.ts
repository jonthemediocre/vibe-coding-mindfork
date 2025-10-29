/**
 * Wellness Data Utilities
 * Handles lifestyle preferences and wellness data (no medical information)
 */

import { boundaryEnforcer } from './boundaryEnforcer';
import { terminologyMapper } from './wellnessTerminology';

export interface WellnessConfig {
  enableWellnessLogging: boolean;
  validateTerminology: boolean;
  enforceWellnessBoundaries: boolean;
  requireDisclaimers: boolean;
}

export const WELLNESS_CONFIG: WellnessConfig = {
  enableWellnessLogging: true,
  validateTerminology: true,
  enforceWellnessBoundaries: true,
  requireDisclaimers: true,
};

export class WellnessDataService {
  /**
   * Check if data contains wellness preferences and lifestyle information
   */
  static containsWellnessData(data: any): { hasWellnessData: boolean; wellnessFields: string[] } {
    const wellnessFields: string[] = [];
    
    if (!data || typeof data !== 'object') {
      return { hasWellnessData: false, wellnessFields: [] };
    }

    // Wellness and lifestyle preference fields
    const wellnessDataFields = [
      'fitness_goals',
      'lifestyle_preferences', 
      'food_exclusions',
      'dietary_preferences',
      'activity_level',
      'wellness_goals',
      'energy_targets',
      'eating_style',
      'preferred_foods',
      'workout_preferences'
    ];

    // Check for wellness fields
    for (const field of wellnessDataFields) {
      if (data[field] || (data.preferences && data.preferences[field])) {
        wellnessFields.push(field);
      }
    }

    // Check nested objects
    for (const key in data) {
      if (typeof data[key] === 'object' && data[key] !== null) {
        const nested = this.containsWellnessData(data[key]);
        if (nested.hasWellnessData) {
          wellnessFields.push(...nested.wellnessFields.map(f => `${key}.${f}`));
        }
      }
    }

    return {
      hasWellnessData: wellnessFields.length > 0,
      wellnessFields,
    };
  }

  /**
   * Convert any medical terminology to wellness language
   */
  static convertToWellnessData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const converted = { ...data };

    // Convert field names from medical to wellness terminology
    const fieldMappings: Record<string, string> = {
      'health_conditions': 'lifestyle_preferences',
      'medical_conditions': 'wellness_considerations',
      'allergies': 'food_exclusions',
      'dietary_restrictions': 'food_preferences',
      'medical_goals': 'wellness_goals',
      'health_goals': 'fitness_goals'
    };

    // Rename fields
    for (const [oldField, newField] of Object.entries(fieldMappings)) {
      if (converted[oldField]) {
        converted[newField] = converted[oldField];
        delete converted[oldField];
      }
    }

    // Convert text content using terminology mapper
    for (const key in converted) {
      if (typeof converted[key] === 'string') {
        converted[key] = terminologyMapper.convertToWellness(converted[key]);
      } else if (typeof converted[key] === 'object' && converted[key] !== null) {
        converted[key] = this.convertToWellnessData(converted[key]);
      }
    }

    return converted;
  }

  /**
   * Log wellness data access for privacy tracking
   */
  static logWellnessDataAccess(
    userId: string,
    operation: 'read' | 'write' | 'delete' | 'export',
    purpose: string,
    wellnessFields: string[]
  ): void {
    if (!WELLNESS_CONFIG.enableWellnessLogging) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      operation,
      purpose,
      wellnessFields,
      source: 'mindfork_mobile_app',
      dataType: 'wellness_preferences'
    };

    // Standard privacy logging (not HIPAA audit trail)
    console.log('[WELLNESS DATA ACCESS]', JSON.stringify(logEntry));
  }

  /**
   * Validate data for wellness positioning before external services
   */
  static validateForExternalService(
    data: any, 
    serviceName: string
  ): { canSend: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for medical terminology that could trigger HIPAA concerns
    if (WELLNESS_CONFIG.validateTerminology) {
      try {
        boundaryEnforcer.validateContent(JSON.stringify(data), `external_service_${serviceName}`);
      } catch (error) {
        if (error instanceof Error) {
          issues.push(`Wellness boundary violation: ${error.message}`);
        }
      }
    }

    // Convert any remaining medical terms to wellness language
    const convertedData = this.convertToWellnessData(data);
    
    // Log wellness data sharing
    const wellnessCheck = this.containsWellnessData(convertedData);
    if (wellnessCheck.hasWellnessData) {
      this.logWellnessDataAccess('system', 'write', `external_service_${serviceName}`, wellnessCheck.wellnessFields);
    }

    return {
      canSend: issues.length === 0,
      issues,
    };
  }

  /**
   * Generate wellness-focused coaching context
   */
  static createWellnessCoachingContext(userProfile: any): any {
    // Convert to wellness terminology
    const wellnessProfile = this.convertToWellnessData(userProfile);
    
    // Create wellness-focused context
    const wellnessContext = {
      fitnessGoals: {
        primary_goal: wellnessProfile.primary_goal || 'improve_energy',
        daily_energy_target: wellnessProfile.daily_calories,
        eating_style: wellnessProfile.diet_type || 'balanced_variety',
        activity_level: wellnessProfile.activity_level || 'moderate',
      },
      preferences: {
        units: wellnessProfile.weight_unit === 'lbs' ? 'imperial' : 'metric',
        food_exclusions: wellnessProfile.food_exclusions || [],
        preferred_foods: wellnessProfile.preferred_foods || [],
      },
      lifestyle: this.getWellnessLifestyleInfo(wellnessProfile.eating_style),
      disclaimer: 'This is lifestyle and wellness guidance only. Consult healthcare professionals for medical advice.',
    };

    return wellnessContext;
  }

  /**
   * Get wellness lifestyle information based on eating style
   */
  private static getWellnessLifestyleInfo(eatingStyle: string): string[] {
    const lifestyleInfo: Record<string, string[]> = {
      'plant_focused': ['emphasizes plants', 'includes variety of vegetables and fruits'],
      'protein_rich': ['focuses on protein sources', 'supports active lifestyle'],
      'balanced_variety': ['includes all food groups', 'emphasizes moderation'],
      'low_carb_lifestyle': ['reduces refined carbs', 'focuses on whole foods'],
      'mediterranean_style': ['emphasizes olive oil and fish', 'includes whole grains'],
      'flexible': [], // No specific restrictions
    };
    
    return lifestyleInfo[eatingStyle] || [];
  }

  /**
   * Report wellness boundary violations
   */
  static reportWellnessBoundaryViolation(
    violation: {
      type: 'medical_terminology' | 'boundary_violation' | 'content_issue';
      description: string;
      content: string;
      medicalTerms?: string[];
      severity: 'low' | 'medium' | 'high';
    }
  ): void {
    const report = {
      timestamp: new Date().toISOString(),
      violationId: `WELLNESS-${Date.now()}`,
      ...violation,
      status: 'reported',
      requiresReview: violation.severity === 'high',
    };

    // Log wellness boundary violation
    console.warn('[WELLNESS BOUNDARY VIOLATION]', JSON.stringify(report));
    
    if (report.requiresReview) {
      console.warn('ATTENTION: Wellness boundary violation requires content review');
    }
  }
}

export default WellnessDataService;
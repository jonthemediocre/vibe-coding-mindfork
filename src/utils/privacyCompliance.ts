/**
 * Privacy Compliance Utilities
 * Ensures user data handling meets privacy standards
 */

export interface PrivacyConfig {
  logDataAccess: boolean;
  requireExplicitConsent: boolean;
  dataRetentionDays: number;
  allowDataExport: boolean;
}

export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  logDataAccess: true,
  requireExplicitConsent: true,
  dataRetentionDays: 365, // 1 year default
  allowDataExport: true,
};

export class PrivacyComplianceService {
  /**
   * Log data access for audit trail
   */
  static logDataAccess(
    userId: string,
    dataType: 'profile' | 'nutrition' | 'coach_context' | 'messages',
    operation: 'read' | 'write' | 'delete',
    purpose: string
  ): void {
    if (!DEFAULT_PRIVACY_CONFIG.logDataAccess) return;

    // In production, this would go to a secure audit log
    console.log(`[PRIVACY AUDIT] ${new Date().toISOString()} - User: ${userId}, Data: ${dataType}, Op: ${operation}, Purpose: ${purpose}`);
  }

  /**
   * Check if data can be processed based on consent
   */
  static canProcessData(
    userId: string,
    dataType: 'profile' | 'nutrition' | 'coach_context',
    purpose: 'coaching' | 'analytics' | 'recommendations'
  ): boolean {
    // In production, this would check actual consent records
    // For now, assume consent is given for core app functionality
    
    this.logDataAccess(userId, dataType, 'read', purpose);
    
    return true; // Simplified for development
  }

  /**
   * Sanitize data for external processing (AI services)
   */
  static sanitizeForExternalProcessing(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };

    // Remove direct identifiers
    delete sanitized.id;
    delete sanitized.user_id;
    delete sanitized.email;
    delete sanitized.phone_number;
    delete sanitized.created_at;
    delete sanitized.updated_at;

    // Generalize sensitive numeric data
    if (sanitized.age) {
      sanitized.age_range = this.getAgeRange(sanitized.age);
      delete sanitized.age;
    }

    if (sanitized.weight_kg) {
      sanitized.weight_category = this.getWeightCategory(sanitized.weight_kg, sanitized.height_cm);
      delete sanitized.weight_kg;
    }

    if (sanitized.height_cm) {
      delete sanitized.height_cm; // Not needed for coaching context
    }

    return sanitized;
  }

  /**
   * Get generalized age range instead of exact age
   */
  private static getAgeRange(age: number): string {
    if (age < 18) return 'under_18';
    if (age < 25) return '18_24';
    if (age < 35) return '25_34';
    if (age < 45) return '35_44';
    if (age < 55) return '45_54';
    if (age < 65) return '55_64';
    return '65_plus';
  }

  /**
   * Get generalized weight category instead of exact weight
   */
  private static getWeightCategory(weightKg: number, heightCm?: number): string {
    if (!heightCm) return 'weight_provided';

    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal_weight';
    if (bmi < 30) return 'overweight';
    return 'obese';
  }

  /**
   * Check if user has right to data deletion
   */
  static canDeleteUserData(userId: string): boolean {
    // Users always have right to delete their data
    this.logDataAccess(userId, 'profile', 'delete', 'user_request');
    return true;
  }

  /**
   * Generate privacy-compliant data export
   */
  static generateDataExport(userId: string, userData: any): any {
    if (!DEFAULT_PRIVACY_CONFIG.allowDataExport) {
      throw new Error('Data export not allowed by privacy configuration');
    }

    this.logDataAccess(userId, 'profile', 'read', 'data_export');

    return {
      exportDate: new Date().toISOString(),
      userId: userId,
      data: userData,
      privacyNotice: 'This export contains your personal data. Handle securely and delete when no longer needed.',
    };
  }

  /**
   * Validate that coaching context meets HIPAA privacy standards
   */
  static validateCoachingContext(context: any): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for direct identifiers
    if (context.id || context.user_id) {
      issues.push('HIPAA VIOLATION: Context contains direct user identifiers');
    }

    // Check for overly specific personal data
    if (context.preferences?.age && (context.preferences.age < 13 || context.preferences.age > 120)) {
      issues.push('Age data is outside acceptable range');
    }

    // CRITICAL: Check for Protected Health Information (PHI)
    const phiFields = [
      'health_conditions', 'medical_conditions', 'medications', 
      'allergies', 'is_pregnant', 'diagnosis', 'treatment'
    ];
    
    for (const field of phiFields) {
      if (context[field] || (context.preferences && context.preferences[field])) {
        issues.push(`HIPAA VIOLATION: Context contains PHI field: ${field}`);
      }
    }

    // Check for medical information in text fields
    const medicalTerms = [
      'diabetes', 'diabetic', 'insulin', 'blood sugar', 'glucose',
      'hypertension', 'blood pressure', 'medication', 'prescription',
      'diagnosis', 'condition', 'disease', 'treatment', 'allergy',
      'allergic', 'doctor', 'physician', 'medical', 'hospital'
    ];
    
    const contextString = JSON.stringify(context).toLowerCase();
    
    for (const term of medicalTerms) {
      if (contextString.includes(term)) {
        issues.push(`POTENTIAL HIPAA VIOLATION: Context may contain medical information: ${term}`);
      }
    }

    // Check for specific medical conditions that might slip through
    const specificConditions = [
      'type 1', 'type 2', 'hypertension', 'cardiac', 'renal', 'hepatic'
    ];
    
    for (const condition of specificConditions) {
      if (contextString.includes(condition)) {
        issues.push(`HIPAA VIOLATION: Context contains specific medical condition: ${condition}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Report a privacy incident for logging and monitoring
   * Used when potential privacy violations are detected
   */
  static reportPrivacyIncident(incident: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    context?: any;
  }): void {
    // In production, this would:
    // 1. Log to secure audit trail
    // 2. Alert privacy/security team if severity is high/critical
    // 3. Create incident ticket for review
    // 4. Potentially pause processing until reviewed

    const timestamp = new Date().toISOString();
    const logMessage = `[PRIVACY INCIDENT] ${timestamp} - Type: ${incident.type}, Severity: ${incident.severity}, Description: ${incident.description}`;

    if (incident.severity === 'critical' || incident.severity === 'high') {
      console.error(logMessage);
    } else {
      console.warn(logMessage);
    }

    // Log data access for audit trail
    if (incident.userId) {
      this.logDataAccess(
        incident.userId,
        'coach_context',
        'read',
        `privacy_incident_${incident.type}`
      );
    }
  }
}

/**
 * Privacy-compliant logging decorator
 */
export function withPrivacyLogging(
  dataType: 'profile' | 'nutrition' | 'coach_context' | 'messages',
  operation: 'read' | 'write' | 'delete'
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const userId = args[0]; // Assume first arg is userId
      PrivacyComplianceService.logDataAccess(userId, dataType, operation, `${target.constructor.name}.${propertyName}`);
      return method.apply(this, args);
    };
  };
}

export default PrivacyComplianceService;
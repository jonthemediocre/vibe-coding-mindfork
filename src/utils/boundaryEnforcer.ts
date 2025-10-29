/**
 * Boundary Enforcement System
 * 
 * Prevents medical terminology and advice from appearing in the app
 * Maintains wellness/fitness positioning to avoid HIPAA compliance
 */

import { terminologyMapper } from './wellnessTerminology';

export class WellnessBoundaryError extends Error {
  public attemptedContent: string;
  public foundMedicalTerms: string[];

  constructor(message: string, attemptedContent: string, foundTerms: string[]) {
    super(message);
    this.name = 'WellnessBoundaryError';
    this.attemptedContent = attemptedContent;
    this.foundMedicalTerms = foundTerms;
  }
}

export interface BoundaryViolation {
  content: string;
  medicalTerms: string[];
  timestamp: Date;
  source: string;
  severity: 'low' | 'medium' | 'high';
}

export class BoundaryEnforcer {
  private prohibitedMedicalTerms: string[] = [
    // Medical advice terms
    'diagnose', 'diagnosis', 'diagnostic',
    'treat', 'treatment', 'therapy', 'therapeutic',
    'cure', 'heal', 'medicine', 'medication',
    'prescribe', 'prescription', 'clinical',
    'medical advice', 'health advice',
    'consult a doctor', 'see a physician',
    
    // Medical conditions (high severity)
    'disease', 'illness', 'disorder', 'syndrome',
    'pathology', 'pathological', 'abnormal',
    'medical condition', 'health condition',
    
    // Medical procedures
    'surgery', 'surgical', 'procedure', 'operation',
    'examination', 'test results', 'lab results',
    'biopsy', 'scan', 'x-ray', 'mri',
    
    // Medical professionals
    'doctor', 'physician', 'nurse', 'therapist',
    'medical professional', 'healthcare provider',
    'specialist', 'practitioner'
  ];

  private medicalContextPhrases: string[] = [
    'for your health condition',
    'to treat your',
    'medical reasons',
    'health reasons',
    'doctor says',
    'medical advice',
    'health advice',
    'medical recommendation',
    'health recommendation'
  ];

  private violations: BoundaryViolation[] = [];

  /**
   * Validate content for medical terminology and boundary violations
   */
  validateContent(content: string, source: string = 'unknown'): void {
    const medicalTerms = this.findProhibitedTerms(content);
    
    if (medicalTerms.length > 0) {
      const violation: BoundaryViolation = {
        content,
        medicalTerms,
        timestamp: new Date(),
        source,
        severity: this.calculateSeverity(medicalTerms)
      };
      
      this.violations.push(violation);
      
      throw new WellnessBoundaryError(
        `Content contains prohibited medical terminology: ${medicalTerms.join(', ')}`,
        content,
        medicalTerms
      );
    }
  }

  /**
   * Sanitize user input by converting medical terms to wellness language
   */
  sanitizeUserInput(input: string): string {
    let sanitized = terminologyMapper.convertToWellness(input);
    
    // Additional sanitization for context phrases
    this.medicalContextPhrases.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      sanitized = sanitized.replace(regex, this.getWellnessContextReplacement(phrase));
    });
    
    return sanitized;
  }

  /**
   * Check if content is safe for wellness positioning
   */
  isWellnessSafe(content: string): boolean {
    try {
      this.validateContent(content);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get wellness-safe version of content
   */
  makeWellnessSafe(content: string, source: string = 'content'): string {
    try {
      this.validateContent(content, source);
      return content; // Already safe
    } catch (error) {
      // Convert to wellness language
      return this.sanitizeUserInput(content);
    }
  }

  /**
   * Find prohibited medical terms in content
   */
  private findProhibitedTerms(content: string): string[] {
    const found: string[] = [];
    const lowerContent = content.toLowerCase();
    
    this.prohibitedMedicalTerms.forEach(term => {
      if (lowerContent.includes(term.toLowerCase())) {
        found.push(term);
      }
    });
    
    // Also check for terms from terminology mapper
    const mapperTerms = terminologyMapper.findMedicalTerms(content);
    found.push(...mapperTerms);
    
    return [...new Set(found)]; // Remove duplicates
  }

  /**
   * Calculate severity of boundary violation
   */
  private calculateSeverity(medicalTerms: string[]): 'low' | 'medium' | 'high' {
    const highSeverityTerms = ['diagnose', 'treat', 'cure', 'disease', 'illness', 'medical advice'];
    const mediumSeverityTerms = ['doctor', 'health condition', 'medical condition', 'therapy'];
    
    if (medicalTerms.some(term => highSeverityTerms.includes(term.toLowerCase()))) {
      return 'high';
    }
    
    if (medicalTerms.some(term => mediumSeverityTerms.includes(term.toLowerCase()))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Get wellness replacement for medical context phrases
   */
  private getWellnessContextReplacement(phrase: string): string {
    const replacements: Record<string, string> = {
      'for your health condition': 'for your wellness goals',
      'to treat your': 'to support your',
      'medical reasons': 'lifestyle preferences',
      'health reasons': 'wellness goals',
      'doctor says': 'wellness experts suggest',
      'medical advice': 'lifestyle guidance',
      'health advice': 'wellness tips',
      'medical recommendation': 'wellness suggestion',
      'health recommendation': 'fitness guidance'
    };
    
    return replacements[phrase.toLowerCase()] || phrase;
  }

  /**
   * Get recent boundary violations
   */
  getRecentViolations(hours: number = 24): BoundaryViolation[] {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.violations.filter(v => v.timestamp > cutoff);
  }

  /**
   * Get violation statistics
   */
  getViolationStats(): {
    total: number;
    bySource: Record<string, number>;
    bySeverity: Record<string, number>;
    recentCount: number;
  } {
    const bySource: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    
    this.violations.forEach(v => {
      bySource[v.source] = (bySource[v.source] || 0) + 1;
      bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
    });
    
    return {
      total: this.violations.length,
      bySource,
      bySeverity,
      recentCount: this.getRecentViolations().length
    };
  }

  /**
   * Clear violation history
   */
  clearViolations(): void {
    this.violations = [];
  }
}

// Singleton instance
export const boundaryEnforcer = new BoundaryEnforcer();
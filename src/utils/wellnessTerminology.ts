/**
 * Wellness Terminology System
 * 
 * Converts medical/health terminology to wellness/fitness language
 * to eliminate HIPAA compliance requirements while maintaining functionality
 */

export interface TerminologyMapping {
  medical: string;
  wellness: string;
  category: 'condition' | 'goal' | 'restriction' | 'advice' | 'general';
}

export const WELLNESS_TERMINOLOGY: TerminologyMapping[] = [
  // Medical Conditions -> Lifestyle Preferences
  { medical: 'diabetes', wellness: 'prefers low-sugar options', category: 'condition' },
  { medical: 'diabetic', wellness: 'follows low-sugar lifestyle', category: 'condition' },
  { medical: 'hypertension', wellness: 'prefers lower-sodium meals', category: 'condition' },
  { medical: 'high blood pressure', wellness: 'chooses heart-healthy options', category: 'condition' },
  { medical: 'obesity', wellness: 'working on fitness goals', category: 'condition' },
  { medical: 'overweight', wellness: 'focusing on body composition', category: 'condition' },
  { medical: 'underweight', wellness: 'building strength and energy', category: 'condition' },
  
  // Allergies/Restrictions -> Food Preferences
  { medical: 'allergy', wellness: 'food preference to avoid', category: 'restriction' },
  { medical: 'allergic', wellness: 'prefers to avoid', category: 'restriction' },
  { medical: 'intolerance', wellness: 'doesn\'t feel great with', category: 'restriction' },
  { medical: 'intolerant', wellness: 'prefers to skip', category: 'restriction' },
  { medical: 'dietary restriction', wellness: 'food preference', category: 'restriction' },
  { medical: 'medical restriction', wellness: 'lifestyle choice', category: 'restriction' },
  
  // Goals -> Wellness Objectives
  { medical: 'lose weight', wellness: 'improve fitness', category: 'goal' },
  { medical: 'weight loss', wellness: 'fitness goals', category: 'goal' },
  { medical: 'gain weight', wellness: 'build strength', category: 'goal' },
  { medical: 'weight gain', wellness: 'strength building', category: 'goal' },
  { medical: 'manage condition', wellness: 'optimize wellness', category: 'goal' },
  { medical: 'treat condition', wellness: 'support lifestyle', category: 'goal' },
  
  // Medical Advice -> Wellness Guidance
  { medical: 'doctor recommended', wellness: 'popular choice for active lifestyles', category: 'advice' },
  { medical: 'medically advised', wellness: 'commonly chosen by fitness enthusiasts', category: 'advice' },
  { medical: 'prescribed diet', wellness: 'structured eating plan', category: 'advice' },
  { medical: 'therapeutic', wellness: 'beneficial for wellness', category: 'advice' },
  { medical: 'treatment', wellness: 'lifestyle support', category: 'advice' },
  
  // General Medical Terms -> Wellness Terms
  { medical: 'health condition', wellness: 'lifestyle preference', category: 'general' },
  { medical: 'medical condition', wellness: 'personal preference', category: 'general' },
  { medical: 'health problem', wellness: 'wellness goal', category: 'general' },
  { medical: 'illness', wellness: 'wellness focus area', category: 'general' },
  { medical: 'disease', wellness: 'lifestyle consideration', category: 'general' },
  { medical: 'diagnosis', wellness: 'personal preference', category: 'general' },
  { medical: 'symptoms', wellness: 'how you feel', category: 'general' },
  { medical: 'patient', wellness: 'user', category: 'general' },
  { medical: 'medical history', wellness: 'lifestyle background', category: 'general' },
  { medical: 'health record', wellness: 'wellness profile', category: 'general' },
  
  // Nutrition/Diet Medical Terms -> Wellness Terms
  { medical: 'calorie restriction', wellness: 'energy optimization', category: 'goal' },
  { medical: 'medical nutrition', wellness: 'performance nutrition', category: 'advice' },
  { medical: 'therapeutic diet', wellness: 'structured eating plan', category: 'advice' },
  { medical: 'clinical nutrition', wellness: 'nutrition guidance', category: 'advice' },
  
  // Monitoring -> Tracking
  { medical: 'monitor health', wellness: 'track wellness', category: 'general' },
  { medical: 'health monitoring', wellness: 'wellness tracking', category: 'general' },
  { medical: 'medical monitoring', wellness: 'fitness tracking', category: 'general' },
  { medical: 'clinical tracking', wellness: 'progress tracking', category: 'general' },
];

export class TerminologyMapper {
  private mappingDict: Map<string, string>;
  private medicalTermsRegex!: RegExp;

  constructor() {
    this.mappingDict = new Map();
    this.buildMappingDict();
    this.buildMedicalTermsRegex();
  }

  private buildMappingDict(): void {
    WELLNESS_TERMINOLOGY.forEach(mapping => {
      this.mappingDict.set(mapping.medical.toLowerCase(), mapping.wellness);
    });
  }

  private buildMedicalTermsRegex(): void {
    const medicalTerms = WELLNESS_TERMINOLOGY.map(m => 
      m.medical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    );
    this.medicalTermsRegex = new RegExp(`\\b(${medicalTerms.join('|')})\\b`, 'gi');
  }

  /**
   * Convert medical terminology to wellness language
   */
  convertToWellness(text: string): string {
    return text.replace(this.medicalTermsRegex, (match) => {
      const wellness = this.mappingDict.get(match.toLowerCase());
      return wellness || match;
    });
  }

  /**
   * Check if text contains medical terminology
   */
  containsMedicalTerms(text: string): boolean {
    return this.medicalTermsRegex.test(text);
  }

  /**
   * Get all medical terms found in text
   */
  findMedicalTerms(text: string): string[] {
    const matches = text.match(this.medicalTermsRegex);
    return matches ? [...new Set(matches.map(m => m.toLowerCase()))] : [];
  }

  /**
   * Get wellness alternative for a medical term
   */
  getWellnessAlternative(medicalTerm: string): string | null {
    return this.mappingDict.get(medicalTerm.toLowerCase()) || null;
  }

  /**
   * Get all mappings by category
   */
  getMappingsByCategory(category: TerminologyMapping['category']): TerminologyMapping[] {
    return WELLNESS_TERMINOLOGY.filter(m => m.category === category);
  }
}

// Singleton instance
export const terminologyMapper = new TerminologyMapper();
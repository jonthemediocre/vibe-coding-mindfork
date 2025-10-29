/**
 * Wellness Terminology System Tests
 */

import { terminologyMapper, TerminologyMapper } from '../wellnessTerminology';

describe('WellnessTerminology', () => {
  describe('terminologyMapper', () => {
    it('should convert medical terms to wellness language', () => {
      const medicalText = 'I have diabetes and need to manage my blood sugar';
      const wellnessText = terminologyMapper.convertToWellness(medicalText);
      
      expect(wellnessText).toContain('follows low-sugar lifestyle');
      expect(wellnessText).not.toContain('diabetes');
    });

    it('should detect medical terminology', () => {
      const medicalText = 'I am allergic to nuts and have hypertension';
      const containsMedical = terminologyMapper.containsMedicalTerms(medicalText);
      
      expect(containsMedical).toBe(true);
    });

    it('should not detect medical terms in wellness text', () => {
      const wellnessText = 'I prefer to avoid nuts and choose heart-healthy options';
      const containsMedical = terminologyMapper.containsMedicalTerms(wellnessText);
      
      expect(containsMedical).toBe(false);
    });

    it('should find specific medical terms', () => {
      const text = 'I have diabetes and take medication';
      const foundTerms = terminologyMapper.findMedicalTerms(text);
      
      expect(foundTerms).toContain('diabetes');
      expect(foundTerms).toContain('medication');
    });

    it('should provide wellness alternatives', () => {
      const alternative = terminologyMapper.getWellnessAlternative('allergy');
      expect(alternative).toBe('food preference to avoid');
      
      const noAlternative = terminologyMapper.getWellnessAlternative('nonexistent');
      expect(noAlternative).toBeNull();
    });

    it('should handle complex medical text', () => {
      const complexText = 'My doctor recommended this diet for my medical condition';
      const wellnessText = terminologyMapper.convertToWellness(complexText);
      
      expect(wellnessText).toContain('wellness experts suggest');
      expect(wellnessText).toContain('lifestyle preference');
      expect(wellnessText).not.toContain('doctor');
      expect(wellnessText).not.toContain('medical condition');
    });

    it('should preserve non-medical text', () => {
      const normalText = 'I love eating vegetables and exercising regularly';
      const result = terminologyMapper.convertToWellness(normalText);
      
      expect(result).toBe(normalText);
    });
  });

  describe('TerminologyMapper class', () => {
    let mapper: TerminologyMapper;

    beforeEach(() => {
      mapper = new TerminologyMapper();
    });

    it('should get mappings by category', () => {
      const conditionMappings = mapper.getMappingsByCategory('condition');
      expect(conditionMappings.length).toBeGreaterThan(0);
      expect(conditionMappings[0].category).toBe('condition');
      
      const restrictionMappings = mapper.getMappingsByCategory('restriction');
      expect(restrictionMappings.length).toBeGreaterThan(0);
      expect(restrictionMappings[0].category).toBe('restriction');
    });

    it('should handle case insensitive matching', () => {
      const upperText = 'I HAVE DIABETES';
      const lowerText = 'i have diabetes';
      const mixedText = 'I Have Diabetes';
      
      expect(mapper.convertToWellness(upperText)).toContain('follows low-sugar lifestyle');
      expect(mapper.convertToWellness(lowerText)).toContain('follows low-sugar lifestyle');
      expect(mapper.convertToWellness(mixedText)).toContain('follows low-sugar lifestyle');
    });
  });
});
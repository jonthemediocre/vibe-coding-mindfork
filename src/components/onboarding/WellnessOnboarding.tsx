/**
 * Wellness-Focused Onboarding Component
 * Collects lifestyle preferences and fitness goals without medical terminology
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, useThemeColors } from '../../ui';
import { disclaimerService } from '../../utils/disclaimerService';
import { boundaryEnforcer } from '../../utils/boundaryEnforcer';

interface WellnessOnboardingProps {
  onComplete: (preferences: WellnessPreferences) => void;
  onSkip: () => void;
}

export interface WellnessPreferences {
  fitnessGoal: 'get_stronger' | 'improve_energy' | 'enhance_performance' | 'feel_better';
  eatingStyle: 'plant_focused' | 'protein_rich' | 'balanced_variety' | 'custom';
  foodExclusions: string[];
  activityLevel: 'low' | 'moderate' | 'active' | 'very_active';
  preferredFoods: string[];
}

export const WellnessOnboarding: React.FC<WellnessOnboardingProps> = ({
  onComplete,
  onSkip,
}) => {
  const colors = useThemeColors();
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<Partial<WellnessPreferences>>({});

  const steps = [
    {
      title: "What's your primary fitness goal?",
      subtitle: "Choose what matters most to you right now",
      options: [
        { value: 'get_stronger', label: 'Get Stronger', description: 'Build muscle and physical strength' },
        { value: 'improve_energy', label: 'Improve Energy', description: 'Feel more energized throughout the day' },
        { value: 'enhance_performance', label: 'Enhance Performance', description: 'Optimize for athletic performance' },
        { value: 'feel_better', label: 'Feel Better Overall', description: 'General wellness and vitality' },
      ],
      key: 'fitnessGoal' as keyof WellnessPreferences,
    },
    {
      title: "What's your preferred eating style?",
      subtitle: "Help us suggest foods you'll love",
      options: [
        { value: 'plant_focused', label: 'Plant-Focused', description: 'Emphasizes vegetables, fruits, and plant proteins' },
        { value: 'protein_rich', label: 'Protein-Rich', description: 'Higher protein for active lifestyles' },
        { value: 'balanced_variety', label: 'Balanced Variety', description: 'A bit of everything in moderation' },
        { value: 'custom', label: 'I\'ll Customize Later', description: 'Set up specific preferences later' },
      ],
      key: 'eatingStyle' as keyof WellnessPreferences,
    },
    {
      title: "Any foods you'd prefer to skip in recipes?",
      subtitle: "We'll exclude these from your meal suggestions",
      type: 'food_exclusions',
      commonExclusions: [
        'Dairy products',
        'Gluten-containing grains',
        'Nuts and seeds',
        'Shellfish',
        'Eggs',
        'Soy products',
        'Spicy foods',
        'High-sodium foods',
      ],
    },
    {
      title: "How active are you typically?",
      subtitle: "This helps us suggest appropriate energy targets",
      options: [
        { value: 'low', label: 'Lightly Active', description: 'Desk job, minimal exercise' },
        { value: 'moderate', label: 'Moderately Active', description: 'Some exercise, active hobbies' },
        { value: 'active', label: 'Very Active', description: 'Regular workouts, active lifestyle' },
        { value: 'very_active', label: 'Extremely Active', description: 'Daily intense exercise, athletic training' },
      ],
      key: 'activityLevel' as keyof WellnessPreferences,
    },
  ];

  const currentStepData = steps[currentStep];

  const handleOptionSelect = (value: string) => {
    const key = currentStepData.key;
    if (key) {
      setPreferences(prev => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  const handleFoodExclusionToggle = (food: string) => {
    setPreferences(prev => {
      const current = prev.foodExclusions || [];
      const isSelected = current.includes(food);
      
      return {
        ...prev,
        foodExclusions: isSelected
          ? current.filter(f => f !== food)
          : [...current, food],
      };
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Validate preferences with boundary enforcer
      const preferencesText = JSON.stringify(preferences);
      const safePreferences = boundaryEnforcer.makeWellnessSafe(preferencesText, 'onboarding');
      
      onComplete(preferences as WellnessPreferences);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    if (currentStepData.type === 'food_exclusions') {
      return true; // Food exclusions are optional
    }
    
    const key = currentStepData.key;
    return key ? preferences[key] !== undefined : false;
  };

  const renderStepContent = () => {
    if (currentStepData.type === 'food_exclusions') {
      return (
        <View style={styles.foodExclusionsContainer}>
          <Text variant="body" style={styles.subtitle}>
            {currentStepData.subtitle}
          </Text>
          
          <Text variant="caption" color={colors.textSecondary} style={styles.note}>
            These are lifestyle preferences, not medical restrictions
          </Text>
          
          <View style={styles.exclusionsGrid}>
            {currentStepData.commonExclusions?.map((food) => {
              const isSelected = preferences.foodExclusions?.includes(food) || false;
              
              return (
                <Button
                  key={food}
                  title={food}
                  variant={isSelected ? 'primary' : 'outline'}
                  onPress={() => handleFoodExclusionToggle(food)}
                  containerStyle={styles.exclusionButton}
                />
              );
            })}
          </View>
          
          <Text variant="caption" color={colors.textSecondary} style={styles.skipNote}>
            You can skip this step and customize later
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.optionsContainer}>
        <Text variant="body" style={styles.subtitle}>
          {currentStepData.subtitle}
        </Text>
        
        {currentStepData.options?.map((option) => {
          const isSelected = preferences[currentStepData.key!] === option.value;
          
          return (
            <Card
              key={option.value}
              style={[
                styles.optionCard,
                isSelected && { borderColor: colors.primary, borderWidth: 2 }
              ]}
            >
              <Text variant="titleSmall" style={styles.optionTitle}>
                {option.label}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {option.description}
              </Text>
            </Card>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text variant="titleLarge">Set Up Your Wellness Profile</Text>
        <Text variant="caption" color={colors.textSecondary}>
          Step {currentStep + 1} of {steps.length}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${((currentStep + 1) / steps.length) * 100}%`,
              backgroundColor: colors.primary 
            }
          ]} 
        />
      </View>

      <ScrollView style={styles.content}>
        <Text variant="titleMedium" style={styles.stepTitle}>
          {currentStepData.title}
        </Text>

        {renderStepContent()}

        {/* Wellness Disclaimer */}
        <Card style={styles.disclaimerCard}>
          <Text variant="caption" color={colors.textSecondary}>
            {disclaimerService.getDisclaimerContent('general_wellness', true)}
          </Text>
        </Card>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {currentStep > 0 && (
          <Button
            title="Back"
            variant="outline"
            onPress={handleBack}
            containerStyle={styles.backButton}
          />
        )}
        
        <Button
          title="Skip for Now"
          variant="ghost"
          onPress={onSkip}
          containerStyle={styles.skipButton}
        />
        
        <Button
          title={currentStep === steps.length - 1 ? "Complete Setup" : "Next"}
          variant="primary"
          onPress={handleNext}
          disabled={!canProceed()}
          containerStyle={styles.nextButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionCard: {
    marginBottom: 12,
    padding: 16,
  },
  optionTitle: {
    marginBottom: 4,
  },
  foodExclusionsContainer: {
    marginBottom: 20,
  },
  note: {
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  exclusionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  exclusionButton: {
    width: '48%',
    marginBottom: 8,
  },
  skipNote: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disclaimerCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    marginTop: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  skipButton: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 0,
  },
  nextButton: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 0,
  },
});

export default WellnessOnboarding;
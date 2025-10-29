import React, { useState } from "react";
import { StyleSheet, ScrollView, Alert } from "react-native";
import { Screen, Card, Text, Button, useThemedStyles, TextInput } from "../../ui";
import { useAuth } from "../../contexts/AuthContext";
import type { Theme } from "../../app-components/components/ThemeProvider";
import { supabase } from "../../lib/supabase";
import {
  calculateNutritionGoals,
  convertImperialToMetric,
  validateNutritionGoals,
  type Gender,
  type ActivityLevel,
  type Goal,
  type DietType,
} from "../../utils/goalCalculations";

interface OnboardingScreenProps {
  navigation: any;
}

type OnboardingStep = 'welcome' | 'basics' | 'metrics' | 'goals' | 'activity' | 'diet';

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();

  // Onboarding state
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(false);

  // User data
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');

  // Metrics (imperial by default)
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [targetWeightLbs, setTargetWeightLbs] = useState('');

  // Goals
  const [primaryGoal, setPrimaryGoal] = useState<Goal>('get_healthy');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [dietType, setDietType] = useState<DietType>('mindfork');

  const handleNext = () => {
    if (step === 'welcome') setStep('basics');
    else if (step === 'basics') setStep('metrics');
    else if (step === 'metrics') setStep('goals');
    else if (step === 'goals') setStep('activity');
    else if (step === 'activity') setStep('diet');
    else if (step === 'diet') handleComplete();
  };

  const handleBack = () => {
    if (step === 'basics') setStep('welcome');
    else if (step === 'metrics') setStep('basics');
    else if (step === 'goals') setStep('metrics');
    else if (step === 'activity') setStep('goals');
    else if (step === 'diet') setStep('activity');
  };

  const canProceed = (): boolean => {
    if (step === 'welcome') return true;
    if (step === 'basics') return !!age && parseInt(age) >= 13 && parseInt(age) <= 120;
    if (step === 'metrics') {
      const feet = parseInt(heightFeet);
      const inches = parseInt(heightInches);
      const weight = parseInt(weightLbs);
      return !!(feet > 0 && inches >= 0 && weight > 0);
    }
    if (step === 'goals') return !!primaryGoal;
    if (step === 'activity') return !!activityLevel;
    if (step === 'diet') return !!dietType;
    return false;
  };

  const handleComplete = async () => {
    try {
      setLoading(true);

      // Convert to metric
      const { height_cm, weight_kg } = convertImperialToMetric(
        parseInt(heightFeet),
        parseInt(heightInches),
        parseInt(weightLbs)
      );

      const targetWeightKg = targetWeightLbs
        ? parseFloat(targetWeightLbs) * 0.453592
        : undefined;

      // Calculate nutrition goals
      const goals = calculateNutritionGoals({
        weight_kg,
        height_cm,
        age: parseInt(age),
        gender,
        activity_level: activityLevel,
        primary_goal: primaryGoal,
        diet_type: dietType,
      });

      // Validate goals
      const validation = validateNutritionGoals(goals);
      if (!validation.valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        setLoading(false);
        return;
      }

      // Save to Supabase
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const profileData = {
        id: user.id,
        full_name: fullName || null,
        age: parseInt(age),
        gender,
        height_cm,
        weight_kg,
        target_weight_kg: targetWeightKg || null,
        height_unit: 'ft' as const,
        weight_unit: 'lbs' as const,
        primary_goal: primaryGoal,
        activity_level: activityLevel,
        diet_type: dietType,
        daily_calories: goals.daily_calories,
        daily_protein_g: goals.daily_protein_g,
        daily_carbs_g: goals.daily_carbs_g,
        daily_fat_g: goals.daily_fat_g,
        daily_fiber_g: goals.daily_fiber_g,
        onboarding_completed: true,
        onboarding_step: 7,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData as any);

      if (error) throw error;

      // Navigate to main app
      navigation.replace('Main');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderWelcome = () => (
    <Card elevation={2} padding="lg">
      <Text variant="headingSmall" style={styles.heading}>
        Welcome to MindFork
      </Text>
      <Text variant="body" style={styles.body}>
        Let's personalize your nutrition plan by learning about your goals and preferences.
      </Text>
      <Text variant="body" style={styles.body}>
        This will take about 2 minutes.
      </Text>
      <Button title="Get Started" onPress={handleNext} />
    </Card>
  );

  const renderBasics = () => (
    <Card elevation={2} padding="lg">
      <Text variant="headingSmall" style={styles.heading}>
        Basic Information
      </Text>
      <TextInput
        label="Full Name (optional)"
        value={fullName}
        onChangeText={setFullName}
        placeholder="John Doe"
        containerStyle={styles.input}
      />
      <TextInput
        label="Age *"
        value={age}
        onChangeText={setAge}
        placeholder="30"
        keyboardType="number-pad"
        containerStyle={styles.input}
      />
      <Text variant="titleSmall" style={styles.label}>
        Gender
      </Text>
      <Button
        title="Male"
        variant={gender === 'male' ? 'primary' : 'outline'}
        onPress={() => setGender('male')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Female"
        variant={gender === 'female' ? 'primary' : 'outline'}
        onPress={() => setGender('female')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Other"
        variant={gender === 'other' ? 'primary' : 'outline'}
        onPress={() => setGender('other')}
        containerStyle={styles.buttonSmall}
      />
      <Button title="Next" onPress={handleNext} disabled={!canProceed()} containerStyle={styles.nextButton} />
      <Button title="Back" variant="outline" onPress={handleBack} />
    </Card>
  );

  const renderMetrics = () => (
    <Card elevation={2} padding="lg">
      <Text variant="headingSmall" style={styles.heading}>
        Physical Metrics
      </Text>
      <Text variant="titleSmall" style={styles.label}>
        Height
      </Text>
      <TextInput
        label="Feet"
        value={heightFeet}
        onChangeText={setHeightFeet}
        placeholder="5"
        keyboardType="number-pad"
        containerStyle={styles.input}
      />
      <TextInput
        label="Inches"
        value={heightInches}
        onChangeText={setHeightInches}
        placeholder="10"
        keyboardType="number-pad"
        containerStyle={styles.input}
      />
      <TextInput
        label="Current Weight (lbs) *"
        value={weightLbs}
        onChangeText={setWeightLbs}
        placeholder="180"
        keyboardType="number-pad"
        containerStyle={styles.input}
      />
      <TextInput
        label="Target Weight (lbs, optional)"
        value={targetWeightLbs}
        onChangeText={setTargetWeightLbs}
        placeholder="170"
        keyboardType="number-pad"
        containerStyle={styles.input}
      />
      <Button title="Next" onPress={handleNext} disabled={!canProceed()} containerStyle={styles.nextButton} />
      <Button title="Back" variant="outline" onPress={handleBack} />
    </Card>
  );

  const renderGoals = () => (
    <Card elevation={2} padding="lg">
      <Text variant="headingSmall" style={styles.heading}>
        What's your primary goal?
      </Text>
      <Button
        title="Lose Weight"
        variant={primaryGoal === 'lose_weight' ? 'primary' : 'outline'}
        onPress={() => setPrimaryGoal('lose_weight')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Gain Muscle"
        variant={primaryGoal === 'gain_muscle' ? 'primary' : 'outline'}
        onPress={() => setPrimaryGoal('gain_muscle')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Maintain Weight"
        variant={primaryGoal === 'maintain' ? 'primary' : 'outline'}
        onPress={() => setPrimaryGoal('maintain')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Get Healthy"
        variant={primaryGoal === 'get_healthy' ? 'primary' : 'outline'}
        onPress={() => setPrimaryGoal('get_healthy')}
        containerStyle={styles.buttonSmall}
      />
      <Button title="Next" onPress={handleNext} disabled={!canProceed()} containerStyle={styles.nextButton} />
      <Button title="Back" variant="outline" onPress={handleBack} />
    </Card>
  );

  const renderActivity = () => (
    <Card elevation={2} padding="lg">
      <Text variant="headingSmall" style={styles.heading}>
        Activity Level
      </Text>
      <Button
        title="Sedentary (little/no exercise)"
        variant={activityLevel === 'sedentary' ? 'primary' : 'outline'}
        onPress={() => setActivityLevel('sedentary')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Light (1-3 days/week)"
        variant={activityLevel === 'light' ? 'primary' : 'outline'}
        onPress={() => setActivityLevel('light')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Moderate (3-5 days/week)"
        variant={activityLevel === 'moderate' ? 'primary' : 'outline'}
        onPress={() => setActivityLevel('moderate')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Active (6-7 days/week)"
        variant={activityLevel === 'active' ? 'primary' : 'outline'}
        onPress={() => setActivityLevel('active')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Very Active (athlete)"
        variant={activityLevel === 'very_active' ? 'primary' : 'outline'}
        onPress={() => setActivityLevel('very_active')}
        containerStyle={styles.buttonSmall}
      />
      <Button title="Next" onPress={handleNext} disabled={!canProceed()} containerStyle={styles.nextButton} />
      <Button title="Back" variant="outline" onPress={handleBack} />
    </Card>
  );

  const renderDiet = () => (
    <Card elevation={2} padding="lg">
      <Text variant="headingSmall" style={styles.heading}>
        Diet Preference
      </Text>
      <Button
        title="MindFork (Balanced)"
        variant={dietType === 'mindfork' ? 'primary' : 'outline'}
        onPress={() => setDietType('mindfork')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Keto"
        variant={dietType === 'keto' ? 'primary' : 'outline'}
        onPress={() => setDietType('keto')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Paleo"
        variant={dietType === 'paleo' ? 'primary' : 'outline'}
        onPress={() => setDietType('paleo')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Mediterranean"
        variant={dietType === 'mediterranean' ? 'primary' : 'outline'}
        onPress={() => setDietType('mediterranean')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Vegan"
        variant={dietType === 'vegan' ? 'primary' : 'outline'}
        onPress={() => setDietType('vegan')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Vegetarian"
        variant={dietType === 'vegetarian' ? 'primary' : 'outline'}
        onPress={() => setDietType('vegetarian')}
        containerStyle={styles.buttonSmall}
      />
      <Button
        title="Complete Setup"
        onPress={handleNext}
        disabled={!canProceed() || loading}
        containerStyle={styles.nextButton}
      />
      <Button title="Back" variant="outline" onPress={handleBack} disabled={loading} />
    </Card>
  );

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      {step === 'welcome' && renderWelcome()}
      {step === 'basics' && renderBasics()}
      {step === 'metrics' && renderMetrics()}
      {step === 'goals' && renderGoals()}
      {step === 'activity' && renderActivity()}
      {step === 'diet' && renderDiet()}
    </Screen>
  );
};

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingVertical: 40,
    },
    heading: {
      marginBottom: 12,
    },
    body: {
      marginBottom: 20,
    },
    label: {
      marginTop: 16,
      marginBottom: 8,
    },
    input: {
      marginBottom: 16,
    },
    buttonSmall: {
      marginBottom: 12,
    },
    nextButton: {
      marginTop: 24,
      marginBottom: 12,
    },
  });

export default OnboardingScreen;

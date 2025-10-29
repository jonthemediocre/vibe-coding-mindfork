/**
 * WellnessOnboarding Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { WellnessOnboarding, type WellnessPreferences } from '../WellnessOnboarding';

// Mock the wellness utilities
jest.mock('../../../utils/boundaryEnforcer', () => ({
  boundaryEnforcer: {
    makeWellnessSafe: jest.fn((content) => content),
  },
}));

jest.mock('../../../utils/disclaimerService', () => ({
  disclaimerService: {
    getDisclaimerContent: jest.fn(() => 'This is wellness guidance only.'),
  },
}));

describe('WellnessOnboarding', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the first step correctly', () => {
    const { getByText } = render(
      <WellnessOnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText('Set Up Your Wellness Profile')).toBeTruthy();
    expect(getByText("What's your primary fitness goal?")).toBeTruthy();
    expect(getByText('Get Stronger')).toBeTruthy();
    expect(getByText('Improve Energy')).toBeTruthy();
  });

  it('should use wellness terminology instead of medical terms', () => {
    const { getByText, queryByText } = render(
      <WellnessOnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    // Should have wellness terms
    expect(getByText('fitness goal')).toBeTruthy();
    expect(getByText('wellness')).toBeTruthy();
    
    // Should NOT have medical terms
    expect(queryByText('medical')).toBeNull();
    expect(queryByText('health condition')).toBeNull();
    expect(queryByText('diagnosis')).toBeNull();
  });

  it('should navigate through steps correctly', async () => {
    const { getByText } = render(
      <WellnessOnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    // Select first option
    fireEvent.press(getByText('Get Stronger'));
    
    // Go to next step
    fireEvent.press(getByText('Next'));

    await waitFor(() => {
      expect(getByText("What's your preferred eating style?")).toBeTruthy();
    });
  });

  it('should handle food exclusions as preferences', async () => {
    const { getByText } = render(
      <WellnessOnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    // Navigate to food exclusions step
    fireEvent.press(getByText('Get Stronger'));
    fireEvent.press(getByText('Next'));
    fireEvent.press(getByText('Plant-Focused'));
    fireEvent.press(getByText('Next'));

    await waitFor(() => {
      expect(getByText("Any foods you'd prefer to skip in recipes?")).toBeTruthy();
      expect(getByText('These are lifestyle preferences, not medical restrictions')).toBeTruthy();
    });

    // Select some food exclusions
    fireEvent.press(getByText('Dairy products'));
    fireEvent.press(getByText('Nuts and seeds'));
  });

  it('should complete onboarding with wellness preferences', async () => {
    const { getByText } = render(
      <WellnessOnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    // Complete all steps
    fireEvent.press(getByText('Get Stronger'));
    fireEvent.press(getByText('Next'));
    
    fireEvent.press(getByText('Protein-Rich'));
    fireEvent.press(getByText('Next'));
    
    // Skip food exclusions
    fireEvent.press(getByText('Next'));
    
    fireEvent.press(getByText('Very Active'));
    fireEvent.press(getByText('Complete Setup'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        fitnessGoal: 'get_stronger',
        eatingStyle: 'protein_rich',
        foodExclusions: [],
        activityLevel: 'very_active',
        preferredFoods: [],
      });
    });
  });

  it('should allow skipping the entire flow', () => {
    const { getByText } = render(
      <WellnessOnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    fireEvent.press(getByText('Skip for Now'));
    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('should display wellness disclaimers', () => {
    const { getByText } = render(
      <WellnessOnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText('This is wellness guidance only.')).toBeTruthy();
  });

  it('should prevent proceeding without required selections', () => {
    const { getByText } = render(
      <WellnessOnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    const nextButton = getByText('Next');
    
    // Next button should be disabled initially
    expect(nextButton.props.disabled).toBe(true);
    
    // Select an option
    fireEvent.press(getByText('Get Stronger'));
    
    // Now next button should be enabled
    expect(nextButton.props.disabled).toBe(false);
  });
});
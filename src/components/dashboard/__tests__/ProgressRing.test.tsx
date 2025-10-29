/**
 * ProgressRing Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressRing, CalorieRing, ProteinRing, MultiProgressRing } from '../ProgressRing';

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    Svg: ({ children, ...props }: any) => React.createElement('View', props, children),
    Circle: (props: any) => React.createElement('View', props),
    G: ({ children, ...props }: any) => React.createElement('View', props, children),
  };
});

describe('ProgressRing', () => {
  describe('Basic Functionality', () => {
    it('should render with basic props', () => {
      const { getByText } = render(
        <ProgressRing
          progress={75}
          current={150}
          target={200}
          label="Calories"
          unit="kcal"
        />
      );

      expect(getByText('150kcal')).toBeTruthy();
      expect(getByText('/ 200kcal')).toBeTruthy();
      expect(getByText('Calories')).toBeTruthy();
    });

    it('should display percentage when showPercentage is true', () => {
      const { getByText } = render(
        <ProgressRing
          progress={75}
          showPercentage={true}
        />
      );

      expect(getByText('75%')).toBeTruthy();
    });

    it('should handle progress clamping (over 100%)', () => {
      const { getByText } = render(
        <ProgressRing
          progress={150}
          current={300}
          target={200}
          unit="kcal"
        />
      );

      expect(getByText('300kcal')).toBeTruthy();
      expect(getByText('/ 200kcal')).toBeTruthy();
      // Progress should be clamped to 100% internally
    });

    it('should handle progress clamping (under 0%)', () => {
      const { getByText } = render(
        <ProgressRing
          progress={-10}
          current={0}
          target={200}
          unit="kcal"
        />
      );

      expect(getByText('0kcal')).toBeTruthy();
      // Progress should be clamped to 0% internally
    });

    it('should render without target display when target is not provided', () => {
      const { getByText, queryByText } = render(
        <ProgressRing
          progress={75}
          current={150}
          label="Calories"
          unit="kcal"
        />
      );

      expect(getByText('150kcal')).toBeTruthy();
      expect(getByText('Calories')).toBeTruthy();
      expect(queryByText(/\//)).toBeNull(); // No target display
    });
  });

  describe('Status-based Styling', () => {
    it('should handle good status', () => {
      const { getByText } = render(
        <ProgressRing
          progress={75}
          current={150}
          target={200}
          status="good"
          label="Test"
        />
      );

      expect(getByText('150')).toBeTruthy();
      // Color testing would require more complex setup
    });

    it('should handle warning status', () => {
      const { getByText } = render(
        <ProgressRing
          progress={95}
          current={190}
          target={200}
          status="warning"
          label="Test"
        />
      );

      expect(getByText('190')).toBeTruthy();
    });

    it('should handle over status', () => {
      const { getByText } = render(
        <ProgressRing
          progress={110}
          current={220}
          target={200}
          status="over"
          label="Test"
        />
      );

      expect(getByText('220')).toBeTruthy();
    });
  });

  describe('Preset Components', () => {
    it('should render CalorieRing with correct label and unit', () => {
      const { getByText } = render(
        <CalorieRing
          progress={75}
          current={1500}
          target={2000}
        />
      );

      expect(getByText('1500kcal')).toBeTruthy();
      expect(getByText('/ 2000kcal')).toBeTruthy();
      expect(getByText('Calories')).toBeTruthy();
    });

    it('should render ProteinRing with correct label and unit', () => {
      const { getByText } = render(
        <ProteinRing
          progress={80}
          current={120}
          target={150}
        />
      );

      expect(getByText('120g')).toBeTruthy();
      expect(getByText('/ 150g')).toBeTruthy();
      expect(getByText('Protein')).toBeTruthy();
    });
  });

  describe('MultiProgressRing', () => {
    const mockRings = [
      {
        progress: 75,
        current: 1500,
        target: 2000,
        label: 'Calories',
        unit: 'kcal',
        status: 'good' as const,
      },
      {
        progress: 80,
        current: 120,
        target: 150,
        label: 'Protein',
        unit: 'g',
        status: 'good' as const,
      },
      {
        progress: 60,
        current: 150,
        target: 250,
        label: 'Carbs',
        unit: 'g',
        status: 'warning' as const,
      },
    ];

    it('should render multiple rings with primary ring info in center', () => {
      const { getByText } = render(
        <MultiProgressRing rings={mockRings} />
      );

      // Should show primary ring (first ring) info in center
      expect(getByText('1500kcal')).toBeTruthy();
      expect(getByText('/ 2000kcal')).toBeTruthy();
      expect(getByText('Calories')).toBeTruthy();
    });

    it('should handle empty rings array', () => {
      const { container } = render(
        <MultiProgressRing rings={[]} />
      );

      // Should render without crashing
      expect(container).toBeTruthy();
    });

    it('should handle single ring', () => {
      const { getByText } = render(
        <MultiProgressRing rings={[mockRings[0]]} />
      );

      expect(getByText('1500kcal')).toBeTruthy();
      expect(getByText('Calories')).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should render with animation enabled by default', () => {
      const { getByText } = render(
        <ProgressRing
          progress={75}
          current={150}
          target={200}
          label="Test"
        />
      );

      expect(getByText('150')).toBeTruthy();
      // Animation testing would require more complex setup with Animated.Value mocking
    });

    it('should render without animation when disabled', () => {
      const { getByText } = render(
        <ProgressRing
          progress={75}
          current={150}
          target={200}
          label="Test"
          animated={false}
        />
      );

      expect(getByText('150')).toBeTruthy();
    });
  });

  describe('Custom Sizing', () => {
    it('should handle custom size and stroke width', () => {
      const { getByText } = render(
        <ProgressRing
          progress={75}
          current={150}
          target={200}
          label="Test"
          size={200}
          strokeWidth={12}
        />
      );

      expect(getByText('150')).toBeTruthy();
      // Size testing would require checking the SVG props
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero progress', () => {
      const { getByText } = render(
        <ProgressRing
          progress={0}
          current={0}
          target={200}
          label="Test"
        />
      );

      expect(getByText('0')).toBeTruthy();
    });

    it('should handle undefined current value', () => {
      const { getByText } = render(
        <ProgressRing
          progress={75}
          label="Test"
          showPercentage={true}
        />
      );

      expect(getByText('75%')).toBeTruthy();
    });

    it('should handle missing label', () => {
      const { getByText } = render(
        <ProgressRing
          progress={75}
          current={150}
          target={200}
        />
      );

      expect(getByText('150')).toBeTruthy();
      expect(getByText('/ 200')).toBeTruthy();
    });

    it('should round decimal values correctly', () => {
      const { getByText } = render(
        <ProgressRing
          progress={75.7}
          current={150.8}
          target={200.2}
          unit="g"
        />
      );

      expect(getByText('151g')).toBeTruthy(); // Should round 150.8 to 151
      expect(getByText('/ 200g')).toBeTruthy(); // Should round 200.2 to 200
    });
  });
});
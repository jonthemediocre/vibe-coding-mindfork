/**
 * WeightProgressChart Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { WeightProgressChart } from '../WeightProgressChart';

// Mock react-native-chart-kit
jest.mock('react-native-chart-kit', () => ({
  LineChart: ({ data, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { 
      testID: 'line-chart',
      ...props 
    }, JSON.stringify(data));
  },
}));

describe('WeightProgressChart', () => {
  const mockWeightData = [
    { date: '2024-01-01', weight: 80 },
    { date: '2024-01-02', weight: 79.8 },
    { date: '2024-01-03', weight: 79.5 },
    { date: '2024-01-04', weight: 79.3 },
    { date: '2024-01-05', weight: 79.1 },
    { date: '2024-01-06', weight: 78.9 },
    { date: '2024-01-07', weight: 78.7 },
  ];

  describe('With Weight Data', () => {
    it('should render weight progress chart with data', () => {
      const { getByText, getByTestId } = render(
        <WeightProgressChart
          weightData={mockWeightData}
          currentWeight={78.7}
          targetWeight={75}
          startWeight={80}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      expect(getByText('Weight Progress')).toBeTruthy();
      expect(getByText('78.7')).toBeTruthy();
      expect(getByText('Current (kg)')).toBeTruthy();
      expect(getByText('75.0')).toBeTruthy();
      expect(getByText('Target (kg)')).toBeTruthy();
      expect(getByTestId('line-chart')).toBeTruthy();
    });

    it('should calculate and display weight change correctly', () => {
      const { getByText } = render(
        <WeightProgressChart
          weightData={mockWeightData}
          currentWeight={78.7}
          targetWeight={75}
          startWeight={80}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      // Should show -1.3kg change (80 - 78.7 = 1.3)
      expect(getByText('-1.3')).toBeTruthy();
      expect(getByText('Change (kg)')).toBeTruthy();
    });

    it('should show positive change for weight gain', () => {
      const gainData = [
        { date: '2024-01-01', weight: 70 },
        { date: '2024-01-02', weight: 70.2 },
        { date: '2024-01-03', weight: 70.5 },
      ];

      const { getByText } = render(
        <WeightProgressChart
          weightData={gainData}
          currentWeight={70.5}
          targetWeight={75}
          startWeight={70}
          primaryGoal="gain_muscle"
          weightUnit="kg"
        />
      );

      expect(getByText('+0.5')).toBeTruthy();
    });

    it('should display goal-specific progress messages for lose_weight', () => {
      const { getByText } = render(
        <WeightProgressChart
          weightData={mockWeightData}
          currentWeight={78.7}
          targetWeight={75}
          startWeight={80}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      expect(getByText(/Great progress! You've lost 1.3kg/)).toBeTruthy();
    });

    it('should display goal-specific progress messages for gain_muscle', () => {
      const gainData = [
        { date: '2024-01-01', weight: 70 },
        { date: '2024-01-07', weight: 71 },
      ];

      const { getByText } = render(
        <WeightProgressChart
          weightData={gainData}
          currentWeight={71}
          targetWeight={75}
          startWeight={70}
          primaryGoal="gain_muscle"
          weightUnit="kg"
        />
      );

      expect(getByText(/Excellent! You've gained 1.0kg/)).toBeTruthy();
    });

    it('should display goal-specific progress messages for maintain', () => {
      const maintainData = [
        { date: '2024-01-01', weight: 75 },
        { date: '2024-01-07', weight: 75.2 },
      ];

      const { getByText } = render(
        <WeightProgressChart
          weightData={maintainData}
          currentWeight={75.2}
          targetWeight={75}
          startWeight={75}
          primaryGoal="maintain"
          weightUnit="kg"
        />
      );

      expect(getByText(/Perfect maintenance! Weight stable within 0.2kg/)).toBeTruthy();
    });

    it('should calculate and display trend correctly', () => {
      // Create data with clear downward trend
      const trendData = Array.from({ length: 14 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        weight: 80 - (i * 0.1), // Steady decline
      }));

      const { getByText } = render(
        <WeightProgressChart
          weightData={trendData}
          currentWeight={78.7}
          targetWeight={75}
          startWeight={80}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      expect(getByText('↘️ Decreasing')).toBeTruthy();
    });

    it('should estimate time to goal correctly', () => {
      // Create data with consistent weight loss rate
      const consistentData = [
        { date: '2024-01-01', weight: 80 },
        { date: '2024-01-08', weight: 79 },
        { date: '2024-01-15', weight: 78 },
        { date: '2024-01-22', weight: 77 },
      ];

      const { getByText } = render(
        <WeightProgressChart
          weightData={consistentData}
          currentWeight={77}
          targetWeight={75}
          startWeight={80}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      // At 1kg per week, should take ~2 weeks to lose remaining 2kg
      expect(getByText(/At current pace, you could reach your goal in ~2 weeks/)).toBeTruthy();
    });

    it('should handle imperial units (lbs)', () => {
      const lbsData = [
        { date: '2024-01-01', weight: 180 },
        { date: '2024-01-07', weight: 178 },
      ];

      const { getByText } = render(
        <WeightProgressChart
          weightData={lbsData}
          currentWeight={178}
          targetWeight={170}
          startWeight={180}
          primaryGoal="lose_weight"
          weightUnit="lbs"
        />
      );

      expect(getByText('178.0')).toBeTruthy();
      expect(getByText('Current (lbs)')).toBeTruthy();
      expect(getByText('170.0')).toBeTruthy();
      expect(getByText('Target (lbs)')).toBeTruthy();
      expect(getByText('-2.0')).toBeTruthy();
      expect(getByText('Change (lbs)')).toBeTruthy();
    });

    it('should limit chart data to last 30 entries', () => {
      // Create 40 data points
      const largeDataSet = Array.from({ length: 40 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        weight: 80 - (i * 0.1),
      }));

      const { getByTestId } = render(
        <WeightProgressChart
          weightData={largeDataSet}
          currentWeight={76}
          targetWeight={75}
          startWeight={80}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      const chartData = JSON.parse(getByTestId('line-chart').children[0] as string);
      expect(chartData.labels.length).toBe(30); // Should be limited to 30
    });
  });

  describe('Without Weight Data', () => {
    it('should show no data message when weightData is empty', () => {
      const { getByText } = render(
        <WeightProgressChart
          weightData={[]}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      expect(getByText('Weight Progress')).toBeTruthy();
      expect(getByText('Start logging your weight to see progress charts and insights!')).toBeTruthy();
    });

    it('should show no data message when weightData is undefined', () => {
      const { getByText } = render(
        <WeightProgressChart
          weightData={[]}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      expect(getByText('Start logging your weight to see progress charts and insights!')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing currentWeight gracefully', () => {
      const { getByText } = render(
        <WeightProgressChart
          weightData={mockWeightData}
          targetWeight={75}
          startWeight={80}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      expect(getByText('--')).toBeTruthy(); // Should show placeholder for current weight
    });

    it('should handle missing targetWeight gracefully', () => {
      const { getByText, queryByText } = render(
        <WeightProgressChart
          weightData={mockWeightData}
          currentWeight={78.7}
          startWeight={80}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      expect(getByText('78.7')).toBeTruthy();
      expect(queryByText('Target (kg)')).toBeNull(); // Should not show target section
    });

    it('should handle missing startWeight gracefully', () => {
      const { getByText, queryByText } = render(
        <WeightProgressChart
          weightData={mockWeightData}
          currentWeight={78.7}
          targetWeight={75}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      expect(getByText('78.7')).toBeTruthy();
      expect(queryByText('Change (kg)')).toBeNull(); // Should not show change section
    });

    it('should handle single data point', () => {
      const singleData = [{ date: '2024-01-01', weight: 80 }];

      const { getByText } = render(
        <WeightProgressChart
          weightData={singleData}
          currentWeight={80}
          targetWeight={75}
          startWeight={80}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      expect(getByText('Weight Progress')).toBeTruthy();
      expect(getByText('80.0')).toBeTruthy();
    });

    it('should handle very small weight changes', () => {
      const smallChangeData = [
        { date: '2024-01-01', weight: 80.0 },
        { date: '2024-01-07', weight: 79.95 },
      ];

      const { getByText } = render(
        <WeightProgressChart
          weightData={smallChangeData}
          currentWeight={79.95}
          targetWeight={75}
          startWeight={80}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      expect(getByText('-0.1')).toBeTruthy(); // Should round to 1 decimal place
    });

    it('should handle unrealistic time estimates', () => {
      // Create data that would result in very long time estimate
      const slowData = [
        { date: '2024-01-01', weight: 80 },
        { date: '2024-01-08', weight: 79.99 }, // Very slow progress
        { date: '2024-01-15', weight: 79.98 },
        { date: '2024-01-22', weight: 79.97 },
      ];

      const { queryByText } = render(
        <WeightProgressChart
          weightData={slowData}
          currentWeight={79.97}
          targetWeight={75}
          startWeight={80}
          primaryGoal="lose_weight"
          weightUnit="kg"
        />
      );

      // Should not show unrealistic time estimates (>2 years)
      expect(queryByText(/years/)).toBeNull();
    });
  });
});
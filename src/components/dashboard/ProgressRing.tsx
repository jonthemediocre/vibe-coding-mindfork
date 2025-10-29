/**
 * Progress Ring Component
 * Circular progress indicator with customizable colors and animations
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Text, useThemeColors } from '../../ui';

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0-100
  target?: number;
  current?: number;
  label?: string;
  unit?: string;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  animated?: boolean;
  status?: 'good' | 'warning' | 'over' | 'under';
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  size = 120,
  strokeWidth = 8,
  progress,
  target,
  current,
  label,
  unit = '',
  color,
  backgroundColor,
  showPercentage = false,
  animated = true,
  status = 'good',
}) => {
  const colors = useThemeColors();
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  
  // Clamp progress to 0-100 range
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circumference - (circumference * clampedProgress) / 100;

  // Get status-based colors
  const getProgressColor = (): string => {
    if (color) return color;
    
    switch (status) {
      case 'good':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'over':
        return colors.error;
      case 'under':
        return colors.info;
      default:
        return colors.primary;
    }
  };

  const getBackgroundColor = (): string => {
    return backgroundColor || 'rgba(0,0,0,0.1)';
  };

  // Animate progress on mount and when progress changes
  useEffect(() => {
    if (animated) {
      Animated.timing(animatedValue, {
        toValue: clampedProgress,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, animatedValue]);

  // Format display value
  const getDisplayValue = (): string => {
    if (current !== undefined) {
      return `${Math.round(current)}${unit}`;
    }
    if (showPercentage) {
      return `${Math.round(clampedProgress)}%`;
    }
    return `${Math.round(clampedProgress)}`;
  };

  // Get target display
  const getTargetDisplay = (): string | null => {
    if (target !== undefined) {
      return `/ ${Math.round(target)}${unit}`;
    }
    return null;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getBackgroundColor()}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Progress circle */}
          <Animated.View>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getProgressColor()}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </Animated.View>
        </G>
      </Svg>
      
      {/* Center content */}
      <View style={styles.centerContent}>
        <Text variant="headingSmall" style={[styles.value, { color: getProgressColor() }]}>
          {getDisplayValue()}
        </Text>
        
        {getTargetDisplay() && (
          <Text variant="caption" style={styles.target}>
            {getTargetDisplay()}
          </Text>
        )}
        
        {label && (
          <Text variant="caption" style={styles.label}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
};

// Preset configurations for common nutrition metrics
export const CalorieRing: React.FC<Omit<ProgressRingProps, 'label' | 'unit'>> = (props) => (
  <ProgressRing {...props} label="Calories" unit="kcal" />
);

export const ProteinRing: React.FC<Omit<ProgressRingProps, 'label' | 'unit'>> = (props) => (
  <ProgressRing {...props} label="Protein" unit="g" />
);

export const CarbsRing: React.FC<Omit<ProgressRingProps, 'label' | 'unit'>> = (props) => (
  <ProgressRing {...props} label="Carbs" unit="g" />
);

export const FatRing: React.FC<Omit<ProgressRingProps, 'label' | 'unit'>> = (props) => (
  <ProgressRing {...props} label="Fat" unit="g" />
);

export const FiberRing: React.FC<Omit<ProgressRingProps, 'label' | 'unit'>> = (props) => (
  <ProgressRing {...props} label="Fiber" unit="g" />
);

// Multi-ring component for showing multiple metrics
interface MultiProgressRingProps {
  rings: Array<{
    progress: number;
    current?: number;
    target?: number;
    label: string;
    unit?: string;
    color?: string;
    status?: 'good' | 'warning' | 'over' | 'under';
  }>;
  size?: number;
  strokeWidth?: number;
  spacing?: number;
}

export const MultiProgressRing: React.FC<MultiProgressRingProps> = ({
  rings,
  size = 140,
  strokeWidth = 6,
  spacing = 4,
}) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {rings.map((ring, index) => {
            const radius = (size - strokeWidth) / 2 - (index * (strokeWidth + spacing));
            const circumference = radius * 2 * Math.PI;
            const strokeDasharray = circumference;
            const clampedProgress = Math.max(0, Math.min(100, ring.progress));
            const strokeDashoffset = circumference - (circumference * clampedProgress) / 100;
            
            const ringColor = ring.color || 
              (ring.status === 'good' ? colors.success : 
               ring.status === 'warning' ? colors.warning : 
               ring.status === 'over' ? colors.error : colors.primary);

            return (
              <G key={index}>
                {/* Background */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                
                {/* Progress */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={ringColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </G>
            );
          })}
        </G>
      </Svg>
      
      {/* Center content - show primary ring info */}
      {rings.length > 0 && (
        <View style={styles.centerContent}>
          <Text variant="headingSmall" style={styles.value}>
            {rings[0].current !== undefined 
              ? `${Math.round(rings[0].current)}${rings[0].unit || ''}` 
              : `${Math.round(rings[0].progress)}%`}
          </Text>
          
          {rings[0].target !== undefined && (
            <Text variant="caption" style={styles.target}>
              / {Math.round(rings[0].target)}{rings[0].unit || ''}
            </Text>
          )}
          
          <Text variant="caption" style={styles.label}>
            {rings[0].label}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  target: {
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.7,
  },
  label: {
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
  },
});
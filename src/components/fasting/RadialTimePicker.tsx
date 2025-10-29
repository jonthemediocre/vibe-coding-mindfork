import React, { useState, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { Text, useThemeColors } from '../../ui';

const { width } = Dimensions.get('window');
const DIAL_SIZE = Math.min(width * 0.85, 340);
const CENTER = DIAL_SIZE / 2;
const RADIUS = CENTER - 40;
const HANDLE_RADIUS = 20;

interface RadialTimePickerProps {
  startTime: Date; // Local time
  endTime: Date;   // Local time
  durationMinutes: number;
  anchor: 'start' | 'finish';
  onStartChange: (time: Date) => void;
  onEndChange: (time: Date) => void;
  onAnchorChange: (anchor: 'start' | 'finish') => void;
  roundingMinutes?: number;
}

export const RadialTimePicker: React.FC<RadialTimePickerProps> = ({
  startTime,
  endTime,
  durationMinutes,
  anchor,
  onStartChange,
  onEndChange,
  onAnchorChange,
  roundingMinutes = 5,
}) => {
  const colors = useThemeColors();
  const [dragging, setDragging] = useState<'start' | 'finish' | null>(null);

  // Convert time to angle (12 o'clock = 0°, clockwise)
  const timeToAngle = (date: Date): number => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return (totalMinutes / (24 * 60)) * 360;
  };

  // Convert angle to time
  const angleToTime = (angle: number, baseDate: Date): Date => {
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const totalMinutes = (normalizedAngle / 360) * 24 * 60;

    // Round to nearest increment
    const roundedMinutes = Math.round(totalMinutes / roundingMinutes) * roundingMinutes;

    const hours = Math.floor(roundedMinutes / 60) % 24;
    const minutes = roundedMinutes % 60;

    const newDate = new Date(baseDate);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  // Get angle from touch point
  const getTouchAngle = (x: number, y: number): number => {
    const dx = x - CENTER;
    const dy = y - CENTER;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    angle = (angle + 90 + 360) % 360; // Adjust so 12 o'clock = 0°
    return angle;
  };

  // Convert angle to coordinate on circle
  const angleToCoord = (angle: number, radius: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
      x: CENTER + radius * Math.cos(radians),
      y: CENTER + radius * Math.sin(radians),
    };
  };

  const startAngle = timeToAngle(startTime);
  const endAngle = timeToAngle(endTime);

  // Create arc path for fasting window
  const createArcPath = () => {
    const startCoord = angleToCoord(startAngle, RADIUS);
    const endCoord = angleToCoord(endAngle, RADIUS);

    // Calculate if arc should go the long way
    let sweepAngle = endAngle - startAngle;
    if (sweepAngle < 0) sweepAngle += 360;

    const largeArc = sweepAngle > 180 ? 1 : 0;

    return `
      M ${startCoord.x} ${startCoord.y}
      A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${endCoord.x} ${endCoord.y}
    `;
  };

  const handlePanResponder = (handleType: 'start' | 'finish') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setDragging(handleType);
      },
      onPanResponderMove: (_, gesture) => {
        const touchAngle = getTouchAngle(gesture.moveX, gesture.moveY);

        if (handleType === 'start') {
          const newStart = angleToTime(touchAngle, startTime);

          // Duration-lock: adjust end to maintain duration
          const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);

          onStartChange(newStart);
          onEndChange(newEnd);
        } else {
          const newEnd = angleToTime(touchAngle, endTime);

          // Duration-lock: adjust start to maintain duration
          const newStart = new Date(newEnd.getTime() - durationMinutes * 60000);

          onStartChange(newStart);
          onEndChange(newEnd);
        }
      },
      onPanResponderRelease: () => {
        setDragging(null);
      },
    });

  const startPanResponder = handlePanResponder('start');
  const endPanResponder = handlePanResponder('finish');

  const startCoord = angleToCoord(startAngle, RADIUS);
  const endCoord = angleToCoord(endAngle, RADIUS);

  // Format time for display
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <View style={styles.container}>
      {/* Duration Lock Indicator */}
      <View style={[styles.lockChip, { backgroundColor: colors.primary }]}>
        <Text variant="bodySmall" style={styles.lockText}>
          🔒 {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m locked
        </Text>
      </View>

      {/* Anchor Toggle */}
      <View style={styles.anchorToggle}>
        <Text variant="bodySmall" color={colors.textSecondary}>
          I anchor my:
        </Text>
        <View style={styles.anchorButtons}>
          <View
            style={[
              styles.anchorButton,
              anchor === 'start' && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              variant="bodySmall"
              style={[
                styles.anchorButtonText,
                anchor === 'start' && { color: '#FFF' },
              ]}
            >
              Start
            </Text>
          </View>
          <View
            style={[
              styles.anchorButton,
              anchor === 'finish' && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              variant="bodySmall"
              style={[
                styles.anchorButtonText,
                anchor === 'finish' && { color: '#FFF' },
              ]}
            >
              Finish
            </Text>
          </View>
        </View>
      </View>

      {/* Radial Clock */}
      <Svg width={DIAL_SIZE} height={DIAL_SIZE}>
        {/* Clock face background */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke={colors.border}
          strokeWidth={2}
          fill="none"
          opacity={0.3}
        />

        {/* Hour markers */}
        {Array.from({ length: 24 }, (_, i) => {
          const angle = (i / 24) * 360;
          const coord = angleToCoord(angle, RADIUS - 10);
          const isQuarterHour = i % 6 === 0;

          return (
            <G key={i}>
              <Circle
                cx={coord.x}
                cy={coord.y}
                r={isQuarterHour ? 4 : 2}
                fill={colors.textSecondary}
                opacity={isQuarterHour ? 0.8 : 0.4}
              />
              {isQuarterHour && (
                <SvgText
                  x={angleToCoord(angle, RADIUS - 30).x}
                  y={angleToCoord(angle, RADIUS - 30).y}
                  fontSize={12}
                  fill={colors.textSecondary}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {i === 0 ? '12' : i > 12 ? i - 12 : i}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* Fasting window arc */}
        <Path
          d={createArcPath()}
          stroke={colors.primary}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />

        {/* Start handle */}
        <G>
          <Circle
            cx={startCoord.x}
            cy={startCoord.y}
            r={HANDLE_RADIUS}
            fill={anchor === 'start' ? colors.primary : colors.surface}
            stroke={colors.primary}
            strokeWidth={3}
          />
          <SvgText
            x={startCoord.x}
            y={startCoord.y}
            fontSize={10}
            fill={anchor === 'start' ? '#FFF' : colors.primary}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontWeight="bold"
          >
            S
          </SvgText>
        </G>

        {/* End handle */}
        <G>
          <Circle
            cx={endCoord.x}
            cy={endCoord.y}
            r={HANDLE_RADIUS}
            fill={anchor === 'finish' ? colors.primary : colors.surface}
            stroke={colors.primary}
            strokeWidth={3}
          />
          <SvgText
            x={endCoord.x}
            y={endCoord.y}
            fontSize={10}
            fill={anchor === 'finish' ? '#FFF' : colors.primary}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontWeight="bold"
          >
            E
          </SvgText>
        </G>

        {/* Center info */}
        <SvgText
          x={CENTER}
          y={CENTER - 20}
          fontSize={14}
          fill={colors.textSecondary}
          textAnchor="middle"
        >
          Eating Window
        </SvgText>
        <SvgText
          x={CENTER}
          y={CENTER + 5}
          fontSize={20}
          fill={colors.text}
          textAnchor="middle"
          fontWeight="bold"
        >
          {24 - Math.floor(durationMinutes / 60)}h
        </SvgText>
      </Svg>

      {/* Time displays */}
      <View style={styles.timeRow}>
        <View style={styles.timeBox}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            Start (Fast ends)
          </Text>
          <Text variant="titleMedium" style={styles.timeText}>
            {formatTime(startTime)}
          </Text>
        </View>
        <View style={styles.timeBox}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            Finish (Eating starts)
          </Text>
          <Text variant="titleMedium" style={styles.timeText}>
            {formatTime(endTime)}
          </Text>
        </View>
      </View>

      {/* Invisible touch handlers over handles */}
      <View
        style={[
          styles.handleTouchArea,
          {
            left: startCoord.x - HANDLE_RADIUS * 2,
            top: startCoord.y - HANDLE_RADIUS * 2,
          },
        ]}
        {...startPanResponder.panHandlers}
      />
      <View
        style={[
          styles.handleTouchArea,
          {
            left: endCoord.x - HANDLE_RADIUS * 2,
            top: endCoord.y - HANDLE_RADIUS * 2,
          },
        ]}
        {...endPanResponder.panHandlers}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  lockChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  lockText: {
    color: '#FFF',
    fontWeight: '600',
  },
  anchorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  anchorButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  anchorButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  anchorButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    gap: 16,
  },
  timeBox: {
    flex: 1,
    alignItems: 'center',
  },
  timeText: {
    marginTop: 4,
    fontWeight: '700',
  },
  handleTouchArea: {
    position: 'absolute',
    width: HANDLE_RADIUS * 4,
    height: HANDLE_RADIUS * 4,
  },
});

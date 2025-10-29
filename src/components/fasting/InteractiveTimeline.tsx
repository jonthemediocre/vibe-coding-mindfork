import React, { useState, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';
import Svg, { Circle, G, Path, Line, Text as SvgText } from 'react-native-svg';
import { Text, useThemeColors } from '../../ui';

const { width } = Dimensions.get('window');
const CLOCK_SIZE = Math.min(width * 0.85, 320);
const CENTER = CLOCK_SIZE / 2;
const RADIUS = CENTER - 40;
const HANDLE_SIZE = 24;

interface InteractiveTimelineProps {
  startTime: Date;
  endTime: Date;
  onStartTimeChange: (time: Date) => void;
  onEndTimeChange: (time: Date) => void;
}

export const InteractiveTimeline: React.FC<InteractiveTimelineProps> = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}) => {
  const colors = useThemeColors();
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);

  // Convert time to angle (0-360 degrees, where 0° = 12 AM at top)
  const timeToAngle = useCallback((date: Date): number => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return ((hours * 60 + minutes) / (24 * 60)) * 360;
  }, []);

  // Convert angle to time
  const angleToTime = useCallback((angle: number): Date => {
    const totalMinutes = (angle / 360) * 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    const newTime = new Date();
    newTime.setHours(hours, minutes, 0, 0);
    return newTime;
  }, []);

  // Get angle from touch position
  const getAngleFromTouch = useCallback((x: number, y: number): number => {
    const dx = x - CENTER;
    const dy = y - CENTER;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    return angle;
  }, []);

  const startAngle = timeToAngle(startTime);
  const endAngle = timeToAngle(endTime);

  // Calculate arc path for fasting/eating periods
  const createArcPath = (start: number, end: number, radius: number): string => {
    const startRad = ((start - 90) * Math.PI) / 180;
    const endRad = ((end - 90) * Math.PI) / 180;

    const x1 = CENTER + radius * Math.cos(startRad);
    const y1 = CENTER + radius * Math.sin(startRad);
    const x2 = CENTER + radius * Math.cos(endRad);
    const y2 = CENTER + radius * Math.sin(endRad);

    const largeArc = end > start ? (end - start > 180 ? 1 : 0) : (start - end < 180 ? 1 : 0);

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Handle coordinates
  const getHandlePosition = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: CENTER + RADIUS * Math.cos(rad),
      y: CENTER + RADIUS * Math.sin(rad),
    };
  };

  const startPos = getHandlePosition(startAngle);
  const endPos = getHandlePosition(endAngle);

  // Pan responder for start handle
  const startPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => setIsDraggingStart(true),
    onPanResponderMove: (_, gestureState) => {
      const angle = getAngleFromTouch(
        gestureState.moveX - (width - CLOCK_SIZE) / 2,
        gestureState.moveY - 100 // Approximate offset from screen top
      );
      onStartTimeChange(angleToTime(angle));
    },
    onPanResponderRelease: () => setIsDraggingStart(false),
  });

  // Pan responder for end handle
  const endPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => setIsDraggingEnd(true),
    onPanResponderMove: (_, gestureState) => {
      const angle = getAngleFromTouch(
        gestureState.moveX - (width - CLOCK_SIZE) / 2,
        gestureState.moveY - 100
      );
      onEndTimeChange(angleToTime(angle));
    },
    onPanResponderRelease: () => setIsDraggingEnd(false),
  });

  // Calculate fasting duration
  const fastingHours = useCallback(() => {
    let diff = endAngle - startAngle;
    if (diff < 0) diff += 360;
    return (diff / 360) * 24;
  }, [startAngle, endAngle]);

  return (
    <View style={styles.container}>
      <Svg width={CLOCK_SIZE} height={CLOCK_SIZE}>
        {/* Clock face background */}
        <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={colors.border} strokeWidth={2} />

        {/* Hour markers and labels */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 - 90) * Math.PI / 180;
          const isMainHour = i % 6 === 0;
          const markerLength = isMainHour ? 15 : 8;
          const x1 = CENTER + (RADIUS - markerLength) * Math.cos(angle);
          const y1 = CENTER + (RADIUS - markerLength) * Math.sin(angle);
          const x2 = CENTER + RADIUS * Math.cos(angle);
          const y2 = CENTER + RADIUS * Math.sin(angle);

          return (
            <G key={i}>
              <Line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={colors.textSecondary}
                strokeWidth={isMainHour ? 2 : 1}
                opacity={0.5}
              />
              {isMainHour && (
                <SvgText
                  x={CENTER + (RADIUS - 30) * Math.cos(angle)}
                  y={CENTER + (RADIUS - 30) * Math.sin(angle)}
                  fill={colors.text}
                  fontSize="14"
                  fontWeight="600"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {i === 0 ? '12' : i}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* Fasting period arc (highlighted) */}
        <Path
          d={createArcPath(startAngle, endAngle, RADIUS)}
          stroke={colors.primary}
          strokeWidth={20}
          fill="none"
          opacity={0.7}
        />

        {/* Eating period arc (subtle background) */}
        <Path
          d={createArcPath(endAngle, startAngle + 360, RADIUS)}
          stroke={colors.border}
          strokeWidth={20}
          fill="none"
          opacity={0.2}
        />

        {/* Start handle (fasting begins) */}
        <Circle
          cx={startPos.x}
          cy={startPos.y}
          r={HANDLE_SIZE / 2}
          fill={isDraggingStart ? colors.primary : '#FFF'}
          stroke={colors.primary}
          strokeWidth={3}
        />
        <SvgText
          x={startPos.x}
          y={startPos.y}
          fill={isDraggingStart ? '#FFF' : colors.primary}
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          S
        </SvgText>

        {/* End handle (fasting ends) */}
        <Circle
          cx={endPos.x}
          cy={endPos.y}
          r={HANDLE_SIZE / 2}
          fill={isDraggingEnd ? colors.primary : '#FFF'}
          stroke={colors.primary}
          strokeWidth={3}
        />
        <SvgText
          x={endPos.x}
          y={endPos.y}
          fill={isDraggingEnd ? '#FFF' : colors.primary}
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          E
        </SvgText>
      </Svg>

      {/* Draggable handle areas (transparent overlays for touch) */}
      <View
        style={[
          styles.handle,
          {
            left: startPos.x - HANDLE_SIZE,
            top: startPos.y - HANDLE_SIZE,
          },
        ]}
        {...startPanResponder.panHandlers}
      />
      <View
        style={[
          styles.handle,
          {
            left: endPos.x - HANDLE_SIZE,
            top: endPos.y - HANDLE_SIZE,
          },
        ]}
        {...endPanResponder.panHandlers}
      />

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary, opacity: 0.7 }]} />
          <Text variant="bodySmall">Fasting ({fastingHours().toFixed(1)}h)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.border, opacity: 0.2 }]} />
          <Text variant="bodySmall">Eating ({(24 - fastingHours()).toFixed(1)}h)</Text>
        </View>
      </View>

      {/* Instructions */}
      <Text variant="bodySmall" color={colors.textSecondary} style={styles.instructions}>
        Drag the 'S' handle to set start time, 'E' handle to set end time
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE * 2,
    height: HANDLE_SIZE * 2,
    borderRadius: HANDLE_SIZE,
  },
  legend: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  instructions: {
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

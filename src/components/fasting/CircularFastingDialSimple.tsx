import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, PanResponder, LayoutChangeEvent } from 'react-native';
import { Text } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Path } from 'react-native-svg';

/**
 * CircularFastingDial Component - Simplified Interactive Version
 *
 * A 24-hour circular clock for fasting periods with draggable handles.
 */

export interface CircularFastingDialProps {
  /** Starting hour of fast (0-23) */
  fastingStartHour: number;

  /** Ending hour of fast (0-23) */
  fastingEndHour: number;

  /** Callback when start time changes */
  onStartChange?: (hour: number) => void;

  /** Callback when end time changes */
  onEndChange?: (hour: number) => void;

  /** Current time for real-time indicator */
  currentTime?: Date;

  /** Size of the dial in pixels */
  size?: number;

  /** Whether user can interact with handles */
  interactive?: boolean;

  /** Active fasting session elapsed hours (for progress animation) */
  elapsedHours?: number;
}

export const CircularFastingDial: React.FC<CircularFastingDialProps> = ({
  fastingStartHour,
  fastingEndHour,
  onStartChange,
  onEndChange,
  currentTime = new Date(),
  size = 340,
  interactive = true,
  elapsedHours,
}) => {
  const center = size / 2;
  const radius = size * 0.35;
  const handleRadius = 16;
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const containerRef = useRef<View>(null);
  const layoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Calculate angles (0° = 12 o'clock, clockwise)
  const hourToAngle = (hour: number) => {
    return ((hour - 6) * 15) * (Math.PI / 180);
  };

  const startAngle = hourToAngle(fastingStartHour);
  const endAngle = hourToAngle(fastingEndHour);

  // Current time angle
  const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
  const currentAngle = hourToAngle(currentHour);

  // Calculate fasting duration
  let fastingDuration = fastingEndHour - fastingStartHour;
  if (fastingDuration < 0) fastingDuration += 24;
  const eatingDuration = 24 - fastingDuration;

  // Calculate positions for handles
  const getHandlePosition = (angle: number) => ({
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  });

  const startPos = getHandlePosition(startAngle);
  const endPos = getHandlePosition(endAngle);
  const currentPos = getHandlePosition(currentAngle);

  // Convert touch position (screen coordinates) to hour
  const positionToHour = (screenX: number, screenY: number): number => {
    // Convert screen coordinates to component-relative coordinates
    const localX = screenX - layoutRef.current.x;
    const localY = screenY - layoutRef.current.y;

    // Calculate relative to center
    const dx = localX - center;
    const dy = localY - center;

    let angle = Math.atan2(dy, dx);
    // Convert from radians to hours (0-24), adjusted for 12 o'clock = 0
    let hour = ((angle * 180 / Math.PI + 90) / 15) % 24;
    if (hour < 0) hour += 24;
    return Math.round(hour);
  };

  // Create pan responder for start handle
  const startPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        return interactive;
      },
      onMoveShouldSetPanResponder: () => interactive,
      onPanResponderGrant: () => {
        setDragging('start');
        // Measure to get absolute screen position
        containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
          layoutRef.current = { x: pageX, y: pageY, width, height };
        });
      },
      onPanResponderMove: (_, gestureState) => {
        if (!interactive || !onStartChange) return;
        const newHour = positionToHour(gestureState.moveX, gestureState.moveY);
        onStartChange(newHour);
      },
      onPanResponderRelease: () => {
        setDragging(null);
      },
    })
  ).current;

  // Create pan responder for end handle
  const endPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        return interactive;
      },
      onMoveShouldSetPanResponder: () => interactive,
      onPanResponderGrant: () => {
        setDragging('end');
        // Measure to get absolute screen position
        containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
          layoutRef.current = { x: pageX, y: pageY, width, height };
        });
      },
      onPanResponderMove: (_, gestureState) => {
        if (!interactive || !onEndChange) return;
        const newHour = positionToHour(gestureState.moveX, gestureState.moveY);
        onEndChange(newHour);
      },
      onPanResponderRelease: () => {
        setDragging(null);
      },
    })
  ).current;

  // Create arc path for fasting period
  const createArcPath = (start: number, end: number, r: number) => {
    const startRad = hourToAngle(start);
    const endRad = hourToAngle(end);

    const startX = center + r * Math.cos(startRad);
    const startY = center + r * Math.sin(startRad);
    const endX = center + r * Math.cos(endRad);
    const endY = center + r * Math.sin(endRad);

    let angleDiff = end - start;
    if (angleDiff < 0) angleDiff += 24;
    const largeArcFlag = angleDiff > 12 ? 1 : 0;

    return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  const fastingArc = createArcPath(fastingStartHour, fastingEndHour, radius);

  // Format hour for display
  const formatHour = (hour: number) => {
    const h = Math.floor(hour) % 24;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12} ${suffix}`;
  };

  // Render hour labels
  const renderHourLabels = () => {
    const hours = [0, 6, 12, 18];
    return hours.map(hour => {
      const angle = hourToAngle(hour);
      const labelRadius = radius + 35;
      const x = center + labelRadius * Math.cos(angle);
      const y = center + labelRadius * Math.sin(angle);

      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

      return (
        <SvgText
          key={hour}
          x={x}
          y={y + 5}
          fontSize="16"
          fontWeight="600"
          fill="#6B7280"
          textAnchor="middle"
        >
          {displayHour}
        </SvgText>
      );
    });
  };

  // Render hour ticks
  const renderHourTicks = () => {
    return Array.from({ length: 24 }).map((_, i) => {
      const angle = hourToAngle(i);
      const isMainHour = i % 6 === 0;
      const tickLength = isMainHour ? 12 : 6;
      const tickWidth = isMainHour ? 2 : 1;

      const innerRadius = radius - 10;
      const outerRadius = innerRadius - tickLength;

      const x1 = center + innerRadius * Math.cos(angle);
      const y1 = center + innerRadius * Math.sin(angle);
      const x2 = center + outerRadius * Math.cos(angle);
      const y2 = center + outerRadius * Math.sin(angle);

      return (
        <Line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#D1D5DB"
          strokeWidth={tickWidth}
        />
      );
    });
  };

  return (
    <View
      ref={containerRef}
      style={[styles.container, { width: size, height: size + 60 }]}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Outer circle (clock face) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#E5E7EB"
            strokeWidth={2}
          />

          {/* Hour ticks */}
          {renderHourTicks()}

          {/* Hour labels */}
          {renderHourLabels()}

          {/* Fasting period arc (highlighted) */}
          <Path
            d={fastingArc}
            fill="transparent"
            stroke="#10B981"
            strokeWidth={24}
            strokeLinecap="round"
          />

          {/* Progress arc (if active session) */}
          {elapsedHours !== undefined && elapsedHours > 0 && (
            <Path
              d={createArcPath(fastingStartHour, fastingStartHour + elapsedHours, radius)}
              fill="transparent"
              stroke="#059669"
              strokeWidth={24}
              strokeLinecap="round"
              opacity={0.8}
            />
          )}

          {/* Current time indicator */}
          <G>
            <Circle cx={currentPos.x} cy={currentPos.y} r={9} fill="#3B82F6" />
            <Circle cx={currentPos.x} cy={currentPos.y} r={5} fill="#FFFFFF" />
          </G>

          {/* Start handle (fasting begins) */}
          <G>
            <Circle
              cx={startPos.x}
              cy={startPos.y}
              r={handleRadius}
              fill={dragging === 'start' ? "#059669" : "#10B981"}
              stroke="#FFFFFF"
              strokeWidth={3}
            />
            <SvgText
              x={startPos.x}
              y={startPos.y + 5}
              fontSize="14"
              fontWeight="700"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              S
            </SvgText>
          </G>

          {/* End handle (fasting ends) */}
          <G>
            <Circle
              cx={endPos.x}
              cy={endPos.y}
              r={handleRadius}
              fill={dragging === 'end' ? "#D97706" : "#F59E0B"}
              stroke="#FFFFFF"
              strokeWidth={3}
            />
            <SvgText
              x={endPos.x}
              y={endPos.y + 5}
              fontSize="14"
              fontWeight="700"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              E
            </SvgText>
          </G>

          {/* Center info */}
          <SvgText
            x={center}
            y={center - 15}
            fontSize="32"
            fontWeight="700"
            fill="#1F2937"
            textAnchor="middle"
          >
            {fastingDuration}h
          </SvgText>
          <SvgText
            x={center}
            y={center + 12}
            fontSize="16"
            fill="#6B7280"
            textAnchor="middle"
          >
            Fasting
          </SvgText>
          <SvgText
            x={center}
            y={center + 32}
            fontSize="14"
            fill="#9CA3AF"
            textAnchor="middle"
          >
            {eatingDuration}h eating
          </SvgText>
        </Svg>
      </View>

      {/* Touchable overlays for handles - positioned absolutely over SVG */}
      {interactive && (
        <>
          {/* Start handle touchable area */}
          <View
            {...startPanResponder.panHandlers}
            style={[
              styles.handleTouchArea,
              {
                left: startPos.x - 20,
                top: startPos.y - 20,
              },
            ]}
          />

          {/* End handle touchable area */}
          <View
            {...endPanResponder.panHandlers}
            style={[
              styles.handleTouchArea,
              {
                left: endPos.x - 20,
                top: endPos.y - 20,
              },
            ]}
          />
        </>
      )}

      {/* Time labels below dial */}
      <View style={styles.timeLabels}>
        <View style={styles.timeLabel}>
          <View style={[styles.timeDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.timeLabelText}>Start: {formatHour(fastingStartHour)}</Text>
        </View>
        <View style={styles.timeLabel}>
          <View style={[styles.timeDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.timeLabelText}>End: {formatHour(fastingEndHour)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleTouchArea: {
    position: 'absolute',
    width: 40,
    height: 40,
    zIndex: 10,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  timeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timeLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
});

# FloatingVoiceMic Component

**Status**: ✅ Production Ready
**Location**: `/apps/mobile/src/components/voice/FloatingVoiceMic.tsx`
**Type**: Atomic (A) - Draggable Floating Action Button
**Dependencies**: `expo-av`, `expo-linear-gradient`, `@expo/vector-icons`

## Overview

A fully-featured floating microphone button that provides voice interaction capabilities anywhere in the app. The component is draggable, state-aware, and includes rich visual feedback through animations.

## Key Features

### 1. **Draggable Positioning**
- Tap and hold to drag anywhere on screen
- Physics-based movement with velocity and deceleration
- Auto-bounds to screen edges
- Distinguishes between tap (opens modal) and drag (repositions)
- Remembers position during drag session

### 2. **State-Based Animations**

| State | Visual Feedback | Animation |
|-------|----------------|-----------|
| `idle` | Gentle pulse | Scale 1.0 → 1.1 (2s cycle) |
| `listening` | Fast pulse + glow + waveform | Scale 1.0 → 1.15 (600ms) + 12 animated bars |
| `speaking` | Rotation | 360° rotation (3s cycle) |
| `error` | Shake + red color | Quick scale shake sequence |

### 3. **Waveform Visualization**
- 12 independently animated bars (listening state only)
- Circular arrangement around button
- Random amplitude variation for organic feel
- Smooth entrance/exit animations

### 4. **Visual Design**
- 60px diameter circular button
- Linear gradient background (theme-aware)
- Drop shadow for depth (iOS + Android elevation)
- Glow effect (listening state)
- Feather icon (mic or alert-circle)
- Color adapts to state

### 5. **Integration**
- Opens `VoiceCoachScreen` in slide-up modal
- Close button positioned top-right
- Theme-aware colors
- Works as overlay on any screen
- Can be used globally or per-screen

## Props

```typescript
interface FloatingVoiceMicProps {
  coachId: string;              // Coach ID for voice session
  userId: string;               // User ID for voice session
  initialX?: number;            // Initial X position (default: right edge - 80px)
  initialY?: number;            // Initial Y position (default: bottom - 160px)
  onStateChange?: (state: VoiceMicState) => void;  // State change callback
}

type VoiceMicState = 'idle' | 'listening' | 'speaking' | 'error';
```

## Usage Examples

### Basic Usage
```tsx
import { FloatingVoiceMic } from '../../components/voice';

export const DashboardScreen = () => {
  const { user } = useAuth();

  return (
    <View style={{ flex: 1 }}>
      <Text>Dashboard Content</Text>

      <FloatingVoiceMic
        coachId="wellness-coach"
        userId={user?.id || 'anonymous'}
      />
    </View>
  );
};
```

### Custom Position
```tsx
<FloatingVoiceMic
  coachId="coach-1"
  userId={userId}
  initialX={20}          // 20px from left
  initialY={SCREEN_HEIGHT - 140}  // 140px from bottom
/>
```

### Track State Changes
```tsx
const [micState, setMicState] = useState<VoiceMicState>('idle');

<FloatingVoiceMic
  coachId="coach-1"
  userId={userId}
  onStateChange={(state) => {
    console.log('Mic state changed:', state);
    setMicState(state);

    // React to state changes
    if (state === 'error') {
      showErrorToast('Voice assistant unavailable');
    }
  }}
/>
```

### Global Overlay
```tsx
// In App.tsx or root component
export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <RootNavigator />

        {/* Available everywhere */}
        <FloatingVoiceMic
          coachId="global-assistant"
          userId={currentUserId}
        />
      </NavigationContainer>
    </ThemeProvider>
  );
}
```

## Animation Details

### Idle Pulse
```javascript
// Gentle breathing effect
Animated.loop(
  Animated.sequence([
    Animated.timing(pulseAnim, { toValue: 1.1, duration: 2000 }),
    Animated.timing(pulseAnim, { toValue: 1.0, duration: 2000 }),
  ])
)
```

### Listening (Multi-layered)
```javascript
// 1. Fast pulse
scale: 1.0 → 1.15 (600ms)

// 2. Glow effect
opacity: 0 → 0.6 → 0 (800ms)

// 3. Waveform bars (12 bars)
Each bar: scaleY: 0.3 → 0.8-1.0 → 0.3
Staggered timing: 300ms + (index * 50ms)
```

### Speaking
```javascript
// Continuous rotation
rotate: 0deg → 360deg (3000ms)
```

### Error Shake
```javascript
// Shake sequence
scale: 1.0 → 1.2 → 0.9 → 1.1 → 1.0
duration: 100ms per step
```

## Performance Optimizations

1. **Native Driver**: All transform animations use native driver (60fps)
2. **Conditional Rendering**: Waveform only renders when `state === 'listening'`
3. **Animation Cleanup**: All animations stop when state changes
4. **Optimized Interpolation**: Rotation and glow use interpolated values
5. **Lazy Modal**: VoiceCoachScreen only loads when modal opens

## Drag Physics

### Gesture Detection
- **Tap Threshold**: 5px movement
- **Drag Activation**: 10px movement
- **Hit Slop**: 10px on all sides (44x44px effective tap area)

### Movement Physics
```javascript
// Velocity-based deceleration
if (velocity > 0.5) {
  Animated.decay(pan, {
    velocity: { x: vx * 1000, y: vy * 1000 },
    deceleration: 0.95,
  })
}

// Spring back to bounds
Animated.spring(pan, {
  toValue: { x: boundedX, y: boundedY },
  tension: 50,
  friction: 7,
})
```

## Theme Integration

### Colors Used
```typescript
// State-based gradients
idle:      [colors.primary, colors.secondary]
listening: [colors.primary, '#FF8FB5']
speaking:  [colors.secondary, '#9CA3AF']
error:     [colors.error, '#EF4444']

// Other elements
icon:      colors.onPrimary
closeBtn:  colors.text
```

### Customization
Modify theme in `ThemeProvider.tsx`:
```typescript
theme: {
  colors: {
    primary: '#FF6B9D',      // Main gradient
    secondary: '#6B7280',    // Secondary gradient
    onPrimary: '#FFFFFF',    // Icon color
    error: '#EF4444',        // Error state
  }
}
```

## Platform Differences

### iOS
- Shadow using `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`
- Modal presentation style: `pageSheet`
- Close button top: 50px (accounts for notch)

### Android
- Shadow using `elevation: 8`
- Modal presentation style: default
- Close button top: 20px

## Accessibility

- **Tap Target**: 60px + 10px hitslop = 70px effective (meets WCAG 44x44px minimum)
- **Visual Feedback**: Clear state changes through color and animation
- **Error States**: Distinct icon and color for error state
- **Modal Dismissal**: Standard back button (Android) and close button (all)

## Troubleshooting

### Button Not Visible
```bash
# Check z-index conflicts
# FloatingVoiceMic has zIndex: 1000
# Ensure parent containers have lower z-index or no position: absolute conflicts
```

### Drag Not Working
```bash
# Verify PanResponder is not blocked
# Check if parent View has pointerEvents="box-none"
# Ensure no other gesture handlers conflict
```

### Animations Stuttering
```bash
# Verify native driver is enabled (default: true)
# Check for expensive renders in parent
# Profile with React DevTools Performance tab
```

### Modal Not Opening
```bash
# Check console for VoiceCoachScreen import errors
# Verify isDragging state logic
# Increase drag threshold if taps are detected as drags
```

## File Structure

```
src/components/voice/
├── FloatingVoiceMic.tsx    # Main component
├── index.ts                # Exports
├── USAGE_EXAMPLE.md        # Detailed examples
└── README.md               # This file
```

## Dependencies

```json
{
  "expo-av": "^14.0.0",
  "expo-linear-gradient": "^13.0.0",
  "@expo/vector-icons": "^14.0.0",
  "react-native": "0.74.5"
}
```

All dependencies are already installed in the project.

## Next Steps

1. **Test on Device**: Drag behavior works best on physical device
2. **Customize Position**: Adjust `initialX` and `initialY` for your layout
3. **Add State Logic**: Connect `onStateChange` to your app state
4. **Theme Integration**: Ensure colors match your brand

## Related Components

- **VoiceCoachScreen**: `/apps/mobile/src/screens/coach/VoiceCoachScreen.tsx`
- **ThemeProvider**: `/apps/mobile/src/app-components/components/ThemeProvider.tsx`
- **Voice Types**: `/apps/mobile/src/screens/coach/VoiceCoach.types.ts`

---

**Created**: 2025-10-24
**Last Updated**: 2025-10-24
**Version**: 1.0.0
**Status**: ✅ Production Ready

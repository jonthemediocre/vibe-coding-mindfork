# FloatingVoiceMic Usage Guide

## Basic Usage

### 1. Import the Component

```tsx
import { FloatingVoiceMic } from '../../components/voice';
```

### 2. Add to Your Screen

```tsx
export const YourScreen = () => {
  const { user } = useAuth();

  return (
    <View style={{ flex: 1 }}>
      {/* Your screen content */}
      <Text>Your Screen Content</Text>

      {/* Floating mic button - renders on top */}
      <FloatingVoiceMic
        coachId="default-coach"
        userId={user?.id || 'anonymous'}
      />
    </View>
  );
};
```

### 3. Custom Positioning

```tsx
<FloatingVoiceMic
  coachId="default-coach"
  userId={user?.id || 'anonymous'}
  initialX={50}  // 50px from left edge
  initialY={100} // 100px from top edge
/>
```

### 4. Track State Changes

```tsx
const [voiceState, setVoiceState] = useState<VoiceMicState>('idle');

<FloatingVoiceMic
  coachId="default-coach"
  userId={user?.id || 'anonymous'}
  onStateChange={(state) => {
    console.log('Voice mic state:', state);
    setVoiceState(state);
  }}
/>
```

## Features

### Draggable
- Tap and drag to reposition anywhere on screen
- Smooth physics-based movement with velocity
- Auto-bounds to screen edges
- Distinguishes between tap and drag (won't open modal when dragging)

### Visual States

#### Idle (Default)
- Gentle pulse animation
- Primary gradient colors
- Ready to tap

#### Listening (Recording)
- Fast pulse animation
- Glow effect pulses
- Waveform bars animate around button
- Opens VoiceCoachScreen modal

#### Speaking (Coach Responding)
- Rotation animation
- Secondary colors
- Indicates coach is talking

#### Error
- Red colors
- Shake animation
- Alert icon instead of mic

### Animations
- **Pulse**: Scale 1.0 → 1.1 (idle) or 1.15 (listening)
- **Glow**: Opacity 0 → 0.6 (listening only)
- **Waveform**: 12 bars animate independently (listening only)
- **Rotation**: 360° rotation (speaking only)
- **Shake**: Quick scale changes (error only)

### Integration
- Uses existing `VoiceCoachScreen` component
- Respects theme colors from `useThemeColors()`
- Modal presentation with smooth slide animation
- Close button in modal for easy dismissal

## Advanced Usage

### Multiple Screens
Add to any screen that needs voice functionality:

```tsx
// In TabNavigator or App.tsx
<Stack.Navigator>
  <Stack.Screen
    name="Dashboard"
    component={DashboardScreen}
  />
  <Stack.Screen
    name="Food"
    component={FoodScreen}
  />
</Stack.Navigator>

// Each screen can have its own FloatingVoiceMic
```

### Global Overlay
To make it available everywhere, add to your root App component:

```tsx
// App.tsx
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />

          {/* Global voice assistant */}
          <FloatingVoiceMic
            coachId="global-coach"
            userId={currentUser?.id}
          />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

### Conditional Rendering
Show only when needed:

```tsx
const { user } = useAuth();
const { hasSubscription } = useSubscription();

{hasSubscription && (
  <FloatingVoiceMic
    coachId="premium-coach"
    userId={user?.id}
  />
)}
```

## Styling Customization

The component uses theme colors automatically:
- `colors.primary` - Main gradient start
- `colors.secondary` - Gradient end
- `colors.onPrimary` - Icon color
- `colors.error` - Error state
- `colors.text` - Close button

To customize, modify your theme in `ThemeProvider.tsx`.

## Performance Notes

- Uses native driver for all transform animations (smooth 60fps)
- Waveform only renders when in 'listening' state
- Glow effect optimized with opacity animations
- PanResponder configured for minimal re-renders
- Modal lazy-loads VoiceCoachScreen

## Accessibility

- Large hit area (60px + 10px hitslop)
- Clear visual feedback for all states
- Error state with distinct icon
- Modal can be dismissed with back button (Android)

## Props Reference

```typescript
interface FloatingVoiceMicProps {
  // Required
  coachId: string;           // ID of the coach to use
  userId: string;            // Current user ID

  // Optional
  initialX?: number;         // Initial X position (default: right edge - 80)
  initialY?: number;         // Initial Y position (default: bottom - 160)
  onStateChange?: (state: VoiceMicState) => void;  // State change callback
}

type VoiceMicState = 'idle' | 'listening' | 'speaking' | 'error';
```

## Troubleshooting

### Button not visible
- Check z-index of parent containers
- Ensure component is rendered (check conditional logic)
- Verify initialX/initialY are within screen bounds

### Modal not opening
- Check if dragging is being detected (increase threshold)
- Verify VoiceCoachScreen component exists
- Check console for errors

### Animations stuttering
- Ensure native driver is enabled (it is by default)
- Check for heavy re-renders in parent components
- Profile with React DevTools

### State not updating
- Verify onStateChange callback is connected
- Check if VoiceCoachScreen is updating its state
- Add console.logs to trace state flow

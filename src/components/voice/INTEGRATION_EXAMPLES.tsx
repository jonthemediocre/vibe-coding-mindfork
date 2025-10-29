/**
 * FloatingVoiceMic Integration Examples
 *
 * Copy-paste ready examples for common integration scenarios
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { FloatingVoiceMic, VoiceMicState } from './FloatingVoiceMic';
import { useAuth } from '../../contexts/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// EXAMPLE 1: Basic Screen Integration
// ============================================
export const Example1_BasicScreen = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Dashboard</Text>
      <Text style={styles.subtitle}>Your daily overview</Text>

      {/* Add voice assistant to any screen */}
      <FloatingVoiceMic
        coachId="wellness-coach"
        userId={user?.id || 'anonymous'}
      />
    </View>
  );
};

// ============================================
// EXAMPLE 2: Custom Positioning
// ============================================
export const Example2_CustomPosition = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Food Tracking</Text>

      {/* Position at bottom-left instead of bottom-right */}
      <FloatingVoiceMic
        coachId="nutrition-coach"
        userId={user?.id || 'anonymous'}
        initialX={20}  // 20px from left edge
        initialY={SCREEN_HEIGHT - 140}  // 140px from bottom
      />
    </View>
  );
};

// ============================================
// EXAMPLE 3: State Tracking
// ============================================
export const Example3_StateTracking = () => {
  const { user } = useAuth();
  const [micState, setMicState] = useState<VoiceMicState>('idle');
  const [sessionCount, setSessionCount] = useState(0);

  const handleStateChange = (state: VoiceMicState) => {
    console.log('Voice mic state:', state);
    setMicState(state);

    // Track when user starts listening
    if (state === 'listening') {
      setSessionCount(prev => prev + 1);
    }

    // Handle errors
    if (state === 'error') {
      console.error('Voice assistant error');
      // Show error toast, etc.
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Sessions</Text>
      <Text>Current State: {micState}</Text>
      <Text>Sessions Today: {sessionCount}</Text>

      <FloatingVoiceMic
        coachId="coach-1"
        userId={user?.id || 'anonymous'}
        onStateChange={handleStateChange}
      />
    </View>
  );
};

// ============================================
// EXAMPLE 4: Conditional Rendering
// ============================================
export const Example4_Conditional = () => {
  const { user } = useAuth();
  const [hasSubscription] = useState(true); // From useSubscription hook

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Premium Features</Text>

      {/* Only show for premium users */}
      {hasSubscription && user && (
        <FloatingVoiceMic
          coachId="premium-coach"
          userId={user.id}
        />
      )}

      {!hasSubscription && (
        <Text style={styles.upgradeText}>
          Upgrade to Premium for AI Voice Coach
        </Text>
      )}
    </View>
  );
};

// ============================================
// EXAMPLE 5: Multiple Screens (Navigator)
// ============================================
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

const DashboardScreen = () => {
  const { user } = useAuth();
  return (
    <View style={styles.container}>
      <Text>Dashboard</Text>
      <FloatingVoiceMic coachId="general" userId={user?.id || 'anon'} />
    </View>
  );
};

const FoodScreen = () => {
  const { user } = useAuth();
  return (
    <View style={styles.container}>
      <Text>Food Tracking</Text>
      <FloatingVoiceMic coachId="nutrition" userId={user?.id || 'anon'} />
    </View>
  );
};

export const Example5_MultipleScreens = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Food" component={FoodScreen} />
    </Tab.Navigator>
  );
};

// ============================================
// EXAMPLE 6: Global Overlay (App.tsx)
// ============================================
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '../../app-components/components/ThemeProvider';

export const Example6_GlobalApp = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  return (
    <ThemeProvider>
      <NavigationContainer>
        {/* Your app navigation */}
        <Tab.Navigator>
          <Tab.Screen name="Home" component={DashboardScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>

        {/* Global voice assistant - available everywhere */}
        {currentUserId && (
          <FloatingVoiceMic
            coachId="global-assistant"
            userId={currentUserId}
          />
        )}
      </NavigationContainer>
    </ThemeProvider>
  );
};

// ============================================
// EXAMPLE 7: Dynamic Coach Selection
// ============================================
export const Example7_DynamicCoach = () => {
  const { user } = useAuth();
  const [selectedCoach, setSelectedCoach] = useState('wellness-coach');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Coach</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={() => setSelectedCoach('wellness-coach')}>
          <Text>Wellness</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedCoach('nutrition-coach')}>
          <Text>Nutrition</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedCoach('fitness-coach')}>
          <Text>Fitness</Text>
        </TouchableOpacity>
      </View>

      <FloatingVoiceMic
        coachId={selectedCoach}
        userId={user?.id || 'anonymous'}
      />
    </View>
  );
};

// ============================================
// EXAMPLE 8: Context-Aware Assistant
// ============================================
export const Example8_ContextAware = () => {
  const { user } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<
    'dashboard' | 'food' | 'workout'
  >('dashboard');

  // Choose coach based on current screen context
  const getCoachId = () => {
    switch (currentScreen) {
      case 'food':
        return 'nutrition-coach';
      case 'workout':
        return 'fitness-coach';
      default:
        return 'wellness-coach';
    }
  };

  return (
    <View style={styles.container}>
      <Text>Current: {currentScreen}</Text>

      {/* Voice assistant adapts to current context */}
      <FloatingVoiceMic
        coachId={getCoachId()}
        userId={user?.id || 'anonymous'}
      />
    </View>
  );
};

// ============================================
// EXAMPLE 9: Analytics Tracking
// ============================================
export const Example9_Analytics = () => {
  const { user } = useAuth();

  const handleStateChange = (state: VoiceMicState) => {
    // Track analytics events
    if (state === 'listening') {
      // analytics.track('voice_session_started', { userId: user?.id });
    }
    if (state === 'speaking') {
      // analytics.track('voice_response_playing', { userId: user?.id });
    }
    if (state === 'error') {
      // analytics.track('voice_error', { userId: user?.id });
    }
  };

  return (
    <View style={styles.container}>
      <FloatingVoiceMic
        coachId="coach-1"
        userId={user?.id || 'anonymous'}
        onStateChange={handleStateChange}
      />
    </View>
  );
};

// ============================================
// EXAMPLE 10: Accessibility Features
// ============================================
export const Example10_Accessibility = () => {
  const { user } = useAuth();
  const [showButton, setShowButton] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accessibility Settings</Text>

      <TouchableOpacity onPress={() => setShowButton(!showButton)}>
        <Text>Toggle Voice Assistant</Text>
      </TouchableOpacity>

      {showButton && (
        <FloatingVoiceMic
          coachId="coach-1"
          userId={user?.id || 'anonymous'}
          // Position for easy thumb reach (bottom-right for right-handed)
          initialX={Dimensions.get('window').width - 80}
          initialY={Dimensions.get('window').height - 140}
        />
      )}
    </View>
  );
};

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  upgradeText: {
    fontSize: 16,
    color: '#FF6B9D',
    textAlign: 'center',
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
});

// ============================================
// Mock Components (for examples)
// ============================================
const ProfileScreen = () => <View><Text>Profile</Text></View>;
const TouchableOpacity = ({ children, onPress }: any) => (
  <View onTouchEnd={onPress}>{children}</View>
);

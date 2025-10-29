/**
 * Navigation Debugger Component
 *
 * Add this to any screen to see the actual navigation structure at runtime
 * This will help identify if the issue is in code or caching
 *
 * Usage:
 * import { NavigationDebugger } from '@/utils/NavigationDebugger';
 *
 * // In your component
 * return (
 *   <>
 *     <NavigationDebugger />
 *     {/* rest of your UI *\/}
 *   </>
 * );
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigationState, useNavigation } from '@react-navigation/native';

export function NavigationDebugger() {
  const navigationState = useNavigationState(state => state);
  const navigation = useNavigation();

  useEffect(() => {
    console.log('=== NAVIGATION DEBUG ===');
    console.log('Full State:', JSON.stringify(navigationState, null, 2));

    // Count tab screens
    const tabNavigator = findTabNavigator(navigationState);
    if (tabNavigator) {
      console.log('Tab Navigator Found:', tabNavigator.routeNames);
      console.log('Tab Count:', tabNavigator.routeNames.length);
    }
  }, [navigationState]);

  if (!__DEV__) {
    return null; // Only show in development
  }

  const tabNavigator = findTabNavigator(navigationState);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.title}>Navigation Debugger</Text>

        <Text style={styles.section}>Tab Navigator Routes:</Text>
        {tabNavigator ? (
          <>
            <Text style={styles.count}>Count: {tabNavigator.routeNames.length}</Text>
            {tabNavigator.routeNames.map((name: string, i: number) => (
              <Text key={i} style={styles.route}>
                {i + 1}. {name}
              </Text>
            ))}
          </>
        ) : (
          <Text style={styles.error}>No tab navigator found</Text>
        )}

        <Text style={styles.section}>Current Route:</Text>
        <Text style={styles.route}>{getCurrentRoute(navigationState)?.name}</Text>

        <Text style={styles.section}>Full Structure:</Text>
        <Text style={styles.json}>
          {JSON.stringify(navigationState, null, 2)}
        </Text>
      </ScrollView>
    </View>
  );
}

function findTabNavigator(state: any): any {
  if (!state) return null;

  // Look for tab navigator in the state tree
  if (state.type === 'tab') {
    return state;
  }

  // Recursively search in routes
  if (state.routes) {
    for (const route of state.routes) {
      if (route.state) {
        const found = findTabNavigator(route.state);
        if (found) return found;
      }
    }
  }

  return null;
}

function getCurrentRoute(state: any): any {
  if (!state) return null;

  const route = state.routes[state.index];
  if (route.state) {
    return getCurrentRoute(route.state);
  }

  return route;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 10,
    width: 300,
    maxHeight: 500,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ff0000',
    zIndex: 9999,
  },
  scroll: {
    padding: 12,
  },
  title: {
    color: '#ff0000',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  section: {
    color: '#00ff00',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  count: {
    color: '#ffff00',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  route: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 8,
    marginBottom: 2,
  },
  error: {
    color: '#ff0000',
    fontSize: 12,
    fontStyle: 'italic',
  },
  json: {
    color: '#cccccc',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

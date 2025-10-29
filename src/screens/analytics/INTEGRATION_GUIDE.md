# Analytics Screen Integration Guide

## 🔗 Adding to Navigation

### Step 1: Import the Screen

In your navigation file (e.g., `/src/navigation/AppNavigator.tsx` or similar):

```typescript
import { AnalyticsScreen } from '@/screens/analytics';
```

### Step 2: Add to Navigator

#### For Bottom Tab Navigator
```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon name="home" color={color} />,
        }}
      />
      <Tab.Screen
        name="Food"
        component={FoodScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon name="restaurant" color={color} />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon name="bar-chart" color={color} />,
          tabBarLabel: 'Analytics',
        }}
      />
      {/* Other screens */}
    </Tab.Navigator>
  );
}
```

#### For Stack Navigator
```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          headerShown: true,
        }}
      />
      {/* Other screens */}
    </Stack.Navigator>
  );
}
```

### Step 3: Navigate to Analytics

From any screen:

```typescript
import { useNavigation } from '@react-navigation/native';

function SomeComponent() {
  const navigation = useNavigation();

  return (
    <Button
      title="View Analytics"
      onPress={() => navigation.navigate('Analytics')}
    />
  );
}
```

## 📱 Adding to Dashboard

### Quick Access Button

Add to your `DashboardScreen.tsx`:

```typescript
<Card elevation={2}>
  <Text variant="titleSmall">Insights</Text>
  <Text variant="body" color={colors.textSecondary}>
    View your nutrition trends and progress
  </Text>
  <Button
    title="View Analytics"
    variant="primary"
    onPress={() => navigation.navigate('Analytics')}
    containerStyle={{ marginTop: 16 }}
  />
</Card>
```

### Stats Preview with Link

```typescript
<TouchableOpacity
  onPress={() => navigation.navigate('Analytics')}
  style={styles.analyticsPreview}
>
  <View style={styles.previewContent}>
    <Text variant="titleSmall">7-Day Streak 🔥</Text>
    <Text variant="body" color={colors.textSecondary}>
      Tap to view detailed analytics
    </Text>
  </View>
  <Icon name="chevron-right" color={colors.textSecondary} />
</TouchableOpacity>
```

## 🎨 Customization Options

### Custom Theme Colors

If you want to override chart colors:

```typescript
// In AnalyticsScreen.tsx or via props
const customChartConfig = {
  ...getChartConfig(colors),
  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green instead of pink
};
```

### Custom Period Options

Add more period options:

```typescript
// In useNutritionTrends.ts
export type Period = 'week' | 'month' | '3months' | 'year' | 'custom';

// In AnalyticsService.ts
if (period === '3months') {
  startDate.setDate(startDate.getDate() - 90);
} else if (period === 'year') {
  startDate.setFullYear(startDate.getFullYear() - 1);
}
```

### Custom Goals Integration

If you have a user profile with goals:

```typescript
// Fetch user goals
const [profile, setProfile] = useState<UserProfile | null>(null);

useEffect(() => {
  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('daily_calories, daily_protein_g, daily_carbs_g')
      .eq('id', user.id)
      .single();

    setProfile(data);
  };
  loadProfile();
}, [user?.id]);

// Use in charts
const calorieGoal = profile?.daily_calories || 2000;
const proteinGoal = profile?.daily_protein_g || 150;
```

## 🔔 Notifications Integration

### Remind users to check analytics

```typescript
import * as Notifications from 'expo-notifications';

async function scheduleWeeklyAnalyticsReminder() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Weekly Insights Ready! 📊",
      body: "Check out your nutrition progress from this week",
      data: { screen: 'Analytics' },
    },
    trigger: {
      weekday: 1, // Monday
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });
}
```

## 🎯 Deep Linking

### Handle deep links to analytics

```typescript
// In your navigation configuration
const linking = {
  prefixes: ['mindfork://', 'https://mindfork.app'],
  config: {
    screens: {
      Analytics: 'analytics',
      // Other screens
    },
  },
};

// Now users can open: mindfork://analytics
```

## 📊 Analytics Events Tracking

### Track user engagement

```typescript
import * as Analytics from 'expo-analytics';

// In AnalyticsScreen.tsx
useEffect(() => {
  Analytics.logEvent('analytics_screen_viewed', {
    period: currentPeriod,
    hasData: data !== null,
  });
}, [currentPeriod]);

// Track period changes
const handlePeriodChange = (period: 'week' | 'month') => {
  Analytics.logEvent('analytics_period_changed', { period });
  setPeriod(period);
};

// Track chart interactions
const handleChartPress = (chartType: string) => {
  Analytics.logEvent('analytics_chart_viewed', { chartType });
};
```

## 🔄 Real-Time Updates

### Subscribe to food entry changes

```typescript
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

useEffect(() => {
  const subscription = supabase
    .channel('food-entries-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'food_entries',
        filter: `user_id=eq.${user?.id}`,
      },
      () => {
        // Refresh analytics when food entry is added/updated
        refresh();
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [user?.id]);
```

## 🎨 Custom Insights

### Add your own insight rules

```typescript
// In AnalyticsScreen.tsx or separate file
function generateCustomInsights(data: AnalyticsData): Insight[] {
  const insights: Insight[] = [];

  // Custom rule: Weekend vs weekday
  const weekendCalories = calculateWeekendAverage(data.dailyData);
  const weekdayCalories = calculateWeekdayAverage(data.dailyData);

  if (weekendCalories > weekdayCalories * 1.2) {
    insights.push({
      icon: '📅',
      text: 'You tend to eat 20% more on weekends. Consider planning ahead!',
    });
  }

  // Custom rule: Protein timing
  const morningProtein = calculateMorningProtein(data.dailyData);
  if (morningProtein < 20) {
    insights.push({
      icon: '🍳',
      text: 'Start your day with at least 20g protein for better energy.',
    });
  }

  return insights;
}
```

## 🚀 Performance Tips

### Lazy load charts

```typescript
import React, { Suspense, lazy } from 'react';

const LineChart = lazy(() => import('react-native-chart-kit').then(m => ({ default: m.LineChart })));

// In render
<Suspense fallback={<ActivityIndicator />}>
  <LineChart {...props} />
</Suspense>
```

### Optimize chart re-renders

```typescript
import { memo } from 'react';

const CalorieTrendChart = memo(({ data, colors }: Props) => {
  return <LineChart data={getCalorieTrendData(data, colors)} {...} />;
}, (prev, next) => {
  return prev.data === next.data; // Only re-render if data changes
});
```

## 🧪 Testing the Integration

### Manual Test Checklist

1. ✅ Navigate to Analytics from dashboard
2. ✅ Screen loads without errors
3. ✅ Charts display when data exists
4. ✅ Empty state shows when no data
5. ✅ Period selector switches views
6. ✅ Pull-to-refresh updates data
7. ✅ Back navigation works correctly
8. ✅ Theme applies correctly
9. ✅ Works in both orientations
10. ✅ Handles poor network gracefully

### Automated Tests

```typescript
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { AnalyticsScreen } from '../AnalyticsScreen';

test('renders analytics screen correctly', async () => {
  const { getByText } = render(<AnalyticsScreen />);

  await waitFor(() => {
    expect(getByText('Analytics')).toBeTruthy();
  });
});

test('switches period when button pressed', async () => {
  const { getByText } = render(<AnalyticsScreen />);

  const monthButton = getByText('30 Days');
  fireEvent.press(monthButton);

  await waitFor(() => {
    // Assert month data is loaded
  });
});
```

## 📝 Type Definitions

### Update Navigation Types

```typescript
// In types/navigation.ts
export type RootStackParamList = {
  Dashboard: undefined;
  Analytics: undefined; // Add this
  Food: undefined;
  // ... other screens
};

// Usage with typed navigation
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type AnalyticsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Analytics'
>;

const navigation = useNavigation<AnalyticsScreenNavigationProp>();
```

---

## ✅ Verification

After integration, verify:

1. **TypeScript**: `npm run typecheck` passes
2. **Linting**: `npm run lint` passes
3. **Build**: App builds successfully
4. **Runtime**: Screen loads and functions correctly
5. **Performance**: No lag when scrolling charts
6. **Memory**: No memory leaks detected

---

**Questions?** Check the main [README.md](./README.md) for detailed documentation.

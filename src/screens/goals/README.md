# Goals & Progress Tracking System

A comprehensive goal tracking system for the MindFork mobile app with custom goals, milestones, and achievements.

## Files Created

### Core Components

1. **`GoalsScreen.tsx`** - Main screen for displaying and managing goals
   - Active goals list with progress bars
   - Achievement badges display
   - Completed goals archive
   - Real-time updates via Supabase subscriptions
   - Pull-to-refresh functionality
   - Tab navigation (Active/Achievements/Completed)

2. **`CreateGoalModal.tsx`** - Modal for creating new goals
   - Goal type selector with 8 predefined types + custom
   - Target value and current value inputs
   - Timeframe picker (1 week to 6 months or ongoing)
   - Custom unit support for custom goals
   - Form validation

### Services & Hooks

3. **`/services/GoalsService.ts`** - Core business logic
   - CRUD operations for goals
   - Automatic progress calculation
   - Status determination (on_track, behind, ahead, completed)
   - Milestone management
   - Achievement tracking
   - Auto-sync with nutrition data

4. **`/hooks/useGoals.ts`** - React hook for goals management
   - Real-time goal updates
   - Computed values (activeGoals, completedGoals, totalProgress)
   - Create, update, delete operations
   - Achievement fetching
   - Error handling

### Type Definitions

5. **`/types/models.ts`** - Extended with goal types
   - `Goal` interface
   - `GoalMilestone` interface
   - `Achievement` interface
   - `CreateGoalInput` and `UpdateGoalInput` types
   - `GoalType`, `GoalStatus`, `GoalCategory` enums

## Features

### Goal Types

The system supports 8 predefined goal types plus custom:

1. **Weight** (⚖️) - Track weight loss/gain goals
   - Unit: lbs
   - Color: #FFA8D2 (pink)

2. **Calories** (🔥) - Daily calorie targets
   - Unit: kcal
   - Color: #FF9800 (orange)

3. **Protein** (💪) - Daily protein intake
   - Unit: g
   - Color: #4CAF50 (green)

4. **Water** (💧) - Hydration tracking
   - Unit: glasses
   - Color: #2196F3 (blue)

5. **Exercise** (🏃) - Exercise minutes
   - Unit: min
   - Color: #9C27B0 (purple)

6. **Sleep** (😴) - Sleep hours
   - Unit: hours
   - Color: #673AB7 (deep purple)

7. **Streak** (🔥) - Daily streak tracking
   - Unit: days
   - Color: #FF5722 (red)

8. **Custom** (🎯) - User-defined goals
   - Unit: customizable
   - Color: #607D8B (gray)

### Goal Status

Goals automatically update their status based on progress and timeline:

- **On Track** 🟦 - Making expected progress
- **Ahead** 🟢 - Exceeding expected progress
- **Behind** 🟠 - Falling behind schedule
- **Completed** ✅ - Goal achieved (100% progress)
- **Paused** ⏸️ - Temporarily paused

### Milestones

Each goal automatically gets 4 milestones:
- 25% Complete
- 50% Complete
- 75% Complete
- 100% Complete (Goal Complete!)

Milestones are tracked visually with colored dots:
- 🟢 Green = Achieved
- ⚪ Gray = Not yet achieved

### Achievements

Users earn achievements for completing goals:

- **First Goal Complete** 🏆 - Complete your first goal
- **Weight Goal Master** ⚖️ - Achieve your weight goal
- More achievements unlock as users progress

### Auto-Sync with Nutrition Data

Goals automatically sync with daily nutrition tracking:
- Calorie goals update when meals are logged
- Protein goals track daily protein intake
- Carbs and fat goals sync automatically
- Water goals can be manually updated

## Database Schema

### Required Tables

```sql
-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weight', 'calories', 'protein', 'carbs', 'fat', 'water', 'exercise', 'sleep', 'streak', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('weight', 'nutrition', 'hydration', 'exercise', 'sleep', 'habits', 'custom')),
  status TEXT NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track', 'behind', 'ahead', 'completed', 'paused')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  start_value NUMERIC,
  current_value NUMERIC NOT NULL,
  target_value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Goal milestones
CREATE TABLE goal_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  title TEXT,
  achieved BOOLEAN NOT NULL DEFAULT FALSE,
  achieved_date TIMESTAMPTZ
);

-- Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  category TEXT NOT NULL,
  earned_date TIMESTAMPTZ NOT NULL,
  criteria_met BOOLEAN NOT NULL DEFAULT TRUE,
  progress INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX idx_achievements_user_id ON achievements(user_id);

-- RLS Policies
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view milestones for their goals" ON goal_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_milestones.goal_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their achievements" ON achievements
  FOR SELECT USING (auth.uid() = user_id);
```

## Usage

### Importing Components

```typescript
import { GoalsScreen } from '@/screens/goals/GoalsScreen';
import { useGoals } from '@/hooks/useGoals';
```

### Basic Usage

```typescript
// In a screen or component
const MyComponent = () => {
  const {
    activeGoals,
    achievements,
    createGoal,
    updateProgress,
  } = useGoals();

  const handleCreateGoal = async () => {
    await createGoal({
      type: 'weight',
      category: 'weight',
      title: 'Lose 10 lbs',
      target_value: 10,
      current_value: 0,
      unit: 'lbs',
      target_date: '2024-06-01',
    });
  };

  // Update progress
  const handleUpdateProgress = async (goalId: string, value: number) => {
    await updateProgress(goalId, value);
  };

  return (
    <View>
      {activeGoals.map(goal => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </View>
  );
};
```

### Auto-Sync with Nutrition

```typescript
import { GoalsService } from '@/services/GoalsService';

// After logging a meal or updating nutrition
const syncGoals = async (userId: string, dailyStats: DailyStats) => {
  await GoalsService.syncGoalsWithNutrition(userId, {
    total_calories: dailyStats.total_calories,
    total_protein: dailyStats.total_protein,
    total_carbs: dailyStats.total_carbs,
    total_fat: dailyStats.total_fat,
  });
};
```

## Navigation Integration

Add to your navigation stack:

```typescript
// In your navigation configuration
import { GoalsScreen } from '@/screens/goals/GoalsScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator>
      {/* ... other screens */}
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ title: 'Goals & Progress' }}
      />
    </Stack.Navigator>
  );
}
```

## Customization

### Adding Custom Goal Types

Edit `CreateGoalModal.tsx` and add to `GOAL_OPTIONS`:

```typescript
{
  type: 'steps',
  category: 'exercise',
  label: 'Daily Steps',
  icon: '👟',
  unit: 'steps',
  color: '#00BCD4',
}
```

### Custom Achievement Logic

Edit `GoalsService.checkAchievements()` to add custom achievement criteria:

```typescript
// Check for specific milestone
if (goal.type === 'streak' && goal.current_value >= 30) {
  await this.awardAchievement(userId, {
    title: '30-Day Streak',
    description: 'Logged for 30 consecutive days',
    icon: '🔥',
    color: '#FF5722',
    category: 'streaks',
  });
}
```

### Custom Status Determination

Modify `GoalsService.determineGoalStatus()` to customize how status is calculated based on your app's needs.

## Testing

### Unit Tests

```bash
npm run test -- GoalsService.test.ts
npm run test -- useGoals.test.ts
```

### Integration Tests

```bash
npm run test:integration -- goals.integration.test.ts
```

## Performance Considerations

1. **Real-time Updates**: Uses Supabase subscriptions for instant updates
2. **Optimistic Updates**: UI updates immediately, syncs in background
3. **Caching**: Hook caches goals to reduce database queries
4. **Debouncing**: Progress updates debounced to prevent excessive writes

## Troubleshooting

### Goals not showing up
- Check Supabase RLS policies are enabled
- Verify user is authenticated
- Check network connection

### Progress not updating
- Ensure `syncGoalsWithNutrition` is called after meal logging
- Check goal type matches nutrition data type
- Verify goal status is 'active'

### Achievements not unlocking
- Check achievement criteria in `GoalsService.checkAchievements()`
- Verify goal is marked as completed (progress = 100%)
- Check database for duplicate achievements

## Future Enhancements

- [ ] Goal templates (pre-configured popular goals)
- [ ] Social sharing of achievements
- [ ] Goal reminders and notifications
- [ ] Advanced analytics and trends
- [ ] Team/group goals
- [ ] Import goals from web app
- [ ] Export goal data (CSV/PDF)
- [ ] Goal history and analytics
- [ ] AI-powered goal recommendations
- [ ] Integration with wearables (Apple Health, Google Fit)

## Contributing

When adding new features:
1. Update type definitions in `/types/models.ts`
2. Add service methods in `GoalsService.ts`
3. Update hook in `useGoals.ts`
4. Update UI components as needed
5. Add tests for new functionality
6. Update this README

## License

Copyright 2024 MindFork. All rights reserved.

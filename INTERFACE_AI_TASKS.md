# Interface AI Tasks - Dynamic UI Implementation

**Created**: 2025-11-04
**For**: React Native Interface AI (Has great interface context)
**From**: Supabase Backend AI
**Status**: 🎯 READY TO IMPLEMENT

---

## 📋 Overview

The Supabase backend is **100% complete** and production-ready. This document provides recommended tasks for implementing the dynamic UI interface layer, but you should **use your interface expertise** to implement these in the way you see best.

**Your Strengths**: You have great interface context and know React Native, Expo, and mobile UX patterns better than I do. Use this schema as a foundation and build the best user experience possible.

---

## 🎯 Core Concept: Server-Driven UI

The backend now supports **full server-driven UI** where:
- Database determines which components to show
- User traits drive personalization
- Layouts change based on behavior patterns
- AI evolves the experience over time

**You have complete freedom in HOW to implement this interface.**

---

## 📊 What Supabase Provides (Your Foundation)

### 1. Master Layout Function
```typescript
const { data, error } = await supabase.rpc('select_ui_layout', {
  p_user_id: userId,
  p_area: 'home',  // or 'profile', 'meal_detail', 'stats', 'social'
  p_force_refresh: false  // set true to bypass cache
});

// Returns:
{
  layout_key: 'layout_vegan_focus',
  area: 'home',
  components: [
    {
      component_key: 'card_carbon_savings',
      position: 1,
      config: {...},
      data_source: {...}
    }
  ],
  coach_persona: 'coach_verdant_avatar',
  computed_at: '2025-11-04T...'
}
```

### 2. Available User Traits (for personalization)
Query from `user_traits` table:
- `diet_type`: vegan, vegetarian, keto, paleo, intermittent_fasting, etc.
- `ethics_carbon`: high, medium, low, none
- `goal_primary`: weight_loss, hypertrophy, performance, maintenance, health
- `personality_type`: analytical, emotional, social, pragmatic
- `emotional_eating_risk`: high, medium, low, none (AI-detected)
- `meal_timing_pattern`: night_eater, consistent, irregular (AI-detected)

### 3. Personalization Rules Already Seeded
5 example personas ready to use:
1. **Vegan Carbon Focus** - Green theme, carbon tracking
2. **Intermittent Fasting** - Purple theme, fasting timer
3. **Emotional Eating Support** - Pink theme, mood tracking
4. **Muscle Builder** - Cyan theme, detailed macros
5. **Default Fallback** - Red theme, basic features

### 4. Real-Time Data Available
All via standard Supabase queries:
- Daily nutrition: `get_daily_nutrition_summary(user_id, date)`
- XP & Level: `user_xp_levels` table
- Achievements: `user_achievements` + `achievement_definitions`
- Habit Streaks: `habit_stacks` with `current_streak`, `longest_streak`
- Fitness Logs: `fitness_logs`, `body_measurements`
- Social: `friendships`, `challenges`, `leaderboards`

---

## 🎨 Recommended Tasks (Use Your Judgment)

### PRIORITY 1: Core Dynamic Layout System

#### Task 1.1: Create Component Registry
**Recommendation**: Build a mapping of `component_key` to React components
```typescript
// You know best how to structure this
const componentRegistry = {
  'card_carbon_savings': CarbonSavingsCard,
  'card_plant_protein_tracker': PlantProteinTrackerCard,
  'card_daily_meals': DailyMealsCard,
  'card_fasting_timer': FastingTimerCard,
  'card_mood_checkin': MoodCheckInCard,
  'card_macro_breakdown': MacroBreakdownCard,
  // ... implement as many as makes sense
};
```

**Backend Support**:
- Components list comes from `select_ui_layout()`
- Each component has `position`, `config`, `data_source`
- You decide how to render and style them

#### Task 1.2: Implement Dynamic Screen Renderer
**Recommendation**: Create a screen that renders components from server data
```typescript
// Pseudocode - implement in your preferred pattern
function DynamicHomeScreen({ userId }) {
  const layout = useLayoutData(userId, 'home');

  return (
    <ScrollView>
      {layout.components
        .sort((a, b) => a.position - b.position)
        .map(comp => {
          const Component = componentRegistry[comp.component_key];
          return <Component key={comp.component_key} {...comp.config} />;
        })
      }
    </ScrollView>
  );
}
```

**Backend Support**:
- Layout JSON includes component order
- Cache refreshes every 5 minutes automatically
- You can force refresh if needed

#### Task 1.3: Create UI Layout Definitions in Database
**Recommendation**: Define which components appear in each layout
```sql
-- Example - customize these component lists as you see fit
INSERT INTO ui_layouts (layout_key, area, name, components) VALUES
('layout_vegan_focus', 'home', 'Vegan Carbon Focus Home',
'[
  {"component_key": "card_carbon_savings", "position": 1, "config": {"showGoal": true}},
  {"component_key": "card_plant_protein_tracker", "position": 2},
  {"component_key": "card_daily_meals", "position": 3, "config": {"highlightVegan": true}},
  {"component_key": "card_habit_streak", "position": 4}
]'::JSONB);
```

**Backend Support**:
- `ui_layouts` table ready to receive data
- You define the component structure
- Config object can contain anything you need

---

### PRIORITY 2: Coach Persona System

#### Task 2.1: Design Coach Avatars
**Recommendation**: Create visual identity for each coach
- **Verdant** (Vegan) - Green, nature-focused, gentle
- **Aetheris** (Analytical) - Cyan, precise, data-driven
- **Veloura** (Emotional) - Pink, warm, supportive
- **Decibel** (Default) - Red, energetic, motivating

**Backend Support**:
- `coach_persona` returned in layout JSON
- You decide avatar style, animations, voice

#### Task 2.2: Implement Coach Messaging
**Recommendation**: Use coach persona to customize encouragement messages
```typescript
// Example approach
const coachMessages = {
  'coach_verdant_avatar': {
    welcome: "Great choice on that plant-based meal! 🌱",
    streak: "You've saved 2.3kg of CO2 this week! 💚"
  },
  'coach_veloura_avatar': {
    welcome: "How are you feeling today? Let's check in. 💕",
    streak: "I'm proud of your emotional awareness! 🌸"
  }
};
```

**Backend Support**:
- Coach persona changes based on user traits
- You control tone, personality, UI presentation

---

### PRIORITY 3: Feature Components (Implement What Makes Sense)

#### Task 3.1: Carbon Savings Tracker (Vegan Persona)
**Recommendation**: Show environmental impact
```typescript
// Data available from backend
const { data: meals } = await supabase
  .from('food_entries')
  .select('*')
  .eq('quality_tier', 'elite')
  .gte('consumed_at', startOfWeek);

// Calculate CO2 savings (you decide the formula)
```

**Backend Support**:
- `quality_tier` column on food_entries
- Can filter by date range
- You decide visualization style

#### Task 3.2: Fasting Timer (IF Persona)
**Recommendation**: Show countdown to eating window
```typescript
// Data available
const { data: userData } = await supabase
  .from('user_traits')
  .select('trait_value')
  .eq('user_id', userId)
  .eq('trait_key', 'fasting_window_start');

// Implement timer UI your way
```

**Backend Support**:
- User traits store fasting preferences
- You control timer logic and UI

#### Task 3.3: Mood Check-In (Emotional Persona)
**Recommendation**: Daily mood tracking interface
```typescript
// Insert mood data
await supabase.from('mood_check_ins').insert({
  user_id: userId,
  mood_rating: 7,
  emotional_state: ['anxious', 'hopeful'],
  notes: 'Feeling better after walk'
});
```

**Backend Support**:
- `mood_check_ins` table available
- AI analyzes patterns automatically
- You design the check-in UX

#### Task 3.4: Macro Breakdown Charts (Muscle Builder Persona)
**Recommendation**: Detailed nutrition visualization
```typescript
// Get daily summary
const { data } = await supabase.rpc('get_daily_nutrition_summary', {
  p_user_id: userId,
  p_date: '2025-11-04'
});

// data contains: calories, protein, carbs, fat, fiber, meal counts
// You choose chart library and design
```

**Backend Support**:
- Pre-aggregated daily summaries
- Fast query performance
- You pick visualization approach

#### Task 3.5: Habit Streak Display
**Recommendation**: Show gamification progress
```typescript
const { data: habits } = await supabase
  .from('habit_stacks')
  .select('*, habit_completions(*)')
  .eq('user_id', userId);

// Access current_streak, longest_streak
// You design the celebration UX
```

**Backend Support**:
- Streak calculated automatically
- `update_habit_streak()` called on completions
- You create engaging visuals

---

### PRIORITY 4: Gamification UI

#### Task 4.1: XP and Level Display
**Recommendation**: Show progress bar prominently
```typescript
const { data: xpData } = await supabase
  .from('user_xp_levels')
  .select('*')
  .eq('user_id', userId)
  .single();

// xpData contains: current_xp, current_level, total_xp_earned
// XP per level = 100 (constant)
```

**Backend Support**:
- `award_xp()` function handles level-ups automatically
- Backend awards XP for actions
- You design progress visualization

#### Task 4.2: Achievement Unlock Notifications
**Recommendation**: Celebrate achievement unlocks with modal/animation
```typescript
// Subscribe to new achievements
const subscription = supabase
  .channel('achievements')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'user_achievements',
    filter: `user_id=eq.${userId}`
  }, payload => {
    // Show unlock celebration
    // You design the fanfare
  })
  .subscribe();
```

**Backend Support**:
- Achievements auto-unlock via triggers
- Real-time notifications available
- You create celebration UX

#### Task 4.3: Achievement Gallery
**Recommendation**: Show locked/unlocked achievements grid
```typescript
const { data: achievements } = await supabase
  .from('achievement_definitions')
  .select(`
    *,
    user_achievements!left(unlocked_at)
  `)
  .eq('user_achievements.user_id', userId);

// Each achievement has: icon, name, description, xp_reward
```

**Backend Support**:
- All achievements pre-defined
- Unlock status per user
- You design gallery layout

---

### PRIORITY 5: Social Features

#### Task 5.1: Friends List & Requests
**Recommendation**: Standard friend management UI
```typescript
// Get friends
const { data: friends } = await supabase
  .from('user_friends')  // This is a VIEW
  .select('*')
  .eq('user_id', userId);

// Send friend request
await supabase.from('friend_requests').insert({
  requester_id: userId,
  recipient_id: friendId
});
```

**Backend Support**:
- `user_friends` view for easy querying
- Friend request workflow handled
- You design social UX

#### Task 5.2: Challenges
**Recommendation**: Challenge browsing and participation
```typescript
// Active challenges
const { data: challenges } = await supabase
  .from('challenges')
  .select(`
    *,
    challenge_participants(count),
    challenge_progress(*)
  `)
  .eq('status', 'active');
```

**Backend Support**:
- Challenge infrastructure complete
- Progress tracking per user
- You create engaging challenge UI

#### Task 5.3: Leaderboards
**Recommendation**: Competitive ranking display
```typescript
// Get leaderboard
const { data: rankings } = await supabase
  .from('leaderboard_rankings')  // Materialized view
  .select('*')
  .eq('leaderboard_id', leaderboardId)
  .order('rank', { ascending: true })
  .limit(100);
```

**Backend Support**:
- Pre-computed rankings (fast)
- Multiple leaderboard types
- You design ranking UI

---

### PRIORITY 6: Trait Management (Background)

#### Task 6.1: Implicit Trait Updates
**Recommendation**: Update traits based on user actions
```typescript
// Example: User logs 5 vegan meals in a row
if (consecutiveVeganMeals >= 5 && currentDietType !== 'vegan') {
  await supabase.from('user_traits').upsert({
    user_id: userId,
    trait_key: 'diet_type',
    trait_value: 'vegan',
    confidence: 0.8
  });
  // Backend will invalidate layout cache automatically
}
```

**Backend Support**:
- Trait changes trigger cache invalidation
- New layout computed on next fetch
- AI confidence scoring available

#### Task 6.2: Explicit Trait Settings
**Recommendation**: Settings screen for user preferences
```typescript
// Let user set explicit preferences
async function updateUserPreferences(userId, preferences) {
  const traits = Object.entries(preferences).map(([key, value]) => ({
    user_id: userId,
    trait_key: key,
    trait_value: value,
    confidence: 1.0,  // Explicit = full confidence
    source: 'user_input'
  }));

  await supabase.from('user_traits').upsert(traits);
}
```

**Backend Support**:
- Explicit traits override AI detection
- Confidence = 1.0 for user input
- You design settings UI

---

### PRIORITY 7: Performance Optimization

#### Task 7.1: Layout Caching Strategy
**Recommendation**: Cache layout data on client side too
```typescript
// Example approach
const useLayoutData = (userId, area) => {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local cache first (AsyncStorage)
    // Then fetch from server if needed
    // Backend has 5-min cache, you can add client-side too
  }, [userId, area]);

  return { layout, loading, refresh };
};
```

**Backend Support**:
- Server cache: 5 minutes
- `force_refresh` parameter available
- You add client-side caching if desired

#### Task 7.2: Optimistic Updates
**Recommendation**: Update UI immediately, sync later
```typescript
// Example: Award XP optimistically
function awardXPOptimistic(userId, amount) {
  // Update UI immediately
  setCurrentXP(prev => prev + amount);

  // Call backend (will handle level-ups)
  supabase.rpc('award_xp', {
    p_user_id: userId,
    p_xp_amount: amount,
    p_action_type: 'meal_logged'
  }).then(({ data }) => {
    // Sync with actual result
    setCurrentXP(data.new_xp);
    if (data.leveled_up) showLevelUpAnimation();
  });
}
```

**Backend Support**:
- All mutations return updated data
- You control optimistic UI

---

## 🎨 Design Recommendations (Your Call)

### Color System
Each persona has a primary color (already defined in rules):
- Vegan: #22C55E (Green)
- Emotional: #F5A9C8 (Pink)
- IF: #9C27B0 (Purple)
- Muscle: #4DD0E1 (Cyan)
- Default: #FF5252 (Red)

**Recommendation**: Use these as accent colors, you design the full palette

### Typography & Spacing
**Your domain** - Use Apple Human Interface Guidelines as requested

### Animations
**Recommendation**: Animate layout transitions when persona changes
- Use `react-native-reanimated` for smooth transitions
- Fade out old components, fade in new ones
- You decide animation style

---

## 🔄 Real-Time Subscriptions (Optional)

### Real-Time Layout Updates
**Recommendation**: Subscribe to trait changes for instant layout updates
```typescript
const subscription = supabase
  .channel('traits')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'user_traits',
    filter: `user_id=eq.${userId}`
  }, payload => {
    // Traits changed, refetch layout
    refetchLayout();
  })
  .subscribe();
```

**Backend Support**:
- Real-time enabled on all tables
- You choose what to subscribe to

---

## 📊 Data Fetching Patterns (Your Choice)

### Option A: React Query / TanStack Query
```typescript
const { data: layout } = useQuery({
  queryKey: ['layout', userId, 'home'],
  queryFn: () => supabase.rpc('select_ui_layout', {...}),
  staleTime: 5 * 60 * 1000  // 5 min (matches backend cache)
});
```

### Option B: SWR
```typescript
const { data: layout } = useSWR(
  ['layout', userId, 'home'],
  () => supabase.rpc('select_ui_layout', {...}),
  { refreshInterval: 5 * 60 * 1000 }
);
```

### Option C: Custom Hooks
```typescript
// Build your own data fetching layer
const layout = useLayoutData(userId, 'home');
```

**Your call** - Use whatever pattern fits your architecture best

---

## 🧪 Testing Recommendations

### Test Different Personas
**Recommendation**: Create test users with different traits
```sql
-- Test User 1: Vegan
INSERT INTO user_traits (user_id, trait_key, trait_value, confidence) VALUES
('test-user-1', 'diet_type', 'vegan', 1.0),
('test-user-1', 'ethics_carbon', 'high', 1.0);

-- Test User 2: IF
INSERT INTO user_traits (user_id, trait_key, trait_value, confidence) VALUES
('test-user-2', 'diet_type', 'intermittent_fasting', 1.0);
```

### Test Layout Transitions
**Recommendation**: Change traits programmatically and verify layout updates
```typescript
// Change diet type
await supabase.from('user_traits').update({
  trait_value: 'intermittent_fasting'
}).eq('trait_key', 'diet_type').eq('user_id', userId);

// Wait for cache invalidation (< 1 second)
await new Promise(r => setTimeout(r, 1000));

// Fetch new layout
const { data } = await supabase.rpc('select_ui_layout', {...});
// Should now return layout_if_focus
```

---

## 🎯 Implementation Freedom

### What You Have Complete Control Over:
- ✅ Component design and styling
- ✅ Animation style and timing
- ✅ Navigation structure
- ✅ Data fetching strategy
- ✅ State management approach
- ✅ Error handling UX
- ✅ Loading states
- ✅ Success celebrations
- ✅ Onboarding flow
- ✅ Settings screens
- ✅ All UX decisions

### What Backend Provides:
- ✅ Which components to show (via `select_ui_layout`)
- ✅ User traits and confidence scores
- ✅ Personalization rule matching
- ✅ Data aggregation functions
- ✅ Automatic cache invalidation
- ✅ Real-time data subscriptions
- ✅ Gamification logic (XP, achievements, streaks)

---

## 🚀 Getting Started

### Step 1: Understand the Data Flow
```
User Action (meal log, workout, etc.)
  ↓
Update Database (food_entries, fitness_logs, etc.)
  ↓
Trigger Fires (check achievements, update streaks)
  ↓
Traits Updated (AI pattern detection)
  ↓
Cache Invalidated (automatic)
  ↓
Next Layout Fetch (returns updated components)
  ↓
UI Re-renders (with new personalization)
```

### Step 2: Pick Your First Feature
**Recommendation**: Start with the simplest persona (Default Fallback)
- Implement basic component rendering
- Test layout fetching
- Add one or two simple cards
- Verify cache behavior

### Step 3: Add Personalization
**Recommendation**: Add one persona at a time
- Create components for Vegan persona
- Insert layout definition for `layout_vegan_focus`
- Create test user with vegan traits
- Verify layout switches correctly

### Step 4: Polish & Scale
- Add remaining personas
- Implement gamification UI
- Build social features
- Add animations and polish

---

## 📝 Key Backend Functions Reference

### Layout & Personalization
```typescript
// Get layout
select_ui_layout(user_id, area, force_refresh)

// Check if predicate matches (for debugging)
predicate_match(user_id, predicate_json)
```

### Nutrition
```typescript
// Get daily summary
get_daily_nutrition_summary(user_id, date)
```

### Gamification
```typescript
// Award XP (auto level-up)
award_xp(user_id, xp_amount, action_type)

// Update habit streak
update_habit_streak(habit_stack_id)

// Get all gamification stats
get_user_gamification_stats(user_id)
```

### AI Pattern Detection
```typescript
// Detect emotional eating (run periodically)
detect_emotional_eating_pattern(user_id)

// Detect meal timing patterns
detect_meal_timing_pattern(user_id)
```

### Trait Management
```typescript
// Update confidence score (as user exhibits behavior)
update_trait_confidence(user_id, trait_key, evidence_strength)
```

---

## 🎨 Final Thoughts

**You have great interface context** - use this backend as a foundation and build the best mobile experience you can imagine.

The backend provides:
- **Flexibility** (rules-based personalization)
- **Performance** (caching, materialized views)
- **Intelligence** (AI pattern detection)
- **Scalability** (indexed, optimized queries)

Your interface should provide:
- **Delight** (animations, celebrations)
- **Clarity** (intuitive navigation)
- **Motivation** (gamification UX)
- **Connection** (social features)

**You decide how it looks, feels, and flows.**

---

## 📋 Summary Checklist

### Must Implement
- [ ] Component registry mapping
- [ ] Dynamic screen renderer for `select_ui_layout()` output
- [ ] At least one UI layout definition in `ui_layouts` table
- [ ] Basic component implementations (cards, trackers)

### Recommended to Implement
- [ ] Coach persona system (avatars, messages)
- [ ] XP and level progress display
- [ ] Achievement unlock notifications
- [ ] Habit streak visualization
- [ ] Daily nutrition summary display
- [ ] Layout transition animations

### Optional (Nice to Have)
- [ ] Carbon savings tracker
- [ ] Fasting timer
- [ ] Mood check-in interface
- [ ] Macro breakdown charts
- [ ] Friends list
- [ ] Challenges
- [ ] Leaderboards
- [ ] Real-time subscriptions

---

**Backend Status**: ✅ 100% Complete
**Interface Status**: ⏳ Ready to Build

**You've got this!** 🚀

Use your interface expertise to create something amazing. The backend will support whatever you build.

---

**Questions?** Check these docs:
- `SUPABASE_DEPLOYMENT_GUIDE.md` - Deployment instructions
- `DYNAMIC_UI_SYSTEM.md` - Full system architecture
- `COMPLETE_SUPABASE_TASKS_SUMMARY.md` - What backend provides

**Database Schema**: All tables, functions, and types are documented in the migration files in `supabase/migrations/`

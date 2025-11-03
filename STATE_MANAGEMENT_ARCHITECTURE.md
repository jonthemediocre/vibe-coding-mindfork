# State Management & Persistence Strategy - MindFork App

**Date:** 2025-11-02
**Status:** Hybrid Approach (Supabase Primary + Local Caching)

---

## 📊 Current State Management Architecture

### **Primary Strategy: Supabase (PostgreSQL) for Persistence**

The app uses **Supabase as the source of truth** for all critical user data:
- ✅ User profiles
- ✅ Food entries
- ✅ Fasting sessions
- ✅ Meal plans
- ✅ AI coach messages (after our fix)
- ✅ Goals and achievements
- ✅ Subscriptions

### **Secondary Strategy: AsyncStorage for Local Caching & UI State**

The app uses **React Native AsyncStorage** for:
- Temporary caching (performance optimization)
- UI preferences (theme, selected coach)
- Offline-first features (shopping lists)
- Short-lived data (step counts for current day)

### **Zustand Status: Available but NOT Actively Used**

**Installed:** Yes (`zustand@5.0.8` in package.json line 128)
**Used:** No - Only an example file exists
**Location:** `/src/state/rootStore.example.ts` (template only)

---

## 🔍 What We're Actually Using

### **1. Supabase (Primary Database) - 95% of Data**

**Where:** All service files (`src/services/*.ts`)

**What's Stored:**
```typescript
// Examples from the codebase:
- CoachService → messages table (AI conversations)
- FoodService → food_entries, favorite_foods tables
- FastingService → fasting_sessions table
- MealPlanningService → meal_plans, meal_plan_entries tables
- ProfileService → profiles, user_settings tables
```

**Benefits:**
- ✅ Automatic sync across devices
- ✅ Real-time updates
- ✅ Row Level Security (RLS)
- ✅ Relational integrity
- ✅ Backup & restore built-in

---

### **2. AsyncStorage (Local Cache) - 5% of Data**

**Where:** 19 locations across the codebase

**Active Usage Breakdown:**

#### **A. Theme Preferences (UI State)**
```typescript
// ThemeProvider.tsx - lines 163, 182
await AsyncStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
```
**Why AsyncStorage:** Theme is UI preference, doesn't need sync

---

#### **B. Selected Coach (UI State)**
```typescript
// CoachScreen.tsx - lines 101, 153
await AsyncStorage.setItem(SELECTED_COACH_KEY, coachId);
```
**Why AsyncStorage:** Quick load on app start, doesn't need database

---

#### **C. Step Counter (Daily Volatile Data)**
```typescript
// useStepCounter.ts - lines 112-149
await AsyncStorage.setItem(STORAGE_KEYS.STEPS_COUNT, stepCount.toString());
await AsyncStorage.setItem(STORAGE_KEYS.STEPS_DATE, today);
```
**Why AsyncStorage:** Changes every second, syncs to DB at day end only

---

#### **D. Shopping Lists (Offline-First)**
```typescript
// MealPlanningService.ts - lines 676, 693
await AsyncStorage.setItem(`@mindfork:shopping_list:${userId}`, JSON.stringify(data));
```
**Why AsyncStorage:**
- Offline grocery shopping support
- Checkbox states update constantly
- Syncs back to server periodically

---

#### **E. Analytics Cache (Performance)**
```typescript
// AnalyticsService.ts - lines 311, 352
await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
```
**Why AsyncStorage:** Dashboard loads fast with cached data, refreshes in background

---

#### **F. Subscription Cache (Performance)**
```typescript
// useSubscription.ts - lines 46, 69
await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
```
**Why AsyncStorage:** Prevents unnecessary Stripe API calls

---

#### **G. Profile Cache (Performance)**
```typescript
// ProfileService.ts - lines 239, 265
await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheEntry));
```
**Why AsyncStorage:** App starts faster with cached profile

---

#### **H. Secure Storage Fallback (Security)**
```typescript
// secureStorage.ts - lines 39, 59
// Falls back to AsyncStorage when SecureStore unavailable
await AsyncStorage.setItem(key, value);
```
**Why AsyncStorage:** Fallback for web platform (SecureStore iOS/Android only)

---

## 🤔 Should We Use Zustand?

### **Current Assessment: NO IMMEDIATE NEED**

**Why Zustand isn't used:**

1. **Supabase + React Context Already Cover Most Needs**
   - AuthContext manages auth state globally
   - ProfileContext manages user profile globally
   - React hooks (useState, useEffect) handle local component state
   - Supabase handles data persistence

2. **AsyncStorage Works Well for Simple Cache**
   - No complex state management needed
   - Simple get/set operations
   - Keys are scoped with prefixes (`@mindfork:`)

3. **No Complex Client-Side State Management Required**
   - App is server-centric (Supabase is source of truth)
   - Most "state" is just fetched data from database
   - UI state is minimal (theme, selected coach)

---

### **When You WOULD Need Zustand**

Consider adding Zustand if you implement these features:

#### **1. Offline-First Mode**
```typescript
// If implementing full offline support with conflict resolution:
interface OfflineStore {
  pendingSync: FoodEntry[];     // Local edits waiting to sync
  conflictQueue: Conflict[];    // Sync conflicts to resolve
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
}
```

#### **2. Complex Real-Time Collaboration**
```typescript
// If multiple users edit shared meal plans:
interface CollaborationStore {
  activeUsers: User[];          // Who's viewing this meal plan
  lockState: Record<string, string>; // Which meals are being edited
  pendingChanges: Change[];     // Optimistic UI updates
}
```

#### **3. Advanced Shopping List with Complex State**
```typescript
// If shopping list gets categorization, price tracking, etc:
interface ShoppingListStore {
  items: ShoppingItem[];
  categories: Category[];
  filters: FilterState;
  sortOrder: SortConfig;
  priceTotal: number;
  suggestions: string[];
}
```

#### **4. Multi-Step Forms with Undo/Redo**
```typescript
// If building complex multi-screen workflows:
interface FormStore {
  currentStep: number;
  formData: Record<string, any>;
  history: FormState[];         // For undo/redo
  validationErrors: Record<string, string[]>;
}
```

---

## ✅ Recommended Approach (Current)

### **Keep Using: Supabase + AsyncStorage**

**For 90% of data:**
```typescript
// Services already follow this pattern:
class FoodService {
  static async addFoodEntry(data: FoodEntry) {
    // Write directly to Supabase
    const { data, error } = await supabase
      .from('food_entries')
      .insert(data);

    return { data, error };
  }
}
```

**For UI state & cache:**
```typescript
// Components use AsyncStorage directly:
const [selectedCoach, setSelectedCoach] = useState<string>();

useEffect(() => {
  AsyncStorage.getItem('SELECTED_COACH').then(setSelectedCoach);
}, []);
```

**For global auth:**
```typescript
// React Context (already implemented):
<AuthContext.Provider value={{ user, session, signIn, signOut }}>
  <App />
</AuthContext.Provider>
```

---

## 🚀 When to Add Zustand (Future)

### **Trigger Conditions:**

Add Zustand if you implement **ANY** of these:

1. ✅ **Offline mode** - Need to queue changes and sync later
2. ✅ **Real-time collaboration** - Multiple users editing same data
3. ✅ **Complex form state** - Multi-step wizards with undo/redo
4. ✅ **Advanced client-side logic** - Shopping list with categories, filters, sorting
5. ✅ **Frequent cross-component state updates** - More than 3 components need same state

### **How to Add Zustand (If Needed):**

```typescript
// Example: Shopping list with Zustand + AsyncStorage persistence
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ShoppingListStore {
  items: ShoppingItem[];
  checkedItems: Set<string>;

  // Actions
  addItem: (item: ShoppingItem) => void;
  toggleCheck: (itemId: string) => void;
  clearCompleted: () => void;
}

export const useShoppingListStore = create<ShoppingListStore>()(
  persist(
    (set, get) => ({
      items: [],
      checkedItems: new Set(),

      addItem: (item) =>
        set({ items: [...get().items, item] }),

      toggleCheck: (itemId) =>
        set((state) => {
          const newChecked = new Set(state.checkedItems);
          if (newChecked.has(itemId)) {
            newChecked.delete(itemId);
          } else {
            newChecked.add(itemId);
          }
          return { checkedItems: newChecked };
        }),

      clearCompleted: () =>
        set((state) => ({
          items: state.items.filter(item => !state.checkedItems.has(item.id)),
          checkedItems: new Set()
        }))
    }),
    {
      name: 'shopping-list-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## 📋 Current Architecture Summary

```
┌─────────────────────────────────────────┐
│         MindFork App Architecture       │
└─────────────────────────────────────────┘

┌─────────────────┐
│   UI Layer      │
│  (React Native) │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Context  │  AuthContext, ProfileContext
    │ (Global) │  ThemeContext
    └────┬─────┘
         │
    ┌────▼─────────────┐
    │   Hooks          │  useFoodTracking, useFastingTimer
    │  (Local State)   │  useMealPlanning, useCoachContext
    └────┬─────────────┘
         │
    ┌────▼──────────────────────┐
    │      Services             │
    │  (Business Logic)         │
    │  - FoodService            │
    │  - MealPlanningService    │
    │  - CoachService           │
    │  - FastingService         │
    └──┬──────────────────┬─────┘
       │                  │
┌──────▼────────┐   ┌─────▼─────────┐
│   Supabase    │   │  AsyncStorage │
│  (PostgreSQL) │   │   (Cache)     │
│               │   │               │
│ SOURCE OF     │   │ UI Prefs      │
│ TRUTH         │   │ Temp Cache    │
│               │   │ Offline Data  │
│ 95% of data   │   │ 5% of data    │
└───────────────┘   └───────────────┘

┌─────────────────────────────────────────┐
│  Zustand: NOT CURRENTLY USED            │
│  (Available if needed in future)        │
└─────────────────────────────────────────┘
```

---

## 🎯 Bottom Line

### **Do We Have Zustand?**
✅ Yes - Installed (`zustand@5.0.8`)

### **Should We Use Zustand?**
❌ No - Not needed currently

### **What Are We Using?**
1. **Supabase (PostgreSQL)** - Primary database (95% of data)
2. **AsyncStorage** - Local cache & UI preferences (5% of data)
3. **React Context** - Global state (auth, profile, theme)
4. **React Hooks** - Local component state

### **When to Add Zustand?**
Only if implementing:
- Offline mode with sync queue
- Real-time collaboration
- Complex client-side state management
- Multi-step forms with undo/redo

---

## 📚 Related Files

**Zustand Example:**
- `/src/state/rootStore.example.ts` - Template for future Zustand stores

**Current Persistence:**
- `/src/services/` - All use Supabase directly
- `/src/contexts/AuthContext.tsx` - React Context for auth
- `/src/contexts/ProfileContext.tsx` - React Context for profile
- `/src/utils/secureStorage.ts` - Secure storage with AsyncStorage fallback

**Package Configuration:**
- `/package.json` - Has zustand@5.0.8 installed

---

**Summary:** Your app uses a **server-first architecture** with Supabase as the source of truth. Zustand is installed but not needed yet. The current approach is clean, simple, and production-ready. Add Zustand only if you need complex offline support or real-time collaboration features.

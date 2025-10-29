/**
 * Test Data Factories
 * Centralized factory functions for creating test data
 */

import type { Session, User } from '@supabase/supabase-js';

// User Factory
export const userFactory = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2025-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {
    name: 'Test User',
    ...overrides.user_metadata,
  },
  ...overrides,
});

// Session Factory
export const sessionFactory = (overrides: Partial<Session> = {}): Session => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: userFactory(overrides.user),
  ...overrides,
});

// Food Entry Factory
export const foodEntryFactory = (overrides: Record<string, any> = {}) => ({
  id: 'food-1',
  user_id: 'user-123',
  name: 'Chicken Breast',
  serving: '100g',
  calories: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
  fiber: 0,
  sugar: 0,
  logged_at: new Date().toISOString(),
  meal_type: 'lunch',
  photo_url: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

// Goal Factory
export const goalFactory = (overrides: Record<string, any> = {}) => ({
  id: 'goal-1',
  user_id: 'user-123',
  title: 'Weight Loss Goal',
  type: 'weight',
  target_value: 180,
  current_value: 200,
  unit: 'lbs',
  start_date: '2025-01-01',
  target_date: '2025-12-31',
  frequency: 'daily',
  status: 'active',
  progress: 0,
  streak: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Fasting Session Factory
export const fastingSessionFactory = (overrides: Record<string, any> = {}) => ({
  id: 'fasting-1',
  user_id: 'user-123',
  start_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
  end_time: null,
  planned_duration: 16 * 60 * 60, // 16 hours in seconds
  status: 'active',
  notes: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

// Completed Fasting Session Factory
export const completedFastingSessionFactory = (overrides: Record<string, any> = {}) => ({
  ...fastingSessionFactory(overrides),
  end_time: new Date().toISOString(),
  status: 'completed',
  actual_duration: 16 * 60 * 60,
});

// Coach Factory
export const coachFactory = (overrides: Record<string, any> = {}) => ({
  id: 'coach-1',
  name: 'Dr. Nutrition Expert',
  specialty: 'nutrition',
  description: 'Expert nutritionist with 10 years experience',
  bio: 'Specializes in personalized nutrition plans',
  avatar_url: 'https://example.com/avatar.jpg',
  rating: 4.8,
  review_count: 156,
  price_monthly: 49.99,
  price_yearly: 499.99,
  trial_days: 7,
  is_featured: true,
  created_at: new Date().toISOString(),
  ...overrides,
});

// Subscription Factory
export const subscriptionFactory = (overrides: Record<string, any> = {}) => ({
  id: 'sub-1',
  user_id: 'user-123',
  stripe_subscription_id: 'sub_test123',
  stripe_customer_id: 'cus_test123',
  plan_id: 'premium',
  status: 'active',
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancel_at_period_end: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Meal Plan Factory
export const mealPlanFactory = (overrides: Record<string, any> = {}) => ({
  id: 'plan-1',
  user_id: 'user-123',
  date: new Date().toISOString().split('T')[0],
  breakfast: [foodEntryFactory({ meal_type: 'breakfast', name: 'Oatmeal' })],
  lunch: [foodEntryFactory({ meal_type: 'lunch' })],
  dinner: [foodEntryFactory({ meal_type: 'dinner', name: 'Salmon' })],
  snacks: [],
  total_calories: 1800,
  total_protein: 120,
  total_carbs: 200,
  total_fat: 60,
  created_at: new Date().toISOString(),
  ...overrides,
});

// Recipe Factory
export const recipeFactory = (overrides: Record<string, any> = {}) => ({
  id: 'recipe-1',
  name: 'Grilled Chicken Salad',
  description: 'Healthy and delicious grilled chicken salad',
  servings: 2,
  prep_time_minutes: 15,
  cook_time_minutes: 20,
  difficulty: 'easy',
  cuisine: 'mediterranean',
  ingredients: [
    { name: 'Chicken breast', amount: '200g' },
    { name: 'Mixed greens', amount: '4 cups' },
    { name: 'Olive oil', amount: '2 tbsp' },
  ],
  instructions: [
    'Season and grill chicken',
    'Prepare salad greens',
    'Combine and serve',
  ],
  nutrition: {
    calories: 350,
    protein: 42,
    carbs: 12,
    fat: 15,
    fiber: 4,
  },
  tags: ['healthy', 'high-protein', 'low-carb'],
  image_url: 'https://example.com/recipe.jpg',
  created_at: new Date().toISOString(),
  ...overrides,
});

// Payment Method Factory
export const paymentMethodFactory = (overrides: Record<string, any> = {}) => ({
  id: 'pm_test123',
  type: 'card',
  card: {
    brand: 'visa',
    last4: '4242',
    exp_month: 12,
    exp_year: 2025,
  },
  billing_details: {
    name: 'Test User',
    email: 'test@example.com',
  },
  ...overrides,
});

// Analytics Data Factory
export const analyticsDataFactory = (overrides: Record<string, any> = {}) => ({
  user_id: 'user-123',
  date: new Date().toISOString().split('T')[0],
  calories_consumed: 1800,
  calories_burned: 500,
  net_calories: 1300,
  protein: 120,
  carbs: 200,
  fat: 60,
  water_intake: 2000, // ml
  steps: 8500,
  weight: 195,
  sleep_hours: 7.5,
  fasting_hours: 16,
  mood: 'good',
  energy_level: 8,
  ...overrides,
});

// Notification Factory
export const notificationFactory = (overrides: Record<string, any> = {}) => ({
  id: 'notif-1',
  user_id: 'user-123',
  title: 'Goal Achievement',
  body: 'Congratulations! You reached your daily protein goal',
  type: 'achievement',
  data: {
    goal_id: 'goal-1',
    achievement_type: 'daily_protein',
  },
  read: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

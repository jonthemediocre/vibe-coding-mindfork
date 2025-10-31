/**
 * Core data models for MindFork app
 */

import type { DietColor } from './supabase';

export interface FoodEntry {
  id: string;
  user_id: string;
  name: string;
  serving: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  diet_color?: DietColor | null;
  tags?: string[] | null;
  food_category?: string | null;
  ai_classification_confidence?: number | null;
  photo_url?: string;
  logged_at: string;
  created_at: string;
  updated_at?: string;
}

export interface FastingSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  target_duration_hours: number;
  actual_duration_hours?: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at?: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  meals: MealPlanEntry[];
  day_of_week?: number; // 0-6 (Sunday-Saturday)
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface MealPlanEntry {
  id: string;
  meal_plan_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  ingredients: string[];
  instructions?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface CoachMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  coach_type?: 'nutrition' | 'fitness' | 'mindset' | 'general';
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  tier: 'free' | 'premium' | 'savage';

  // Contact information
  phone_number?: string;

  // Nutrition goals
  daily_calorie_goal?: number;
  daily_protein_goal?: number;
  daily_carbs_goal?: number;
  daily_fat_goal?: number;

  // Fasting preferences
  default_fasting_hours?: number;

  // Preferences
  preferred_measurement: 'imperial' | 'metric';
  timezone?: string;

  created_at: string;
  updated_at?: string;
}

export interface DailyStats {
  date: string;
  user_id: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  meal_count: number;
  fasting_hours?: number;
}

// Voice Call types
export interface Call {
  id: string;
  call_sid?: string;
  user_id: string;
  user_phone: string;
  twilio_number: string;
  coach_id: string;
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'cancelled' | 'scheduled';
  call_type: 'reminder' | 'check_in' | 'emergency' | 'scheduled';
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  scheduled_at?: string;
  custom_message?: string;
  created_at: string;
}

// SMS types
export interface SMSMessage {
  id: string;
  message_sid?: string;
  user_id: string;
  user_phone: string;
  twilio_number: string;
  coach_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  message_type: 'reminder' | 'check_in' | 'motivation' | 'alert' | 'custom';
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'scheduled' | 'cancelled';
  scheduled_at?: string;
  in_reply_to?: string;
  created_at: string;
  updated_at?: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// Form types
export interface CreateFoodEntryInput {
  name: string;
  serving: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface UpdateFoodEntryInput extends Partial<CreateFoodEntryInput> {
  id: string;
}

export interface StartFastingInput {
  target_duration_hours: number;
}

export interface EndFastingInput {
  session_id: string;
}

// Goal types - matches Supabase 'goals' table schema
// Note: Database uses strings, these types provide client-side validation
export type GoalType = 'weight' | 'nutrition' | 'fitness' | 'habit' | 'custom' | 'calories' | 'protein' | 'carbs' | 'fat' | 'water' | 'exercise' | 'sleep' | 'streak';
export type GoalCategory = 'health' | 'fitness' | 'nutrition' | 'lifestyle' | 'weight' | 'hydration' | 'exercise' | 'sleep' | 'habits' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned' | 'ahead' | 'on_track' | 'behind';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  type: string; // Database has string, not enum
  category: string; // Database has string, not enum
  status: string; // Database has string, not enum
  target_value: number; // Required in database
  current_value?: number;
  start_value?: number; // From database schema
  unit: string; // Required in database
  start_date: string;
  target_date?: string;
  completed_date?: string; // Database uses 'completed_date', not 'completed_at'
  created_at?: string;
  updated_at?: string;
  // Database schema includes these
  progress?: number;
  priority?: string; // Database has string, not enum
  // Service layer adds these via JOIN (not in database table)
  milestones?: GoalMilestone[];
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description?: string;
  value: number; // Required in database - was 'target_value' in my version
  achieved?: boolean; // From database schema
  achieved_date?: string; // From database schema - was 'achieved_at' in my version
  created_at?: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  icon?: string;
  badge_url?: string;
  earned_at: string;
  category?: string;
  // Additional properties used in GoalsScreen and GoalsService
  color?: string;
  earned_date?: string;
  criteria_met?: boolean;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  type: GoalType;
  category: GoalCategory;
  target_value?: number;
  unit?: string;
  target_date?: string;
  // Additional properties used in GoalsService
  priority?: 'low' | 'medium' | 'high';
  current_value?: number;
}

export interface UpdateGoalInput extends Partial<CreateGoalInput> {
  id: string;
  status?: GoalStatus;
  current_value?: number;
}

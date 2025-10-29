/**
 * Core data models for MindFork app
 */

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

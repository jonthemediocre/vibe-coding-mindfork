/**
 * Authentication & User Profile Types
 * Includes: profiles, user_settings
 */

/**
 * User Profile Table
 */
export interface ProfilesTable {
  Row: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    date_of_birth: string | null;
    gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
    height_cm: number | null;
    weight_kg: number | null;
    activity_level:
      | "sedentary"
      | "lightly_active"
      | "moderately_active"
      | "very_active"
      | "extra_active"
      | null;
    dietary_restrictions: string[] | null;
    allergies: string[] | null;
    health_conditions: string[] | null;
    timezone: string | null;
    onboarding_completed: boolean | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
    date_of_birth?: string | null;
    gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    activity_level?:
      | "sedentary"
      | "lightly_active"
      | "moderately_active"
      | "very_active"
      | "extra_active"
      | null;
    dietary_restrictions?: string[] | null;
    allergies?: string[] | null;
    health_conditions?: string[] | null;
    timezone?: string | null;
    onboarding_completed?: boolean | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    email?: string;
    full_name?: string | null;
    avatar_url?: string | null;
    date_of_birth?: string | null;
    gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    activity_level?:
      | "sedentary"
      | "lightly_active"
      | "moderately_active"
      | "very_active"
      | "extra_active"
      | null;
    dietary_restrictions?: string[] | null;
    allergies?: string[] | null;
    health_conditions?: string[] | null;
    timezone?: string | null;
    onboarding_completed?: boolean | null;
    created_at?: string;
    updated_at?: string;
  };
}

/**
 * User Settings Table
 */
export interface UserSettingsTable {
  Row: {
    id: string;
    user_id: string;
    daily_calorie_goal: number | null;
    protein_goal_g: number | null;
    carbs_goal_g: number | null;
    fat_goal_g: number | null;
    fiber_goal_g: number | null;
    water_goal_ml: number | null;
    sodium_goal_mg: number | null;
    sugar_goal_g: number | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    user_id: string;
    daily_calorie_goal?: number | null;
    protein_goal_g?: number | null;
    carbs_goal_g?: number | null;
    fat_goal_g?: number | null;
    fiber_goal_g?: number | null;
    water_goal_ml?: number | null;
    sodium_goal_mg?: number | null;
    sugar_goal_g?: number | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    user_id?: string;
    daily_calorie_goal?: number | null;
    protein_goal_g?: number | null;
    carbs_goal_g?: number | null;
    fat_goal_g?: number | null;
    fiber_goal_g?: number | null;
    water_goal_ml?: number | null;
    sodium_goal_mg?: number | null;
    sugar_goal_g?: number | null;
    updated_at?: string;
  };
}

/**
 * Auth domain table definitions
 */
export interface AuthTables {
  profiles: ProfilesTable;
  user_settings: UserSettingsTable;
}

// Convenience type exports
export type Profile = ProfilesTable['Row'];
export type ProfileInsert = ProfilesTable['Insert'];
export type ProfileUpdate = ProfilesTable['Update'];

export type UserSettings = UserSettingsTable['Row'];
export type UserSettingsInsert = UserSettingsTable['Insert'];
export type UserSettingsUpdate = UserSettingsTable['Update'];

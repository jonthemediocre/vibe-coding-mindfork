// TypeScript definitions for MindFork Supabase Database
// Auto-generated types based on the database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Diet color classification enum
export type DietColor = "green" | "yellow" | "red" | "neutral";

export interface Database {
  public: {
    Tables: {
      diet_classification_rules: {
        Row: {
          id: string;
          rule_name: string;
          diet_color: DietColor;
          category_pattern: string | null;
          tag_pattern: string | null;
          nutrient_criteria: Json | null;
          priority: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rule_name: string;
          diet_color: DietColor;
          category_pattern?: string | null;
          tag_pattern?: string | null;
          nutrient_criteria?: Json | null;
          priority?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rule_name?: string;
          diet_color?: DietColor;
          category_pattern?: string | null;
          tag_pattern?: string | null;
          nutrient_criteria?: Json | null;
          priority?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
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
      };
      user_settings: {
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
          notifications_enabled: boolean | null;
          reminder_times: string[] | null;
          preferred_units: "metric" | "imperial" | null;
          dark_mode: boolean | null;
          data_sharing_enabled: boolean | null;
          analytics_enabled: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          daily_calorie_goal?: number | null;
          protein_goal_g?: number | null;
          carbs_goal_g?: number | null;
          fat_goal_g?: number | null;
          fiber_goal_g?: number | null;
          water_goal_ml?: number | null;
          sodium_goal_mg?: number | null;
          sugar_goal_g?: number | null;
          notifications_enabled?: boolean | null;
          reminder_times?: string[] | null;
          preferred_units?: "metric" | "imperial" | null;
          dark_mode?: boolean | null;
          data_sharing_enabled?: boolean | null;
          analytics_enabled?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          daily_calorie_goal?: number | null;
          protein_goal_g?: number | null;
          carbs_goal_g?: number | null;
          fat_goal_g?: number | null;
          fiber_goal_g?: number | null;
          water_goal_ml?: number | null;
          sodium_goal_mg?: number | null;
          sugar_goal_g?: number | null;
          notifications_enabled?: boolean | null;
          reminder_times?: string[] | null;
          preferred_units?: "metric" | "imperial" | null;
          dark_mode?: boolean | null;
          data_sharing_enabled?: boolean | null;
          analytics_enabled?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      foods: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          brand: string | null;
          barcode: string | null;
          calories_per_100g: number;
          protein_per_100g: number | null;
          carbs_per_100g: number | null;
          fat_per_100g: number | null;
          fiber_per_100g: number | null;
          sugar_per_100g: number | null;
          sodium_per_100mg: number | null;
          vitamin_c_per_100g: number | null;
          iron_per_100g: number | null;
          calcium_per_100g: number | null;
          food_category: string | null;
          food_subcategory: string | null;
          tags: string[] | null;
          data_source:
            | "usda"
            | "user_generated"
            | "verified"
            | "api_import"
            | null;
          is_verified: boolean | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          brand?: string | null;
          barcode?: string | null;
          calories_per_100g: number;
          protein_per_100g?: number | null;
          carbs_per_100g?: number | null;
          fat_per_100g?: number | null;
          fiber_per_100g?: number | null;
          sugar_per_100g?: number | null;
          sodium_per_100mg?: number | null;
          vitamin_c_per_100g?: number | null;
          iron_per_100g?: number | null;
          calcium_per_100g?: number | null;
          food_category?: string | null;
          food_subcategory?: string | null;
          tags?: string[] | null;
          data_source?:
            | "usda"
            | "user_generated"
            | "verified"
            | "api_import"
            | null;
          is_verified?: boolean | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          brand?: string | null;
          barcode?: string | null;
          calories_per_100g?: number;
          protein_per_100g?: number | null;
          carbs_per_100g?: number | null;
          fat_per_100g?: number | null;
          fiber_per_100g?: number | null;
          sugar_per_100g?: number | null;
          sodium_per_100mg?: number | null;
          vitamin_c_per_100g?: number | null;
          iron_per_100g?: number | null;
          calcium_per_100g?: number | null;
          food_category?: string | null;
          food_subcategory?: string | null;
          tags?: string[] | null;
          data_source?:
            | "usda"
            | "user_generated"
            | "verified"
            | "api_import"
            | null;
          is_verified?: boolean | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_foods: {
        Row: {
          id: string;
          user_id: string;
          food_id: string | null;
          custom_name: string | null;
          is_favorite: boolean | null;
          frequency_used: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          food_id?: string | null;
          custom_name?: string | null;
          is_favorite?: boolean | null;
          frequency_used?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          food_id?: string | null;
          custom_name?: string | null;
          is_favorite?: boolean | null;
          frequency_used?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      food_logs: {
        Row: {
          id: string;
          user_id: string;
          food_id: string;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          consumed_at: string;
          logged_at: string;
          quantity_g: number;
          serving_description: string | null;
          calories: number;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          fiber_g: number | null;
          sugar_g: number | null;
          sodium_mg: number | null;
          log_method: "manual" | "barcode" | "photo" | "ai_recognition" | null;
          photo_url: string | null;
          confidence_score: number | null;
          notes: string | null;
          is_recipe: boolean | null;
          recipe_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          food_id: string;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          consumed_at?: string;
          logged_at?: string;
          quantity_g: number;
          serving_description?: string | null;
          calories: number;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          fiber_g?: number | null;
          sugar_g?: number | null;
          sodium_mg?: number | null;
          log_method?: "manual" | "barcode" | "photo" | "ai_recognition" | null;
          photo_url?: string | null;
          confidence_score?: number | null;
          notes?: string | null;
          is_recipe?: boolean | null;
          recipe_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          food_id?: string;
          meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
          consumed_at?: string;
          logged_at?: string;
          quantity_g?: number;
          serving_description?: string | null;
          calories?: number;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          fiber_g?: number | null;
          sugar_g?: number | null;
          sodium_mg?: number | null;
          log_method?: "manual" | "barcode" | "photo" | "ai_recognition" | null;
          photo_url?: string | null;
          confidence_score?: number | null;
          notes?: string | null;
          is_recipe?: boolean | null;
          recipe_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          goal_type: "nutrition" | "fitness" | "habit" | "weight";
          category: string | null;
          target_value: number;
          current_value: number | null;
          unit: string;
          start_date: string;
          end_date: string | null;
          frequency: "daily" | "weekly" | "monthly" | "one_time" | null;
          status: "active" | "completed" | "paused" | "cancelled" | null;
          completed_at: string | null;
          reminder_enabled: boolean | null;
          reminder_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          goal_type: "nutrition" | "fitness" | "habit" | "weight";
          category?: string | null;
          target_value: number;
          current_value?: number | null;
          unit: string;
          start_date: string;
          end_date?: string | null;
          frequency?: "daily" | "weekly" | "monthly" | "one_time" | null;
          status?: "active" | "completed" | "paused" | "cancelled" | null;
          completed_at?: string | null;
          reminder_enabled?: boolean | null;
          reminder_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          goal_type?: "nutrition" | "fitness" | "habit" | "weight";
          category?: string | null;
          target_value?: number;
          current_value?: number | null;
          unit?: string;
          start_date?: string;
          end_date?: string | null;
          frequency?: "daily" | "weekly" | "monthly" | "one_time" | null;
          status?: "active" | "completed" | "paused" | "cancelled" | null;
          completed_at?: string | null;
          reminder_enabled?: boolean | null;
          reminder_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      goal_progress: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          date: string;
          value_achieved: number;
          percentage_complete: number | null;
          is_completed: boolean | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          user_id: string;
          date: string;
          value_achieved: number;
          percentage_complete?: number | null;
          is_completed?: boolean | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          user_id?: string;
          date?: string;
          value_achieved?: number;
          percentage_complete?: number | null;
          is_completed?: boolean | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          conversation_type:
            | "general"
            | "meal_planning"
            | "goal_setting"
            | "nutrition_analysis"
            | "coaching"
            | null;
          is_active: boolean | null;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          conversation_type?:
            | "general"
            | "meal_planning"
            | "goal_setting"
            | "nutrition_analysis"
            | "coaching"
            | null;
          is_active?: boolean | null;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          conversation_type?:
            | "general"
            | "meal_planning"
            | "goal_setting"
            | "nutrition_analysis"
            | "coaching"
            | null;
          is_active?: boolean | null;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          message: string;
          sender: "user" | "ai";
          message_type:
            | "text"
            | "image"
            | "food_suggestion"
            | "goal_update"
            | "insight"
            | null;
          ai_model: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          confidence_score: number | null;
          context_data: Json | null;
          attachments: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          message: string;
          sender: "user" | "ai";
          message_type?:
            | "text"
            | "image"
            | "food_suggestion"
            | "goal_update"
            | "insight"
            | null;
          ai_model?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          confidence_score?: number | null;
          context_data?: Json | null;
          attachments?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          message?: string;
          sender?: "user" | "ai";
          message_type?:
            | "text"
            | "image"
            | "food_suggestion"
            | "goal_update"
            | "insight"
            | null;
          ai_model?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          confidence_score?: number | null;
          context_data?: Json | null;
          attachments?: string[] | null;
          created_at?: string;
        };
      };
      ai_insights: {
        Row: {
          id: string;
          user_id: string;
          insight_type:
            | "nutrition_trend"
            | "goal_progress"
            | "meal_suggestion"
            | "habit_pattern"
            | "health_alert";
          title: string;
          content: string;
          priority: "low" | "medium" | "high" | "urgent" | null;
          analysis_period_start: string | null;
          analysis_period_end: string | null;
          data_points_analyzed: number | null;
          confidence_score: number | null;
          is_read: boolean | null;
          is_dismissed: boolean | null;
          user_feedback: string | null;
          suggested_actions: Json | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          insight_type:
            | "nutrition_trend"
            | "goal_progress"
            | "meal_suggestion"
            | "habit_pattern"
            | "health_alert";
          title: string;
          content: string;
          priority?: "low" | "medium" | "high" | "urgent" | null;
          analysis_period_start?: string | null;
          analysis_period_end?: string | null;
          data_points_analyzed?: number | null;
          confidence_score?: number | null;
          is_read?: boolean | null;
          is_dismissed?: boolean | null;
          user_feedback?: string | null;
          suggested_actions?: Json | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          insight_type?:
            | "nutrition_trend"
            | "goal_progress"
            | "meal_suggestion"
            | "habit_pattern"
            | "health_alert";
          title?: string;
          content?: string;
          priority?: "low" | "medium" | "high" | "urgent" | null;
          analysis_period_start?: string | null;
          analysis_period_end?: string | null;
          data_points_analyzed?: number | null;
          confidence_score?: number | null;
          is_read?: boolean | null;
          is_dismissed?: boolean | null;
          user_feedback?: string | null;
          suggested_actions?: Json | null;
          created_at?: string;
          expires_at?: string | null;
        };
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          plan_type: "custom" | "ai_generated" | "template" | null;
          start_date: string;
          end_date: string;
          daily_calorie_target: number | null;
          protein_target_g: number | null;
          carbs_target_g: number | null;
          fat_target_g: number | null;
          is_active: boolean | null;
          is_template: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          plan_type?: "custom" | "ai_generated" | "template" | null;
          start_date: string;
          end_date: string;
          daily_calorie_target?: number | null;
          protein_target_g?: number | null;
          carbs_target_g?: number | null;
          fat_target_g?: number | null;
          is_active?: boolean | null;
          is_template?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          plan_type?: "custom" | "ai_generated" | "template" | null;
          start_date?: string;
          end_date?: string;
          daily_calorie_target?: number | null;
          protein_target_g?: number | null;
          carbs_target_g?: number | null;
          fat_target_g?: number | null;
          is_active?: boolean | null;
          is_template?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      planned_meals: {
        Row: {
          id: string;
          meal_plan_id: string;
          user_id: string;
          meal_name: string;
          meal_description: string | null;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          planned_date: string;
          planned_time: string | null;
          estimated_calories: number | null;
          estimated_protein_g: number | null;
          estimated_carbs_g: number | null;
          estimated_fat_g: number | null;
          prep_time_minutes: number | null;
          difficulty_level: "easy" | "medium" | "hard" | null;
          instructions: string | null;
          is_completed: boolean | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meal_plan_id: string;
          user_id: string;
          meal_name: string;
          meal_description?: string | null;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          planned_date: string;
          planned_time?: string | null;
          estimated_calories?: number | null;
          estimated_protein_g?: number | null;
          estimated_carbs_g?: number | null;
          estimated_fat_g?: number | null;
          prep_time_minutes?: number | null;
          difficulty_level?: "easy" | "medium" | "hard" | null;
          instructions?: string | null;
          is_completed?: boolean | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meal_plan_id?: string;
          user_id?: string;
          meal_name?: string;
          meal_description?: string | null;
          meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
          planned_date?: string;
          planned_time?: string | null;
          estimated_calories?: number | null;
          estimated_protein_g?: number | null;
          estimated_carbs_g?: number | null;
          estimated_fat_g?: number | null;
          prep_time_minutes?: number | null;
          difficulty_level?: "easy" | "medium" | "hard" | null;
          instructions?: string | null;
          is_completed?: boolean | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      planned_meal_foods: {
        Row: {
          id: string;
          planned_meal_id: string;
          food_id: string;
          quantity_g: number;
          serving_description: string | null;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          planned_meal_id: string;
          food_id: string;
          quantity_g: number;
          serving_description?: string | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          planned_meal_id?: string;
          food_id?: string;
          quantity_g?: number;
          serving_description?: string | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          created_at?: string;
        };
      };
      daily_nutrition_summaries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          total_calories: number | null;
          total_protein_g: number | null;
          total_carbs_g: number | null;
          total_fat_g: number | null;
          total_fiber_g: number | null;
          total_sugar_g: number | null;
          total_sodium_mg: number | null;
          calorie_goal_percentage: number | null;
          protein_goal_percentage: number | null;
          carbs_goal_percentage: number | null;
          fat_goal_percentage: number | null;
          breakfast_calories: number | null;
          lunch_calories: number | null;
          dinner_calories: number | null;
          snack_calories: number | null;
          meals_logged: number | null;
          total_food_items: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          total_calories?: number | null;
          total_protein_g?: number | null;
          total_carbs_g?: number | null;
          total_fat_g?: number | null;
          total_fiber_g?: number | null;
          total_sugar_g?: number | null;
          total_sodium_mg?: number | null;
          calorie_goal_percentage?: number | null;
          protein_goal_percentage?: number | null;
          carbs_goal_percentage?: number | null;
          fat_goal_percentage?: number | null;
          breakfast_calories?: number | null;
          lunch_calories?: number | null;
          dinner_calories?: number | null;
          snack_calories?: number | null;
          meals_logged?: number | null;
          total_food_items?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          total_calories?: number | null;
          total_protein_g?: number | null;
          total_carbs_g?: number | null;
          total_fat_g?: number | null;
          total_fiber_g?: number | null;
          total_sugar_g?: number | null;
          total_sodium_mg?: number | null;
          calorie_goal_percentage?: number | null;
          protein_goal_percentage?: number | null;
          carbs_goal_percentage?: number | null;
          fat_goal_percentage?: number | null;
          breakfast_calories?: number | null;
          lunch_calories?: number | null;
          dinner_calories?: number | null;
          snack_calories?: number | null;
          meals_logged?: number | null;
          total_food_items?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          achievement_name: string;
          description: string | null;
          icon_url: string | null;
          criteria_met: Json | null;
          points_earned: number | null;
          earned_at: string;
          is_active: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_type: string;
          achievement_name: string;
          description?: string | null;
          icon_url?: string | null;
          criteria_met?: Json | null;
          points_earned?: number | null;
          earned_at?: string;
          is_active?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_type?: string;
          achievement_name?: string;
          description?: string | null;
          icon_url?: string | null;
          criteria_met?: Json | null;
          points_earned?: number | null;
          earned_at?: string;
          is_active?: boolean | null;
          created_at?: string;
        };
      };
      achievement_types: {
        Row: {
          id: string;
          type_name: string;
          category: string;
          description: string | null;
          icon_name: string | null;
          points_base: number | null;
          is_active: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type_name: string;
          category: string;
          description?: string | null;
          icon_name?: string | null;
          points_base?: number | null;
          is_active?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type_name?: string;
          category?: string;
          description?: string | null;
          icon_name?: string | null;
          points_base?: number | null;
          is_active?: boolean | null;
          created_at?: string;
        };
      };
      food_entries: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          serving: string;
          calories: number;
          protein: number | null;
          carbs: number | null;
          fat: number | null;
          fiber: number | null;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack" | null;
          diet_color: DietColor | null;
          tags: string[] | null;
          food_category: string | null;
          ai_classification_confidence: number | null;
          logged_at: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          serving: string;
          calories: number;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          fiber?: number | null;
          meal_type?: "breakfast" | "lunch" | "dinner" | "snack" | null;
          diet_color?: DietColor | null;
          tags?: string[] | null;
          food_category?: string | null;
          ai_classification_confidence?: number | null;
          logged_at?: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          serving?: string;
          calories?: number;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          fiber?: number | null;
          meal_type?: "breakfast" | "lunch" | "dinner" | "snack" | null;
          diet_color?: DietColor | null;
          tags?: string[] | null;
          food_category?: string | null;
          ai_classification_confidence?: number | null;
          logged_at?: string;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      fasting_sessions: {
        Row: {
          id: string;
          user_id: string;
          start_time: string;
          end_time: string | null;
          target_duration_hours: number;
          actual_duration_hours: number | null;
          status: "active" | "completed" | "cancelled";
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          start_time?: string;
          end_time?: string | null;
          target_duration_hours: number;
          actual_duration_hours?: number | null;
          status?: "active" | "completed" | "cancelled";
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          start_time?: string;
          end_time?: string | null;
          target_duration_hours?: number;
          actual_duration_hours?: number | null;
          status?: "active" | "completed" | "cancelled";
          created_at?: string;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      user_nutrition_trends: {
        Row: {
          user_id: string | null;
          date: string | null;
          total_calories: number | null;
          total_protein_g: number | null;
          total_carbs_g: number | null;
          total_fat_g: number | null;
          calorie_goal_percentage: number | null;
          protein_goal_percentage: number | null;
          carbs_goal_percentage: number | null;
          fat_goal_percentage: number | null;
          daily_calorie_goal: number | null;
          protein_goal_g: number | null;
          carbs_goal_g: number | null;
          fat_goal_g: number | null;
          full_name: string | null;
          activity_level: string | null;
        };
      };
      popular_foods: {
        Row: {
          id: string | null;
          name: string | null;
          brand: string | null;
          food_category: string | null;
          calories_per_100g: number | null;
          protein_per_100g: number | null;
          log_count: number | null;
          user_count: number | null;
          avg_quantity_g: number | null;
        };
      };
      user_goal_summaries: {
        Row: {
          user_id: string | null;
          goal_id: string | null;
          title: string | null;
          goal_type: string | null;
          category: string | null;
          target_value: number | null;
          current_value: number | null;
          unit: string | null;
          status: string | null;
          frequency: string | null;
          completion_percentage: number | null;
          progress_entries: number | null;
          completed_days: number | null;
          last_progress_date: string | null;
        };
      };
      user_storage_usage: {
        Row: {
          user_id: string | null;
          bucket_id: string | null;
          file_count: number | null;
          total_size_bytes: number | null;
          total_size_mb: number | null;
        };
      };
    };
    Functions: {
      calculate_nutrition_values: {
        Args: {
          p_food_id: string;
          p_quantity_g: number;
        };
        Returns: {
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
          sugar_g: number;
          sodium_mg: number;
        }[];
      };
      check_achievements: {
        Args: {
          p_user_id: string;
          p_achievement_type?: string;
        };
        Returns: undefined;
      };
      check_user_storage_quota: {
        Args: {
          user_id: string;
          bucket_name?: string;
        };
        Returns: {
          bucket_id: string;
          current_usage_mb: number;
          quota_mb: number;
          percentage_used: number;
          over_quota: boolean;
        }[];
      };
      cleanup_orphaned_storage_objects: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      generate_storage_filename: {
        Args: {
          file_extension: string;
          prefix?: string;
        };
        Returns: string;
      };
      get_nutrition_summary: {
        Args: {
          p_user_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: {
          avg_calories: number;
          avg_protein: number;
          avg_carbs: number;
          avg_fat: number;
          total_days: number;
          days_on_target: number;
        }[];
      };
      get_user_avatar_url: {
        Args: {
          user_id: string;
        };
        Returns: string;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      search_foods: {
        Args: {
          p_search_term: string;
          p_limit?: number;
        };
        Returns: {
          id: string;
          name: string;
          brand: string;
          calories_per_100g: number;
          protein_per_100g: number;
          carbs_per_100g: number;
          fat_per_100g: number;
          rank: number;
        }[];
      };
      update_all_user_goals: {
        Args: {
          p_user_id: string;
          p_date?: string;
        };
        Returns: undefined;
      };
      update_daily_nutrition_summary: {
        Args: {
          p_user_id: string;
          p_date: string;
        };
        Returns: undefined;
      };
      update_goal_progress: {
        Args: {
          p_goal_id: string;
          p_date?: string;
        };
        Returns: undefined;
      };
      user_can_access_conversation: {
        Args: {
          conversation_id: string;
        };
        Returns: boolean;
      };
      user_can_access_meal_plan: {
        Args: {
          meal_plan_id: string;
        };
        Returns: boolean;
      };
      user_owns_resource: {
        Args: {
          resource_user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

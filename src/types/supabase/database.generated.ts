export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          color: string | null
          created_at: string | null
          criteria_met: boolean | null
          description: string | null
          earned_date: string | null
          icon: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string | null
          criteria_met?: boolean | null
          description?: string | null
          earned_date?: string | null
          icon?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string | null
          criteria_met?: boolean | null
          description?: string | null
          earned_date?: string | null
          icon?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_coach_sessions: {
        Row: {
          coach_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          messages: Json | null
          mode: string | null
          session_id: string
          session_type: string
          summary: string | null
          token_count: number | null
          user_id: string
        }
        Insert: {
          coach_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          messages?: Json | null
          mode?: string | null
          session_id: string
          session_type: string
          summary?: string | null
          token_count?: number | null
          user_id: string
        }
        Update: {
          coach_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          messages?: Json | null
          mode?: string | null
          session_id?: string
          session_type?: string
          summary?: string | null
          token_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_coaching_messages: {
        Row: {
          coach_id: string
          confidence_score: number | null
          content: string
          created_at: string | null
          id: string
          message_type: string
          metadata: Json | null
          model_used: string | null
          response_time_ms: number | null
          session_id: string | null
          tokens_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coach_id: string
          confidence_score?: number | null
          content: string
          created_at?: string | null
          id?: string
          message_type: string
          metadata?: Json | null
          model_used?: string | null
          response_time_ms?: number | null
          session_id?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coach_id?: string
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          model_used?: string | null
          response_time_ms?: number | null
          session_id?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          avg_helpfulness: number | null
          coach_id: string | null
          cost_usd: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_stale: boolean | null
          last_used: string | null
          mode: string | null
          model_used: string
          query_category: string | null
          query_hash: string
          query_text: string
          response_content: string
          tokens_used: number | null
          usage_count: number | null
        }
        Insert: {
          avg_helpfulness?: number | null
          coach_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_stale?: boolean | null
          last_used?: string | null
          mode?: string | null
          model_used: string
          query_category?: string | null
          query_hash: string
          query_text: string
          response_content: string
          tokens_used?: number | null
          usage_count?: number | null
        }
        Update: {
          avg_helpfulness?: number | null
          coach_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_stale?: boolean | null
          last_used?: string | null
          mode?: string | null
          model_used?: string
          query_category?: string | null
          query_hash?: string
          query_text?: string
          response_content?: string
          tokens_used?: number | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_response_cache_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_response_cache_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          app_version: string | null
          created_at: string | null
          device_info: Json | null
          event_category: string
          event_name: string
          event_properties: Json | null
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          device_info?: Json | null
          event_category: string
          event_name: string
          event_properties?: Json | null
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          device_info?: Json | null
          event_category?: string
          event_name?: string
          event_properties?: Json | null
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calibration_cron_history: {
        Row: {
          best_hi_threshold: number | null
          best_mid_threshold: number | null
          best_mse: number | null
          candidates_tested: number | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_end: string | null
          execution_start: string
          id: string
          result_json: Json | null
          success: boolean | null
        }
        Insert: {
          best_hi_threshold?: number | null
          best_mid_threshold?: number | null
          best_mse?: number | null
          candidates_tested?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_end?: string | null
          execution_start?: string
          id?: string
          result_json?: Json | null
          success?: boolean | null
        }
        Update: {
          best_hi_threshold?: number | null
          best_mid_threshold?: number | null
          best_mse?: number | null
          candidates_tested?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_end?: string | null
          execution_start?: string
          id?: string
          result_json?: Json | null
          success?: boolean | null
        }
        Relationships: []
      }
      calibration_samples: {
        Row: {
          created_at: string | null
          data: Json
          id: number
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: number
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coach_analytics: {
        Row: {
          event_data: Json | null
          event_type: string
          id: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          event_data?: Json | null
          event_type: string
          id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          event_data?: Json | null
          event_type?: string
          id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coach_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coach_embeddings: {
        Row: {
          chunk: string
          chunk_index: number
          coach_id: string
          created_at: string
          embedding: string
          id: string
          knowledge_id: string
          metadata: Json
        }
        Insert: {
          chunk: string
          chunk_index: number
          coach_id: string
          created_at?: string
          embedding: string
          id?: string
          knowledge_id: string
          metadata?: Json
        }
        Update: {
          chunk?: string
          chunk_index?: number
          coach_id?: string
          created_at?: string
          embedding?: string
          id?: string
          knowledge_id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "coach_embeddings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_embeddings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_embeddings_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "coach_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_knowledge: {
        Row: {
          checksum: string | null
          coach_id: string
          created_at: string
          doc_id: string
          id: string
          source: string | null
          title: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          checksum?: string | null
          coach_id: string
          created_at?: string
          doc_id: string
          id?: string
          source?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          checksum?: string | null
          coach_id?: string
          created_at?: string
          doc_id?: string
          id?: string
          source?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_knowledge_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_knowledge_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_knowledge_profiles: {
        Row: {
          avg_retrieval_accuracy: number | null
          coach_id: string
          coach_name: string
          created_at: string | null
          custom_knowledge: string[] | null
          exclude_categories: string[] | null
          excluded_sources: string[]
          expertise_keywords: string[]
          id: string
          include_sources: string[] | null
          knowledge_base_size: number | null
          knowledge_focus: Json | null
          knowledge_retrieval_config: Json
          last_knowledge_update: string | null
          max_context_items: number | null
          personality_modifiers: Json | null
          prefer_recent_knowledge: boolean | null
          preferred_sources: string[]
          primary_domains: string[]
          relevance_threshold: number | null
          secondary_domains: string[] | null
          specialty_areas: string[] | null
          updated_at: string | null
        }
        Insert: {
          avg_retrieval_accuracy?: number | null
          coach_id: string
          coach_name: string
          created_at?: string | null
          custom_knowledge?: string[] | null
          exclude_categories?: string[] | null
          excluded_sources?: string[]
          expertise_keywords?: string[]
          id?: string
          include_sources?: string[] | null
          knowledge_base_size?: number | null
          knowledge_focus?: Json | null
          knowledge_retrieval_config?: Json
          last_knowledge_update?: string | null
          max_context_items?: number | null
          personality_modifiers?: Json | null
          prefer_recent_knowledge?: boolean | null
          preferred_sources?: string[]
          primary_domains: string[]
          relevance_threshold?: number | null
          secondary_domains?: string[] | null
          specialty_areas?: string[] | null
          updated_at?: string | null
        }
        Update: {
          avg_retrieval_accuracy?: number | null
          coach_id?: string
          coach_name?: string
          created_at?: string | null
          custom_knowledge?: string[] | null
          exclude_categories?: string[] | null
          excluded_sources?: string[]
          expertise_keywords?: string[]
          id?: string
          include_sources?: string[] | null
          knowledge_base_size?: number | null
          knowledge_focus?: Json | null
          knowledge_retrieval_config?: Json
          last_knowledge_update?: string | null
          max_context_items?: number | null
          personality_modifiers?: Json | null
          prefer_recent_knowledge?: boolean | null
          preferred_sources?: string[]
          primary_domains?: string[]
          relevance_threshold?: number | null
          secondary_domains?: string[] | null
          specialty_areas?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_knowledge_profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: true
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_knowledge_profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: true
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_marketplace_info: {
        Row: {
          category_id: string | null
          coach_id: string
          created_at: string | null
          currency: string | null
          downloads: number | null
          is_featured: boolean | null
          is_public: boolean | null
          price_amount: number | null
          price_type: string
          rating: number | null
          sample_interactions: Json | null
          tags: string[] | null
          total_ratings: number | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          coach_id: string
          created_at?: string | null
          currency?: string | null
          downloads?: number | null
          is_featured?: boolean | null
          is_public?: boolean | null
          price_amount?: number | null
          price_type?: string
          rating?: number | null
          sample_interactions?: Json | null
          tags?: string[] | null
          total_ratings?: number | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          coach_id?: string
          created_at?: string | null
          currency?: string | null
          downloads?: number | null
          is_featured?: boolean | null
          is_public?: boolean | null
          price_amount?: number | null
          price_type?: string
          rating?: number | null
          sample_interactions?: Json | null
          tags?: string[] | null
          total_ratings?: number | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_marketplace_info_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "coach_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_marketplace_info_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: true
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_marketplace_info_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: true
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_messages: {
        Row: {
          channel: string
          coach_id: string
          content: string
          created_at: string | null
          cta_action: string | null
          cta_text: string | null
          delivered_at: string | null
          dismissed_at: string | null
          engaged_at: string | null
          feedback_text: string | null
          helpfulness_rating: number | null
          id: string
          message_type: string
          metadata: Json | null
          mode: string
          read_at: string | null
          sent_at: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          channel: string
          coach_id: string
          content: string
          created_at?: string | null
          cta_action?: string | null
          cta_text?: string | null
          delivered_at?: string | null
          dismissed_at?: string | null
          engaged_at?: string | null
          feedback_text?: string | null
          helpfulness_rating?: number | null
          id?: string
          message_type: string
          metadata?: Json | null
          mode: string
          read_at?: string | null
          sent_at?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          coach_id?: string
          content?: string
          created_at?: string | null
          cta_action?: string | null
          cta_text?: string | null
          delivered_at?: string | null
          dismissed_at?: string | null
          engaged_at?: string | null
          feedback_text?: string | null
          helpfulness_rating?: number | null
          id?: string
          message_type?: string
          metadata?: Json | null
          mode?: string
          read_at?: string | null
          sent_at?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_messages_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_messages_mode_fkey"
            columns: ["mode"]
            isOneToOne: false
            referencedRelation: "coach_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coach_modes: {
        Row: {
          created_at: string | null
          description: string | null
          guardrails: string[] | null
          id: string
          name: string
          renew_days: number | null
          requires_double_opt_in: boolean | null
          requires_opt_in: boolean | null
          severity_range: unknown
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          guardrails?: string[] | null
          id: string
          name: string
          renew_days?: number | null
          requires_double_opt_in?: boolean | null
          requires_opt_in?: boolean | null
          severity_range: unknown
        }
        Update: {
          created_at?: string | null
          description?: string | null
          guardrails?: string[] | null
          id?: string
          name?: string
          renew_days?: number | null
          requires_double_opt_in?: boolean | null
          requires_opt_in?: boolean | null
          severity_range?: unknown
        }
        Relationships: []
      }
      coach_personas: {
        Row: {
          created_at: string
          id: string
          name: string
          safety_rules: Json
          sample_responses: Json
          style_rules: Json
          system_prompt: string
          tone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          safety_rules?: Json
          sample_responses?: Json
          style_rules?: Json
          system_prompt: string
          tone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          safety_rules?: Json
          sample_responses?: Json
          style_rules?: Json
          system_prompt?: string
          tone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coach_purchases: {
        Row: {
          amount_paid: number | null
          auto_renew: boolean | null
          coach_id: string
          created_at: string | null
          currency: string | null
          expires_at: string | null
          id: string
          is_trial: boolean | null
          purchase_type: string
          purchased_at: string | null
          status: string
          stripe_payment_id: string | null
          stripe_subscription_id: string | null
          trial_converted: boolean | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          auto_renew?: boolean | null
          coach_id: string
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          is_trial?: boolean | null
          purchase_type: string
          purchased_at?: string | null
          status?: string
          stripe_payment_id?: string | null
          stripe_subscription_id?: string | null
          trial_converted?: boolean | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          auto_renew?: boolean | null
          coach_id?: string
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          is_trial?: boolean | null
          purchase_type?: string
          purchased_at?: string | null
          status?: string
          stripe_payment_id?: string | null
          stripe_subscription_id?: string | null
          trial_converted?: boolean | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_purchases_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_purchases_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_response_feedback: {
        Row: {
          coach_id: string
          created_at: string | null
          feedback_text: string | null
          helpful: boolean
          id: string
          knowledge_used: string[] | null
          mode: string
          model_used: string
          rating: number | null
          response_content: string
          response_id: string
          response_time_ms: number | null
          token_count: number | null
          user_context: Json
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          feedback_text?: string | null
          helpful: boolean
          id?: string
          knowledge_used?: string[] | null
          mode: string
          model_used: string
          rating?: number | null
          response_content: string
          response_id: string
          response_time_ms?: number | null
          token_count?: number | null
          user_context: Json
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          feedback_text?: string | null
          helpful?: boolean
          id?: string
          knowledge_used?: string[] | null
          mode?: string
          model_used?: string
          rating?: number | null
          response_content?: string
          response_id?: string
          response_time_ms?: number | null
          token_count?: number | null
          user_context?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_response_feedback_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_response_feedback_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_response_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coach_review_votes: {
        Row: {
          created_at: string | null
          id: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_helpful?: boolean
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "coach_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_reviews: {
        Row: {
          coach_id: string
          created_at: string | null
          helpful_count: number | null
          id: string
          is_approved: boolean | null
          is_flagged: boolean | null
          is_verified_purchase: boolean | null
          moderation_notes: string | null
          not_helpful_count: number | null
          rating: number
          review_text: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          is_flagged?: boolean | null
          is_verified_purchase?: boolean | null
          moderation_notes?: string | null
          not_helpful_count?: number | null
          rating: number
          review_text?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          is_flagged?: boolean | null
          is_verified_purchase?: boolean | null
          moderation_notes?: string | null
          not_helpful_count?: number | null
          rating?: number
          review_text?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_reviews_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_reviews_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_voice_profiles: {
        Row: {
          created_at: string
          id: string
          language: string | null
          name: string
          pitch: number | null
          speaking_rate: number | null
          tts_provider: string
          tts_voice_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          name: string
          pitch?: number | null
          speaking_rate?: number | null
          tts_provider: string
          tts_voice_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          name?: string
          pitch?: number | null
          speaking_rate?: number | null
          tts_provider?: string
          tts_voice_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coaches: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string | null
          default_severity: number | null
          description: string | null
          id: string
          is_active: boolean | null
          level: number
          name: string
          persona_id: string | null
          supported_modes: string[] | null
          tags: string[]
          tone: string
          updated_at: string | null
          voice_id: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string | null
          default_severity?: number | null
          description?: string | null
          id: string
          is_active?: boolean | null
          level: number
          name: string
          persona_id?: string | null
          supported_modes?: string[] | null
          tags?: string[]
          tone: string
          updated_at?: string | null
          voice_id?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string | null
          default_severity?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          name?: string
          persona_id?: string | null
          supported_modes?: string[] | null
          tags?: string[]
          tone?: string
          updated_at?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaches_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "coach_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_voice_id_fkey"
            columns: ["voice_id"]
            isOneToOne: false
            referencedRelation: "coach_voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      confidence_calibration: {
        Row: {
          actual_accuracy: number | null
          bucket_name: string
          calibration_multiplier: number
          correct_predictions: number | null
          created_at: string | null
          id: string
          incorrect_predictions: number | null
          last_updated: string | null
          partial_predictions: number | null
          sample_count: number | null
          threshold_max: number
          threshold_min: number
        }
        Insert: {
          actual_accuracy?: number | null
          bucket_name: string
          calibration_multiplier: number
          correct_predictions?: number | null
          created_at?: string | null
          id?: string
          incorrect_predictions?: number | null
          last_updated?: string | null
          partial_predictions?: number | null
          sample_count?: number | null
          threshold_max: number
          threshold_min: number
        }
        Update: {
          actual_accuracy?: number | null
          bucket_name?: string
          calibration_multiplier?: number
          correct_predictions?: number | null
          created_at?: string | null
          id?: string
          incorrect_predictions?: number | null
          last_updated?: string | null
          partial_predictions?: number | null
          sample_count?: number | null
          threshold_max?: number
          threshold_min?: number
        }
        Relationships: []
      }
      confidence_calibration_history: {
        Row: {
          calibration_snapshot: Json
          candidates_tested: number | null
          created_at: string | null
          days_analyzed: number | null
          id: string
          low_accuracy: number | null
          medium_accuracy: number | null
          overall_mse: number | null
          snapshot_date: string
          very_high_accuracy: number | null
          winning_hi_threshold: number | null
          winning_mid_threshold: number | null
        }
        Insert: {
          calibration_snapshot: Json
          candidates_tested?: number | null
          created_at?: string | null
          days_analyzed?: number | null
          id?: string
          low_accuracy?: number | null
          medium_accuracy?: number | null
          overall_mse?: number | null
          snapshot_date?: string
          very_high_accuracy?: number | null
          winning_hi_threshold?: number | null
          winning_mid_threshold?: number | null
        }
        Update: {
          calibration_snapshot?: Json
          candidates_tested?: number | null
          created_at?: string | null
          days_analyzed?: number | null
          id?: string
          low_accuracy?: number | null
          medium_accuracy?: number | null
          overall_mse?: number | null
          snapshot_date?: string
          very_high_accuracy?: number | null
          winning_hi_threshold?: number | null
          winning_mid_threshold?: number | null
        }
        Relationships: []
      }
      daily_nutrition: {
        Row: {
          created_at: string | null
          date: string
          energy_level: number | null
          exercise_minutes: number | null
          id: string
          mood_score: number | null
          notes: string | null
          sleep_hours: number | null
          steps_count: number | null
          total_calories: number | null
          total_carbs_g: number | null
          total_fat_g: number | null
          total_fiber_g: number | null
          total_protein_g: number | null
          total_sodium_mg: number | null
          total_sugar_g: number | null
          updated_at: string | null
          user_id: string
          water_oz: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          energy_level?: number | null
          exercise_minutes?: number | null
          id?: string
          mood_score?: number | null
          notes?: string | null
          sleep_hours?: number | null
          steps_count?: number | null
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_fiber_g?: number | null
          total_protein_g?: number | null
          total_sodium_mg?: number | null
          total_sugar_g?: number | null
          updated_at?: string | null
          user_id: string
          water_oz?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          energy_level?: number | null
          exercise_minutes?: number | null
          id?: string
          mood_score?: number | null
          notes?: string | null
          sleep_hours?: number | null
          steps_count?: number | null
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_fiber_g?: number | null
          total_protein_g?: number | null
          total_sodium_mg?: number | null
          total_sugar_g?: number | null
          updated_at?: string | null
          user_id?: string
          water_oz?: number | null
        }
        Relationships: []
      }
      daily_nutrition_summaries: {
        Row: {
          breakfast_calories: number | null
          calorie_goal: number | null
          carbs_goal: number | null
          created_at: string | null
          date: string
          dinner_calories: number | null
          exercise_calories_burned: number | null
          fat_goal: number | null
          id: string
          lunch_calories: number | null
          protein_goal: number | null
          snack_calories: number | null
          total_calories: number | null
          total_carbs: number | null
          total_fat: number | null
          total_fiber: number | null
          total_protein: number | null
          total_sodium: number | null
          total_sugar: number | null
          updated_at: string | null
          user_id: string
          water_goal_ml: number | null
          water_ml: number | null
        }
        Insert: {
          breakfast_calories?: number | null
          calorie_goal?: number | null
          carbs_goal?: number | null
          created_at?: string | null
          date: string
          dinner_calories?: number | null
          exercise_calories_burned?: number | null
          fat_goal?: number | null
          id?: string
          lunch_calories?: number | null
          protein_goal?: number | null
          snack_calories?: number | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_fiber?: number | null
          total_protein?: number | null
          total_sodium?: number | null
          total_sugar?: number | null
          updated_at?: string | null
          user_id: string
          water_goal_ml?: number | null
          water_ml?: number | null
        }
        Update: {
          breakfast_calories?: number | null
          calorie_goal?: number | null
          carbs_goal?: number | null
          created_at?: string | null
          date?: string
          dinner_calories?: number | null
          exercise_calories_burned?: number | null
          fat_goal?: number | null
          id?: string
          lunch_calories?: number | null
          protein_goal?: number | null
          snack_calories?: number | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_fiber?: number | null
          total_protein?: number | null
          total_sodium?: number | null
          total_sugar?: number | null
          updated_at?: string | null
          user_id?: string
          water_goal_ml?: number | null
          water_ml?: number | null
        }
        Relationships: []
      }
      diet_patterns: {
        Row: {
          constraints: Json
          created_at: string | null
          description: string | null
          formula: string
          id: string
          name: string
          weights: Json
        }
        Insert: {
          constraints?: Json
          created_at?: string | null
          description?: string | null
          formula: string
          id: string
          name: string
          weights?: Json
        }
        Update: {
          constraints?: Json
          created_at?: string | null
          description?: string | null
          formula?: string
          id?: string
          name?: string
          weights?: Json
        }
        Relationships: []
      }
      fasting_sessions: {
        Row: {
          actual_duration_hours: number | null
          created_at: string | null
          difficulty_rating: number | null
          end_time: string | null
          fasting_type: string | null
          id: string
          notes: string | null
          start_time: string
          status: string | null
          target_duration_hours: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_duration_hours?: number | null
          created_at?: string | null
          difficulty_rating?: number | null
          end_time?: string | null
          fasting_type?: string | null
          id?: string
          notes?: string | null
          start_time: string
          status?: string | null
          target_duration_hours: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_duration_hours?: number | null
          created_at?: string | null
          difficulty_rating?: number | null
          end_time?: string | null
          fasting_type?: string | null
          id?: string
          notes?: string | null
          start_time?: string
          status?: string | null
          target_duration_hours?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      favorite_foods: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          fat: number
          fiber: number
          food_name: string
          id: string
          protein: number
          serving_size: number
          serving_unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calories: number
          carbs?: number
          created_at?: string
          fat?: number
          fiber?: number
          food_name: string
          id?: string
          protein?: number
          serving_size?: number
          serving_unit?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          fiber?: number
          food_name?: string
          id?: string
          protein?: number
          serving_size?: number
          serving_unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      food_analysis_runs: {
        Row: {
          client: Json
          confidence: number
          created_at: string | null
          detected_class: string
          errors: Json
          hints: Json
          id: string
          latency_ms: number
          model: string
          ocr_fallback_used: boolean | null
          ocr_latency_ms: number | null
          prompt_hash: string
          result: Json
          run_id: string
          tokens_completion: number | null
          tokens_prompt: number | null
          user_id: string | null
          version: string
        }
        Insert: {
          client?: Json
          confidence: number
          created_at?: string | null
          detected_class: string
          errors?: Json
          hints?: Json
          id?: string
          latency_ms: number
          model: string
          ocr_fallback_used?: boolean | null
          ocr_latency_ms?: number | null
          prompt_hash: string
          result: Json
          run_id: string
          tokens_completion?: number | null
          tokens_prompt?: number | null
          user_id?: string | null
          version?: string
        }
        Update: {
          client?: Json
          confidence?: number
          created_at?: string | null
          detected_class?: string
          errors?: Json
          hints?: Json
          id?: string
          latency_ms?: number
          model?: string
          ocr_fallback_used?: boolean | null
          ocr_latency_ms?: number | null
          prompt_hash?: string
          result?: Json
          run_id?: string
          tokens_completion?: number | null
          tokens_prompt?: number | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      food_entries: {
        Row: {
          calories: number
          carbs: number | null
          created_at: string | null
          fat: number | null
          fiber: number | null
          id: string
          logged_at: string | null
          meal_type: string | null
          name: string
          photo_url: string | null
          protein: number | null
          serving: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calories: number
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          fiber?: number | null
          id?: string
          logged_at?: string | null
          meal_type?: string | null
          name: string
          photo_url?: string | null
          protein?: number | null
          serving: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          fiber?: number | null
          id?: string
          logged_at?: string | null
          meal_type?: string | null
          name?: string
          photo_url?: string | null
          protein?: number | null
          serving?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      food_items: {
        Row: {
          barcode: string | null
          brand: string | null
          calories_per_serving: number
          carbs_g: number
          created_at: string
          created_by: string | null
          fat_g: number
          fiber_g: number
          food_category: string | null
          id: string
          image_url: string | null
          is_verified: boolean
          name: string
          protein_g: number
          serving_size: number
          serving_unit: string
          sodium_mg: number
          sugar_g: number
          updated_at: string | null
          usda_fdc_id: string | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories_per_serving: number
          carbs_g?: number
          created_at?: string
          created_by?: string | null
          fat_g?: number
          fiber_g?: number
          food_category?: string | null
          id?: string
          image_url?: string | null
          is_verified?: boolean
          name: string
          protein_g?: number
          serving_size: number
          serving_unit: string
          sodium_mg?: number
          sugar_g?: number
          updated_at?: string | null
          usda_fdc_id?: string | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories_per_serving?: number
          carbs_g?: number
          created_at?: string
          created_by?: string | null
          fat_g?: number
          fiber_g?: number
          food_category?: string | null
          id?: string
          image_url?: string | null
          is_verified?: boolean
          name?: string
          protein_g?: number
          serving_size?: number
          serving_unit?: string
          sodium_mg?: number
          sugar_g?: number
          updated_at?: string | null
          usda_fdc_id?: string | null
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          barcode: string | null
          brand: string | null
          calories: number | null
          carbs: number | null
          created_at: string | null
          fat: number | null
          fiber: number | null
          food_name: string
          id: string
          image_url: string | null
          logged_at: string | null
          meal_type: string
          protein: number | null
          quantity: number | null
          serving_size: string | null
          serving_unit: string | null
          sodium: number | null
          sugar: number | null
          usda_food_id: string | null
          user_id: string
          voice_note_url: string | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          fiber?: number | null
          food_name: string
          id?: string
          image_url?: string | null
          logged_at?: string | null
          meal_type: string
          protein?: number | null
          quantity?: number | null
          serving_size?: string | null
          serving_unit?: string | null
          sodium?: number | null
          sugar?: number | null
          usda_food_id?: string | null
          user_id: string
          voice_note_url?: string | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          fiber?: number | null
          food_name?: string
          id?: string
          image_url?: string | null
          logged_at?: string | null
          meal_type?: string
          protein?: number | null
          quantity?: number | null
          serving_size?: string | null
          serving_unit?: string | null
          sodium?: number | null
          sugar?: number | null
          usda_food_id?: string | null
          user_id?: string
          voice_note_url?: string | null
        }
        Relationships: []
      }
      food_recognition_cache: {
        Row: {
          cached_result: Json
          created_at: string | null
          expires_at: string | null
          hits: number | null
          id: string
          image_hash: string
          last_accessed: string | null
        }
        Insert: {
          cached_result: Json
          created_at?: string | null
          expires_at?: string | null
          hits?: number | null
          id?: string
          image_hash: string
          last_accessed?: string | null
        }
        Update: {
          cached_result?: Json
          created_at?: string | null
          expires_at?: string | null
          hits?: number | null
          id?: string
          image_hash?: string
          last_accessed?: string | null
        }
        Relationships: []
      }
      food_recognition_logs: {
        Row: {
          confidence: number | null
          created_at: string | null
          error_message: string | null
          id: string
          image_uri: string
          model_used: string
          nutrition_data: Json | null
          portion_estimate: string | null
          processing_time_ms: number | null
          recognized_food: string | null
          success: boolean | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_uri: string
          model_used: string
          nutrition_data?: Json | null
          portion_estimate?: string | null
          processing_time_ms?: number | null
          recognized_food?: string | null
          success?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_uri?: string
          model_used?: string
          nutrition_data?: Json | null
          portion_estimate?: string | null
          processing_time_ms?: number | null
          recognized_food?: string | null
          success?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      food_vision_benchmark_sessions: {
        Row: {
          avg_accuracy: number | null
          avg_confidence: number | null
          avg_response_time_ms: number | null
          completed_at: string | null
          created_by: string | null
          description: string | null
          id: string
          model_version: string | null
          session_name: string
          started_at: string | null
          status: string | null
          test_image_count: number | null
        }
        Insert: {
          avg_accuracy?: number | null
          avg_confidence?: number | null
          avg_response_time_ms?: number | null
          completed_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          model_version?: string | null
          session_name: string
          started_at?: string | null
          status?: string | null
          test_image_count?: number | null
        }
        Update: {
          avg_accuracy?: number | null
          avg_confidence?: number | null
          avg_response_time_ms?: number | null
          completed_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          model_version?: string | null
          session_name?: string
          started_at?: string | null
          status?: string | null
          test_image_count?: number | null
        }
        Relationships: []
      }
      food_vision_ground_truth: {
        Row: {
          actual_ingredients: string[] | null
          actual_nutrition: Json
          actual_portion_grams: number | null
          created_at: string | null
          food_name: string
          id: string
          image_hash: string
          notes: string | null
          verification_confidence: number | null
          verification_source: string | null
          verified_by: string | null
        }
        Insert: {
          actual_ingredients?: string[] | null
          actual_nutrition: Json
          actual_portion_grams?: number | null
          created_at?: string | null
          food_name: string
          id?: string
          image_hash: string
          notes?: string | null
          verification_confidence?: number | null
          verification_source?: string | null
          verified_by?: string | null
        }
        Update: {
          actual_ingredients?: string[] | null
          actual_nutrition?: Json
          actual_portion_grams?: number | null
          created_at?: string | null
          food_name?: string
          id?: string
          image_hash?: string
          notes?: string | null
          verification_confidence?: number | null
          verification_source?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      food_vision_logs: {
        Row: {
          accuracy_score: number | null
          angles_used: number | null
          benchmark_session_id: string | null
          confidence: number | null
          created_at: string | null
          food_name: string
          id: string
          image_size_bytes: number | null
          ingredients: string[] | null
          model_version: string | null
          nutrition_data: Json
          portion_size: number | null
          response_time_ms: number | null
          updated_at: string | null
          usda_matched: boolean | null
          user_id: string | null
        }
        Insert: {
          accuracy_score?: number | null
          angles_used?: number | null
          benchmark_session_id?: string | null
          confidence?: number | null
          created_at?: string | null
          food_name: string
          id?: string
          image_size_bytes?: number | null
          ingredients?: string[] | null
          model_version?: string | null
          nutrition_data: Json
          portion_size?: number | null
          response_time_ms?: number | null
          updated_at?: string | null
          usda_matched?: boolean | null
          user_id?: string | null
        }
        Update: {
          accuracy_score?: number | null
          angles_used?: number | null
          benchmark_session_id?: string | null
          confidence?: number | null
          created_at?: string | null
          food_name?: string
          id?: string
          image_size_bytes?: number | null
          ingredients?: string[] | null
          model_version?: string | null
          nutrition_data?: Json
          portion_size?: number | null
          response_time_ms?: number | null
          updated_at?: string | null
          usda_matched?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      food_vision_performance_metrics: {
        Row: {
          avg_accuracy: number | null
          avg_confidence: number | null
          avg_response_time_ms: number | null
          created_at: string | null
          error_rate: number | null
          id: string
          metric_date: string
          metric_hour: number | null
          performance_grade: string | null
          success_rate: number | null
          top_recognized_foods: Json | null
          total_analyses: number | null
        }
        Insert: {
          avg_accuracy?: number | null
          avg_confidence?: number | null
          avg_response_time_ms?: number | null
          created_at?: string | null
          error_rate?: number | null
          id?: string
          metric_date: string
          metric_hour?: number | null
          performance_grade?: string | null
          success_rate?: number | null
          top_recognized_foods?: Json | null
          total_analyses?: number | null
        }
        Update: {
          avg_accuracy?: number | null
          avg_confidence?: number | null
          avg_response_time_ms?: number | null
          created_at?: string | null
          error_rate?: number | null
          id?: string
          metric_date?: string
          metric_hour?: number | null
          performance_grade?: string | null
          success_rate?: number | null
          top_recognized_foods?: Json | null
          total_analyses?: number | null
        }
        Relationships: []
      }
      food_vision_user_feedback: {
        Row: {
          corrected_food_name: string | null
          corrected_ingredients: string[] | null
          corrected_nutrition: Json | null
          corrected_portion_grams: number | null
          created_at: string | null
          feedback_type: string
          id: string
          improvement_priority: number | null
          user_id: string | null
          user_notes: string | null
          vision_log_id: string | null
        }
        Insert: {
          corrected_food_name?: string | null
          corrected_ingredients?: string[] | null
          corrected_nutrition?: Json | null
          corrected_portion_grams?: number | null
          created_at?: string | null
          feedback_type: string
          id?: string
          improvement_priority?: number | null
          user_id?: string | null
          user_notes?: string | null
          vision_log_id?: string | null
        }
        Update: {
          corrected_food_name?: string | null
          corrected_ingredients?: string[] | null
          corrected_nutrition?: Json | null
          corrected_portion_grams?: number | null
          created_at?: string | null
          feedback_type?: string
          id?: string
          improvement_priority?: number | null
          user_id?: string | null
          user_notes?: string | null
          vision_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_vision_user_feedback_vision_log_id_fkey"
            columns: ["vision_log_id"]
            isOneToOne: false
            referencedRelation: "food_vision_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_milestones: {
        Row: {
          achieved: boolean | null
          achieved_date: string | null
          created_at: string | null
          description: string | null
          goal_id: string
          id: string
          title: string
          value: number
        }
        Insert: {
          achieved?: boolean | null
          achieved_date?: string | null
          created_at?: string | null
          description?: string | null
          goal_id: string
          id?: string
          title: string
          value: number
        }
        Update: {
          achieved?: boolean | null
          achieved_date?: string | null
          created_at?: string | null
          description?: string | null
          goal_id?: string
          id?: string
          title?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string
          completed_date: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          id: string
          priority: string | null
          progress: number | null
          start_date: string
          start_value: number | null
          status: string
          target_date: string | null
          target_value: number
          title: string
          type: string
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          completed_date?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          priority?: string | null
          progress?: number | null
          start_date?: string
          start_value?: number | null
          status?: string
          target_date?: string | null
          target_value: number
          title: string
          type: string
          unit: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          completed_date?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          priority?: string | null
          progress?: number | null
          start_date?: string
          start_value?: number | null
          status?: string
          target_date?: string | null
          target_value?: number
          title?: string
          type?: string
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habit_stacks: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          current_streak: number | null
          id: string
          is_active: boolean | null
          longest_streak: number | null
          paused_at: string | null
          paused_reason: string | null
          reminder_offset_minutes: number | null
          success_count: number | null
          target_habit: string
          trigger_days: number[] | null
          trigger_habit: string
          trigger_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          is_active?: boolean | null
          longest_streak?: number | null
          paused_at?: string | null
          paused_reason?: string | null
          reminder_offset_minutes?: number | null
          success_count?: number | null
          target_habit: string
          trigger_days?: number[] | null
          trigger_habit: string
          trigger_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          is_active?: boolean | null
          longest_streak?: number | null
          paused_at?: string | null
          paused_reason?: string | null
          reminder_offset_minutes?: number | null
          success_count?: number | null
          target_habit?: string
          trigger_days?: number[] | null
          trigger_habit?: string
          trigger_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_stacks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          created_at: string | null
          currency: string | null
          id: string
          invoice_date: string
          pdf_url: string | null
          status: string
          stripe_invoice_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_date: string
          pdf_url?: string | null
          status: string
          stripe_invoice_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_date?: string
          pdf_url?: string | null
          status?: string
          stripe_invoice_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kv_store_7ea53983: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      meal_plan_entries: {
        Row: {
          created_at: string | null
          date: string
          food_entry_id: string | null
          id: string
          meal_plan_id: string | null
          meal_type: string
          notes: string | null
          recipe_id: string | null
          servings: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          food_entry_id?: string | null
          id?: string
          meal_plan_id?: string | null
          meal_type: string
          notes?: string | null
          recipe_id?: string | null
          servings?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          food_entry_id?: string | null
          id?: string
          meal_plan_id?: string | null
          meal_type?: string
          notes?: string | null
          recipe_id?: string | null
          servings?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_entries_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_entries_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_items: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          day_number: number
          fat_g: number | null
          food_description: string | null
          food_name: string
          id: string
          meal_plan_id: string
          meal_type: string
          notes: string | null
          order_in_meal: number | null
          protein_g: number | null
          serving_size: number
          serving_unit: string | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          day_number: number
          fat_g?: number | null
          food_description?: string | null
          food_name: string
          id?: string
          meal_plan_id: string
          meal_type: string
          notes?: string | null
          order_in_meal?: number | null
          protein_g?: number | null
          serving_size?: number
          serving_unit?: string | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          day_number?: number
          fat_g?: number | null
          food_description?: string | null
          food_name?: string
          id?: string
          meal_plan_id?: string
          meal_type?: string
          notes?: string | null
          order_in_meal?: number | null
          protein_g?: number | null
          serving_size?: number
          serving_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string | null
          description: string | null
          duration_days: number | null
          id: string
          is_active: boolean | null
          name: string
          plan_type: string | null
          target_calories: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_protein_g: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          plan_type?: string | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          plan_type?: string | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meal_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          meals: Json
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          meals: Json
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          meals?: Json
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          coach_id: string
          content: string
          created_at: string
          id: string
          metadata: Json
          role: string
          user_id: string
        }
        Insert: {
          coach_id: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          user_id: string
        }
        Update: {
          coach_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_lessons: {
        Row: {
          avg_rating: number | null
          category: string
          content: string
          created_at: string | null
          difficulty_level: number | null
          estimated_read_time_seconds: number | null
          external_url: string | null
          id: string
          image_url: string | null
          related_lessons: string[] | null
          share_count: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          avg_rating?: number | null
          category: string
          content: string
          created_at?: string | null
          difficulty_level?: number | null
          estimated_read_time_seconds?: number | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          related_lessons?: string[] | null
          share_count?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          avg_rating?: number | null
          category?: string
          content?: string
          created_at?: string | null
          difficulty_level?: number | null
          estimated_read_time_seconds?: number | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          related_lessons?: string[] | null
          share_count?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      nutrition_knowledge: {
        Row: {
          category: string
          coach_specializations: string[] | null
          content: string
          created_at: string | null
          embedding: string | null
          embedding_gte: string | null
          id: string
          last_accessed: string | null
          metadata: Json | null
          relevance_score: number | null
          source: string
          source_id: string | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          coach_specializations?: string[] | null
          content: string
          created_at?: string | null
          embedding?: string | null
          embedding_gte?: string | null
          id?: string
          last_accessed?: string | null
          metadata?: Json | null
          relevance_score?: number | null
          source: string
          source_id?: string | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          coach_specializations?: string[] | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          embedding_gte?: string | null
          id?: string
          last_accessed?: string | null
          metadata?: Json | null
          relevance_score?: number | null
          source?: string
          source_id?: string | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          calories: number
          carbs_g: number | null
          created_at: string | null
          custom_food_name: string | null
          fat_g: number | null
          fiber_g: number | null
          food_name: string
          id: string
          logged_at: string | null
          meal_type: string | null
          notes: string | null
          protein_g: number | null
          serving_size: number
          serving_unit: string | null
          sodium_mg: number | null
          source: string | null
          sugar_g: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calories?: number
          carbs_g?: number | null
          created_at?: string | null
          custom_food_name?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          food_name: string
          id?: string
          logged_at?: string | null
          meal_type?: string | null
          notes?: string | null
          protein_g?: number | null
          serving_size?: number
          serving_unit?: string | null
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number | null
          created_at?: string | null
          custom_food_name?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          food_name?: string
          id?: string
          logged_at?: string | null
          meal_type?: string | null
          notes?: string | null
          protein_g?: number | null
          serving_size?: number
          serving_unit?: string | null
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pantry_history: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          pantry_item_id: string | null
          quantity_after: string | null
          quantity_before: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          pantry_item_id?: string | null
          quantity_after?: string | null
          quantity_before?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          pantry_item_id?: string | null
          quantity_after?: string | null
          quantity_before?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_history_pantry_item_id_fkey"
            columns: ["pantry_item_id"]
            isOneToOne: false
            referencedRelation: "pantry_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_items: {
        Row: {
          barcode: string | null
          category: string
          created_at: string
          expiry_date: string | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          quantity: string
          quantity_numeric: number | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          category: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          quantity: string
          quantity_numeric?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          category?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          quantity?: string
          quantity_numeric?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string | null
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean | null
          last4: string | null
          stripe_payment_method_id: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          stripe_payment_method_id: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          stripe_payment_method_id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      predictive_nudges: {
        Row: {
          based_on_pattern: string | null
          confidence_score: number | null
          created_at: string | null
          dismissed_count: number | null
          effectiveness_score: number | null
          engaged_count: number | null
          id: string
          is_active: boolean | null
          last_sent: string | null
          next_scheduled: string | null
          nudge_type: string
          pattern_strength: number | null
          predicted_time: string
          sent_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          based_on_pattern?: string | null
          confidence_score?: number | null
          created_at?: string | null
          dismissed_count?: number | null
          effectiveness_score?: number | null
          engaged_count?: number | null
          id?: string
          is_active?: boolean | null
          last_sent?: string | null
          next_scheduled?: string | null
          nudge_type: string
          pattern_strength?: number | null
          predicted_time: string
          sent_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          based_on_pattern?: string | null
          confidence_score?: number | null
          created_at?: string | null
          dismissed_count?: number | null
          effectiveness_score?: number | null
          engaged_count?: number | null
          id?: string
          is_active?: boolean | null
          last_sent?: string | null
          next_scheduled?: string | null
          nudge_type?: string
          pattern_strength?: number | null
          predicted_time?: string
          sent_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictive_nudges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          address_city: string | null
          address_country: string | null
          address_line1: string | null
          address_line2: string | null
          address_postal_code: string | null
          address_state: string | null
          age: number | null
          allergies: string[] | null
          avatar_url: string | null
          breakfast_time: string | null
          call_enabled: boolean | null
          coach_id: string | null
          coach_personality: string | null
          coaching_reminders: boolean | null
          created_at: string | null
          custom_diet_name: string | null
          daily_calorie_goal: number | null
          daily_image_scans_used: number | null
          daily_voice_minutes_used: number | null
          diet_type: string | null
          dinner_time: string | null
          dislikes: string[] | null
          email: string
          fasting_days: string[] | null
          fasting_enabled: boolean | null
          fasting_end_time: string | null
          fasting_reminders: boolean | null
          fasting_start_time: string | null
          fasting_type: string | null
          full_name: string | null
          gender: string | null
          health_conditions: string[] | null
          height: number | null
          height_cm: number | null
          height_feet: number | null
          height_inches: number | null
          height_unit: string | null
          language: string | null
          last_roast_sent_at: string | null
          last_synced_at: string | null
          lunch_time: string | null
          meal_frequency: string | null
          meal_reminders: boolean | null
          medications: string[] | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          primary_goal: string | null
          privacy_analytics: boolean | null
          roast_enabled: boolean | null
          roast_intensity: number | null
          roast_level: number | null
          roast_mode: string | null
          schema_version: number | null
          selected_coach_id: string | null
          sleep_hours: number | null
          sms_phone_number: string | null
          stress_level: number | null
          subscription_end_date: string | null
          subscription_tier: string | null
          target_weight_kg: number | null
          theme: string | null
          units: string | null
          updated_at: string | null
          user_id: string
          version: number | null
          voice_enabled: boolean | null
          weight: number | null
          weight_kg: number | null
          weight_unit: string | null
        }
        Insert: {
          activity_level?: string | null
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          age?: number | null
          allergies?: string[] | null
          avatar_url?: string | null
          breakfast_time?: string | null
          call_enabled?: boolean | null
          coach_id?: string | null
          coach_personality?: string | null
          coaching_reminders?: boolean | null
          created_at?: string | null
          custom_diet_name?: string | null
          daily_calorie_goal?: number | null
          daily_image_scans_used?: number | null
          daily_voice_minutes_used?: number | null
          diet_type?: string | null
          dinner_time?: string | null
          dislikes?: string[] | null
          email: string
          fasting_days?: string[] | null
          fasting_enabled?: boolean | null
          fasting_end_time?: string | null
          fasting_reminders?: boolean | null
          fasting_start_time?: string | null
          fasting_type?: string | null
          full_name?: string | null
          gender?: string | null
          health_conditions?: string[] | null
          height?: number | null
          height_cm?: number | null
          height_feet?: number | null
          height_inches?: number | null
          height_unit?: string | null
          language?: string | null
          last_roast_sent_at?: string | null
          last_synced_at?: string | null
          lunch_time?: string | null
          meal_frequency?: string | null
          meal_reminders?: boolean | null
          medications?: string[] | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          primary_goal?: string | null
          privacy_analytics?: boolean | null
          roast_enabled?: boolean | null
          roast_intensity?: number | null
          roast_level?: number | null
          roast_mode?: string | null
          schema_version?: number | null
          selected_coach_id?: string | null
          sleep_hours?: number | null
          sms_phone_number?: string | null
          stress_level?: number | null
          subscription_end_date?: string | null
          subscription_tier?: string | null
          target_weight_kg?: number | null
          theme?: string | null
          units?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
          voice_enabled?: boolean | null
          weight?: number | null
          weight_kg?: number | null
          weight_unit?: string | null
        }
        Update: {
          activity_level?: string | null
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          age?: number | null
          allergies?: string[] | null
          avatar_url?: string | null
          breakfast_time?: string | null
          call_enabled?: boolean | null
          coach_id?: string | null
          coach_personality?: string | null
          coaching_reminders?: boolean | null
          created_at?: string | null
          custom_diet_name?: string | null
          daily_calorie_goal?: number | null
          daily_image_scans_used?: number | null
          daily_voice_minutes_used?: number | null
          diet_type?: string | null
          dinner_time?: string | null
          dislikes?: string[] | null
          email?: string
          fasting_days?: string[] | null
          fasting_enabled?: boolean | null
          fasting_end_time?: string | null
          fasting_reminders?: boolean | null
          fasting_start_time?: string | null
          fasting_type?: string | null
          full_name?: string | null
          gender?: string | null
          health_conditions?: string[] | null
          height?: number | null
          height_cm?: number | null
          height_feet?: number | null
          height_inches?: number | null
          height_unit?: string | null
          language?: string | null
          last_roast_sent_at?: string | null
          last_synced_at?: string | null
          lunch_time?: string | null
          meal_frequency?: string | null
          meal_reminders?: boolean | null
          medications?: string[] | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          primary_goal?: string | null
          privacy_analytics?: boolean | null
          roast_enabled?: boolean | null
          roast_intensity?: number | null
          roast_level?: number | null
          roast_mode?: string | null
          schema_version?: number | null
          selected_coach_id?: string | null
          sleep_hours?: number | null
          sms_phone_number?: string | null
          stress_level?: number | null
          subscription_end_date?: string | null
          subscription_tier?: string | null
          target_weight_kg?: number | null
          theme?: string | null
          units?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
          voice_enabled?: boolean | null
          weight?: number | null
          weight_kg?: number | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      query_complexity_patterns: {
        Row: {
          avg_response_quality: number | null
          base_complexity: number
          created_at: string | null
          fallback_model: string | null
          id: string
          match_count: number | null
          pattern_description: string | null
          pattern_regex: string
          recommended_model: string
          requires_calculation: boolean | null
          requires_context: boolean | null
          requires_research: boolean | null
          updated_at: string | null
        }
        Insert: {
          avg_response_quality?: number | null
          base_complexity: number
          created_at?: string | null
          fallback_model?: string | null
          id?: string
          match_count?: number | null
          pattern_description?: string | null
          pattern_regex: string
          recommended_model: string
          requires_calculation?: boolean | null
          requires_context?: boolean | null
          requires_research?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avg_response_quality?: number | null
          base_complexity?: number
          created_at?: string | null
          fallback_model?: string | null
          id?: string
          match_count?: number | null
          pattern_description?: string | null
          pattern_regex?: string
          recommended_model?: string
          requires_calculation?: boolean | null
          requires_context?: boolean | null
          requires_research?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          created_at: string | null
          id: string
          ingredient_name: string
          notes: string | null
          quantity: string | null
          recipe_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_name: string
          notes?: string | null
          quantity?: string | null
          recipe_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_name?: string
          notes?: string | null
          quantity?: string | null
          recipe_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_tags: {
        Row: {
          created_at: string | null
          id: string
          recipe_id: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipe_id: string
          tag: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recipe_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_tags_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories_per_serving: number | null
          carbs_g: number | null
          cook_time_minutes: number | null
          created_at: string | null
          created_by: string | null
          cuisine_type: string | null
          description: string | null
          difficulty_level: string | null
          fat_g: number | null
          fiber_g: number | null
          id: string
          image_url: string | null
          instructions: Json | null
          is_public: boolean | null
          name: string
          prep_time_minutes: number | null
          protein_g: number | null
          servings: number | null
          updated_at: string | null
        }
        Insert: {
          calories_per_serving?: number | null
          carbs_g?: number | null
          cook_time_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          cuisine_type?: string | null
          description?: string | null
          difficulty_level?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          instructions?: Json | null
          is_public?: boolean | null
          name: string
          prep_time_minutes?: number | null
          protein_g?: number | null
          servings?: number | null
          updated_at?: string | null
        }
        Update: {
          calories_per_serving?: number | null
          carbs_g?: number | null
          cook_time_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          cuisine_type?: string | null
          description?: string | null
          difficulty_level?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          instructions?: Json | null
          is_public?: boolean | null
          name?: string
          prep_time_minutes?: number | null
          protein_g?: number | null
          servings?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      roasts: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          level: number
          message: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level: number
          message: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          message?: string
        }
        Relationships: []
      }
      shopping_list: {
        Row: {
          category: string | null
          created_at: string
          id: string
          item_name: string
          note: string | null
          priority: number | null
          purchased: boolean | null
          purchased_at: string | null
          quantity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          item_name: string
          note?: string | null
          priority?: number | null
          purchased?: boolean | null
          purchased_at?: string | null
          quantity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          item_name?: string
          note?: string | null
          priority?: number | null
          purchased?: boolean | null
          purchased_at?: string | null
          quantity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_behavior_patterns: {
        Row: {
          confidence_score: number | null
          first_observed: string | null
          frequency_score: number | null
          id: string
          is_active: boolean | null
          last_updated: string | null
          occurrence_count: number | null
          pattern_data: Json
          pattern_type: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          first_observed?: string | null
          frequency_score?: number | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          occurrence_count?: number | null
          pattern_data: Json
          pattern_type: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          first_observed?: string | null
          frequency_score?: number | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          occurrence_count?: number | null
          pattern_data?: Json
          pattern_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_coach_consent: {
        Row: {
          consent_type: string
          double_confirmed: boolean | null
          double_confirmed_at: string | null
          expires_at: string | null
          granted: boolean
          granted_at: string | null
          id: string
          metadata: Json | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          double_confirmed?: boolean | null
          double_confirmed_at?: string | null
          expires_at?: string | null
          granted: boolean
          granted_at?: string | null
          id?: string
          metadata?: Json | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          double_confirmed?: boolean | null
          double_confirmed_at?: string | null
          expires_at?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          metadata?: Json | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coach_consent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_coach_purchases: {
        Row: {
          cancelled_at: string | null
          coach_id: string
          created_at: string | null
          expires_at: string | null
          purchase_type: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          coach_id: string
          created_at?: string | null
          expires_at?: string | null
          purchase_type: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          coach_id?: string
          created_at?: string | null
          expires_at?: string | null
          purchase_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coach_purchases_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coach_purchases_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coach_settings: {
        Row: {
          active_coach_id: string
          active_mode: string
          call_enabled: boolean | null
          call_max_per_week: number | null
          created_at: string | null
          habit_stacking_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          in_app_max_per_day: number | null
          micro_lessons_enabled: boolean | null
          predictive_nudges_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          severity: number | null
          sms_enabled: boolean | null
          sms_max_per_day: number | null
          sms_phone_number: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_coach_id?: string
          active_mode?: string
          call_enabled?: boolean | null
          call_max_per_week?: number | null
          created_at?: string | null
          habit_stacking_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          in_app_max_per_day?: number | null
          micro_lessons_enabled?: boolean | null
          predictive_nudges_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          severity?: number | null
          sms_enabled?: boolean | null
          sms_max_per_day?: number | null
          sms_phone_number?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_coach_id?: string
          active_mode?: string
          call_enabled?: boolean | null
          call_max_per_week?: number | null
          created_at?: string | null
          habit_stacking_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          in_app_max_per_day?: number | null
          micro_lessons_enabled?: boolean | null
          predictive_nudges_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          severity?: number | null
          sms_enabled?: boolean | null
          sms_max_per_day?: number | null
          sms_phone_number?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coach_settings_active_coach_id_fkey"
            columns: ["active_coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coach_settings_active_coach_id_fkey"
            columns: ["active_coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coach_settings_active_mode_fkey"
            columns: ["active_mode"]
            isOneToOne: false
            referencedRelation: "coach_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coach_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_diet_preferences: {
        Row: {
          allergies: string[] | null
          constraints: Json | null
          created_at: string | null
          fasting_mode: string | null
          goals_w: Json | null
          id: string
          preferences: string[] | null
          target_macros: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          constraints?: Json | null
          created_at?: string | null
          fasting_mode?: string | null
          goals_w?: Json | null
          id?: string
          preferences?: string[] | null
          target_macros?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          constraints?: Json | null
          created_at?: string | null
          fasting_mode?: string | null
          goals_w?: Json | null
          id?: string
          preferences?: string[] | null
          target_macros?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_diet_runs: {
        Row: {
          constraints: Json
          created_at: string | null
          fasting: Json | null
          features: Json
          goals: Json
          id: string
          pattern_id: string | null
          plan: Json
          recs: Json | null
          score: number
          user_id: string
        }
        Insert: {
          constraints: Json
          created_at?: string | null
          fasting?: Json | null
          features: Json
          goals: Json
          id?: string
          pattern_id?: string | null
          plan: Json
          recs?: Json | null
          score: number
          user_id: string
        }
        Update: {
          constraints?: Json
          created_at?: string | null
          fasting?: Json | null
          features?: Json
          goals?: Json
          id?: string
          pattern_id?: string | null
          plan?: Json
          recs?: Json | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_diet_runs_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "diet_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          activity_level: string | null
          carbs_target: number | null
          created_at: string | null
          daily_calorie_target: number | null
          fat_target: number | null
          goal_type: string
          id: string
          is_active: boolean | null
          protein_target: number | null
          target_date: string | null
          target_weight: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          carbs_target?: number | null
          created_at?: string | null
          daily_calorie_target?: number | null
          fat_target?: number | null
          goal_type: string
          id?: string
          is_active?: boolean | null
          protein_target?: number | null
          target_date?: string | null
          target_weight?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_level?: string | null
          carbs_target?: number | null
          created_at?: string | null
          daily_calorie_target?: number | null
          fat_target?: number | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          protein_target?: number | null
          target_date?: string | null
          target_weight?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_micro_lessons: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          id: string
          lesson_id: string
          notes: string | null
          rating: number | null
          shared: boolean | null
          time_spent_seconds: number | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          lesson_id: string
          notes?: string | null
          rating?: number | null
          shared?: boolean | null
          time_spent_seconds?: number | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          lesson_id?: string
          notes?: string | null
          rating?: number | null
          shared?: boolean | null
          time_spent_seconds?: number | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_micro_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "micro_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_micro_lessons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_checked_date: string | null
          longest_streak: number | null
          streak_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_checked_date?: string | null
          longest_streak?: number | null
          streak_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_checked_date?: string | null
          longest_streak?: number | null
          streak_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_interval: string | null
          cancelled_at: string | null
          created_at: string | null
          currency: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          price_paid_cents: number | null
          started_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          price_paid_cents?: number | null
          started_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          price_paid_cents?: number | null
          started_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      viral_shares: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          is_public: boolean | null
          likes: number | null
          share_code: string | null
          share_type: string
          title: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          likes?: number | null
          share_code?: string | null
          share_type: string
          title?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          likes?: number | null
          share_code?: string | null
          share_type?: string
          title?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      voice_sessions: {
        Row: {
          ai_response: string | null
          created_at: string | null
          duration_seconds: number
          id: string
          session_type: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          ai_response?: string | null
          created_at?: string | null
          duration_seconds: number
          id?: string
          session_type: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          ai_response?: string | null
          created_at?: string | null
          duration_seconds?: number
          id?: string
          session_type?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          adherence: number | null
          badge: string | null
          created_at: string | null
          features_avg: Json | null
          id: string
          pattern_id: string | null
          score: number | null
          user_id: string
          week_start: string
        }
        Insert: {
          adherence?: number | null
          badge?: string | null
          created_at?: string | null
          features_avg?: Json | null
          id?: string
          pattern_id?: string | null
          score?: number | null
          user_id: string
          week_start: string
        }
        Update: {
          adherence?: number | null
          badge?: string | null
          created_at?: string | null
          features_avg?: Json | null
          id?: string
          pattern_id?: string | null
          score?: number | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "diet_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      calibration_cron_health: {
        Row: {
          avg_duration_ms: number | null
          failed_runs: number | null
          health_status: string | null
          last_run_at: string | null
          success_rate_pct: number | null
          successful_runs: number | null
          total_runs: number | null
        }
        Relationships: []
      }
      calibration_cron_recent: {
        Row: {
          best_hi_threshold: number | null
          best_mid_threshold: number | null
          best_mse: number | null
          duration_ms: number | null
          error_message: string | null
          execution_end: string | null
          execution_start: string | null
          result_json: Json | null
          success: boolean | null
        }
        Relationships: []
      }
      coach_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_severity: number | null
          description: string | null
          id: string | null
          is_active: boolean | null
          level: number | null
          name: string | null
          supported_modes: string[] | null
          tone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_severity?: number | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          level?: number | null
          name?: string | null
          supported_modes?: string[] | null
          tone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_severity?: number | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          level?: number | null
          name?: string | null
          supported_modes?: string[] | null
          tone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      food_analysis_slo_metrics: {
        Row: {
          avg_confidence: number | null
          detected_class: string | null
          error_count: number | null
          hour: string | null
          ocr_fallback_count: number | null
          ocr_fallback_rate_pct: number | null
          p95_latency_ms: number | null
          p99_latency_ms: number | null
          success_count: number | null
          success_rate_pct: number | null
          total_requests: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      analyze_query_complexity: {
        Args: { query_text: string }
        Returns: {
          complexity_score: number
          recommended_model: string
          requires_context: boolean
        }[]
      }
      calculate_adherence:
        | {
            Args: {
              p_end_date: string
              p_start_date: string
              p_user_id: string
            }
            Returns: number
          }
        | { Args: { p_days?: number; p_user_id: string }; Returns: number }
      calculate_daily_planned_macros: {
        Args: { p_date: string; p_user_id: string }
        Returns: {
          total_calories: number
          total_carbs: number
          total_fat: number
          total_fiber: number
          total_protein: number
        }[]
      }
      cleanup_old_food_analysis_runs: { Args: never; Returns: number }
      fit_confidence_buckets_best_of_n: {
        Args: { p_candidates?: number[]; p_days_back?: number }
        Returns: Json
      }
      fn_coach_search_chunks_arr: {
        Args: {
          p_coach_id: string
          p_match_count?: number
          p_min_similarity?: number
          p_query: number[]
        }
        Returns: {
          chunk: string
          chunk_index: number
          doc_id: string
          knowledge_id: string
          similarity: number
          source: string
          title: string
          url: string
        }[]
      }
      generate_shopping_list: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          ingredient_name: string
          recipe_names: string[]
          total_quantity: string
          unit: string
        }[]
      }
      get_coach_expertise_summary: {
        Args: { target_coach_id: string }
        Returns: {
          avg_similarity_score: number
          evidence_distribution: Json
          primary_domains: string[]
          secondary_domains: string[]
          top_sources: string[]
          total_knowledge_items: number
        }[]
      }
      get_coach_performance: {
        Args: { days_back?: number; target_coach_id: string }
        Returns: {
          avg_rating: number
          helpful_percentage: number
          total_feedback: number
          total_responses: number
        }[]
      }
      get_default_payment_method: {
        Args: { p_user_id: string }
        Returns: {
          brand: string
          id: string
          last4: string
          stripe_payment_method_id: string
          type: string
        }[]
      }
      get_expiring_items: {
        Args: { p_user_id: string }
        Returns: {
          category: string
          expiry_date: string
          id: string
          name: string
          quantity: string
        }[]
      }
      get_fasting_multiplier: {
        Args: { p_adherence?: number; p_bmi?: number; p_fasting_mode: string }
        Returns: number
      }
      get_food_vision_accuracy_report: {
        Args: { days_back?: number; min_confidence?: number }
        Returns: Json
      }
      get_user_coach_config: {
        Args: { p_user_id: string }
        Returns: {
          active_mode: string
          channels: Json
          coach_id: string
          coach_name: string
          coach_tone: string
          roast_consent: boolean
          savage_consent: boolean
          severity: number
        }[]
      }
      get_user_subscription_details: {
        Args: { p_user_id: string }
        Returns: {
          default_payment_last4: string
          expires_at: string
          has_payment_method: boolean
          status: string
          subscription_id: string
          tier: string
        }[]
      }
      get_weekly_meal_summary: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          date: string
          has_breakfast: boolean
          has_dinner: boolean
          has_lunch: boolean
          has_snacks: boolean
          total_meals: number
        }[]
      }
      optimize_coach_prompts: { Args: never; Returns: undefined }
      recompute_confidence_calibration_with_edges: {
        Args: {
          p_days_back?: number
          p_hi_threshold: number
          p_mid_threshold: number
        }
        Returns: Json
      }
      run_calibration_tuning_with_logging: { Args: never; Returns: Json }
      score_to_badge: { Args: { p_score: number }; Returns: string }
      search_coach_specialized_knowledge: {
        Args: {
          evidence_level_max?: number
          knowledge_domains?: string[]
          limit_results?: number
          query_embedding: string
          similarity_threshold?: number
          target_coach_id: string
        }
        Returns: {
          authors: string[]
          citation_format: string
          content: string
          domain_category: string
          evidence_level: number
          id: string
          keywords: string[]
          retrieval_count: number
          similarity: number
          source_title: string
          source_type: string
          summary: string
          title: string
        }[]
      }
      search_nutrition_knowledge: {
        Args: {
          match_limit?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          category: string
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      search_nutrition_knowledge_gte: {
        Args: {
          limit_results?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          title: string
        }[]
      }
      search_nutrition_knowledge_gte_384: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          title: string
        }[]
      }
      test_smtp: {
        Args: {
          from_email: string
          smtp_password: string
          smtp_port: number
          smtp_server: string
          smtp_username: string
          to_email: string
          use_tls?: boolean
        }
        Returns: string
      }
      trigger_calibration_now: { Args: never; Returns: Json }
      update_user_streak: {
        Args: { p_streak_type: string; p_user_id: string }
        Returns: undefined
      }
      verify_coach_knowledge_profiles_schema: {
        Args: never
        Returns: {
          check_name: string
          details: string
          status: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

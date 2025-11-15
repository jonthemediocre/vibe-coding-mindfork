# MindFork Complete Schema Index
**Last Updated:** 2025-11-16
**Database:** Supabase PostgreSQL
**Total Tables:** 178
**Total Functions:** 223
**Total Views:** 7

---

## 📊 CORE FEATURES

### User & Profile Management
- **profiles** (109 columns, 216 KB) - Core user profiles with preferences, goals, traits
- **user_traits** (9 columns) - AI-detected user characteristics
- **user_diet_preferences** (10 columns) - Dietary restrictions and preferences
- **user_goals** (13 columns) - User health and fitness goals
- **user_streaks** (8 columns) - Habit and achievement streaks
- **user_xp_levels** (9 columns) - Gamification level tracking

### Food Tracking & Nutrition
- **food_entries** (43 columns, 1.7 MB) - Primary food logging table
- **food_items** (20 columns) - Master food database
- **food_logs** (24 columns) - Alternative food logging
- **meal_plans** (13 columns) - User meal planning
- **meal_plan_entries** (10 columns) - Individual meal plan items
- **planned_meals** (11 columns) - Scheduled meals
- **recipes** (22 columns, 1.7 MB) - Recipe database with nutrition
- **recipe_ingredients** (7 columns) - Recipe component breakdown
- **recipe_tags** (4 columns) - Recipe categorization
- **daily_nutrition** (19 columns) - Daily nutrition aggregates
- **daily_nutrition_summaries** (23 columns) - Computed daily stats
- **nutrition_knowledge** (18 columns, 184 KB) - Nutrition education content

### Food Recognition & Vision
- **food_vision_logs** (16 columns, 1.1 MB) - AI vision API logs
- **food_vision_ground_truth** (11 columns) - Training labels
- **food_vision_user_feedback** (11 columns, 528 KB) - User corrections
- **food_vision_performance_metrics** (12 columns, 1.5 MB) - Model performance
- **food_vision_benchmark_sessions** (12 columns) - Benchmark runs
- **food_recognition_cache** (7 columns) - Vision API cache
- **food_recognition_logs** (13 columns) - Recognition attempts
- **food_photo_training_data** (22 columns) - Training dataset
- **food_analysis_runs** (18 columns) - Batch analysis jobs
- **user_contributed_foods** (21 columns, 88 KB) - User-added foods

---

## 🤖 AI & COACHING

### AI Coach System
- **coaches** (17 columns, 104 KB) - AI coach definitions
- **coach_personas** (9 columns) - Personality configurations
- **coach_modes** (9 columns) - Coaching mode settings (gentle/savage/etc)
- **coach_knowledge** (9 columns) - Coach expertise areas
- **coach_knowledge_profiles** (23 columns, 88 KB) - Detailed knowledge graphs
- **coach_voice_profiles** (9 columns) - Voice/TTS settings
- **coach_messages** (22 columns, 1.6 MB) - Coach conversation history
- **coach_embeddings** (8 columns, 1.6 MB) - Semantic search vectors
- **coach_analytics** (5 columns, 152 KB) - Usage analytics
- **coach_marketplace_info** (15 columns, 128 KB) - Marketplace metadata
- **coach_purchases** (17 columns) - Purchase tracking
- **coach_reviews** (14 columns) - User reviews
- **coach_review_votes** (5 columns) - Review helpfulness
- **coach_response_feedback** (15 columns) - Response quality ratings
- **user_coach_settings** (20 columns) - Per-user coach preferences
- **user_coach_consent** (10 columns) - Data sharing consent
- **user_coach_purchases** (6 columns) - User purchase history

### AI Infrastructure
- **ai_context_cache** (15 columns, 1.6 MB) - Context caching for faster responses
- **ai_response_cache** (16 columns) - Response caching
- **ai_coaching_messages** (13 columns) - AI message logs
- **ai_coach_sessions** (12 columns) - Coaching session tracking
- **ai_episodic_memory** (17 columns, 1.6 MB) - Long-term memory system
- **ai_knowledge_sources** (23 columns, 1.6 MB) - RAG knowledge base
- **ai_implementation_guides** (36 columns, 152 KB) - Implementation documentation
- **ai_predictions** (15 columns) - AI model predictions
- **ai_experiments** (9 columns) - A/B tests for AI features
- **ai_telemetry** (10 columns) - **NEW** AI usage cost tracking
- **ai_errors** (14 columns) - Error tracking

### AI Training & RLHF
- **ai_training_datasets** (15 columns) - Training data collections
- **ai_training_examples** (12 columns) - Individual training examples
- **ai_finetuning_jobs** (18 columns) - Fine-tuning job tracking
- **ai_model_versions** (14 columns) - Model version management
- **model_performance_logs** (14 columns) - Performance metrics

### Confidence Calibration
- **confidence_calibration** (12 columns) - Active calibration parameters
- **confidence_calibration_history** (12 columns) - Historical calibration runs
- **calibration_samples** (5 columns, 8.4 MB) - Calibration training data
- **calibration_cron_history** (12 columns) - Automated calibration runs

---

## 🧠 EMOTIONAL EATING & PSYCHOLOGY

### Mood & Emotional Tracking
- **mood_check_ins** (18 columns, 56 KB) - **CORE COMPETITIVE MOAT**
  - Mood valence/arousal tracking
  - Emotional eating detection
  - Hunger/stress/energy levels
  - Trigger identification
  - Coping mechanism tracking
- **brain_fog_logs** (7 columns) - **NEW** Mental clarity tracking
- **thought_records** (16 columns) - CBT thought journaling
- **cravings** (21 columns) - Craving patterns and triggers

### Behavior Patterns
- **user_behavior_events** (16 columns) - Event tracking
- **user_behavior_patterns** (10 columns) - Detected patterns
- **diet_patterns** (7 columns) - Dietary behavior patterns
- **learned_user_preferences** (13 columns) - AI-learned preferences
- **user_interaction_patterns** (25 columns) - UI interaction analytics

---

## 🎮 GAMIFICATION & ENGAGEMENT

### Achievements & XP
- **achievements** (10 columns) - User achievement unlocks
- **achievement_definitions** (13 columns) - Achievement templates
- **user_achievements** (13 columns) - User achievement progress
- **xp_earning_rules** (7 columns) - XP calculation rules
- **user_xp_levels** (9 columns) - User level tracking
- **progress_milestones** (20 columns) - Progress tracking

### Challenges & Competitions
- **challenges** (14 columns) - Challenge definitions
- **challenge_participants** (9 columns) - Challenge enrollment
- **challenge_progress** (10 columns) - User challenge progress
- **leaderboards** (14 columns, 80 KB) - Leaderboard configurations
- **leaderboard_entries** (9 columns, 56 KB) - Leaderboard scores

### Habits & Streaks
- **habits** (19 columns) - User habit definitions
- **habit_completions** (8 columns) - Habit check-ins
- **habit_stacks** (16 columns) - Habit chaining
- **user_streaks** (8 columns) - Streak tracking

---

## 💬 SOCIAL FEATURES

### Community & Posts
- **community_posts** (10 columns) - **NEW** User posts
- **post_likes** (4 columns) - **NEW** Post engagement
- **user_follows** (4 columns) - **NEW** Follower system
- **friendships** (5 columns) - Friend connections
- **friend_requests** (6 columns) - Friend request management
- **user_friends** (VIEW) - Friend list view

### Social Proof & Viral
- **viral_shares** (10 columns) - Share tracking
- **social_proof_triggers** (15 columns) - Engagement hooks
- **referral_rewards** (9 columns) - Referral incentives
- **user_referrals** (11 columns) - Referral tracking
- **k_factor_metrics** (24 columns) - Viral coefficient tracking

---

## 📞 COMMUNICATION

### Voice & Audio
- **audio_interactions** (10 columns) - **NEW** Voice journaling
- **voice_recordings** (11 columns, 96 KB) - Audio storage
- **voice_sessions** (7 columns) - Voice session tracking
- **phone_calls** (30 columns) - Phone call logs
- **scheduled_calls** (15 columns) - Call scheduling
- **active_calls** (16 columns) - Real-time call state

### SMS & Messaging
- **sms_messages** (21 columns, 56 KB) - SMS logs
- **sms_templates** (15 columns) - SMS template library
- **messages** (7 columns) - In-app messaging

---

## 🧪 EXPERIMENTS & A/B TESTING

### Experimentation Framework
- **experiments** (8 columns) - **NEW** A/B test definitions
- **user_experiment_assignments** (5 columns) - **NEW** User variant assignments
- **experiment_events** (7 columns) - **NEW** Conversion tracking
- **experiment_assignments** (5 columns) - Legacy assignments
- **experiment_outcomes** (6 columns) - Experiment results
- **component_variant_telemetry** (7 columns) - **NEW** UI variant tracking

---

## 🎨 UI & DESIGN

### Dynamic UI System
- **ui_layouts** (6 columns, 80 KB) - Layout configurations
- **ui_components** (11 columns, 80 KB) - Component registry
- **layout_performance_metrics** (8 columns) - Performance tracking
- **design_tokens** (16 columns, 64 KB) - Design system tokens
- **brand_assets** (19 columns, 80 KB) - Brand resources
- **brand_voice_guidelines** (17 columns, 64 KB) - Tone/voice rules
- **personalization_rules** (8 columns) - Dynamic personalization

---

## 💳 MONETIZATION

### Subscriptions
- **user_subscriptions** (15 columns) - Active subscriptions
- **subscription_tiers** (20 columns) - Tier definitions
- **subscription_usage_limits** (9 columns) - Feature limits
- **invoices** (10 columns, 64 KB) - Billing history
- **payment_methods** (11 columns) - Payment info

### Feature Unlocks
- **feature_trials** (9 columns) - Trial tracking
- **user_feature_trials** (7 columns) - User trial status
- **user_features** (8 columns) - Feature access
- **time_based_unlocks** (12 columns) - Scheduled unlocks
- **user_unlock_history** (7 columns) - Unlock logs

---

## 📊 ANALYTICS & METRICS

### User Analytics
- **analytics_events** (9 columns) - Event tracking
- **user_events** (12 columns, 224 KB) - User action logs
- **user_app_versions** (8 columns, 80 KB) - App version tracking
- **daily_metrics** (29 columns) - Daily aggregated metrics
- **user_outcome_metrics** (14 columns) - Outcome tracking

### Data Quality
- **data_quality_alerts** (7 columns) - **NEW** Data health monitoring
- **data_access_log** (10 columns) - **NEW** Privacy/GDPR compliance
- **nutrition_verifications** (7 columns, 80 KB) - Data verification

---

## 🎯 SPECIALIZED FEATURES

### Fitness & Biometrics
- **fitness_logs** (10 columns) - Workout tracking
- **step_tracking** (7 columns) - Daily steps
- **water_intake** (8 columns) - Hydration tracking
- **water_logs** (8 columns, 80 KB) - Water logging
- **body_measurements** (9 columns) - Body metrics
- **weight_history** (12 columns) - Weight tracking
- **menstrual_cycle_tracking** (14 columns) - Cycle tracking
- **user_environmental_metrics** (11 columns) - Environmental impact

### Pantry & Shopping
- **pantry_items** (13 columns) - Pantry inventory
- **pantry_history** (8 columns) - Pantry changes
- **shopping_list** (11 columns) - Shopping lists
- **favorite_foods** (12 columns, 56 KB) - Saved favorites

### Fasting
- **fasting_sessions** (12 columns, 96 KB) - Intermittent fasting logs

### Recovery & Wellness
- **lapses** (17 columns) - Recovery tracking
- **roasts** (6 columns) - Motivational roasts

### Onboarding & Education
- **micro_lessons** (15 columns) - Bite-sized education
- **user_micro_lessons** (10 columns) - User progress
- **goal_templates** (8 columns, 64 KB) - Pre-made goal templates
- **goal_milestones** (8 columns) - Goal checkpoints

### Behavioral Nudges
- **dopamine_triggers** (15 columns) - Engagement hooks
- **engagement_hooks** (13 columns) - Retention triggers
- **predictive_nudges** (16 columns) - AI-driven notifications
- **variable_rewards** (13 columns) - Random reward system
- **trigger_rules** (13 columns, 64 KB) - Automation rules

### Outreach & Communication
- **outreach_history** (15 columns, 96 KB) - User communications

### Meal Templates
- **meal_templates** (6 columns) - Reusable meal configs
- **weekly_plans** (9 columns, 64 KB) - Weekly meal plans

### Anniversaries & Milestones
- **user_anniversaries** (9 columns) - User milestone dates
- **anniversary_milestones** (9 columns) - Anniversary definitions

### Diet Classification
- **diet_classification_rules** (12 columns, 96 KB) - Auto-classification rules
- **user_diet_runs** (10 columns) - Diet analysis runs

### Project Documentation
- **project_documentation** (10 columns, 168 KB) - System documentation

### Query Optimization
- **query_complexity_patterns** (13 columns) - Performance analysis

### Conversations
- **conversation_summaries** (19 columns, 1.6 MB) - Chat summaries

### Categories
- **coach_categories** (8 columns) - Coach categorization

### Key-Value Storage
- **kv_store_7a348a1c** (2 columns, 160 KB) - Generic KV store
- **kv_store_7ea53983** (2 columns, 24 KB) - Generic KV store

### Test Table
- **foo** (1 column, 0 bytes) - Test/development table

---

## 🔧 RPC FUNCTIONS (Key Functions)

### User & Social
- `handle_new_user()` - New user setup trigger
- `are_users_friends(uuid, uuid)` - Friend check
- `get_user_friends(uuid)` - Get friend list
- `get_follower_count(uuid)` - **NEW** Follower count
- `get_following_count(uuid)` - **NEW** Following count
- `is_following(uuid, uuid)` - **NEW** Follow check

### Nutrition & Food
- `calculate_satiety_score(numeric)` - Satiety calculation
- `auto_calculate_satiety_score()` - Auto-trigger for satiety
- `auto_classify_food_entry()` - Auto food classification
- `classify_food_color(text)` - Food color classification
- `classify_food_color_personalized(text)` - Personalized colors
- `get_daily_nutrition_summary(uuid, date)` - Daily nutrition stats
- `get_weekly_meal_summary(uuid)` - Weekly summary
- `search_community_foods(text, int)` - Food search
- `search_nutrition_knowledge(text, int)` - Nutrition search
- `match_similar_foods(vector, int)` - Semantic food search
- `get_diet_appropriate_alternatives(uuid, uuid)` - Diet-based swaps

### AI & Coaching
- `get_recommended_coach(uuid)` - Coach recommendation
- `get_coach_expertise_summary(uuid)` - Coach stats
- `get_coach_performance(uuid)` - Coach metrics
- `get_user_ai_context(uuid)` - User context for AI
- `refresh_user_context(uuid)` - Context refresh
- `invalidate_user_context()` - Cache invalidation
- `match_knowledge_sources(text, vector)` - RAG search
- `search_coach_specialized_knowledge(uuid, text)` - Coach knowledge search
- `fn_coach_search_chunks_arr(vector, int)` - Coach chunk search
- `optimize_coach_prompts()` - Prompt optimization
- `run_ai_trait_detection(uuid)` - AI trait detection

### **NEW** AI Observability
- `get_daily_cost_report(date)` - **NEW** Daily AI cost breakdown
- `check_daily_budget(decimal)` - **NEW** Budget monitoring

### **NEW** Mood & Psychology
- `get_emotional_eating_streak(uuid)` - **NEW** No-emotional-eating streak
- `get_mood_insights(uuid, int)` - **NEW** Mood analytics
- `get_brain_fog_correlation(uuid, int)` - **NEW** Brain fog patterns
- `detect_emotional_eating_pattern(uuid)` - Emotional eating detection

### **NEW** Experiments
- `get_experiment_variant(uuid, text)` - **NEW** A/B test assignment
- `get_variant_performance_report(text, timestamp, timestamp)` - **NEW** Variant analytics

### Gamification
- `award_xp(uuid, text, int)` - Award XP points
- `get_user_gamification_stats(uuid)` - Gamification stats
- `update_habit_streak(uuid, uuid)` - Streak updates
- `update_user_streak(uuid)` - General streak updates
- `check_achievement_unlock()` - Achievement trigger
- `get_friend_leaderboard(uuid)` - Friend leaderboard

### Analytics & Metrics
- `compute_daily_metrics()` - Daily metric computation
- `refresh_dashboard_metrics()` - Dashboard refresh
- `log_user_event_batch(jsonb)` - Batch event logging
- `analyze_query_complexity(text)` - Query performance analysis

### Subscriptions & Payments
- `get_user_subscription_details(uuid)` - Subscription info
- `get_default_payment_method(uuid)` - Default payment
- `ensure_single_default_payment_method()` - Payment trigger

### Pantry & Shopping
- `generate_shopping_list(uuid)` - Auto shopping list
- `get_expiring_items(uuid)` - Expiring pantry items

### **NEW** Audio
- `search_audio_transcripts(uuid, text, int)` - **NEW** Audio search

### **NEW** Data Quality
- `check_data_quality()` - **NEW** Health monitoring
- `log_data_access(uuid, text, text, text, text, text)` - **NEW** GDPR logging
- `request_data_deletion(uuid)` - **NEW** GDPR deletion

### Calibration & Training
- `fit_confidence_buckets_best_of_n(jsonb)` - Calibration fitting
- `recompute_confidence_calibration_with_edges(uuid)` - Recalibration
- `run_calibration_tuning_with_logging(jsonb)` - Calibration tuning
- `trigger_calibration_now()` - Manual calibration trigger

### Food Vision & Performance
- `get_food_vision_accuracy_report(date, date)` - Vision accuracy
- `update_food_vision_performance_metrics()` - Vision metrics update
- `cleanup_old_food_analysis_runs()` - Cleanup job

### Layout & UI
- `select_ui_layout(uuid, text)` - Dynamic layout selection
- `invalidate_layout_cache()` - Cache invalidation
- `invalidate_all_layout_caches()` - Full cache clear

### Misc Utilities
- `get_brand_system()` - Brand system config
- `get_all_project_docs()` - Project documentation
- `get_project_doc(text)` - Single doc retrieval
- `score_to_badge(numeric)` - Badge calculation
- `compute_tdee(numeric, numeric, numeric, text, text)` - TDEE calculation
- `calculate_adherence(uuid, date, date)` - Adherence calc
- `calculate_habit_strength(uuid, uuid)` - Habit strength
- `project_weight_trajectory(uuid, date)` - Weight projection
- `get_fasting_multiplier(uuid)` - Fasting multiplier
- `predicate_match(jsonb, jsonb)` - Predicate matching

---

## 👁️ VIEWS

- **user_nutrition_with_satiety** - **NEW** Nutrition with satiety scores
- **coach_profiles** - Enriched coach data
- **daily_food_colors** - Daily color tracking
- **user_friends** - Friend relationships
- **food_analysis_slo_metrics** - SLO tracking
- **calibration_cron_health** - Calibration health
- **calibration_cron_recent** - Recent calibration runs

---

## 🔑 KEY COMPETITIVE MOATS

1. **Emotional Eating Detection** - `mood_check_ins` table with 18-column psychology tracking
2. **Brain Fog Tracking** - `brain_fog_logs` with nutrition correlation
3. **AI Coach Marketplace** - Complete coach ecosystem with reviews, purchases, knowledge graphs
4. **Dynamic Personalization** - Component variant system with telemetry
5. **Food Vision AI** - Complete training pipeline with ground truth and feedback loops
6. **RLHF Training** - Full AI training infrastructure with episodic memory
7. **Confidence Calibration** - Self-improving AI with automatic recalibration

---

## 📈 SCHEMA STATISTICS

- **Total Storage**: ~30 MB (excluding embeddings: ~10 MB for embeddings)
- **Largest Tables**:
  1. `calibration_samples` - 8.4 MB
  2. `food_entries` - 1.7 MB
  3. `recipes` - 1.7 MB
  4. `ai_context_cache` - 1.6 MB
  5. `ai_episodic_memory` - 1.6 MB
  6. `coach_embeddings` - 1.6 MB
  7. `ai_knowledge_sources` - 1.6 MB
  8. `coach_messages` - 1.6 MB
  9. `conversation_summaries` - 1.6 MB
  10. `food_vision_performance_metrics` - 1.5 MB

- **Most Complex Table**: `profiles` (109 columns)
- **Most Functions**: Vector operations (pgvector extension)

---

## 🚀 RECENT ADDITIONS (Nov 2025)

### Brain & Psychology
- `brain_fog_logs` - Mental clarity tracking
- `get_brain_fog_correlation()` - Nutrition-clarity analysis

### AI Observability
- `ai_telemetry` - Cost/performance tracking
- `get_daily_cost_report()` - Daily cost analysis
- `check_daily_budget()` - Budget monitoring

### Social Features
- `community_posts` - User posts
- `post_likes` - Engagement tracking
- `user_follows` - Follow system
- `get_follower_count()`, `get_following_count()`, `is_following()`

### Experiments
- `experiments` - A/B test framework
- `user_experiment_assignments` - Variant assignments
- `experiment_events` - Conversion tracking
- `get_experiment_variant()` - Auto assignment
- `component_variant_telemetry` - UI variant analytics
- `get_variant_performance_report()` - Variant performance

### Audio & Voice
- `audio_interactions` - Voice journaling
- `search_audio_transcripts()` - Transcript search

### Data Quality & Privacy
- `data_quality_alerts` - Health monitoring
- `data_access_log` - GDPR compliance
- `check_data_quality()` - Automated checks
- `log_data_access()` - Access logging
- `request_data_deletion()` - GDPR deletion

### Profile Enhancements
- `coach_style` - gentle/balanced/savage/technical
- `dietary_preferences` - Array of preferences
- `health_goals` - Array of goals
- `age`, `gender` - Demographics

---

## 🎯 SCHEMA HEALTH

✅ **All migrations applied successfully**
✅ **All RLS policies active**
✅ **178 tables indexed**
✅ **223 functions operational**
✅ **7 views materialized**

**Schema is production-ready!** 🚀

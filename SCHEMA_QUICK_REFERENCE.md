# MindFork Schema Quick Reference
**Last Updated:** 2025-11-16 (Auto-generated from live database)
**Purpose:** Developer-first, high-ROI schema guide

---

## 🎯 QUICK NAVIGATION

Jump to: [Core Tables](#-core-tables-top-20) | [Functions](#-top-20-functions-cookbook) | [Relationships](#-table-relationships) | [Anti-Patterns](#-anti-patterns--deprecation-warnings) | [Performance](#-performance-index-guide)

---

## ⚡ CORE TABLES (Top 20)

### Food & Nutrition
| Table | Purpose | Key Columns | RLS | FK to |
|-------|---------|-------------|-----|-------|
| `food_entries` | **PRIMARY** food logging | user_id, calories, protein, carbs, fat, fiber | ✅ | auth.users |
| `recipes` | Recipe database | name, ingredients, nutrition | ✅ | - |
| `food_items` | Master food catalog | name, barcode, nutrition | ✅ | - |
| `daily_nutrition` | Daily aggregates | user_id, date, totals | ✅ | auth.users |

### AI & Coaching
| Table | Purpose | Key Columns | RLS | FK to |
|-------|---------|-------------|-----|-------|
| `coaches` | AI coach definitions | id, name, persona_id | ✅ | coach_personas |
| `coach_messages` | Chat history | user_id, coach_id, message | ✅ | coaches, auth.users |
| `ai_context_cache` | Context caching (1.6MB) | user_id, context_hash | ✅ | auth.users |
| `ai_telemetry` | **NEW** AI cost tracking | feature, model, tokens, cost | ✅ | auth.users |

### Psychology (COMPETITIVE MOAT)
| Table | Purpose | Key Columns | RLS | FK to |
|-------|---------|-------------|-----|-------|
| `mood_check_ins` | **Emotional eating detection** | user_id, eating_triggered_by_emotion | ✅ | auth.users, food_entries |
| `brain_fog_logs` | **NEW** Mental clarity | clarity_score, notes | ✅ | auth.users |
| `cravings` | Craving patterns | user_id, food, trigger | ✅ | auth.users |

### User & Profile
| Table | Purpose | Key Columns | RLS | FK to |
|-------|---------|-------------|-----|-------|
| `profiles` | **CORE** user data (109 cols) | user_id, coach_style, dietary_preferences | ✅ | auth.users, coaches |
| `user_goals` | Health goals | user_id, goal_type, target | ✅ | auth.users |
| `user_traits` | AI-detected traits | user_id, trait, confidence | ✅ | auth.users |

### Gamification
| Table | Purpose | Key Columns | RLS | FK to |
|-------|---------|-------------|-----|-------|
| `user_achievements` | Achievement unlocks | user_id, achievement_id | ✅ | auth.users, achievement_definitions |
| `user_xp_levels` | XP/level tracking | user_id, current_xp, level | ✅ | auth.users |
| `challenges` | Community challenges | id, name, requirements | ✅ | - |

### Social (NEW)
| Table | Purpose | Key Columns | RLS | FK to |
|-------|---------|-------------|-----|-------|
| `community_posts` | User posts | user_id, content, visibility | ✅ | auth.users |
| `user_follows` | Follow system | follower_id, following_id | ✅ | auth.users |
| `post_likes` | Post engagement | post_id, user_id | ✅ | community_posts, auth.users |

### Experiments (NEW)
| Table | Purpose | Key Columns | RLS | FK to |
|-------|---------|-------------|-----|-------|
| `experiments` | A/B test configs | name, variants, allocation | ⚠️ Admin | - |
| `user_experiment_assignments` | User variants | user_id, experiment_id, variant | ✅ | auth.users, experiments |
| `component_variant_telemetry` | UI variant tracking | component_id, variant_id | ❌ Backend only | auth.users |

---

## 🔧 TOP 20 FUNCTIONS COOKBOOK

### User & Auth
```sql
-- Get user's full AI context (for coach conversations)
SELECT * FROM get_user_ai_context('user-uuid-here');
-- Returns: traits, preferences, goals, recent_foods, emotional_state

-- Check if users are friends
SELECT are_users_friends('user1-uuid', 'user2-uuid');
-- Returns: boolean
```

### Food & Nutrition
```sql
-- Get daily nutrition summary
SELECT * FROM get_daily_nutrition_summary('user-uuid', '2025-11-16');
-- Returns: { total_calories, protein, carbs, fats, fiber, meals_logged }

-- Find similar foods (semantic search)
SELECT * FROM match_similar_foods('[0.1, 0.2, ...]'::vector, 10);
-- Returns: food_name, similarity_score

-- Get diet-appropriate swaps
SELECT * FROM get_diet_appropriate_alternatives('user-uuid', 'food-uuid');
-- Returns: alternative_foods filtered by dietary_preferences
```

### AI & Coaching
```sql
-- Get recommended coach for user
SELECT * FROM get_recommended_coach('user-uuid');
-- Returns: { coach_id, coach_name, match_score, reasoning }

-- Refresh user context cache
SELECT refresh_user_context('user-uuid');
-- Returns: { context_updated_at, traits_detected, preferences_updated }

-- Check daily AI budget
SELECT check_daily_budget(100.00); -- $100 limit
-- Returns: { daily_cost_usd, budget_exceeded, remaining_budget_usd }

-- Get daily AI cost report
SELECT * FROM get_daily_cost_report('2025-11-16');
-- Returns: feature, total_calls, total_tokens, total_cost_usd, avg_latency_ms
```

### Psychology (COMPETITIVE MOAT)
```sql
-- Get emotional eating streak (days without emotional eating)
SELECT get_emotional_eating_streak('user-uuid');
-- Returns: integer (streak count)

-- Get mood insights (7-day default)
SELECT get_mood_insights('user-uuid', 7);
-- Returns: { most_common_mood_tags, emotional_eating_rate, avg_hunger_level }

-- Get brain fog correlation with nutrition
SELECT * FROM get_brain_fog_correlation('user-uuid', 7);
-- Returns: { avg_clarity, protein_correlation, carb_correlation, meal_timing }
```

### Experiments & A/B Testing
```sql
-- Get user's variant for an experiment
SELECT get_experiment_variant('user-uuid', 'home_screen_layout');
-- Returns: 'control' | 'variant_a' | 'variant_b'
-- Auto-assigns if not already assigned

-- Get variant performance report
SELECT * FROM get_variant_performance_report(
  'home_screen_layout',
  NOW() - INTERVAL '7 days',
  NOW()
);
-- Returns: variant_id, unique_users, total_views, engagement_rate
```

### Gamification
```sql
-- Award XP to user
SELECT award_xp('user-uuid', 'meal_logged', 10);
-- Returns: { new_total_xp, level_up, badges_unlocked }

-- Get gamification stats
SELECT get_user_gamification_stats('user-uuid');
-- Returns: { current_xp, level, achievements_count, streak_days }
```

### Social Features
```sql
-- Get follower count
SELECT get_follower_count('user-uuid');
-- Returns: integer

-- Get following count
SELECT get_following_count('user-uuid');
-- Returns: integer

-- Check if user is following another
SELECT is_following('follower-uuid', 'following-uuid');
-- Returns: boolean
```

### Audio & Voice
```sql
-- Search audio transcripts (full-text search)
SELECT * FROM search_audio_transcripts(
  'user-uuid',
  'emotional eating triggers',
  20 -- limit
);
-- Returns: id, audio_url, transcript, ai_summary, emotion_detected, rank
```

### Data Quality & Privacy
```sql
-- Check data quality (health monitoring)
SELECT check_data_quality();
-- Returns: [ { alert_type, severity, message, metadata } ]

-- Log data access (GDPR compliance)
SELECT log_data_access(
  'user-uuid',
  'read',
  'nutrition_data',
  'coach_ai',
  'OpenAI',
  'personalized_coaching'
);

-- Request data deletion (GDPR right to deletion)
SELECT request_data_deletion('user-uuid');
-- Returns: { success, message, requested_at }
```

---

## 🔗 TABLE RELATIONSHIPS

### Core Data Flow
```
auth.users
  └─> profiles (user_id) [CASCADE DELETE]
       ├─> food_entries (user_id) [CASCADE]
       │    └─> mood_check_ins (food_entry_id) [SET NULL]
       ├─> coach_messages (user_id) [CASCADE]
       ├─> user_goals (user_id) [CASCADE]
       ├─> user_achievements (user_id) [CASCADE]
       ├─> community_posts (user_id) [CASCADE]
       │    └─> post_likes (post_id) [CASCADE]
       └─> user_follows (follower_id, following_id) [CASCADE]
```

### Coach Ecosystem
```
coaches (id)
  ├─> coach_messages (coach_id) [NO ACTION]
  ├─> coach_knowledge (coach_id) [CASCADE]
  ├─> coach_embeddings (coach_id) [CASCADE]
  ├─> coach_reviews (coach_id) [CASCADE]
  └─> coach_marketplace_info (coach_id) [CASCADE]

coach_personas (id)
  └─> coaches (persona_id) [RESTRICT]
```

### Experiments
```
experiments (id)
  ├─> user_experiment_assignments (experiment_id) [CASCADE]
  └─> experiment_events (experiment_id) [CASCADE]
```

### Delete Cascade Safety
| From Table | To Table | Delete Rule | Impact |
|------------|----------|-------------|--------|
| auth.users | profiles | CASCADE | ✅ Safe - user deletion cascades |
| profiles | food_entries | CASCADE | ✅ Safe - user data deletion |
| food_entries | mood_check_ins | SET NULL | ✅ Safe - preserves mood data |
| coaches | coach_personas | RESTRICT | ⚠️ Protected - can't delete persona if coaches use it |
| recipes | meal_plan_entries | CASCADE | ✅ Safe - recipe deletion removes from plans |

---

## ❌ ANTI-PATTERNS & DEPRECATION WARNINGS

### DO NOT USE (Deprecated/Test)
- ❌ `foo` - Test table, will be removed
- ❌ `kv_store_*` - Generic key-value, use dedicated tables instead

### AVOID (Low Performance)
- ⚠️ `SELECT *` on `profiles` (109 columns) - Specify columns
- ⚠️ Joining `food_entries` without date filter - Add `created_at` WHERE clause
- ⚠️ Full table scans on `ai_context_cache` - Always filter by `user_id`

### USE WITH CAUTION
- ⚠️ `menstrual_cycle_tracking` - Consider using general `body_measurements` instead
- ⚠️ `food_logs` vs `food_entries` - Use `food_entries` (primary table)
- ⚠️ `nutrition_logs` vs `daily_nutrition` - Use `daily_nutrition` (aggregated)

### Security (RLS)
- ❌ NEVER bypass RLS with service_role key in client code
- ❌ NEVER expose `component_variant_telemetry` to users (backend analytics only)
- ❌ NEVER allow users to modify `ai_telemetry` (service role only)

---

## 🚀 PERFORMANCE INDEX GUIDE

### Hot Path Indexes (Most Critical)
```sql
-- Food entries by user (99% of queries)
CREATE INDEX idx_food_entries_user_date ON food_entries(user_id, created_at DESC);

-- Coach messages by user (chat history)
CREATE INDEX idx_coach_messages_user ON coach_messages(user_id, created_at DESC);

-- Mood check-ins emotional eating lookup
CREATE INDEX idx_mood_check_ins_emotional ON mood_check_ins(user_id, eating_triggered_by_emotion, created_at);

-- Brain fog by user/date
CREATE INDEX idx_brain_fog_user_date ON brain_fog_logs(user_id, log_date DESC);

-- Experiment assignments
CREATE INDEX idx_user_experiments ON user_experiment_assignments(user_id);

-- Social follows
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
```

### Composite Indexes (Multi-Column)
- `(user_id, created_at)` - Time-series queries
- `(user_id, eating_triggered_by_emotion, created_at)` - Emotional eating analysis
- `(component_id, variant_id, created_at)` - Variant performance tracking

### Full-Text Search Indexes (GIN)
```sql
-- Audio transcript search
CREATE INDEX idx_audio_interactions_transcript_search
  ON audio_interactions USING GIN(to_tsvector('english', transcript));
```

### Vector Indexes (Semantic Search)
```sql
-- Coach knowledge semantic search
-- Uses pgvector HNSW/IVFFlat indexes on embedding columns
```

---

## 🎯 MIGRATION TIMELINE (Nov 2025)

### 2025-11-10
- ✅ Fiber tracking (`food_entries.fiber`)
- ✅ Privacy compliance (`profiles.data_consent_*`, `data_access_log`)
- ✅ Nutrition intelligence view (`user_nutrition_with_satiety`)

### 2025-11-15
- ✅ Brain fog tracker (`brain_fog_logs`, `get_brain_fog_correlation`)

### 2025-11-16
- ✅ Core profile fields (`coach_style`, `dietary_preferences`, `health_goals`)
- ✅ AI observability (`ai_telemetry`, `get_daily_cost_report`, `check_daily_budget`)
- ✅ A/B testing (`experiments`, `user_experiment_assignments`, `get_experiment_variant`)
- ✅ Social features (`community_posts`, `user_follows`, `post_likes`)
- ✅ Audio features (`audio_interactions`, `search_audio_transcripts`)
- ✅ Data quality (`data_quality_alerts`, `check_data_quality`)
- ✅ Component telemetry (`component_variant_telemetry`, `get_variant_performance_report`)
- ✅ Mood check-ins enhanced (`get_emotional_eating_streak`, `get_mood_insights`)

---

## 🔄 AUTO-UPDATE SCRIPT

Generate fresh schema reference anytime:
```bash
# Run from project root
psql $DATABASE_URL -f scripts/generate_schema_reference.sql > SCHEMA_QUICK_REFERENCE.md
```

---

## 📊 SCHEMA HEALTH CHECKLIST

Run this daily to verify schema integrity:
```sql
-- Check for missing indexes on foreign keys
SELECT ...

-- Check for tables without RLS
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename FROM pg_policies
  );

-- Check for functions without grants
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name NOT IN (
    SELECT routine_name FROM information_schema.routine_privileges
    WHERE grantee = 'authenticated'
  );
```

---

## 💡 PROTIPS

### Query Optimization
1. **Always filter by user_id first** (RLS + index optimization)
2. **Add date ranges** to time-series queries (food_entries, mood_check_ins)
3. **Use EXISTS over COUNT(*)** for boolean checks
4. **Batch inserts** for bulk operations (use arrays)

### Cache Strategy
- `ai_context_cache` - 15min TTL, cleared on profile update
- `ai_response_cache` - 24hr TTL, keyed by (coach_id, message_hash)
- `food_recognition_cache` - 7 day TTL, keyed by image_hash

### Security Layers
1. **RLS** - Table-level row security (auto-enforced)
2. **Function SECURITY DEFINER** - Controlled privilege escalation
3. **Service role** - Backend-only operations (telemetry, analytics)
4. **Anon key** - Public read-only access (recipes, coaches)

---

**End of Quick Reference** 🎯

*For complete table details, see [COMPLETE_SCHEMA_INDEX.md](./COMPLETE_SCHEMA_INDEX.md)*

# MindFork Deployment Instructions
**Deploy RLHF + XP System to Supabase**

## Quick Deploy (5 minutes)

### Step 1: Deploy Combined Migration

1. **Go to Supabase Dashboard** → https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. **Copy the entire contents** of `/tmp/combined_migration.sql` (4916 lines)
5. **Paste** into the SQL editor
6. Click **Run** (bottom right)
7. Wait for "Success" message

**What this deploys:**
- ✅ Response caching system (50-70% cost savings)
- ✅ Severity/intensity system (1.0-6.0 scale)
- ✅ Coach modes + consent (Default/Roast/Savage)
- ✅ Feedback capture (thumbs up/down)
- ✅ RLHF training pipeline
- ✅ Episodic memory system
- ✅ Fine-tuning export pipeline
- ✅ Hybrid XP system (70% habits / 30% results)
- ✅ Automatic XP triggers
- ✅ Safe gamification stats function

---

### Step 2: Set Up Cron Jobs

In the same **SQL Editor**, run each of these queries separately:

#### Cron Job 1: Daily Cache Cleanup (2 AM UTC)
```sql
SELECT cron.schedule(
  'cleanup-expired-cache',
  '0 2 * * *',
  $$SELECT cleanup_expired_cache()$$
);
```

#### Cron Job 2: Daily RLHF Training Dataset Generation (1 AM UTC)
```sql
SELECT cron.schedule(
  'generate-training-examples',
  '0 1 * * *',
  $$SELECT generate_training_examples_from_feedback()$$
);
```

#### Cron Job 3: Weekly Fine-tuning Job Creation (Sundays 3 AM UTC)
```sql
SELECT cron.schedule(
  'create-finetuning-jobs',
  '0 3 * * 0',
  $$
    SELECT create_finetuning_job()
    WHERE should_create_finetuning_job()
  $$
);
```

#### Cron Job 4: Daily XP Streak Checks (2 AM UTC)
```sql
SELECT cron.schedule(
  'daily-streak-check',
  '0 2 * * *',
  $$SELECT check_and_award_streaks()$$
);
```

#### Cron Job 5: Weekly XP Results Checks (Mondays 3 AM UTC)
```sql
SELECT cron.schedule(
  'weekly-results-check',
  '0 3 * * 1',
  $$SELECT check_and_award_weekly_results()$$
);
```

---

### Step 3: Verify Deployment

Run this query to check if everything deployed successfully:

```sql
-- Check if tables exist
SELECT 'ai_response_cache' as table_name, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_response_cache') as exists
UNION ALL
SELECT 'user_coach_preferences', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_coach_preferences')
UNION ALL
SELECT 'coach_modes', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'coach_modes')
UNION ALL
SELECT 'coach_response_feedback', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'coach_response_feedback')
UNION ALL
SELECT 'ai_episodic_memory', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_episodic_memory')
UNION ALL
SELECT 'xp_award_actions', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_award_actions')
UNION ALL
SELECT 'xp_award_history', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_award_history');

-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_cached_response',
    'build_coach_system_prompt',
    'validate_coach_mode',
    'submit_coach_feedback',
    'save_episodic_memory',
    'get_relevant_memories',
    'award_xp_with_limits',
    'get_user_gamification_stats',
    'get_available_xp_actions'
  )
ORDER BY routine_name;

-- Check if cron jobs are scheduled
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname LIKE '%streak%'
   OR jobname LIKE '%training%'
   OR jobname LIKE '%cache%'
   OR jobname LIKE '%finetuning%'
   OR jobname LIKE '%results%';

-- Check XP actions are seeded
SELECT COUNT(*) as xp_actions_count FROM xp_award_actions;
-- Should return 20

-- Check if user_xp_levels has last_xp_awarded_at column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_xp_levels'
  AND column_name = 'last_xp_awarded_at';
-- Should return 1 row
```

Expected results:
- ✅ 7 tables should show `exists = true`
- ✅ 9 functions should be listed
- ✅ 5 cron jobs should be scheduled
- ✅ 20 XP actions should exist
- ✅ `last_xp_awarded_at` column should exist

---

### Step 4: Test the System

#### Test 1: Get Gamification Stats (Safe Defaults)
```sql
SELECT get_user_gamification_stats('00000000-0000-0000-0000-000000000000');
-- Should return: Level 1, 0 XP (not crash)
```

#### Test 2: Award XP Manually
```sql
-- Replace with a real user_id from auth.users
SELECT award_xp_with_limits(
  p_user_id := 'YOUR_USER_ID_HERE',
  p_action_id := 'log_meal'
);
-- Should return: awarded = true, xp_awarded = 10
```

#### Test 3: Check XP History
```sql
SELECT * FROM xp_award_history ORDER BY awarded_at DESC LIMIT 10;
-- Should show the XP award from Test 2
```

#### Test 4: Get Available Actions
```sql
SELECT get_available_xp_actions('YOUR_USER_ID_HERE');
-- Should return all 20 XP actions with availability status
```

#### Test 5: Cache System
```sql
-- Manually insert a cache entry
SELECT cache_response(
  p_user_id := 'YOUR_USER_ID_HERE',
  p_query_hash := 'test_hash_123',
  p_response_text := 'This is a test response',
  p_tokens_used := 100
);

-- Retrieve it
SELECT get_cached_response(
  p_user_id := 'YOUR_USER_ID_HERE',
  p_query_hash := 'test_hash_123'
);
-- Should return the cached response
```

---

## Alternative: Deploy Via CLI

If you prefer to use the Supabase CLI instead of the dashboard:

```bash
# Navigate to project directory
cd /home/jonbrookings/vibe_coding_projects/vibe-coding-mindfork

# Execute combined migration
cat /tmp/combined_migration.sql | supabase db remote exec --linked

# Set up cron jobs
supabase db remote exec --linked < <(cat <<'EOF'
SELECT cron.schedule('cleanup-expired-cache', '0 2 * * *', $$SELECT cleanup_expired_cache()$$);
SELECT cron.schedule('generate-training-examples', '0 1 * * *', $$SELECT generate_training_examples_from_feedback()$$);
SELECT cron.schedule('create-finetuning-jobs', '0 3 * * 0', $$SELECT create_finetuning_job() WHERE should_create_finetuning_job()$$);
SELECT cron.schedule('daily-streak-check', '0 2 * * *', $$SELECT check_and_award_streaks()$$);
SELECT cron.schedule('weekly-results-check', '0 3 * * 1', $$SELECT check_and_award_weekly_results()$$);
EOF
)
```

---

## What Happens After Deployment

### Automatic XP Awards (No Frontend Code Needed!)

When users interact with your app:

| User Action | XP Awarded | How |
|------------|------------|-----|
| Log a meal | +10 XP | Database trigger (instant) |
| Log elite food | +15 XP | Database trigger (10 + 5 bonus) |
| Complete 3 meals | +25 XP | Database trigger (instant) |
| Complete a fast | +30 XP | Database trigger (instant) |
| Log weight | +10 XP | Database trigger (instant) |
| 7-day streak | +50 XP | Daily cron check |
| 14-day streak | +100 XP | Daily cron check |
| 30-day streak | +250 XP | Daily cron check |
| Hit protein 5 days | +75 XP | Weekly cron check |
| Perfect week | +150 XP | Weekly cron check |

### RLHF Training Pipeline

Automatically happens:
1. **User gives feedback** (thumbs up/down) → Stored in `coach_response_feedback`
2. **Daily at 1 AM UTC** → `generate_training_examples_from_feedback()` creates JSONL
3. **Weekly on Sunday 3 AM UTC** → If 500+ examples exist, creates OpenAI fine-tuning job
4. **After fine-tuning complete** → Update model reference in `build_coach_system_prompt()`

### Memory System

Automatically happens:
- Memories saved via `save_episodic_memory()` RPC call from frontend
- Retrieved automatically when `build_coach_system_prompt()` is called
- Top 5 most relevant memories included in every chat

---

## Troubleshooting

### Migration Fails with "relation already exists"
This is OK - it means the table was already created. The migration will skip it.

### Cron job fails to schedule
Check if pg_cron extension is enabled:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### XP not being awarded
Check if triggers are installed:
```sql
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%xp%';
```

### Function not found error
Make sure you ran the combined migration file completely. Re-run if needed - it's idempotent.

---

## Summary

After deployment, your MindFork app will have:

✅ **RLHF System** - AI learns from user feedback automatically
✅ **Memory System** - AI remembers user context across sessions
✅ **Hybrid XP System** - 70% habits, 30% results
✅ **Automatic XP Awards** - Zero frontend code needed
✅ **Rate Limiting** - Prevents XP gaming
✅ **Safe Defaults** - App never crashes from missing data
✅ **Complete Audit Trail** - Full XP history in database
✅ **Cron Jobs** - Automatic daily/weekly checks

**Total deployment time: 5-10 minutes** ⚡

**Frontend changes needed: ZERO** (everything happens via database triggers)

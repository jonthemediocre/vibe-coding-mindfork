# Universal AI App Schema v1.3 - Production Usage Guide

## 🎯 Quick Start: Essential Workflows

### 1. Create User with Full AI Profile

```sql
-- Step 1: User signs up (handled by Supabase Auth)
-- Step 2: Create profile on first login
INSERT INTO public.user_profiles (id, display_name, timezone)
VALUES (auth.uid(), 'Alice Chen', 'America/Los_Angeles');

-- Step 3: Add personalization traits
INSERT INTO public.user_traits (user_id, trait_key, trait_value, source)
VALUES
  (auth.uid(), 'preferred_language', 'spanish', 'user_input'),
  (auth.uid(), 'expertise_level', 'intermediate', 'user_input'),
  (auth.uid(), 'learning_style', 'visual', 'ai_inferred');

-- Step 4: Initialize gamification
INSERT INTO public.user_gamification (user_id)
VALUES (auth.uid());

-- Step 5: Set default subscription (free tier)
INSERT INTO public.user_subscriptions (
  user_id, tier_id, current_period_start, current_period_end
)
SELECT
  auth.uid(),
  id,
  NOW(),
  NOW() + INTERVAL '30 days'
FROM public.subscription_tiers
WHERE tier_name = 'free';
```

### 2. Start AI Conversation with Context Window Management

```sql
-- Create conversation with GPT-4 context limits
INSERT INTO public.conversations (
  user_id,
  title,
  model_name,
  model_provider,
  max_context_tokens,
  auto_prune,
  prune_strategy,
  prune_margin_ratio
)
VALUES (
  auth.uid(),
  'Project Planning Discussion',
  'gpt-4-turbo',
  'openai',
  128000,              -- GPT-4 Turbo context window
  true,                -- Auto-prune when near limit
  'fifo',              -- Remove oldest messages first
  0.90                 -- Start pruning at 90% (115,200 tokens)
)
RETURNING id;

-- Add messages (pruning happens automatically)
INSERT INTO public.messages (conversation_id, user_id, role, content, tokens_used)
VALUES
  ('conv-id', auth.uid(), 'user', 'How do I plan a software project?', 12),
  ('conv-id', auth.uid(), 'assistant', 'Here are 5 key steps...', 450);

-- Check current token usage
SELECT
  rolling_tokens,
  max_context_tokens,
  ROUND((rolling_tokens::numeric / max_context_tokens) * 100, 2) as usage_pct,
  last_pruned_at
FROM public.conversations
WHERE id = 'conv-id';

-- Manual pruning if needed
SELECT public.prune_conversation('conv-id', 100000); -- Prune to 100k tokens
```

### 3. Track Costs Across Models

```sql
-- Record workflow run with multiple models
INSERT INTO public.workflow_runs (workflow_id, user_id, status)
VALUES ('workflow-123', auth.uid(), 'running')
RETURNING id;

-- Add step with GPT-4 Turbo
INSERT INTO public.run_steps (
  run_id, step_key, model, tokens_input, tokens_output, status
)
VALUES (
  'run-456', 'summarization', 'gpt-4-turbo', 5000, 800, 'succeeded'
)
RETURNING id;

-- Calculate and backfill cost
SELECT public.backfill_step_cost(
  'step-789',
  'gpt-4-turbo',
  'openai'
); -- Returns: 0.0580 (example)

-- View total cost for workflow run
SELECT
  id,
  cost_usd,
  tokens_input,
  tokens_output,
  ROUND((tokens_output::numeric / NULLIF(tokens_input, 0)) * 100, 2) as compression_ratio
FROM public.workflow_runs
WHERE id = 'run-456';

-- Per-user cost analysis
SELECT
  u.display_name,
  COUNT(DISTINCT wr.id) as total_runs,
  COALESCE(SUM(wr.cost_usd), 0) as total_cost_usd,
  COALESCE(SUM(wr.tokens_input + wr.tokens_output), 0) as total_tokens
FROM public.user_profiles u
LEFT JOIN public.workflow_runs wr ON wr.user_id = u.id
WHERE wr.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.display_name
ORDER BY total_cost_usd DESC
LIMIT 10;
```

### 4. Embedding Model Migration Path

```sql
-- Step 1: Identify memories using old embedding model
SELECT
  COUNT(*) as total_memories,
  embedding_model_name,
  embedding_model_provider
FROM public.episodic_memories
WHERE user_id = auth.uid()
GROUP BY embedding_model_name, embedding_model_provider;

-- Step 2: Re-embed with new model (application code generates new embeddings)
UPDATE public.episodic_memories
SET
  embedding = '[new_vector_from_text_embedding_3_large]',
  embedding_model_name = 'text-embedding-3-large',
  embedding_model_provider = 'openai',
  updated_at = NOW()
WHERE id = 'memory-id';

-- Step 3: Detect dimension mismatches (should be empty after migration)
SELECT * FROM public.episodic_memory_embedding_mismatches;

-- Step 4: Cost comparison
SELECT
  embedding_model_name,
  COUNT(*) as memory_count,
  SUM(
    public.estimate_cost_usd(
      embedding_model_name,
      embedding_model_provider,
      LENGTH(content) / 4, -- Rough token estimate
      0
    )
  ) as estimated_embedding_cost
FROM public.episodic_memories
WHERE user_id = auth.uid()
GROUP BY embedding_model_name, embedding_model_provider;
```

### 5. Response Caching (Reduce Costs)

```sql
-- Before making API call, check cache
SELECT
  response_content,
  tokens_used,
  hit_count,
  created_at
FROM public.ai_response_cache
WHERE cache_key = 'summary_project_planning_en'
  AND expires_at > NOW();

-- Cache miss? Call API and store response
INSERT INTO public.ai_response_cache (
  cache_key,
  prompt_hash,
  model,
  response_content,
  tokens_used,
  quality_tier,
  expires_at
)
VALUES (
  'summary_project_planning_en',
  MD5('How do I plan a software project?'),
  'gpt-4-turbo',
  'Here are 5 key steps: 1. Define scope...',
  450,
  'production',
  NOW() + INTERVAL '7 days'
);

-- Cache hit? Increment counter
UPDATE public.ai_response_cache
SET
  hit_count = hit_count + 1,
  last_hit_at = NOW()
WHERE cache_key = 'summary_project_planning_en';

-- Calculate cache savings
WITH cache_stats AS (
  SELECT
    COUNT(*) as total_cached,
    SUM(hit_count) as total_hits,
    SUM(tokens_used * hit_count) as saved_tokens
  FROM public.ai_response_cache
  WHERE quality_tier = 'production'
    AND created_at > NOW() - INTERVAL '30 days'
)
SELECT
  total_cached,
  total_hits,
  saved_tokens,
  -- Assume $0.01 per 1k tokens (GPT-4 Turbo input)
  ROUND((saved_tokens / 1000.0) * 0.01, 2) as saved_usd
FROM cache_stats;
```

### 6. Feature Flag with Trait Targeting

```sql
-- Create flag for power users only
INSERT INTO public.feature_flags (
  flag_key,
  display_name,
  description,
  is_enabled,
  rollout_percentage,
  target_traits
)
VALUES (
  'advanced_workflows',
  'Advanced Workflow Builder',
  'Multi-step AI workflow orchestration',
  true,
  100, -- 100% of targeted users
  '{"expertise_level": "advanced"}'::jsonb
);

-- Check if enabled for current user
SELECT public.is_feature_enabled(auth.uid(), 'advanced_workflows');
-- Returns: false (if user has expertise_level = 'intermediate')

-- Upgrade user to advanced
UPDATE public.user_traits
SET trait_value = 'advanced'
WHERE user_id = auth.uid() AND trait_key = 'expertise_level';

-- Check again
SELECT public.is_feature_enabled(auth.uid(), 'advanced_workflows');
-- Returns: true (now matches target_traits)
```

### 7. RLHF Feedback Collection

```sql
-- User gives thumbs down on AI response
INSERT INTO public.ai_feedback (
  user_id,
  message_id,
  feedback_type,
  reason,
  corrected_response
)
VALUES (
  auth.uid(),
  'msg-789',
  'thumbs_down',
  'Response was too technical for a beginner',
  'Simplified version: Think of it like organizing your kitchen...'
);

-- Award XP for providing feedback
SELECT public.award_xp(
  auth.uid(),
  'provided_feedback',
  10,
  'Helped improve AI responses'
);

-- Create preference pair for DPO training
INSERT INTO public.preference_pairs (
  user_id,
  prompt,
  response_a,
  response_b,
  preferred
)
SELECT
  auth.uid(),
  m_user.content,
  m_assistant.content,
  f.corrected_response,
  'B' -- Corrected response is preferred
FROM public.ai_feedback f
JOIN public.messages m_assistant ON m_assistant.id = f.message_id
JOIN public.messages m_user ON m_user.conversation_id = m_assistant.conversation_id
  AND m_user.role = 'user'
  AND m_user.created_at < m_assistant.created_at
WHERE f.id = 'feedback-123'
ORDER BY m_user.created_at DESC
LIMIT 1;
```

### 8. Export Training Data

```sql
-- Create JSONL export for fine-tuning
INSERT INTO public.ai_training_exports (
  export_type,
  format,
  filters,
  created_by
)
VALUES (
  'finetuning',
  'jsonl',
  '{"min_rating": 4, "feedback_type": "thumbs_up", "date_range": "last_30_days"}'::jsonb,
  auth.uid()
)
RETURNING id;

-- Query data for export (application code writes to file_url)
SELECT jsonb_build_object(
  'messages', jsonb_agg(
    jsonb_build_object(
      'role', m.role::text,
      'content', m.content
    ) ORDER BY m.created_at
  )
) as training_example
FROM public.messages m
JOIN public.ai_feedback f ON f.message_id = m.id
WHERE f.rating >= 4
  AND f.created_at > NOW() - INTERVAL '30 days'
GROUP BY m.conversation_id;
```

### 9. Observability with Traces & Spans

```sql
-- Start trace for complex operation
INSERT INTO public.traces (trace_id, user_id, attributes)
VALUES (
  'trace-abc123',
  auth.uid(),
  '{"operation": "multi_step_summarization", "source": "api"}'::jsonb
);

-- Add spans for each sub-operation
INSERT INTO public.spans (trace_id, span_id, name, started_at, ended_at, status, attributes)
VALUES
  ('trace-abc123', 'span-1', 'fetch_documents', NOW() - INTERVAL '2 seconds', NOW() - INTERVAL '1.5 seconds', 'ok', '{"doc_count": 5}'::jsonb),
  ('trace-abc123', 'span-2', 'generate_embedding', NOW() - INTERVAL '1.5 seconds', NOW() - INTERVAL '0.8 seconds', 'ok', '{"model": "text-embedding-3-large"}'::jsonb),
  ('trace-abc123', 'span-3', 'call_gpt4', NOW() - INTERVAL '0.8 seconds', NOW(), 'ok', '{"tokens": 1200}'::jsonb);

-- Analyze slow traces
SELECT
  t.trace_id,
  t.attributes->>'operation' as operation,
  COUNT(s.id) as span_count,
  EXTRACT(EPOCH FROM (MAX(s.ended_at) - MIN(s.started_at))) as duration_seconds
FROM public.traces t
JOIN public.spans s ON s.trace_id = t.trace_id
WHERE t.started_at > NOW() - INTERVAL '1 hour'
GROUP BY t.trace_id, t.attributes
HAVING EXTRACT(EPOCH FROM (MAX(s.ended_at) - MIN(s.started_at))) > 5
ORDER BY duration_seconds DESC;
```

### 10. Bandit-Based Model Selection

```sql
-- Create policy for model routing
INSERT INTO public.policy_versions (key, algo, params)
VALUES ('router_v1', 'ra-ucb', '{"beta": 1.0}'::jsonb)
RETURNING id;

-- Define arms (model + prompt combinations)
INSERT INTO public.bandit_arms (policy_id, arm_key, metadata)
VALUES
  ('policy-123', 'gpt-4-turbo|system-prompt-friendly', '{"cost_per_1k": 0.01}'::jsonb),
  ('policy-123', 'gpt-4-turbo|system-prompt-concise', '{"cost_per_1k": 0.01}'::jsonb),
  ('policy-123', 'claude-3-5-sonnet|system-prompt-friendly', '{"cost_per_1k": 0.003}'::jsonb);

-- Record trial results
INSERT INTO public.bandit_trials (policy_id, arm_id, trace_id, context, reward, score)
VALUES
  ('policy-123', 'arm-1', 'trace-xyz', '{"user_tier": "pro"}'::jsonb, 0.85, 0.85),
  ('policy-123', 'arm-2', 'trace-xyz', '{"user_tier": "free"}'::jsonb, 0.72, 0.72),
  ('policy-123', 'arm-3', 'trace-xyz', '{"user_tier": "pro"}'::jsonb, 0.88, 0.88);

-- Analyze arm performance
SELECT
  ba.arm_key,
  COUNT(bt.id) as trial_count,
  ROUND(AVG(bt.score)::numeric, 3) as avg_score,
  ROUND(STDDEV(bt.score)::numeric, 3) as stddev_score,
  ROUND(AVG(bt.reward - bt.penalties)::numeric, 3) as avg_net_reward
FROM public.bandit_arms ba
JOIN public.bandit_trials bt ON bt.arm_id = ba.id
WHERE ba.policy_id = 'policy-123'
GROUP BY ba.id, ba.arm_key
ORDER BY avg_score DESC;
```

## 🔥 Advanced Patterns

### Per-User Cost Attribution & Billing

```sql
-- Monthly cost report per user
SELECT
  up.display_name,
  up.id as user_id,
  st.tier_name,
  COUNT(DISTINCT wr.id) as workflow_runs,
  COALESCE(SUM(wr.cost_usd), 0) as total_cost_usd,
  COALESCE(SUM(wr.tokens_input), 0) as tokens_in,
  COALESCE(SUM(wr.tokens_output), 0) as tokens_out,
  CASE
    WHEN st.tier_name = 'free' AND SUM(wr.cost_usd) > 5.00 THEN 'OVER_LIMIT'
    WHEN st.tier_name = 'pro' AND SUM(wr.cost_usd) > 50.00 THEN 'HIGH_USAGE'
    ELSE 'NORMAL'
  END as usage_status
FROM public.user_profiles up
LEFT JOIN public.user_subscriptions us ON us.user_id = up.id AND us.status = 'active'
LEFT JOIN public.subscription_tiers st ON st.id = us.tier_id
LEFT JOIN public.workflow_runs wr ON wr.user_id = up.id
  AND wr.created_at > DATE_TRUNC('month', NOW())
GROUP BY up.id, up.display_name, st.tier_name
HAVING SUM(wr.cost_usd) > 0
ORDER BY total_cost_usd DESC;
```

### Auto-Archive Stale Conversations

```sql
-- Archive conversations inactive for 30+ days
UPDATE public.conversations
SET is_archived = true
WHERE user_id = auth.uid()
  AND is_archived = false
  AND updated_at < NOW() - INTERVAL '30 days';

-- Re-activate on new message (add to trigger)
CREATE OR REPLACE FUNCTION unarchive_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET is_archived = false
  WHERE id = NEW.conversation_id AND is_archived = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_unarchive_on_message ON public.messages;
CREATE TRIGGER trg_unarchive_on_message
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION unarchive_on_message();
```

### Smart Memory Pruning (Importance-Based)

```sql
-- Decay recency score over time
UPDATE public.episodic_memories
SET
  recency_score = GREATEST(
    0.1, -- Minimum score
    recency_score * EXP(-EXTRACT(EPOCH FROM (NOW() - created_at)) / 2592000) -- 30-day half-life
  ),
  updated_at = NOW()
WHERE user_id = auth.uid();

-- Remove low-value memories (low importance × low recency)
DELETE FROM public.episodic_memories
WHERE user_id = auth.uid()
  AND (importance_score * recency_score) < 0.1
  AND created_at < NOW() - INTERVAL '90 days';
```

## 📊 Monitoring Queries

```sql
-- System health dashboard
SELECT
  'Total Users' as metric, COUNT(*)::text as value FROM public.user_profiles
UNION ALL
SELECT 'Active Conversations (7d)', COUNT(DISTINCT conversation_id)::text
FROM public.messages WHERE created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 'Total Messages (30d)', COUNT(*)::text
FROM public.messages WHERE created_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'Cache Hit Rate (%)', ROUND(AVG(hit_count)::numeric, 1)::text
FROM public.ai_response_cache WHERE hit_count > 0
UNION ALL
SELECT 'Total Cost (30d) $', ROUND(COALESCE(SUM(cost_usd), 0)::numeric, 2)::text
FROM public.workflow_runs WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## 🎯 Key Takeaways

1. **Context window management** is automatic via triggers
2. **Cost tracking** happens at every step with `estimate_cost_usd()`
3. **Embedding model migrations** are tracked and auditable
4. **Caching** can save 50-90% on repeated queries
5. **Feature flags + traits** enable hyper-personalization
6. **RLHF feedback** flows directly into training pipelines
7. **Observability** is built-in with traces/spans
8. **Bandits** enable adaptive model selection

This schema handles everything from MVP to Series B scale. 🚀

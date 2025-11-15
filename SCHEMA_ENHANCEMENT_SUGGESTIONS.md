# Schema v1.2 Enhancement Suggestions

## 1. Add Soft Deletes (Optional but Common Pattern)

```sql
-- Add to key tables for audit trail
ALTER TABLE public.conversations ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN deleted_at TIMESTAMPTZ;

-- Update RLS to exclude soft-deleted
CREATE POLICY "Users see non-deleted conversations" ON public.conversations
    FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
```

## 2. Embedding Model Version Tracking

```sql
-- Track which embedding model was used (ada-002 vs text-embedding-3-large)
ALTER TABLE public.episodic_memories
ADD COLUMN embedding_model TEXT DEFAULT 'text-embedding-ada-002',
ADD COLUMN embedding_dimensions INT DEFAULT 1536;

-- Index for model version queries
CREATE INDEX idx_episodic_memories_model
ON public.episodic_memories(embedding_model, user_id);
```

## 3. Workflow Versioning

```sql
-- Allow multiple versions of same workflow key
ALTER TABLE public.workflows
ADD COLUMN version INT DEFAULT 1,
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
DROP CONSTRAINT workflows_key_key;

ALTER TABLE public.workflows
ADD CONSTRAINT workflows_key_version_unique UNIQUE(key, version);

-- Point runs at specific version
ALTER TABLE public.workflow_runs
ADD COLUMN workflow_version INT;
```

## 4. Message Content Moderation

```sql
-- Track moderation status
ALTER TABLE public.messages
ADD COLUMN moderation_status TEXT CHECK (moderation_status IN ('pending','approved','flagged','blocked')),
ADD COLUMN moderation_flags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN moderated_at TIMESTAMPTZ;

CREATE INDEX idx_messages_moderation ON public.messages(moderation_status)
WHERE moderation_status IN ('pending','flagged');
```

## 5. Conversation Sharing

```sql
-- Share conversations via public link
CREATE TABLE public.conversation_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'base64'),
    expires_at TIMESTAMPTZ,
    view_count INT DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Anyone with token can view
CREATE POLICY "Public access via share token" ON public.conversation_shares
    FOR SELECT USING (expires_at IS NULL OR expires_at > NOW());
```

## 6. Workflow Retry Logic

```sql
-- Add exponential backoff config
ALTER TABLE public.jobs
ADD COLUMN retry_config JSONB DEFAULT '{"strategy":"exponential","base_delay_ms":1000,"max_delay_ms":300000}'::jsonb;

-- Track retry metadata
ALTER TABLE public.workflow_runs
ADD COLUMN retry_count INT DEFAULT 0,
ADD COLUMN last_retry_at TIMESTAMPTZ;
```

## 7. User Activity Materialized View (Performance)

```sql
-- Faster queries for active users
CREATE MATERIALIZED VIEW public.user_activity_summary AS
SELECT
    user_id,
    COUNT(DISTINCT DATE(event_time)) as days_active,
    MAX(event_time) as last_active_at,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE event_time > NOW() - INTERVAL '7 days') as events_7d,
    COUNT(*) FILTER (WHERE event_time > NOW() - INTERVAL '30 days') as events_30d
FROM public.user_events
GROUP BY user_id;

CREATE UNIQUE INDEX ON public.user_activity_summary(user_id);

-- Refresh daily via cron job
```

## 8. Token Usage Aggregation Function

```sql
-- Helper to calculate total token costs
CREATE OR REPLACE FUNCTION public.calculate_token_cost(
    p_model TEXT,
    p_input_tokens INT,
    p_output_tokens INT
) RETURNS NUMERIC AS $$
DECLARE
    pricing JSONB;
    cost NUMERIC;
BEGIN
    SELECT priced_per_1k_tokens INTO pricing
    FROM public.model_registry
    WHERE name = p_model AND is_active = TRUE
    LIMIT 1;

    IF pricing IS NULL THEN
        RETURN 0;
    END IF;

    cost := (p_input_tokens / 1000.0) * (pricing->>'input')::NUMERIC +
            (p_output_tokens / 1000.0) * (pricing->>'output')::NUMERIC;

    RETURN ROUND(cost, 4);
END;
$$ LANGUAGE plpgsql STABLE;
```

## 9. Conversation Context Window Management

```sql
-- Track token usage per conversation
CREATE TABLE public.conversation_context (
    conversation_id UUID PRIMARY KEY REFERENCES public.conversations(id) ON DELETE CASCADE,
    total_tokens INT DEFAULT 0,
    context_window_size INT DEFAULT 4096,
    last_pruned_at TIMESTAMPTZ,
    pruning_strategy TEXT DEFAULT 'sliding_window', -- 'sliding_window', 'summarize', 'hybrid'
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update on message insert
CREATE OR REPLACE FUNCTION update_conversation_tokens()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.conversation_context (conversation_id, total_tokens)
    VALUES (NEW.conversation_id, COALESCE(NEW.tokens_used, 0))
    ON CONFLICT (conversation_id)
    DO UPDATE SET
        total_tokens = conversation_context.total_tokens + COALESCE(NEW.tokens_used, 0),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_tokens_update
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_tokens();
```

## 10. Audit Log for Admin Actions

```sql
-- Track privileged operations
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor ON public.audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
```

## Summary Priority

**High Priority** (Add Now):
- ✅ Embedding model version tracking (#2)
- ✅ Token cost calculation (#8)
- ✅ Conversation context management (#9)

**Medium Priority** (Add Soon):
- 📊 User activity materialized view (#7)
- 🔄 Workflow versioning (#3)
- 🔗 Conversation sharing (#5)

**Low Priority** (Nice to Have):
- 🗑️ Soft deletes (#1)
- 🛡️ Content moderation (#4)
- 🔁 Retry logic (#6)
- 📝 Audit log (#10)

---

Overall, your v1.2 schema is **production-grade** and these are just optional enhancements based on common patterns I've seen in scaled AI apps.

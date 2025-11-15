-- ============================================================================
-- UNIVERSAL AI-POWERED APP SCHEMA FOR SUPABASE
-- ============================================================================
-- Purpose: Production-ready schema for ANY modern AI app
-- Features: AI chat, memory, personalization, gamification, subscriptions
-- Version: 1.0.0
-- License: MIT - Use freely in your projects
-- ============================================================================

-- ============================================================================
-- CORE UTILITIES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USER PROFILES & PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    timezone TEXT DEFAULT 'UTC',
    locale TEXT DEFAULT 'en-US',
    theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_display_name ON public.user_profiles(display_name);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TRIGGER set_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- USER TRAITS (FOR PERSONALIZATION)
-- ============================================================================
-- Store user characteristics that drive personalization
-- Example: vegan, fitness_enthusiast, budget_conscious, etc.

CREATE TABLE IF NOT EXISTS public.user_traits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trait_key TEXT NOT NULL,
    trait_value TEXT,
    trait_type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'array'
    confidence_score DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence_score BETWEEN 0 AND 1),
    source TEXT DEFAULT 'user_input', -- 'user_input', 'ai_inferred', 'behavioral'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, trait_key)
);

CREATE INDEX idx_user_traits_user_id ON public.user_traits(user_id);
CREATE INDEX idx_user_traits_trait_key ON public.user_traits(trait_key);
ALTER TABLE public.user_traits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own traits" ON public.user_traits
    FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER set_user_traits_updated_at
    BEFORE UPDATE ON public.user_traits
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- AI CHAT CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    context_summary TEXT,
    is_archived BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_user_archived ON public.conversations(user_id, is_archived);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations" ON public.conversations
    FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER set_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- AI CHAT MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text', -- 'text', 'image', 'audio', 'file'
    model_used TEXT,
    tokens_used INTEGER,
    latency_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations" ON public.messages
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
    );
CREATE POLICY "Users can insert messages in own conversations" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
    );

-- ============================================================================
-- AI RESPONSE CACHE (SAVE MONEY!)
-- ============================================================================
-- Cache identical AI requests to reduce API costs

CREATE TABLE IF NOT EXISTS public.ai_response_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    prompt_hash TEXT NOT NULL,
    model TEXT NOT NULL,
    response_content TEXT NOT NULL,
    tokens_used INTEGER,
    quality_tier TEXT DEFAULT 'production', -- 'production', 'preview', 'test'
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_response_cache_key ON public.ai_response_cache(cache_key);
CREATE INDEX idx_ai_response_cache_expires ON public.ai_response_cache(expires_at);
CREATE INDEX idx_ai_response_cache_quality ON public.ai_response_cache(quality_tier);

-- No RLS needed - this is app-level cache, not user-specific

-- ============================================================================
-- EPISODIC MEMORY (AI REMEMBERS USER CONTEXT)
-- ============================================================================
-- Store important moments/facts about users for long-term personalization

CREATE TABLE IF NOT EXISTS public.episodic_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL, -- 'preference', 'achievement', 'goal', 'insight', 'event'
    content TEXT NOT NULL,
    importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score BETWEEN 0 AND 1),
    recency_score DECIMAL(3,2) DEFAULT 1.0 CHECK (recency_score BETWEEN 0 AND 1),
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    embedding vector(1536), -- For semantic search (OpenAI ada-002 dimensions)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_episodic_memories_user_id ON public.episodic_memories(user_id);
CREATE INDEX idx_episodic_memories_type ON public.episodic_memories(memory_type);
CREATE INDEX idx_episodic_memories_importance ON public.episodic_memories(importance_score DESC);
ALTER TABLE public.episodic_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own memories" ON public.episodic_memories
    FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER set_episodic_memories_updated_at
    BEFORE UPDATE ON public.episodic_memories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- DYNAMIC UI PERSONALIZATION
-- ============================================================================
-- Server-driven UI layouts based on user traits

CREATE TABLE IF NOT EXISTS public.ui_layout_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area TEXT NOT NULL, -- 'dashboard', 'home', 'profile', etc.
    layout_name TEXT NOT NULL,
    trait_conditions JSONB NOT NULL, -- {"trait_key": "expected_value"}
    priority INTEGER DEFAULT 0,
    layout_config JSONB NOT NULL, -- Component tree configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ui_layout_rules_area ON public.ui_layout_rules(area);
CREATE INDEX idx_ui_layout_rules_active ON public.ui_layout_rules(is_active);

-- No RLS - global configuration

-- Function to select best UI layout for user
CREATE OR REPLACE FUNCTION select_ui_layout(p_user_id UUID, p_area TEXT)
RETURNS JSONB AS $$
DECLARE
    user_traits_map JSONB;
    best_layout JSONB;
BEGIN
    -- Get user traits as JSON map
    SELECT jsonb_object_agg(trait_key, trait_value)
    INTO user_traits_map
    FROM public.user_traits
    WHERE user_id = p_user_id;

    -- Find best matching layout
    SELECT layout_config
    INTO best_layout
    FROM public.ui_layout_rules
    WHERE area = p_area
      AND is_active = true
      AND (
          trait_conditions <@ user_traits_map
          OR trait_conditions = '{}'::jsonb
      )
    ORDER BY priority DESC, created_at DESC
    LIMIT 1;

    RETURN COALESCE(best_layout, '{"layout": "default"}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GAMIFICATION: XP & LEVELS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_gamification (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    achievements_unlocked TEXT[] DEFAULT '{}',
    badges_earned TEXT[] DEFAULT '{}',
    last_activity_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_gamification_level ON public.user_gamification(level DESC);
CREATE INDEX idx_user_gamification_xp ON public.user_gamification(total_xp DESC);
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gamification" ON public.user_gamification
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own gamification" ON public.user_gamification
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gamification" ON public.user_gamification
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- XP Activity Log
CREATE TABLE IF NOT EXISTS public.xp_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    xp_awarded INTEGER NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_activities_user_id ON public.xp_activities(user_id);
CREATE INDEX idx_xp_activities_created_at ON public.xp_activities(created_at DESC);
ALTER TABLE public.xp_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp activities" ON public.xp_activities
    FOR SELECT USING (auth.uid() = user_id);

-- Function to award XP
CREATE OR REPLACE FUNCTION award_xp(p_user_id UUID, p_activity_type TEXT, p_xp INTEGER, p_description TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
    new_total_xp INTEGER;
    new_level INTEGER;
BEGIN
    -- Insert activity log
    INSERT INTO public.xp_activities (user_id, activity_type, xp_awarded, description)
    VALUES (p_user_id, p_activity_type, p_xp, p_description);

    -- Update gamification stats
    INSERT INTO public.user_gamification (user_id, total_xp, level)
    VALUES (p_user_id, p_xp, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = user_gamification.total_xp + p_xp,
        level = FLOOR(POWER((user_gamification.total_xp + p_xp) / 100.0, 0.5)) + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SUBSCRIPTIONS & MONETIZATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    price_monthly_usd DECIMAL(10,2),
    price_yearly_usd DECIMAL(10,2),
    features JSONB DEFAULT '[]'::jsonb,
    limits JSONB DEFAULT '{}'::jsonb, -- {"max_messages": 100, "max_storage_mb": 1000}
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_tiers_active ON public.subscription_tiers(is_active, sort_order);

-- No RLS - public pricing info

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES public.subscription_tiers(id),
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'past_due'
    billing_cycle TEXT DEFAULT 'monthly', -- 'monthly', 'yearly'
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_stripe ON public.user_subscriptions(stripe_subscription_id);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- AI FEEDBACK CAPTURE (RLHF - Reinforcement Learning from Human Feedback)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    feedback_type TEXT NOT NULL, -- 'thumbs_up', 'thumbs_down', 'flag', 'rating'
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    reason TEXT,
    corrected_response TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_feedback_user_id ON public.ai_feedback(user_id);
CREATE INDEX idx_ai_feedback_message_id ON public.ai_feedback(message_id);
CREATE INDEX idx_ai_feedback_type ON public.ai_feedback(feedback_type);
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback" ON public.ai_feedback
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- AI TRAINING DATA EXPORT (For Fine-tuning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_training_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_type TEXT NOT NULL, -- 'finetuning', 'rlhf', 'evaluation'
    format TEXT DEFAULT 'jsonl', -- 'jsonl', 'csv', 'parquet'
    filters JSONB DEFAULT '{}'::jsonb,
    row_count INTEGER,
    file_url TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_training_exports_status ON public.ai_training_exports(status);
CREATE INDEX idx_ai_training_exports_type ON public.ai_training_exports(export_type);

-- No RLS - admin only (add custom policies based on your admin system)

-- ============================================================================
-- ANALYTICS & USER EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    event_name TEXT NOT NULL,
    event_category TEXT,
    properties JSONB DEFAULT '{}'::jsonb,
    screen_name TEXT,
    component_name TEXT,
    duration_ms INTEGER,
    success BOOLEAN DEFAULT true,
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX idx_user_events_name ON public.user_events(event_name);
CREATE INDEX idx_user_events_time ON public.user_events(event_time DESC);
CREATE INDEX idx_user_events_session ON public.user_events(session_id);
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events" ON public.user_events
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- FEATURE FLAGS (A/B Testing & Rollouts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
    target_traits JSONB DEFAULT '{}'::jsonb, -- Only enable for users with these traits
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_enabled ON public.feature_flags(is_enabled);

-- No RLS - global configuration

-- Function to check if feature is enabled for user
CREATE OR REPLACE FUNCTION is_feature_enabled(p_user_id UUID, p_flag_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    flag RECORD;
    user_traits_map JSONB;
    random_value INTEGER;
BEGIN
    -- Get feature flag
    SELECT * INTO flag FROM public.feature_flags WHERE flag_key = p_flag_key;

    IF NOT FOUND OR NOT flag.is_enabled THEN
        RETURN false;
    END IF;

    -- Check trait targeting
    IF flag.target_traits IS NOT NULL AND flag.target_traits != '{}'::jsonb THEN
        SELECT jsonb_object_agg(trait_key, trait_value)
        INTO user_traits_map
        FROM public.user_traits
        WHERE user_id = p_user_id;

        IF NOT (flag.target_traits <@ user_traits_map) THEN
            RETURN false;
        END IF;
    END IF;

    -- Check rollout percentage (deterministic based on user_id)
    random_value := (hashtext(p_user_id::text) % 100);
    RETURN random_value < flag.rollout_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ONBOARDING PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_onboarding (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_step TEXT,
    completed_steps TEXT[] DEFAULT '{}',
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own onboarding" ON public.user_onboarding
    FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER set_user_onboarding_updated_at
    BEFORE UPDATE ON public.user_onboarding
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- NOTIFICATION QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'push', 'email', 'sms', 'in_app'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_user_id ON public.notification_queue(user_id);
CREATE INDEX idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled ON public.notification_queue(scheduled_for);
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notification_queue
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- AI IMPLEMENTATION GUIDES (SELF-DOCUMENTING SYSTEM)
-- ============================================================================
-- Store implementation guides directly in database for AI to query

CREATE TABLE IF NOT EXISTS public.ai_implementation_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'ai', 'personalization', 'gamification', 'monetization'
    priority INTEGER DEFAULT 0,
    implementation_code TEXT, -- Working code examples
    usage_examples TEXT,
    dependencies TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_implementation_guides_category ON public.ai_implementation_guides(category);
CREATE INDEX idx_ai_implementation_guides_active ON public.ai_implementation_guides(is_active);

-- No RLS - public documentation

-- ============================================================================
-- SEED ESSENTIAL DATA
-- ============================================================================

-- Insert default subscription tiers
INSERT INTO public.subscription_tiers (tier_name, display_name, description, price_monthly_usd, price_yearly_usd, features, limits, sort_order)
VALUES
    ('free', 'Free', 'Get started with basic features', 0, 0,
     '["Basic AI chat", "Limited history", "Community support"]'::jsonb,
     '{"max_messages_per_day": 20, "max_conversations": 3}'::jsonb, 1),
    ('pro', 'Pro', 'Unlock advanced AI and unlimited features', 9.99, 99.99,
     '["Unlimited AI chat", "Full history", "Priority support", "Advanced personalization"]'::jsonb,
     '{"max_messages_per_day": 1000, "max_conversations": 100}'::jsonb, 2),
    ('enterprise', 'Enterprise', 'Custom solutions for teams', 49.99, 499.99,
     '["Everything in Pro", "Team collaboration", "Custom integrations", "Dedicated support"]'::jsonb,
     '{"max_messages_per_day": -1, "max_conversations": -1}'::jsonb, 3)
ON CONFLICT (tier_name) DO NOTHING;

-- Insert default feature flags
INSERT INTO public.feature_flags (flag_key, display_name, description, is_enabled, rollout_percentage)
VALUES
    ('ai_chat_v2', 'AI Chat V2', 'New AI chat interface with streaming', true, 100),
    ('voice_messages', 'Voice Messages', 'Send voice messages to AI', true, 50),
    ('dark_mode', 'Dark Mode', 'Dark theme support', true, 100),
    ('advanced_analytics', 'Advanced Analytics', 'Detailed usage analytics', false, 0)
ON CONFLICT (flag_key) DO NOTHING;

-- Insert default UI layout
INSERT INTO public.ui_layout_rules (area, layout_name, trait_conditions, priority, layout_config)
VALUES
    ('dashboard', 'default', '{}'::jsonb, 0,
     '{"components": [{"type": "greeting"}, {"type": "quick_actions"}, {"type": "recent_activity"}]}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Active users with subscription info
CREATE OR REPLACE VIEW public.users_with_subscriptions AS
SELECT
    up.id,
    up.display_name,
    up.avatar_url,
    up.created_at,
    st.tier_name,
    st.display_name as tier_display_name,
    us.status as subscription_status,
    us.current_period_end
FROM public.user_profiles up
LEFT JOIN public.user_subscriptions us ON up.id = us.user_id AND us.status = 'active'
LEFT JOIN public.subscription_tiers st ON us.tier_id = st.id;

-- View: User gamification leaderboard
CREATE OR REPLACE VIEW public.gamification_leaderboard AS
SELECT
    ug.user_id,
    up.display_name,
    up.avatar_url,
    ug.total_xp,
    ug.level,
    ug.current_streak,
    ug.best_streak,
    RANK() OVER (ORDER BY ug.total_xp DESC) as rank
FROM public.user_gamification ug
JOIN public.user_profiles up ON ug.user_id = up.id
ORDER BY ug.total_xp DESC;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON SCHEMA public IS 'Universal AI-powered app schema - use freely in your projects';

COMMENT ON TABLE public.user_profiles IS 'User profile and preference settings';
COMMENT ON TABLE public.user_traits IS 'User characteristics for personalization (e.g., vegan, fitness_enthusiast)';
COMMENT ON TABLE public.conversations IS 'AI chat conversation threads';
COMMENT ON TABLE public.messages IS 'Individual messages in conversations';
COMMENT ON TABLE public.ai_response_cache IS 'Cache AI responses to reduce costs';
COMMENT ON TABLE public.episodic_memories IS 'Long-term memory of important user context';
COMMENT ON TABLE public.ui_layout_rules IS 'Server-driven UI personalization rules';
COMMENT ON TABLE public.user_gamification IS 'XP, levels, streaks, and achievements';
COMMENT ON TABLE public.xp_activities IS 'Log of XP-earning activities';
COMMENT ON TABLE public.subscription_tiers IS 'Subscription pricing and features';
COMMENT ON TABLE public.user_subscriptions IS 'User subscription status';
COMMENT ON TABLE public.ai_feedback IS 'User feedback on AI responses (RLHF)';
COMMENT ON TABLE public.ai_training_exports IS 'Export data for AI fine-tuning';
COMMENT ON TABLE public.user_events IS 'Analytics event tracking';
COMMENT ON TABLE public.feature_flags IS 'Feature flags for A/B testing';
COMMENT ON TABLE public.user_onboarding IS 'Track user onboarding progress';
COMMENT ON TABLE public.notification_queue IS 'Scheduled notifications';
COMMENT ON TABLE public.ai_implementation_guides IS 'Self-documenting implementation guides';

COMMENT ON FUNCTION select_ui_layout IS 'Returns best UI layout for user based on traits';
COMMENT ON FUNCTION award_xp IS 'Award XP to user and update level';
COMMENT ON FUNCTION is_feature_enabled IS 'Check if feature flag is enabled for user';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*

-- Example 1: Create a new user profile
INSERT INTO public.user_profiles (id, display_name, timezone)
VALUES (auth.uid(), 'John Doe', 'America/New_York');

-- Example 2: Add user traits for personalization
INSERT INTO public.user_traits (user_id, trait_key, trait_value, source)
VALUES
    (auth.uid(), 'language', 'spanish', 'user_input'),
    (auth.uid(), 'interest', 'technology', 'behavioral');

-- Example 3: Start an AI conversation
INSERT INTO public.conversations (user_id, title)
VALUES (auth.uid(), 'Help with project planning')
RETURNING id;

-- Example 4: Add messages to conversation
INSERT INTO public.messages (conversation_id, user_id, role, content)
VALUES
    ('conv-id', auth.uid(), 'user', 'How do I plan a software project?'),
    ('conv-id', auth.uid(), 'assistant', 'Here are the key steps...');

-- Example 5: Award XP for activity
SELECT award_xp(auth.uid(), 'completed_tutorial', 100, 'Finished onboarding tutorial');

-- Example 6: Get personalized UI layout
SELECT select_ui_layout(auth.uid(), 'dashboard');

-- Example 7: Check feature flag
SELECT is_feature_enabled(auth.uid(), 'voice_messages');

-- Example 8: Cache AI response
INSERT INTO public.ai_response_cache (cache_key, prompt_hash, model, response_content, tokens_used, expires_at)
VALUES (
    'summary_how_to_plan_project',
    md5('How do I plan a software project?'),
    'gpt-4',
    'Here are the key steps for project planning...',
    150,
    NOW() + INTERVAL '7 days'
);

-- Example 9: Get leaderboard
SELECT * FROM public.gamification_leaderboard LIMIT 10;

-- Example 10: Track analytics event
INSERT INTO public.user_events (user_id, event_name, event_category, properties)
VALUES (
    auth.uid(),
    'feature_used',
    'engagement',
    '{"feature": "ai_chat", "duration_seconds": 45}'::jsonb
);

*/

-- ============================================================================
-- END OF UNIVERSAL AI APP SCHEMA
-- ============================================================================

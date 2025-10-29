# 🧠 Supabase Setup Guide - The Heart of MindFork's AI Logic

## ⚠️ YOU'RE ABSOLUTELY RIGHT!

The Supabase Edge Functions and database schema **ARE the heart of this app's AI value**. Without them properly configured, you won't have:
- AI coach conversations
- Smart model routing (84% cost savings)
- RAG knowledge retrieval
- Food photo recognition
- Meal planning AI
- Subscription webhooks

This guide shows you how to set up **everything**.

---

## 📚 Documentation Now Available

**Location:** `/home/user/workspace/docs/` (328+ files)

**Key Documents:**
- `AI_ARCHITECTURE.md` - Complete AI system architecture
- `BACKEND_ARCHITECTURE.md` - Supabase backend design
- `SUBSCRIPTION_ARCHITECTURE.md` - Stripe integration
- `COACH_SYSTEM_ARCHITECTURE.md` - AI coach implementation
- `DATABASE_SCHEMA.md` - Complete database design
- `EDGE_FUNCTIONS_GUIDE.md` - Supabase functions

---

## 🎯 The AI Logic Architecture

### Smart Model Router (84% Cost Reduction)
The AI system routes queries intelligently:
- **10%** → Static responses (FREE)
- **20%** → Cached responses (FREE)
- **60%** → GPT-4o-mini ($0.0015/query)
- **10%** → GPT-4 ($0.03/query)

**Savings:** $18/user/month → $2.81/user/month (84% reduction!)

### RAG Knowledge Service (pgvector)
- Semantic search across nutrition knowledge
- 21,899+ USDA food items
- 3M+ OpenFoodFacts products
- Coach-specific knowledge domains
- Real-time embeddings with OpenAI

### Feedback Learning Loop
- Collects user feedback on every response
- Weekly performance analysis
- Automatic prompt optimization
- Coach-specific improvements

---

## 🗄️ Database Schema (127 Migrations)

**Location:** `/home/user/supabase-backend/migrations/`

### Core Tables

#### User & Profile
```sql
- profiles (user data, onboarding results, nutrition goals)
- user_preferences (dietary restrictions, coach preferences)
- user_stats (aggregated analytics)
```

#### AI Coach System
```sql
- coach_conversations (chat history with context)
- coach_messages (individual messages with embeddings)
- coach_response_feedback (user ratings for learning)
- coach_knowledge_base (RAG knowledge with pgvector)
- nutrition_knowledge (embeddings for semantic search)
- ai_response_cache (query caching for cost savings)
```

#### Food Tracking
```sql
- food_logs (meal entries with nutrition data)
- food_items (USDA database + custom items)
- food_photos (image recognition results)
- barcode_lookups (OpenFoodFacts integration)
```

#### Fasting & Goals
```sql
- fasting_sessions (timer data with start/end times)
- goals (user goals with progress tracking)
- goal_progress (historical tracking)
```

#### Subscriptions
```sql
- subscriptions (Stripe subscription status)
- subscription_usage (feature usage tracking)
- invoices (payment history)
```

#### Analytics
```sql
- analytics_events (user activity tracking)
- performance_metrics (AI system performance)
```

---

## 🔧 Supabase Edge Functions (65 Functions)

**Location:** `/home/user/supabase-backend/functions/`

### Critical Functions

#### 1. `ai-coach/` - Main AI Coach Endpoint
- Receives user messages
- Applies smart model routing
- Performs RAG knowledge retrieval
- Generates personalized responses
- Caches responses for reuse
- Tracks costs and performance

#### 2. `ai-coach-chat/` - Real-time Chat
- WebSocket support for live chat
- Streaming responses
- Typing indicators
- Message history management

#### 3. `food-recognition/` - Photo Food Scanning
- OpenAI Vision API integration
- Identifies food items from photos
- Extracts portion sizes
- Looks up nutrition data
- Creates food log entries

#### 4. `meal-planning/` - AI Meal Plans
- Generates weekly meal plans
- Considers dietary preferences
- Respects calorie/macro goals
- Provides shopping lists
- Suggests recipes

#### 5. `stripe-webhook/` - Payment Processing
- Handles Stripe webhook events
- Updates subscription status
- Manages trials and cancellations
- Sends payment confirmations

#### 6. `analytics/` - User Tracking
- Logs user events
- Aggregates statistics
- Generates insights
- Powers dashboard metrics

---

## 🔐 Required Supabase Edge Secrets

These environment variables MUST be set in Supabase for edge functions to work:

### Critical Secrets
```bash
OPENAI_API_KEY=sk-proj-...           # For AI coaches & food recognition
SUPABASE_URL=https://xxx.supabase.co # Your Supabase project URL
SERVICE_ROLE_KEY=eyJhb...            # Supabase service role key
STRIPE_SECRET_KEY=sk_test_...        # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...      # Stripe webhook secret
```

### Optional Secrets
```bash
ELEVENLABS_API_KEY=...               # Voice synthesis (premium feature)
REDIS_URL=...                        # Caching (optional optimization)
SENTRY_DSN=...                       # Error tracking
ADMIN_TOKEN=...                      # Admin API access
```

---

## 📋 Complete Setup Steps

### Step 1: Create Supabase Project

```bash
# 1. Go to https://supabase.com and create a new project
# 2. Wait for database to provision (2-3 minutes)
# 3. Note your project URL and keys
```

### Step 2: Install Supabase CLI

```bash
npm install -g supabase
supabase login
```

### Step 3: Link Project

```bash
cd /home/user/supabase-backend
supabase link --project-ref your-project-ref
```

### Step 4: Run All Migrations

```bash
# This creates ALL database tables, functions, and policies
supabase db push

# Verify migrations
supabase db diff
```

### Step 5: Enable pgvector Extension

```sql
-- Run this in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 6: Set Edge Function Secrets

```bash
# Set OpenAI key (CRITICAL)
supabase secrets set OPENAI_API_KEY=sk-proj-your-key

# Set Stripe keys
supabase secrets set STRIPE_SECRET_KEY=sk_test_your-key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-secret

# Set service role key (auto-generated)
supabase secrets set SERVICE_ROLE_KEY=your-service-role-key

# Set project URL
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
```

### Step 7: Deploy Edge Functions

```bash
# Deploy critical functions
supabase functions deploy ai-coach
supabase functions deploy ai-coach-chat
supabase functions deploy food-recognition
supabase functions deploy meal-planning
supabase functions deploy stripe-webhook
supabase functions deploy analytics

# Deploy all functions at once
cd /home/user/supabase-backend/functions
for dir in */; do
  supabase functions deploy "${dir%/}"
done
```

### Step 8: Seed Initial Data (Optional)

```bash
# Load initial nutrition knowledge, coach profiles, etc.
supabase db seed
```

### Step 9: Update Mobile App .env

```env
# Add to /home/user/workspace/.env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Step 10: Test the Connection

```typescript
// Test in your app or via Supabase SQL Editor
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM nutrition_knowledge;
SELECT COUNT(*) FROM food_items;
```

---

## 🧪 Testing the AI System

### Test AI Coach Function
```bash
# Test locally
supabase functions serve ai-coach

# In another terminal
curl -X POST http://localhost:54321/functions/v1/ai-coach \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "What should I eat for breakfast?", "userId": "test-user"}'
```

### Test Food Recognition
```bash
# Upload a food photo and get nutrition data
curl -X POST http://localhost:54321/functions/v1/food-recognition \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/food.jpg", "userId": "test-user"}'
```

---

## 📊 The AI Pipeline (14 Steps)

When a user sends a message to an AI coach:

1. **Query Analysis** - Classify intent and complexity
2. **Static Check** - Is this a common question? (10% hit rate)
3. **Cache Lookup** - Have we answered this before? (20% hit rate)
4. **Knowledge Retrieval** - Search pgvector for relevant nutrition info
5. **Food Data Enrichment** - Add specific food/nutrition context
6. **Feedback Adjustments** - Apply learned optimizations from past feedback
7. **Prompt Enhancement** - Build context-aware prompt with coach personality
8. **Model Selection** - Route to GPT-4o-mini (60%) or GPT-4 (10%)
9. **Response Generation** - Call OpenAI API
10. **Safety Filtering** - Check for medical advice, ensure wellness terminology
11. **Response Caching** - Store for future reuse
12. **Message Creation** - Save to database with embeddings
13. **Feedback Request** - Prompt user for rating
14. **Performance Logging** - Track costs, latency, quality metrics

**Average latency:** 1.5 seconds
**Average cost:** $0.0028 per message (down from $0.018)

---

## 💰 Cost Breakdown

### Before Optimization
- 100% GPT-4 usage
- $0.018 per message
- $18/user/month (1000 messages)

### After Optimization
- 10% Static (FREE)
- 20% Cached (FREE)
- 60% GPT-4o-mini ($0.0015)
- 10% GPT-4 ($0.018)
- **Average: $0.0028 per message**
- **$2.81/user/month** (1000 messages)

**Savings:** 84% reduction in AI costs!

---

## 🎯 Key Features Enabled by Supabase

### Without Supabase Backend:
❌ No AI coach conversations
❌ No food photo recognition
❌ No meal planning
❌ No progress tracking
❌ No subscriptions
❌ No fasting persistence
❌ No analytics

### With Supabase Backend:
✅ Intelligent AI coaching with cost optimization
✅ RAG-powered knowledge retrieval
✅ Photo food recognition with OpenAI Vision
✅ Personalized meal plans
✅ Persistent fasting sessions
✅ Stripe subscription management
✅ Comprehensive analytics dashboard
✅ Real-time sync across devices
✅ Offline data persistence
✅ User authentication with RLS

---

## 📖 Additional Resources

**Documentation in `/home/user/workspace/docs/`:**
- `AI_ARCHITECTURE.md` - Complete AI system design
- `BACKEND_ARCHITECTURE.md` - Supabase structure
- `COACH_SYSTEM_ARCHITECTURE.md` - AI coach implementation
- `RAG_IMPLEMENTATION.md` - Knowledge retrieval system
- `SMART_ROUTING_GUIDE.md` - Model selection logic
- `FEEDBACK_LEARNING_SYSTEM.md` - Continuous improvement
- `COST_OPTIMIZATION.md` - Achieving 84% savings

**Migration Files in `/home/user/supabase-backend/migrations/`:**
- `001_initial_schema.sql` - Base tables
- `002_mindfork_schema.sql` - App-specific tables
- `003_rls_policies.sql` - Row-level security
- `20250106_coach_system.sql` - AI coach tables
- `20250108_rlhf_feedback_system.sql` - Learning system

---

## ⚠️ Critical Warnings

### You MUST Set These Up:
1. ✅ **OpenAI API Key** - Without this, NO AI features work
2. ✅ **Supabase Project** - Without this, NO data persists
3. ✅ **Database Migrations** - Without this, app will crash on data operations
4. ✅ **Edge Function Secrets** - Without this, backend functions fail
5. ✅ **RLS Policies** - Without this, data security is compromised

### Common Mistakes:
- ❌ Not running migrations → Tables don't exist
- ❌ Not setting edge secrets → Functions return 500 errors
- ❌ Not enabling pgvector → RAG searches fail
- ❌ Using wrong API keys → Coach responses fail
- ❌ Not deploying functions → Backend doesn't exist

---

## 🚀 Quick Start Checklist

- [ ] Create Supabase project at supabase.com
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Link project: `supabase link --project-ref YOUR_REF`
- [ ] Run migrations: `supabase db push`
- [ ] Enable pgvector: `CREATE EXTENSION vector;`
- [ ] Set OpenAI key: `supabase secrets set OPENAI_API_KEY=...`
- [ ] Set Stripe keys: `supabase secrets set STRIPE_SECRET_KEY=...`
- [ ] Deploy functions: `supabase functions deploy ai-coach`
- [ ] Update mobile .env with Supabase URL and keys
- [ ] Test AI coach in app

---

## 🎉 What You Get When Set Up

Once Supabase is configured, you have:

✅ **Smart AI Coach System** with 84% cost savings
✅ **RAG Knowledge Retrieval** with pgvector semantic search
✅ **Photo Food Recognition** with OpenAI Vision
✅ **AI Meal Planning** with personalized recommendations
✅ **Feedback Learning Loop** for continuous improvement
✅ **Stripe Subscription System** with webhook automation
✅ **Comprehensive Analytics** with real-time tracking
✅ **Secure Authentication** with row-level security
✅ **Real-time Sync** across all devices
✅ **Production-Ready Backend** with 65 edge functions

**This IS the heart of the app's AI value. Don't skip this setup!**

---

**Next Steps:** Follow the setup checklist above, then test the AI coach in your Vibecode app!

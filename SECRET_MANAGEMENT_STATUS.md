# 🔐 SECRET MANAGEMENT STATUS - MindFork

**Date**: 2025-11-02
**Status**: ✅ **DOCUMENTED**

---

## Current Secret Storage Locations

### 1. ✅ `.env` File (Local Development)

**Location**: `/home/user/workspace/.env`

**Current Secrets**:
```bash
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=sk-proj-***
EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY=sk-ant-***
EXPO_PUBLIC_VIBECODE_GROK_API_KEY=xai-***
EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY=***
EXPO_PUBLIC_VIBECODE_ELEVENLABS_API_KEY=***
GITHUB_TOKEN=ghp_***
EXPO_PUBLIC_SUPABASE_URL=https://lxajnrofkgpwdpodjvkm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ***
SUPABASE_SERVICE_ROLE_KEY=eyJ*** (DANGEROUS - server-only)
SUPABASE_DB_PASSWORD=***
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_***
```

**Status**: ✅ Configured

**Missing Keys**:
- ❌ `EXPO_PUBLIC_USDA_API_KEY` - Not set (shows as placeholder)
- ❌ `OPENROUTER_API_KEY` - Using hardcoded key in code (bad practice!)

---

### 2. ✅ `.env.example` (Template)

**Location**: `/home/user/workspace/.env.example`

**Purpose**: Documents all available environment variables

**Key Finding**: Line 61 shows USDA key is **optional**:
```bash
# USDA Food Database (optional - enables food lookup)
EXPO_PUBLIC_USDA_API_KEY=your_usda_api_key_here
EXPO_PUBLIC_FOOD_DATABASE_ENABLED=true
```

**Status**: ✅ Template exists, well-documented

---

### 3. ⚠️ Supabase Edge Functions Secrets

**Expected Location**: Supabase Dashboard → Project Settings → Edge Functions → Secrets

**Status**: ⚠️ **NEEDS VERIFICATION**

**What Should Be There**:
```bash
OPENAI_API_KEY=sk-***
ANTHROPIC_API_KEY=sk-ant-***
USDA_API_KEY=*** (if using server-side USDA)
OPENROUTER_API_KEY=sk-or-v1-***
STRIPE_SECRET_KEY=sk_live_*** (NOT publishable key!)
ELEVENLABS_API_KEY=***
```

**How to Check**:
1. Go to https://app.supabase.com/project/lxajnrofkgpwdpodjvkm/settings/functions
2. Click "Secrets" tab
3. Verify which secrets are configured

**How to Add**:
```bash
# Via Supabase CLI:
supabase secrets set OPENAI_API_KEY=sk-***
supabase secrets set USDA_API_KEY=***
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-***
```

**Why Important**: Edge functions need server-side secrets that should NEVER be in client `.env`

---

### 4. ⚠️ GitHub Secrets (CI/CD)

**Expected Location**: GitHub Repo → Settings → Secrets and variables → Actions

**Status**: ⚠️ **NEEDS VERIFICATION**

**What Should Be There**:
```bash
# For GitHub Actions workflows:
EXPO_TOKEN=*** (for EAS builds)
SUPABASE_ACCESS_TOKEN=*** (for deployments)
STRIPE_SECRET_KEY=*** (for backend tests)

# Optionally:
SENTRY_AUTH_TOKEN=*** (for error tracking)
```

**How to Check**:
1. Go to GitHub repo settings
2. Secrets and variables → Actions
3. See list of configured secrets

**How to Add**:
1. GitHub repo → Settings → Secrets → Actions
2. Click "New repository secret"
3. Add name and value

---

## 🚨 Current Security Issues

### Issue 1: Hardcoded OpenRouter Key in Code ⚠️

**File**: `src/services/AIFoodScanService.ts:314`
```typescript
const openai = new OpenAI({
  apiKey: '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', // ❌ HARDCODED!
  baseURL: 'https://openrouter.ai/api/v1',
});
```

**Fix Required**:
```typescript
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY, // ✅ From env
  baseURL: 'https://openrouter.ai/api/v1',
});
```

**Action**:
1. Add to `.env`: `EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-***`
2. Update code to use env var
3. Remove hardcoded key

---

### Issue 2: USDA Key Not Configured ⚠️

**Current State**: `.env.example` has placeholder, but actual `.env` doesn't have USDA key

**Fix Required**:
1. Get USDA API key from https://fdc.nal.usda.gov/api-key-signup.html (free)
2. Add to `.env`: `EXPO_PUBLIC_USDA_API_KEY=YOUR_REAL_KEY`
3. Enable in code: `EXPO_PUBLIC_FOOD_DATABASE_ENABLED=true`

---

### Issue 3: Service Role Key in Client `.env` 🔴 **CRITICAL**

**File**: `.env:11`
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ... # 🔴 DANGEROUS - Has full database access!
```

**Risk**: If this leaks, anyone can read/write/delete ALL database data

**Fix Required**:
1. ❌ **REMOVE** from `.env` (client-side)
2. ✅ Move to Supabase Edge Functions secrets (server-side only)
3. ✅ Move to GitHub Secrets (for CI/CD only)

**Action**:
```bash
# Remove from .env:
# SUPABASE_SERVICE_ROLE_KEY=*** # Don't commit this!

# Add to Supabase Edge Functions:
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Add to GitHub Secrets:
# (via GitHub UI)
```

---

## ✅ Recommended Secret Architecture

### Client-Side (.env) - EXPO_PUBLIC_* only:
```bash
# ✅ Safe for client-side (public keys, URLs)
EXPO_PUBLIC_SUPABASE_URL=https://***
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ*** (limited RLS access)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_*** (publishable, not secret)
EXPO_PUBLIC_USDA_API_KEY=*** (read-only, rate-limited)
EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-*** (usage tracking, not critical)
```

### Server-Side (Supabase Secrets) - Full access keys:
```bash
# ❌ NEVER in .env - Server-only secrets
OPENAI_API_KEY=sk-*** (full access, billing risk)
ANTHROPIC_API_KEY=sk-ant-*** (full access, billing risk)
STRIPE_SECRET_KEY=sk_live_*** (can charge cards!)
SUPABASE_SERVICE_ROLE_KEY=eyJ*** (full DB access)
```

### CI/CD (GitHub Secrets) - Deployment keys:
```bash
# For automated deployments only
EXPO_TOKEN=***
SUPABASE_ACCESS_TOKEN=***
STRIPE_SECRET_KEY=*** (for backend tests)
```

---

## 🎯 Action Plan

### Immediate (Today):

#### ✅ Task 1: Fix Hardcoded OpenRouter Key
**File**: `src/services/AIFoodScanService.ts`
**Current**: Line 314 has hardcoded key
**Fix**:
```typescript
// Before:
apiKey: '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',

// After:
apiKey: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '',
```

**Add to `.env`**:
```bash
EXPO_PUBLIC_OPENROUTER_API_KEY=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
```

---

#### ✅ Task 2: Get USDA API Key
1. Visit https://fdc.nal.usda.gov/api-key-signup.html
2. Sign up (free, instant)
3. Add to `.env`:
```bash
EXPO_PUBLIC_USDA_API_KEY=YOUR_ACTUAL_KEY_HERE
EXPO_PUBLIC_FOOD_DATABASE_ENABLED=true
```

---

#### ✅ Task 3: Move Service Role Key (Critical Security Fix)
1. Copy key from `.env` line 11
2. Add to Supabase Edge Functions:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_KEY
```
3. Remove from `.env`:
```bash
# Delete this line:
# SUPABASE_SERVICE_ROLE_KEY=***
```
4. Add to `.gitignore` (ensure it's there):
```bash
.env
.env.local
```

---

### This Week:

#### ✅ Task 4: Audit Supabase Edge Function Secrets
1. List current secrets:
```bash
supabase secrets list
```
2. Verify these exist:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `OPENROUTER_API_KEY`
   - `USDA_API_KEY`
3. Add any missing

---

#### ✅ Task 5: Audit GitHub Secrets
1. Go to GitHub repo → Settings → Secrets
2. Verify these exist:
   - `EXPO_TOKEN` (for EAS builds)
   - `SUPABASE_ACCESS_TOKEN` (for edge function deployments)
3. Add if missing

---

#### ✅ Task 6: Update Documentation
**File**: `README.md`
Add section:
```markdown
## Environment Setup

### Client-Side (.env):
```bash
cp .env.example .env
# Edit .env with your keys
```

### Server-Side (Supabase):
```bash
supabase secrets set OPENAI_API_KEY=sk-***
supabase secrets set ANTHROPIC_API_KEY=sk-ant-***
```

### CI/CD (GitHub):
Add secrets via GitHub UI → Settings → Secrets
```

---

## 📋 Secret Checklist

### Client (.env):
- [x] `EXPO_PUBLIC_SUPABASE_URL`
- [x] `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [x] `EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY`
- [x] `EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY`
- [x] `EXPO_PUBLIC_VIBECODE_GROK_API_KEY`
- [ ] `EXPO_PUBLIC_OPENROUTER_API_KEY` (hardcoded, needs env var)
- [ ] `EXPO_PUBLIC_USDA_API_KEY` (missing, needs signup)
- [x] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Server (Supabase Edge Functions):
- [ ] `OPENAI_API_KEY` (needs verification)
- [ ] `ANTHROPIC_API_KEY` (needs verification)
- [ ] `OPENROUTER_API_KEY` (needs verification)
- [ ] `USDA_API_KEY` (needs verification)
- [ ] `STRIPE_SECRET_KEY` (needs verification)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (needs to be moved here)

### CI/CD (GitHub Secrets):
- [ ] `EXPO_TOKEN` (needs verification)
- [ ] `SUPABASE_ACCESS_TOKEN` (needs verification)

---

## 🔒 Security Best Practices

### ✅ DO:
- Use `EXPO_PUBLIC_*` prefix for client-safe keys
- Store sensitive keys in Supabase Edge Functions
- Use GitHub Secrets for CI/CD
- Add `.env` to `.gitignore`
- Rotate keys regularly (every 90 days)

### ❌ DON'T:
- Hardcode API keys in source code
- Commit `.env` to git
- Put service role keys in client `.env`
- Share keys in chat/email/Slack
- Use production keys in development

---

## 📊 Secret Audit Log

| Date | Action | Secret | Location | Status |
|------|--------|--------|----------|--------|
| 2025-11-02 | Discovered | OpenRouter Key | Hardcoded in code | ⚠️ Needs fix |
| 2025-11-02 | Discovered | USDA Key | Missing from .env | ⚠️ Needs signup |
| 2025-11-02 | Discovered | Service Role Key | In client .env | 🔴 Critical risk |

---

## 🎯 Summary

**You said**: "we have secrets in supabase edge, github secrets and .env"

**Reality**:
- ✅ `.env` has most client-side keys
- ⚠️ Supabase Edge secrets need verification
- ⚠️ GitHub secrets need verification
- 🔴 **3 critical issues found** (hardcoded key, missing USDA, service role in client)

**Next Steps**:
1. Fix hardcoded OpenRouter key (5 min)
2. Get USDA API key (5 min)
3. Move service role key to Supabase (10 min)
4. Verify Supabase Edge + GitHub secrets (15 min)

**Total Time**: 35 minutes to fix all security issues

---

**Status**: 🟡 **ACTION REQUIRED**
**Priority**: 🔴 **HIGH** (service role key is critical security risk)
**Owner**: You
**Due**: Today

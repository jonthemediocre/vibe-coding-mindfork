# 🔄 Supabase Edge Function Deployment Protocol

**Location:** This protocol is documented in:
- Project CLAUDE.md (lines 16-56)
- This reference file
- Helper script: `deploy-and-verify-edge-function.sh`

---

## ⚠️ CRITICAL: Always Follow This Process

Supabase edge functions **cache for 1-3 minutes** after deployment. Following this protocol prevents reporting false successes.

---

## 📋 Standard Deployment Process

### 1. Deploy the Function
```bash
export SUPABASE_ACCESS_TOKEN="sbp_8e8ae981cd381dcbbe83e076c57aa3f36bef61b2"
supabase functions deploy <function-name> --project-ref lxajnrofkgpwdpodjvkm --legacy-bundle
```

**OR use the helper script:**
```bash
./deploy-and-verify-edge-function.sh <function-name>
```

### 2. Wait 3 Minutes ⏳
- Set a timer for 180 seconds
- Supabase propagates deployments globally during this time
- Multiple versions may run simultaneously during rollout
- **DO NOT report success before waiting**

### 3. Verify Deployment 🔍
Check function logs:
```
https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/functions/<function-name>/logs
```

Look for:
- Recent console.log output with new code
- Correct variable values (URLs, filenames, etc.)
- Timestamp matching your deployment

### 4. Test the Function 🧪
```bash
curl -X POST "https://lxajnrofkgpwdpodjvkm.supabase.co/functions/v1/<function-name>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 5. Confirm Changes ✅
- Verify log output shows new code behavior
- Test from actual app if possible
- Check that expected changes are working
- **ONLY THEN report deployment as successful**

---

## 🚫 Common Mistakes to Avoid

❌ **DON'T:**
- Report deployment complete immediately after `supabase functions deploy`
- Assume changes are live without verification
- Test immediately after deployment (you'll hit cached old version)
- Skip log verification

✅ **DO:**
- Always wait 3 minutes
- Check logs for console.log output
- Verify expected behavior in logs
- Test after waiting period
- Report verified success only

---

## 🔧 Helper Script Usage

The automated script handles everything:

```bash
./deploy-and-verify-edge-function.sh generate-coach-video
```

This script:
1. ✅ Deploys the function
2. ✅ Waits 3 minutes with progress indicator
3. ✅ Provides log links for verification
4. ✅ Shows curl test command
5. ✅ Ensures proper verification before completion

---

## 📊 Deployment Checklist

Use this checklist for every edge function deployment:

- [ ] Code changes made and saved
- [ ] Deployment command executed
- [ ] Timestamp recorded
- [ ] 3-minute timer started
- [ ] Timer completed (full 3 minutes)
- [ ] Function logs checked
- [ ] Console.log output verified
- [ ] Test request sent
- [ ] Expected behavior confirmed
- [ ] Success reported to user

---

## 🐛 Troubleshooting

**Problem:** Frontend sees old code after deployment
**Solution:** Wait full 3 minutes, clear browser cache, check logs

**Problem:** Logs show old console.log output
**Solution:** Deployment not fully propagated, wait another 2 minutes

**Problem:** Multiple versions running simultaneously
**Solution:** Normal during rollout, wait for propagation to complete

**Problem:** Changes work locally but not in deployed version
**Solution:** Verify local file matches what was deployed, redeploy if needed

---

## 🎯 Why This Protocol Exists

**Real Example:** During coach video implementation, we updated image mappings from `coach_nora.png` to `human-coach-nora.png`. The deployment appeared successful, but the frontend was still seeing the old filenames.

**Root Cause:** Supabase's edge function cache was serving the old version for 3 minutes after deployment.

**Solution:** This protocol ensures we always wait for cache invalidation before reporting success.

---

## 📝 Related Documentation

- **Project CLAUDE.md:** Lines 16-56 contain deployment protocol
- **Edge Function Code:** `supabase/functions/generate-coach-video/index.ts`
- **Deployment Logs:** Check Supabase dashboard after each deployment
- **Helper Script:** `deploy-and-verify-edge-function.sh`

---

**Last Updated:** November 12, 2025
**Version:** 1.0
**Status:** Active Protocol

# 🗄️ Database Migration - Step-by-Step

## ⚠️ IMPORTANT: You Must Do This First

The metabolic adaptation system **will not work** until you run this migration in Supabase.

---

## 📋 Instructions (5 minutes)

### 1. Open Supabase Dashboard
- Go to https://supabase.com/dashboard
- Select your MindFork project

### 2. Open SQL Editor
- Left sidebar → "SQL Editor"
- Click "New Query"

### 3. Copy Migration SQL
- Open file: `database/migrations/metabolic_adaptation_schema.sql`
- Copy ALL contents (Ctrl/Cmd + A, then Ctrl/Cmd + C)

### 4. Paste and Run
- Paste into SQL Editor
- Click "Run" (or press Ctrl/Cmd + Enter)
- Wait ~5 seconds for completion

### 5. Verify Tables Created

Run this verification query:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('metabolic_tracking', 'metabolic_adaptations');

-- Should return 2 rows:
-- metabolic_tracking
-- metabolic_adaptations
```

Expected output:
```
table_name
-------------------
metabolic_tracking
metabolic_adaptations
```

### 6. Test View

```sql
-- Check if view was created
SELECT * FROM user_metabolic_summary LIMIT 1;

-- Should return empty result (no data yet) but NO ERROR
```

---

## ✅ Success Indicators

You'll know it worked if:
1. ✅ No red error messages in SQL Editor
2. ✅ Query completes with "Success. No rows returned" or similar
3. ✅ Verification queries show 2 tables exist

---

## ❌ Troubleshooting

### Error: "relation already exists"
**Solution:** Tables already created! You're good to go.

### Error: "insufficient privilege"
**Solution:** Make sure you're using the correct project. Check project name in top-left.

### Error: "function gen_random_uuid() does not exist"
**Solution:** Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

Then run the full migration again.

---

## 🎉 Next Steps

Once migration is complete:
1. ✅ Test the service in DevTools
2. ✅ Add MetabolicTrendCard to dashboard
3. ✅ Integrate food/weight logging

**Migration file location:** `database/migrations/metabolic_adaptation_schema.sql`

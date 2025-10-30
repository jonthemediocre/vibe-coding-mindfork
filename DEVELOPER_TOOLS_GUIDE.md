# Developer Tools - Quick Start Guide

## What I've Added

I created a **Developer Tools** screen that you can access directly from your app to reset your onboarding status without needing to run SQL commands manually.

## How to Access

1. Open the app
2. Go to the **Settings** tab (bottom right)
3. Tap **"Developer Tools"** button
4. Tap **"Reset Onboarding Status"**
5. Confirm the reset
6. The app will automatically navigate you back to onboarding

## What It Does

The Developer Tools screen provides:

✅ **Reset Onboarding Status** - Sets `onboarding_completed` to `false` so you can go through onboarding again
✅ **View Profile Data** - See your current profile information
✅ **Refresh Profile** - Manually refresh your profile from the database
✅ **Clear Cache & Sign Out** - Complete app reset

## Why This Works

The reset function uses your **authenticated session** to update the database, which should have the proper permissions through Row Level Security (RLS) policies. This is safer and easier than running SQL commands manually in the Supabase dashboard.

## Files Created

- `/src/screens/DevToolsScreen.tsx` - The developer tools UI
- `/src/navigation/SettingsStackNavigator.tsx` - Navigation stack for Settings → DevTools
- This guide

## Files Modified

- `/src/screens/profile/SettingsScreen.tsx` - Added "Developer Tools" button
- `/src/navigation/TabNavigator.tsx` - Updated Settings tab to use stack navigator

## Next Steps for You

1. **Reset Your Onboarding**: Open the app → Settings → Developer Tools → Reset Onboarding Status
2. **Complete Onboarding Properly**: Chat with Synapse and answer all questions
3. **Get Your Photo Modal**: After onboarding completes, you'll see the photo options
4. **Create Your Welcome Image**: Take a photo, upload one, or stay anonymous

## If Reset Fails Due to RLS

If the in-app reset fails with a permissions error, you'll need to run the SQL manually:

```sql
UPDATE profiles
SET onboarding_completed = false
WHERE user_id = 'a05eda94-c358-4a0d-aa42-9627989c51a9';
```

Run this in your Supabase dashboard → SQL Editor.

## Security Note

The SECURITY DEFINER vulnerability in `food_analysis_slo_metrics` view still needs to be fixed manually using the SQL scripts:
- `FIX_SECURITY_DEFINER.sql`
- `SECURITY_FIX_INSTRUCTIONS.md`

---

**Need Help?** Check the logs in the LOGS tab of your Vibecode app, or check `expo.log` file.

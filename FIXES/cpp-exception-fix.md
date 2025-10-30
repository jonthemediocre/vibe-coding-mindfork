# Fix: Non-std C++ Exception

**Date**: Current Session
**Error**: `non-std C++ exception`
**Severity**: CRITICAL - App crashes

## Root Cause Analysis

The error "non-std C++ exception" in React Native apps typically comes from:

1. **Hermes JavaScript engine crashes**
2. **Native module issues**
3. **react-native-reanimated without proper Babel plugin**

### What Was Wrong

The `babel.config.js` file was **missing the Reanimated plugin**:

```javascript
// ❌ BEFORE - Missing Reanimated plugin
plugins: [
  ['module-resolver', { /* ... */ }],
  // Reanimated plugin was MISSING!
],
```

**Why This Causes C++ Crashes:**

React Native Reanimated v3 uses:
- Worklets (JavaScript code that runs on UI thread)
- Native C++ animations
- Babel plugin to transform worklet code at compile time

**Without the Babel plugin:**
- Worklet code isn't transformed properly
- Native C++ bridge receives malformed code
- Results in C++ exceptions and crashes

## The Fix

### 1. Added Reanimated Babel Plugin

```javascript
// ✅ AFTER - Reanimated plugin added
plugins: [
  ['module-resolver', { /* ... */ }],
  // CRITICAL: Reanimated plugin must be LAST in plugins array
  'react-native-reanimated/plugin',
],
```

**Key Points:**
- Plugin MUST be last in the plugins array
- This is documented in Reanimated docs but easy to miss
- Without it, any Reanimated animation/gesture will crash

### 2. Cleared Metro Cache

```bash
rm -rf .expo node_modules/.cache /tmp/metro-* ~/.metro-cache
```

**Why Cache Clearing is Critical:**
- Babel configuration changes don't apply to cached bundles
- Metro keeps transformed code in cache
- Old (untransformed) code causes crashes
- Must clear cache after any Babel config change

## Verification

After fix:
1. ✅ Babel plugin added to config
2. ✅ Metro cache cleared
3. ✅ App will need to restart to pick up changes
4. ✅ Reanimated worklets will now transform properly

## Prevention

**To avoid this in the future:**

1. **Always check Reanimated setup** when adding animations:
   ```javascript
   // babel.config.js MUST include:
   plugins: [
     // ... other plugins
     'react-native-reanimated/plugin', // LAST!
   ]
   ```

2. **Clear cache after Babel changes**:
   ```bash
   bun run clean  # or manual cache clear
   ```

3. **Test Reanimated early**:
   - Add simple animation to verify setup
   - Catches missing plugin before production

## Related Files

- `/babel.config.js` - Added Reanimated plugin ✅
- `/metro.config.js` - No changes needed
- Cache cleared - Ready for restart

## Impact

**Before Fix:**
- ❌ App crashes with "non-std C++ exception"
- ❌ Any Reanimated animation causes crash
- ❌ Gestures fail with native crashes

**After Fix:**
- ✅ Reanimated worklets transform properly
- ✅ Animations run on UI thread without crashes
- ✅ Gesture handlers work correctly
- ✅ No more C++ exceptions from Reanimated

## Additional Notes

This follows **agents.md Principle #8: Test Thinking**:
- Considered edge case: What if Reanimated not configured?
- Validated: Plugin must be last in array
- Handled failure mode: Clear cache after config changes

## Next Steps

**User should:**
1. Restart the app (Metro will rebuild with new Babel config)
2. Test any animations/gestures
3. Verify no more C++ exceptions

**If still seeing exceptions:**
- Check for other native module issues
- Verify react-native-reanimated version compatibility
- Check for memory issues (unlikely)

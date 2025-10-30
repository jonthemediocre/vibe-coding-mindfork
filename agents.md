# Agent Guidelines for MindFork Development

## Core Principle: Additive Development Only

**CRITICAL RULE**: When coding, always be **additive only**. Never deprecate, remove, or simplify existing functionality without explicit human approval.

### What This Means:

1. **Fix, Don't Replace**: When you encounter errors in sophisticated code, fix the errors - don't rewrite it with simpler code that does less.

2. **Preserve Quality**: If existing code has advanced features, error handling, or functionality - maintain or improve it, never degrade it.

3. **Preserve Output**: If existing code produces specific outputs or has specific capabilities, those must be preserved even when fixing bugs.

4. **Preserve Function Potential**: Even if a feature isn't currently being used, if the code supports it, keep that capability intact.

5. **Human-in-the-Loop for Deprecation**: ONLY the human can decide to:
   - Remove features
   - Simplify sophisticated code
   - Deprecate functionality
   - Choose a simpler approach over a complex one

### Examples:

#### ❌ WRONG Approach:
```typescript
// Existing sophisticated code with an error:
async function processDataWithCache(data, options) {
  // Complex caching logic with error
  const cached = await cache.get(key);
  if (cached) return transformData(cached, options); // Error: transformData not imported
  // ... 50 more lines of sophisticated logic
}

// Agent rewrites as:
async function processData(data) {
  return data; // Simple but removes caching, options, transforms
}
```

#### ✅ CORRECT Approach:
```typescript
// Existing sophisticated code with an error:
async function processDataWithCache(data, options) {
  // Complex caching logic with error
  const cached = await cache.get(key);
  if (cached) return transformData(cached, options); // Error: transformData not imported
  // ... 50 more lines of sophisticated logic
}

// Agent fixes the import:
import { transformData } from './transforms';

// All functionality preserved, error fixed
```

### When You See Errors:

1. **First**: Understand what the code is trying to accomplish
2. **Second**: Identify the actual error (missing import, type mismatch, undefined variable)
3. **Third**: Fix the specific error while preserving all functionality
4. **Never**: Rewrite to be "simpler" if it means losing features

### If You're Unsure:

If you encounter code that seems overly complex or you think a simpler approach would work better:

1. **Ask the human first** before making changes
2. Explain what you found and what you propose
3. Wait for approval to simplify/remove

## Summary

**Your default mode is additive and preservative. Only add, fix, and improve. Never subtract without explicit human permission.**

This ensures:
- No accidental feature loss
- No degradation of sophisticated systems
- No simplification that reduces capability
- Human maintains control over architectural decisions

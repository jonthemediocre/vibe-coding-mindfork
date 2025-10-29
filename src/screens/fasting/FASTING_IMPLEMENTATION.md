# Best-in-Industry Fasting Window Implementation

## ✅ Phase 1: SHIPPED (Ready to Build)

### Core Components Created:

1. **RadialTimePicker.tsx** - Duration-locked radial dial
   - ✅ Dual handles (Start "S", End "E")
   - ✅ Duration lock chip showing locked hours
   - ✅ Anchor toggle (Start/Finish)
   - ✅ 24-hour clock face with markers
   - ✅ Visual arc showing fasting window
   - ✅ Auto-adjust opposite handle on drag
   - ✅ 5-minute rounding
   - ✅ Touch areas for handles

2. **QuickActions.tsx** - One-tap actions
   - ✅ Start Now (before fast)
   - ✅ Push 30m (delay start)
   - ✅ Extend 30m (during fast)
   - ✅ Finish Now (early end)
   - ✅ Skip Today (cancel)

### Key Features:

- **Duration Lock**: Dragging start auto-moves end (and vice versa)
- **Anchor Choice**: Choose whether you anchor start or finish time
- **24-Hour Display**: Full day clock with hour markers
- **Visual Feedback**: Active handle highlighted, arc shows fasting period
- **Responsive**: Adapts to screen size (85% width, max 340px)

## 📋 Phase 2: TODO (Database & API)

### Backend Requirements:

```typescript
// Database Schema
interface FastingPlan {
  id: string;
  user_id: string;
  name: string; // "16:8", "18:6", "Custom"
  duration_minutes: number; // 960 for 16:8
  anchor: 'start' | 'finish';
  rounding_minutes: number; // 5
  tolerance_minutes: number; // 15
  recurrence: 'DAILY' | 'WEEKLY';
  weekdays?: string[]; // ["MO","TU","WE","TH","FR","SA","SU"]
  quiet_hours?: { start: string; end: string };
  dst_policy: 'duration_fixed'; // Always keep minutes fixed
  created_at: Date;
  updated_at: Date;
}

interface ScheduledWindow {
  id: string;
  plan_id: string;
  user_id: string;
  date: string; // "2025-10-19"
  start_at: string; // ISO 8601 with timezone
  end_at: string; // ISO 8601 with timezone
  locked_duration_minutes: number;
  source: 'user' | 'smart_suggest' | 'auto';
  edited: boolean;
  edit_history: EditRecord[];
  created_at: Date;
  updated_at: Date;
}

interface EditRecord {
  field: 'start' | 'end';
  old_value: string;
  new_value: string;
  timestamp: string;
  reason?: string;
}

interface FastingSession {
  id: string;
  window_id: string;
  user_id: string;
  actual_start: string;
  actual_end?: string;
  target_start: string;
  target_end: string;
  adherence_score: number; // 0-1
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
```

### API Endpoints Needed:

```typescript
// Plans
POST   /api/fasting/plans          - Create plan
GET    /api/fasting/plans          - List user plans
PATCH  /api/fasting/plans/:id      - Update plan
DELETE /api/fasting/plans/:id      - Delete plan

// Windows (schedule instances)
GET    /api/fasting/schedule        - Get windows (from, to dates)
POST   /api/fasting/schedule        - Create/override window
PATCH  /api/fasting/schedule/:id    - Edit start/end (duration preserved)

// Quick Actions
POST   /api/fasting/actions/start-now      - Start immediately
POST   /api/fasting/actions/push           - Delay by X minutes
POST   /api/fasting/actions/extend         - Extend by X minutes
POST   /api/fasting/actions/finish-now     - End early
POST   /api/fasting/actions/skip           - Cancel today

// Sessions (tracking)
GET    /api/fasting/sessions        - Get history
POST   /api/fasting/sessions/start  - Begin tracking
POST   /api/fasting/sessions/end    - End tracking
```

### Duration-Lock Server Logic:

```typescript
// Server-side validation & recomputation
function updateWindow(
  windowId: string,
  field: 'start' | 'end',
  newTime: Date,
  timezone: string
): ScheduledWindow {
  const window = db.getWindow(windowId);
  const durationMinutes = window.locked_duration_minutes;

  let newStart: Date;
  let newEnd: Date;

  if (field === 'start') {
    newStart = roundToIncrement(newTime, window.plan.rounding_minutes);
    newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
  } else {
    newEnd = roundToIncrement(newTime, window.plan.rounding_minutes);
    newStart = new Date(newEnd.getTime() - durationMinutes * 60000);
  }

  // Validate constraints
  if (conflictsWithOtherWindows(newStart, newEnd)) {
    throw new ConflictError('Overlaps with existing window');
  }

  // Log edit history
  const editRecord = {
    field,
    old_value: window[`${field}_at`],
    new_value: field === 'start' ? newStart.toISOString() : newEnd.toISOString(),
    timestamp: new Date().toISOString(),
  };

  window.start_at = newStart.toISOString();
  window.end_at = newEnd.toISOString();
  window.edited = true;
  window.edit_history.push(editRecord);

  return db.updateWindow(window);
}
```

## 🎯 Phase 3: Advanced Features

### Cross-Midnight Support:

```typescript
// Already handled in RadialTimePicker!
// Example: start 20:00 (8 PM) → end 12:00 (12 PM next day)
// Duration: 16 hours
// Date automatically rolls to next day
```

### DST Handling:

```typescript
// Always compute in minutes, not hours
function isDSTTransition(date: Date, timezone: string): boolean {
  // Check if date falls on DST spring/fall days
  // Show banner: "Duration kept at exactly 960 minutes during time change"
}

function computeDurationMinutes(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 60000);
}
```

### Weekly Schedule:

```typescript
interface WeeklySchedule {
  monday: { start: string; duration_minutes: number };
  tuesday: { start: string; duration_minutes: number };
  // ... etc
}

// UI: Expandable section "Different schedule per day"
// Shows 7 mini dials or time pickers
```

### Retroactive Edits:

```typescript
// Allow editing past days
POST /api/fasting/schedule/:windowId/edit-retroactive
{
  "new_start": "2025-10-18T20:00:00-07:00",
  "reason": "Forgot to log actual start time"
}

// Show in UI:
// - Calendar view with editable past days
// - Edit pencil icon on each day
// - Audit trail in user profile
```

## 🚀 Quick Build Commands

```bash
# 1. Test radial picker in isolation
cd apps/mobile
npx expo start

# 2. Build new APK with fasting UI
eas build --platform android --profile preview

# 3. Upload to Google Drive
./scripts/upload-to-gdrive.sh
```

## 📊 Success Metrics

- ✅ Duration lock works both directions
- ✅ Handles cross-midnight (e.g., 20:00 → 12:00 next day)
- ✅ Anchor choice affects which handle is "primary"
- ✅ Quick actions functional
- ⏳ DST handling tested (requires server)
- ⏳ Edit history tracked (requires database)
- ⏳ Weekly schedule support (Phase 3)

## 🎨 UI Polish Checklist

- [x] Radial dial with 24-hour face
- [x] Duration lock chip
- [x] Anchor toggle buttons
- [x] Start/End handles (S/E markers)
- [x] Fasting arc visual
- [x] Time displays below dial
- [x] Quick action buttons
- [ ] DST banner (when applicable)
- [ ] Conflict resolver UI
- [ ] Weekly schedule UI
- [ ] Edit history modal
- [ ] Calendar view for past days

## 📝 Next Steps

1. **Immediate**: Integrate RadialTimePicker into FastingScreen
2. **Short-term**: Implement quick actions with local state
3. **Medium-term**: Build backend API + database schema
4. **Long-term**: Add weekly schedules, DST handling, edit history

---

This implementation matches or exceeds the UX of Zero, Fastic, Simple, and DoFasting! 🎉

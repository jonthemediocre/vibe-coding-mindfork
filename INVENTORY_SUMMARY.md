# MindFork App - Codebase Inventory Summary

**Generated:** 2025-11-02
**Location:** `/home/user/workspace/`
**Files Generated:** 
- `CODEBASE_INVENTORY.md` (Complete component/service mapping)
- `AUDIT_NOTES.md` (Bug and TypeScript issues)
- `INVENTORY_SUMMARY.md` (This file)

---

## Quick Statistics

### Code Organization
- **Total TypeScript/TSX Files:** 160+
- **Screen Components:** 25+
- **Reusable Components:** 60+
- **Service Files:** 45+
- **Custom Hooks:** 12+
- **API Service Files:** 6
- **Utility Files:** 15+

### Directory Breakdown
```
src/
├── screens/                 (25+ files)
├── components/              (60+ files, organized by feature)
├── services/                (45+ files)
├── hooks/                   (12+ files)
├── api/                     (6 files - LLM integrations)
├── contexts/                (3 files)
├── navigation/              (5 files)
├── types/                   (9+ files)
├── utils/                   (15+ files)
├── ui/                      (8+ files - design system)
├── lib/                     (1 file - Supabase)
├── config/                  (3 files)
├── data/                    (3 files - mock data)
└── __tests__/               (8+ files - tests)
```

---

## Key Features Inventory

### 1. Authentication & Onboarding
- Email/Password authentication (SignInScreen.tsx)
- Multi-step onboarding wizard (OnboardingScreen.tsx)
- Conversational AI onboarding (ConversationalOnboardingScreen.tsx)
- Secure session management (AuthContext.tsx)
- SecureStore integration for sensitive data

### 2. Food Tracking
- Food entry logging with search
- Barcode scanning capability
- AI-powered food image analysis (Vision API)
- USDA food database integration
- Food classification and tagging
- Nutrition macronutrient tracking

### 3. Health Tracking
- Weight logging and trend visualization
- Fasting timer with window management
- Step counter integration (expo-sensors)
- Interactive timeline visualization
- Metabolic adaptation detection

### 4. AI Coach System
- Multiple AI coach personalities
- Real-time chat with streaming responses
- Voice call support (VoiceCallService)
- SMS messaging support (SMSService)
- Personalized context from user data
- Coach marketplace with reviews/ratings

### 5. Meal Planning
- Create and manage meal plans
- Recipe browsing and selection
- Draggable meal slots
- Shopping list generation
- Meal template saving

### 6. Dashboard & Analytics
- Personalized dashboard with multiple cards
- Progress visualization (rings, charts)
- Weekly/monthly summaries
- Nutrition trend analysis
- Achievement tracking

### 7. Subscription & Marketplace
- Coach marketplace with filtering
- Subscription plans comparison
- Payment method management
- Invoice tracking
- Trial management

### 8. Social & Viral Features
- Progress card creation and sharing
- Wisdom/tips cards
- Viral content optimization (RL)
- Nano-banana video editor
- Referral program

### 9. Developer Tools
- Onboarding reset utilities
- AI coach testing
- Food analyzer testing
- Continuous improvement tracking
- Metabolic adaptation testing

---

## Technology Stack

### Core Framework
- **React Native:** 0.76.7
- **Expo:** SDK 53
- **TypeScript:** Latest

### UI & Styling
- **Nativewind:** Tailwind CSS for React Native
- **Tailwind CSS:** v3
- **Ionicons:** From @expo/vector-icons

### Navigation
- **React Navigation:** Native Stack, Bottom Tabs, Drawer, Material Top Tabs

### State Management
- **React Context:** AuthContext, ProfileContext
- **AsyncStorage:** For persistence
- **SecureStore:** For sensitive data
- **Zustand:** Example store (rootStore.example.ts)

### Backend
- **Supabase:** PostgreSQL database + Auth
- **Row Level Security:** For data protection

### APIs & AI
- **OpenAI:** GPT-4o (text), gpt-4o-transcribe (audio), gpt-image-1 (images)
- **Anthropic:** Claude models
- **Grok:** Grok-4 reasoning model
- **ElevenLabs:** Text-to-speech

### Hardware/Device
- **expo-camera:** Photo and video capture
- **expo-sensors:** Step counting
- **expo-linear-gradient:** Background gradients

### Error Tracking
- **Sentry:** Error monitoring

---

## Database Architecture

### User Core
```
profiles
├── user_id (FK)
├── full_name
├── age, gender, height_cm, weight_kg, target_weight_kg
├── primary_goal, activity_level, diet_type
├── daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, daily_fiber_g
├── onboarding_completed, onboarding_step
└── timestamps
```

### Food Tracking
```
food_entries
├── user_id (FK)
├── date, meal_type
├── food_id (FK)
├── quantity, unit
├── calories, macros
└── timestamps

food_database
├── name, brand
├── nutrition_facts
├── barcode
└── source (USDA, custom, AI)
```

### Health Tracking
```
weight_logs -> user_id, date, weight_kg
fasting_logs -> user_id, start_time, end_time, duration_hours
step_tracking -> user_id, date, step_count
```

### Coach System
```
coaches
├── id, name, personality, expertise
├── level, is_active
└── pricing

coach_conversations
├── user_id, coach_id, timestamp
├── messages (text)
└── context
```

### Goals & Progress
```
goals -> user_id, goal_type, target_value, deadline, is_active
goal_progress -> user_id, goal_id, date, progress_value
achievements -> user_id, achievement_type, date
```

### Subscriptions
```
subscriptions -> user_id, plan_id, status, current_period_end
payment_methods -> user_id, stripe_id, last_4
invoices -> user_id, subscription_id, amount, date
```

### Testing & Monitoring
```
ai_test_results -> test_name, test_date, passed, scores
ai_metrics -> metric_name, date, value
engagement_metrics -> user_id, event_type, date
```

---

## Critical Data Flows

### Authentication Flow
```
SignInScreen
  ↓ signIn/signUp
AuthContext (useAuth)
  ↓
Supabase Auth
  ↓ Session stored in SecureStore
AuthNavigator
  ↓ Route to Main or Onboarding
```

### Food Logging Flow
```
FoodScreen
  ↓ searchFoods/scanBarcode
FoodSearchService / BarcodeScanner
  ↓
Food Database / USDA API / AI Vision
  ↓
FoodEntryConfirmScreen
  ↓
FoodService.logFood()
  ↓
Supabase (food_entries)
```

### Coach Interaction Flow
```
CoachScreen
  ↓ sendMessage
useAgentStream
  ↓
API Endpoint (streaming)
  ↓
LLM (OpenAI/Anthropic/Grok)
  ↓ Uses
CoachContextService
  ↓
User Profile Data / Food Logs / Goals
  ↓ Response streamed back to
CoachScreen
```

### Onboarding Flow
```
SignInScreen
  ↓ signIn
OnboardingScreen / ConversationalOnboardingScreen
  ↓ collectData
goalCalculations.calculateNutritionGoals()
  ↓
Supabase (profiles)
  ↓
ProfileContext (refreshProfile)
  ↓
TabNavigator (main app)
```

---

## Security Considerations

### Authentication
- Supabase Auth with email/password
- Secure token storage in SecureStore
- Session expiration checking
- OAuth/Social login ready

### Data Protection
- HIPAA-compliance utilities (hipaaCompliance.ts)
- Privacy compliance utilities (privacyCompliance.ts)
- Secure storage migration (secureStorage.ts)
- Row Level Security (RLS) on Supabase tables

### API Security
- API interceptor logging
- Error handling with rate limit detection
- Timeout handling (30s default)
- Webhook signature verification

### Sensitive Data
- Images from food scanning
- Weight/health metrics
- Nutritional preferences
- Coach conversation history

---

## Performance Considerations

### Components
- PersonalizedDashboard.tsx - Multiple metric cards, potential memoization issues
- WeightProgressChart.tsx - Large datasets, consider virtualization
- CoachScreen.tsx - Streaming responses, potential UI blocking

### Database
- Large tables need indexes on: user_id, created_at
- Food search may need caching
- Consider partitioning old data

### API
- Food database queries may be slow
- Image analysis takes time (Vision API)
- USDA API rate limits

---

## Testing Infrastructure

### Available Test Suites
- CoachTestingService - Full coach quality testing
- FoodAnalyzerTestingService - Food analyzer accuracy
- ContinuousImprovementService - Daily regression tests

### Accessing Tests
- Via DevToolsScreen.tsx
- Requires database migration: `database/migrations/ai_testing_schema.sql`
- 30-60 seconds per test suite

### Test Coverage
- AI coach safety, personality, goal alignment
- Food analyzer calorie/macro accuracy, allergen detection
- 30-day trend analysis

---

## Known Limitations

### Device Support
- iOS optimized (per CLAUDE.md)
- React Native limitations apply

### API Limits
- OpenAI rate limits (API key specific)
- USDA database query limits
- Streaming timeout 30 seconds

### Data Constraints
- Metabolic adaptation requires 3+ weeks data
- Step counter requires device support
- Camera requires permissions

### Feature Limitations
- Barcode scanning accuracy depends on database
- Food image analysis accuracy varies with image quality
- Coach personality limited to predefined personas

---

## Development Notes

### Environment Setup
```
.env (not version controlled):
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GROK_API_KEY=...
```

### Running Tests
```bash
# In DevToolsScreen
- Test AI Coaches
- Test Food Analyzer
- Run Full Daily Tests
- View 30-Day Trends
- Test Metabolic Adaptation
```

### Building/Deploying
- Uses bun (not npm)
- Expo development server on port 8081
- See app.json for build config

---

## Audit Priority Matrix

### High Priority (Critical Issues)
1. Alert.alert() usage - 3 screens
2. Camera deprecation warning
3. HIPAA compliance verification
4. useAgentStream cleanup
5. Type assertion cleanup

### Medium Priority (Important)
1. console.log removal
2. Error boundary addition
3. Goal calculation edge cases
4. Zustand pattern verification
5. Database indexes

### Low Priority (Nice to have)
1. Performance optimization
2. String literal apostrophe rule
3. RLS documentation
4. Additional test coverage

---

## Files for Systematic Audit

### Start Here (High Impact)
1. `/home/user/workspace/src/contexts/AuthContext.tsx` - Session management
2. `/home/user/workspace/src/services/AIFoodScanService.ts` - HIPAA concerns
3. `/home/user/workspace/src/screens/DevToolsScreen.tsx` - Alert usage
4. `/home/user/workspace/src/hooks/useAgentStream.ts` - Memory leaks

### Then Review (Feature Areas)
- Food tracking: `src/services/FoodService.ts`, `src/components/food/*`
- Coach system: `src/screens/coach/CoachScreen.tsx`, `src/services/CoachContextService.ts`
- Health tracking: `src/screens/fasting/`, `src/screens/dashboard/`
- Subscriptions: `src/screens/subscription/`, `src/components/subscription/`

### Finally Check (Utilities)
- Error handling: `src/utils/error-handling.ts`
- Type safety: `src/types/supabase/database.generated.ts`
- Security: `src/utils/secureStorage.ts`
- Performance: `src/utils/performance.ts`

---

## Quick Reference

### Most Complex Screens
1. PersonalizedDashboard (many sub-components)
2. CoachScreen (streaming, real-time)
3. OnboardingScreen (multi-step flow)

### Most Critical Services
1. ProfileService (user data)
2. CoachContextService (LLM context)
3. FoodService (main tracking)

### Most Used Hooks
1. useCoachContext
2. useAgentStream
3. useFoodTracking

### Critical Utilities
1. goalCalculations
2. secureStorage
3. logger

---

## Additional Documentation

- **CODEBASE_INVENTORY.md** - Complete file-by-file inventory with purposes, dependencies, database interactions
- **AUDIT_NOTES.md** - Detailed issues, severity levels, recommendations, action items checklist

---

**End of Summary**

For complete details, refer to CODEBASE_INVENTORY.md and AUDIT_NOTES.md

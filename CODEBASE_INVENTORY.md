# Complete Codebase Inventory - MindFork App

**Generated:** 2025-11-02
**Framework:** Expo SDK 53 with React Native 0.76.7
**State Management:** Zustand (mentioned in config) + AsyncStorage
**UI Framework:** Nativewind + Tailwind v3

---

## Table of Contents
1. [Screen Components](#screen-components)
2. [Reusable Components](#reusable-components)
3. [Service Files](#service-files)
4. [Hooks](#hooks)
5. [API Services](#api-services)
6. [State Management](#state-management)
7. [Navigation](#navigation)
8. [Contexts](#contexts)
9. [Utilities & Helpers](#utilities--helpers)
10. [Type Definitions](#type-definitions)
11. [UI Components](#ui-components)

---

## Screen Components

### Auth Screens
**Location:** `/home/user/workspace/src/screens/auth/`

| File | Purpose | Key Dependencies |
|------|---------|------------------|
| `SignInScreen.tsx` | User authentication interface with sign-in/sign-up forms, email/password fields, and theme toggle | `useAuth()`, `useTheme()`, `LinearGradient`, `ThemeToggle` |
| `OnboardingScreen.tsx` | Multi-step onboarding flow (welcome, basics, metrics, goals, activity, diet) that calculates nutrition goals and saves to Supabase | `useAuth()`, `goalCalculations`, `supabase` |
| `ConversationalOnboardingScreen.tsx` | AI-driven conversational onboarding using agent streaming | `useAgentStream()` |

### Dashboard & Home Screens
**Location:** `/home/user/workspace/src/screens/dashboard/` & `/home/user/workspace/src/screens/`

| File | Purpose | Key Dependencies |
|------|---------|------------------|
| `DashboardScreen.tsx` | Main dashboard showing personalized health data, loading states, and navigation | `PersonalizedDashboard`, `useProfile()` |
| `DevToolsScreen.tsx` | Developer utilities for debugging (reset onboarding, clear cache, run AI tests) | `useAuth()`, `useProfile()`, `supabase`, `CoachTestingService`, `FoodAnalyzerTestingService` |

### Food Tracking Screens
**Location:** `/home/user/workspace/src/screens/food/`

| File | Purpose | Key Dependencies |
|------|---------|------------------|
| `FoodScreen.tsx` | Food entry interface with search and quick logging | `useFoodTracking()`, `useFoodSearch()` |
| `FoodScreenEnhanced.tsx` | Enhanced version with additional features | TBD |
| `FoodEntryConfirmScreen.tsx` | Confirmation screen for food entries with macro/calorie display | `FoodService` |

### Fasting Screens
**Location:** `/home/user/workspace/src/screens/fasting/`

| File | Purpose | Key Dependencies |
|------|---------|------------------|
| `FastingScreen.tsx` | Main fasting timer interface with countdown and tracking | `useFastingTimer()` |
| `FastingScreenNew.tsx` | Updated version of fasting screen | TBD |

### Coach Screens
**Location:** `/home/user/workspace/src/screens/coach/`

| File | Purpose | Key Dependencies |
|------|---------|------------------|
| `CoachScreen.tsx` | Main AI coach chat interface with coach selection, personalized context, streaming responses | `useAgentStream()`, `useCoachContext()`, `useCoachInsights()`, `supabase` |
| `VoiceCoachScreen.tsx` | Voice-based coach interaction with audio streaming | `useAgentStream()` |
| `CoachCallScreen.tsx` | Phone call interface with coach | `VoiceCallService` |
| `CoachSMSScreen.tsx` | SMS messaging with coach | `SMSService` |
| `ScenarioTestScreen.tsx` | Testing interface for coach scenarios | TBD |
| `VoiceCoach.types.ts` | Type definitions for voice coach | N/A |

### Goals & Tracking Screens
**Location:** `/home/user/workspace/src/screens/goals/`

| File | Purpose | Key Dependencies |
|------|---------|------------------|
| `GoalsScreen.tsx` | User goals display and management | `useGoals()` |
| `CreateGoalModal.tsx` | Modal for creating new goals | TBD |

### Marketplace & Subscription Screens
**Location:** `/home/user/workspace/src/screens/marketplace/` & `/home/user/workspace/src/screens/subscription/`

| File | Purpose | Key Dependencies |
|------|---------|------------------|
| `CoachMarketplaceScreen.tsx` | Browse and purchase AI coaches | `useCoachMarketplace()` |
| `SubscriptionScreen.tsx` | Subscription management and payment | `useSubscription()`, `SubscriptionService` |

### Profile & Settings Screens
**Location:** `/home/user/workspace/src/screens/profile/`

| File | Purpose | Key Dependencies |
|------|---------|------------------|
| `ProfileScreen.tsx` | User profile display and editing | `useProfile()` |
| `SettingsScreen.tsx` | App settings and preferences | `useAuth()`, `useProfile()` |
| `DevLogScreen.tsx` | Development logging interface | TBD |
| `PhoneOnboardingScreen.tsx` | Phone-specific onboarding flow | TBD |

### Meal Planning & Social Screens
**Location:** `/home/user/workspace/src/screens/meal-planning/` & `/home/user/workspace/src/screens/social/` & `/home/user/workspace/src/screens/meals/`

| File | Purpose | Key Dependencies |
|------|---------|------------------|
| `MealPlanningScreen.tsx` | Meal plan creation and management | `useMealPlanning()` |
| `SocialScreen.tsx` | Social features and sharing | Social components |
| `MealsScreen.tsx` | View and manage meals | TBD |
| `ShareableImageScreen.tsx` | Create and share progress images | `ProgressCardCreator` |

### Analytics Screen
**Location:** `/home/user/workspace/src/screens/analytics/`

| File | Purpose | Key Dependencies |
|------|---------|------------------|
| `AnalyticsScreen.tsx` | View analytics and trends | `useProfile()` |

---

## Reusable Components

### Dashboard Components
**Location:** `/home/user/workspace/src/components/dashboard/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `PersonalizedDashboard.tsx` | Main dashboard container with multiple metric cards | Reads: profiles, food_entries, weight_logs, achievements |
| `ProgressRing.tsx` | Circular progress visualization for calories, macros | Display only (no DB writes) |
| `NutritionProgressCard.tsx` | Shows daily nutrition progress | Reads: user goals, food_entries |
| `WeightProgressChart.tsx` | Line chart visualization of weight trends | Reads: weight_logs |
| `WeeklySummaryCard.tsx` | Weekly summary of metrics | Reads: food_entries, weight_logs |
| `MetabolicTrendCard.tsx` | Displays metabolic adaptation trends | Reads: weight_logs, food_entries |
| `StepCounterCard.tsx` | Shows step count and activity | Reads: step_tracking data |

### Food Components
**Location:** `/home/user/workspace/src/components/food/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `ColorCodedFoodCard.tsx` | Food item display with nutritional color coding | Display only |
| `FoodSearchBar.tsx` | Search interface for food items | Reads: food database (USDA) |
| `BarcodeScanner.tsx` | Barcode scanning for food identification | Reads: barcode database via API |

### Fasting Components
**Location:** `/home/user/workspace/src/components/fasting/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `CircularFastingDial.tsx` | Circular interface for fasting window selection | Display only |
| `RadialTimePicker.tsx` | Time picker with radial interface | Display only |
| `QuickActions.tsx` | Quick action buttons for fasting | May write: fasting_logs |
| `InteractiveTimeline.tsx` | Timeline visualization of fasting/eating windows | Reads: fasting_logs |

### Marketplace Components
**Location:** `/home/user/workspace/src/components/marketplace/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `CoachCard.tsx` | Individual coach display with stats | Reads: coaches table |
| `CoachDetailsModal.tsx` | Detailed coach information modal | Reads: coaches, reviews |
| `PurchaseModal.tsx` | Coach purchase/subscription modal | Writes: purchases, subscriptions |
| `RatingModal.tsx` | Coach rating interface | Writes: coach_reviews |
| `ReviewList.tsx` | Coach reviews display | Reads: coach_reviews |
| `SearchBar.tsx` | Search coaches by name/specialty | Reads: coaches table |
| `CategoryFilter.tsx` | Filter coaches by category | Display only |
| `TrialBanner.tsx` | Trial offer banner | Display only |

### Meal Planning Components
**Location:** `/home/user/workspace/src/components/meal-planning/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `MealSlot.tsx` | Individual meal display and editing | Reads: meals, recipes |
| `RecipeBrowser.tsx` | Browse and select recipes | Reads: recipes table |
| `MealTemplateModal.tsx` | Save/load meal plan templates | Reads/Writes: meal_templates |
| `CalendarView.tsx` | Week/month view of meal plans | Reads: meal_plans |
| `ShoppingListView.tsx` | Generate and view shopping list | Reads: meal_plans, ingredients |
| `DraggableFoodItem.tsx` | Draggable food item for meal planning | Display only |

### Subscription Components
**Location:** `/home/user/workspace/src/components/subscription/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `PlanCard.tsx` | Individual subscription plan card | Reads: subscription_plans |
| `PlanComparison.tsx` | Compare subscription plans side-by-side | Reads: subscription_plans |
| `PaymentMethodCard.tsx` | Display saved payment methods | Reads: payment_methods |
| `AddPaymentMethodModal.tsx` | Add new payment method | Writes: payment_methods |
| `CancellationModal.tsx` | Cancel subscription modal | Writes: subscriptions (cancel) |
| `InvoiceList.tsx` | Display past invoices | Reads: invoices |
| `UsageProgressBar.tsx` | Show usage against plan limits | Reads: user_usage, subscriptions |

### Social/Viral Components
**Location:** `/home/user/workspace/src/components/social/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `ProgressCardCreator.tsx` | Create shareable progress cards | Reads: user profile, progress data |
| `CardTemplate.tsx` | Template designs for progress cards | Display only |
| `ShareButton.tsx` | Social media sharing button | May write: shares table |
| `WisdomCardCreator.tsx` | Create shareable wisdom/tips cards | Display only |

### Viral Components
**Location:** `/home/user/workspace/src/components/viral/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `NanoBananaVideoEditor.tsx` | Video editing for viral content | Reads: videos table |
| `ViralShareButton.tsx` | Share viral content button | May write: viral_shares |

### Voice Components
**Location:** `/home/user/workspace/src/components/voice/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `FloatingVoiceMic.tsx` | Floating microphone for voice input | Display only |
| `INTEGRATION_EXAMPLES.tsx` | Example integration code | N/A |

### Other Components
**Location:** `/home/user/workspace/src/components/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `AICoach.tsx` | AI coach display component | Reads: coach profiles |
| `CoachShowcase.tsx` | Showcase featured coaches | Reads: coaches |
| `ErrorBoundary.tsx` | Error boundary for error handling | Display only |
| `EmptyState.tsx` | Empty state placeholder | Display only |
| `PhotoCaptureModal.tsx` | Photo capture from camera | Display only |
| `PhotoOptionsModal.tsx` | Photo selection options (camera/library) | Display only |
| `ThemeToggle.tsx` | Dark/light mode toggle | May write: preferences |
| `OfflineBanner.tsx` | Show when offline | Display only |

### Privacy Components
**Location:** `/home/user/workspace/src/components/privacy/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `PrivacyNotice.tsx` | Privacy policy notice | Display only |
| `HIPAANotice.tsx` | HIPAA compliance notice | Display only |

### Onboarding Components
**Location:** `/home/user/workspace/src/components/onboarding/`

| File | Purpose | Database Interactions |
|------|---------|----------------------|
| `WellnessOnboarding.tsx` | Wellness onboarding flow | Writes: profiles, user preferences |

---

## Service Files

### Core Services
**Location:** `/home/user/workspace/src/services/`

#### Authentication & Profile
| File | Purpose | Key Methods | Database Tables |
|------|---------|-----------|-----------------|
| `ProfileService.ts` | Load, update, and manage user profiles | `loadProfile()`, `updateProfile()`, `refreshProfile()` | profiles, user_metadata |
| `ProfileUpdateService.ts` | Handle profile update operations | Updates profile data | profiles |
| `mockAuthService.ts` | Mock authentication for testing | Mock auth methods | N/A |

#### Food & Nutrition
| File | Purpose | Key Methods | Database Tables |
|------|---------|-----------|-----------------|
| `FoodService.ts` | Food entry logging and retrieval | `logFood()`, `getFoodEntries()`, `deleteFoodEntry()` | food_entries, food_database |
| `FoodSearchService.ts` | Search food database (USDA, custom) | `searchFoods()`, `getFoodDetails()` | food_database |
| `AIFoodScanService.ts` | AI-powered food image analysis | `analyzeFoodImage()`, `extractNutrition()` | Uses: OpenAI/Vision API |
| `AIFoodScanService.SECURE.ts` | Secure version of food scan service | Wrapper with security checks | Uses: OpenAI/Vision API |
| `FoodClassificationService.ts` | Classify foods by type/category | `classifyFood()`, `getCategory()` | food_categories |
| `USDAFoodDataService.ts` | Interface to USDA food database | `searchUSDA()`, `getNutritionData()` | External API (USDA) |

#### Fasting & Activity
| File | Purpose | Key Methods | Database Tables |
|------|---------|-----------|-----------------|
| `FastingService.ts` | Manage fasting windows and logs | `startFast()`, `endFast()`, `getFastingLog()` | fasting_logs |
| `StepTrackingService.ts` | Track steps and activity | `getStepCount()`, `logSteps()` | step_tracking |

#### Meal Planning
| File | Purpose | Key Methods | Database Tables |
|------|---------|-----------|-----------------|
| `MealPlanningService.ts` | Create and manage meal plans | `createMealPlan()`, `updateMealPlan()`, `getMealPlans()` | meal_plans, meals, recipes |

#### Goals & Analytics
| File | Purpose | Key Methods | Database Tables |
|------|---------|-----------|-----------------|
| `GoalsService.ts` | Manage user goals | `createGoal()`, `updateGoal()`, `getGoals()` | goals, goal_progress |
| `AIGoalEngine.ts` | AI-powered goal recommendations | `generateGoals()`, `analyzeProgress()` | Uses: LLM API |
| `AnalyticsService.ts` | Aggregate and analyze user data | `getAnalytics()`, `generateReport()` | All data tables |

#### Coach & Personalization
| File | Purpose | Key Methods | Database Tables |
|------|---------|-----------|-----------------|
| `coachService.ts` | Manage coach interactions | `getCoach()`, `sendMessage()` | coaches, coach_conversations |
| `enhancedCoachService.ts` | Enhanced coach with more features | Extended coach methods | coaches, coach_conversations |
| `CoachContextService.ts` | Build personalized coach context | `buildContext()`, `enrichPrompt()` | Reads: all user data |
| `CoachMarketplaceService.ts` | Manage coach marketplace | `getCoaches()`, `purchaseCoach()`, `reviewCoach()` | coaches, purchases, reviews |
| `marketplaceService.ts` | General marketplace operations | Marketplace methods | marketplace tables |

#### Voice & Communication
| File | Purpose | Key Methods | Database Tables |
|------|---------|-----------|-----------------|
| `VoiceCallService.ts` | Handle voice calls with coach | `initiateCall()`, `endCall()` | call_logs |
| `SMSService.ts` | Handle SMS messaging with coach | `sendSMS()`, `receiveSMS()` | sms_logs |

#### Advanced Features
| File | Purpose | Key Methods | Database Tables |
|------|---------|-----------|-----------------|
| `MetabolicAdaptationService.ts` | Detect and handle metabolic adaptation | `detectAdaptation()`, `adjustCalories()` | weight_logs, food_entries |
| `AdvancedBanditService.ts` | Multi-armed bandit algorithm for optimization | `selectOption()`, `updateRewards()` | experiment_data |
| `RoastModeService.ts` | Playful "roast" mode for coach | `generateRoast()` | Uses: LLM API |
| `NanoBananaService.ts` | Nano-influencer engagement system | TBD | N/A |
| `NanoBananaVideoService.ts` | Video generation for nano-banana content | `generateVideo()` | video_content |
| `ViralReinforcementLearning.ts` | RL for viral content optimization | `trainModel()`, `predictVirality()` | viral_metrics |
| `ViralRoastCaptureService.ts` | Capture and share viral roast content | `captureRoast()`, `shareRoast()` | viral_content |

#### Compliance & Utilities
| File | Purpose | Key Methods | Database Tables |
|------|---------|-----------|-----------------|
| `SentryService.ts` | Error tracking and monitoring | `captureException()`, `captureMessage()` | External: Sentry.io |
| `DeviceLogger.ts` | Device-level logging | `log()`, `error()`, `warn()` | local storage |
| `WebhookVerificationService.ts` | Verify webhook signatures | `verifyWebhook()` | N/A |
| `SubscriptionService.ts` | Manage subscriptions and billing | `getSubscription()`, `updateSubscription()` | subscriptions, billing |
| `OnboardingAgentService.ts` | AI agent for onboarding | `startOnboarding()`, `completeStep()` | onboarding_progress |
| `WelcomeImageService.ts` | Generate welcome/onboarding images | `generateWelcomeImage()` | Uses: Image generation API |
| `VerifiedEngagementService.ts` | Track verified user engagement | `trackEngagement()` | engagement_metrics |
| `VerifiedReferralService.ts` | Referral program management | `generateReferralCode()`, `trackReferral()` | referral_program |

### Recommendation Engine
**Location:** `/home/user/workspace/src/services/recommendations/`

| File | Purpose | Key Methods | Database Tables |
|------|---------|-----------|-----------------|
| `RecommendationService.ts` | Main recommendation engine | `getRecommendations()` | Combines all below services |
| `CompatibilityScorer.ts` | Score food/meal compatibility | `scoreCompatibility()` | user_preferences, foods |
| `MacroCalculator.ts` | Calculate macronutrient distributions | `calculateMacros()` | user_goals, nutrition_data |
| `NutrientAnalyzer.ts` | Analyze nutrient content | `analyzeNutrients()` | food_database, nutrition_data |
| `PreferenceFilter.ts` | Filter by user preferences | `filterByPreferences()` | user_preferences |

### Testing Services
**Location:** `/home/user/workspace/src/services/testing/`

| File | Purpose | Key Methods | Database Tables |
|------|---------|-----------|-----------------|
| `CoachTestingService.ts` | Test AI coach quality and safety | `runFullTestSuite()`, `testSafety()` | ai_test_results |
| `FoodAnalyzerTestingService.ts` | Test food analyzer accuracy | `runFullTestSuite()`, `testAccuracy()` | ai_test_results |
| `ContinuousImprovementService.ts` | Track and improve AI quality | `runDailyTests()`, `analyzeTrends()` | ai_metrics |

---

## Hooks

### Food & Nutrition Hooks
**Location:** `/home/user/workspace/src/hooks/`

| Hook | Purpose | Dependencies |
|------|---------|--------------|
| `useFoodTracking()` | Manage food entry logging and tracking | `FoodService`, `supabase` |
| `useFoodSearch()` | Search and autocomplete food items | `FoodSearchService` |
| `useNutritionTrends()` | Calculate and track nutrition trends | `AnalyticsService`, `supabase` |
| `useMealPlanning()` | Manage meal planning state | `MealPlanningService`, `supabase` |

### Activity & Health Hooks
| Hook | Purpose | Dependencies |
|------|---------|--------------|
| `useFastingTimer()` | Manage fasting timer state | `FastingService`, `AsyncStorage` |
| `useStepCounter()` | Track step count | `StepTrackingService`, `expo-sensors` |

### Goals & Progress Hooks
| Hook | Purpose | Dependencies |
|------|---------|--------------|
| `useGoals()` | Manage user goals | `GoalsService`, `supabase` |
| `useProgressCard()` | Manage progress card generation | `ProgressCardCreator` |

### Coach & AI Hooks
| Hook | Purpose | Dependencies |
|------|---------|--------------|
| `useCoachContext()` | Build personalized coach context | `CoachContextService`, `useProfile()` |
| `useCoachMarketplace()` | Access coach marketplace | `CoachMarketplaceService`, `supabase` |
| `useAgentStream()` | Stream responses from AI agent | `API (streaming)` |

### UI & Network Hooks
| Hook | Purpose | Dependencies |
|------|---------|--------------|
| `useOfflineDetection()` | Detect online/offline status | `NetInfo` |

---

## API Services

### LLM & AI APIs
**Location:** `/home/user/workspace/src/api/`

| File | Purpose | API Provider | Key Functions |
|------|---------|-------------|---|
| `chat-service.ts` | Unified interface for AI text responses | Multiple providers | `getAnthropicTextResponse()`, `getOpenAITextResponse()`, `getGrokTextResponse()` |
| `openai.ts` | OpenAI API client | OpenAI | GPT-4o model, image analysis |
| `anthropic.ts` | Anthropic API client | Anthropic | Claude models |
| `grok.ts` | Grok API client | Grok/xAI | Grok-4 reasoning model |

### Content Generation APIs
| File | Purpose | API Provider | Key Functions |
|------|---------|-------------|---|
| `image-generation.ts` | Generate images via API | OpenAI (gpt-image-1) | `generateImage()` - uses CURL implementation |
| `transcribe-audio.ts` | Transcribe audio to text | OpenAI (gpt-4o-transcribe) | `transcribeAudio()` - uses CURL implementation |
| `elevenlabs.ts` | Text-to-speech synthesis | ElevenLabs | `synthesizeSpeech()` |

---

## State Management

### Zustand Stores
**Location:** `/home/user/workspace/src/state/`

| File | Purpose | Persisted Data |
|------|---------|---|
| `rootStore.example.ts` | Example Zustand store configuration | Example only |

**Note:** Most state is managed via:
- React Context (`AuthContext`, `ProfileContext`)
- AsyncStorage for local persistence
- Supabase for server state

---

## Navigation

### Navigation Structure
**Location:** `/home/user/workspace/src/navigation/`

| File | Purpose | Child Routes |
|------|---------|---|
| `AuthNavigator.tsx` | Root auth/app navigation | Auth, Onboarding, Main |
| `TabNavigator.tsx` | Main app tab-based navigation | Food, Dashboard, Coach, etc. |
| `FoodStackNavigator.tsx` | Food tracking sub-navigator | Food, Food details, etc. |
| `CoachStackNavigator.tsx` | Coach sub-navigator | Coach, Voice Coach, SMS, Call |
| `SettingsStackNavigator.tsx` | Settings sub-navigator | Settings, Dev Tools, Profile |

---

## Contexts

### Global Contexts
**Location:** `/home/user/workspace/src/contexts/`

| Context | Provider | Value |
|---------|----------|-------|
| `AuthContext` | `AuthProvider` | User session, auth methods (`signIn`, `signUp`, `signOut`), loading states |
| `ProfileContext` | `ProfileProvider` | User profile data, profile methods (`loadProfile`, `updateProfile`), nutrition goals |
| `ThemeProvider` | `ThemeProvider` (app-components) | Theme colors, dark/light mode toggle |

---

## Utilities & Helpers

### Error Handling & Logging
**Location:** `/home/user/workspace/src/utils/`

| File | Purpose | Key Exports |
|------|---------|---|
| `logger.ts` | Structured logging | `logger.debug()`, `logger.error()`, `logger.info()` |
| `error-handling.ts` | Error handler utilities | Error parsing, user-friendly messages |
| `apiErrorHandler.ts` | API-specific error handling | Parse API errors |
| `alerts.ts` | Custom alert utilities | Show alerts without using Alert component |

### Data Transformers
| File | Purpose | Key Functions |
|------|---------|---|
| `foodTransformers.ts` | Transform food data | Format macros, parse nutrition labels |
| `goalCalculations.ts` | Calculate nutrition and fitness goals | `calculateNutritionGoals()`, `convertImperialToMetric()` |
| `wellnessTerminology.ts` | Wellness term translations | Translate technical terms to user-friendly language |

### Compliance & Security
| File | Purpose | Key Functions |
|------|---------|---|
| `hipaaCompliance.ts` | HIPAA-compliant data handling | Encrypt sensitive data |
| `privacyCompliance.ts` | Privacy policy enforcement | Data deletion, anonymization |
| `secureStorage.ts` | Secure storage utilities | `setSecureJSON()`, `getSecureJSON()`, `deleteSecureItem()` |
| `disclaimerService.ts` | Display disclaimers | Show legal notices |

### Technical Utilities
| File | Purpose | Key Functions |
|------|---------|---|
| `api-interceptor.ts` | Intercept and log API calls | Request/response logging |
| `networkRetry.ts` | Retry failed network requests | Exponential backoff |
| `performance.ts` | Performance monitoring | Track render times, memory |
| `imagePickerHelpers.ts` | Image selection utilities | Pick from camera/library |
| `boundaryEnforcer.ts` | Enforce component boundaries | Prevent memory leaks |
| `cn.ts` | Merge Tailwind classNames | Conditional styling helper |
| `analytics.ts` | Analytics tracking | Track user actions |
| `NavigationDebugger.tsx` | Navigation debugging | Log navigation changes |

---

## Type Definitions

### Main Types
**Location:** `/home/user/workspace/src/types/`

| File | Exports | Purpose |
|------|---------|---|
| `ai.ts` | `AIMessage`, `AIResponse`, `AIRequestOptions` | AI service types |
| `errors.ts` | `AIServiceError`, `AITimeoutError`, `AIRateLimitError` | Error types |
| `food.ts` | `FoodEntry`, `FoodItem`, `Nutrition` | Food tracking types |
| `goals.ts` | `Goal`, `GoalProgress`, `NutritionGoal` | Goals types |
| `marketplace.ts` | `Coach`, `Purchase`, `Review` | Marketplace types |
| `models.ts` | Domain models | General domain types |
| `navigation.ts` | Navigation param types | React Navigation types |
| `profile.ts` | `UserProfile`, `UserProfileUpdate` | Profile types |
| `recommendations.ts` | Recommendation types | Recommendation engine types |

### Supabase Types
**Location:** `/home/user/workspace/src/types/supabase/`

| File | Purpose |
|------|---------|
| `database.generated.ts` | Auto-generated database types from Supabase |
| `database.ts` | Manual database schema overrides |
| `index.ts` | Type exports |
| `auth.types.ts` | Authentication types |
| `nutrition.types.ts` | Nutrition data types |
| `supabase-override.d.ts` | Type override declarations |
| `supabase.ts` | Main types file |

---

## UI Components

### Design System
**Location:** `/home/user/workspace/src/ui/`

| Component | Purpose | Props |
|-----------|---------|-------|
| `Button.tsx` | Reusable button component | `title`, `onPress`, `variant`, `size`, `loading`, `disabled` |
| `Card.tsx` | Card container with elevation | `children`, `elevation`, `padding` |
| `Text.tsx` | Styled text component | `variant`, `color`, `children` |
| `TextInput.tsx` | Styled text input | `label`, `placeholder`, `value`, `onChangeText` |
| `Screen.tsx` | Safe screen wrapper | `children`, `scrollable`, `contentContainerStyle` |
| `PhoneInput.tsx` | Phone number input with formatting | `value`, `onChangeText` |
| `useThemedStyles.ts` | Hook for theme-aware styles | Returns styled object |
| `spacing.ts` | Spacing constants | Tailwind spacing values |
| `index.ts` | UI component exports | All exports |

### Theme Provider
**Location:** `/home/user/workspace/src/app-components/components/`

| Component | Purpose |
|-----------|---------|
| `ThemeProvider.tsx` | Provides theme context (dark/light) |
| `ErrorBoundary.tsx` | Catches and displays errors |

---

## Data Files

### Mock Data
**Location:** `/home/user/workspace/src/data/`

| File | Purpose |
|------|---------|
| `mockCoaches.ts` | Mock coach data for development |
| `coachProfiles.ts` | Coach profile data |
| `coachPersonalities.ts` | Coach personality definitions |

---

## Configuration Files

**Location:** `/home/user/workspace/src/config/`

| File | Purpose | Key Exports |
|------|---------|---|
| `env.ts` | Environment variable configuration | `ENV`, `ENV_VALIDATION` |
| `developmentConfig.ts` | Development-specific config | Debug flags |
| `voiceMapping.ts` | Voice coach personality mapping | Coach persona mappings |

---

## Library Integrations

| Library | Purpose | Files |
|---------|---------|-------|
| `@supabase/supabase-js` | Backend database and auth | `/src/lib/supabase.ts` |
| `react-native-safe-area-context` | Safe area handling | Used in `Screen.tsx` |
| `@react-navigation/*` | Navigation | `/src/navigation/` |
| `expo-linear-gradient` | Gradient backgrounds | `SignInScreen.tsx` |
| `@expo/vector-icons` | Icons (Ionicons default) | Throughout components |
| `nativewind` | Tailwind CSS for React Native | Global styling |
| `react-native-reanimated` | Animations | Various components |
| `react-native-gesture-handler` | Gesture detection | Input handling |
| `react-native-async-storage` | Local storage | Session, preferences |
| `expo-camera` | Camera access | `PhotoCaptureModal.tsx` |
| `expo-sensors` | Step counting | `StepTrackingService` |
| `zustand` | State management (example) | State stores |

---

## Database Tables Summary

### Core User Data
- `profiles` - User profile information
- `goals` - User health/fitness goals
- `goal_progress` - Goal achievement tracking

### Food & Nutrition
- `food_entries` - Daily food logs
- `food_database` - Food nutrition information
- `meal_plans` - User meal plans
- `meals` - Individual meals
- `recipes` - Recipe definitions

### Health Tracking
- `weight_logs` - Weight tracking over time
- `fasting_logs` - Fasting periods
- `step_tracking` - Step count data

### Coach & Community
- `coaches` - AI coach definitions
- `coach_conversations` - Chat history
- `achievements` - User achievements

### Marketplace & Subscriptions
- `coaches` (marketplace view) - Coach listings
- `purchases` - Coach/feature purchases
- `subscriptions` - Active subscriptions
- `invoices` - Billing invoices
- `payment_methods` - Saved payment info

### Testing & Analytics
- `ai_test_results` - AI model test results
- `ai_metrics` - Performance metrics
- `engagement_metrics` - User engagement

---

## Key Dependencies Summary

### Package.json Modules (Pre-installed)
```
Core:
- react-native 0.76.7
- expo SDK 53
- react-navigation (native-stack, bottom-tabs, drawer, material-top-tabs)

UI & Styling:
- nativewind v3
- react-native-svg
- expo-linear-gradient
- @expo/vector-icons

State & Storage:
- zustand
- @react-native-async-storage/async-storage
- @react-native-secure-store (implied)

AI & APIs:
- @anthropic-ai/sdk
- openai
- axios (implied for HTTP)

Sensors & Hardware:
- expo-camera
- expo-sensors

Other:
- @supabase/supabase-js
- react-native-url-polyfill
```

---

## Known Issues & Notes

1. **Type Ignores**: Supabase client creation uses `@ts-ignore` due to module resolution issues
2. **Mock Data**: Some screens fall back to mock data when database fails
3. **Testing Infrastructure**: AI testing requires running migrations in Supabase first
4. **Secure Storage**: Migration from AsyncStorage to SecureStore in progress
5. **Image Handling**: Camera uses direct `style` prop instead of `className` for compatibility

---

**End of Inventory**

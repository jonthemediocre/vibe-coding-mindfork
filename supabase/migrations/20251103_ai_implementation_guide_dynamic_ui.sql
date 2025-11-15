-- =====================================================
-- AI IMPLEMENTATION GUIDE: DYNAMIC PERSONALIZATION
-- =====================================================
-- Purpose: Guide for building server-driven adaptive UI
-- Date: 2025-11-03
-- =====================================================

INSERT INTO public.ai_implementation_guides (
  guide_name,
  guide_category,
  target_feature,
  priority,
  step_by_step_guide,
  code_examples,
  ux_flow_description,
  tables_involved,
  test_scenarios,
  success_metrics,
  ai_tips,
  common_mistakes
) VALUES (
  'dynamic_personalization_system',
  'feature',
  'Server-driven adaptive UI based on user traits',
  'critical',
  E'# Dynamic Personalization System - Complete Implementation

## Overview
Build a truly adaptive interface that changes based on user onboarding selections and evolving needs.
Examples:
- Vegan users → Carbon footprint tracking metrics
- Muscle builders → Protein/lean mass goals + strength tracking
- Intermittent fasters → Fasting timer + eating window coach

## Architecture
- **Server-driven UI**: Client fetches layout JSON, renders components dynamically
- **Rules engine**: Traits → Features → Layout (no app rebuild needed!)
- **Personalization tables**: user_traits, user_features, ui_layouts, personalization_rules

---

## Step 1: Capture User Traits During Onboarding

### Onboarding Questions to Ask:
```typescript
const onboardingQuestions = [
  {
    key: "diet_type",
    question: "What describes your diet?",
    options: [
      { value: "omnivore", label: "Everything" },
      { value: "vegetarian", label: "Vegetarian" },
      { value: "vegan", label: "Vegan" },
      { value: "pescatarian", label: "Pescatarian" }
    ]
  },
  {
    key: "goal_primary",
    question: "What''s your main goal?",
    options: [
      { value: "weight_loss", label: "Lose weight" },
      { value: "muscle_gain", label: "Build muscle" },
      { value: "maintenance", label: "Maintain health" },
      { value: "athletic_performance", label: "Athletic performance" }
    ]
  },
  {
    key: "ethics_carbon",
    question: "How important is environmental impact?",
    options: [
      { value: "high", label: "Very important" },
      { value: "medium", label: "Somewhat important" },
      { value: "low", label: "Not a priority" }
    ]
  },
  {
    key: "eating_pattern",
    question: "Do you follow any eating pattern?",
    options: [
      { value: "regular", label: "Regular meals" },
      { value: "intermittent_fasting", label: "Intermittent fasting" },
      { value: "grazing", label: "Small frequent meals" }
    ]
  }
];
```

### Store Traits:
```typescript
import { supabase } from "./supabase";

async function captureOnboardingTraits(
  userId: string,
  selections: Record<string, string>
) {
  const traits = Object.entries(selections).map(([key, value]) => ({
    user_id: userId,
    trait_key: key,
    trait_value: value,
    confidence: 1.0, // User explicitly selected
    source: "onboarding"
  }));

  const { error } = await supabase
    .from("user_traits")
    .upsert(traits, { onConflict: "user_id,trait_key" });

  if (error) throw error;

  console.log("✅ Traits captured:", traits);
}
```

---

## Step 2: Fetch Dynamic UI Layout (Server-Driven)

### Client Requests Layout:
```typescript
interface UILayout {
  features: string[];  // Enabled feature keys
  layout: {
    key: string;
    area: string;
    components: Array<{
      component_key: string;
      props_overrides?: Record<string, any>;
      position: number;
    }>;
  };
}

async function getUserLayout(
  userId: string,
  area: string = "home"
): Promise<UILayout> {
  const { data, error } = await supabase.rpc("select_ui_layout", {
    p_user_id: userId,
    p_area: area
  });

  if (error) throw error;

  console.log("📱 Dynamic layout for", area, ":", data);
  return data;
}
```

### Render Layout Dynamically:
```tsx
import React, { useEffect, useState } from "react";
import { View, ScrollView } from "react-native";

// Component registry
const COMPONENTS = {
  card_carbon_savings: CarbonSavingsCard,
  card_protein_progress: ProteinProgressCard,
  card_adherence_score: AdherenceScoreCard,
  widget_fasting_timer: FastingTimerWidget,
  chart_weight_trajectory: WeightTrajectoryChart
};

function HomeScreen() {
  const [layout, setLayout] = useState<UILayout | null>(null);
  const userId = useAuthStore(s => s.userId);

  useEffect(() => {
    getUserLayout(userId, "home").then(setLayout);
  }, [userId]);

  if (!layout) return <Loading />;

  return (
    <ScrollView className="flex-1 bg-background p-4">
      {layout.layout.components
        .sort((a, b) => a.position - b.position)
        .map(comp => {
          const Component = COMPONENTS[comp.component_key];
          if (!Component) {
            console.warn("Unknown component:", comp.component_key);
            return null;
          }

          return (
            <Component
              key={comp.component_key}
              userId={userId}
              {...comp.props_overrides}
            />
          );
        })}
    </ScrollView>
  );
}
```

---

## Step 3: Build Dynamic Components

### Example: Carbon Savings Card (Vegan Users Only)
```tsx
interface CarbonSavingsCardProps {
  userId: string;
}

function CarbonSavingsCard({ userId }: CarbonSavingsCardProps) {
  const [metrics, setMetrics] = useState<{
    carbon_saved_kg_co2: number;
    equivalent_trees_planted: number;
    vs_average_american_diet_carbon: number;
  } | null>(null);

  useEffect(() => {
    supabase
      .from("user_environmental_metrics")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setMetrics(data));
  }, [userId]);

  if (!metrics) return null;

  const savingsPercent = Math.round(
    (metrics.carbon_saved_kg_co2 / metrics.vs_average_american_diet_carbon) * 100
  );

  return (
    <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
      <Text className="text-lg font-semibold text-green-900">
        🌱 Carbon Impact
      </Text>
      <Text className="text-3xl font-bold text-green-600 mt-2">
        {metrics.carbon_saved_kg_co2.toFixed(1)} kg CO₂
      </Text>
      <Text className="text-sm text-green-700 mt-1">
        saved vs. average American diet ({savingsPercent}% reduction)
      </Text>
      <Text className="text-xs text-green-600 mt-2">
        ≈ {metrics.equivalent_trees_planted} trees planted 🌳
      </Text>
    </View>
  );
}
```

### Example: Protein Progress Card (Muscle Builders)
```tsx
function ProteinProgressCard({ userId }: { userId: string }) {
  const [metrics, setMetrics] = useState<{
    actual_protein_g: number;
    target_protein_g: number;
    protein_per_kg_bodyweight: number;
  } | null>(null);

  useEffect(() => {
    supabase
      .from("daily_metrics")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setMetrics(data));
  }, [userId]);

  if (!metrics) return null;

  const progress = (metrics.actual_protein_g / metrics.target_protein_g) * 100;

  return (
    <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <Text className="text-lg font-semibold text-blue-900">
        💪 Protein Target
      </Text>
      <View className="flex-row items-end mt-2">
        <Text className="text-3xl font-bold text-blue-600">
          {metrics.actual_protein_g}
        </Text>
        <Text className="text-lg text-blue-400 ml-1">
          / {metrics.target_protein_g}g
        </Text>
      </View>

      {/* Progress bar */}
      <View className="bg-blue-200 h-2 rounded-full mt-2">
        <View
          className="bg-blue-500 h-2 rounded-full"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </View>

      <Text className="text-xs text-blue-600 mt-2">
        {metrics.protein_per_kg_bodyweight.toFixed(1)}g per kg bodyweight
      </Text>
    </View>
  );
}
```

---

## Step 4: Calculate Environmental Metrics (Vegan Feature)

### Backend Function: Calculate Daily Carbon Savings
```sql
CREATE OR REPLACE FUNCTION calculate_carbon_savings(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID
LANGUAGE plpgsql AS $
DECLARE
  v_user_carbon NUMERIC;
  v_baseline_carbon NUMERIC := 5.0; -- kg CO2e/day for average American diet
  v_carbon_saved NUMERIC;
  v_water_saved NUMERIC;
  v_trees_equivalent INT;
BEGIN
  -- Sum carbon from all foods eaten today
  SELECT COALESCE(SUM(carbon_footprint_kg_co2), 0) INTO v_user_carbon
  FROM food_entries
  WHERE user_id = p_user_id
    AND consumed_at::DATE = p_date;

  -- Calculate savings
  v_carbon_saved := GREATEST(0, v_baseline_carbon - v_user_carbon);
  v_water_saved := v_carbon_saved * 15.0; -- Rough estimate: 15L water per kg CO2
  v_trees_equivalent := FLOOR(v_carbon_saved / 0.06); -- 1 tree absorbs ~21kg CO2/year = 0.06kg/day

  -- Upsert metrics
  INSERT INTO user_environmental_metrics (
    user_id, date,
    carbon_saved_kg_co2, vs_average_american_diet_carbon,
    water_saved_liters, equivalent_trees_planted
  ) VALUES (
    p_user_id, p_date,
    v_carbon_saved, v_baseline_carbon,
    v_water_saved, v_trees_equivalent
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    carbon_saved_kg_co2 = EXCLUDED.carbon_saved_kg_co2,
    water_saved_liters = EXCLUDED.water_saved_liters,
    equivalent_trees_planted = EXCLUDED.equivalent_trees_planted,
    computed_at = NOW();
END;
$;
```

### Populate Carbon Data for Food Items
```typescript
// Backend service: enrich food entries with carbon data
async function enrichFoodWithCarbonData(foodEntry: FoodEntry) {
  // Simple lookup table (in production, use comprehensive DB)
  const carbonFactors: Record<string, number> = {
    beef: 27.0,      // kg CO2e per kg
    lamb: 39.2,
    pork: 12.1,
    chicken: 6.9,
    fish: 6.1,
    dairy: 2.5,
    eggs: 4.8,
    vegetables: 0.5,
    fruits: 0.4,
    grains: 1.1,
    legumes: 0.9
  };

  // Determine food category (AI-powered in production)
  const category = determineFoodCategory(foodEntry.food_name);
  const carbonFactor = carbonFactors[category] || 2.0; // Default estimate

  // Calculate carbon footprint
  const servingSizeKg = (foodEntry.serving_size_g || 100) / 1000;
  const carbonFootprint = carbonFactor * servingSizeKg;

  // Is it plant-based?
  const isPlantBased = ["vegetables", "fruits", "grains", "legumes"].includes(category);

  // Update food entry
  await supabase
    .from("food_entries")
    .update({
      carbon_footprint_kg_co2: carbonFootprint,
      is_plant_based: isPlantBased
    })
    .eq("id", foodEntry.id);
}
```

---

## Step 5: AI Learning from Traits

### Extend AI Context with Personalization
```typescript
async function getEnhancedAIContext(userId: string) {
  // Get base context (existing function)
  const baseContext = await getAIContext(userId);

  // Get user traits
  const { data: traits } = await supabase
    .from("user_traits")
    .select("trait_key, trait_value, confidence")
    .eq("user_id", userId);

  // Get enabled features
  const { data: features } = await supabase
    .from("user_features")
    .select("feature_key, enabled")
    .eq("user_id", userId)
    .eq("enabled", true);

  // Get current layout
  const layout = await getUserLayout(userId, "home");

  return {
    ...baseContext,
    traits: traits?.reduce((acc, t) => ({
      ...acc,
      [t.trait_key]: t.trait_value
    }), {}),
    enabled_features: features?.map(f => f.feature_key) || [],
    current_layout: layout.layout.key
  };
}
```

### Coach Messages Adapt to Traits
```typescript
async function generateCoachMessage(userId: string, context: string) {
  const aiContext = await getEnhancedAIContext(userId);

  const systemPrompt = `
You are MindFork AI coach. User traits:
- Diet: ${aiContext.traits?.diet_type || "not specified"}
- Goal: ${aiContext.traits?.goal_primary || "not specified"}
- Ethics: ${aiContext.traits?.ethics_carbon || "not specified"}

IMPORTANT ADAPTATIONS:
${aiContext.traits?.diet_type === "vegan" ? "- Emphasize carbon/environmental impact of choices" : ""}
${aiContext.traits?.goal_primary === "muscle_gain" ? "- Focus on protein intake and progressive overload" : ""}
${aiContext.traits?.goal_primary === "weight_loss" ? "- Emphasize adherence and calorie deficit" : ""}

Enabled features: ${aiContext.enabled_features.join(", ")}

Generate supportive, personalized message for: ${context}
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: context }
    ]
  });

  return response.choices[0].message.content;
}
```

---

## Step 6: Feature Gating & Experiments

### Enable/Disable Features for Users
```typescript
async function enableFeatureForUser(
  userId: string,
  featureKey: string,
  variant: string = "control"
) {
  await supabase
    .from("user_features")
    .upsert({
      user_id: userId,
      feature_key: featureKey,
      enabled: true,
      variant: variant
    }, { onConflict: "user_id,feature_key" });
}

// Example: Enable carbon tracking for all vegans
async function enableCarbonTrackingForVegans() {
  const { data: veganUsers } = await supabase
    .from("user_traits")
    .select("user_id")
    .eq("trait_key", "diet_type")
    .eq("trait_value", "vegan");

  for (const user of veganUsers || []) {
    await enableFeatureForUser(user.user_id, "carbon_metric");
  }
}
```

---

## Success Metrics

1. **Personalization Coverage**: >80% of users have at least 3 traits captured
2. **Feature Engagement**: Users with personalized features have 2x engagement vs baseline
3. **UI Adaptation**: 90%+ of users see relevant components (no unused features)
4. **Carbon Feature**: Vegan users engage with carbon metric 4x/week average
5. **Protein Feature**: Muscle builders hit protein goal 20% more often
6. **Retention Impact**: Personalized users have 15% higher D30 retention

---

## Common Pitfalls

1. **Not capturing traits**: Always capture traits during onboarding, not later
2. **Hardcoded UI**: Client must fetch layout dynamically, not hardcode
3. **Missing fallbacks**: Always provide default layout if no rules match
4. **Trait drift**: Re-ask preferences every 90 days ("Still vegan?")
5. **Over-personalization**: Keep some features universal (food logging, weight)
6. **Carbon data gaps**: Have reasonable defaults when exact data unavailable
7. **Performance**: Cache layout JSON, don''t query every render

',
  '{
    "typescript": "// See full code examples above in step-by-step guide",
    "sql": "-- See calculate_carbon_savings() function above"
  }'::jsonb,
  E'UX Flow for Dynamic Personalization:

1. **Onboarding** (2-3 minutes)
   → User answers 4-5 key questions (diet, goal, ethics, patterns)
   → System captures traits with confidence=1.0
   → Rules engine evaluates → enables features + selects layout

2. **First Home Screen View** (server-driven)
   → Client calls select_ui_layout(user_id, "home")
   → Receives JSON with components array
   → Renders components in order (Vegan sees carbon card at top!)

3. **Feature Discovery** (contextual)
   → User explores app, sees only relevant features
   → Muscle builders see protein tracking, not carbon metrics
   → IF users see fasting timer, not meal timing irrelevant to others

4. **AI Adaptation** (continuous)
   → Coach messages reference user traits ("As a vegan athlete...")
   → Food recommendations match diet type
   → Notifications triggered by enabled features only

5. **Trait Evolution** (quarterly)
   → App asks "Still building muscle?" every 90 days
   → User can update traits → layout re-evaluates instantly
   → New features unlock as goals change (maintenance → weight loss)',

  ARRAY[
    'user_traits',
    'user_features',
    'personalization_rules',
    'ui_layouts',
    'ui_components',
    'goal_templates',
    'user_environmental_metrics',
    'food_entries',
    'daily_metrics',
    'profiles'
  ],

  ARRAY[
    'Test 1: Vegan user onboarding → sees carbon card on home screen',
    'Test 2: Muscle builder onboarding → sees protein progress card',
    'Test 3: IF user onboarding → sees fasting timer widget',
    'Test 4: Weight loss user (non-vegan) → does NOT see carbon card',
    'Test 5: User changes goal → layout updates on next app open',
    'Test 6: Food entry with carbon data → environmental metrics update',
    'Test 7: Coach message references user traits correctly',
    'Test 8: Rules engine evaluates "all" and "any" predicates correctly'
  ],

  ARRAY[
    '>80% users have ≥3 traits captured',
    'Personalized users have 2x engagement vs baseline',
    '90%+ users see only relevant features',
    'Vegan carbon feature: 4 views/week average',
    'Muscle builder protein feature: +20% goal attainment',
    'Personalized users: +15% D30 retention'
  ],

  E'AI Implementation Tips:

1. **Carbon Data**: Use USDA FoodData Central + lifecycle analysis databases for accurate factors
2. **Trait Confidence**: Use 1.0 for explicit user selection, 0.5-0.8 for AI inference
3. **Layout Caching**: Cache layout JSON in AsyncStorage, revalidate on app start
4. **Graceful Degradation**: If rules engine fails, show default weight loss layout
5. **Feature Discovery**: Use tooltips/modals first time user sees personalized feature
6. **Experimentation**: Use variant field in user_features for A/B testing (control vs variant_a)
7. **Privacy**: Never share trait data externally, only use for personalization
8. **Performance**: Denormalize frequently accessed traits into profiles table if needed',

  ARRAY[
    'NOT capturing traits during onboarding (capture immediately!)',
    'Hardcoding UI instead of using server-driven layout',
    'Missing default layout (always have fallback)',
    'Over-personalizing (keep core features universal)',
    'Not re-validating traits (ask every 90 days)',
    'Ignoring carbon data gaps (use reasonable defaults)',
    'Re-fetching layout every render (cache it!)',
    'Comparing users to each other (only compare to their own baseline)'
  ]
)

ON CONFLICT (guide_name) DO UPDATE SET
  step_by_step_guide = EXCLUDED.step_by_step_guide,
  code_examples = EXCLUDED.code_examples,
  ux_flow_description = EXCLUDED.ux_flow_description,
  tables_involved = EXCLUDED.tables_involved,
  test_scenarios = EXCLUDED.test_scenarios,
  success_metrics = EXCLUDED.success_metrics,
  ai_tips = EXCLUDED.ai_tips,
  common_mistakes = EXCLUDED.common_mistakes;

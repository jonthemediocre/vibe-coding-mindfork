#!/bin/bash
# Quick deployment script for Food Color Classification
# Run this to deploy the feature in under 5 minutes

set -e

echo "🟢🟡🔴 Food Color Classification - Quick Deploy"
echo "=============================================="
echo ""

# Check if Supabase URL is set
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ]; then
    echo "⚠️  EXPO_PUBLIC_SUPABASE_URL not set in environment"
    echo "📝 Using .env file values"
fi

echo "Step 1: Database Migration"
echo "-------------------------"
echo "You have 2 options:"
echo ""
echo "OPTION A (Recommended): Via Supabase Dashboard"
echo "1. Go to: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/sql/new"
echo "2. Copy contents of: database/migrations/0001_food_color_classification.sql"
echo "3. Paste into SQL Editor"
echo "4. Click 'Run' button"
echo ""
echo "OPTION B: Via psql (if you have database password)"
echo "Run: psql -h db.lxajnrofkgpwdpodjvkm.supabase.co -U postgres -d postgres -f database/migrations/0001_food_color_classification.sql"
echo ""
read -p "Press Enter after you've run the migration..."

echo ""
echo "✅ Migration should be complete!"
echo ""

echo "Step 2: Verify Migration"
echo "------------------------"
echo "Run this query in Supabase SQL Editor to verify:"
echo ""
echo "SELECT COUNT(*) as rule_count FROM diet_classification_rules;"
echo ""
echo "Expected result: 15 or more rules"
echo ""
read -p "Did you see 15+ rules? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration failed. Check Supabase logs."
    exit 1
fi

echo ""
echo "Step 3: Test Classification"
echo "---------------------------"
echo "Run this query to test auto-classification:"
echo ""
echo "SELECT classify_food_color('vegetable', ARRAY['leafy'], 25, 3, 5, 0, 3, 2);"
echo ""
echo "Expected result: 'green'"
echo ""
read -p "Did you see 'green'? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Classification not working. Check function creation."
    exit 1
fi

echo ""
echo "🎉 SUCCESS! Color classification is deployed!"
echo ""
echo "Next Steps:"
echo "----------"
echo "1. Test in app - food entries will now have colors (after migration runs)"
echo "2. Add ColorCodedFoodCard to your food screens (see FOOD_COLOR_CLASSIFICATION_SETUP.md)"
echo "3. Add ColorDistributionBar to dashboard for visual balance"
echo ""
echo "Files ready to use:"
echo "- src/services/FoodClassificationService.ts (service layer)"
echo "- src/components/food/ColorCodedFoodCard.tsx (UI components)"
echo "- src/types/supabase.ts (updated with DietColor type)"
echo ""
echo "The app will continue working normally. New food entries will automatically"
echo "get classified. Existing entries will show as 'neutral' until re-logged."
echo ""
echo "🚀 Ready for Sunday release!"

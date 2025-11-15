-- Migration: Add recipes and ingredients tables for meal planning
-- Created: 2025-01-02
-- Description: Adds recipe management and shopping list support to meal planning

-- ============================================================================
-- RECIPES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cuisine_type TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 1,
  calories_per_serving DECIMAL(10, 2),
  protein_g DECIMAL(10, 2),
  carbs_g DECIMAL(10, 2),
  fat_g DECIMAL(10, 2),
  fiber_g DECIMAL(10, 2),
  image_url TEXT,
  instructions JSONB, -- Array of {step: number, text: string}
  tags TEXT[], -- Array of tags like ['breakfast', 'high-protein', 'quick']
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RECIPE INGREDIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  quantity TEXT, -- e.g., "2", "1.5", "1/2"
  unit TEXT, -- e.g., "cups", "tbsp", "oz"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ADD OPTIONAL REFERENCES TO PLANNED_MEALS
-- ============================================================================
-- Add recipe_id to planned_meals (nullable, for backward compatibility)
ALTER TABLE public.planned_meals
ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL;

-- Add food_entry_id to planned_meals (nullable, for backward compatibility)
ALTER TABLE public.planned_meals
ADD COLUMN IF NOT EXISTS food_entry_id UUID REFERENCES public.food_entries(id) ON DELETE SET NULL;

-- ============================================================================
-- ADD missing columns if they don't exist (for backward compatibility)
-- ============================================================================
DO $$
BEGIN
    -- Add user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recipes' AND column_name = 'user_id') THEN
        ALTER TABLE public.recipes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Add tags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recipes' AND column_name = 'tags') THEN
        ALTER TABLE public.recipes ADD COLUMN tags TEXT[];
    END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON public.recipes(is_public);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON public.recipes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_planned_meals_recipe_id ON public.planned_meals(recipe_id);
CREATE INDEX IF NOT EXISTS idx_planned_meals_food_entry_id ON public.planned_meals(food_entry_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipes
CREATE POLICY "Users can view their own recipes or public recipes"
  ON public.recipes FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON public.recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON public.recipes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for recipe_ingredients
CREATE POLICY "Users can view ingredients for accessible recipes"
  ON public.recipe_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND (recipes.user_id = auth.uid() OR recipes.is_public = true)
    )
  );

CREATE POLICY "Users can insert ingredients for their own recipes"
  ON public.recipe_ingredients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ingredients for their own recipes"
  ON public.recipe_ingredients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ingredients for their own recipes"
  ON public.recipe_ingredients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE public.recipes IS 'User-created recipes with nutritional information and instructions';
COMMENT ON TABLE public.recipe_ingredients IS 'Ingredients for recipes, used for shopping list generation';
COMMENT ON COLUMN public.planned_meals.recipe_id IS 'Optional reference to recipe if meal is based on a recipe';
COMMENT ON COLUMN public.planned_meals.food_entry_id IS 'Optional reference to food entry if meal is based on logged food';
COMMENT ON COLUMN public.recipes.instructions IS 'JSON array of step objects: [{step: 1, text: "..."}, ...]';
COMMENT ON COLUMN public.recipes.tags IS 'Array of searchable tags for filtering recipes';
COMMENT ON COLUMN public.recipes.is_public IS 'If true, recipe is visible to all users (community recipes)';

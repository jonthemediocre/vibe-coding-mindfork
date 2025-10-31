-- 🟢🟡🔴 Food Color Classification System
-- This migration adds Green/Yellow/Red food categorization to MindFork
-- 100% ADDITIVE - Zero breaking changes

-- ============================================================================
-- PART 1: Enable pgvector for semantic search (future use)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- PART 2: Create diet_color enum type
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE diet_color AS ENUM ('green', 'yellow', 'red', 'neutral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PART 3: Extend food_entries table (main logging table)
-- ============================================================================

-- Add color classification column
ALTER TABLE food_entries
ADD COLUMN IF NOT EXISTS diet_color diet_color DEFAULT 'neutral';

-- Add tags array for flexible categorization
ALTER TABLE food_entries
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add food category for grouping (vegetable, fruit, protein, etc.)
ALTER TABLE food_entries
ADD COLUMN IF NOT EXISTS food_category text;

-- Add AI classification confidence score (0.00 to 1.00)
ALTER TABLE food_entries
ADD COLUMN IF NOT EXISTS ai_classification_confidence numeric(3,2);

-- Add embedding vector for semantic search (future use)
ALTER TABLE food_entries
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- ============================================================================
-- PART 4: Extend food_logs table (if it has different structure)
-- ============================================================================

ALTER TABLE food_logs
ADD COLUMN IF NOT EXISTS diet_color diet_color DEFAULT 'neutral';

ALTER TABLE food_logs
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

ALTER TABLE food_logs
ADD COLUMN IF NOT EXISTS food_category text;

-- ============================================================================
-- PART 5: Create diet_classification_rules table
-- ============================================================================

CREATE TABLE IF NOT EXISTS diet_classification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL,
    diet_color diet_color NOT NULL,

    -- Pattern matching (null = matches all)
    category_pattern TEXT,  -- e.g. 'vegetable', 'fruit'
    tag_pattern TEXT,       -- e.g. 'leafy', 'processed'

    -- Nutrient criteria (JSON for flexibility)
    nutrient_criteria JSONB,

    -- Rule execution
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast rule lookups
CREATE INDEX IF NOT EXISTS idx_classification_rules_active
    ON diet_classification_rules(priority DESC, is_active)
    WHERE is_active = true;

-- ============================================================================
-- PART 6: Insert default classification rules
-- ============================================================================

INSERT INTO diet_classification_rules (rule_name, diet_color, category_pattern, tag_pattern, nutrient_criteria, priority)
VALUES
    -- GREEN FOODS (Go!)
    ('Leafy Vegetables', 'green', 'vegetable', 'leafy', '{"calories_per_100g": {"max": 50}}', 10),
    ('Non-Starchy Vegetables', 'green', 'vegetable', null, '{"calories_per_100g": {"max": 60}, "fiber_g": {"min": 2}}', 20),
    ('Fresh Fruits', 'green', 'fruit', null, '{"calories_per_100g": {"max": 80}, "fiber_g": {"min": 1.5}}', 30),
    ('Lean Proteins', 'green', 'protein', 'lean', '{"protein_g": {"min": 15}, "fat_g": {"max": 5}}', 40),
    ('Legumes', 'green', 'legume', null, '{"protein_g": {"min": 5}, "fiber_g": {"min": 5}}', 50),

    -- YELLOW FOODS (Caution)
    ('Whole Grains', 'yellow', 'grain', 'whole', '{"calories_per_100g": {"max": 350}, "fiber_g": {"min": 3}}', 60),
    ('Nuts and Seeds', 'yellow', 'protein', 'nuts', '{"calories_per_100g": {"min": 400}, "fat_g": {"min": 40}}', 70),
    ('Fatty Proteins', 'yellow', 'protein', null, '{"calories_per_100g": {"min": 200}, "fat_g": {"min": 10}}', 80),
    ('Starchy Vegetables', 'yellow', 'vegetable', 'starchy', '{"calories_per_100g": {"min": 80}, "carbs_g": {"min": 15}}', 90),
    ('Low-Fat Dairy', 'yellow', 'dairy', 'low-fat', '{"calories_per_100g": {"max": 150}, "protein_g": {"min": 3}}', 100),

    -- RED FOODS (Stop!)
    ('Fried Foods', 'red', null, 'fried', '{"calories_per_100g": {"min": 300}, "fat_g": {"min": 15}}', 110),
    ('Processed Snacks', 'red', 'snack', 'processed', '{"calories_per_100g": {"min": 400}}', 120),
    ('Sugary Desserts', 'red', 'dessert', null, '{"calories_per_100g": {"min": 300}, "carbs_g": {"min": 40}}', 130),
    ('Refined Grains', 'red', 'grain', 'refined', '{"calories_per_100g": {"min": 300}, "fiber_g": {"max": 2}}', 140),
    ('High-Fat Dairy', 'red', 'dairy', 'full-fat', '{"calories_per_100g": {"min": 200}, "fat_g": {"min": 15}}', 150)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 7: Create classify_food_color() function
-- ============================================================================

CREATE OR REPLACE FUNCTION classify_food_color(
    p_food_category TEXT,
    p_tags TEXT[],
    p_calories_per_100g NUMERIC,
    p_protein_g NUMERIC,
    p_carbs_g NUMERIC,
    p_fat_g NUMERIC,
    p_fiber_g NUMERIC,
    p_sodium_mg NUMERIC DEFAULT 0
)
RETURNS diet_color
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_rule RECORD;
    v_nutrient_criteria JSONB;
    v_matches_criteria BOOLEAN;
BEGIN
    -- Loop through rules in priority order
    FOR v_rule IN
        SELECT * FROM diet_classification_rules
        WHERE is_active = true
        ORDER BY priority ASC
    LOOP
        -- Check category pattern
        IF v_rule.category_pattern IS NOT NULL
           AND (p_food_category IS NULL OR p_food_category !~* v_rule.category_pattern) THEN
            CONTINUE;
        END IF;

        -- Check tag pattern
        IF v_rule.tag_pattern IS NOT NULL
           AND (p_tags IS NULL OR NOT EXISTS (
               SELECT 1 FROM unnest(p_tags) AS tag
               WHERE tag ~* v_rule.tag_pattern
           )) THEN
            CONTINUE;
        END IF;

        -- Check nutrient criteria
        v_nutrient_criteria := v_rule.nutrient_criteria;
        v_matches_criteria := TRUE;

        IF v_nutrient_criteria IS NOT NULL THEN
            -- Check calories_per_100g
            IF v_nutrient_criteria ? 'calories_per_100g' THEN
                IF v_nutrient_criteria->'calories_per_100g' ? 'min'
                   AND p_calories_per_100g < (v_nutrient_criteria->'calories_per_100g'->>'min')::numeric THEN
                    v_matches_criteria := FALSE;
                END IF;
                IF v_nutrient_criteria->'calories_per_100g' ? 'max'
                   AND p_calories_per_100g > (v_nutrient_criteria->'calories_per_100g'->>'max')::numeric THEN
                    v_matches_criteria := FALSE;
                END IF;
            END IF;

            -- Check protein_g
            IF v_nutrient_criteria ? 'protein_g' THEN
                IF v_nutrient_criteria->'protein_g' ? 'min'
                   AND p_protein_g < (v_nutrient_criteria->'protein_g'->>'min')::numeric THEN
                    v_matches_criteria := FALSE;
                END IF;
                IF v_nutrient_criteria->'protein_g' ? 'max'
                   AND p_protein_g > (v_nutrient_criteria->'protein_g'->>'max')::numeric THEN
                    v_matches_criteria := FALSE;
                END IF;
            END IF;

            -- Check carbs_g
            IF v_nutrient_criteria ? 'carbs_g' THEN
                IF v_nutrient_criteria->'carbs_g' ? 'min'
                   AND p_carbs_g < (v_nutrient_criteria->'carbs_g'->>'min')::numeric THEN
                    v_matches_criteria := FALSE;
                END IF;
                IF v_nutrient_criteria->'carbs_g' ? 'max'
                   AND p_carbs_g > (v_nutrient_criteria->'carbs_g'->>'max')::numeric THEN
                    v_matches_criteria := FALSE;
                END IF;
            END IF;

            -- Check fat_g
            IF v_nutrient_criteria ? 'fat_g' THEN
                IF v_nutrient_criteria->'fat_g' ? 'min'
                   AND p_fat_g < (v_nutrient_criteria->'fat_g'->>'min')::numeric THEN
                    v_matches_criteria := FALSE;
                END IF;
                IF v_nutrient_criteria->'fat_g' ? 'max'
                   AND p_fat_g > (v_nutrient_criteria->'fat_g'->>'max')::numeric THEN
                    v_matches_criteria := FALSE;
                END IF;
            END IF;

            -- Check fiber_g
            IF v_nutrient_criteria ? 'fiber_g' THEN
                IF v_nutrient_criteria->'fiber_g' ? 'min'
                   AND p_fiber_g < (v_nutrient_criteria->'fiber_g'->>'min')::numeric THEN
                    v_matches_criteria := FALSE;
                END IF;
                IF v_nutrient_criteria->'fiber_g' ? 'max'
                   AND p_fiber_g > (v_nutrient_criteria->'fiber_g'->>'max')::numeric THEN
                    v_matches_criteria := FALSE;
                END IF;
            END IF;
        END IF;

        -- If all criteria matched, return this color
        IF v_matches_criteria THEN
            RETURN v_rule.diet_color;
        END IF;
    END LOOP;

    -- Default to neutral if no rules matched
    RETURN 'neutral'::diet_color;
END;
$$;

-- ============================================================================
-- PART 8: Create trigger to auto-classify new food_entries
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_classify_food_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_calories_per_100g NUMERIC;
    v_protein_per_100g NUMERIC;
    v_carbs_per_100g NUMERIC;
    v_fat_per_100g NUMERIC;
    v_fiber_per_100g NUMERIC;
BEGIN
    -- Normalize to per-100g values (assuming serving is in grams)
    -- This is a simplified version - you may need to adjust based on your serving format
    v_calories_per_100g := COALESCE(NEW.calories, 0);
    v_protein_per_100g := COALESCE(NEW.protein, 0);
    v_carbs_per_100g := COALESCE(NEW.carbs, 0);
    v_fat_per_100g := COALESCE(NEW.fat, 0);
    v_fiber_per_100g := COALESCE(NEW.fiber, 0);

    -- Classify the food
    NEW.diet_color := classify_food_color(
        NEW.food_category,
        NEW.tags,
        v_calories_per_100g,
        v_protein_per_100g,
        v_carbs_per_100g,
        v_fat_per_100g,
        v_fiber_per_100g,
        0 -- sodium (not tracked yet)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_classify_food_entry ON food_entries;
CREATE TRIGGER trg_auto_classify_food_entry
    BEFORE INSERT OR UPDATE OF food_category, tags, calories, protein, carbs, fat, fiber
    ON food_entries
    FOR EACH ROW
    EXECUTE FUNCTION auto_classify_food_entry();

-- ============================================================================
-- PART 9: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_food_entries_diet_color
    ON food_entries(diet_color, user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_food_entries_category
    ON food_entries(food_category, user_id);

CREATE INDEX IF NOT EXISTS idx_food_entries_tags
    ON food_entries USING gin(tags);

-- ============================================================================
-- PART 10: Create daily_food_colors view
-- ============================================================================

CREATE OR REPLACE VIEW daily_food_colors AS
SELECT
    user_id,
    DATE(logged_at) as date,
    diet_color,
    COUNT(*) as count,
    SUM(calories) as total_calories,
    SUM(protein) as total_protein,
    SUM(carbs) as total_carbs,
    SUM(fat) as total_fat
FROM food_entries
WHERE diet_color IS NOT NULL
GROUP BY user_id, DATE(logged_at), diet_color;

-- ============================================================================
-- SUCCESS!
-- ============================================================================

-- Migration complete! The system now supports:
-- ✅ Green/Yellow/Red food classification
-- ✅ Automatic color assignment based on nutrition
-- ✅ 15+ pre-configured classification rules
-- ✅ Fast queries with proper indexes
-- ✅ Daily color distribution tracking
-- ✅ Zero breaking changes to existing data

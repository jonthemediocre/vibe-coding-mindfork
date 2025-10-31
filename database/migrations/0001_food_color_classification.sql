-- ============================================================================
-- Migration: Food Color Classification System
-- Purpose: Add Green/Yellow/Red dietary guidance to existing food tracking
-- Strategy: ADDITIVE ONLY - extends food_entries and foods tables
-- ============================================================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. ADD COLOR CLASSIFICATION TO EXISTING TABLES
-- ============================================================================

-- Add color enum type
DO $$ BEGIN
    CREATE TYPE diet_color AS ENUM ('green', 'yellow', 'red', 'neutral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extend food_entries (the active logging table)
ALTER TABLE food_entries
ADD COLUMN IF NOT EXISTS diet_color diet_color DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS food_category text,
ADD COLUMN IF NOT EXISTS ai_classification_confidence numeric(3,2);

-- Extend foods table (master database)
ALTER TABLE foods
ADD COLUMN IF NOT EXISTS diet_color diet_color DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS health_score numeric(3,2) CHECK (health_score >= 0 AND health_score <= 10);

-- Extend food_logs (richer schema - let's start using it!)
ALTER TABLE food_logs
ADD COLUMN IF NOT EXISTS diet_color diet_color DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- ============================================================================
-- 2. CREATE DIET CLASSIFICATION RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS diet_classification_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name text NOT NULL UNIQUE,
    diet_color diet_color NOT NULL,
    category_pattern text,        -- e.g., 'vegetable%', 'fruit%'
    tag_pattern text,             -- e.g., 'high-fiber', 'processed'
    nutrient_criteria jsonb,      -- e.g., {"protein_min": 20, "sugar_max": 5}
    priority integer DEFAULT 0,   -- Higher priority rules win
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create index for fast rule matching
CREATE INDEX IF NOT EXISTS idx_diet_rules_active
    ON diet_classification_rules(is_active, priority DESC);

-- ============================================================================
-- 3. INSERT DEFAULT CLASSIFICATION RULES
-- ============================================================================

-- GREEN FOODS (Go ahead!)
INSERT INTO diet_classification_rules (rule_name, diet_color, category_pattern, tag_pattern, nutrient_criteria, priority) VALUES
('vegetables', 'green', 'vegetable%', null, null, 100),
('leafy_greens', 'green', '%greens%', 'leafy', null, 110),
('fruits_whole', 'green', 'fruit%', null, '{"fiber_min": 2}', 90),
('lean_proteins', 'green', 'protein%', 'lean', '{"fat_max": 10}', 85),
('whole_grains', 'green', 'grain%', 'whole', '{"fiber_min": 3}', 80),
('legumes', 'green', 'legume%', null, null, 80),
('nuts_seeds', 'green', '%nuts%', null, '{"fiber_min": 2}', 70)
ON CONFLICT (rule_name) DO NOTHING;

-- YELLOW FOODS (Moderate - track portions)
INSERT INTO diet_classification_rules (rule_name, diet_color, category_pattern, tag_pattern, nutrient_criteria, priority) VALUES
('moderate_carbs', 'yellow', 'grain%', 'refined', '{"fiber_max": 3}', 60),
('moderate_fats', 'yellow', null, 'saturated', '{"fat_min": 10, "fat_max": 20}', 55),
('dairy_full_fat', 'yellow', 'dairy%', 'full-fat', null, 50),
('processed_meats', 'yellow', 'protein%', 'processed', null, 50),
('dried_fruits', 'yellow', 'fruit%', 'dried', '{"sugar_min": 30}', 45)
ON CONFLICT (rule_name) DO NOTHING;

-- RED FOODS (Limit - occasional treats)
INSERT INTO diet_classification_rules (rule_name, diet_color, category_pattern, tag_pattern, nutrient_criteria, priority) VALUES
('sugary_drinks', 'red', 'beverage%', 'sweetened', '{"sugar_min": 20}', 40),
('fried_foods', 'red', null, 'fried', '{"fat_min": 20}', 40),
('candy_sweets', 'red', 'dessert%', null, '{"sugar_min": 30}', 35),
('ultra_processed', 'red', null, 'ultra-processed', null, 35),
('fast_food', 'red', null, 'fast-food', null, 30)
ON CONFLICT (rule_name) DO NOTHING;

-- ============================================================================
-- 4. CREATE FUNCTION TO AUTO-CLASSIFY FOODS
-- ============================================================================

CREATE OR REPLACE FUNCTION classify_food_color(
    p_food_category text,
    p_tags text[],
    p_calories_per_100g numeric,
    p_protein_per_100g numeric,
    p_carbs_per_100g numeric,
    p_fat_per_100g numeric,
    p_fiber_per_100g numeric,
    p_sugar_per_100g numeric
)
RETURNS diet_color
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_color diet_color := 'neutral';
    v_rule record;
    v_highest_priority integer := -1;
    v_nutrient_criteria jsonb;
    v_matches boolean;
BEGIN
    -- Loop through active rules ordered by priority
    FOR v_rule IN
        SELECT * FROM diet_classification_rules
        WHERE is_active = true
        ORDER BY priority DESC
    LOOP
        v_matches := false;

        -- Check category pattern match
        IF v_rule.category_pattern IS NOT NULL THEN
            IF p_food_category ILIKE v_rule.category_pattern THEN
                v_matches := true;
            END IF;
        END IF;

        -- Check tag pattern match
        IF v_rule.tag_pattern IS NOT NULL AND p_tags IS NOT NULL THEN
            IF v_rule.tag_pattern = ANY(p_tags) THEN
                v_matches := true;
            END IF;
        END IF;

        -- Check nutrient criteria
        IF v_rule.nutrient_criteria IS NOT NULL THEN
            v_nutrient_criteria := v_rule.nutrient_criteria;
            v_matches := true; -- Start true, invalidate if criteria fail

            -- Check protein minimum
            IF v_nutrient_criteria ? 'protein_min' THEN
                IF COALESCE(p_protein_per_100g, 0) < (v_nutrient_criteria->>'protein_min')::numeric THEN
                    v_matches := false;
                END IF;
            END IF;

            -- Check sugar maximum
            IF v_nutrient_criteria ? 'sugar_max' THEN
                IF COALESCE(p_sugar_per_100g, 0) > (v_nutrient_criteria->>'sugar_max')::numeric THEN
                    v_matches := false;
                END IF;
            END IF;

            -- Check fat maximum
            IF v_nutrient_criteria ? 'fat_max' THEN
                IF COALESCE(p_fat_per_100g, 0) > (v_nutrient_criteria->>'fat_max')::numeric THEN
                    v_matches := false;
                END IF;
            END IF;

            -- Check fiber minimum
            IF v_nutrient_criteria ? 'fiber_min' THEN
                IF COALESCE(p_fiber_per_100g, 0) < (v_nutrient_criteria->>'fiber_min')::numeric THEN
                    v_matches := false;
                END IF;
            END IF;
        END IF;

        -- If rule matches and has higher priority, update color
        IF v_matches AND v_rule.priority > v_highest_priority THEN
            v_color := v_rule.diet_color;
            v_highest_priority := v_rule.priority;
        END IF;
    END LOOP;

    RETURN v_color;
END;
$$;

-- ============================================================================
-- 5. CREATE TRIGGER TO AUTO-CLASSIFY NEW FOODS
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_classify_food()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Auto-classify if diet_color is NULL or 'neutral'
    IF NEW.diet_color IS NULL OR NEW.diet_color = 'neutral' THEN
        NEW.diet_color := classify_food_color(
            NEW.food_category,
            NEW.tags,
            NEW.calories_per_100g,
            NEW.protein_per_100g,
            NEW.carbs_per_100g,
            NEW.fat_per_100g,
            NEW.fiber_per_100g,
            NEW.sugar_per_100g
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Apply trigger to foods table
DROP TRIGGER IF EXISTS foods_auto_classify ON foods;
CREATE TRIGGER foods_auto_classify
    BEFORE INSERT OR UPDATE ON foods
    FOR EACH ROW
    EXECUTE FUNCTION trigger_classify_food();

-- ============================================================================
-- 6. CREATE SEMANTIC SEARCH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION search_similar_foods(
    p_user_id uuid,
    p_query_embedding vector(1536),
    p_limit integer DEFAULT 10,
    p_meal_type text DEFAULT NULL,
    p_days_back integer DEFAULT 30,
    p_color_filter diet_color DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    name text,
    serving text,
    calories numeric,
    protein numeric,
    carbs numeric,
    fat numeric,
    fiber numeric,
    diet_color diet_color,
    tags text[],
    logged_at timestamptz,
    similarity_score numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fl.id,
        fe.name,
        fe.serving,
        fe.calories,
        fe.protein,
        fe.carbs,
        fe.fat,
        fe.fiber,
        fe.diet_color,
        fe.tags,
        fe.logged_at,
        (1 - (fl.embedding <=> p_query_embedding))::numeric(5,4) as similarity_score
    FROM food_logs fl
    JOIN food_entries fe ON fl.id::text = fe.id::text
    WHERE fl.user_id = p_user_id
        AND fl.embedding IS NOT NULL
        AND (p_meal_type IS NULL OR fe.meal_type = p_meal_type)
        AND (p_color_filter IS NULL OR fe.diet_color = p_color_filter)
        AND fl.created_at >= now() - (p_days_back || ' days')::interval
    ORDER BY fl.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Color-based filtering
CREATE INDEX IF NOT EXISTS idx_food_entries_color
    ON food_entries(diet_color) WHERE diet_color != 'neutral';

CREATE INDEX IF NOT EXISTS idx_foods_color
    ON foods(diet_color) WHERE diet_color != 'neutral';

-- Tag-based search
CREATE INDEX IF NOT EXISTS idx_food_entries_tags
    ON food_entries USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_foods_tags
    ON foods USING gin(tags);

-- Category search
CREATE INDEX IF NOT EXISTS idx_food_entries_category
    ON food_entries(food_category) WHERE food_category IS NOT NULL;

-- Vector similarity search (IVFFLAT for large datasets)
-- Note: Build this only when you have significant data
-- CREATE INDEX IF NOT EXISTS idx_food_logs_embedding
--     ON food_logs USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);

-- For now, use simpler index for small datasets
CREATE INDEX IF NOT EXISTS idx_food_logs_embedding_simple
    ON food_logs(user_id, created_at DESC) WHERE embedding IS NOT NULL;

-- ============================================================================
-- 8. CREATE VIEW FOR DAILY COLOR DISTRIBUTION
-- ============================================================================

CREATE OR REPLACE VIEW daily_food_colors AS
SELECT
    user_id,
    DATE(logged_at) as log_date,
    diet_color,
    COUNT(*) as food_count,
    SUM(calories) as total_calories,
    SUM(protein) as total_protein,
    SUM(carbs) as total_carbs,
    SUM(fat) as total_fat
FROM food_entries
WHERE diet_color IS NOT NULL
GROUP BY user_id, DATE(logged_at), diet_color;

-- ============================================================================
-- 9. BACKFILL EXISTING FOODS WITH COLORS
-- ============================================================================

-- Classify existing foods in foods table
UPDATE foods
SET diet_color = classify_food_color(
    food_category,
    tags,
    calories_per_100g,
    protein_per_100g,
    carbs_per_100g,
    fat_per_100g,
    fiber_per_100g,
    sugar_per_100g
)
WHERE diet_color = 'neutral' OR diet_color IS NULL;

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

-- Allow authenticated users to read classification rules
GRANT SELECT ON diet_classification_rules TO authenticated;

-- Allow authenticated users to use classification function
GRANT EXECUTE ON FUNCTION classify_food_color TO authenticated;

-- Allow authenticated users to use semantic search
GRANT EXECUTE ON FUNCTION search_similar_foods TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE diet_classification_rules IS 'Rules for automatically classifying foods into Green/Yellow/Red categories based on nutrition and category';
COMMENT ON FUNCTION classify_food_color IS 'Auto-classifies foods based on category, tags, and nutrient thresholds';
COMMENT ON FUNCTION search_similar_foods IS 'Semantic search for similar foods using vector embeddings';
COMMENT ON VIEW daily_food_colors IS 'Daily summary of food colors for tracking dietary balance';

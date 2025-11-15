-- Migration: Add Missing Food Entry Columns
-- Created: 2025-11-03
-- Purpose: Add sodium, sugar, barcode, and other missing nutrition/tracking fields

-- ============================================================================
-- ADD MISSING NUTRITION COLUMNS
-- ============================================================================

-- Critical nutrition tracking fields
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS sodium_mg NUMERIC,
  ADD COLUMN IF NOT EXISTS sugar_g NUMERIC;

-- Barcode scanning support
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS barcode_type TEXT;

-- When food was actually consumed (vs when it was logged)
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

-- Data source tracking (for quality/reliability)
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS data_source TEXT;

-- USDA FoodData Central integration
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS usda_fdc_id TEXT;

-- User experience enhancements
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- ============================================================================
-- EXTENDED NUTRITION (OPTIONAL - NICE TO HAVE)
-- ============================================================================

-- Additional macros for detailed tracking
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS saturated_fat_g NUMERIC,
  ADD COLUMN IF NOT EXISTS trans_fat_g NUMERIC,
  ADD COLUMN IF NOT EXISTS cholesterol_mg NUMERIC;

-- Key micronutrients
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS vitamin_a_mcg NUMERIC,
  ADD COLUMN IF NOT EXISTS vitamin_c_mg NUMERIC,
  ADD COLUMN IF NOT EXISTS calcium_mg NUMERIC,
  ADD COLUMN IF NOT EXISTS iron_mg NUMERIC,
  ADD COLUMN IF NOT EXISTS potassium_mg NUMERIC;

-- ============================================================================
-- INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Barcode lookup for quick product identification
CREATE INDEX IF NOT EXISTS idx_food_entries_barcode
  ON food_entries(barcode)
  WHERE barcode IS NOT NULL;

-- Data source filtering
CREATE INDEX IF NOT EXISTS idx_food_entries_data_source
  ON food_entries(data_source)
  WHERE data_source IS NOT NULL;

-- USDA lookup
CREATE INDEX IF NOT EXISTS idx_food_entries_usda_fdc_id
  ON food_entries(usda_fdc_id)
  WHERE usda_fdc_id IS NOT NULL;

-- Favorites filtering
CREATE INDEX IF NOT EXISTS idx_food_entries_is_favorite
  ON food_entries(user_id, is_favorite)
  WHERE is_favorite = true;

-- Consumed time (for meal timing analysis)
CREATE INDEX IF NOT EXISTS idx_food_entries_consumed_at
  ON food_entries(user_id, consumed_at DESC)
  WHERE consumed_at IS NOT NULL;

-- ============================================================================
-- DATA VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure positive nutrition values
ALTER TABLE food_entries
  ADD CONSTRAINT sodium_non_negative CHECK (sodium_mg IS NULL OR sodium_mg >= 0),
  ADD CONSTRAINT sugar_non_negative CHECK (sugar_g IS NULL OR sugar_g >= 0),
  ADD CONSTRAINT saturated_fat_non_negative CHECK (saturated_fat_g IS NULL OR saturated_fat_g >= 0),
  ADD CONSTRAINT trans_fat_non_negative CHECK (trans_fat_g IS NULL OR trans_fat_g >= 0),
  ADD CONSTRAINT cholesterol_non_negative CHECK (cholesterol_mg IS NULL OR cholesterol_mg >= 0),
  ADD CONSTRAINT vitamin_a_non_negative CHECK (vitamin_a_mcg IS NULL OR vitamin_a_mcg >= 0),
  ADD CONSTRAINT vitamin_c_non_negative CHECK (vitamin_c_mg IS NULL OR vitamin_c_mg >= 0),
  ADD CONSTRAINT calcium_non_negative CHECK (calcium_mg IS NULL OR calcium_mg >= 0),
  ADD CONSTRAINT iron_non_negative CHECK (iron_mg IS NULL OR iron_mg >= 0),
  ADD CONSTRAINT potassium_non_negative CHECK (potassium_mg IS NULL OR potassium_mg >= 0);

-- Valid data sources
ALTER TABLE food_entries
  ADD CONSTRAINT valid_data_source CHECK (
    data_source IS NULL OR data_source IN ('manual', 'barcode', 'photo', 'usda', 'search', 'ai')
  );

-- Valid barcode types
ALTER TABLE food_entries
  ADD CONSTRAINT valid_barcode_type CHECK (
    barcode_type IS NULL OR barcode_type IN ('UPC', 'EAN13', 'EAN8', 'CODE128', 'QR')
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN food_entries.sodium_mg IS
  'Sodium content in milligrams (important for heart health tracking)';

COMMENT ON COLUMN food_entries.sugar_g IS
  'Sugar content in grams (important for diabetes/weight management)';

COMMENT ON COLUMN food_entries.barcode IS
  'UPC/EAN barcode for product identification and quick logging';

COMMENT ON COLUMN food_entries.barcode_type IS
  'Type of barcode: UPC, EAN13, EAN8, etc.';

COMMENT ON COLUMN food_entries.consumed_at IS
  'Timestamp when food was actually consumed (vs logged_at for when it was entered)';

COMMENT ON COLUMN food_entries.data_source IS
  'How this food entry was created: manual, barcode, photo, usda, search, ai';

COMMENT ON COLUMN food_entries.usda_fdc_id IS
  'USDA FoodData Central ID for reference to official nutrition database';

COMMENT ON COLUMN food_entries.notes IS
  'User notes about the food (e.g., "with extra cheese", "homemade version")';

COMMENT ON COLUMN food_entries.is_favorite IS
  'Whether user marked this food entry as a favorite for quick re-logging';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- This migration adds critical fields that the app expects but were missing:
-- 1. sodium_mg and sugar_g - Required for complete nutrition tracking
-- 2. barcode - Required for barcode scanning feature
-- 3. consumed_at - Allows backdating food entries
-- 4. data_source - Tracks data quality and entry method
-- 5. usda_fdc_id - Integrates with USDA FoodData Central
--
-- All new columns are nullable for backward compatibility with existing data.
-- Existing food entries will continue to work without these fields.
--
-- Performance Impact: Minimal - indexes are partial and only used when columns populated
-- Storage Impact: ~50-100MB for typical usage (100k entries with 50% populated fields)
--

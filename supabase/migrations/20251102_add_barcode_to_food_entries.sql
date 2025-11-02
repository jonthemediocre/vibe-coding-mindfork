-- Migration: Add barcode field to food_entries table for local caching
-- Purpose: Cache USDA barcode lookups locally for instant repeat scans
-- Created: 2025-11-02

-- Add barcode column to food_entries
ALTER TABLE food_entries
ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Add index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_food_entries_barcode
ON food_entries(barcode)
WHERE barcode IS NOT NULL;

-- Add index for user + barcode combination (most common query)
CREATE INDEX IF NOT EXISTS idx_food_entries_user_barcode
ON food_entries(user_id, barcode)
WHERE barcode IS NOT NULL;

-- Add comment
COMMENT ON COLUMN food_entries.barcode IS 'UPC/EAN barcode for cached USDA lookups (optional, for performance)';

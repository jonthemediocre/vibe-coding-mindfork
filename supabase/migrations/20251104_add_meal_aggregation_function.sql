-- Migration: Add meal aggregation helper function
-- Created: 2025-11-04
-- Description: Provides daily nutrition summary aggregation for food entries

-- Drop function if exists (for idempotent migrations)
DROP FUNCTION IF EXISTS get_daily_nutrition_summary(UUID, DATE);

-- Create the meal aggregation function
CREATE OR REPLACE FUNCTION get_daily_nutrition_summary(
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Aggregate nutrition data for the specified user and date
  SELECT jsonb_build_object(
    'date', p_date,
    'total_calories', COALESCE(SUM(calories), 0),
    'total_protein', COALESCE(SUM(protein), 0),
    'total_carbs', COALESCE(SUM(carbs), 0),
    'total_fat', COALESCE(SUM(fat), 0),
    'total_fiber', COALESCE(SUM(fiber), 0),
    'meal_count', COUNT(*),
    'breakfast_count', COUNT(*) FILTER (WHERE meal_type = 'breakfast'),
    'lunch_count', COUNT(*) FILTER (WHERE meal_type = 'lunch'),
    'dinner_count', COUNT(*) FILTER (WHERE meal_type = 'dinner'),
    'snack_count', COUNT(*) FILTER (WHERE meal_type = 'snack')
  )
  INTO v_result
  FROM food_entries
  WHERE user_id = p_user_id
    AND DATE(consumed_at) = p_date;

  -- Return the aggregated result
  RETURN v_result;
END;
$$;

-- Add helpful comment to the function
COMMENT ON FUNCTION get_daily_nutrition_summary(UUID, DATE) IS
'Aggregates daily nutrition summary for a user on a specific date.
Returns JSONB with total macros, fiber, and meal counts by type.
Uses SECURITY DEFINER to run with function owner privileges.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_nutrition_summary(UUID, DATE) TO authenticated;

-- =====================================================
-- MIGRATION: Mismatch Detection & Canonicalization
-- =====================================================
-- Purpose: Detect mismatches between AI guesses and verified nutrition data
-- Date: 2025-11-12
-- Priority: P3 Enhancement
-- =====================================================

-- =====================================================
-- 1. TEXT SIMILARITY FUNCTION (Levenshtein Distance)
-- =====================================================

CREATE OR REPLACE FUNCTION levenshtein_similarity(s1 TEXT, s2 TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  len1 INT := length(s1);
  len2 INT := length(s2);
  max_len INT := GREATEST(len1, len2);
  distance INT;
BEGIN
  -- If either string is empty
  IF len1 = 0 THEN RETURN 0; END IF;
  IF len2 = 0 THEN RETURN 0; END IF;

  -- Use built-in levenshtein if available (from pg_trgm or fuzzystrmatch)
  -- Otherwise, calculate max length similarity
  BEGIN
    distance := levenshtein(s1, s2);
    RETURN 1.0 - (distance::NUMERIC / max_len);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: Simple character overlap ratio
    RETURN 1.0 - (abs(len1 - len2)::NUMERIC / max_len);
  END;
END;
$$;

COMMENT ON FUNCTION levenshtein_similarity IS
  'Calculate text similarity ratio 0-1 using Levenshtein distance (requires fuzzystrmatch extension)';

-- =====================================================
-- 2. TEXT NORMALIZATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION normalize_food_name(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(
    trim(
      regexp_replace(
        regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'),  -- Remove punctuation
        '\s+', ' ', 'g'  -- Normalize whitespace
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION normalize_food_name IS
  'Normalize food name: lowercase, trim, remove punctuation, normalize whitespace';

-- =====================================================
-- 3. UNIT NORMALIZATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION normalize_nutrition_units(nutrition JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_normalized JSONB := nutrition;
BEGIN
  -- Ensure all values are numeric and in standard units
  -- Standard units: calories (kcal), protein (g), carbs (g), fat (g), fiber (g)

  -- Convert any string numbers to numeric
  IF (v_normalized->>'calories')::TEXT ~ '^[0-9]+\.?[0-9]*$' THEN
    v_normalized := jsonb_set(v_normalized, '{calories}', to_jsonb((v_normalized->>'calories')::NUMERIC));
  END IF;

  IF (v_normalized->>'protein_g')::TEXT ~ '^[0-9]+\.?[0-9]*$' THEN
    v_normalized := jsonb_set(v_normalized, '{protein_g}', to_jsonb((v_normalized->>'protein_g')::NUMERIC));
  END IF;

  IF (v_normalized->>'carbs_g')::TEXT ~ '^[0-9]+\.?[0-9]*$' THEN
    v_normalized := jsonb_set(v_normalized, '{carbs_g}', to_jsonb((v_normalized->>'carbs_g')::NUMERIC));
  END IF;

  IF (v_normalized->>'fat_g')::TEXT ~ '^[0-9]+\.?[0-9]*$' THEN
    v_normalized := jsonb_set(v_normalized, '{fat_g}', to_jsonb((v_normalized->>'fat_g')::NUMERIC));
  END IF;

  RETURN v_normalized;
END;
$$;

COMMENT ON FUNCTION normalize_nutrition_units IS
  'Normalize nutrition JSONB: ensure numeric values in standard units';

-- =====================================================
-- 4. MAIN MISMATCH DETECTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION detect_nutrition_mismatch(
  p_ai_guess JSONB,
  p_verified JSONB,
  p_ai_name TEXT DEFAULT NULL,
  p_verified_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  has_mismatch BOOLEAN,
  mismatch_reason TEXT,
  mismatch_fields TEXT[],
  confidence TEXT,  -- 'low', 'medium', 'high'

  -- Specific differences
  calorie_diff_pct NUMERIC,
  calorie_diff_abs NUMERIC,
  protein_diff_g NUMERIC,
  carbs_diff_g NUMERIC,
  fat_diff_g NUMERIC,
  name_similarity NUMERIC,

  -- Thresholds crossed
  calorie_threshold_exceeded BOOLEAN,
  protein_threshold_exceeded BOOLEAN,
  name_threshold_exceeded BOOLEAN,

  -- Recommendation
  recommendation TEXT
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  -- Normalized data
  v_ai_norm JSONB;
  v_verified_norm JSONB;
  v_ai_name_norm TEXT;
  v_verified_name_norm TEXT;

  -- Extracted values
  v_ai_cal NUMERIC;
  v_verified_cal NUMERIC;
  v_ai_protein NUMERIC;
  v_verified_protein NUMERIC;
  v_ai_carbs NUMERIC;
  v_verified_carbs NUMERIC;
  v_ai_fat NUMERIC;
  v_verified_fat NUMERIC;

  -- Differences
  v_cal_diff_pct NUMERIC;
  v_cal_diff_abs NUMERIC;
  v_protein_diff NUMERIC;
  v_carbs_diff NUMERIC;
  v_fat_diff NUMERIC;
  v_name_sim NUMERIC;

  -- Thresholds
  v_calorie_threshold CONSTANT NUMERIC := 5.0;  -- 5% difference
  v_protein_threshold CONSTANT NUMERIC := 3.0;  -- 3g difference
  v_name_threshold CONSTANT NUMERIC := 0.85;    -- 85% similarity

  -- Results
  v_has_mismatch BOOLEAN := false;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
  v_fields TEXT[] := ARRAY[]::TEXT[];
  v_confidence TEXT := 'high';
  v_recommendation TEXT;

BEGIN
  -- Normalize data
  v_ai_norm := normalize_nutrition_units(p_ai_guess);
  v_verified_norm := normalize_nutrition_units(p_verified);

  -- Extract values
  v_ai_cal := COALESCE((v_ai_norm->>'calories')::NUMERIC, 0);
  v_verified_cal := COALESCE((v_verified_norm->>'calories')::NUMERIC, 0);
  v_ai_protein := COALESCE((v_ai_norm->>'protein_g')::NUMERIC, 0);
  v_verified_protein := COALESCE((v_verified_norm->>'protein_g')::NUMERIC, 0);
  v_ai_carbs := COALESCE((v_ai_norm->>'carbs_g')::NUMERIC, 0);
  v_verified_carbs := COALESCE((v_verified_norm->>'carbs_g')::NUMERIC, 0);
  v_ai_fat := COALESCE((v_ai_norm->>'fat_g')::NUMERIC, 0);
  v_verified_fat := COALESCE((v_verified_norm->>'fat_g')::NUMERIC, 0);

  -- Calculate differences
  IF v_verified_cal > 0 THEN
    v_cal_diff_pct := abs(v_ai_cal - v_verified_cal) / v_verified_cal * 100;
    v_cal_diff_abs := abs(v_ai_cal - v_verified_cal);
  ELSE
    v_cal_diff_pct := 0;
    v_cal_diff_abs := 0;
  END IF;

  v_protein_diff := abs(v_ai_protein - v_verified_protein);
  v_carbs_diff := abs(v_ai_carbs - v_verified_carbs);
  v_fat_diff := abs(v_ai_fat - v_verified_fat);

  -- Check name similarity if provided
  IF p_ai_name IS NOT NULL AND p_verified_name IS NOT NULL THEN
    v_ai_name_norm := normalize_food_name(p_ai_name);
    v_verified_name_norm := normalize_food_name(p_verified_name);
    v_name_sim := levenshtein_similarity(v_ai_name_norm, v_verified_name_norm);
  ELSE
    v_name_sim := 1.0;  -- Assume match if not provided
  END IF;

  -- Check thresholds

  -- 1. Calorie mismatch (>=5% difference)
  IF v_cal_diff_pct >= v_calorie_threshold THEN
    v_has_mismatch := true;
    v_reasons := array_append(v_reasons, format('Calorie difference: %.1f%% (%.0f cal)', v_cal_diff_pct, v_cal_diff_abs));
    v_fields := array_append(v_fields, 'calories');
  END IF;

  -- 2. Protein mismatch (>=3g difference)
  IF v_protein_diff >= v_protein_threshold THEN
    v_has_mismatch := true;
    v_reasons := array_append(v_reasons, format('Protein difference: %.1fg', v_protein_diff));
    v_fields := array_append(v_fields, 'protein_g');
  END IF;

  -- 3. Name mismatch (<85% similarity)
  IF v_name_sim < v_name_threshold THEN
    v_has_mismatch := true;
    v_reasons := array_append(v_reasons, format('Name similarity: %.1f%% (threshold: 85%%)', v_name_sim * 100));
    v_fields := array_append(v_fields, 'name');
    v_confidence := 'low';  -- Low confidence if name doesn't match
  END IF;

  -- Determine confidence level
  IF array_length(v_fields, 1) >= 3 THEN
    v_confidence := 'low';
  ELSIF array_length(v_fields, 1) = 2 THEN
    v_confidence := 'medium';
  ELSIF v_has_mismatch THEN
    v_confidence := 'medium';
  ELSE
    v_confidence := 'high';
  END IF;

  -- Generate recommendation
  IF v_has_mismatch THEN
    v_recommendation := 'Review AI guess. ' || array_to_string(v_reasons, '; ');
  ELSE
    v_recommendation := 'AI guess matches verified data within acceptable thresholds';
  END IF;

  -- Return results
  RETURN QUERY
  SELECT
    v_has_mismatch,
    array_to_string(v_reasons, '; ') AS mismatch_reason,
    v_fields,
    v_confidence,
    v_cal_diff_pct,
    v_cal_diff_abs,
    v_protein_diff,
    v_carbs_diff,
    v_fat_diff,
    v_name_sim,
    (v_cal_diff_pct >= v_calorie_threshold) AS calorie_threshold_exceeded,
    (v_protein_diff >= v_protein_threshold) AS protein_threshold_exceeded,
    (v_name_sim < v_name_threshold) AS name_threshold_exceeded,
    v_recommendation;
END;
$$;

COMMENT ON FUNCTION detect_nutrition_mismatch IS
  'Detect mismatches between AI guess and verified nutrition data. Thresholds: calories >=5%, protein >=3g, name <85% similarity';

-- Grant permissions
GRANT EXECUTE ON FUNCTION levenshtein_similarity TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION normalize_food_name TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION normalize_nutrition_units TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION detect_nutrition_mismatch TO authenticated, service_role;

-- =====================================================
-- 5. EXAMPLE USAGE VIEW (for testing)
-- =====================================================

-- Create a test view showing how to use the function
COMMENT ON FUNCTION detect_nutrition_mismatch IS
  'Detect nutrition mismatches.

EXAMPLE USAGE:
SELECT * FROM detect_nutrition_mismatch(
  ''{"calories": 250, "protein_g": 10, "carbs_g": 30, "fat_g": 5}''::jsonb,  -- AI guess
  ''{"calories": 200, "protein_g": 8, "carbs_g": 28, "fat_g": 5}''::jsonb,   -- Verified
  ''Apple'',  -- AI name
  ''Granny Smith Apple''  -- Verified name
);

RETURNS:
- has_mismatch: true
- mismatch_reason: "Calorie difference: 25.0% (50 cal); Name similarity: 60.0%"
- mismatch_fields: {calories, name}
- confidence: medium
- recommendation: "Review AI guess. Calorie difference: 25.0%; Name mismatch"
';

-- =====================================================
-- 6. SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ MISMATCH DETECTION CREATED';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Functions Created:';
  RAISE NOTICE '  1. levenshtein_similarity(s1, s2) → 0-1 ratio';
  RAISE NOTICE '  2. normalize_food_name(name) → normalized text';
  RAISE NOTICE '  3. normalize_nutrition_units(jsonb) → normalized';
  RAISE NOTICE '  4. detect_nutrition_mismatch(ai, verified) → mismatch analysis';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️  Thresholds:';
  RAISE NOTICE '  • Calories: >=5%% difference';
  RAISE NOTICE '  • Protein: >=3g difference';
  RAISE NOTICE '  • Name: <85%% similarity (Levenshtein)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Returns:';
  RAISE NOTICE '  - has_mismatch (boolean)';
  RAISE NOTICE '  - mismatch_reason (text)';
  RAISE NOTICE '  - mismatch_fields (array)';
  RAISE NOTICE '  - confidence (low/medium/high)';
  RAISE NOTICE '  - Specific diffs (calories, protein, name)';
  RAISE NOTICE '  - Recommendation';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test Command:';
  RAISE NOTICE '  SELECT * FROM detect_nutrition_mismatch(';
  RAISE NOTICE '    ''{"calories": 250, "protein_g": 10}''::jsonb,';
  RAISE NOTICE '    ''{"calories": 200, "protein_g": 8}''::jsonb,';
  RAISE NOTICE '    ''Apple'', ''Granny Smith Apple''';
  RAISE NOTICE '  );';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

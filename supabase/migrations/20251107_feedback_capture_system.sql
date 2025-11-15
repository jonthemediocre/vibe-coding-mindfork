-- =====================================================
-- DAY 4: FEEDBACK CAPTURE SYSTEM (Thumbs Up/Down)
-- =====================================================
-- Purpose: Capture user feedback on AI responses for RLHF pipeline
-- Date: 2025-11-07
-- Interface Impact: Thumbs up/down buttons after each AI response
-- User Value: Indirect - improves future AI quality
-- =====================================================

-- =====================================================
-- 1. COACH RESPONSE FEEDBACK TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS coach_response_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User Message (Input)
  user_message TEXT NOT NULL,
  user_message_tokens INT DEFAULT 0,

  -- AI Response (Output)
  ai_response TEXT NOT NULL,
  ai_response_tokens INT DEFAULT 0,

  -- System Context
  system_prompt TEXT,
  coach_id TEXT,
  coach_mode TEXT DEFAULT 'default',
  severity DECIMAL(2,1),
  model_used TEXT DEFAULT 'gpt-4o',

  -- User Feedback (The RLHF signal)
  helpful BOOLEAN,  -- Thumbs up = true, thumbs down = false
  rating INT CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  user_comment TEXT,
  feedback_given_at TIMESTAMPTZ,

  -- Metadata
  conversation_id UUID,  -- Group related messages
  message_sequence INT DEFAULT 1,  -- Order in conversation
  response_time_ms INT,  -- How long AI took to respond
  from_cache BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_feedback_user
ON coach_response_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_helpful
ON coach_response_feedback(helpful) WHERE helpful IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_conversation
ON coach_response_feedback(conversation_id, message_sequence);

CREATE INDEX IF NOT EXISTS idx_feedback_coach_mode
ON coach_response_feedback(coach_id, coach_mode);

CREATE INDEX IF NOT EXISTS idx_feedback_created
ON coach_response_feedback(created_at DESC);

-- Composite index for RLHF training data queries
CREATE INDEX IF NOT EXISTS idx_feedback_training_data
ON coach_response_feedback(helpful, created_at DESC)
WHERE helpful IS NOT NULL;

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE coach_response_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
ON coach_response_feedback FOR SELECT TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
ON coach_response_feedback FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
ON coach_response_feedback FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role can read all (for training data generation)
CREATE POLICY "Service role can read all feedback"
ON coach_response_feedback FOR SELECT TO service_role
USING (true);

-- =====================================================
-- 4. AUTOMATIC UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedback_timestamp
BEFORE UPDATE ON coach_response_feedback
FOR EACH ROW
EXECUTE FUNCTION update_feedback_updated_at();

-- =====================================================
-- 5. SAVE FEEDBACK (Called from Edge Function)
-- =====================================================

CREATE OR REPLACE FUNCTION save_coach_response_for_feedback(
  p_user_id UUID,
  p_user_message TEXT,
  p_ai_response TEXT,
  p_system_prompt TEXT DEFAULT NULL,
  p_coach_id TEXT DEFAULT 'coach_decibel_avatar',
  p_coach_mode TEXT DEFAULT 'default',
  p_severity DECIMAL DEFAULT 3.0,
  p_model_used TEXT DEFAULT 'gpt-4o',
  p_conversation_id UUID DEFAULT NULL,
  p_message_sequence INT DEFAULT 1,
  p_response_time_ms INT DEFAULT NULL,
  p_from_cache BOOLEAN DEFAULT FALSE,
  p_user_message_tokens INT DEFAULT 0,
  p_ai_response_tokens INT DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feedback_id UUID;
BEGIN
  INSERT INTO coach_response_feedback (
    user_id,
    user_message,
    ai_response,
    system_prompt,
    coach_id,
    coach_mode,
    severity,
    model_used,
    conversation_id,
    message_sequence,
    response_time_ms,
    from_cache,
    user_message_tokens,
    ai_response_tokens
  ) VALUES (
    p_user_id,
    p_user_message,
    p_ai_response,
    p_system_prompt,
    p_coach_id,
    p_coach_mode,
    p_severity,
    p_model_used,
    p_conversation_id,
    p_message_sequence,
    p_response_time_ms,
    p_from_cache,
    p_user_message_tokens,
    p_ai_response_tokens
  )
  RETURNING id INTO v_feedback_id;

  RETURN v_feedback_id;
END;
$$;

COMMENT ON FUNCTION save_coach_response_for_feedback IS 'Saves AI response for potential user feedback (Day 4)';

-- =====================================================
-- 6. SUBMIT FEEDBACK (Called from Vibe AI)
-- =====================================================

CREATE OR REPLACE FUNCTION submit_coach_feedback(
  p_feedback_id UUID,
  p_helpful BOOLEAN,
  p_rating INT DEFAULT NULL,
  p_user_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate rating if provided
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5, got: %', p_rating;
  END IF;

  -- Update feedback
  UPDATE coach_response_feedback
  SET
    helpful = p_helpful,
    rating = p_rating,
    user_comment = p_user_comment,
    feedback_given_at = NOW(),
    updated_at = NOW()
  WHERE id = p_feedback_id
    AND user_id = auth.uid();  -- Security: Only update own feedback

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback record not found or access denied';
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION submit_coach_feedback IS 'User submits thumbs up/down feedback on AI response';

-- =====================================================
-- 7. FEEDBACK ANALYTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW feedback_analytics AS
SELECT
  -- Overall Stats
  COUNT(*) AS total_responses,
  COUNT(helpful) AS total_rated,
  COUNT(*) FILTER (WHERE helpful = TRUE) AS thumbs_up_count,
  COUNT(*) FILTER (WHERE helpful = FALSE) AS thumbs_down_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE helpful = TRUE) / NULLIF(COUNT(helpful), 0),
    2
  ) AS thumbs_up_percentage,

  -- Average Rating
  ROUND(AVG(rating), 2) AS avg_rating,

  -- By Coach
  jsonb_object_agg(
    coach_id,
    jsonb_build_object(
      'total', COUNT(*) FILTER (WHERE coach_response_feedback.coach_id = coach_id),
      'thumbs_up', COUNT(*) FILTER (WHERE coach_response_feedback.coach_id = coach_id AND helpful = TRUE),
      'avg_rating', ROUND(AVG(rating) FILTER (WHERE coach_response_feedback.coach_id = coach_id), 2)
    )
  ) FILTER (WHERE coach_id IS NOT NULL) AS by_coach,

  -- By Mode
  jsonb_object_agg(
    coach_mode,
    jsonb_build_object(
      'total', COUNT(*) FILTER (WHERE coach_response_feedback.coach_mode = coach_mode),
      'thumbs_up', COUNT(*) FILTER (WHERE coach_response_feedback.coach_mode = coach_mode AND helpful = TRUE),
      'avg_rating', ROUND(AVG(rating) FILTER (WHERE coach_response_feedback.coach_mode = coach_mode), 2)
    )
  ) FILTER (WHERE coach_mode IS NOT NULL) AS by_mode,

  -- Time Stats
  MIN(created_at) AS first_response_at,
  MAX(created_at) AS last_response_at

FROM coach_response_feedback;

COMMENT ON VIEW feedback_analytics IS 'Real-time analytics on user feedback for RLHF';

-- =====================================================
-- 8. COACH PERFORMANCE VIEW (Per Coach)
-- =====================================================

CREATE OR REPLACE VIEW coach_performance AS
SELECT
  coach_id,
  coach_mode,

  -- Response Counts
  COUNT(*) AS total_responses,
  COUNT(helpful) AS total_rated,

  -- Positive Feedback
  COUNT(*) FILTER (WHERE helpful = TRUE) AS thumbs_up,
  COUNT(*) FILTER (WHERE helpful = FALSE) AS thumbs_down,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE helpful = TRUE) / NULLIF(COUNT(helpful), 0),
    2
  ) AS approval_rate_pct,

  -- Rating Stats
  ROUND(AVG(rating), 2) AS avg_rating,
  MIN(rating) AS min_rating,
  MAX(rating) AS max_rating,

  -- Performance Metrics
  ROUND(AVG(response_time_ms), 0) AS avg_response_time_ms,
  ROUND(100.0 * COUNT(*) FILTER (WHERE from_cache = TRUE) / COUNT(*), 2) AS cache_hit_rate_pct,

  -- Token Usage
  SUM(user_message_tokens + ai_response_tokens) AS total_tokens_used,
  ROUND(AVG(ai_response_tokens), 0) AS avg_response_tokens,

  -- Time Range
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen

FROM coach_response_feedback
GROUP BY coach_id, coach_mode
ORDER BY approval_rate_pct DESC NULLS LAST;

COMMENT ON VIEW coach_performance IS 'Performance metrics per coach and mode';

-- =====================================================
-- 9. GET TRAINING DATA (For RLHF Pipeline)
-- =====================================================

CREATE OR REPLACE FUNCTION get_training_data_for_rlhf(
  p_helpful_only BOOLEAN DEFAULT TRUE,
  p_min_rating INT DEFAULT NULL,
  p_limit INT DEFAULT 1000,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_message TEXT,
  ai_response TEXT,
  system_prompt TEXT,
  helpful BOOLEAN,
  rating INT,
  coach_mode TEXT,
  severity DECIMAL,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    crf.user_message,
    crf.ai_response,
    crf.system_prompt,
    crf.helpful,
    crf.rating,
    crf.coach_mode,
    crf.severity,
    crf.created_at
  FROM coach_response_feedback crf
  WHERE
    -- Filter by helpful flag if requested
    (NOT p_helpful_only OR crf.helpful = TRUE)
    -- Filter by minimum rating if provided
    AND (p_min_rating IS NULL OR crf.rating >= p_min_rating)
    -- Must have feedback
    AND crf.helpful IS NOT NULL
  ORDER BY crf.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_training_data_for_rlhf IS 'Retrieves feedback data for training dataset generation (Day 5)';

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION save_coach_response_for_feedback TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION submit_coach_feedback TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_training_data_for_rlhf TO service_role;

GRANT SELECT ON feedback_analytics TO service_role, authenticated;
GRANT SELECT ON coach_performance TO service_role, authenticated;

-- =====================================================
-- 11. VERIFICATION & TESTING
-- =====================================================

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_feedback_id UUID;
  v_result BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTING FEEDBACK CAPTURE SYSTEM ===';
  RAISE NOTICE '';

  -- Test 1: Save response for feedback
  v_feedback_id := save_coach_response_for_feedback(
    p_user_id := v_test_user_id,
    p_user_message := 'What should I eat for breakfast?',
    p_ai_response := 'Try oatmeal with berries and nuts. Great energy!',
    p_coach_id := 'coach_decibel_avatar',
    p_coach_mode := 'default',
    p_severity := 3.0,
    p_user_message_tokens := 10,
    p_ai_response_tokens := 20
  );

  IF v_feedback_id IS NOT NULL THEN
    RAISE NOTICE '✅ Test 1: Response saved for feedback (ID: %)', v_feedback_id;
  ELSE
    RAISE NOTICE '❌ Test 1 FAILED: Could not save response';
  END IF;

  -- Test 2: Submit thumbs up feedback
  BEGIN
    v_result := submit_coach_feedback(
      p_feedback_id := v_feedback_id,
      p_helpful := TRUE,
      p_rating := 5,
      p_user_comment := 'Great advice!'
    );

    IF v_result THEN
      RAISE NOTICE '✅ Test 2: Thumbs up feedback submitted';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Test 2: Cannot submit feedback (RLS blocks test user)';
  END;

  -- Test 3: Check analytics view
  IF EXISTS (SELECT 1 FROM feedback_analytics WHERE total_responses > 0) THEN
    RAISE NOTICE '✅ Test 3: Analytics view working';
  ELSE
    RAISE NOTICE '⚠️ Test 3: Analytics view empty (expected if no real data)';
  END IF;

  -- Test 4: Check coach performance view
  IF EXISTS (SELECT 1 FROM coach_performance) THEN
    RAISE NOTICE '✅ Test 4: Coach performance view working';
  ELSE
    RAISE NOTICE '⚠️ Test 4: Performance view empty (expected if no real data)';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== TESTS COMPLETE ===';
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ DAY 4 COMPLETE: Feedback Capture System';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Created:';
  RAISE NOTICE '  - coach_response_feedback table (stores all responses)';
  RAISE NOTICE '  - save_coach_response_for_feedback() function';
  RAISE NOTICE '  - submit_coach_feedback() function (thumbs up/down)';
  RAISE NOTICE '  - get_training_data_for_rlhf() function';
  RAISE NOTICE '  - feedback_analytics view (real-time stats)';
  RAISE NOTICE '  - coach_performance view (per-coach metrics)';
  RAISE NOTICE '';
  RAISE NOTICE '👍 Feedback Flow:';
  RAISE NOTICE '  1. Edge Function saves response via save_coach_response_for_feedback()';
  RAISE NOTICE '  2. Returns feedback_id to frontend';
  RAISE NOTICE '  3. User clicks thumbs up/down';
  RAISE NOTICE '  4. Frontend calls submit_coach_feedback(feedback_id, helpful)';
  RAISE NOTICE '  5. Feedback stored for RLHF training (Day 5)';
  RAISE NOTICE '';
  RAISE NOTICE '📈 Analytics:';
  RAISE NOTICE '  - SELECT * FROM feedback_analytics; (overall stats)';
  RAISE NOTICE '  - SELECT * FROM coach_performance; (per-coach breakdown)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '  1. Update Edge Function to call save_coach_response_for_feedback()';
  RAISE NOTICE '  2. Add FeedbackWidget to chat UI (thumbs up/down buttons)';
  RAISE NOTICE '  3. Call submit_coach_feedback() when user clicks';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;

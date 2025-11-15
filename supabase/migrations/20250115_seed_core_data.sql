-- Seed data for MindFork Supabase backend
-- Purpose: Populate community food tables, voice recordings, app versions, analytics events, and outreach history
-- Safe to re-run; statements check for existing rows before inserting.

DO $$
DECLARE
  primary_user uuid;
  secondary_user uuid;
  verifier_user uuid;
  foods_seeded integer := 0;
  verifications_seeded integer := 0;
  voices_seeded integer := 0;
  app_versions_seeded integer := 0;
  analytics_seeded integer := 0;
  outreach_seeded integer := 0;
BEGIN
  SELECT id INTO primary_user FROM auth.users ORDER BY created_at LIMIT 1;
  IF primary_user IS NULL THEN
    RAISE NOTICE '⚠️ No users found in auth.users. Seed script skipped.';
    RETURN;
  END IF;

  SELECT id INTO secondary_user FROM auth.users ORDER BY created_at OFFSET 1 LIMIT 1;
  verifier_user := COALESCE(secondary_user, primary_user);

  -- Seed community foods
  WITH candidate_foods AS (
    SELECT * FROM (
      VALUES
        ('Protein Overnight Oats','MindFork Test Kitchen','1 jar (240g)',380,24,42,12,8,260,10,'user_added','openfoodfacts','https://example.com/images/oats.jpg','1234567890123'),
        ('Citrus Recovery Smoothie','MindFork Test Kitchen','1 bottle (355ml)',210,18,28,6,5,75,20,'user_added','fatsecret','https://example.com/images/smoothie.jpg','9876543210987'),
        ('Southwest Power Bowl','MindFork Test Kitchen','1 bowl (420g)',540,30,52,18,12,820,8,'user_corrected','usda','https://example.com/images/power-bowl.jpg','4567890123456')
    ) AS f(food_name,brand,serving_size,calories,protein_g,carbs_g,fat_g,fiber_g,sodium_mg,sugar_g,source_type,original_source,photo_url,barcode)
  )
  INSERT INTO public.user_contributed_foods (
    id, food_name, brand, serving_size, calories,
    protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g,
    contributed_by, verification_count, trust_score,
    source_type, original_source, photo_url, barcode, search_vector
  )
  SELECT
    gen_random_uuid(),
    f.food_name,
    f.brand,
    f.serving_size,
    f.calories,
    f.protein_g,
    f.carbs_g,
    f.fat_g,
    f.fiber_g,
    f.sodium_mg,
    f.sugar_g,
    primary_user,
    CASE WHEN f.food_name = 'Protein Overnight Oats' THEN 0 WHEN f.food_name = 'Citrus Recovery Smoothie' THEN 1 ELSE 2 END,
    CASE WHEN f.food_name = 'Protein Overnight Oats' THEN 82 WHEN f.food_name = 'Citrus Recovery Smoothie' THEN 88 ELSE 76 END,
    f.source_type,
    f.original_source,
    f.photo_url,
    f.barcode,
    setweight(to_tsvector('english', f.food_name), 'A') || setweight(to_tsvector('english', COALESCE(f.brand,'')), 'B')
  FROM candidate_foods f
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_contributed_foods existing
    WHERE existing.contributed_by = primary_user
      AND LOWER(existing.food_name) = LOWER(f.food_name)
  );
  GET DIAGNOSTICS foods_seeded = ROW_COUNT;

  -- Seed verifications
  WITH target_foods AS (
    SELECT id, food_name
    FROM public.user_contributed_foods
    WHERE contributed_by = primary_user
      AND food_name IN ('Protein Overnight Oats','Citrus Recovery Smoothie','Southwest Power Bowl')
  )
  INSERT INTO public.nutrition_verifications (
    id, food_id, verified_by, is_accurate, corrected_values, reason
  )
  SELECT
    gen_random_uuid(),
    tf.id,
    verifier_user,
    (tf.food_name <> 'Southwest Power Bowl'),
    CASE WHEN tf.food_name = 'Southwest Power Bowl'
      THEN jsonb_build_object('sodium_mg', 750, 'trust_note', 'Adjusted sodium after label review')
      ELSE NULL END,
    CASE WHEN tf.food_name = 'Southwest Power Bowl'
      THEN 'Reduced sodium per updated packaging'
      ELSE 'Confirmed accuracy' END
  FROM target_foods tf
  WHERE NOT EXISTS (
    SELECT 1 FROM public.nutrition_verifications existing
    WHERE existing.food_id = tf.id
      AND existing.verified_by = verifier_user
  );
  GET DIAGNOSTICS verifications_seeded = ROW_COUNT;

  -- Seed voice recordings
  INSERT INTO public.voice_recordings (
    id, user_id, coach_id, audio_url, transcript,
    coaching_mode, duration_seconds, share_count,
    is_public, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    primary_user,
    coaches.id,
    'https://storage.googleapis.com/mindfork-demo/audio/' || coaches.name || '-intro.mp3',
    'Keep going! Your consistency this week is paying off.',
    'default',
    42,
    CASE WHEN coaches.name = 'Blaze' THEN 5 WHEN coaches.name = 'Nora' THEN 3 ELSE 0 END,
    (coaches.name IN ('Nora','Blaze')),
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  FROM coaches
  WHERE name IN ('Nora','Blaze','Kai')
    AND NOT EXISTS (
      SELECT 1
      FROM public.voice_recordings existing
      WHERE existing.user_id = primary_user
        AND existing.coach_id = coaches.id
        AND existing.audio_url = 'https://storage.googleapis.com/mindfork-demo/audio/' || coaches.name || '-intro.mp3'
    );
  GET DIAGNOSTICS voices_seeded = ROW_COUNT;

  -- Seed app versions
  INSERT INTO public.user_app_versions (
    id, user_id, app_version, platform, device_model, os_version,
    first_seen_at, last_seen_at
  )
  SELECT
    gen_random_uuid(),
    u.user_id,
    v.app_version,
    v.platform,
    v.device_model,
    v.os_version,
    NOW() - INTERVAL '5 days',
    NOW()
  FROM (VALUES (primary_user), (COALESCE(secondary_user, primary_user))) AS u(user_id)
  CROSS JOIN (
    VALUES
      ('1.0.0','ios','iPhone 15 Pro','iOS 18.2'),
      ('1.0.1','android','Pixel 8 Pro','Android 15')
  ) AS v(app_version,platform,device_model,os_version)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_app_versions existing
    WHERE existing.user_id = u.user_id
      AND existing.app_version = v.app_version
      AND existing.platform = v.platform
  );
  GET DIAGNOSTICS app_versions_seeded = ROW_COUNT;

  -- Seed analytics events
  WITH event_candidates AS (
    SELECT *
    FROM (
      VALUES
        ('coach_message_sent','coaching',jsonb_build_object('coach_id','nora_gentle'),'CoachScreen','MessageComposer',1800,true),
        ('meal_logged','nutrition',jsonb_build_object('meal_type','lunch','calories',520),'FoodLogScreen','MealCard',900,true),
        ('streak_warning_viewed','engagement',jsonb_build_object('streak_days',6),'DashboardScreen','StreakCard',600,false)
    ) AS e(event_name,event_category,properties,screen_name,component_name,duration_ms,success)
  )
  INSERT INTO public.user_events (
    id, user_id, session_id, event_name, event_category,
    properties, screen_name, component_name, duration_ms,
    success, event_time
  )
  SELECT
    gen_random_uuid(),
    primary_user,
    'seed-session-' || to_char(NOW(), 'YYYYMMDD'),
    ec.event_name,
    ec.event_category,
    ec.properties,
    ec.screen_name,
    ec.component_name,
    ec.duration_ms,
    ec.success,
    NOW() - (ROW_NUMBER() OVER (ORDER BY ec.event_name) * INTERVAL '10 minutes')
  FROM event_candidates ec
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_events existing
    WHERE existing.user_id = primary_user
      AND existing.session_id = 'seed-session-' || to_char(NOW(), 'YYYYMMDD')
      AND existing.event_name = ec.event_name
  );
  GET DIAGNOSTICS analytics_seeded = ROW_COUNT;

  -- Seed outreach history
  INSERT INTO public.outreach_history (
    id, user_id, trigger_rule_id, coach_id, outreach_type,
    phone_number, message_content, twilio_sid,
    status, cost_usd, duration_seconds, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    primary_user,
    tr.id,
    'nora_gentle',
    'sms',
    '+15555550123',
    'Hey there! Just a reminder to log dinner before bed. You''ve got this! – Nora',
    'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'delivered',
    0.0075,
    NULL,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  FROM trigger_rules tr
  WHERE tr.name = 'Dinner Reminder - Missed Window'
    AND NOT EXISTS (
      SELECT 1 FROM public.outreach_history existing
      WHERE existing.user_id = primary_user
        AND existing.trigger_rule_id = tr.id
        AND existing.twilio_sid = 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    );
  GET DIAGNOSTICS outreach_seeded = ROW_COUNT;

  RAISE NOTICE '✅ Seed complete: foods=%, verifications=%, voices=%, app_versions=%, analytics=%, outreach=%',
    foods_seeded, verifications_seeded, voices_seeded, app_versions_seeded, analytics_seeded, outreach_seeded;
END
$$;

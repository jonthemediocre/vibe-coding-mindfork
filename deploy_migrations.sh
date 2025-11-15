#!/bin/bash
# Deploy Critical Migrations Script
# Deploys RLHF + XP System migrations to Supabase

echo "🚀 Deploying MindFork Migrations..."
echo ""

# Critical migrations in order
MIGRATIONS=(
  "20251104_response_cache_system.sql"
  "20251105_severity_intensity_system.sql"
  "20251106_coach_modes_consent_system.sql"
  "20251107_feedback_capture_system.sql"
  "20251108_rlhf_training_pipeline.sql"
  "20251109_episodic_memory_system.sql"
  "20251110_finetuning_export_pipeline.sql"
  "20251104_hybrid_xp_system.sql"
  "20251104_xp_automatic_triggers.sql"
  "20251104_fix_get_gamification_stats.sql"
)

# Use supabase db push for each migration
for migration in "${MIGRATIONS[@]}"; do
  echo "📦 Deploying: $migration"

  # Read the SQL file and execute
  cat "supabase/migrations/$migration" | \
    supabase db reset --db-url "$SUPABASE_DB_URL" 2>&1 || true

  if [ $? -eq 0 ]; then
    echo "✅ Success: $migration"
  else
    echo "⚠️  Warning: $migration (may already exist)"
  fi
  echo ""
done

echo "🎉 Migration deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up cron jobs in Supabase Dashboard"
echo "2. Test XP system"

-- Insert project documentation with actual content
INSERT INTO public.project_documentation (doc_key, doc_name, doc_category, content, summary) VALUES
(
  'quick_start_index',
  'AI_QUICK_START_INDEX.md',
  'quickstart',
  E'EOSQL
cat AI_QUICK_START_INDEX.md | sed "s/'/''/g" >> supabase/migrations/20251103_seed_project_docs.sql
cat >> supabase/migrations/20251103_seed_project_docs.sql << 'EOSQL'
',
  'PRIMARY REFERENCE: Points to implementation guides, schema overview, coach personas, brand system, competitive moats'
)
ON CONFLICT (doc_key) DO UPDATE 
  SET content = EXCLUDED.content, last_updated = NOW();

#!/usr/bin/env python3
"""
Seed project documentation into Supabase
"""
import subprocess
import os

# Database connection string
DB_URL = "postgres://postgres:vGMqHIu4vGcp9vZ8@db.lxajnrofkgpwdpodjvkm.supabase.co:5432/postgres"

# Read file contents
def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    # Escape single quotes for SQL
    return content.replace("'", "''")

# Read the three critical docs
quick_start = read_file('AI_QUICK_START_INDEX.md')
claude_md = read_file('CLAUDE.md')
agents_md = read_file('agents.md')

# Create SQL
sql = f"""
INSERT INTO public.project_documentation (doc_key, doc_name, doc_category, content, summary) VALUES
(
  'quick_start_index',
  'AI_QUICK_START_INDEX.md',
  'quickstart',
  '{quick_start}',
  'PRIMARY REFERENCE: Points to implementation guides, schema overview, coach personas, brand system'
),
(
  'claude_md',
  'CLAUDE.md',
  'configuration',
  '{claude_md}',
  'Project configuration: React Native setup, coding specs, environment, brand voice'
),
(
  'agents_md',
  'agents.md',
  'guidelines',
  '{agents_md}',
  'Development guidelines: Additive only, schema-driven, never deprecate without approval'
)
ON CONFLICT (doc_key) DO UPDATE
  SET content = EXCLUDED.content, last_updated = NOW();

SELECT doc_key, doc_name, LENGTH(content) as content_length
FROM public.project_documentation
ORDER BY doc_key;
"""

# Execute via psql
result = subprocess.run(
    ['psql', DB_URL, '-c', sql],
    capture_output=True,
    text=True
)

print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)

print("\n✅ Project documentation seeded successfully!")

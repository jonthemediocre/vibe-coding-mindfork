-- =====================================================
-- STORE PROJECT DOCUMENTATION IN DATABASE
-- =====================================================
-- Purpose: Store CLAUDE.md and agents.md in Supabase
--          so sandbox AI can query for project guidelines
-- Date: 2025-11-03
-- =====================================================

-- =====================================================
-- 1. PROJECT DOCUMENTATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_key TEXT NOT NULL UNIQUE, -- 'claude_md', 'agents_md', 'quick_start_index'
  doc_name TEXT NOT NULL,
  doc_category TEXT NOT NULL CHECK (doc_category IN ('configuration', 'guidelines', 'reference', 'quickstart')),

  -- Content
  content TEXT NOT NULL,
  summary TEXT,

  -- Metadata
  version TEXT DEFAULT '1.0',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_documentation_key
  ON public.project_documentation(doc_key);

CREATE INDEX IF NOT EXISTS idx_project_documentation_category
  ON public.project_documentation(doc_category);

COMMENT ON TABLE public.project_documentation IS 'Critical project documentation for AI agents (CLAUDE.md, agents.md, etc)';
COMMENT ON COLUMN public.project_documentation.doc_key IS 'Unique identifier: claude_md, agents_md, quick_start_index, competitive_moats, etc';

-- =====================================================
-- 2. RLS POLICIES - Public Read
-- =====================================================

ALTER TABLE public.project_documentation ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_documentation_select_all
  ON public.project_documentation
  FOR SELECT
  USING (is_active = TRUE);

-- Service role can manage
CREATE POLICY project_documentation_manage
  ON public.project_documentation
  USING (auth.role() = 'service_role');

-- =====================================================
-- 3. HELPER FUNCTION: Get Project Doc
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_project_doc(p_doc_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'doc_key', doc_key,
    'doc_name', doc_name,
    'content', content,
    'summary', summary,
    'version', version,
    'last_updated', last_updated
  ) INTO v_result
  FROM public.project_documentation
  WHERE doc_key = p_doc_key
    AND is_active = TRUE;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_project_doc IS 'Get a specific project documentation by key';

-- =====================================================
-- 4. HELPER FUNCTION: Get All Active Docs
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_all_project_docs()
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'doc_key', doc_key,
      'doc_name', doc_name,
      'doc_category', doc_category,
      'summary', summary,
      'version', version,
      'last_updated', last_updated
    ) ORDER BY doc_category, doc_name
  ) INTO v_result
  FROM public.project_documentation
  WHERE is_active = TRUE;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_all_project_docs IS 'Get list of all active project documentation (without full content)';

-- =====================================================
-- DONE: Table created, ready for content insertion
-- =====================================================

-- Example usage for AI:
-- SELECT get_project_doc('claude_md');
-- SELECT get_project_doc('agents_md');
-- SELECT get_all_project_docs(); -- See available docs
-- SELECT content FROM project_documentation WHERE doc_key = 'quick_start_index';

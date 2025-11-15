-- =============================================================================
-- Fix challenge_participants RLS recursion (error 42P17)
-- Created: 2025-11-13
-- Purpose:
--   * Replace self-referential policies that caused infinite recursion
--   * Introduce helper function evaluated outside RLS to validate access
-- =============================================================================

-- Drop legacy policies to ensure a clean slate
DROP POLICY IF EXISTS "challenge_participants_select_policy" ON public.challenge_participants;
DROP POLICY IF EXISTS "Users can view challenge participants" ON public.challenge_participants;

-- Helper: determine if a viewer can inspect participants of a challenge
CREATE OR REPLACE FUNCTION public.can_view_challenge_participants(
    p_challenge_id UUID,
    p_viewer_id UUID
) RETURNS BOOLEAN
AS $$
BEGIN
    IF p_viewer_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Viewer is a participant
    IF EXISTS (
        SELECT 1
        FROM public.challenge_participants cp
        WHERE cp.challenge_id = p_challenge_id
          AND cp.user_id = p_viewer_id
    ) THEN
        RETURN TRUE;
    END IF;

    -- Viewer created the challenge or it is marked public
    IF EXISTS (
        SELECT 1
        FROM public.challenges c
        WHERE c.id = p_challenge_id
          AND (
            c.is_public IS TRUE
            OR c.created_by_user_id = p_viewer_id
          )
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

COMMENT ON FUNCTION public.can_view_challenge_participants(UUID, UUID) IS
    'Determines if the viewer can see challenge participant rows without triggering recursive RLS policies.';

-- Grant usage to standard roles
GRANT EXECUTE ON FUNCTION public.can_view_challenge_participants(UUID, UUID)
    TO authenticated, service_role, anon;

-- Recreate SELECT policy without self-referential subqueries
CREATE POLICY challenge_participants_select_policy ON public.challenge_participants
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.can_view_challenge_participants(challenge_id, auth.uid())
    );

COMMENT ON POLICY challenge_participants_select_policy ON public.challenge_participants IS
    'Allows users to read their own participation rows or participants for public/owned/joined challenges via helper function.';

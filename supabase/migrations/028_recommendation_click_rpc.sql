-- ============================================================
-- Migration 028 — Recommendation click-tracking RPC
-- ============================================================
-- Lets an authenticated customer mark one of their own recommendation
-- impressions as clicked, without needing service-role access. Used by
-- the "Recommended for you" rail after the ai-recommendation Edge
-- Function has already inserted the impression rows.

CREATE OR REPLACE FUNCTION public.record_recommendation_click(event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_recommendation_events
  SET    clicked = true
  WHERE  id = event_id
    AND  user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.record_recommendation_click IS
  'Marks a recommendation impression as clicked. Restricted to the impression owner via auth.uid() check inside the function body.';

GRANT EXECUTE ON FUNCTION public.record_recommendation_click(uuid) TO authenticated;

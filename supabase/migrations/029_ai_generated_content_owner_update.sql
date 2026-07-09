-- ============================================================
-- Migration 029 — Allow venue org members to approve/reject AI drafts
-- ============================================================
-- ai_generated_content previously only had SELECT for org members
-- (ai_content.select.owner) and ALL for admins — meaning only admins
-- could ever move a draft to approved/rejected. The venue description
-- generator needs the venue owner/staff themselves to do this via a
-- Server Action running under their own session (RLS-enforced, no
-- service-role escalation), so add a scoped UPDATE policy. Row
-- creation still only happens from the ai-venue-description Edge
-- Function's service-role client, which bypasses RLS by design —
-- org members are not granted INSERT here.

CREATE POLICY "ai_content.update.owner" ON public.ai_generated_content
  FOR UPDATE
  USING      (public.is_org_member_for_venue(venue_id))
  WITH CHECK (public.is_org_member_for_venue(venue_id));

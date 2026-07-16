-- ============================================================
-- Migration 077 - Fix organization_members status schema drift
-- ============================================================
-- Reasserts the correct function definitions for organization membership checks.
-- This resolves a schema drift issue where a live database function was modified
-- out-of-band to query organization_members.status (which does not exist).

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = org_id AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member_for_venue(p_venue_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = p_venue_id AND public.is_org_member(v.organization_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member_for_booking(p_booking_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = p_booking_id AND public.is_org_member_for_venue(b.venue_id)
  );
END;
$$;

-- Migration: 20260724_fix_venue_grants.sql
-- Description: Grant SELECT on venues to anon and authenticated roles

BEGIN;

GRANT SELECT ON public.venues TO anon, authenticated;

COMMIT;

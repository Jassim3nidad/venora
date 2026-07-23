-- Migration: 20260723100003_venue_blackout_dates.sql
-- Description: Venue blackout dates table and RLS policies

BEGIN;

CREATE TABLE IF NOT EXISTS public.venue_blackout_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('blackout', 'maintenance', 'private_event', 'holiday', 'custom')) DEFAULT 'blackout',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_blackout_date_range CHECK (end_date >= start_date)
);

ALTER TABLE public.venue_blackout_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view venue blackout dates"
  ON public.venue_blackout_dates FOR SELECT
  USING (true);

CREATE POLICY "Venue staff can manage blackout dates"
  ON public.venue_blackout_dates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      JOIN public.organization_members om ON om.organization_id = v.organization_id
      WHERE v.id = venue_blackout_dates.venue_id AND om.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

COMMIT;

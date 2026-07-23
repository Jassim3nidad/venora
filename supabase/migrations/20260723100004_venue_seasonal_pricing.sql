-- Migration: 20260723100004_venue_seasonal_pricing.sql
-- Description: Venue seasonal pricing multipliers table and RLS policies

BEGIN;

CREATE TABLE IF NOT EXISTS public.venue_seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
  flat_surcharge NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_seasonal_date_range CHECK (end_date >= start_date)
);

ALTER TABLE public.venue_seasonal_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view venue seasonal pricing"
  ON public.venue_seasonal_pricing FOR SELECT
  USING (true);

CREATE POLICY "Venue owners can manage seasonal pricing"
  ON public.venue_seasonal_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      JOIN public.organization_members om ON om.organization_id = v.organization_id
      WHERE v.id = venue_seasonal_pricing.venue_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'coordinator')
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

COMMIT;

-- Repair hosted drift where venue_blackout_dates migration history exists
-- but the table is absent. Uses current Venora authorization helpers.

BEGIN;

CREATE TABLE IF NOT EXISTS public.venue_blackout_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL DEFAULT 'blackout'
    CHECK (reason IN ('blackout', 'maintenance', 'private_event', 'holiday', 'custom')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_blackout_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_venue_blackout_dates_venue_range
  ON public.venue_blackout_dates(venue_id, start_date, end_date);

ALTER TABLE public.venue_blackout_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view venue blackout dates"
  ON public.venue_blackout_dates;
DROP POLICY IF EXISTS "Venue staff can manage blackout dates"
  ON public.venue_blackout_dates;

CREATE POLICY "Public can view venue blackout dates"
  ON public.venue_blackout_dates FOR SELECT
  USING (true);

CREATE POLICY "Venue staff can manage blackout dates"
  ON public.venue_blackout_dates FOR ALL TO authenticated
  USING (
    public.is_org_member_for_venue(venue_id)
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_org_member_for_venue(venue_id)
    OR public.is_admin()
  );

COMMENT ON TABLE public.venue_blackout_dates IS
  'Date ranges excluded from venue booking and smart auto-accept eligibility.';

COMMIT;

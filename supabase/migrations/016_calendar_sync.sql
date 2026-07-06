-- ============================================================
-- Migration 016 — Calendar Sync
-- ============================================================

CREATE TABLE public.venue_calendar_sync (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id       uuid        NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name           text        NOT NULL, -- e.g. "Airbnb", "Booking.com"
  sync_url       text        NOT NULL,
  last_synced_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_sync_venue ON public.venue_calendar_sync(venue_id);

CREATE TRIGGER venue_calendar_sync_updated_at
  BEFORE UPDATE ON public.venue_calendar_sync
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.venue_calendar_sync IS 'Stores external iCal URLs for a venue to sync availability.';

-- RLS
ALTER TABLE public.venue_calendar_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_owner_calendar_sync_select"
  ON public.venue_calendar_sync FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_calendar_sync.venue_id
      AND v.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "venue_owner_calendar_sync_insert"
  ON public.venue_calendar_sync FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id
      AND v.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "venue_owner_calendar_sync_update"
  ON public.venue_calendar_sync FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id
      AND v.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "venue_owner_calendar_sync_delete"
  ON public.venue_calendar_sync FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id
      AND v.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
    OR public.is_admin()
  );

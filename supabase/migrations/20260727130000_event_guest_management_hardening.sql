-- Harden event guest ownership and privacy before enabling guest management.
-- Public RSVP is intentionally out of scope. A future RSVP flow must use a
-- narrowly scoped RPC instead of granting direct table access.

BEGIN;

ALTER TABLE public.event_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own event guests"
  ON public.event_guests;
DROP POLICY IF EXISTS "Public RSVP response by invitation token"
  ON public.event_guests;
DROP POLICY IF EXISTS "event_guests.select.own"
  ON public.event_guests;
DROP POLICY IF EXISTS "event_guests.insert.own"
  ON public.event_guests;
DROP POLICY IF EXISTS "event_guests.update.own"
  ON public.event_guests;
DROP POLICY IF EXISTS "event_guests.delete.own"
  ON public.event_guests;

REVOKE ALL ON TABLE public.event_guests FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.event_guests TO authenticated;

CREATE POLICY "event_guests.select.own"
  ON public.event_guests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "event_guests.insert.own"
  ON public.event_guests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      booking_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.bookings AS booking
        WHERE booking.id = event_guests.booking_id
          AND booking.customer_id = auth.uid()
      )
    )
  );

CREATE POLICY "event_guests.update.own"
  ON public.event_guests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      booking_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.bookings AS booking
        WHERE booking.id = event_guests.booking_id
          AND booking.customer_id = auth.uid()
      )
    )
  );

CREATE POLICY "event_guests.delete.own"
  ON public.event_guests
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS event_guests_set_updated_at
  ON public.event_guests;
CREATE TRIGGER event_guests_set_updated_at
  BEFORE UPDATE ON public.event_guests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_event_guests_user_created
  ON public.event_guests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_guests_user_booking
  ON public.event_guests(user_id, booking_id);

COMMIT;

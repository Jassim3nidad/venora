-- ============================================================
-- Migration 068 - Enforce booking availability integrity
-- ============================================================
-- Closes direct table-write bypasses around venue availability.
-- Booking creation still goes through create_booking_inquiry(), while
-- table-level triggers protect admin/trusted writes and venue-owner date moves.

CREATE OR REPLACE FUNCTION public.is_active_booking_status(
  p_status public.booking_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT p_status::text IN (
    'pending',
    'approved',
    'payment_pending',
    'confirmed',
    'completed',
    'reviewed'
  );
$$;

CREATE OR REPLACE FUNCTION public.assert_booking_slot_available(
  p_venue_id uuid,
  p_event_date date,
  p_booking_id uuid DEFAULT NULL,
  p_require_published boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_venue_status public.venue_status;
  v_availability_status public.availability_status;
  v_same_active_booking boolean := false;
  v_has_conflict boolean := false;
BEGIN
  IF p_venue_id IS NULL THEN
    RAISE EXCEPTION 'Venue is required';
  END IF;

  IF p_event_date IS NULL THEN
    RAISE EXCEPTION 'Event date is required';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_venue_id::text || ':' || p_event_date::text, 0)
  );

  SELECT status INTO v_venue_status
  FROM public.venues
  WHERE id = p_venue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This venue is not available for booking';
  END IF;

  IF p_require_published AND v_venue_status <> 'published' THEN
    RAISE EXCEPTION 'This venue is not available for booking';
  END IF;

  IF p_event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Event date must be today or later';
  END IF;

  SELECT status INTO v_availability_status
  FROM public.venue_availability
  WHERE venue_id = p_venue_id
    AND date = p_event_date;

  IF FOUND THEN
    IF v_availability_status IN ('maintenance', 'blackout') THEN
      RAISE EXCEPTION 'This venue is unavailable on the selected date';
    END IF;

    IF v_availability_status IN ('tentative', 'reserved') THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.id = p_booking_id
          AND b.venue_id = p_venue_id
          AND b.event_date = p_event_date
          AND public.is_active_booking_status(b.status)
      )
      INTO v_same_active_booking;

      IF NOT v_same_active_booking THEN
        RAISE EXCEPTION 'This venue is unavailable on the selected date';
      END IF;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.venue_id = p_venue_id
      AND b.event_date = p_event_date
      AND public.is_active_booking_status(b.status)
      AND (p_booking_id IS NULL OR b.id <> p_booking_id)
  )
  INTO v_has_conflict;

  IF v_has_conflict THEN
    RAISE EXCEPTION 'This venue already has an active booking for the selected date';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_booking_slot_available(uuid, date, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_booking_slot_available(uuid, date, uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.assert_booking_slot_available(uuid, date, uuid, boolean) FROM authenticated;

CREATE OR REPLACE FUNCTION public.enforce_booking_availability_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF public.is_active_booking_status(NEW.status) THEN
    PERFORM public.assert_booking_slot_available(
      NEW.venue_id,
      NEW.event_date,
      NEW.id,
      TG_OP = 'INSERT'
        OR (
          TG_OP = 'UPDATE'
          AND OLD.venue_id IS DISTINCT FROM NEW.venue_id
        )
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_booking_availability_integrity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_booking_availability_integrity() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_booking_availability_integrity() FROM authenticated;

DROP TRIGGER IF EXISTS bookings_enforce_availability_integrity ON public.bookings;
CREATE TRIGGER bookings_enforce_availability_integrity
  BEFORE INSERT OR UPDATE OF venue_id, event_date, status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_availability_integrity();

CREATE OR REPLACE FUNCTION public.sync_availability_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  target_status public.availability_status;
  has_other_active boolean;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       OLD.event_date IS DISTINCT FROM NEW.event_date
       OR OLD.venue_id IS DISTINCT FROM NEW.venue_id
     ) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.venue_id = OLD.venue_id
        AND b.event_date = OLD.event_date
        AND b.id <> NEW.id
        AND public.is_active_booking_status(b.status)
    )
    INTO has_other_active;

    IF NOT has_other_active THEN
      UPDATE public.venue_availability
      SET status = 'available'
      WHERE venue_id = OLD.venue_id
        AND date = OLD.event_date
        AND status IN ('tentative', 'reserved');
    END IF;
  END IF;

  IF NEW.status::text IN ('pending', 'approved', 'payment_pending') THEN
    target_status := 'tentative';
  ELSIF NEW.status::text IN ('confirmed', 'completed', 'reviewed') THEN
    target_status := 'reserved';
  ELSE
    target_status := NULL;
  END IF;

  IF target_status IS NOT NULL THEN
    INSERT INTO public.venue_availability (venue_id, date, status)
    VALUES (NEW.venue_id, NEW.event_date, target_status)
    ON CONFLICT (venue_id, date) DO UPDATE
      SET status = EXCLUDED.status
      WHERE public.venue_availability.status NOT IN ('maintenance', 'blackout');

    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.venue_id = NEW.venue_id
      AND b.event_date = NEW.event_date
      AND b.id <> NEW.id
      AND public.is_active_booking_status(b.status)
  )
  INTO has_other_active;

  IF NOT has_other_active THEN
    UPDATE public.venue_availability
    SET status = 'available'
    WHERE venue_id = NEW.venue_id
      AND date = NEW.event_date
      AND status IN ('tentative', 'reserved');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_sync_availability ON public.bookings;
CREATE TRIGGER bookings_sync_availability
  AFTER INSERT OR UPDATE OF status, event_date, venue_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_availability_on_booking();

CREATE OR REPLACE FUNCTION public.create_booking_inquiry(
  p_venue_id uuid,
  p_package_id uuid,
  p_event_date date,
  p_guest_count int,
  p_special_requests text DEFAULT NULL,
  p_event_start_time time DEFAULT NULL,
  p_event_end_time time DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_venue public.venues%ROWTYPE;
  v_package public.venue_packages%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to submit a booking inquiry';
  END IF;

  SELECT * INTO v_venue
  FROM public.venues
  WHERE id = p_venue_id
    AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This venue is not available for booking';
  END IF;

  IF p_guest_count < COALESCE(v_venue.capacity_min, 1)
     OR p_guest_count > v_venue.capacity_max THEN
    RAISE EXCEPTION 'Guest count is outside this venue capacity';
  END IF;

  IF p_package_id IS NOT NULL THEN
    SELECT * INTO v_package
    FROM public.venue_packages
    WHERE id = p_package_id
      AND venue_id = p_venue_id
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected package is not available for this venue';
    END IF;

    IF v_package.min_guests IS NOT NULL AND p_guest_count < v_package.min_guests THEN
      RAISE EXCEPTION 'Guest count is below the selected package minimum';
    END IF;

    IF v_package.max_guests IS NOT NULL AND p_guest_count > v_package.max_guests THEN
      RAISE EXCEPTION 'Guest count exceeds the selected package maximum';
    END IF;
  END IF;

  PERFORM public.assert_booking_slot_available(
    p_venue_id,
    p_event_date,
    NULL,
    true
  );

  INSERT INTO public.bookings (
    venue_id,
    customer_id,
    package_id,
    event_date,
    event_start_time,
    event_end_time,
    guest_count,
    status,
    special_requests
  )
  VALUES (
    p_venue_id,
    v_user_id,
    p_package_id,
    p_event_date,
    p_event_start_time,
    p_event_end_time,
    p_guest_count,
    'pending',
    NULLIF(BTRIM(p_special_requests), '')
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_booking_inquiry(
  uuid,
  uuid,
  date,
  int,
  text,
  time,
  time
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_booking_inquiry(
  uuid,
  uuid,
  date,
  int,
  text,
  time,
  time
) TO authenticated, service_role;

DROP POLICY IF EXISTS "customers_create_bookings" ON public.bookings;
DROP POLICY IF EXISTS "customers_cancel_own_booking" ON public.bookings;
DROP POLICY IF EXISTS "venue_org_manages_bookings" ON public.bookings;
DROP POLICY IF EXISTS "venue_org_select_bookings" ON public.bookings;
DROP POLICY IF EXISTS "venue_org_update_bookings" ON public.bookings;

CREATE POLICY "venue_org_select_bookings"
  ON public.bookings FOR SELECT
  USING (public.is_org_member_for_venue(venue_id));

CREATE POLICY "venue_org_update_bookings"
  ON public.bookings FOR UPDATE
  USING (public.is_org_member_for_venue(venue_id))
  WITH CHECK (public.is_org_member_for_venue(venue_id));

COMMENT ON FUNCTION public.assert_booking_slot_available(uuid, date, uuid, boolean) IS
  'Canonical booking date validator used by create_booking_inquiry() and the bookings integrity trigger. Blocks inactive-unsafe direct inserts/updates, blocked venue availability, active conflicts, and unpublished venue creation.';

COMMENT ON TRIGGER bookings_enforce_availability_integrity ON public.bookings IS
  'Before any booking insert or active venue/date/status update, enforces venue availability and active-booking conflict rules with an advisory lock.';

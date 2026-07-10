-- ============================================================
-- Migration 039 - Availability calendar booking guards
-- ============================================================
-- Reuses the existing venue_availability table and availability_status enum.
-- Tightens booking creation so tentative dates block duplicate requests, and
-- keeps availability synchronized when a booking date changes.

CREATE OR REPLACE FUNCTION public.sync_availability_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_status public.availability_status;
  has_other_active boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.event_date IS DISTINCT FROM NEW.event_date THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.venue_id = OLD.venue_id
        AND b.event_date = OLD.event_date
        AND b.id <> NEW.id
        AND b.status::text IN (
          'pending',
          'approved',
          'payment_pending',
          'confirmed',
          'completed',
          'reviewed'
        )
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
      AND b.status::text IN (
        'pending',
        'approved',
        'payment_pending',
        'confirmed',
        'completed',
        'reviewed'
      )
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
  AFTER INSERT OR UPDATE OF status, event_date ON public.bookings
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
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_venue public.venues%ROWTYPE;
  v_package public.venue_packages%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_availability public.venue_availability%ROWTYPE;
  v_has_conflict boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to submit a booking inquiry';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_venue_id::text || ':' || p_event_date::text, 0)
  );

  SELECT * INTO v_venue
  FROM public.venues
  WHERE id = p_venue_id
    AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This venue is not available for booking';
  END IF;

  IF p_event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Event date must be today or later';
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

  SELECT * INTO v_availability
  FROM public.venue_availability
  WHERE venue_id = p_venue_id
    AND date = p_event_date;

  IF FOUND AND v_availability.status IN ('tentative', 'reserved', 'maintenance', 'blackout') THEN
    RAISE EXCEPTION 'This venue is unavailable on the selected date';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.venue_id = p_venue_id
      AND b.event_date = p_event_date
      AND b.status::text IN (
        'pending',
        'approved',
        'payment_pending',
        'confirmed',
        'completed',
        'reviewed'
      )
  )
  INTO v_has_conflict;

  IF v_has_conflict THEN
    RAISE EXCEPTION 'This venue already has an active booking for the selected date';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.create_booking_inquiry(
  uuid,
  uuid,
  date,
  int,
  text,
  time,
  time
) TO authenticated;

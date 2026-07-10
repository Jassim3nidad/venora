-- ============================================================
-- Migration 035 — Fix cancel booking request (no replication role)
-- ============================================================
-- Supabase restricts 'session_replication_role'. This migration
-- removes the role bypass and allows the normal booking status 
-- trigger to handle notifications, removing duplicate inserts.

CREATE OR REPLACE FUNCTION public.cancel_booking_request(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_is_customer boolean;
  v_is_owner boolean;
  v_has_other_active boolean;
  v_reason text;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  v_is_customer := v_booking.customer_id = v_user_id;
  v_is_owner := public.is_org_member_for_booking(p_booking_id) OR public.is_admin();

  IF NOT (v_is_customer OR v_is_owner) THEN
    RAISE EXCEPTION 'You do not have permission to cancel this booking';
  END IF;

  IF v_booking.status::text NOT IN ('pending', 'approved', 'payment_pending', 'confirmed') THEN
    RAISE EXCEPTION 'This booking can no longer be cancelled';
  END IF;

  v_reason := COALESCE(NULLIF(BTRIM(p_reason), ''), v_booking.decline_reason);

  UPDATE public.bookings
  SET status = 'cancelled',
      decline_reason = v_reason,
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  INSERT INTO public.booking_status_history (booking_id, status, changed_by, note)
  VALUES (v_booking.id, 'cancelled', v_user_id, v_reason);

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.venue_id = v_booking.venue_id
      AND b.event_date = v_booking.event_date
      AND b.id <> v_booking.id
      AND b.status::text IN (
        'pending',
        'approved',
        'payment_pending',
        'confirmed',
        'completed',
        'reviewed'
      )
  )
  INTO v_has_other_active;

  IF NOT v_has_other_active THEN
    UPDATE public.venue_availability
    SET status = 'available'
    WHERE venue_id = v_booking.venue_id
      AND date = v_booking.event_date
      AND status IN ('tentative', 'reserved');
  END IF;

  RETURN v_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking_request(uuid, text) TO authenticated;

-- Ensure the notification trigger exists without duplicating legacy triggers
DROP TRIGGER IF EXISTS bookings_status_notifications ON public.bookings;
DROP TRIGGER IF EXISTS create_booking_status_notifications_after_status_change ON public.bookings;

CREATE TRIGGER create_booking_status_notifications_after_status_change
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.create_booking_status_notifications();

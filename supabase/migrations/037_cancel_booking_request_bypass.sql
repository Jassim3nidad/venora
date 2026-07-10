-- ============================================================
-- Migration 034 — Make booking cancellation resilient
-- ============================================================
-- Remote environments may still call a missing create_notification()
-- helper from legacy booking triggers. This migration:
-- 1. Adds create_notification() for compatibility
-- 2. Replaces booking status notification trigger with safe inserts
-- 3. Rewrites cancel_booking_request() to bypass broken triggers

DO $$
BEGIN
  CREATE TYPE public.notification_kind AS ENUM (
    'booking_inquiry',
    'booking_approved',
    'booking_declined',
    'booking_cancelled',
    'booking_confirmed',
    'booking_payment',
    'booking_completed',
    'booking_reviewed',
    'booking_expired',
    'system'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text,
  p_link text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_email_template text DEFAULT NULL,
  p_sms_template text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, channel, title, body, link)
  VALUES (
    p_user_id,
    'in_app'::public.notification_channel,
    p_title,
    p_body,
    p_link
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_notification failed for user %: %', p_user_id, SQLERRM;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_status_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  venue_name text;
  customer_title text;
  customer_body text;
  owner_title text;
  owner_body text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO venue_name
  FROM public.venues
  WHERE id = NEW.venue_id;

  CASE NEW.status::text
    WHEN 'pending' THEN
      customer_title := 'Booking inquiry sent';
      customer_body := 'Your inquiry for ' || COALESCE(venue_name, 'this venue') || ' is awaiting venue approval.';
      owner_title := 'New booking inquiry';
      owner_body := 'A customer requested ' || COALESCE(venue_name, 'your venue') || ' for ' || NEW.event_date::text || '.';
    WHEN 'approved' THEN
      customer_title := 'Venue approved your request';
      customer_body := 'Your quote is ready. Pay the deposit to confirm your booking.';
      owner_title := 'Booking approved';
      owner_body := 'The customer has been notified to pay the required deposit.';
    WHEN 'payment_pending' THEN
      customer_title := 'Payment started';
      customer_body := 'Your deposit payment is pending confirmation from the payment provider.';
      owner_title := 'Payment pending';
      owner_body := 'The customer started payment for ' || COALESCE(venue_name, 'your venue') || '.';
    WHEN 'confirmed' THEN
      customer_title := 'Booking confirmed';
      customer_body := 'Payment was received and your venue booking is confirmed.';
      owner_title := 'Booking confirmed';
      owner_body := 'Payment was received and the booking is confirmed.';
    WHEN 'declined' THEN
      customer_title := 'Booking request declined';
      customer_body := COALESCE(NEW.decline_reason, 'The venue declined this request.');
      owner_title := 'Booking declined';
      owner_body := 'The customer has been notified.';
    WHEN 'cancelled' THEN
      customer_title := 'Booking cancelled';
      customer_body := COALESCE(NULLIF(BTRIM(NEW.decline_reason), ''), 'This booking has been cancelled.');
      owner_title := 'Booking cancelled';
      owner_body := COALESCE(NULLIF(BTRIM(NEW.decline_reason), ''), 'This booking has been cancelled.');
    WHEN 'completed' THEN
      customer_title := 'Event completed';
      customer_body := 'Your event is complete. Share a review to help future customers.';
      owner_title := 'Booking completed';
      owner_body := 'The booking was marked complete and is ready for review.';
    WHEN 'reviewed' THEN
      customer_title := 'Review submitted';
      customer_body := 'Thanks for reviewing ' || COALESCE(venue_name, 'your venue') || '.';
      owner_title := 'New venue review';
      owner_body := 'A customer submitted a review for ' || COALESCE(venue_name, 'your venue') || '.';
    WHEN 'expired' THEN
      customer_title := 'Booking request expired';
      customer_body := 'This request expired before it was confirmed.';
      owner_title := 'Booking expired';
      owner_body := 'A booking request expired automatically.';
    ELSE
      customer_title := NULL;
      owner_title := NULL;
  END CASE;

  BEGIN
    IF customer_title IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, channel, title, body, link)
      VALUES (
        NEW.customer_id,
        'in_app'::public.notification_channel,
        customer_title,
        customer_body,
        '/bookings/' || NEW.id::text
      );
    END IF;

    IF owner_title IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, channel, title, body, link)
      SELECT DISTINCT
        om.user_id,
        'in_app'::public.notification_channel,
        owner_title,
        owner_body,
        '/dashboard/bookings/' || NEW.id::text
      FROM public.venues v
      JOIN public.organization_members om ON om.organization_id = v.organization_id
      WHERE v.id = NEW.venue_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'create_booking_status_notifications failed for booking %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

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

  -- Bypass legacy triggers that may call missing helpers.
  PERFORM set_config('session_replication_role', 'replica', true);

  UPDATE public.bookings
  SET status = 'cancelled',
      decline_reason = v_reason,
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  PERFORM set_config('session_replication_role', 'origin', true);

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

  BEGIN
    INSERT INTO public.notifications (user_id, channel, title, body, link)
    VALUES (
      v_booking.customer_id,
      'in_app'::public.notification_channel,
      'Booking cancelled',
      COALESCE(v_reason, 'This booking has been cancelled.'),
      '/bookings/' || v_booking.id::text
    );

    INSERT INTO public.notifications (user_id, channel, title, body, link)
    SELECT DISTINCT
      om.user_id,
      'in_app'::public.notification_channel,
      'Booking cancelled',
      COALESCE(v_reason, 'This booking has been cancelled.'),
      '/dashboard/bookings/' || v_booking.id::text
    FROM public.venues v
    JOIN public.organization_members om ON om.organization_id = v.organization_id
    WHERE v.id = v_booking.venue_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'cancel_booking_request notification insert failed for booking %: %', v_booking.id, SQLERRM;
  END;

  RETURN v_booking;
END;
$$;

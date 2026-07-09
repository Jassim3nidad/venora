-- ============================================================
-- Migration 033 — Booking cancellation notification fixes
-- ============================================================
-- Some environments reference public.create_notification(...) from
-- booking status triggers. Provide the helper and make status
-- notifications non-blocking so cancellations cannot fail.

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

  IF p_metadata IS NOT NULL OR p_email_template IS NOT NULL OR p_sms_template IS NOT NULL THEN
    BEGIN
      PERFORM public.log_audit(
        'notification.created',
        'notification',
        v_id,
        jsonb_build_object(
          'kind', p_kind::text,
          'metadata', p_metadata,
          'email_template', p_email_template,
          'sms_template', p_sms_template
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

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

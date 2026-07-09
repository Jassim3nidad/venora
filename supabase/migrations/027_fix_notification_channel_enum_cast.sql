-- ============================================================
-- Migration 027 — Fix notification_channel enum cast in trigger
-- ============================================================
-- Root cause: create_booking_status_notifications() inserts plain
-- text 'in_app' into the `channel` column which is of type
-- notification_channel enum. PostgreSQL does not implicitly cast
-- text → enum inside PL/pgSQL INSERT statements.
-- Fix: cast the literal to notification_channel explicitly.

CREATE OR REPLACE FUNCTION public.create_booking_status_notifications()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
      customer_body := 'This booking has been cancelled.';
      owner_title := 'Booking cancelled';
      owner_body := 'This booking has been cancelled.';
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

  -- Non-blocking: notification failure must not roll back the booking update
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
      SELECT DISTINCT om.user_id, 'in_app'::public.notification_channel, owner_title, owner_body, '/dashboard/bookings/' || NEW.id::text
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

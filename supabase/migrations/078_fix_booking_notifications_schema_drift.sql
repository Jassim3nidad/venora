-- ============================================================
-- Migration 078 - Fix booking notifications schema drift
-- ============================================================
-- Reasserts the correct definition for the booking notifications trigger.
-- Resolves a persistent schema drift issue where the live database trigger
-- was out-of-band modified to query `organization_members.status`, which does not exist,
-- causing booking approvals to crash and rollback.

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
  customer_link text;
  customer_kind public.notification_kind := 'booking_update';
  owner_title text;
  owner_body text;
  owner_kind public.notification_kind := 'booking_update';
  notification_metadata jsonb;
  owner_rec record;
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
      customer_link := '/bookings/' || NEW.id::text;
      owner_title := 'New booking inquiry';
      owner_body := 'A customer requested ' || COALESCE(venue_name, 'your venue') || ' for ' || NEW.event_date::text || '.';
    WHEN 'approved' THEN
      customer_title := 'Venue approved your request';
      customer_body := 'Your quote is ready. Pay the deposit to confirm your booking.';
      customer_link := '/bookings/' || NEW.id::text || '/payment';
      owner_title := 'Booking approved';
      owner_body := 'The customer has been notified to pay the required deposit.';
    WHEN 'payment_pending' THEN
      customer_kind := 'payment_update';
      owner_kind := 'payment_update';
      customer_title := 'Payment started';
      customer_body := 'Your deposit payment is pending confirmation from the payment provider.';
      customer_link := '/bookings/' || NEW.id::text || '/payment';
      owner_title := 'Payment pending';
      owner_body := 'The customer started payment for ' || COALESCE(venue_name, 'your venue') || '.';
    WHEN 'confirmed' THEN
      customer_kind := 'payment_update';
      owner_kind := 'payment_update';
      customer_title := 'Booking confirmed';
      customer_body := 'Payment was received and your venue booking is confirmed.';
      customer_link := '/bookings/' || NEW.id::text || '/confirmation';
      owner_title := 'Booking confirmed';
      owner_body := 'Payment was received and the booking is confirmed.';
    WHEN 'declined' THEN
      customer_title := 'Booking request declined';
      customer_body := COALESCE(NEW.decline_reason, 'The venue declined this request.');
      customer_link := '/bookings/' || NEW.id::text;
      owner_title := 'Booking declined';
      owner_body := 'The customer has been notified.';
    WHEN 'cancelled' THEN
      customer_title := 'Booking cancelled';
      customer_body := COALESCE(NULLIF(BTRIM(NEW.decline_reason), ''), 'This booking has been cancelled.');
      customer_link := '/bookings/' || NEW.id::text;
      owner_title := 'Booking cancelled';
      owner_body := COALESCE(NULLIF(BTRIM(NEW.decline_reason), ''), 'This booking has been cancelled.');
    WHEN 'completed' THEN
      customer_kind := 'review_request';
      customer_title := 'How was your event?';
      customer_body := 'Your event is complete. Share a review to help future customers.';
      customer_link := '/bookings/' || NEW.id::text || '/review';
      owner_title := 'Booking completed';
      owner_body := 'The booking was marked complete and is ready for review.';
    WHEN 'reviewed' THEN
      customer_kind := 'review_request';
      owner_kind := 'review_request';
      customer_title := 'Review submitted';
      customer_body := 'Thanks for reviewing ' || COALESCE(venue_name, 'your venue') || '.';
      customer_link := '/bookings/' || NEW.id::text || '/review';
      owner_title := 'New venue review';
      owner_body := 'A customer submitted a review for ' || COALESCE(venue_name, 'your venue') || '.';
    WHEN 'expired' THEN
      customer_title := 'Booking request expired';
      customer_body := 'This request expired before it was confirmed.';
      customer_link := '/bookings/' || NEW.id::text;
      owner_title := 'Booking expired';
      owner_body := 'A booking request expired automatically.';
    ELSE
      customer_title := NULL;
      owner_title := NULL;
  END CASE;

  notification_metadata := jsonb_build_object(
    'booking_id', NEW.id,
    'venue_id', NEW.venue_id,
    'status', NEW.status::text,
    'event_date', NEW.event_date
  );

  IF customer_title IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.customer_id,
      customer_kind,
      customer_title,
      customer_body,
      customer_link,
      notification_metadata,
      (CASE WHEN NEW.status::text IN ('approved', 'confirmed') THEN 'high' ELSE 'normal' END)::public.notification_priority,
      'booking:' || NEW.id::text || ':' || NEW.status::text || ':customer',
      NULL
    );
  END IF;

  IF owner_title IS NOT NULL THEN
    FOR owner_rec IN
      SELECT DISTINCT om.user_id
      FROM public.venues v
      JOIN public.organization_members om ON om.organization_id = v.organization_id
      WHERE v.id = NEW.venue_id
    LOOP
      PERFORM public.create_notification(
        owner_rec.user_id,
        owner_kind,
        owner_title,
        owner_body,
        '/dashboard/bookings/' || NEW.id::text,
        notification_metadata,
        (CASE WHEN NEW.status::text IN ('pending', 'confirmed') THEN 'high' ELSE 'normal' END)::public.notification_priority,
        'booking:' || NEW.id::text || ':' || NEW.status::text || ':owner:' || owner_rec.user_id::text,
        NULL
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

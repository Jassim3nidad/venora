-- ============================================================
-- Migration 063 — Fix create_notification() overload ambiguity
-- ============================================================
--
-- Migration 062 restored create_booking_status_notifications()'s rich
-- body verbatim from migration 036, which calls create_notification()
-- with 8 positional arguments (relying on the 9th, p_actor_id, defaulting
-- to NULL). Two overloads of create_notification() coexist:
--
--   - 8-arg (migrations 034/037): p_user_id, p_kind, p_title, p_body,
--     p_link, p_metadata, p_email_template, p_sms_template -- kept
--     around "for compatibility" with environments where 036 hadn't run
--     yet, per 037's own header comment. Its body only ever inserts
--     (user_id, channel, title, body, link) -- it ignores kind,
--     metadata, priority, and dedupe_key entirely.
--   - 9-arg (migration 036): ... p_priority, p_dedupe_key, p_actor_id.
--
-- Migration 055's own header comment already documented this exact
-- hazard: "notification_kind and create_notification() both had two
-- conflicting definitions... this migration calls create_notification()
-- with 9 positional args" -- and 041/055 both follow that rule for their
-- own new call sites. But migration 062 copied 036's call sites
-- unchanged, which only ever pass 8 arguments. Postgres's overload
-- resolution prefers a candidate that needs zero defaulted parameters
-- over one needing a default filled in, so a call with exactly 8
-- arguments resolves to the 8-arg overload -- not the 9-arg one intended
-- -- regardless of the 7th argument's type. Confirmed live: after
-- applying 062, new booking-status notifications still showed
-- metadata={}, priority='normal', dedupe_key=null -- the exact shape the
-- 8-arg overload's INSERT produces.
--
-- Fix, matching 041/055's established pattern: call create_notification()
-- with all 9 positional arguments explicitly (p_actor_id supplied as
-- NULL rather than omitted). Also drops the legacy 8-arg overload
-- outright -- nothing in the live codebase intentionally depends on it
-- (grep across migrations, app code, and edge functions turned up no
-- other caller), it has caused this exact ambiguity twice now, and the
-- "environments where 036 hasn't run yet" scenario it existed for is
-- moot: the full notification platform has been live since 036.

DROP FUNCTION IF EXISTS public.create_notification(uuid, public.notification_kind, text, text, text, jsonb, text, text);

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

COMMENT ON FUNCTION public.create_booking_status_notifications() IS
  'Restores migration 036''s rich per-kind/priority/metadata/dedupe-keyed booking notifications (062). Calls create_notification() with all 9 positional arguments explicitly (063) to avoid the overload-resolution ambiguity documented in migration 055 -- the legacy 8-arg overload is also dropped outright. cancel_booking_request() and its trigger wiring (037/038) are untouched.';

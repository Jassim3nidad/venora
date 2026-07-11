-- ============================================================
-- Migration 062 — Restore rich booking-status notification metadata
-- ============================================================
--
-- Migration 036 built a rich create_booking_status_notifications():
-- populates notifications.metadata (booking_id/venue_id/status/event_date),
-- sets a deterministic per-recipient dedupe_key, classifies the
-- notification `kind` (booking_update/payment_update/review_request), and
-- escalates `priority` for high-signal transitions — all routed through
-- create_notification() so notification_preferences and the delivery
-- queue (notification_deliveries) are respected uniformly.
--
-- Migration 037, written to defensively handle "remote environments [that]
-- may still call a missing create_notification() helper from legacy
-- booking triggers," re-declared create_booking_status_notifications()
-- with a plain, dependency-free raw INSERT. Because this function takes
-- no arguments, there is only ever one signature — CREATE OR REPLACE
-- always wins regardless of which migration ran first — so 037
-- unconditionally overwrote 036's richer version wherever 036 had already
-- been applied. Confirmed live: every recent booking-status notification
-- has metadata={} and dedupe_key=null, matching column DEFAULTS rather
-- than 036's logic. Nothing in 037/038 suggests this was a deliberate
-- product decision to simplify notifications — it reads as an
-- unintentional side effect of a robustness fix aimed at a different
-- problem (a possibly-missing create_notification() in some environment).
--
-- This migration restores 036's rich trigger body verbatim and does NOT
-- touch cancel_booking_request() or its trigger wiring (037/038's
-- legitimate fixes: removing a session_replication_role bypass Supabase
-- restricts, and deduplicating the manual notification insert into
-- cancellation vs. the trigger). Those stay exactly as 038 left them.

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
      CASE WHEN NEW.status::text IN ('approved', 'confirmed') THEN 'high' ELSE 'normal' END,
      'booking:' || NEW.id::text || ':' || NEW.status::text || ':customer'
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
        CASE WHEN NEW.status::text IN ('pending', 'confirmed') THEN 'high' ELSE 'normal' END,
        'booking:' || NEW.id::text || ':' || NEW.status::text || ':owner:' || owner_rec.user_id::text
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_booking_status_notifications() IS
  'Restores migration 036''s rich per-kind/priority/metadata/dedupe-keyed booking notifications, which migration 037 unintentionally reverted to a plain insert while fixing an unrelated cancellation-trigger robustness issue. cancel_booking_request() and its trigger wiring (037/038) are untouched by this migration.';

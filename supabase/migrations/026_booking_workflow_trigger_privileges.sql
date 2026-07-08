-- ============================================================
-- Migration 026 — Fix booking workflow trigger privileges
-- ============================================================
-- 021_booking_workflow_transactions.sql defines several AFTER
-- INSERT/UPDATE trigger functions that write to tables the
-- invoking user (venue owner, customer) has no direct RLS INSERT
-- access to: booking_status_history (audit trail, insert.admin
-- only), venue_availability, and notifications. Every RPC function
-- in that same migration is correctly marked SECURITY DEFINER, but
-- the four trigger functions were left as SECURITY INVOKER — an
-- oversight. Under INVOKER, these triggers fail with "new row
-- violates row-level security policy" whenever a non-admin user
-- (e.g. a venue owner accepting a booking) causes them to fire.
--
-- Fix: re-declare each as SECURITY DEFINER so it runs with the
-- function owner's privileges (bypassing RLS for its own internal
-- writes) regardless of who triggered it, matching every other
-- multi-step workflow function already defined in migration 021.
-- Idempotent — CREATE OR REPLACE, safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by, note)
    VALUES (NEW.id, NEW.status, auth.uid(), 'Booking inquiry submitted');
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_availability_on_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_status public.availability_status;
  has_other_active boolean;
BEGIN
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

CREATE OR REPLACE FUNCTION public.create_booking_status_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF customer_title IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, channel, title, body, link)
    VALUES (
      NEW.customer_id,
      'in_app',
      customer_title,
      customer_body,
      '/bookings/' || NEW.id::text
    );
  END IF;

  IF owner_title IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, channel, title, body, link)
    SELECT DISTINCT om.user_id, 'in_app', owner_title, owner_body, '/dashboard/bookings/' || NEW.id::text
    FROM public.venues v
    JOIN public.organization_members om ON om.organization_id = v.organization_id
    WHERE v.id = NEW.venue_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_booking_reviewed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bookings
  SET status = 'reviewed',
      reviewed_at = now(),
      updated_at = now()
  WHERE id = NEW.booking_id
    AND status::text = 'completed';

  RETURN NEW;
END;
$$;

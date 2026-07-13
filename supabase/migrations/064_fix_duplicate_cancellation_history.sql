-- ============================================================
-- Migration 064 — Fix duplicate cancellation history
-- ============================================================
--
-- Root cause: cancel_booking_request() (introduced in migration 034,
-- carried through 037/038 unchanged in this respect) manually inserts a
-- row into booking_status_history on every cancellation:
--
--   INSERT INTO public.booking_status_history (booking_id, status, changed_by, note)
--   VALUES (v_booking.id, 'cancelled', v_user_id, v_reason);
--
-- But `bookings` also has an automatic, table-wide trigger
-- (bookings_status_history -> log_booking_status_change(), which
-- predates this whole migration range and applies to every status
-- transition, not just cancellations) that inserts its own row on the
-- same UPDATE. No other status-transition RPC in the codebase
-- (approve_booking_quote, confirm_booking_payment, decline_booking_request,
-- complete_booking_event) manually inserts into booking_status_history --
-- they all rely solely on that trigger. cancel_booking_request() is the
-- one outlier duplicating it, producing two rows per cancellation.
--
-- Ownership decision: the automatic trigger stays the single owner of
-- booking_status_history for every transition, matching every other RPC.
-- cancel_booking_request() gives up its own manual insert instead of the
-- trigger being suppressed for it -- this fixes the duplicate without any
-- ALTER TABLE / trigger-disable / table lock, and makes cancellation
-- consistent with the rest of the codebase rather than a special case.
-- (The cancellation reason isn't lost: it's already persisted on
-- bookings.decline_reason by this same function, same as it always was.)
--
-- This migration does NOT edit 034, 037, 038, 062, or 063 -- it replaces
-- cancel_booking_request() again, the same additive pattern used
-- throughout this migration range (046, 048 also replaced earlier
-- versions of functions in place via CREATE OR REPLACE).
--
-- Also added, neither of which existed before in any version:
--   - A distinct precondition for "already cancelled" (a clear conflict,
--     separate from the generic "can no longer be cancelled" message
--     used for genuinely invalid states like completed/reviewed) so a
--     repeated cancellation call fails loudly and specifically rather
--     than either silently duplicating history or reporting a vague
--     error indistinguishable from other invalid-state cases.
--   - An audit_logs entry via log_audit(), matching every other
--     privileged mutation in the codebase (approve_booking_quote,
--     confirm_booking_payment, etc. all call log_audit; cancellation
--     never did). Required so cancellation has the same audit trail as
--     every other booking-state transition.
--
-- Also fixed here, found while writing the "unauthorized caller" regression
-- test: `v_is_customer := v_booking.customer_id = v_user_id` is a direct
-- equality comparison, which evaluates to NULL (not false) when
-- v_user_id (auth.uid()) is NULL. `NOT (v_is_customer OR v_is_owner)` then
-- also evaluates to NULL whenever v_is_owner is false, and plpgsql's
-- `IF NULL THEN` is treated the same as `IF false THEN` -- it silently
-- skips the RAISE EXCEPTION instead of rejecting the caller. Every other
-- permission helper in this codebase (is_admin(), is_org_member_for_*())
-- is built on EXISTS(...), which always returns a definite true/false
-- even when auth.uid() is null, so they aren't affected -- this direct
-- comparison was the one exception. Fixed by requiring v_user_id to be
-- non-null before the comparison can be true.
--
-- Untouched: venue_availability sync, and the notification trigger
-- (bookings_status_notifications, fixed correctly by 062/063) -- neither
-- needed to change.

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

  v_is_customer := v_user_id IS NOT NULL AND v_booking.customer_id = v_user_id;
  v_is_owner := public.is_org_member_for_booking(p_booking_id) OR public.is_admin();

  IF NOT (v_is_customer OR v_is_owner) THEN
    RAISE EXCEPTION 'You do not have permission to cancel this booking';
  END IF;

  -- Precondition, checked before the generic transition guard: a booking
  -- that is already cancelled is a distinct, clear conflict -- not the
  -- same error as a booking that is genuinely past cancelling
  -- (completed/reviewed/declined). Lets callers tell "already done, no
  -- action needed" apart from "this request doesn't make sense."
  IF v_booking.status::text = 'cancelled' THEN
    RAISE EXCEPTION 'This booking is already cancelled';
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

  -- booking_status_history is populated automatically by the
  -- bookings_status_history trigger on the UPDATE above -- no manual
  -- insert here (see the ownership decision above).

  PERFORM public.log_audit(
    'booking.cancelled', 'booking', v_booking.id,
    jsonb_build_object('reason', v_reason, 'cancelled_by', v_user_id)
  );

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

COMMENT ON FUNCTION public.cancel_booking_request(uuid, text) IS
  'Cancels a pending/approved/payment_pending/confirmed booking. booking_status_history is owned solely by the table-wide log_booking_status_change trigger (064 removed this function''s own duplicate insert); audit_logs and the notification trigger both still fire exactly once. Repeated calls on an already-cancelled booking raise a distinct conflict rather than duplicating history or notifications.';

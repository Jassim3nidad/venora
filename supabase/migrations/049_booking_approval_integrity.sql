-- ============================================================
-- Migration 043 - Booking approval integrity
-- ============================================================
--
-- Root cause: two application code paths (approveBookingAction in
-- src/features/booking/application/actions.ts, and the "approve"
-- branch of PATCH /api/bookings/[id]/status) validated totalAmount /
-- depositAmount via Zod, then performed a raw
-- `UPDATE bookings SET status = 'approved'` directly on the table —
-- never calling approve_booking_quote(), and silently discarding the
-- validated amounts. Because `venue_org_manages_bookings` and
-- `admin_full_access_bookings` grant FOR ALL (including UPDATE) on
-- bookings, RLS allowed this raw write to succeed.
--
-- Effect: a booking could reach status = 'approved' with
-- total_amount, deposit_amount, and approved_at all NULL. Since
-- issue_deposit_invoice() only fires when NEW.deposit_amount > 0, no
-- invoice was ever created, and confirm/start_booking_payment correctly
-- (but confusingly, from the customer's perspective) rejected payment
-- with "This booking has no payable deposit amount". No audit trail
-- existed for the approval either way.
--
-- Fix, two layers:
--   1. Application code (this same commit) now calls
--      approve_booking_quote() / decline_booking_request() instead of
--      writing to the bookings table directly.
--   2. This migration adds a CHECK constraint so ANY future code path
--      (present or not-yet-written) that tries to set status into an
--      approved-or-later state without a valid positive total/deposit
--      and an approved_at timestamp fails loudly at the database level
--      — the strongest guarantee available, independent of which
--      application code is calling it.
--
-- Also adds the audit log entry approve_booking_quote() was missing
-- (invoice issuance was already audited via issue_deposit_invoice();
-- the approval action itself was not).

-- ── Guard: approved-or-later bookings must carry valid amounts ──

-- NOT VALID: enforces on all new/updated rows immediately without
-- requiring an initial full-table scan (safer against unknown existing
-- data — see the query below for finding any other affected rows).
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_approved_requires_valid_amounts
  CHECK (
    status::text NOT IN ('approved', 'payment_pending', 'confirmed', 'completed', 'reviewed')
    OR (
      total_amount IS NOT NULL AND total_amount > 0
      AND deposit_amount IS NOT NULL AND deposit_amount > 0
      AND deposit_amount <= total_amount
      AND approved_at IS NOT NULL
    )
  ) NOT VALID;

COMMENT ON CONSTRAINT bookings_approved_requires_valid_amounts ON public.bookings IS
  'A booking cannot be approved (or further along the workflow) without a valid positive total, positive deposit not exceeding the total, and an approval timestamp. Added after a raw-UPDATE bug bypassed approve_booking_quote() and left bookings "approved" with null amounts.';

-- Run this after deploying to find any OTHER bookings affected by the
-- same historical bug, before running VALIDATE CONSTRAINT (which would
-- otherwise fail if any such rows still exist):
--
--   SELECT id, status, total_amount, deposit_amount, approved_at, created_at
--   FROM public.bookings
--   WHERE status::text IN ('approved', 'payment_pending', 'confirmed', 'completed', 'reviewed')
--     AND (total_amount IS NULL OR total_amount <= 0
--          OR deposit_amount IS NULL OR deposit_amount <= 0
--          OR deposit_amount > total_amount
--          OR approved_at IS NULL);
--
-- Each match needs the same repair as the one this migration's PR
-- covers: reset to 'pending' (status only; other fields are already
-- null) and re-approve through approve_booking_quote() with a real
-- total/deposit, so invoice issuance and audit logging fire correctly.
-- Once the query above returns zero rows:
--   ALTER TABLE public.bookings VALIDATE CONSTRAINT bookings_approved_requires_valid_amounts;

-- ── approve_booking_quote: add audit logging ──────────────────

CREATE OR REPLACE FUNCTION public.approve_booking_quote(
  p_booking_id uuid,
  p_total_amount numeric,
  p_deposit_amount numeric DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_deposit numeric;
BEGIN
  IF NOT (public.is_org_member_for_booking(p_booking_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'You do not have permission to approve this booking';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status::text <> 'pending' THEN
    RAISE EXCEPTION 'Only pending bookings can be approved';
  END IF;

  IF p_total_amount <= 0 THEN
    RAISE EXCEPTION 'Total amount must be greater than zero';
  END IF;

  v_deposit := COALESCE(p_deposit_amount, ROUND(p_total_amount * 0.5, 2));

  IF v_deposit <= 0 OR v_deposit > p_total_amount THEN
    RAISE EXCEPTION 'Deposit amount must be greater than zero and not exceed the total amount';
  END IF;

  UPDATE public.bookings
  SET status = 'approved',
      total_amount = p_total_amount,
      deposit_amount = v_deposit,
      approval_note = NULLIF(BTRIM(p_note), ''),
      approved_at = now(),
      payment_due_at = now() + INTERVAL '48 hours',
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  PERFORM public.log_audit(
    'booking.approved', 'booking', p_booking_id,
    jsonb_build_object(
      'total_amount', p_total_amount,
      'deposit_amount', v_deposit
    )
  );

  RETURN v_booking;
END;
$$;

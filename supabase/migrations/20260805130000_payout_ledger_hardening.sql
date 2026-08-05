-- ============================================================
-- Payout ledger hardening — prerequisite for withdrawals
-- ============================================================
--
-- The payouts table (008) and complete_booking_event() (021) have three
-- defects that make the ledger unsafe to build a withdrawal system on.
-- All three are fixed here, additively, before any money-out path exists.
--
--   1. DEDUPE COLLISION. complete_booking_event() guarded its INSERT with
--      `NOT EXISTS (... WHERE organization_id = v_org_id AND amount = ...)`.
--      Two genuine bookings that settle to the same net amount for the same
--      organization collide, and the second payout is silently dropped —
--      the venue owner is underpaid with no error anywhere. Replaced with a
--      booking_id FK plus a partial UNIQUE index, so dedupe is keyed on the
--      thing that actually identifies the payout.
--
--   2. SUPPLIERS NEVER PAID. payouts.supplier_id and the
--      payouts.select.supplier RLS policy (010) have existed since 008, but
--      no code path ever set supplier_id. Suppliers earn through
--      booking_suppliers.agreed_price and would read a permanently zero
--      balance. complete_booking_event() now emits one payout per confirmed
--      supplier on the booking.
--
--   3. UNGUARDED STATUS. payouts.status was free text with no state
--      machine, so a settled payout could be moved back to 'scheduled' and
--      claimed a second time. Converted to a real enum with a transition
--      trigger; 'paid' is terminal.
--
-- Economic split (see also the org payout amount below): the customer pays
-- the booking total to the platform. Out of the settled amount, the
-- platform keeps commission, each confirmed supplier is paid its
-- agreed_price, and the venue's organization receives the remainder. The
-- previous code paid the organization `paid - commission` with no supplier
-- deduction, which would double-spend the same pesos once supplier payouts
-- exist.
--
-- Backfill note: legacy payout rows predate booking_id and keep it NULL.
-- The UNIQUE indexes are partial (booking_id IS NOT NULL) so those rows are
-- untouched and remain valid. They are also unclaimable by a withdrawal
-- until an admin attributes them to a booking, which is the intended
-- conservative behavior.
--
-- Verification:
--   SELECT status, count(*) FROM public.payouts GROUP BY status;
--   SELECT indexname FROM pg_indexes
--    WHERE tablename = 'payouts' AND indexname LIKE 'uq_payouts%';

BEGIN;

-- ── Status enum ───────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.payout_status AS ENUM (
    'scheduled',   -- earned, in or past the hold period, not yet claimed
    'processing',  -- claimed by a withdrawal request, disbursement in flight
    'paid',        -- settled with the recipient (terminal)
    'failed'       -- disbursement failed; retryable
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Schema changes ────────────────────────────────────────────

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency   text        NOT NULL DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Amount must be positive. A zero/negative payout is always a bug and
-- would let a withdrawal claim rows that add nothing to the balance.
ALTER TABLE public.payouts
  DROP CONSTRAINT IF EXISTS payouts_amount_positive;
ALTER TABLE public.payouts
  ADD CONSTRAINT payouts_amount_positive CHECK (amount > 0) NOT VALID;

-- text -> enum. The default must be dropped before the type change and
-- restored after, otherwise the cast fails on the default expression.
DO $$
BEGIN
  IF (
    SELECT atttypid FROM pg_attribute
    WHERE attrelid = 'public.payouts'::regclass AND attname = 'status'
  ) <> 'public.payout_status'::regtype THEN
    ALTER TABLE public.payouts ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE public.payouts
      ALTER COLUMN status TYPE public.payout_status
      USING status::public.payout_status;
    ALTER TABLE public.payouts
      ALTER COLUMN status SET DEFAULT 'scheduled'::public.payout_status;
  END IF;
END $$;

-- Dedupe guard (defect 1). Partial so legacy booking_id-less rows are
-- exempt. One org payout per booking; one supplier payout per
-- (booking, supplier).
CREATE UNIQUE INDEX IF NOT EXISTS uq_payouts_booking_organization
  ON public.payouts (booking_id)
  WHERE booking_id IS NOT NULL AND organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payouts_booking_supplier
  ON public.payouts (booking_id, supplier_id)
  WHERE booking_id IS NOT NULL AND supplier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payouts_booking ON public.payouts (booking_id);

DROP TRIGGER IF EXISTS payouts_updated_at ON public.payouts;
CREATE TRIGGER payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON COLUMN public.payouts.booking_id IS
  'Booking this payout was earned on. NULL only for legacy rows created before this column existed. Backs the UNIQUE dedupe guards that replaced the org+amount collision.';

-- ── Status transition guard (defect 3) ────────────────────────

CREATE OR REPLACE FUNCTION public.payout_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'paid' THEN
    RAISE EXCEPTION
      'Payout % is already paid; settled payouts cannot change status', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT (
    (OLD.status, NEW.status) IN (
      ('scheduled'::public.payout_status, 'processing'::public.payout_status),
      ('scheduled'::public.payout_status, 'failed'::public.payout_status),
      ('processing'::public.payout_status, 'paid'::public.payout_status),
      ('processing'::public.payout_status, 'failed'::public.payout_status),
      -- Release paths: a rejected or cancelled withdrawal returns its
      -- claimed payouts to the claimable pool.
      ('processing'::public.payout_status, 'scheduled'::public.payout_status),
      ('failed'::public.payout_status, 'processing'::public.payout_status),
      ('failed'::public.payout_status, 'scheduled'::public.payout_status)
    )
  ) THEN
    RAISE EXCEPTION 'Invalid payout transition % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'paid' THEN
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payouts_status_transition ON public.payouts;
CREATE TRIGGER payouts_status_transition
  BEFORE UPDATE OF status ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.payout_status_transition();

COMMENT ON FUNCTION public.payout_status_transition() IS
  'Enforces the payout state machine. paid is terminal — a settled payout can never return to a claimable state and be withdrawn twice.';

-- ── Tunables ──────────────────────────────────────────────────
-- Single source of truth, shared by the balance query and the withdrawal
-- RPC so they can never disagree about what is claimable.

CREATE OR REPLACE FUNCTION public.payout_hold_period()
RETURNS interval LANGUAGE sql IMMUTABLE AS $$
  SELECT interval '7 days';
$$;

CREATE OR REPLACE FUNCTION public.minimum_withdrawal_amount()
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT 500::numeric;
$$;

COMMENT ON FUNCTION public.payout_hold_period() IS
  'How long a payout sits unclaimable after being scheduled, covering the refund/dispute window on the underlying booking.';

-- ── complete_booking_event (defects 1 and 2) ──────────────────
-- Replaces the 021 definition. Permission checks, status guard, and
-- booking transition are unchanged; only payout generation differs.

CREATE OR REPLACE FUNCTION public.complete_booking_event(
  p_booking_id uuid
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking           public.bookings%ROWTYPE;
  v_org_id            uuid;
  v_paid_amount       numeric;
  v_commission_amount numeric;
  v_supplier_total    numeric;
  v_org_net           numeric;
  v_currency          text;
  v_supplier_count    integer := 0;
BEGIN
  IF NOT (public.is_org_member_for_booking(p_booking_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'You do not have permission to complete this booking';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status::text <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed bookings can be completed';
  END IF;

  UPDATE public.bookings
  SET status = 'completed',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  SELECT v.organization_id INTO v_org_id
  FROM public.venues v
  WHERE v.id = v_booking.venue_id;

  SELECT COALESCE(SUM(amount), 0),
         COALESCE(SUM(commission_amount), 0),
         COALESCE(MIN(currency), 'PHP')
  INTO v_paid_amount, v_commission_amount, v_currency
  FROM public.transactions
  WHERE booking_id = p_booking_id
    AND status = 'paid';

  -- Nothing settled means nothing to distribute.
  IF v_paid_amount <= 0 THEN
    RETURN v_booking;
  END IF;

  SELECT COALESCE(SUM(bs.agreed_price), 0)
  INTO v_supplier_total
  FROM public.booking_suppliers bs
  WHERE bs.booking_id = p_booking_id
    AND bs.status = 'confirmed'
    AND COALESCE(bs.agreed_price, 0) > 0;

  -- Defect 2: one payout per confirmed supplier, keyed on the booking so a
  -- repeat call is a no-op rather than a duplicate.
  INSERT INTO public.payouts (
    booking_id, supplier_id, amount, currency, status, scheduled_at
  )
  SELECT p_booking_id, bs.supplier_id, bs.agreed_price, v_currency, 'scheduled', now()
  FROM public.booking_suppliers bs
  WHERE bs.booking_id = p_booking_id
    AND bs.status = 'confirmed'
    AND COALESCE(bs.agreed_price, 0) > 0
  ON CONFLICT (booking_id, supplier_id)
    WHERE booking_id IS NOT NULL AND supplier_id IS NOT NULL
  DO NOTHING;

  GET DIAGNOSTICS v_supplier_count = ROW_COUNT;

  -- Defect 1: dedupe on booking_id, not org+amount. Supplier costs are
  -- deducted so the same pesos are not paid out twice.
  v_org_net := GREATEST(v_paid_amount - v_commission_amount - v_supplier_total, 0);

  IF v_org_id IS NOT NULL AND v_org_net > 0 THEN
    INSERT INTO public.payouts (
      booking_id, organization_id, amount, currency, status, scheduled_at
    )
    VALUES (p_booking_id, v_org_id, v_org_net, v_currency, 'scheduled', now())
    ON CONFLICT (booking_id)
      WHERE booking_id IS NOT NULL AND organization_id IS NOT NULL
    DO NOTHING;
  END IF;

  PERFORM public.log_audit(
    'payout.scheduled',
    'booking',
    p_booking_id,
    jsonb_build_object(
      'organization_id',    v_org_id,
      'paid_amount',        v_paid_amount,
      'commission_amount',  v_commission_amount,
      'supplier_total',     v_supplier_total,
      'organization_net',   v_org_net,
      'supplier_payouts',   v_supplier_count,
      'currency',           v_currency
    )
  );

  RETURN v_booking;
END;
$$;

COMMENT ON FUNCTION public.complete_booking_event(uuid) IS
  'Completes a confirmed booking and schedules payouts: one per confirmed supplier (agreed_price) plus the organization remainder (paid - commission - supplier total). Deduped on booking_id.';

COMMIT;

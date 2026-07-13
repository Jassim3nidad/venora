-- ============================================================
-- Migration 059 — Commission Snapshots on Transactions
-- ============================================================
--
-- transactions.commission_amount already existed and was already a
-- snapshot (computed once at payment-confirmation time, never
-- recalculated) — this migration adds the richer breakdown fields the
-- spec asks for (applied rule, type, rate, gross/net split, calculation
-- timestamp/version) so a report can explain *why* a given commission
-- amount was what it was, without re-deriving it from commission_rules
-- (which may have changed since).
--
-- `currency` already exists on transactions (migration 021) and is
-- populated on every row — reused as-is rather than duplicated.
--
-- Design: resolve_commission() is a NEW function returning the full
-- resolution (rule id, type, rate, flat fee, computed amount) as a
-- composite type. calculate_commission() becomes a thin wrapper around it
-- so every existing caller (and its existing REVOKE/GRANT restricting it
-- to service_role) keeps working unchanged — this is what lets
-- confirm_booking_payment() get the richer detail without touching any
-- other caller's contract. Only confirm_booking_payment() itself is
-- modified, and only its commission-related lines — the reconciliation
-- guards, exception handling, and receipt/invoice logic are byte-for-byte
-- identical to the live version in 046_payment_confirmation_reconciliation.sql.

-- ── transactions: snapshot columns ───────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS applied_commission_rule_id uuid REFERENCES public.commission_rules(id),
  ADD COLUMN IF NOT EXISTS commission_type             text,
  ADD COLUMN IF NOT EXISTS commission_rate             numeric(5,2),
  ADD COLUMN IF NOT EXISTS gross_amount                numeric(12,2),
  ADD COLUMN IF NOT EXISTS net_provider_amount         numeric(12,2),
  ADD COLUMN IF NOT EXISTS commission_calculated_at    timestamptz,
  ADD COLUMN IF NOT EXISTS commission_calculation_version int;

COMMENT ON COLUMN public.transactions.applied_commission_rule_id IS
  'The commission_rules row used at calculation time. Nullable: legacy rows predate this column, and "no rule matched" is a valid outcome (commission_type=''none'').';
COMMENT ON COLUMN public.transactions.commission_calculation_version IS
  '0 = backfilled from legacy data (exact rule/type could not be reconstructed). 1 = computed by resolve_commission() v1. Bump this constant (and add a new CASE branch) if the resolution algorithm ever changes materially, so historical rows stay auditable against the version that actually produced them.';

-- Backfill: best-effort snapshot for existing PAID transactions only.
-- Pending/failed transactions never had a real commission outcome, so they
-- stay NULL rather than getting a fabricated snapshot.
UPDATE public.transactions
SET gross_amount = amount,
    net_provider_amount = GREATEST(amount - commission_amount, 0),
    commission_calculated_at = COALESCE(paid_at, created_at),
    commission_calculation_version = 0,
    commission_type = CASE WHEN commission_amount > 0 THEN 'unknown' ELSE 'none' END
WHERE gross_amount IS NULL
  AND status = 'paid';

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_commission_type_valid
    CHECK (commission_type IS NULL OR commission_type IN ('percentage', 'flat_fee', 'combined', 'none', 'unknown')) NOT VALID,
  ADD CONSTRAINT transactions_gross_amount_nonnegative
    CHECK (gross_amount IS NULL OR gross_amount >= 0) NOT VALID,
  ADD CONSTRAINT transactions_net_provider_amount_nonnegative
    CHECK (net_provider_amount IS NULL OR net_provider_amount >= 0) NOT VALID,
  ADD CONSTRAINT transactions_commission_rate_range
    CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100)) NOT VALID,
  ADD CONSTRAINT transactions_net_le_gross
    CHECK (net_provider_amount IS NULL OR gross_amount IS NULL OR net_provider_amount <= gross_amount) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_transactions_commission_rule
  ON public.transactions (applied_commission_rule_id)
  WHERE applied_commission_rule_id IS NOT NULL;

-- RLS on transactions already exists (010_rls.sql: customer/org SELECT own,
-- admin FOR ALL via is_admin()) and already covers these new columns —
-- adding columns to an RLS-enabled table doesn't require new policies.

-- ================================================================
-- resolve_commission() — full resolution detail, deterministic tiebreak
-- ================================================================
DO $$ BEGIN
  CREATE TYPE public.commission_resolution AS (
    rule_id             uuid,
    commission_type     text,
    rate                numeric,
    flat_fee            numeric,
    commission_amount   numeric,
    calculation_version int
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_commission(
  p_venue_id uuid,
  p_amount   numeric
)
RETURNS public.commission_resolution
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.commission_rules%ROWTYPE;
  v_commission numeric := 0;
  v_type text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN ROW(NULL, 'none', NULL, NULL, 0, 1)::public.commission_resolution;
  END IF;

  -- Same resolution as the live calculate_commission() (venue > category >
  -- global, most-specific-and-most-recent wins) plus an explicit
  -- created_at/id tiebreak so two rules with an identical effective_from
  -- ("conflicting rules") resolve deterministically instead of depending
  -- on unspecified row order.
  SELECT cr.* INTO v_rule
  FROM public.commission_rules cr
  LEFT JOIN public.venue_category_assignments vca
    ON vca.venue_id = p_venue_id AND cr.scope = 'category' AND cr.reference_id = vca.category_id
  WHERE cr.is_active
    AND cr.effective_from <= CURRENT_DATE
    AND (cr.effective_to IS NULL OR cr.effective_to >= CURRENT_DATE)
    AND (
      (cr.scope = 'venue' AND cr.reference_id = p_venue_id)
      OR (cr.scope = 'category' AND vca.venue_id IS NOT NULL)
      OR (cr.scope = 'global' AND cr.reference_id IS NULL)
    )
  ORDER BY CASE cr.scope WHEN 'venue' THEN 0 WHEN 'category' THEN 1 ELSE 2 END,
           cr.effective_from DESC,
           cr.created_at DESC,
           cr.id DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN ROW(NULL, 'none', NULL, NULL, 0, 1)::public.commission_resolution;
  END IF;

  v_commission := COALESCE(p_amount * v_rule.percentage / 100.0, 0)
                + COALESCE(v_rule.flat_fee, 0);

  IF v_rule.min_commission_amount IS NOT NULL AND v_commission < v_rule.min_commission_amount THEN
    v_commission := v_rule.min_commission_amount;
  END IF;
  IF v_rule.max_commission_amount IS NOT NULL AND v_commission > v_rule.max_commission_amount THEN
    v_commission := v_rule.max_commission_amount;
  END IF;
  v_commission := LEAST(ROUND(v_commission, 2), p_amount);

  v_type := CASE
    WHEN v_rule.percentage IS NOT NULL AND v_rule.flat_fee IS NOT NULL AND v_rule.flat_fee <> 0 THEN 'combined'
    WHEN v_rule.percentage IS NOT NULL THEN 'percentage'
    WHEN v_rule.flat_fee IS NOT NULL THEN 'flat_fee'
    ELSE 'none'
  END;

  RETURN ROW(v_rule.id, v_type, v_rule.percentage, v_rule.flat_fee, v_commission, 1)::public.commission_resolution;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_commission(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_commission(uuid, numeric) TO service_role;

COMMENT ON FUNCTION public.resolve_commission(uuid, numeric) IS
  'Full commission resolution (rule id, type, rate, computed amount) for a venue + amount. Never trusts client input — venue_id/amount come from server-side booking/transaction state, never a browser-supplied commission value. service_role only, same as calculate_commission().';

-- calculate_commission() becomes a thin wrapper — identical signature,
-- identical grants (untouched, still service_role-only from
-- 043_payments_platform.sql/047_explicit_role_revoke.sql), identical
-- return value for every existing caller.
CREATE OR REPLACE FUNCTION public.calculate_commission(
  p_venue_id uuid,
  p_amount   numeric
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.resolve_commission(p_venue_id, p_amount)).commission_amount;
$$;

-- ================================================================
-- confirm_booking_payment() — populate the snapshot atomically
-- ================================================================
-- Byte-for-byte identical to the live version in
-- 046_payment_confirmation_reconciliation.sql except: (1) resolve_commission()
-- replaces calculate_commission() to get the full breakdown, (2) the
-- transactions UPDATE also sets the new snapshot columns. Same signature,
-- so this REPLACEs the live function in place — no new overload, no
-- caller changes needed. Still one PL/pgSQL function body, so the
-- resolution + the payment-confirmation writes remain a single atomic
-- transaction exactly as before.
CREATE OR REPLACE FUNCTION public.confirm_booking_payment(
  p_payment_provider public.payment_provider,
  p_checkout_reference text,
  p_payment_reference text,
  p_amount_minor bigint,
  p_currency text
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_amount numeric;
  v_expected_minor bigint;
  v_resolution public.commission_resolution;
  v_booking_id uuid;
BEGIN
  IF p_checkout_reference IS NULL OR BTRIM(p_checkout_reference) = '' THEN
    RAISE EXCEPTION 'Reconciliation failed: missing checkout reference';
  END IF;

  IF p_payment_reference IS NULL OR BTRIM(p_payment_reference) = '' THEN
    RAISE EXCEPTION 'Reconciliation failed: missing payment reference';
  END IF;

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE payment_provider = p_payment_provider
    AND provider_reference = p_checkout_reference
    AND payment_kind = 'deposit'
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reconciliation failed: no pending transaction for checkout reference %', p_checkout_reference;
  END IF;

  v_booking_id := v_transaction.booking_id;

  v_expected_minor := ROUND(v_transaction.amount * 100)::bigint;
  IF v_expected_minor <> p_amount_minor THEN
    RAISE EXCEPTION 'Reconciliation failed: amount mismatch for transaction % (expected % centavos, got %)',
      v_transaction.id, v_expected_minor, p_amount_minor;
  END IF;

  IF upper(BTRIM(v_transaction.currency)) <> upper(BTRIM(p_currency)) THEN
    RAISE EXCEPTION 'Reconciliation failed: currency mismatch for transaction % (expected %, got %)',
      v_transaction.id, v_transaction.currency, p_currency;
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reconciliation failed: booking % not found for transaction %', v_booking_id, v_transaction.id;
  END IF;

  IF v_booking.status::text IN ('confirmed', 'completed', 'reviewed') THEN
    RETURN v_booking; -- idempotent replay of an already-settled webhook
  END IF;

  IF v_booking.status::text NOT IN ('approved', 'payment_pending') THEN
    RAISE EXCEPTION 'Reconciliation failed: booking % is not payable (status %)', v_booking_id, v_booking.status;
  END IF;

  v_amount := v_transaction.amount;

  -- Commission is ALWAYS computed here, server-side, from the venue and
  -- the transaction's own amount — never from any value the browser or a
  -- webhook payload could supply.
  v_resolution := public.resolve_commission(v_booking.venue_id, v_amount);

  UPDATE public.transactions
  SET status = 'paid',
      commission_amount = v_resolution.commission_amount,
      applied_commission_rule_id = v_resolution.rule_id,
      commission_type = v_resolution.commission_type,
      commission_rate = v_resolution.rate,
      gross_amount = v_amount,
      net_provider_amount = GREATEST(v_amount - v_resolution.commission_amount, 0),
      commission_calculated_at = now(),
      commission_calculation_version = v_resolution.calculation_version,
      -- Persist the settled payment reference (pay_...) for refunds;
      -- the checkout session reference that got us here is kept in
      -- metadata for audit purposes.
      provider_reference = p_payment_reference,
      paid_at = now(),
      metadata = metadata || jsonb_build_object(
        'confirmed_by', 'payment_webhook',
        'checkout_reference', p_checkout_reference
      )
  WHERE id = v_transaction.id
  RETURNING * INTO v_transaction;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE booking_id = v_booking_id AND status = 'issued'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.invoices
    SET status = 'paid',
        amount_paid = v_amount,
        amount_due = GREATEST(total_amount - v_amount, 0),
        paid_at = now()
    WHERE id = v_invoice.id;
  END IF;

  INSERT INTO public.receipts (
    receipt_number, invoice_id, transaction_id, booking_id, customer_id,
    amount, currency, payment_provider, provider_reference, metadata
  )
  VALUES (
    public.next_receipt_number(),
    v_invoice.id,
    v_transaction.id,
    v_booking_id,
    v_booking.customer_id,
    v_amount,
    v_transaction.currency,
    p_payment_provider,
    p_payment_reference,
    jsonb_build_object('payment_kind', v_transaction.payment_kind)
  )
  ON CONFLICT (transaction_id) DO NOTHING;

  UPDATE public.bookings
  SET status = 'confirmed',
      paid_at = now(),
      confirmed_at = now(),
      updated_at = now()
  WHERE id = v_booking_id
  RETURNING * INTO v_booking;

  PERFORM public.log_audit(
    'payment.confirmed', 'booking', v_booking_id,
    jsonb_build_object(
      'transaction_id', v_transaction.id,
      'provider', p_payment_provider::text,
      'checkout_reference', p_checkout_reference,
      'payment_reference', p_payment_reference,
      'amount', v_amount,
      'commission_amount', v_resolution.commission_amount,
      'commission_rule_id', v_resolution.rule_id,
      'commission_type', v_resolution.commission_type
    )
  );

  RETURN v_booking;
EXCEPTION
  WHEN OTHERS THEN
    -- Runs in the OUTER transaction even though the block above rolled
    -- back, so the audit record survives while no booking/transaction
    -- row was touched. SQLERRM is always a message we authored above
    -- (never provider payload contents), so this never leaks card data
    -- or other sensitive fields.
    PERFORM public.log_audit(
      'payment.reconciliation_failed', 'booking', v_booking_id,
      jsonb_build_object(
        'provider', p_payment_provider::text,
        'checkout_reference', p_checkout_reference,
        'payment_reference', p_payment_reference,
        'error', SQLERRM
      )
    );
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.confirm_booking_payment(public.payment_provider, text, text, bigint, text) IS
  'Reconciles a payment webhook against the transaction we created the checkout session for, then atomically confirms the booking and snapshots the commission breakdown (rule/type/rate/gross/net) via resolve_commission(). Requires exact match on checkout reference, amount (centavos), and currency; raises (no writes) on any mismatch.';

REVOKE EXECUTE ON FUNCTION public.confirm_booking_payment(public.payment_provider, text, text, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(public.payment_provider, text, text, bigint, text) TO service_role;

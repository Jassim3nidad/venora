-- ============================================================
-- Migration 040 - Payment confirmation reconciliation
-- ============================================================
--
-- Hardens confirm_booking_payment so a webhook event can only mark a
-- booking paid when it reconciles exactly against what we ourselves
-- recorded when the checkout session was created:
--
--   - the PayMongo checkout session reference must match the pending
--     transaction we created it for (no more "any pending transaction
--     for this booking" fallback matching)
--   - the captured amount must match, compared in exact minor units
--     (centavos) to avoid numeric/float rounding ambiguity
--   - the currency must match
--
-- The booking id is now DERIVED from the matched transaction row
-- (something only our own server code writes, via attach_payment_session)
-- rather than trusted from webhook-supplied metadata.
--
-- Any reconciliation failure raises before any row is touched — the
-- whole function body runs in one transaction, so a RAISE EXCEPTION
-- guarantees zero partial writes. The failure is still logged to
-- audit_logs for manual investigation (message text only — no payload,
-- no card data) via a PL/pgSQL exception handler, which composes with
-- rollback: statements *inside* the handler commit even though the
-- statements that led to the RAISE do not.

DROP FUNCTION IF EXISTS public.confirm_booking_payment(uuid, public.payment_provider, text, numeric);

CREATE FUNCTION public.confirm_booking_payment(
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
  v_commission numeric;
  v_booking_id uuid;
BEGIN
  IF p_checkout_reference IS NULL OR BTRIM(p_checkout_reference) = '' THEN
    RAISE EXCEPTION 'Reconciliation failed: missing checkout reference';
  END IF;

  IF p_payment_reference IS NULL OR BTRIM(p_payment_reference) = '' THEN
    RAISE EXCEPTION 'Reconciliation failed: missing payment reference';
  END IF;

  -- The ONLY source of truth for which booking this event belongs to is
  -- the transaction row we created via start_booking_payment /
  -- attach_payment_session — never the webhook's own metadata.
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
  v_commission := public.calculate_commission(v_booking.venue_id, v_amount);

  UPDATE public.transactions
  SET status = 'paid',
      commission_amount = v_commission,
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
      'commission_amount', v_commission
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
  'Reconciles a PayMongo webhook against the transaction we created the checkout session for. Requires exact match on checkout reference, amount (centavos), and currency; raises (no writes) on any mismatch and logs the failure to audit_logs for manual review.';

REVOKE EXECUTE ON FUNCTION public.confirm_booking_payment(public.payment_provider, text, text, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(public.payment_provider, text, text, bigint, text) TO service_role;

-- Defense-in-depth: these are only ever called from inside another
-- SECURITY DEFINER function's body, but tighten them directly too so
-- their own grants can never regress independently.
REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_receipt_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_receipt_number() TO service_role;

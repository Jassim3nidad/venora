-- ============================================================
-- Migration 042 - Checkout session attach race fix
-- ============================================================
--
-- start_booking_payment locks the booking row (FOR UPDATE), which
-- prevents two concurrent calls from ever creating two pending
-- transactions for the same booking. But two concurrent requests can
-- still both observe the SAME already-inserted pending transaction
-- (with no checkout session attached yet), each independently create a
-- separate PayMongo checkout session for it, and then race to call
-- attach_payment_session. The previous implementation unconditionally
-- overwrote provider_reference/checkout_url on every call — so
-- whichever request happened to commit last would silently clobber the
-- other's session reference, leaving the loser's browser tab pointed at
-- a checkout page whose session id no longer matches what
-- confirm_booking_payment will look for (webhook reconciliation would
-- then correctly *fail closed*, but the customer's payment would
-- appear to hang instead of ever completing).
--
-- Fix: first-attach-wins. Only accept the session if none is attached
-- yet (checkout_url IS NULL); otherwise return the transaction row
-- unchanged so the losing caller's use-case layer can hand back the
-- ALREADY-canonical session instead of the one it just (redundantly)
-- created with the provider.

-- p_force distinguishes two different callers:
--   - false (default): "attach if nothing is there yet" — used for a
--     brand-new session, where first-attach-wins must reject a racing
--     duplicate rather than clobber the winner's reference.
--   - true: "replace whatever is there" — used only when the use-case
--     layer has already decided the existing session is stale (past
--     its TTL) and deliberately wants to supersede it.
DROP FUNCTION IF EXISTS public.attach_payment_session(uuid, text, text, jsonb);

CREATE FUNCTION public.attach_payment_session(
  p_transaction_id uuid,
  p_provider_reference text,
  p_checkout_url text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_force boolean DEFAULT false
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction public.transactions%ROWTYPE;
  v_customer_id uuid;
BEGIN
  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  SELECT customer_id INTO v_customer_id
  FROM public.bookings
  WHERE id = v_transaction.booking_id;

  -- Service-role calls have no auth context; when a user context exists
  -- (defense in depth), it must be the booking customer or an admin.
  IF auth.uid() IS NOT NULL
     AND v_customer_id <> auth.uid()
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to update this transaction';
  END IF;

  IF v_transaction.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending transactions can be attached to a checkout session';
  END IF;

  -- First-attach-wins unless the caller explicitly asked to replace a
  -- stale session: a concurrent winner's reference is never silently
  -- clobbered by a losing racer.
  IF v_transaction.checkout_url IS NOT NULL AND NOT p_force THEN
    RETURN v_transaction;
  END IF;

  UPDATE public.transactions
  SET provider_reference = NULLIF(BTRIM(p_provider_reference), ''),
      checkout_url = NULLIF(BTRIM(p_checkout_url), ''),
      metadata = metadata || COALESCE(p_metadata, '{}'::jsonb)
  WHERE id = p_transaction_id
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$;

COMMENT ON FUNCTION public.attach_payment_session(uuid, text, text, jsonb, boolean) IS
  'First-attach-wins by default: a checkout session already attached is left as the canonical row so concurrent checkout requests converge on one session. Pass p_force=true only to deliberately replace a session the caller has determined is stale.';

REVOKE EXECUTE ON FUNCTION public.attach_payment_session(uuid, text, text, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_payment_session(uuid, text, text, jsonb, boolean) TO service_role;

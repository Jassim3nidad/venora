-- ============================================================
-- needs_review counts as an open withdrawal
-- ============================================================
--
-- Two corrections found by audit.
--
-- 1. request_withdrawal() guarded its one-open-withdrawal rule on
--    ('pending','approved','processing'), which let a recipient open a
--    second withdrawal while an earlier one sat in needs_review.
--
--    No double-spend was possible -- the parked withdrawal still holds its
--    claimed payouts as `processing`, so those pesos stay unclaimable --
--    but it broke the invariant at exactly the moment the first payout's
--    outcome was unknown and possibly already paid. This is a business
--    safety rule, so it is enforced here in the database; the UI check is
--    advisory only.
--
-- 2. resolve_withdrawal_review() logged the outcome but not the status it
--    moved from, so the audit trail could not show the transition. It now
--    records previous_status and new_status.
--
-- No change to any fund-release condition. Release still happens only via
-- release_withdrawal_payouts(), reached only from a confirmed terminal
-- state.
--
-- Verification:
--   -- with a needs_review withdrawal present, this must raise:
--   SELECT public.request_withdrawal(500, '<verified-account>', 'probe');

BEGIN;

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_payout_account_id uuid,
  p_idempotency_key text
)
RETURNS public.withdrawal_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_account      public.payout_accounts%ROWTYPE;
  v_request      public.withdrawal_requests%ROWTYPE;
  v_org_id       uuid;
  v_supplier_id  uuid;
  v_amount       numeric;
  v_cutoff       timestamptz := now() - public.payout_hold_period();
  v_remaining    numeric;
  v_payout       record;
  v_claim        numeric;
  v_claimed_ids  uuid[] := '{}';
  v_open_count   integer;
  v_recent_count integer;
  v_currency     text := 'PHP';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to request a withdrawal';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'An idempotency key is required';
  END IF;

  -- Round to centavos up front; every later comparison uses this value so
  -- the request amount and the claimed total cannot drift apart.
  v_amount := round(p_amount, 2);

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than zero';
  END IF;

  IF v_amount < public.minimum_withdrawal_amount() THEN
    RAISE EXCEPTION 'Minimum withdrawal is %', public.minimum_withdrawal_amount();
  END IF;

  -- Idempotency: a retry of the same submission returns the original row
  -- instead of claiming a second set of payouts.
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE requested_by = v_user_id
    AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_request;
  END IF;

  SELECT * INTO v_account
  FROM public.payout_accounts
  WHERE id = p_payout_account_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout account not found';
  END IF;

  IF v_account.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'That payout account has been removed';
  END IF;

  IF v_account.verified_at IS NULL THEN
    RAISE EXCEPTION 'That payout account is not verified yet';
  END IF;

  v_org_id      := v_account.organization_id;
  v_supplier_id := v_account.supplier_id;

  IF NOT (
    (v_org_id IS NOT NULL AND public.is_org_member(v_org_id))
    OR (v_supplier_id IS NOT NULL AND public.is_supplier_owner(v_supplier_id))
  ) THEN
    RAISE EXCEPTION 'You do not have permission to withdraw to this account';
  END IF;

  -- Rate limit 1: one open withdrawal per recipient. Concurrent
  -- disbursements to the same destination are the main way a payout
  -- system leaks money when a provider retries.
  --
  -- needs_review counts as open. A withdrawal under review still holds
  -- its claimed payouts and its real outcome is unknown -- possibly
  -- already paid. Allowing a second withdrawal while the first is
  -- unresolved is precisely the wrong moment to send more money.
  SELECT count(*) INTO v_open_count
  FROM public.withdrawal_requests w
  WHERE w.status IN ('pending', 'approved', 'processing', 'needs_review')
    AND (
      (v_org_id IS NOT NULL AND w.organization_id = v_org_id)
      OR (v_supplier_id IS NOT NULL AND w.supplier_id = v_supplier_id)
    );

  IF v_open_count > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.withdrawal_requests w
      WHERE w.status = 'needs_review'
        AND (
          (v_org_id IS NOT NULL AND w.organization_id = v_org_id)
          OR (v_supplier_id IS NOT NULL AND w.supplier_id = v_supplier_id)
        )
    ) THEN
      RAISE EXCEPTION 'A previous withdrawal is under review while we confirm its outcome. You can request another once it is resolved.';
    END IF;

    RAISE EXCEPTION 'You already have a withdrawal in progress. Please wait for it to complete.';
  END IF;

  -- Rate limit 2: bounded attempts per rolling day, counting rejected and
  -- cancelled ones so churn cannot be used to probe the ledger.
  SELECT count(*) INTO v_recent_count
  FROM public.withdrawal_requests w
  WHERE w.requested_at > now() - interval '24 hours'
    AND (
      (v_org_id IS NOT NULL AND w.organization_id = v_org_id)
      OR (v_supplier_id IS NOT NULL AND w.supplier_id = v_supplier_id)
    );

  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Too many withdrawal requests in the last 24 hours. Please try again later.';
  END IF;

  -- Claim payouts oldest-first under row locks. FOR UPDATE here is what
  -- serializes two concurrent requests for the same recipient.
  v_remaining := v_amount;

  FOR v_payout IN
    SELECT p.id, p.amount, p.currency, p.scheduled_at,
           p.organization_id, p.supplier_id, p.booking_id
    FROM public.payouts p
    WHERE p.status = 'scheduled'
      AND p.withdrawal_request_id IS NULL
      AND p.scheduled_at IS NOT NULL
      AND p.scheduled_at <= v_cutoff
      AND (
        (v_org_id IS NOT NULL AND p.organization_id = v_org_id)
        OR (v_supplier_id IS NOT NULL AND p.supplier_id = v_supplier_id)
      )
    ORDER BY p.scheduled_at, p.id
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_currency := v_payout.currency;
    v_claim := LEAST(v_payout.amount, v_remaining);

    IF v_claim < v_payout.amount THEN
      -- Partial claim: split off the unclaimed remainder so the request
      -- is backed by exactly the requested amount. The child keeps the
      -- parent's scheduled_at so the hold clock is not restarted, and
      -- carries no booking_id because the dedupe indexes permit only one
      -- payout per booking per recipient.
      INSERT INTO public.payouts (
        parent_payout_id, organization_id, supplier_id,
        amount, currency, status, scheduled_at
      )
      VALUES (
        v_payout.id, v_payout.organization_id, v_payout.supplier_id,
        v_payout.amount - v_claim, v_payout.currency, 'scheduled',
        v_payout.scheduled_at
      );

      UPDATE public.payouts SET amount = v_claim WHERE id = v_payout.id;
    END IF;

    v_claimed_ids := v_claimed_ids || v_payout.id;
    v_remaining := v_remaining - v_claim;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION
      'Insufficient available balance. You are short by % %.',
      round(v_remaining, 2), v_currency;
  END IF;

  INSERT INTO public.withdrawal_requests (
    organization_id, supplier_id, payout_account_id,
    amount, currency, status, idempotency_key, requested_by
  )
  VALUES (
    v_org_id, v_supplier_id, p_payout_account_id,
    v_amount, v_currency, 'pending', p_idempotency_key, v_user_id
  )
  RETURNING * INTO v_request;

  UPDATE public.payouts
  SET status = 'processing',
      withdrawal_request_id = v_request.id
  WHERE id = ANY (v_claimed_ids);

  PERFORM public.log_audit(
    'withdrawal.requested',
    'withdrawal_request',
    v_request.id,
    jsonb_build_object(
      'organization_id',   v_org_id,
      'supplier_id',       v_supplier_id,
      'amount',            v_amount,
      'currency',          v_currency,
      'payout_account_id', p_payout_account_id,
      'method',            v_account.method,
      'last4',             v_account.account_number_last4,
      'claimed_payouts',   array_length(v_claimed_ids, 1)
    )
  );

  PERFORM public.notify_withdrawal(
    v_org_id, v_supplier_id,
    'Withdrawal request submitted',
    format('Your withdrawal of %s %s is awaiting review.', v_currency, v_amount),
    NULL,
    jsonb_build_object('withdrawal_request_id', v_request.id)
  );

  BEGIN
    PERFORM public.notify_admins(
      'payment_update'::public.notification_kind,
      'Withdrawal awaiting review',
      format('%s %s requested for review.', v_currency, v_amount),
      '/admin/withdrawals',
      jsonb_build_object('withdrawal_request_id', v_request.id),
      'high'::public.notification_priority,
      'withdrawal:' || v_request.id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins failed for withdrawal %: %', v_request.id, SQLERRM;
  END;

  RETURN v_request;
END;
$$;

COMMENT ON FUNCTION public.request_withdrawal(numeric, uuid, text) IS
  'Claims scheduled payouts under FOR UPDATE locks and records a withdrawal request. Idempotent per (requester, key). Refuses while any withdrawal for the recipient is pending, approved, processing or needs_review.';

-- Records the transition itself, not just the outcome, so the audit trail
-- shows what state the withdrawal was moved from.
CREATE OR REPLACE FUNCTION public.resolve_withdrawal_review(
  p_withdrawal_id uuid,
  p_outcome text,
  p_note text
)
RETURNS public.withdrawal_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request  public.withdrawal_requests%ROWTYPE;
  v_previous public.withdrawal_status;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can resolve a withdrawal review';
  END IF;

  IF p_outcome NOT IN ('paid', 'failed') THEN
    RAISE EXCEPTION 'Outcome must be paid or failed';
  END IF;

  IF p_note IS NULL OR btrim(p_note) = '' THEN
    RAISE EXCEPTION 'A note recording how the outcome was verified is required';
  END IF;

  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id AND status = 'needs_review'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only a withdrawal under review can be resolved';
  END IF;

  v_previous := v_request.status;

  UPDATE public.withdrawal_requests
  SET status = p_outcome::public.withdrawal_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = btrim(p_note),
      processed_at = now()
  WHERE id = p_withdrawal_id
  RETURNING * INTO v_request;

  IF p_outcome = 'paid' THEN
    UPDATE public.payouts
    SET status = 'paid'
    WHERE withdrawal_request_id = p_withdrawal_id
      AND status = 'processing';
  ELSE
    PERFORM public.release_withdrawal_payouts(p_withdrawal_id, true);
  END IF;

  PERFORM public.log_audit(
    'withdrawal.review_resolved',
    'withdrawal_request',
    p_withdrawal_id,
    jsonb_build_object(
      'previous_status', v_previous,
      'new_status',      p_outcome,
      'note',            btrim(p_note),
      'amount',          v_request.amount,
      'currency',        v_request.currency,
      'transfer_id',     v_request.provider_reference
    )
  );

  RETURN v_request;
END;
$$;

COMMIT;

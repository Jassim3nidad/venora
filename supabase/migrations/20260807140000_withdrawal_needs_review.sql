-- ============================================================
-- needs_review state + database-level duplicate prevention
-- ============================================================
--
-- Two safety gaps closed here.
--
-- 1. THE MISSING STATE. The lifecycle had no way to express "we do not
--    know what happened." Every outcome had to be forced into paid or
--    failed, and `failed` releases funds. So an undocumented provider
--    response, an unexpected status value, or a reconciliation failure
--    would either release money that may have moved, or sit in
--    `processing` forever with nobody alerted.
--
--    `needs_review` is terminal for automation and non-terminal for
--    humans. Crucially it does NOT release the claimed payouts: they stay
--    `processing`, because releasing them would assert the money did not
--    move, which is exactly the thing we do not know.
--
-- 2. DUPLICATE CREATION. begin_withdrawal_disbursement() claimed on
--    status alone. A withdrawal that already carried a transfer id could
--    in principle be re-claimed and sent twice. The claim now also
--    requires provider_reference IS NULL, so the database — not the
--    application — is what makes a second transfer impossible.
--
-- Verification:
--   SELECT unnest(enum_range(NULL::public.withdrawal_status));
--   SELECT count(*) FROM public.withdrawal_requests
--    WHERE status = 'needs_review';  -- each one needs an operator

ALTER TYPE public.withdrawal_status ADD VALUE IF NOT EXISTS 'needs_review';

BEGIN;

-- ── Duplicate prevention at the claim ─────────────────────────
-- Replaces the 20260805132000 definition. Only difference: a withdrawal
-- that already has a provider_reference can never be claimed again.
CREATE OR REPLACE FUNCTION public.begin_withdrawal_disbursement(
  p_request_id uuid,
  p_provider public.payment_provider
)
RETURNS public.withdrawal_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.withdrawal_requests%ROWTYPE;
BEGIN
  UPDATE public.withdrawal_requests
  SET status = 'processing',
      payment_provider = p_provider
  WHERE id = p_request_id
    AND status = 'approved'
    -- The database-level duplicate guard. If a transfer identifier was
    -- ever recorded for this withdrawal, no second transfer may be created
    -- for it under any circumstances.
    AND provider_reference IS NULL
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  PERFORM public.log_audit(
    'withdrawal.disbursement_started', 'withdrawal_request', p_request_id,
    jsonb_build_object('provider', p_provider, 'amount', v_request.amount)
  );

  RETURN v_request;
END;
$$;

-- ── needs_review ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.flag_withdrawal_for_review(
  p_withdrawal_id uuid,
  p_provider public.payment_provider,
  p_reason text,
  p_transfer_id text DEFAULT NULL
)
RETURNS public.withdrawal_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.withdrawal_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal % not found', p_withdrawal_id;
  END IF;

  -- Never override a state that was established from verified data.
  IF v_request.status IN ('paid', 'failed', 'rejected', 'cancelled') THEN
    RETURN v_request;
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'needs_review',
      payment_provider = p_provider,
      provider_reference = COALESCE(provider_reference, p_transfer_id),
      failure_reason = NULLIF(btrim(p_reason), '')
  WHERE id = p_withdrawal_id
  RETURNING * INTO v_request;

  -- Payouts stay `processing` on purpose. Releasing them would assert the
  -- money did not move, which is precisely what is unknown here.

  PERFORM public.log_audit(
    'withdrawal.needs_review', 'withdrawal_request', p_withdrawal_id,
    jsonb_build_object(
      'provider', p_provider,
      'reason', p_reason,
      'transfer_id', p_transfer_id,
      'amount', v_request.amount
    )
  );

  PERFORM public.notify_withdrawal(
    v_request.organization_id, v_request.supplier_id,
    'Withdrawal under review',
    format('Your withdrawal of %s %s needs a manual check. We will update you shortly.',
           v_request.currency, v_request.amount),
    NULL,
    jsonb_build_object('withdrawal_request_id', p_withdrawal_id)
  );

  BEGIN
    PERFORM public.notify_admins(
      'payment_update'::public.notification_kind,
      'Withdrawal needs review',
      format('%s %s could not be classified automatically: %s',
             v_request.currency, v_request.amount, p_reason),
      '/admin/withdrawals',
      jsonb_build_object('withdrawal_request_id', p_withdrawal_id),
      'urgent'::public.notification_priority,
      'withdrawal-review:' || p_withdrawal_id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins failed for review flag %: %', p_withdrawal_id, SQLERRM;
  END;

  RETURN v_request;
END;
$$;

COMMENT ON FUNCTION public.flag_withdrawal_for_review(uuid, public.payment_provider, text, text) IS
  'Parks a withdrawal whose outcome cannot be determined from verified provider data. Deliberately does NOT release claimed payouts — the money state is unknown. service_role only.';

-- ── Resolving a review from verified data ─────────────────────
-- settle_ and fail_ previously required `processing`. An operator who has
-- confirmed the real outcome with the provider must be able to move a
-- needs_review withdrawal to its terminal state.

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
  v_request public.withdrawal_requests%ROWTYPE;
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
    'withdrawal.review_resolved', 'withdrawal_request', p_withdrawal_id,
    jsonb_build_object('outcome', p_outcome, 'note', p_note, 'amount', v_request.amount)
  );

  RETURN v_request;
END;
$$;

COMMENT ON FUNCTION public.resolve_withdrawal_review(uuid, text, text) IS
  'Admin resolution of a needs_review withdrawal, after confirming the real outcome with the provider. Requires a note recording how it was verified.';

REVOKE EXECUTE ON FUNCTION public.flag_withdrawal_for_review(uuid, public.payment_provider, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flag_withdrawal_for_review(uuid, public.payment_provider, text, text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.resolve_withdrawal_review(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_withdrawal_review(uuid, text, text)
  TO authenticated;

COMMIT;

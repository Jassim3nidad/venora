-- ============================================================
-- Withdrawal requests — the money-out path
-- ============================================================
--
-- Venue owners (via organization) and suppliers claim scheduled payouts
-- and request disbursement to a verified payout_account.
--
-- SECURITY MODEL
--   * withdrawal_requests has a SELECT policy and NOTHING else. There is
--     no INSERT/UPDATE/DELETE policy and no table grant for authenticated,
--     so the only way a row can exist is request_withdrawal(). Direct
--     inserts fail at both the privilege and the policy layer.
--   * request_withdrawal() takes FOR UPDATE row locks on the candidate
--     payouts before summing them. Two concurrent requests for the same
--     recipient serialize on those locks, so the same peso cannot be
--     claimed twice.
--   * Claiming is exact. Payout rows are indivisible units of earned
--     money, so when the last claimed row overshoots the requested amount
--     it is SPLIT: the claimed portion keeps the row (and its booking_id),
--     and the remainder becomes a child row that stays claimable with the
--     original scheduled_at, so splitting never resets the hold clock.
--     The child carries booking_id = NULL because the UNIQUE dedupe
--     indexes from the ledger-hardening migration allow exactly one org
--     payout per booking; parent_payout_id preserves the lineage.
--   * Amounts are never taken from the client for the ledger side: the
--     request records what was asked, and the claimed payouts are what
--     actually back it. They are equal by construction or the call fails.
--
-- Everything that moves money is SECURITY DEFINER, audited via log_audit,
-- and locked down to the narrowest role in the companion lockdown
-- migration.
--
-- Verification:
--   SELECT polname, cmd FROM pg_policies WHERE tablename = 'withdrawal_requests';
--   -- expect exactly the two SELECT policies, no INSERT/UPDATE/DELETE
--   SELECT grantee, privilege_type FROM information_schema.table_privileges
--    WHERE table_name = 'withdrawal_requests' AND grantee = 'authenticated';
--   -- expect SELECT only

-- Enum extension must run outside the transaction below; it is a no-op
-- when the value already exists (the enum has two historical shapes in
-- this repo, 035's and 036's, depending on apply order).
ALTER TYPE public.notification_kind ADD VALUE IF NOT EXISTS 'payment_update';

BEGIN;

DO $$ BEGIN
  CREATE TYPE public.withdrawal_status AS ENUM (
    'pending',     -- submitted by the recipient, awaiting review
    'approved',    -- cleared for disbursement
    'processing',  -- sent to the provider, awaiting webhook
    'paid',        -- provider confirmed settlement (terminal)
    'failed',      -- provider rejected/failed; payouts released
    'rejected',    -- admin declined; payouts released
    'cancelled'    -- withdrawn by the requester; payouts released
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id                 uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid                     REFERENCES public.organizations(id),
  supplier_id        uuid                     REFERENCES public.supplier_profiles(id),
  payout_account_id  uuid                     NOT NULL REFERENCES public.payout_accounts(id),

  amount             numeric(12,2)            NOT NULL CHECK (amount > 0),
  currency           text                     NOT NULL DEFAULT 'PHP',
  status             public.withdrawal_status NOT NULL DEFAULT 'pending',

  idempotency_key    text                     NOT NULL,
  requested_by       uuid                     NOT NULL REFERENCES public.profiles(id),
  requested_at       timestamptz              NOT NULL DEFAULT now(),

  reviewed_by        uuid                     REFERENCES public.profiles(id),
  reviewed_at        timestamptz,
  review_note        text,

  payment_provider   public.payment_provider,
  provider_reference text,
  failure_reason     text,
  processed_at       timestamptz,

  metadata           jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz              NOT NULL DEFAULT now(),
  updated_at         timestamptz              NOT NULL DEFAULT now(),

  CONSTRAINT withdrawal_requests_recipient CHECK (
    (organization_id IS NOT NULL) <> (supplier_id IS NOT NULL)
  )
);

-- Idempotency (defends against double-submit / retried server actions).
CREATE UNIQUE INDEX IF NOT EXISTS uq_withdrawal_requests_idempotency
  ON public.withdrawal_requests (requested_by, idempotency_key);

-- Webhook correlation.
CREATE UNIQUE INDEX IF NOT EXISTS uq_withdrawal_requests_provider_reference
  ON public.withdrawal_requests (payment_provider, provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_organization
  ON public.withdrawal_requests (organization_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_supplier
  ON public.withdrawal_requests (supplier_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status
  ON public.withdrawal_requests (status, requested_at DESC);

DROP TRIGGER IF EXISTS withdrawal_requests_updated_at ON public.withdrawal_requests;
CREATE TRIGGER withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.withdrawal_requests IS
  'Recipient-initiated payout disbursements. Insertable only through request_withdrawal(); no INSERT policy or grant exists for authenticated.';

-- ── Payout claim linkage ──────────────────────────────────────

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS withdrawal_request_id uuid
    REFERENCES public.withdrawal_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_payout_id uuid
    REFERENCES public.payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payouts_withdrawal_request
  ON public.payouts (withdrawal_request_id)
  WHERE withdrawal_request_id IS NOT NULL;

-- The hot path for the balance query and the claim loop.
CREATE INDEX IF NOT EXISTS idx_payouts_claimable_organization
  ON public.payouts (organization_id, scheduled_at)
  WHERE organization_id IS NOT NULL AND withdrawal_request_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_payouts_claimable_supplier
  ON public.payouts (supplier_id, scheduled_at)
  WHERE supplier_id IS NOT NULL AND withdrawal_request_id IS NULL;

COMMENT ON COLUMN public.payouts.withdrawal_request_id IS
  'Set when a withdrawal claims this payout. NULL means claimable. Released back to NULL if the request is rejected, cancelled, or fails.';
COMMENT ON COLUMN public.payouts.parent_payout_id IS
  'Set on the remainder row produced when a withdrawal claimed only part of a payout. The parent keeps booking_id; the child inherits scheduled_at so the hold period is not restarted.';

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawal_requests.select.owner" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_requests.select.owner" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(organization_id)
    OR public.is_supplier_owner(supplier_id)
  );

DROP POLICY IF EXISTS "withdrawal_requests.select.admin" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_requests.select.admin" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Deliberately read-only for every client role. All mutation flows
-- through the audited SECURITY DEFINER functions below.
REVOKE ALL ON public.withdrawal_requests FROM anon, authenticated;
GRANT SELECT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;

-- ── Internal helpers ──────────────────────────────────────────

-- Resolves the human who should receive notifications for a recipient.
CREATE OR REPLACE FUNCTION public.withdrawal_recipient_profile(
  p_organization_id uuid,
  p_supplier_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_organization_id IS NOT NULL THEN
      (SELECT o.owner_id FROM public.organizations o WHERE o.id = p_organization_id)
    ELSE
      (SELECT s.profile_id FROM public.supplier_profiles s WHERE s.id = p_supplier_id)
  END;
$$;

-- Notification delivery must never abort a money operation, so every
-- caller routes through here and swallows failures.
CREATE OR REPLACE FUNCTION public.notify_withdrawal(
  p_organization_id uuid,
  p_supplier_id uuid,
  p_title text,
  p_body text,
  p_link text,
  p_metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  v_profile_id := public.withdrawal_recipient_profile(p_organization_id, p_supplier_id);
  IF v_profile_id IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    -- Named notation disambiguates the two create_notification overloads
    -- this schema carries (036's and 037's); p_priority exists on 036's
    -- only, which is the canonical one per migration 065.
    PERFORM public.create_notification(
      p_user_id  => v_profile_id,
      p_kind     => 'payment_update'::public.notification_kind,
      p_title    => p_title,
      p_body     => p_body,
      p_link     => p_link,
      p_metadata => p_metadata,
      p_priority => 'high'::public.notification_priority
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_withdrawal failed: %', SQLERRM;
  END;
END;
$$;

-- ── Balance ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_available_balance(
  p_organization_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL
)
RETURNS TABLE (
  available  numeric,
  pending    numeric,
  in_transit numeric,
  currency   text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - public.payout_hold_period();
BEGIN
  IF (p_organization_id IS NOT NULL) = (p_supplier_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Provide exactly one of organization or supplier';
  END IF;

  IF NOT (
    public.is_admin()
    OR (p_organization_id IS NOT NULL AND public.is_org_member(p_organization_id))
    OR (p_supplier_id IS NOT NULL AND public.is_supplier_owner(p_supplier_id))
  ) THEN
    RAISE EXCEPTION 'You do not have permission to view this balance';
  END IF;

  RETURN QUERY
  SELECT
    -- Past the hold window and unclaimed.
    COALESCE(SUM(p.amount) FILTER (
      WHERE p.status = 'scheduled'
        AND p.withdrawal_request_id IS NULL
        AND p.scheduled_at IS NOT NULL
        AND p.scheduled_at <= v_cutoff
    ), 0)::numeric,
    -- Earned but still inside the refund/dispute hold window.
    COALESCE(SUM(p.amount) FILTER (
      WHERE p.status = 'scheduled'
        AND p.withdrawal_request_id IS NULL
        AND (p.scheduled_at IS NULL OR p.scheduled_at > v_cutoff)
    ), 0)::numeric,
    -- Claimed by a withdrawal that has not settled yet.
    COALESCE(SUM(p.amount) FILTER (
      WHERE p.status IN ('processing', 'failed')
         OR (p.status = 'scheduled' AND p.withdrawal_request_id IS NOT NULL)
    ), 0)::numeric,
    COALESCE(MIN(p.currency), 'PHP')::text
  FROM public.payouts p
  WHERE p.status <> 'paid'
    AND (
      (p_organization_id IS NOT NULL AND p.organization_id = p_organization_id)
      OR (p_supplier_id IS NOT NULL AND p.supplier_id = p_supplier_id)
    );
END;
$$;

COMMENT ON FUNCTION public.get_available_balance(uuid, uuid) IS
  'Withdrawable balance for one organization or supplier: available (past hold, unclaimed), pending (inside hold), in_transit (claimed, unsettled). Scoped by is_org_member/is_supplier_owner.';

-- ── Request withdrawal ────────────────────────────────────────

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

  -- Rate limit 1: one in-flight withdrawal per recipient. Concurrent
  -- disbursements to the same destination are the main way a payout
  -- system leaks money when a provider retries.
  SELECT count(*) INTO v_open_count
  FROM public.withdrawal_requests w
  WHERE w.status IN ('pending', 'approved', 'processing')
    AND (
      (v_org_id IS NOT NULL AND w.organization_id = v_org_id)
      OR (v_supplier_id IS NOT NULL AND w.supplier_id = v_supplier_id)
    );

  IF v_open_count > 0 THEN
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
  'Claims scheduled payouts under FOR UPDATE locks and records a withdrawal request. Idempotent per (requester, key). The only way a withdrawal_requests row can be created.';

-- ── Release helper ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.release_withdrawal_payouts(
  p_request_id uuid,
  p_mark_failed boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_mark_failed THEN
    -- Provider-side failure: keep the payouts attached so the failure is
    -- traceable to the request that caused it, then return them to the
    -- claimable pool in a second step.
    UPDATE public.payouts
    SET status = 'failed'
    WHERE withdrawal_request_id = p_request_id
      AND status = 'processing';
  END IF;

  UPDATE public.payouts
  SET status = 'scheduled',
      withdrawal_request_id = NULL
  WHERE withdrawal_request_id = p_request_id
    AND status IN ('processing', 'failed');
END;
$$;

-- ── Requester-side cancellation ───────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_withdrawal_request(
  p_request_id uuid
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
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF NOT (
    public.is_org_member(v_request.organization_id)
    OR public.is_supplier_owner(v_request.supplier_id)
  ) THEN
    RAISE EXCEPTION 'You do not have permission to cancel this withdrawal';
  END IF;

  -- Once it has been sent to the provider it is no longer ours to cancel.
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Only a withdrawal still awaiting review can be cancelled';
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'cancelled'
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  PERFORM public.release_withdrawal_payouts(p_request_id, false);

  PERFORM public.log_audit(
    'withdrawal.cancelled', 'withdrawal_request', p_request_id,
    jsonb_build_object('amount', v_request.amount)
  );

  RETURN v_request;
END;
$$;

-- ── Admin review ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.approve_withdrawal_request(
  p_request_id uuid,
  p_note text DEFAULT NULL
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
    RAISE EXCEPTION 'Only an administrator can approve a withdrawal';
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = NULLIF(btrim(p_note), '')
  WHERE id = p_request_id
    AND status = 'pending'
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only a withdrawal awaiting review can be approved';
  END IF;

  PERFORM public.log_audit(
    'withdrawal.approved', 'withdrawal_request', p_request_id,
    jsonb_build_object('amount', v_request.amount, 'note', p_note)
  );

  PERFORM public.notify_withdrawal(
    v_request.organization_id, v_request.supplier_id,
    'Withdrawal approved',
    format('Your withdrawal of %s %s was approved and is being sent to your account.',
           v_request.currency, v_request.amount),
    NULL,
    jsonb_build_object('withdrawal_request_id', p_request_id)
  );

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal_request(
  p_request_id uuid,
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
    RAISE EXCEPTION 'Only an administrator can reject a withdrawal';
  END IF;

  IF p_note IS NULL OR btrim(p_note) = '' THEN
    RAISE EXCEPTION 'A reason is required when rejecting a withdrawal';
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = btrim(p_note)
  WHERE id = p_request_id
    AND status IN ('pending', 'approved')
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only a withdrawal that has not been sent to the provider can be rejected';
  END IF;

  PERFORM public.release_withdrawal_payouts(p_request_id, false);

  PERFORM public.log_audit(
    'withdrawal.rejected', 'withdrawal_request', p_request_id,
    jsonb_build_object('amount', v_request.amount, 'note', p_note)
  );

  PERFORM public.notify_withdrawal(
    v_request.organization_id, v_request.supplier_id,
    'Withdrawal declined',
    format('Your withdrawal of %s %s was declined: %s',
           v_request.currency, v_request.amount, btrim(p_note)),
    NULL,
    jsonb_build_object('withdrawal_request_id', p_request_id)
  );

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_payout_account(
  p_account_id uuid,
  p_reference text DEFAULT NULL
)
RETURNS public.payout_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.payout_accounts%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can verify a payout account';
  END IF;

  UPDATE public.payout_accounts
  SET verified_at = now(),
      verification_reference = NULLIF(btrim(p_reference), '')
  WHERE id = p_account_id
    AND archived_at IS NULL
  RETURNING * INTO v_account;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout account not found';
  END IF;

  PERFORM public.log_audit(
    'payout_account.verified', 'payout_account', p_account_id,
    jsonb_build_object('reference', p_reference)
  );

  RETURN v_account;
END;
$$;

-- ── Disbursement lifecycle (service_role only) ────────────────

-- Claims an approved request for disbursement. Returns NULL when the
-- request is not claimable, so a duplicate executor run is a no-op rather
-- than a second provider call.
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

-- Stores the provider reference so webhooks can correlate back.
CREATE OR REPLACE FUNCTION public.attach_withdrawal_provider_reference(
  p_request_id uuid,
  p_provider public.payment_provider,
  p_provider_reference text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.withdrawal_requests
  SET payment_provider = p_provider,
      provider_reference = COALESCE(provider_reference, p_provider_reference)
  WHERE id = p_request_id;
END;
$$;

-- Settlement and failure accept either our own id (from provider
-- metadata) or the provider reference, because a webhook can arrive
-- before attach_withdrawal_provider_reference() has committed.
CREATE OR REPLACE FUNCTION public.settle_withdrawal_request(
  p_provider public.payment_provider,
  p_withdrawal_id uuid DEFAULT NULL,
  p_provider_reference text DEFAULT NULL
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
  WHERE (p_withdrawal_id IS NOT NULL AND id = p_withdrawal_id)
     OR (p_provider_reference IS NOT NULL
         AND payment_provider = p_provider
         AND provider_reference = p_provider_reference)
  ORDER BY requested_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No withdrawal found for provider reference % / id %',
      p_provider_reference, p_withdrawal_id;
  END IF;

  -- Replayed webhook for an already-settled withdrawal: no-op.
  IF v_request.status = 'paid' THEN
    RETURN v_request;
  END IF;

  IF v_request.status <> 'processing' THEN
    RAISE EXCEPTION 'Withdrawal % is % and cannot be settled', v_request.id, v_request.status;
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'paid',
      processed_at = now(),
      payment_provider = p_provider,
      provider_reference = COALESCE(provider_reference, p_provider_reference)
  WHERE id = v_request.id
  RETURNING * INTO v_request;

  UPDATE public.payouts
  SET status = 'paid'
  WHERE withdrawal_request_id = v_request.id
    AND status = 'processing';

  PERFORM public.log_audit(
    'withdrawal.paid', 'withdrawal_request', v_request.id,
    jsonb_build_object(
      'provider', p_provider,
      'provider_reference', COALESCE(v_request.provider_reference, p_provider_reference),
      'amount', v_request.amount
    )
  );

  PERFORM public.notify_withdrawal(
    v_request.organization_id, v_request.supplier_id,
    'Withdrawal sent',
    format('%s %s is on its way to your account.', v_request.currency, v_request.amount),
    NULL,
    jsonb_build_object('withdrawal_request_id', v_request.id)
  );

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_withdrawal_request(
  p_provider public.payment_provider,
  p_withdrawal_id uuid DEFAULT NULL,
  p_provider_reference text DEFAULT NULL,
  p_failure_reason text DEFAULT NULL
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
  WHERE (p_withdrawal_id IS NOT NULL AND id = p_withdrawal_id)
     OR (p_provider_reference IS NOT NULL
         AND payment_provider = p_provider
         AND provider_reference = p_provider_reference)
  ORDER BY requested_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No withdrawal found for provider reference % / id %',
      p_provider_reference, p_withdrawal_id;
  END IF;

  IF v_request.status IN ('failed', 'paid') THEN
    RETURN v_request;
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'failed',
      processed_at = now(),
      payment_provider = p_provider,
      provider_reference = COALESCE(provider_reference, p_provider_reference),
      failure_reason = NULLIF(btrim(p_failure_reason), '')
  WHERE id = v_request.id
  RETURNING * INTO v_request;

  -- Money never left; return it to the claimable pool.
  PERFORM public.release_withdrawal_payouts(v_request.id, true);

  PERFORM public.log_audit(
    'withdrawal.failed', 'withdrawal_request', v_request.id,
    jsonb_build_object(
      'provider', p_provider,
      'reason', p_failure_reason,
      'amount', v_request.amount
    )
  );

  PERFORM public.notify_withdrawal(
    v_request.organization_id, v_request.supplier_id,
    'Withdrawal failed',
    format('We could not send %s %s. The amount is back in your available balance.',
           v_request.currency, v_request.amount),
    NULL,
    jsonb_build_object('withdrawal_request_id', v_request.id)
  );

  RETURN v_request;
END;
$$;

COMMIT;

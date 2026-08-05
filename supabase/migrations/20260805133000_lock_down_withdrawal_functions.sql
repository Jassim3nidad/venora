-- ============================================================
-- Harden grants on the withdrawal functions
-- ============================================================
--
-- Applies the pattern established in 047 and carried forward by 065:
-- `REVOKE EXECUTE ... FROM PUBLIC` alone is not sufficient on this
-- project — anon and authenticated must also be revoked by name, because
-- default privileges re-open EXECUTE for them on every new function.
--
-- The plan this implements asked for these functions to be registered in
-- 065_lock_down_internal_only_functions.sql itself. They are in a new
-- migration instead: 065 is already applied, and its own header states the
-- rule this repo follows — "Additive; does not edit any prior migration's
-- CREATE FUNCTION statement." Editing an applied migration in place would
-- also change what `supabase db push` has on record for it. This file is
-- 065's continuation and uses its exact pattern and comment style.
--
-- Three tiers:
--
--   service_role only — the disbursement lifecycle. Called by the webhook
--     receiver and the disbursement executor, both of which authenticate
--     with the service-role key. No user session should ever be able to
--     mark a withdrawal paid.
--
--   internal only — helpers invoked exclusively from other SECURITY
--     DEFINER functions or triggers, which execute as the function owner
--     and are unaffected by tightening grants for anon/authenticated.
--     release_withdrawal_payouts() in particular moves payouts back to a
--     claimable state and must never be reachable from a client.
--
--   authenticated — the three entry points a signed-in user legitimately
--     calls. Each performs its own authorization internally
--     (is_org_member / is_supplier_owner / is_admin); the grant only
--     controls who may attempt the call.
--
-- Verification (expect service_role only for tier 1, zero rows for
-- tier 2, authenticated for tier 3):
--   SELECT routine_name, grantee, privilege_type
--     FROM information_schema.routine_privileges
--    WHERE routine_schema = 'public'
--      AND routine_name IN (
--        'begin_withdrawal_disbursement', 'attach_withdrawal_provider_reference',
--        'settle_withdrawal_request', 'fail_withdrawal_request',
--        'release_withdrawal_payouts', 'notify_withdrawal',
--        'withdrawal_recipient_profile', 'request_withdrawal',
--        'cancel_withdrawal_request', 'get_available_balance',
--        'approve_withdrawal_request', 'reject_withdrawal_request',
--        'verify_payout_account'
--      )
--    ORDER BY routine_name, grantee;

-- ── Tier 1: service_role only ─────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.begin_withdrawal_disbursement(uuid, public.payment_provider)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.attach_withdrawal_provider_reference(uuid, public.payment_provider, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_withdrawal_request(public.payment_provider, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_withdrawal_request(public.payment_provider, uuid, text, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.begin_withdrawal_disbursement(uuid, public.payment_provider)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_withdrawal_provider_reference(uuid, public.payment_provider, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_withdrawal_request(public.payment_provider, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_withdrawal_request(public.payment_provider, uuid, text, text)
  TO service_role;

-- ── Tier 2: internal only ─────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.release_withdrawal_payouts(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_withdrawal(uuid, uuid, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.withdrawal_recipient_profile(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.payout_status_transition()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.payout_accounts_enforce_single_default()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.payout_accounts_reset_verification()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.payout_accounts_audit()
  FROM PUBLIC, anon, authenticated;

-- ── Tier 3: authenticated entry points ────────────────────────

GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_withdrawal_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_balance(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payout_account(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payout_hold_period() TO authenticated;
GRANT EXECUTE ON FUNCTION public.minimum_withdrawal_amount() TO authenticated;

-- anon is never a legitimate caller of any of these.
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_withdrawal_request(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_available_balance(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_withdrawal_request(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_withdrawal_request(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_payout_account(uuid, text) FROM anon;

COMMENT ON FUNCTION public.release_withdrawal_payouts(uuid, boolean) IS
  'Internal-only: returns payouts claimed by a withdrawal to the claimable pool. Not directly callable, consistent with the grant pattern established in 047/065.';
COMMENT ON FUNCTION public.settle_withdrawal_request(public.payment_provider, uuid, text) IS
  'Marks a withdrawal and its claimed payouts paid. service_role only — invoked from the provider webhook receiver.';
COMMENT ON FUNCTION public.fail_withdrawal_request(public.payment_provider, uuid, text, text) IS
  'Marks a withdrawal failed and releases its payouts. service_role only — invoked from the provider webhook receiver.';

-- ============================================================
-- Fix: revoke PUBLIC on the authenticated-tier withdrawal functions
-- ============================================================
--
-- 20260805133000 granted the three recipient-facing entry points to
-- `authenticated` and then revoked them from `anon` by name — but never
-- revoked them from PUBLIC. Postgres grants EXECUTE to PUBLIC by default
-- on every new function, and `anon` inherits PUBLIC, so the by-name
-- revoke was cancelled out by the default grant that was left in place.
-- Verified on the live database with has_function_privilege('anon', ...),
-- which returned true for request_withdrawal and get_available_balance.
--
-- This is the same trap migration 047 documented and 065 was written to
-- close; 20260805133000 applied it correctly to the service_role and
-- internal tiers (which revoke PUBLIC explicitly) and missed it only on
-- the authenticated tier.
--
-- Not exploitable as it stood: request_withdrawal() rejects a null
-- auth.uid() before touching any state, and get_available_balance()
-- requires is_admin/is_org_member/is_supplier_owner, all false for an
-- anonymous caller. The fix is about not depending on a function body
-- for a boundary the grant system should be enforcing.
--
-- Order matters: REVOKE FROM PUBLIC first, then re-GRANT to the roles
-- that should hold it, so the intended state is what remains.
--
-- Verification (expect f for anon, t for authenticated):
--   SELECT has_function_privilege('anon',
--            'public.request_withdrawal(numeric, uuid, text)', 'EXECUTE') AS anon,
--          has_function_privilege('authenticated',
--            'public.request_withdrawal(numeric, uuid, text)', 'EXECUTE') AS auth;

REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric, uuid, text)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_withdrawal_request(uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_available_balance(uuid, uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_withdrawal_request(uuid, text)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_withdrawal_request(uuid, text)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_payout_account(uuid, text)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.payout_hold_period()
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.minimum_withdrawal_amount()
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_withdrawal_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_balance(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payout_account(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payout_hold_period() TO authenticated;
GRANT EXECUTE ON FUNCTION public.minimum_withdrawal_amount() TO authenticated;

-- The service_role and internal tiers already revoked PUBLIC in
-- 20260805133000; re-stating them here is a no-op that keeps the whole
-- intended grant surface visible in one place.
REVOKE EXECUTE ON FUNCTION public.settle_withdrawal_request(public.payment_provider, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_withdrawal_request(public.payment_provider, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.begin_withdrawal_disbursement(uuid, public.payment_provider)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.attach_withdrawal_provider_reference(uuid, public.payment_provider, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_withdrawal_payouts(uuid, boolean)
  FROM PUBLIC, anon, authenticated;

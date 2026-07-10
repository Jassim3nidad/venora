-- ============================================================
-- Migration 041 - Explicit anon/authenticated revoke
-- ============================================================
--
-- 039 and 040 revoked EXECUTE `FROM PUBLIC`, on the theory that anon
-- and authenticated only had access by inheriting the PUBLIC grant.
-- Live verification after applying both shows every target function is
-- STILL callable by anon — including confirm_booking_payment's brand
-- new signature from 040, which had its own `REVOKE ... FROM PUBLIC`
-- immediately after `CREATE FUNCTION` in the same script.
--
-- A freshly created function still being open right after an explicit
-- `REVOKE FROM PUBLIC` means the grant is not arriving via PUBLIC
-- inheritance at all — it is most likely a grant made DIRECTLY to the
-- `anon` and `authenticated` roles at function-creation time, which is
-- exactly what Supabase projects commonly provision via
-- `ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ON FUNCTIONS TO anon,
-- authenticated, service_role` so that any new function is
-- automatically callable through the REST API without a manual GRANT.
-- Revoking from PUBLIC never touches a grant made directly to a named
-- role, so that convenience default silently reopens every "locked
-- down" function the moment it's created or replaced.
--
-- Fix: revoke explicitly from PUBLIC, anon, AND authenticated by name
-- (a superset that is correct regardless of which mechanism actually
-- granted access), then grant back only the intended role. Idempotent —
-- safe to run even if a given grant was never present.

-- Money-moving / webhook RPCs — service_role ONLY.
REVOKE EXECUTE ON FUNCTION public.confirm_booking_payment(public.payment_provider, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_booking_payment(uuid, public.payment_provider, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.attach_payment_session(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_refund_processing(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_booking_refund(public.payment_provider, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_booking_refund(public.payment_provider, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_payment_webhook_event(public.payment_provider, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finish_payment_webhook_event(public.payment_provider, text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(public.payment_provider, text, text, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_booking_payment(uuid, public.payment_provider, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_payment_session(uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_refund_processing(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_booking_refund(public.payment_provider, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_booking_refund(public.payment_provider, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_payment_webhook_event(public.payment_provider, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_payment_webhook_event(public.payment_provider, text, text, text) TO service_role;

-- Internal helpers.
REVOKE EXECUTE ON FUNCTION public.calculate_commission(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_receipt_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_commission(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_receipt_number() TO service_role;

-- Customer-facing RPCs — authenticated only, explicitly NOT anon.
REVOKE EXECUTE ON FUNCTION public.request_booking_refund(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_booking_payment(uuid, public.payment_provider, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_booking_refund(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_booking_payment(uuid, public.payment_provider, text, text) TO authenticated, service_role;

-- Sequences.
REVOKE ALL ON SEQUENCE public.invoice_number_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.receipt_number_seq FROM PUBLIC, anon, authenticated;

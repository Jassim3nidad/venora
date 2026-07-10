-- ============================================================
-- Migration 039 - Harden payment RPC execute grants
-- ============================================================
--
-- Migrations 021 and 038 locked down money-moving RPCs with
-- `REVOKE EXECUTE ... FROM anon, authenticated`. That is INSUFFICIENT:
-- Postgres grants EXECUTE on functions to PUBLIC by default, and both
-- `anon` and `authenticated` inherit PUBLIC. The functions therefore
-- remained callable with the public anon key — including
-- `confirm_booking_payment`, which would let anyone mark an approved
-- booking as paid without paying.
--
-- Fix: REVOKE ... FROM PUBLIC (covers anon + authenticated), then grant
-- back only the intended roles. All statements are idempotent, so this
-- migration is safe to run on a database where 038 is already applied.

-- Money-moving / webhook RPCs — service_role ONLY.
REVOKE EXECUTE ON FUNCTION public.confirm_booking_payment(uuid, public.payment_provider, text, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fail_booking_payment(uuid, public.payment_provider, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.attach_payment_session(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_refund_processing(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_booking_refund(public.payment_provider, text, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fail_booking_refund(public.payment_provider, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_payment_webhook_event(public.payment_provider, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finish_payment_webhook_event(public.payment_provider, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(uuid, public.payment_provider, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_booking_payment(uuid, public.payment_provider, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_payment_session(uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_refund_processing(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_booking_refund(public.payment_provider, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_booking_refund(public.payment_provider, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_payment_webhook_event(public.payment_provider, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_payment_webhook_event(public.payment_provider, text, text, text) TO service_role;

-- Internal helpers.
REVOKE EXECUTE ON FUNCTION public.calculate_commission(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_receipt_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_commission(uuid, numeric) TO service_role;

-- Customer-facing RPCs — authenticated users only (not anon).
REVOKE EXECUTE ON FUNCTION public.request_booking_refund(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_booking_payment(uuid, public.payment_provider, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking_refund(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_booking_payment(uuid, public.payment_provider, text, text) TO authenticated, service_role;

-- Sequences.
REVOKE ALL ON SEQUENCE public.invoice_number_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.receipt_number_seq FROM PUBLIC;

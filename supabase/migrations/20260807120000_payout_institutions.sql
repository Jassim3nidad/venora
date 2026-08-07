-- ============================================================
-- Structured routing data for payout accounts
-- ============================================================
--
-- Replaces free-text `bank_name` routing with the structured institution
-- data PayMongo's Treasury API actually requires.
--
-- The Treasury API takes `destination_account.bic` — a bank identifier
-- code from GET /v1/wallets/receiving_institutions (the `provider_code`
-- attribute). A human-typed "BPI" is not a BIC and the API rejects it, so
-- free text was never disbursable. Worse, a wrong code routes money to the
-- wrong institution, which is unrecoverable.
--
--   institution_code  BIC / provider_code, sent as destination_account.bic
--   institution_name  display label from the same API response
--   network           which rail the code was listed under (instapay|pesonet)
--   account_type      free-form classification from the institution's `type`
--
-- `bank_name` is retained, not dropped: it is the only record of what
-- existing accounts were entered as, and dropping it would destroy the
-- audit trail on already-verified destinations.
--
-- DATA SAFETY. Existing rows have no BIC and cannot be derived into one --
-- institution names are ambiguous ("BPI" matches several entries) and
-- guessing would silently misroute money. Those rows keep their data,
-- copy bank_name into institution_name for display, and have their
-- verification revoked so they must be re-entered and re-verified before
-- any payout. Revoking verification is the conservative direction: it can
-- only block a payout, never cause a wrong one.
--
-- Verification (expect 0 rows -- no verified account may lack a BIC):
--   SELECT count(*) FROM public.payout_accounts
--    WHERE verified_at IS NOT NULL AND institution_code IS NULL;

BEGIN;

ALTER TABLE public.payout_accounts
  ADD COLUMN IF NOT EXISTS institution_code text,
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS network          text,
  ADD COLUMN IF NOT EXISTS account_type     text;

COMMENT ON COLUMN public.payout_accounts.institution_code IS
  'BIC / provider_code from PayMongo receiving_institutions. Sent verbatim as destination_account.bic on a Treasury transfer.';
COMMENT ON COLUMN public.payout_accounts.network IS
  'Rail the institution was listed under (instapay|pesonet). Advisory: the effective rail is chosen per transfer, since InstaPay caps at PHP 50,000.';

-- Preserve what the user originally entered, for display only.
UPDATE public.payout_accounts
SET institution_name = bank_name
WHERE institution_name IS NULL
  AND bank_name IS NOT NULL
  AND btrim(bank_name) <> '';

-- Accounts that predate structured routing cannot be paid out. Revoke
-- verification so request_withdrawal() refuses them until re-entered.
UPDATE public.payout_accounts
SET verified_at = NULL,
    verification_reference = NULL
WHERE institution_code IS NULL
  AND verified_at IS NOT NULL;

ALTER TABLE public.payout_accounts
  DROP CONSTRAINT IF EXISTS payout_accounts_network;
ALTER TABLE public.payout_accounts
  ADD CONSTRAINT payout_accounts_network
  CHECK (network IS NULL OR network IN ('instapay', 'pesonet'));

-- The free-text bank rule is superseded by structured routing.
ALTER TABLE public.payout_accounts
  DROP CONSTRAINT IF EXISTS payout_accounts_bank_name;

-- The load-bearing invariant: a verified account is one we can actually
-- pay, which means it must carry a BIC. Enforced in the database so no
-- future code path can verify an undisbursable destination.
ALTER TABLE public.payout_accounts
  DROP CONSTRAINT IF EXISTS payout_accounts_verified_needs_institution;
ALTER TABLE public.payout_accounts
  ADD CONSTRAINT payout_accounts_verified_needs_institution
  CHECK (verified_at IS NULL OR institution_code IS NOT NULL);

-- Changing where money goes must invalidate verification. The existing
-- trigger covers the encrypted number and method; institution_code is
-- equally routing-critical, so it belongs in the same check.
CREATE OR REPLACE FUNCTION public.payout_accounts_reset_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.account_fingerprint IS DISTINCT FROM OLD.account_fingerprint
     OR NEW.method IS DISTINCT FROM OLD.method
     OR NEW.account_identifier_ciphertext IS DISTINCT FROM OLD.account_identifier_ciphertext
     OR NEW.institution_code IS DISTINCT FROM OLD.institution_code
  THEN
    NEW.verified_at            := NULL;
    NEW.verification_reference := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- New columns inherit nothing from the column-level grants set in
-- 20260805131000; they must be granted explicitly or the client cannot
-- read or write them at all.
GRANT SELECT (institution_code, institution_name, network, account_type)
  ON public.payout_accounts TO authenticated;
GRANT INSERT (institution_code, institution_name, network, account_type)
  ON public.payout_accounts TO authenticated;
GRANT UPDATE (institution_code, institution_name, network, account_type)
  ON public.payout_accounts TO authenticated;

-- Transfer identifiers returned by POST /v2/batch_transfers. The existing
-- provider_reference holds the transfer id (tr_...); these record the
-- batch and the provider's own reference for reconciliation.
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS batch_transfer_id        text,
  ADD COLUMN IF NOT EXISTS provider_reference_number text;

COMMENT ON COLUMN public.withdrawal_requests.batch_transfer_id IS
  'PayMongo batch_transfer_id (btr_...) returned when the transfer was created.';
COMMENT ON COLUMN public.withdrawal_requests.provider_reference_number IS
  'PayMongo provider_reference_number, populated once the rail assigns one.';

-- Records the identifiers returned by POST /v2/batch_transfers. Split from
-- settlement on purpose: this runs immediately after the provider accepts
-- the transfer, while the withdrawal is still `processing`, so a crash
-- before the callback still leaves a transfer id to reconcile against.
--
-- provider_reference is COALESCEd, never overwritten: the first transfer
-- id we recorded is the one settlement correlates on.
CREATE OR REPLACE FUNCTION public.attach_withdrawal_transfer(
  p_request_id uuid,
  p_provider public.payment_provider,
  p_transfer_id text,
  p_batch_transfer_id text DEFAULT NULL,
  p_provider_reference_number text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.withdrawal_requests
  SET payment_provider          = p_provider,
      provider_reference        = COALESCE(provider_reference, p_transfer_id),
      batch_transfer_id         = COALESCE(p_batch_transfer_id, batch_transfer_id),
      provider_reference_number = COALESCE(p_provider_reference_number, provider_reference_number)
  WHERE id = p_request_id;

  PERFORM public.log_audit(
    'withdrawal.transfer_created',
    'withdrawal_request',
    p_request_id,
    jsonb_build_object(
      'provider', p_provider,
      'transfer_id', p_transfer_id,
      'batch_transfer_id', p_batch_transfer_id
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attach_withdrawal_transfer(uuid, public.payment_provider, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_withdrawal_transfer(uuid, public.payment_provider, text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.attach_withdrawal_transfer(uuid, public.payment_provider, text, text, text) IS
  'Stores PayMongo Treasury transfer identifiers on a withdrawal. service_role only — called by the disbursement service.';

COMMIT;

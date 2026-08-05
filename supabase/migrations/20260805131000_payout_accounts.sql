-- ============================================================
-- payout_accounts — where a venue owner's or supplier's money goes
-- ============================================================
--
-- Destination of record for withdrawals. One row per bank account or
-- e-wallet, owned by exactly one organization OR one supplier profile.
--
-- PLAINTEXT IDENTIFIERS ARE NEVER STORED. The full account/mobile number
-- is encrypted in the Node layer (AES-256-GCM, key from
-- PAYOUT_ENCRYPTION_KEY, never present in the database) and only the
-- ciphertext envelope reaches Postgres. The database holds:
--
--   account_number_last4          — display only, 4 digits
--   account_identifier_ciphertext — opaque envelope, service_role can read
--   account_fingerprint           — keyed HMAC of the normalized identifier,
--                                   so duplicates can be detected without
--                                   ever comparing plaintext
--
-- Column-level grants (not just RLS) keep the ciphertext away from the
-- client: `authenticated` may INSERT it but has no SELECT privilege on
-- that column, so a compromised anon/user JWT cannot exfiltrate envelopes
-- for offline attack. Only service_role — the disbursement executor — can
-- read it back. The same mechanism makes verified_at unwritable by the
-- account's owner: verification is an admin/provider outcome, never a
-- self-assertion, and an owner who could set it could pay themselves out
-- to an unchecked destination.
--
-- Verification:
--   SELECT grantee, privilege_type, column_name
--     FROM information_schema.column_privileges
--    WHERE table_name = 'payout_accounts' AND grantee = 'authenticated'
--    ORDER BY column_name;
--   -- expect NO row with column_name = 'account_identifier_ciphertext'
--   --        and privilege_type = 'SELECT'

BEGIN;

DO $$ BEGIN
  CREATE TYPE public.payout_method AS ENUM ('bank', 'gcash', 'paymaya');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.payout_accounts (
  id                            uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id               uuid                 REFERENCES public.organizations(id)      ON DELETE CASCADE,
  supplier_id                   uuid                 REFERENCES public.supplier_profiles(id)  ON DELETE CASCADE,

  method                        public.payout_method NOT NULL,
  account_name                  text                 NOT NULL,
  bank_name                     text,
  account_number_last4          text                 NOT NULL,
  account_identifier_ciphertext text                 NOT NULL,
  account_fingerprint           text                 NOT NULL,

  is_default                    boolean              NOT NULL DEFAULT false,
  verified_at                   timestamptz,
  verification_reference        text,
  archived_at                   timestamptz,

  created_by                    uuid                 REFERENCES public.profiles(id),
  created_at                    timestamptz          NOT NULL DEFAULT now(),
  updated_at                    timestamptz          NOT NULL DEFAULT now(),

  CONSTRAINT payout_accounts_owner CHECK (
    (organization_id IS NOT NULL) <> (supplier_id IS NOT NULL)
  ),
  CONSTRAINT payout_accounts_last4 CHECK (account_number_last4 ~ '^[0-9]{4}$'),
  CONSTRAINT payout_accounts_name_present CHECK (btrim(account_name) <> ''),
  -- A bank transfer without a bank is not actionable by the disbursement
  -- executor; e-wallets carry the provider in `method` instead.
  CONSTRAINT payout_accounts_bank_name CHECK (
    method <> 'bank' OR (bank_name IS NOT NULL AND btrim(bank_name) <> '')
  )
);

CREATE INDEX IF NOT EXISTS idx_payout_accounts_organization
  ON public.payout_accounts (organization_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payout_accounts_supplier
  ON public.payout_accounts (supplier_id) WHERE archived_at IS NULL;

-- Same destination registered twice for the same recipient, detected on
-- the HMAC rather than on plaintext.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_accounts_org_fingerprint
  ON public.payout_accounts (organization_id, account_fingerprint)
  WHERE organization_id IS NOT NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_accounts_supplier_fingerprint
  ON public.payout_accounts (supplier_id, account_fingerprint)
  WHERE supplier_id IS NOT NULL AND archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_accounts_org_default
  ON public.payout_accounts (organization_id)
  WHERE organization_id IS NOT NULL AND is_default AND archived_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_accounts_supplier_default
  ON public.payout_accounts (supplier_id)
  WHERE supplier_id IS NOT NULL AND is_default AND archived_at IS NULL;

DROP TRIGGER IF EXISTS payout_accounts_updated_at ON public.payout_accounts;
CREATE TRIGGER payout_accounts_updated_at
  BEFORE UPDATE ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.payout_accounts IS
  'Withdrawal destinations for venue owners (via organization) and suppliers. Full identifiers are AES-256-GCM ciphertext produced in the app layer; the key never reaches the database.';
COMMENT ON COLUMN public.payout_accounts.account_identifier_ciphertext IS
  'Opaque AES-256-GCM envelope of the full account/mobile number. No SELECT grant for anon/authenticated — service_role only.';
COMMENT ON COLUMN public.payout_accounts.account_fingerprint IS
  'Keyed HMAC-SHA256 of the normalized identifier. Enables duplicate detection without storing or comparing plaintext.';
COMMENT ON COLUMN public.payout_accounts.verified_at IS
  'Set by admin/provider verification only. Not writable by the account owner — request_withdrawal() refuses unverified destinations.';

-- ── Single default per recipient ──────────────────────────────

CREATE OR REPLACE FUNCTION public.payout_accounts_enforce_single_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT NEW.is_default OR NEW.archived_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.payout_accounts
  SET is_default = false
  WHERE id <> NEW.id
    AND is_default
    AND archived_at IS NULL
    AND (
      (NEW.organization_id IS NOT NULL AND organization_id = NEW.organization_id)
      OR (NEW.supplier_id IS NOT NULL AND supplier_id = NEW.supplier_id)
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payout_accounts_single_default ON public.payout_accounts;
CREATE TRIGGER payout_accounts_single_default
  BEFORE INSERT OR UPDATE OF is_default, archived_at ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.payout_accounts_enforce_single_default();

-- ── Re-verification on change ─────────────────────────────────
-- Editing where the money goes invalidates any prior verification.
-- Without this, an owner could verify a harmless account and then swap the
-- underlying number, keeping the verified flag.

CREATE OR REPLACE FUNCTION public.payout_accounts_reset_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.account_fingerprint IS DISTINCT FROM OLD.account_fingerprint
     OR NEW.method IS DISTINCT FROM OLD.method
     OR NEW.account_identifier_ciphertext IS DISTINCT FROM OLD.account_identifier_ciphertext
  THEN
    NEW.verified_at            := NULL;
    NEW.verification_reference := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payout_accounts_reset_verification ON public.payout_accounts;
CREATE TRIGGER payout_accounts_reset_verification
  BEFORE UPDATE ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.payout_accounts_reset_verification();

-- ── Audit ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.payout_accounts_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fingerprint_changed boolean := false;
BEGIN
  -- OLD is unassigned on INSERT, and SQL boolean operators are not
  -- guaranteed to short-circuit, so the TG_OP test has to gate the
  -- OLD reference structurally rather than inside one expression.
  IF TG_OP = 'UPDATE' THEN
    v_fingerprint_changed :=
      NEW.account_fingerprint IS DISTINCT FROM OLD.account_fingerprint;
  END IF;

  PERFORM public.log_audit(
    CASE TG_OP WHEN 'INSERT' THEN 'payout_account.created'
               ELSE 'payout_account.updated' END,
    'payout_account',
    NEW.id,
    jsonb_build_object(
      'organization_id',     NEW.organization_id,
      'supplier_id',         NEW.supplier_id,
      'method',              NEW.method,
      'last4',               NEW.account_number_last4,
      'is_default',          NEW.is_default,
      'verified',            NEW.verified_at IS NOT NULL,
      'archived',            NEW.archived_at IS NOT NULL,
      'fingerprint_changed', v_fingerprint_changed
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payout_accounts_audit ON public.payout_accounts;
CREATE TRIGGER payout_accounts_audit
  AFTER INSERT OR UPDATE ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.payout_accounts_audit();

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payout_accounts.select.owner" ON public.payout_accounts;
CREATE POLICY "payout_accounts.select.owner" ON public.payout_accounts
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(organization_id)
    OR public.is_supplier_owner(supplier_id)
  );

DROP POLICY IF EXISTS "payout_accounts.insert.owner" ON public.payout_accounts;
CREATE POLICY "payout_accounts.insert.owner" ON public.payout_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    OR public.is_supplier_owner(supplier_id)
  );

-- USING and WITH CHECK are both required: USING alone would let an owner
-- reassign their row to another organization on UPDATE.
DROP POLICY IF EXISTS "payout_accounts.update.owner" ON public.payout_accounts;
CREATE POLICY "payout_accounts.update.owner" ON public.payout_accounts
  FOR UPDATE TO authenticated
  USING (
    public.is_org_member(organization_id)
    OR public.is_supplier_owner(supplier_id)
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    OR public.is_supplier_owner(supplier_id)
  );

DROP POLICY IF EXISTS "payout_accounts.all.admin" ON public.payout_accounts;
CREATE POLICY "payout_accounts.all.admin" ON public.payout_accounts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Column-level grants ───────────────────────────────────────
-- Deliberately narrower than the RLS policies above. RLS decides which
-- rows; these decide which columns. Rows are never deletable by the owner
-- (archive instead) so a destination's history survives a dispute.

REVOKE ALL ON public.payout_accounts FROM anon, authenticated;

GRANT SELECT (
  id, organization_id, supplier_id, method, account_name, bank_name,
  account_number_last4, is_default, verified_at, archived_at,
  created_by, created_at, updated_at
) ON public.payout_accounts TO authenticated;

GRANT INSERT (
  organization_id, supplier_id, method, account_name, bank_name,
  account_number_last4, account_identifier_ciphertext, account_fingerprint,
  is_default, created_by
) ON public.payout_accounts TO authenticated;

GRANT UPDATE (
  account_name, bank_name, account_number_last4,
  account_identifier_ciphertext, account_fingerprint, is_default, archived_at
) ON public.payout_accounts TO authenticated;

GRANT ALL ON public.payout_accounts TO service_role;

COMMIT;

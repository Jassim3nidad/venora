-- ============================================================
-- Migration 010 — Admin, Commission, Payments, Verification
-- ============================================================

-- ── commission_rules ──────────────────────────────────────────
-- Flexible tiered commission model.
-- scope = 'global'   → applies to all bookings
-- scope = 'category' → reference_id = venue_categories.id
-- scope = 'venue'    → reference_id = venues.id (overrides global/category)
CREATE TABLE public.commission_rules (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope          text        NOT NULL CHECK (scope IN ('global', 'category', 'venue')),
  reference_id   uuid,       -- NULL for 'global', category/venue id otherwise
  percentage     numeric(5,2), -- e.g. 10.00 = 10%
  flat_fee       numeric(12,2),
  effective_from date        NOT NULL,
  effective_to   date,       -- NULL = indefinite
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_rules_scope ON public.commission_rules(scope, reference_id, effective_from);

COMMENT ON TABLE  public.commission_rules          IS 'Tiered commission rules. Most specific rule wins (venue > category > global).';
COMMENT ON COLUMN public.commission_rules.percentage IS 'Mutually exclusive with flat_fee (use one or both — handled in commission-calculator edge function).';

-- ── transactions ──────────────────────────────────────────────
CREATE TABLE public.transactions (
  id                 uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         uuid                      NOT NULL REFERENCES public.bookings(id),
  amount             numeric(12,2)             NOT NULL,
  commission_amount  numeric(12,2)             NOT NULL DEFAULT 0,
  payment_provider   public.payment_provider   NOT NULL,
  provider_reference text,                     -- PayMongo/Maya transaction ID
  status             public.transaction_status NOT NULL DEFAULT 'pending',
  created_at         timestamptz               NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_booking ON public.transactions(booking_id);
CREATE INDEX idx_transactions_status  ON public.transactions(status, created_at);

COMMENT ON TABLE  public.transactions                  IS 'Payment transactions. One booking can have multiple (deposit + final payment).';
COMMENT ON COLUMN public.transactions.provider_reference IS 'External payment gateway transaction reference for reconciliation.';

-- ── payouts ───────────────────────────────────────────────────
CREATE TABLE public.payouts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid                 REFERENCES public.organizations(id),
  supplier_id     uuid                 REFERENCES public.supplier_profiles(id),
  amount          numeric(12,2)        NOT NULL,
  status          text        NOT NULL DEFAULT 'scheduled',  -- scheduled | processing | paid | failed
  scheduled_at    timestamptz,
  paid_at         timestamptz,

  CONSTRAINT payouts_recipient CHECK (
    (organization_id IS NOT NULL) <> (supplier_id IS NOT NULL) -- exactly one recipient
  )
);

CREATE INDEX idx_payouts_organization ON public.payouts(organization_id, status);
CREATE INDEX idx_payouts_supplier     ON public.payouts(supplier_id,     status);

COMMENT ON TABLE public.payouts IS
  'Scheduled payouts to venue owners (via organization) or suppliers. Triggered after booking completes.';

-- ── verification_requests ─────────────────────────────────────
-- Admin reviews documents submitted by venue owners and suppliers.
CREATE TABLE public.verification_requests (
  id                    uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            uuid                                 REFERENCES public.profiles(id),
  organization_id       uuid                                 REFERENCES public.organizations(id),
  type                  public.verification_type    NOT NULL,
  submitted_documents   jsonb,   -- [{ "type": "DTI", "storage_path": "..." }, ...]
  status                public.verification_status  NOT NULL DEFAULT 'pending',
  reviewed_by           uuid                                 REFERENCES public.profiles(id),
  reviewed_at           timestamptz,
  notes                 text,
  created_at            timestamptz                 NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_status ON public.verification_requests(status, created_at);

COMMENT ON TABLE public.verification_requests IS
  'Document submissions for venue owner / supplier / venue verification. Reviewed by admin.';

-- ── Materialized view: venue monthly stats ─────────────────────
-- Referenced in analytics dashboards. Never aggregate from raw tables in production.
CREATE MATERIALIZED VIEW public.mv_venue_monthly_stats AS
SELECT
  b.venue_id,
  date_trunc('month', b.event_date::timestamptz) AS month,
  count(*)                                         AS booking_count,
  sum(t.amount)                                    AS revenue,
  sum(t.commission_amount)                         AS commission,
  avg(r.overall_rating)::numeric(3,2)              AS avg_rating,
  count(r.id)                                      AS review_count
FROM   public.bookings b
LEFT   JOIN public.transactions t ON t.booking_id = b.id AND t.status = 'paid'
LEFT   JOIN public.reviews      r ON r.booking_id = b.id AND r.status = 'published'
WHERE  b.status IN ('approved', 'completed')
GROUP  BY b.venue_id, date_trunc('month', b.event_date::timestamptz);

CREATE UNIQUE INDEX mv_venue_monthly_stats_pk
  ON public.mv_venue_monthly_stats(venue_id, month);

COMMENT ON MATERIALIZED VIEW public.mv_venue_monthly_stats IS
  'Pre-aggregated monthly venue stats. Refreshed nightly at 02:00 PHT via pg_cron. Use for dashboards.';

-- Nightly refresh at 02:00 PHT = 18:00 UTC
SELECT cron.schedule(
  'refresh-venue-monthly-stats',
  '0 18 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_venue_monthly_stats$$
);

-- Auto-expire pending bookings after 48 hours
SELECT cron.schedule(
  'expire-pending-bookings',
  '*/30 * * * *',  -- every 30 minutes
  $$
    UPDATE public.bookings
    SET    status = 'expired', updated_at = now()
    WHERE  status = 'pending'
      AND  created_at < now() - INTERVAL '48 hours';
  $$
);

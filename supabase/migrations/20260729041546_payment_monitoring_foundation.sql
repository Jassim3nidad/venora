-- Payment monitoring foundation for platform administrators.
-- Adds payment-specific admin permissions plus durable reconciliation
-- and alert records. This does not change checkout, webhook, refund,
-- commission, or booking status workflows.

INSERT INTO public.admin_permissions (key, description) VALUES
  ('payments.view',      'View payment transactions, refunds, webhook events, and reconciliation records'),
  ('payments.reconcile', 'Run and update payment reconciliation reviews'),
  ('payments.refund',    'Request and monitor payment refunds'),
  ('payments.export',    'Export payment monitoring data')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.admin_role_permissions (tier, permission_key) VALUES
  ('admin', 'payments.view'),
  ('admin', 'payments.reconcile'),
  ('admin', 'payments.export'),

  ('finance_admin', 'payments.view'),
  ('finance_admin', 'payments.reconcile'),
  ('finance_admin', 'payments.refund'),
  ('finance_admin', 'payments.export'),

  ('operations_admin', 'payments.view'),

  ('compliance_admin', 'payments.view'),

  ('analyst', 'payments.view'),
  ('analyst', 'payments.export')
ON CONFLICT (tier, permission_key) DO NOTHING;

INSERT INTO public.admin_role_permissions (tier, permission_key)
SELECT 'super_admin', key
FROM public.admin_permissions
WHERE key LIKE 'payments.%'
ON CONFLICT (tier, permission_key) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_reconciliation_status') THEN
    CREATE TYPE public.payment_reconciliation_status AS ENUM (
      'matched',
      'pending_provider_confirmation',
      'missing_provider_reference',
      'missing_provider_transaction',
      'amount_mismatch',
      'currency_mismatch',
      'status_mismatch',
      'requires_manual_review'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_alert_severity') THEN
    CREATE TYPE public.payment_alert_severity AS ENUM (
      'informational',
      'warning',
      'high',
      'critical'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_alert_status') THEN
    CREATE TYPE public.payment_alert_status AS ENUM (
      'open',
      'acknowledged',
      'investigating',
      'resolved',
      'dismissed'
    );
  END IF;
END $$;

CREATE TABLE public.payment_reconciliation_records (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id     uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  booking_id         uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status             public.payment_reconciliation_status NOT NULL,
  provider           public.payment_provider NOT NULL,
  provider_reference text,
  provider_amount    numeric(12,2),
  venora_amount      numeric(12,2) NOT NULL,
  provider_currency  text,
  venora_currency    text NOT NULL DEFAULT 'PHP',
  provider_status    text,
  venora_status      text NOT NULL,
  severity           public.payment_alert_severity NOT NULL DEFAULT 'informational',
  summary            text NOT NULL,
  details            text,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_reconciliation_transaction
  ON public.payment_reconciliation_records(transaction_id, created_at DESC);
CREATE INDEX idx_payment_reconciliation_booking
  ON public.payment_reconciliation_records(booking_id, created_at DESC);
CREATE INDEX idx_payment_reconciliation_status
  ON public.payment_reconciliation_records(status, severity, created_at DESC);

COMMENT ON TABLE public.payment_reconciliation_records IS
  'Admin payment reconciliation snapshots comparing Venora transaction state against provider evidence.';

CREATE TABLE public.payment_monitoring_alerts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id     uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  booking_id         uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  refund_id          uuid REFERENCES public.refunds(id) ON DELETE SET NULL,
  dispute_id         uuid REFERENCES public.disputes(id) ON DELETE SET NULL,
  reconciliation_id  uuid REFERENCES public.payment_reconciliation_records(id) ON DELETE SET NULL,
  alert_type         text NOT NULL,
  severity           public.payment_alert_severity NOT NULL DEFAULT 'warning',
  status             public.payment_alert_status NOT NULL DEFAULT 'open',
  title              text NOT NULL,
  description        text,
  detected_at        timestamptz NOT NULL DEFAULT now(),
  acknowledged_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at    timestamptz,
  resolved_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at        timestamptz,
  resolution_note    text,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_alerts_status
  ON public.payment_monitoring_alerts(status, severity, detected_at DESC);
CREATE INDEX idx_payment_alerts_transaction
  ON public.payment_monitoring_alerts(transaction_id, detected_at DESC);
CREATE INDEX idx_payment_alerts_booking
  ON public.payment_monitoring_alerts(booking_id, detected_at DESC);

COMMENT ON TABLE public.payment_monitoring_alerts IS
  'Admin-visible payment monitoring alerts for reconciliation mismatches, failed webhooks, and refund risk.';

CREATE TRIGGER payment_reconciliation_records_touch_updated_at
  BEFORE UPDATE ON public.payment_reconciliation_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER payment_monitoring_alerts_touch_updated_at
  BEFORE UPDATE ON public.payment_monitoring_alerts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.payment_reconciliation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_reconciliation_records.select.payment_admins"
  ON public.payment_reconciliation_records
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('payments.view'));

CREATE POLICY "payment_reconciliation_records.insert.reconcilers"
  ON public.payment_reconciliation_records
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission('payments.reconcile'));

CREATE POLICY "payment_reconciliation_records.update.reconcilers"
  ON public.payment_reconciliation_records
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('payments.reconcile'))
  WITH CHECK (public.has_admin_permission('payments.reconcile'));

CREATE POLICY "payment_monitoring_alerts.select.payment_admins"
  ON public.payment_monitoring_alerts
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('payments.view'));

CREATE POLICY "payment_monitoring_alerts.insert.reconcilers"
  ON public.payment_monitoring_alerts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission('payments.reconcile'));

CREATE POLICY "payment_monitoring_alerts.update.reconcilers"
  ON public.payment_monitoring_alerts
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('payments.reconcile'))
  WITH CHECK (public.has_admin_permission('payments.reconcile'));

GRANT SELECT, INSERT, UPDATE ON public.payment_reconciliation_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_monitoring_alerts TO authenticated;

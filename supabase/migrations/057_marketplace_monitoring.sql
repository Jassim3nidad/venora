-- ============================================================
-- Migration 057 — Marketplace Monitoring & Report Export Logging
-- ============================================================
--
-- marketplace_flags is a single lifecycle table covering both "flag" and
-- "case" from the spec — a flagged listing IS the case; status/assignee
-- carry it through review -> escalation -> resolution, so a second parallel
-- table would just duplicate the same rows. Auto-detected signals
-- (suspicious pricing, repeated rejections, cancellation spikes, payment
-- failures, refund spikes) are intentionally NOT pre-computed into this
-- table by triggers — they're computed on read from venue_review_history,
-- supplier_review_history, bookings, and transactions (all real, existing
-- data) by the admin-marketplace queries layer. Materializing them via
-- triggers would require tuning thresholds I have no production data to
-- validate; a flag row is created explicitly by an admin who reviews a
-- signal and decides to track it.

CREATE TABLE public.marketplace_flags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  text NOT NULL CHECK (entity_type IN ('venue', 'supplier', 'review', 'booking')),
  entity_id    uuid NOT NULL,
  flag_type    text NOT NULL CHECK (flag_type IN (
                 'manual', 'suspicious_pricing', 'repeated_rejection',
                 'duplicate_listing', 'high_cancellation_rate',
                 'payment_failures', 'refund_spike', 'complaint_spike'
               )),
  severity     text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'escalated', 'resolved', 'dismissed')),
  notes        text,
  assigned_to  uuid REFERENCES public.profiles(id),
  created_by   uuid REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);

CREATE INDEX idx_marketplace_flags_entity ON public.marketplace_flags (entity_type, entity_id);
CREATE INDEX idx_marketplace_flags_status ON public.marketplace_flags (status, created_at DESC) WHERE status NOT IN ('resolved', 'dismissed');

COMMENT ON TABLE public.marketplace_flags IS
  'Admin-tracked marketplace moderation cases. Write only via admin_create_marketplace_flag()/admin_update_marketplace_flag().';

CREATE TRIGGER marketplace_flags_updated_at
  BEFORE UPDATE ON public.marketplace_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.marketplace_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_flags.select.admin"
  ON public.marketplace_flags FOR SELECT
  USING (public.has_admin_permission('marketplace.view'));

-- ── admin_create_marketplace_flag() ──────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_marketplace_flag(
  p_entity_type text,
  p_entity_id   uuid,
  p_flag_type   text,
  p_severity    text DEFAULT 'medium',
  p_notes       text DEFAULT NULL
)
RETURNS public.marketplace_flags
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_flag public.marketplace_flags%ROWTYPE;
BEGIN
  IF NOT public.has_admin_permission('marketplace.moderate') THEN
    RAISE EXCEPTION 'You do not have permission to flag marketplace listings';
  END IF;

  INSERT INTO public.marketplace_flags (entity_type, entity_id, flag_type, severity, notes, created_by)
  VALUES (p_entity_type, p_entity_id, p_flag_type, coalesce(p_severity, 'medium'), p_notes, auth.uid())
  RETURNING * INTO v_flag;

  PERFORM public.log_admin_action(
    'marketplace_flag.created', p_entity_type, p_entity_id, p_notes, jsonb_build_object('flag_id', v_flag.id)
  );

  RETURN v_flag;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_marketplace_flag(text, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_marketplace_flag(text, uuid, text, text, text) TO authenticated;

-- ── admin_update_marketplace_flag() ──────────────────────────
-- Covers status changes (investigate/escalate/resolve/dismiss), assigning
-- to another administrator, and adding/editing notes — all the same
-- lifecycle mutation, gated the same way.
CREATE OR REPLACE FUNCTION public.admin_update_marketplace_flag(
  p_flag_id     uuid,
  p_status      text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_notes       text DEFAULT NULL,
  p_reason      text DEFAULT NULL
)
RETURNS public.marketplace_flags
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_flag public.marketplace_flags%ROWTYPE;
BEGIN
  IF NOT public.has_admin_permission('marketplace.moderate') THEN
    RAISE EXCEPTION 'You do not have permission to update marketplace cases';
  END IF;

  SELECT * INTO v_flag FROM public.marketplace_flags WHERE id = p_flag_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Marketplace case not found';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('open', 'investigating', 'escalated', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid case status: %', p_status;
  END IF;

  UPDATE public.marketplace_flags
  SET status = coalesce(p_status, status),
      assigned_to = coalesce(p_assigned_to, assigned_to),
      notes = coalesce(p_notes, notes),
      resolved_at = CASE WHEN p_status IN ('resolved', 'dismissed') THEN now() ELSE resolved_at END
  WHERE id = p_flag_id
  RETURNING * INTO v_flag;

  PERFORM public.log_admin_action(
    'marketplace_flag.updated', v_flag.entity_type, v_flag.entity_id, p_reason,
    jsonb_build_object('flag_id', p_flag_id, 'status', p_status, 'assigned_to', p_assigned_to)
  );

  RETURN v_flag;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_marketplace_flag(uuid, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_marketplace_flag(uuid, text, uuid, text, text) TO authenticated;

-- ================================================================
-- report_exports — audit trail for generated reports (Phase 9/14)
-- ================================================================
CREATE TABLE public.report_exports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type   text NOT NULL,
  format        text NOT NULL CHECK (format IN ('csv', 'pdf')),
  filters       jsonb,
  row_count     int,
  requested_by  uuid REFERENCES public.profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_exports_requested_by ON public.report_exports (requested_by, created_at DESC);

COMMENT ON TABLE public.report_exports IS
  'Audit trail of every generated report export. Write only via log_report_export().';

ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_exports.select.admin"
  ON public.report_exports FOR SELECT
  USING (public.has_admin_permission('reports.view'));

CREATE OR REPLACE FUNCTION public.log_report_export(
  p_report_type text,
  p_format      text,
  p_filters     jsonb DEFAULT NULL,
  p_row_count   int DEFAULT NULL
)
RETURNS public.report_exports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_export public.report_exports%ROWTYPE;
BEGIN
  IF NOT public.has_admin_permission('reports.export') THEN
    RAISE EXCEPTION 'You do not have permission to export reports';
  END IF;

  INSERT INTO public.report_exports (report_type, format, filters, row_count, requested_by)
  VALUES (p_report_type, p_format, p_filters, p_row_count, auth.uid())
  RETURNING * INTO v_export;

  PERFORM public.log_admin_action(
    'report.exported', 'report', NULL, NULL,
    jsonb_build_object('report_type', p_report_type, 'format', p_format, 'row_count', p_row_count)
  );

  RETURN v_export;
END;
$$;

REVOKE ALL ON FUNCTION public.log_report_export(text, text, jsonb, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_report_export(text, text, jsonb, int) TO authenticated;

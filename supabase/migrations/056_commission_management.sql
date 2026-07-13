-- ============================================================
-- Migration 056 — Commission Rule Management
-- ============================================================
--
-- commission_rules and calculate_commission() already exist and are live
-- (043_payments_platform.sql) — this migration adds the fields an admin
-- CRUD UI needs (active/inactive, a human label, min/max commission bounds)
-- and the functions to manage them safely, rather than replacing the
-- calculation engine itself.
--
-- Deliberately NOT in scope here (flagged, not silently skipped):
--   * Richer per-transaction snapshot columns (applied_rule_id,
--     commission_rate, gross/net amounts, calculation_version) on
--     `transactions`, and wiring confirm_booking_payment() to populate
--     them. That function is large, financially critical, and already
--     live in production — changing it without being able to exercise a
--     real payment flow from this environment is too risky to do
--     alongside a rule-management feature. transactions.commission_amount
--     already satisfies the "never recalculate historical transactions"
--     requirement (it's computed once at payment-confirmation time and
--     never touched again); the richer fields are a reporting/audit
--     enhancement for a later, dedicated pass.
--   * A "supplier-specific commission" scope. calculate_commission() only
--     ever took a venue_id — there is no supplier payment/commission flow
--     in the schema today (supplier_contact_requests is inquiry-only, no
--     transactions reference it). Adding a scope with nothing to apply it
--     to would be dead schema, so commission_rules keeps its existing
--     scope check (global/category/venue) unchanged.

-- ── commission_rules: add what the admin UI needs ────────────
ALTER TABLE public.commission_rules
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS min_commission_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS max_commission_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.commission_rules
  ADD CONSTRAINT commission_rules_percentage_range
    CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)) NOT VALID,
  ADD CONSTRAINT commission_rules_flat_fee_nonnegative
    CHECK (flat_fee IS NULL OR flat_fee >= 0) NOT VALID,
  ADD CONSTRAINT commission_rules_min_max_nonnegative
    CHECK (
      (min_commission_amount IS NULL OR min_commission_amount >= 0)
      AND (max_commission_amount IS NULL OR max_commission_amount >= 0)
    ) NOT VALID,
  ADD CONSTRAINT commission_rules_min_le_max
    CHECK (
      min_commission_amount IS NULL OR max_commission_amount IS NULL
      OR min_commission_amount <= max_commission_amount
    ) NOT VALID,
  ADD CONSTRAINT commission_rules_scope_reference_consistency
    CHECK (
      (scope = 'global' AND reference_id IS NULL)
      OR (scope IN ('category', 'venue') AND reference_id IS NOT NULL)
    ) NOT VALID,
  ADD CONSTRAINT commission_rules_effective_window
    CHECK (effective_to IS NULL OR effective_to >= effective_from) NOT VALID;

CREATE TRIGGER commission_rules_updated_at
  BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================================
-- commission_change_history — append-only
-- ================================================================
CREATE TABLE public.commission_change_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id         uuid REFERENCES public.commission_rules(id) ON DELETE SET NULL,
  action          text NOT NULL CHECK (action IN ('created', 'updated', 'activated', 'deactivated')),
  previous_values jsonb,
  new_values      jsonb,
  reason          text,
  actor_id        uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_change_history_rule ON public.commission_change_history (rule_id, created_at DESC);

COMMENT ON TABLE public.commission_change_history IS
  'Append-only commission rule change trail. Write only via admin_create_commission_rule()/admin_update_commission_rule().';

ALTER TABLE public.commission_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_change_history.select.admin"
  ON public.commission_change_history FOR SELECT
  USING (public.has_admin_permission('commissions.view'));

-- ================================================================
-- calculate_commission() — add is_active filter + min/max clamping
-- ================================================================
-- Same signature, same resolution order (venue > category > global) and
-- same percentage+flat_fee formula as the live 043_payments_platform.sql
-- version — only two additions: skip inactive rules, and clamp the result
-- into [min_commission_amount, max_commission_amount] when set. Existing
-- rules default to is_active=true and NULL min/max, so this is a no-op for
-- every rule that existed before this migration.
CREATE OR REPLACE FUNCTION public.calculate_commission(
  p_venue_id uuid,
  p_amount   numeric
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.commission_rules%ROWTYPE;
  v_commission numeric := 0;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN 0;
  END IF;

  SELECT cr.* INTO v_rule
  FROM public.commission_rules cr
  LEFT JOIN public.venue_category_assignments vca
    ON vca.venue_id = p_venue_id AND cr.scope = 'category' AND cr.reference_id = vca.category_id
  WHERE cr.is_active
    AND cr.effective_from <= CURRENT_DATE
    AND (cr.effective_to IS NULL OR cr.effective_to >= CURRENT_DATE)
    AND (
      (cr.scope = 'venue' AND cr.reference_id = p_venue_id)
      OR (cr.scope = 'category' AND vca.venue_id IS NOT NULL)
      OR (cr.scope = 'global' AND cr.reference_id IS NULL)
    )
  ORDER BY CASE cr.scope WHEN 'venue' THEN 0 WHEN 'category' THEN 1 ELSE 2 END,
           cr.effective_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_commission := COALESCE(p_amount * v_rule.percentage / 100.0, 0)
                + COALESCE(v_rule.flat_fee, 0);

  IF v_rule.min_commission_amount IS NOT NULL AND v_commission < v_rule.min_commission_amount THEN
    v_commission := v_rule.min_commission_amount;
  END IF;
  IF v_rule.max_commission_amount IS NOT NULL AND v_commission > v_rule.max_commission_amount THEN
    v_commission := v_rule.max_commission_amount;
  END IF;

  RETURN LEAST(ROUND(v_commission, 2), p_amount);
END;
$$;

-- ================================================================
-- admin_create_commission_rule() — commissions.manage
-- ================================================================
CREATE OR REPLACE FUNCTION public.admin_create_commission_rule(
  p_scope                  text,
  p_reference_id           uuid,
  p_label                  text,
  p_percentage             numeric,
  p_flat_fee               numeric,
  p_min_commission_amount  numeric,
  p_max_commission_amount  numeric,
  p_effective_from         date,
  p_effective_to           date,
  p_reason                 text DEFAULT NULL
)
RETURNS public.commission_rules
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_rule public.commission_rules%ROWTYPE;
BEGIN
  IF NOT public.has_admin_permission('commissions.manage') THEN
    RAISE EXCEPTION 'You do not have permission to create commission rules';
  END IF;

  IF p_scope NOT IN ('global', 'category', 'venue') THEN
    RAISE EXCEPTION 'Invalid commission scope: %', p_scope;
  END IF;
  IF p_scope = 'global' AND p_reference_id IS NOT NULL THEN
    RAISE EXCEPTION 'A global commission rule must not have a reference_id';
  END IF;
  IF p_scope IN ('category', 'venue') AND p_reference_id IS NULL THEN
    RAISE EXCEPTION 'A % commission rule requires a reference_id', p_scope;
  END IF;
  IF p_percentage IS NULL AND p_flat_fee IS NULL THEN
    RAISE EXCEPTION 'A commission rule needs at least a percentage or a flat fee';
  END IF;
  IF p_percentage IS NOT NULL AND (p_percentage < 0 OR p_percentage > 100) THEN
    RAISE EXCEPTION 'Percentage must be between 0 and 100';
  END IF;
  IF p_flat_fee IS NOT NULL AND p_flat_fee < 0 THEN
    RAISE EXCEPTION 'Flat fee cannot be negative';
  END IF;
  IF p_min_commission_amount IS NOT NULL AND p_max_commission_amount IS NOT NULL
     AND p_min_commission_amount > p_max_commission_amount THEN
    RAISE EXCEPTION 'Minimum commission cannot exceed maximum commission';
  END IF;
  IF p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN
    RAISE EXCEPTION 'Effective end date cannot be before the start date';
  END IF;

  INSERT INTO public.commission_rules (
    scope, reference_id, label, percentage, flat_fee,
    min_commission_amount, max_commission_amount,
    effective_from, effective_to, is_active, created_by
  ) VALUES (
    p_scope, p_reference_id, p_label, p_percentage, p_flat_fee,
    p_min_commission_amount, p_max_commission_amount,
    p_effective_from, p_effective_to, true, auth.uid()
  )
  RETURNING * INTO v_rule;

  INSERT INTO public.commission_change_history (rule_id, action, new_values, reason, actor_id)
  VALUES (v_rule.id, 'created', to_jsonb(v_rule), p_reason, auth.uid());

  PERFORM public.log_admin_action(
    'commission_rule.created', 'commission_rule', v_rule.id, p_reason, NULL, NULL, to_jsonb(v_rule)
  );

  RETURN v_rule;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_commission_rule(
  text, uuid, text, numeric, numeric, numeric, numeric, date, date, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_commission_rule(
  text, uuid, text, numeric, numeric, numeric, numeric, date, date, text
) TO authenticated;

-- ================================================================
-- admin_update_commission_rule() — commissions.override
-- ================================================================
-- Editing (or activating/deactivating) an EXISTING rule can change the
-- commission on bookings paid from this moment forward, so it's gated
-- behind the higher commissions.override permission rather than
-- commissions.manage (which only covers creating new rules).
CREATE OR REPLACE FUNCTION public.admin_update_commission_rule(
  p_rule_id                uuid,
  p_label                  text,
  p_percentage             numeric,
  p_flat_fee               numeric,
  p_min_commission_amount  numeric,
  p_max_commission_amount  numeric,
  p_effective_from         date,
  p_effective_to           date,
  p_is_active              boolean,
  p_reason                 text
)
RETURNS public.commission_rules
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_rule          public.commission_rules%ROWTYPE;
  v_previous      public.commission_rules%ROWTYPE;
BEGIN
  IF NOT public.has_admin_permission('commissions.override') THEN
    RAISE EXCEPTION 'You do not have permission to modify commission rules';
  END IF;

  IF btrim(coalesce(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required to modify a commission rule';
  END IF;

  SELECT * INTO v_previous FROM public.commission_rules WHERE id = p_rule_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission rule not found';
  END IF;

  IF p_percentage IS NULL AND p_flat_fee IS NULL THEN
    RAISE EXCEPTION 'A commission rule needs at least a percentage or a flat fee';
  END IF;
  IF p_percentage IS NOT NULL AND (p_percentage < 0 OR p_percentage > 100) THEN
    RAISE EXCEPTION 'Percentage must be between 0 and 100';
  END IF;
  IF p_flat_fee IS NOT NULL AND p_flat_fee < 0 THEN
    RAISE EXCEPTION 'Flat fee cannot be negative';
  END IF;
  IF p_min_commission_amount IS NOT NULL AND p_max_commission_amount IS NOT NULL
     AND p_min_commission_amount > p_max_commission_amount THEN
    RAISE EXCEPTION 'Minimum commission cannot exceed maximum commission';
  END IF;
  IF p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN
    RAISE EXCEPTION 'Effective end date cannot be before the start date';
  END IF;

  UPDATE public.commission_rules
  SET label = p_label,
      percentage = p_percentage,
      flat_fee = p_flat_fee,
      min_commission_amount = p_min_commission_amount,
      max_commission_amount = p_max_commission_amount,
      effective_from = p_effective_from,
      effective_to = p_effective_to,
      is_active = p_is_active
  WHERE id = p_rule_id
  RETURNING * INTO v_rule;

  INSERT INTO public.commission_change_history (rule_id, action, previous_values, new_values, reason, actor_id)
  VALUES (
    p_rule_id,
    CASE
      WHEN v_previous.is_active AND NOT p_is_active THEN 'deactivated'
      WHEN NOT v_previous.is_active AND p_is_active THEN 'activated'
      ELSE 'updated'
    END,
    to_jsonb(v_previous), to_jsonb(v_rule), p_reason, auth.uid()
  );

  PERFORM public.log_admin_action(
    'commission_rule.updated', 'commission_rule', p_rule_id, p_reason,
    NULL, to_jsonb(v_previous), to_jsonb(v_rule)
  );

  RETURN v_rule;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_commission_rule(
  uuid, text, numeric, numeric, numeric, numeric, date, date, boolean, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_commission_rule(
  uuid, text, numeric, numeric, numeric, numeric, date, date, boolean, text
) TO authenticated;

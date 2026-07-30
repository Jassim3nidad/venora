-- AI-assisted booking auto-accept.
-- Deterministic rules and the final status write stay inside this transaction.

BEGIN;

CREATE TYPE public.booking_decision_status AS ENUM (
  'pending_review',
  'auto_approved',
  'manually_approved',
  'rejected_by_rule',
  'cancelled',
  'expired'
);

ALTER TABLE public.bookings
  ADD COLUMN decision_status public.booking_decision_status
    NOT NULL DEFAULT 'pending_review',
  ADD COLUMN approval_source text
    CHECK (approval_source IS NULL OR approval_source IN ('automation', 'human'));

CREATE TABLE public.venue_auto_accept_settings (
  venue_id uuid PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  minimum_notice_hours int NOT NULL DEFAULT 48
    CHECK (minimum_notice_hours >= 0),
  maximum_guest_count int
    CHECK (maximum_guest_count IS NULL OR maximum_guest_count > 0),
  allowed_weekdays smallint[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6]::smallint[],
  allowed_start_time time,
  allowed_end_time time,
  minimum_duration_minutes int
    CHECK (minimum_duration_minutes IS NULL OR minimum_duration_minutes > 0),
  maximum_duration_minutes int
    CHECK (maximum_duration_minutes IS NULL OR maximum_duration_minutes > 0),
  minimum_booking_amount numeric(12,2)
    CHECK (minimum_booking_amount IS NULL OR minimum_booking_amount > 0),
  require_standard_package boolean NOT NULL DEFAULT true,
  require_deposit boolean NOT NULL DEFAULT true,
  require_verified_customer boolean NOT NULL DEFAULT true,
  allowed_event_type_ids uuid[],
  confidence_threshold numeric(4,3) NOT NULL DEFAULT 0.850
    CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  review_window_minutes int NOT NULL DEFAULT 30
    CHECK (review_window_minutes >= 0),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    minimum_duration_minutes IS NULL
    OR maximum_duration_minutes IS NULL
    OR minimum_duration_minutes <= maximum_duration_minutes
  ),
  CHECK (
    allowed_start_time IS NULL
    OR allowed_end_time IS NULL
    OR allowed_start_time < allowed_end_time
  ),
  CHECK (
    allowed_weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[]
    AND cardinality(allowed_weekdays) > 0
  )
);

CREATE TRIGGER venue_auto_accept_settings_updated_at
  BEFORE UPDATE ON public.venue_auto_accept_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.venue_auto_accept_manual_review_customers (
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, customer_id)
);

CREATE TABLE public.booking_automation_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  outcome public.booking_decision_status NOT NULL,
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_verdict text CHECK (
    ai_verdict IS NULL
    OR ai_verdict IN ('eligible', 'manual_review', 'high_risk', 'unavailable')
  ),
  ai_confidence numeric(4,3)
    CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  ai_explanation text,
  risk_flags text[] NOT NULL DEFAULT '{}',
  model text,
  overridden_at timestamptz,
  overridden_by uuid REFERENCES public.profiles(id),
  override_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_automation_decisions_booking
  ON public.booking_automation_decisions(booking_id, created_at DESC);

ALTER TABLE public.venue_auto_accept_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_auto_accept_manual_review_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_automation_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_auto_accept_settings.select.staff"
  ON public.venue_auto_accept_settings FOR SELECT
  USING (public.is_org_member_for_venue(venue_id) OR public.is_admin());

CREATE POLICY "venue_auto_accept_manual_review.select.staff"
  ON public.venue_auto_accept_manual_review_customers FOR SELECT
  USING (public.is_org_member_for_venue(venue_id) OR public.is_admin());

CREATE POLICY "booking_automation_decisions.select.participants"
  ON public.booking_automation_decisions FOR SELECT
  USING (
    public.is_booking_customer(booking_id)
    OR public.is_org_member_for_booking(booking_id)
    OR public.is_admin()
  );

CREATE OR REPLACE FUNCTION public.upsert_venue_auto_accept_settings(
  p_venue_id uuid,
  p_enabled boolean,
  p_minimum_notice_hours int,
  p_maximum_guest_count int,
  p_allowed_weekdays smallint[],
  p_allowed_start_time time,
  p_allowed_end_time time,
  p_minimum_duration_minutes int,
  p_maximum_duration_minutes int,
  p_minimum_booking_amount numeric,
  p_require_standard_package boolean,
  p_require_deposit boolean,
  p_require_verified_customer boolean,
  p_allowed_event_type_ids uuid[],
  p_confidence_threshold numeric,
  p_review_window_minutes int
)
RETURNS public.venue_auto_accept_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_settings public.venue_auto_accept_settings%ROWTYPE;
BEGIN
  IF NOT (public.is_org_member_for_venue(p_venue_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'You do not have permission to configure this venue';
  END IF;

  INSERT INTO public.venue_auto_accept_settings (
    venue_id, enabled, minimum_notice_hours, maximum_guest_count,
    allowed_weekdays, allowed_start_time, allowed_end_time,
    minimum_duration_minutes, maximum_duration_minutes,
    minimum_booking_amount, require_standard_package, require_deposit,
    require_verified_customer, allowed_event_type_ids,
    confidence_threshold, review_window_minutes, updated_by
  )
  VALUES (
    p_venue_id, p_enabled, p_minimum_notice_hours, p_maximum_guest_count,
    p_allowed_weekdays, p_allowed_start_time, p_allowed_end_time,
    p_minimum_duration_minutes, p_maximum_duration_minutes,
    p_minimum_booking_amount, p_require_standard_package, p_require_deposit,
    p_require_verified_customer, p_allowed_event_type_ids,
    p_confidence_threshold, p_review_window_minutes, auth.uid()
  )
  ON CONFLICT (venue_id) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    minimum_notice_hours = EXCLUDED.minimum_notice_hours,
    maximum_guest_count = EXCLUDED.maximum_guest_count,
    allowed_weekdays = EXCLUDED.allowed_weekdays,
    allowed_start_time = EXCLUDED.allowed_start_time,
    allowed_end_time = EXCLUDED.allowed_end_time,
    minimum_duration_minutes = EXCLUDED.minimum_duration_minutes,
    maximum_duration_minutes = EXCLUDED.maximum_duration_minutes,
    minimum_booking_amount = EXCLUDED.minimum_booking_amount,
    require_standard_package = EXCLUDED.require_standard_package,
    require_deposit = EXCLUDED.require_deposit,
    require_verified_customer = EXCLUDED.require_verified_customer,
    allowed_event_type_ids = EXCLUDED.allowed_event_type_ids,
    confidence_threshold = EXCLUDED.confidence_threshold,
    review_window_minutes = EXCLUDED.review_window_minutes,
    updated_by = auth.uid()
  RETURNING * INTO v_settings;

  PERFORM public.log_audit(
    'venue.auto_accept_settings_updated',
    'venue',
    p_venue_id,
    jsonb_build_object('enabled', p_enabled)
  );

  RETURN v_settings;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_venue_auto_accept_settings(
  uuid, boolean, int, int, smallint[], time, time, int, int, numeric,
  boolean, boolean, boolean, uuid[], numeric, int
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_venue_auto_accept_settings(
  uuid, boolean, int, int, smallint[], time, time, int, int, numeric,
  boolean, boolean, boolean, uuid[], numeric, int
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.process_booking_auto_accept(
  p_booking_id uuid,
  p_ai_evaluation jsonb DEFAULT NULL
)
RETURNS public.booking_automation_decisions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_settings public.venue_auto_accept_settings%ROWTYPE;
  v_venue public.venues%ROWTYPE;
  v_package public.venue_packages%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_decision public.booking_automation_decisions%ROWTYPE;
  v_rules jsonb := '[]'::jsonb;
  v_outcome public.booking_decision_status := 'pending_review';
  v_ai_verdict text := COALESCE(p_ai_evaluation->>'verdict', 'unavailable');
  v_ai_confidence numeric;
  v_ai_explanation text := LEFT(p_ai_evaluation->>'explanation', 1000);
  v_risk_flags text[] := '{}';
  v_model text := LEFT(p_ai_evaluation->>'model', 200);
  v_total numeric;
  v_deposit numeric;
  v_duration int;
  v_rule_failed boolean := false;
  v_manual_review boolean := false;
  v_rule_detail text;
  v_has_unavailable_supplier boolean := false;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status::text <> 'pending' THEN
    RAISE EXCEPTION 'Only pending bookings can be evaluated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.booking_automation_decisions
    WHERE booking_id = p_booking_id
      AND outcome = 'auto_approved'
  ) THEN
    RAISE EXCEPTION 'Booking was already auto-approved';
  END IF;

  SELECT * INTO v_settings
  FROM public.venue_auto_accept_settings
  WHERE venue_id = v_booking.venue_id;

  IF NOT FOUND OR NOT v_settings.enabled THEN
    v_rules := v_rules || jsonb_build_array(jsonb_build_object(
      'rule', 'auto_accept_enabled', 'passed', false,
      'result', 'manual_review', 'detail', 'Auto-accept is disabled'
    ));
    v_manual_review := true;
  ELSE
    SELECT * INTO v_venue FROM public.venues WHERE id = v_booking.venue_id;
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_booking.customer_id;

    PERFORM public.assert_booking_slot_available(
      v_booking.venue_id, v_booking.event_date, v_booking.id, true
    );
    v_rules := v_rules || jsonb_build_array(jsonb_build_object(
      'rule', 'availability', 'passed', true, 'result', 'pass'
    ));

    IF EXISTS (
      SELECT 1 FROM public.venue_blackout_dates
      WHERE venue_id = v_booking.venue_id
        AND v_booking.event_date BETWEEN start_date AND end_date
    ) THEN
      v_rule_failed := true;
      v_rule_detail := 'Selected date is blacked out';
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'blackout_date', 'passed', false,
        'result', 'reject', 'detail', v_rule_detail
      ));
    ELSE
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'blackout_date', 'passed', true, 'result', 'pass'
      ));
    END IF;

    IF v_booking.guest_count > LEAST(
      v_venue.capacity_max,
      COALESCE(v_settings.maximum_guest_count, v_venue.capacity_max)
    ) THEN
      v_rule_failed := true;
      v_rule_detail := 'Guest count exceeds auto-accept capacity';
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'capacity', 'passed', false,
        'result', 'reject', 'detail', v_rule_detail
      ));
    ELSE
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'capacity', 'passed', true, 'result', 'pass'
      ));
    END IF;

    IF v_booking.event_date::timestamp
       < now() + make_interval(hours => v_settings.minimum_notice_hours) THEN
      v_rule_failed := true;
      v_rule_detail := 'Booking does not meet minimum notice';
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'minimum_notice', 'passed', false,
        'result', 'reject', 'detail', v_rule_detail
      ));
    ELSE
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'minimum_notice', 'passed', true, 'result', 'pass'
      ));
    END IF;

    IF NOT (
      EXTRACT(DOW FROM v_booking.event_date)::smallint
      = ANY(v_settings.allowed_weekdays)
    ) THEN
      v_rule_failed := true;
      v_rule_detail := 'Requested day is not eligible';
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'allowed_day', 'passed', false,
        'result', 'reject', 'detail', v_rule_detail
      ));
    ELSE
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'allowed_day', 'passed', true, 'result', 'pass'
      ));
    END IF;

    IF v_settings.allowed_start_time IS NOT NULL
       OR v_settings.allowed_end_time IS NOT NULL
       OR v_settings.minimum_duration_minutes IS NOT NULL
       OR v_settings.maximum_duration_minutes IS NOT NULL THEN
      IF v_booking.event_start_time IS NULL OR v_booking.event_end_time IS NULL
         OR v_booking.event_end_time <= v_booking.event_start_time THEN
        v_rule_failed := true;
        v_rule_detail := 'Valid start and end times are required';
        v_rules := v_rules || jsonb_build_array(jsonb_build_object(
          'rule', 'booking_duration', 'passed', false,
          'result', 'reject', 'detail', v_rule_detail
        ));
      ELSE
        v_duration := EXTRACT(EPOCH FROM (
          v_booking.event_end_time - v_booking.event_start_time
        ))::int / 60;
        IF (v_settings.allowed_start_time IS NOT NULL
              AND v_booking.event_start_time < v_settings.allowed_start_time)
           OR (v_settings.allowed_end_time IS NOT NULL
              AND v_booking.event_end_time > v_settings.allowed_end_time)
           OR (v_settings.minimum_duration_minutes IS NOT NULL
              AND v_duration < v_settings.minimum_duration_minutes)
           OR (v_settings.maximum_duration_minutes IS NOT NULL
              AND v_duration > v_settings.maximum_duration_minutes) THEN
          v_rule_failed := true;
          v_rule_detail := 'Requested hours or duration are not eligible';
          v_rules := v_rules || jsonb_build_array(jsonb_build_object(
            'rule', 'booking_duration', 'passed', false,
            'result', 'reject', 'detail', v_rule_detail
          ));
        ELSE
          v_rules := v_rules || jsonb_build_array(jsonb_build_object(
            'rule', 'booking_duration', 'passed', true, 'result', 'pass'
          ));
        END IF;
      END IF;
    END IF;

    IF v_booking.package_id IS NULL THEN
      v_manual_review := true;
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'standard_package', 'passed', false,
        'result', 'manual_review', 'detail', 'No standard package selected'
      ));
    ELSE
      SELECT * INTO v_package
      FROM public.venue_packages
      WHERE id = v_booking.package_id
        AND venue_id = v_booking.venue_id
        AND is_active = true;

      IF NOT FOUND
         OR (v_package.valid_from IS NOT NULL AND v_booking.event_date < v_package.valid_from)
         OR (v_package.valid_until IS NOT NULL AND v_booking.event_date > v_package.valid_until) THEN
        v_rule_failed := true;
        v_rule_detail := 'Selected package is unavailable for this date';
        v_rules := v_rules || jsonb_build_array(jsonb_build_object(
          'rule', 'standard_package', 'passed', false,
          'result', 'reject', 'detail', v_rule_detail
        ));
      ELSE
        v_total := v_package.price;
        v_rules := v_rules || jsonb_build_array(jsonb_build_object(
          'rule', 'standard_package', 'passed', true, 'result', 'pass'
        ));

        SELECT EXISTS (
          SELECT 1
          FROM public.package_suppliers ps
          LEFT JOIN public.venue_supplier_agreements a ON a.id = ps.agreement_id
          WHERE ps.package_id = v_package.id
            AND (
              a.id IS NULL
              OR a.status::text <> 'active'
              OR (a.valid_from IS NOT NULL AND v_booking.event_date < a.valid_from)
              OR (a.valid_until IS NOT NULL AND v_booking.event_date > a.valid_until)
              OR (a.max_guest_count IS NOT NULL AND v_booking.guest_count > a.max_guest_count)
              OR (
                a.required_lead_time_days IS NOT NULL
                AND v_booking.event_date < CURRENT_DATE + a.required_lead_time_days
              )
            )
        ) INTO v_has_unavailable_supplier;

        IF v_has_unavailable_supplier THEN
          v_manual_review := true;
          v_rules := v_rules || jsonb_build_array(jsonb_build_object(
            'rule', 'supplier_services', 'passed', false,
            'result', 'manual_review',
            'detail', 'A package supplier requires confirmation'
          ));
        ELSE
          v_rules := v_rules || jsonb_build_array(jsonb_build_object(
            'rule', 'supplier_services', 'passed', true, 'result', 'pass'
          ));
        END IF;
      END IF;
    END IF;

    IF v_settings.minimum_booking_amount IS NOT NULL
       AND (v_total IS NULL OR v_total < v_settings.minimum_booking_amount) THEN
      v_rule_failed := true;
      v_rule_detail := 'Booking amount is below auto-accept minimum';
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'minimum_amount', 'passed', false,
        'result', 'reject', 'detail', v_rule_detail
      ));
    ELSIF v_total IS NOT NULL THEN
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'minimum_amount', 'passed', true, 'result', 'pass'
      ));
    END IF;

    IF v_package.id IS NOT NULL THEN
      v_deposit := COALESCE(
        NULLIF(v_package.deposit_flat_amount, 0),
        ROUND(v_total * NULLIF(v_package.deposit_percentage, 0) / 100, 2)
      );
    END IF;

    IF v_settings.require_deposit AND COALESCE(v_deposit, 0) <= 0 THEN
      v_manual_review := true;
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'deposit_configured', 'passed', false,
        'result', 'manual_review',
        'detail', 'Package has no valid deposit requirement'
      ));
    ELSE
      v_deposit := COALESCE(v_deposit, ROUND(v_total * 0.5, 2));
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'deposit_configured', 'passed', true, 'result', 'pass'
      ));
    END IF;

    IF v_settings.require_verified_customer AND v_profile.status::text <> 'active' THEN
      v_manual_review := true;
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'verified_customer', 'passed', false,
        'result', 'manual_review', 'detail', 'Customer account is not verified'
      ));
    ELSE
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'verified_customer', 'passed', true, 'result', 'pass'
      ));
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.venue_auto_accept_manual_review_customers
      WHERE venue_id = v_booking.venue_id
        AND customer_id = v_booking.customer_id
    ) THEN
      v_manual_review := true;
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'customer_review_list', 'passed', false,
        'result', 'manual_review', 'detail', 'Customer requires manual review'
      ));
    ELSE
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'customer_review_list', 'passed', true, 'result', 'pass'
      ));
    END IF;

    IF v_settings.allowed_event_type_ids IS NOT NULL
       AND (
         v_package.event_type_id IS NULL
         OR NOT (v_package.event_type_id = ANY(v_settings.allowed_event_type_ids))
       ) THEN
      v_rule_failed := true;
      v_rule_detail := 'Event type is not eligible for auto-accept';
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'event_type', 'passed', false,
        'result', 'reject', 'detail', v_rule_detail
      ));
    ELSE
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'rule', 'event_type', 'passed', true, 'result', 'pass'
      ));
    END IF;

    BEGIN
      v_ai_confidence := (p_ai_evaluation->>'confidence')::numeric;
    EXCEPTION WHEN OTHERS THEN
      v_ai_confidence := NULL;
    END;
    IF jsonb_typeof(p_ai_evaluation->'riskFlags') = 'array' THEN
      SELECT COALESCE(array_agg(LEFT(value, 100)), '{}')
      INTO v_risk_flags
      FROM jsonb_array_elements_text(p_ai_evaluation->'riskFlags');
    END IF;

    IF NULLIF(BTRIM(v_booking.special_requests), '') IS NULL THEN
      v_ai_verdict := 'eligible';
      v_ai_confidence := 1;
      v_ai_explanation := 'No special requests require interpretation.';
    ELSIF v_ai_verdict <> 'eligible'
       OR v_ai_confidence IS NULL
       OR v_ai_confidence < v_settings.confidence_threshold THEN
      v_manual_review := true;
    END IF;
  END IF;

  IF v_rule_failed THEN
    v_outcome := 'rejected_by_rule';
    UPDATE public.bookings
    SET status = 'declined',
        decision_status = v_outcome,
        decline_reason = COALESCE(v_rule_detail, 'Booking failed an eligibility rule'),
        approval_source = 'automation',
        updated_at = now()
    WHERE id = p_booking_id;
  ELSIF v_manual_review THEN
    v_outcome := 'pending_review';
    UPDATE public.bookings
    SET decision_status = v_outcome, approval_source = NULL, updated_at = now()
    WHERE id = p_booking_id;
  ELSE
    v_outcome := 'auto_approved';
    UPDATE public.bookings
    SET status = 'approved',
        decision_status = v_outcome,
        approval_source = 'automation',
        total_amount = v_total,
        deposit_amount = v_deposit,
        approval_note = 'Approved by smart booking automation',
        approved_at = now(),
        payment_due_at = now() + INTERVAL '48 hours',
        updated_at = now()
    WHERE id = p_booking_id;
  END IF;

  INSERT INTO public.booking_automation_decisions (
    booking_id, venue_id, outcome, rules, ai_verdict, ai_confidence,
    ai_explanation, risk_flags, model
  )
  VALUES (
    p_booking_id, v_booking.venue_id, v_outcome, v_rules, v_ai_verdict,
    v_ai_confidence, v_ai_explanation, v_risk_flags, v_model
  )
  RETURNING * INTO v_decision;

  PERFORM public.log_audit(
    'booking.automation_decided',
    'booking',
    p_booking_id,
    jsonb_build_object(
      'decision_id', v_decision.id,
      'outcome', v_outcome,
      'ai_confidence', v_ai_confidence
    )
  );

  RETURN v_decision;
END;
$$;

REVOKE ALL ON FUNCTION public.process_booking_auto_accept(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_booking_auto_accept(uuid, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.override_booking_automation_decision(
  p_booking_id uuid,
  p_action text,
  p_reason text
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_decision public.booking_automation_decisions%ROWTYPE;
  v_review_window_minutes int;
BEGIN
  IF p_action NOT IN ('manual_review', 'reject') THEN
    RAISE EXCEPTION 'Override action must be manual_review or reject';
  END IF;
  IF BTRIM(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'An override reason is required';
  END IF;
  IF NOT (public.is_org_member_for_booking(p_booking_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'You do not have permission to override this decision';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  IF v_booking.approval_source <> 'automation'
     OR v_booking.decision_status <> 'auto_approved'
     OR v_booking.status::text <> 'approved' THEN
    RAISE EXCEPTION 'Only an unpaid automatic approval can be overridden';
  END IF;

  SELECT * INTO v_decision
  FROM public.booking_automation_decisions
  WHERE booking_id = p_booking_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  SELECT review_window_minutes INTO v_review_window_minutes
  FROM public.venue_auto_accept_settings
  WHERE venue_id = v_booking.venue_id;

  IF NOT FOUND
     OR v_decision.id IS NULL
     OR now() > v_decision.created_at
       + make_interval(mins => v_review_window_minutes) THEN
    RAISE EXCEPTION 'The automatic approval review window has closed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE booking_id = p_booking_id
      AND status::text IN ('pending', 'paid', 'partially_refunded')
  ) THEN
    RAISE EXCEPTION 'A payment exists; use the cancellation and refund workflow';
  END IF;

  UPDATE public.invoices
  SET status = 'void', voided_at = now(), updated_at = now()
  WHERE booking_id = p_booking_id AND status = 'issued';

  IF p_action = 'manual_review' THEN
    UPDATE public.bookings
    SET status = 'pending',
        decision_status = 'pending_review',
        approval_source = NULL,
        total_amount = NULL,
        deposit_amount = NULL,
        approval_note = NULL,
        approved_at = NULL,
        payment_due_at = NULL,
        updated_at = now()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;
  ELSE
    UPDATE public.bookings
    SET status = 'declined',
        decision_status = 'rejected_by_rule',
        decline_reason = BTRIM(p_reason),
        updated_at = now()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;
  END IF;

  UPDATE public.booking_automation_decisions
  SET overridden_at = now(),
      overridden_by = auth.uid(),
      override_reason = BTRIM(p_reason)
  WHERE id = v_decision.id;

  PERFORM public.log_audit(
    'booking.automation_overridden',
    'booking',
    p_booking_id,
    jsonb_build_object('action', p_action, 'reason', BTRIM(p_reason))
  );

  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.override_booking_automation_decision(
  uuid, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.override_booking_automation_decision(
  uuid, text, text
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_manual_booking_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.status::text = 'approved'
     AND OLD.status::text = 'pending'
     AND NEW.approval_source IS NULL THEN
    NEW.approval_source := 'human';
    NEW.decision_status := 'manually_approved';
  ELSIF NEW.status::text = 'cancelled' THEN
    NEW.decision_status := 'cancelled';
  ELSIF NEW.status::text = 'expired' THEN
    NEW.decision_status := 'expired';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_mark_decision_source
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.mark_manual_booking_approval();

ALTER TABLE public.ai_configurations
  DROP CONSTRAINT ai_configurations_feature_check;
ALTER TABLE public.ai_configurations
  ADD CONSTRAINT ai_configurations_feature_check CHECK (feature IN (
    'assistant', 'search', 'recommendation', 'venue_description',
    'cost_estimator', 'package_comparison', 'embeddings',
    'booking_auto_accept'
  ));

INSERT INTO public.ai_configurations (
  feature, enabled, provider, model, max_tokens, timeout_seconds,
  temperature, moderation_enabled
)
VALUES (
  'booking_auto_accept', true, 'openrouter', 'qwen/qwen3.7-flash',
  800, 15, 0, true
)
ON CONFLICT (feature) DO NOTHING;

COMMENT ON TABLE public.venue_auto_accept_settings IS
  'Per-venue supplier controls for smart booking automation. Disabled by default.';
COMMENT ON TABLE public.booking_automation_decisions IS
  'Immutable decision record containing every deterministic rule result plus advisory AI output.';
COMMENT ON COLUMN public.bookings.decision_status IS
  'Booking decision outcome, separate from payment/event lifecycle status for compatibility.';
COMMENT ON COLUMN public.bookings.approval_source IS
  'Whether approval came from automation or a human.';

COMMIT;

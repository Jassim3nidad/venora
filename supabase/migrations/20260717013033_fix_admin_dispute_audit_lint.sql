-- Fix DB lint errors left by admin disputes/review workflows.
--
-- 076_admin_disputes.sql called log_admin_audit(), but the richer admin
-- audit helper introduced in 054 is named log_admin_action(). Keep a narrow
-- compatibility wrapper instead of rewriting historical migration intent.
CREATE OR REPLACE FUNCTION public.log_admin_audit(
  p_action          text,
  p_resource_type   text,
  p_resource_id     uuid  DEFAULT NULL,
  p_reason          text  DEFAULT NULL,
  p_previous_values jsonb DEFAULT NULL,
  p_new_values      jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
BEGIN
  PERFORM public.log_admin_action(
    p_action,
    p_resource_type,
    p_resource_id,
    p_reason,
    NULL,
    p_previous_values,
    p_new_values
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_audit(text, text, uuid, text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.log_admin_audit(text, text, uuid, text, jsonb, jsonb) IS
  'Compatibility wrapper for admin dispute audit logging. Prefer log_admin_action() for new code.';

-- Recreate admin_review_supplier() only to cast restore CASE branches to the
-- accreditation enum explicitly. Logic is unchanged from 055_review_workflows.
CREATE OR REPLACE FUNCTION public.admin_review_supplier(
  p_supplier_id uuid,
  p_action      text,
  p_reason      text DEFAULT NULL
)
RETURNS public.supplier_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_supplier         public.supplier_profiles%ROWTYPE;
  v_previous_status  public.accreditation_status;
  v_new_status       public.accreditation_status;
  v_permission       text;
BEGIN
  v_permission := CASE p_action
    WHEN 'begin_review' THEN 'suppliers.review'
    WHEN 'request_info' THEN 'suppliers.review'
    WHEN 'note'         THEN 'suppliers.review'
    WHEN 'approve'      THEN 'suppliers.approve'
    WHEN 'reject'       THEN 'suppliers.reject'
    WHEN 'suspend'      THEN 'suppliers.suspend'
    WHEN 'restore'      THEN 'suppliers.suspend'
    ELSE NULL
  END;

  IF v_permission IS NULL THEN
    RAISE EXCEPTION 'Unknown supplier review action: %', p_action;
  END IF;

  IF NOT public.has_admin_permission(v_permission) THEN
    RAISE EXCEPTION 'You do not have permission to perform this supplier review action';
  END IF;

  SELECT * INTO v_supplier
  FROM public.supplier_profiles
  WHERE id = p_supplier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;

  v_previous_status := v_supplier.accreditation_status;
  v_new_status := v_previous_status;

  CASE p_action
    WHEN 'approve' THEN
      IF v_previous_status NOT IN ('pending', 'rejected') THEN
        RAISE EXCEPTION 'Only pending or previously rejected suppliers can be accredited (current status: %)', v_previous_status;
      END IF;
      IF btrim(coalesce(v_supplier.business_name, '')) = '' THEN
        RAISE EXCEPTION 'Business name is required before accreditation';
      END IF;
      IF v_supplier.category_id IS NULL THEN
        RAISE EXCEPTION 'A service category is required before accreditation';
      END IF;
      IF btrim(coalesce(v_supplier.contact_email, '')) = '' AND btrim(coalesce(v_supplier.contact_phone, '')) = '' THEN
        RAISE EXCEPTION 'At least one contact method (email or phone) is required before accreditation';
      END IF;
      IF v_supplier.service_areas IS NULL OR array_length(v_supplier.service_areas, 1) IS NULL THEN
        RAISE EXCEPTION 'At least one service area is required before accreditation';
      END IF;
      v_new_status := 'accredited';

    WHEN 'reject' THEN
      IF v_previous_status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending suppliers can be rejected (current status: %)', v_previous_status;
      END IF;
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'A reason is required to reject a supplier';
      END IF;
      v_new_status := 'rejected';

    WHEN 'suspend' THEN
      IF v_previous_status <> 'accredited' THEN
        RAISE EXCEPTION 'Only accredited suppliers can be suspended (current status: %)', v_previous_status;
      END IF;
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'A reason is required to suspend a supplier';
      END IF;
      v_new_status := 'suspended';

    WHEN 'restore' THEN
      IF v_previous_status NOT IN ('suspended', 'rejected') THEN
        RAISE EXCEPTION 'Only suspended or rejected suppliers can be restored (current status: %)', v_previous_status;
      END IF;
      v_new_status := CASE
        WHEN v_previous_status = 'suspended' THEN 'accredited'::public.accreditation_status
        ELSE 'pending'::public.accreditation_status
      END;

    WHEN 'request_info' THEN
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'A reason is required when requesting additional information';
      END IF;

    WHEN 'begin_review' THEN
      NULL;

    WHEN 'note' THEN
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'Note text is required';
      END IF;

    ELSE
      RAISE EXCEPTION 'Unhandled supplier review action: %', p_action;
  END CASE;

  IF v_new_status IS DISTINCT FROM v_previous_status THEN
    UPDATE public.supplier_profiles
    SET accreditation_status = v_new_status,
        updated_at = now(),
        published_at = CASE
          WHEN v_new_status = 'accredited' AND published_at IS NULL THEN now()
          ELSE published_at
        END
    WHERE id = p_supplier_id
    RETURNING * INTO v_supplier;
  END IF;

  INSERT INTO public.supplier_review_history (
    supplier_id,
    action,
    previous_status,
    new_status,
    reason,
    actor_id
  )
  VALUES (
    p_supplier_id,
    p_action,
    v_previous_status,
    NULLIF(v_new_status::text, v_previous_status::text)::public.accreditation_status,
    p_reason,
    auth.uid()
  );

  PERFORM public.log_admin_action(
    'supplier.' || p_action,
    'supplier',
    p_supplier_id,
    p_reason,
    NULL,
    jsonb_build_object('accreditation_status', v_previous_status),
    jsonb_build_object('accreditation_status', v_new_status)
  );

  RETURN v_supplier;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_supplier(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_supplier(uuid, text, text) TO authenticated;

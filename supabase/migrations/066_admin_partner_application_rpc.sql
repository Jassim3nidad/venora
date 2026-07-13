-- 066_admin_partner_application_rpc.sql

CREATE OR REPLACE FUNCTION public.admin_approve_partner_application(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_application record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_application FROM public.partner_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_application.status != 'pending' THEN
    RAISE EXCEPTION 'Application is not pending';
  END IF;

  -- Upsert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_application.user_id, v_application.role_applied_for)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Update application
  UPDATE public.partner_applications
  SET status = 'approved', updated_at = now()
  WHERE id = p_application_id;

  -- Log action
  PERFORM public.log_admin_action(
    'application.approved',
    'partner_applications',
    p_application_id,
    'Application approved by admin',
    jsonb_build_object('role_applied', v_application.role_applied_for)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_deny_partner_application(p_application_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_application record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  SELECT * INTO v_application FROM public.partner_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_application.status != 'pending' THEN
    RAISE EXCEPTION 'Application is not pending';
  END IF;

  -- Update application
  UPDATE public.partner_applications
  SET status = 'denied', denial_reason = trim(p_reason), updated_at = now()
  WHERE id = p_application_id;

  -- Log action
  PERFORM public.log_admin_action(
    'application.denied',
    'partner_applications',
    p_application_id,
    trim(p_reason),
    '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_partner_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_partner_application(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_deny_partner_application(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_deny_partner_application(uuid, text) TO authenticated;

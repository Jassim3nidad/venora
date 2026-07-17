-- Fix coordinator invitation acceptance and Data API table privileges.

CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  target_user_id uuid;
  requested_role public.user_role;
  is_trusted_invitation_acceptance boolean;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  requested_role := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.role
    ELSE NEW.role
  END;

  IF auth.uid() IS NOT NULL AND target_user_id = auth.uid() THEN
    SELECT
      TG_OP IN ('INSERT', 'UPDATE')
      AND requested_role = 'event_coordinator'::public.user_role
      AND current_setting('app.accepting_org_invitation', true) = 'on'
      AND EXISTS (
        SELECT 1
        FROM auth.users u
        JOIN public.organization_member_invitations invitation
          ON invitation.email = lower(u.email)
        WHERE u.id = target_user_id
          AND invitation.status = 'pending'
          AND invitation.expires_at >= now()
      )
    INTO is_trusted_invitation_acceptance;

    IF is_trusted_invitation_acceptance THEN
      RETURN COALESCE(NEW, OLD);
    END IF;

    RAISE EXCEPTION 'Users cannot change their own role.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_organization_member_invitation(p_token text)
RETURNS TABLE (
  organization_id uuid,
  user_id uuid,
  member_status public.org_member_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog AS $$
DECLARE
  v_invitation public.organization_member_invitations%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_user_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to accept this invitation.';
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 24 THEN
    RAISE EXCEPTION 'This invitation link is invalid.';
  END IF;

  SELECT lower(email)
    INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Your signed-in account does not have an email address.';
  END IF;

  SELECT *
    INTO v_invitation
  FROM public.organization_member_invitations
  WHERE token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invitation link is invalid.';
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'This invitation is no longer pending.';
  END IF;

  IF v_invitation.expires_at < now() THEN
    UPDATE public.organization_member_invitations
    SET status = 'expired'
    WHERE id = v_invitation.id;
    RAISE EXCEPTION 'This invitation has expired.';
  END IF;

  IF v_invitation.email <> v_user_email THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address.';
  END IF;

  INSERT INTO public.profiles (id, full_name, status)
  VALUES (v_user_id, split_part(v_user_email, '@', 1), 'active')
  ON CONFLICT (id) DO UPDATE
    SET status = CASE
      WHEN public.profiles.status = 'pending_verification' THEN 'active'
      ELSE public.profiles.status
    END;

  PERFORM set_config('app.accepting_org_invitation', 'on', true);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'event_coordinator')
  ON CONFLICT ON CONSTRAINT user_roles_one_role_per_user DO UPDATE
    SET role = EXCLUDED.role;

  PERFORM set_config('app.accepting_org_invitation', 'off', true);

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    invited_at,
    invited_by,
    status,
    suspended_at,
    revoked_at
  )
  VALUES (
    v_invitation.organization_id,
    v_user_id,
    v_invitation.role,
    now(),
    v_invitation.invited_by,
    'active',
    NULL,
    NULL
  )
  ON CONFLICT ON CONSTRAINT organization_members_pkey DO UPDATE
    SET role = EXCLUDED.role,
        invited_by = EXCLUDED.invited_by,
        status = 'active',
        suspended_at = NULL,
        revoked_at = NULL;

  UPDATE public.organization_member_invitations
  SET status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = now()
  WHERE id = v_invitation.id;

  organization_id := v_invitation.organization_id;
  user_id := v_user_id;
  member_status := 'active';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_member_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_member_invitation(text) TO authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.organization_members TO authenticated;
GRANT UPDATE ON public.organization_members TO authenticated;
GRANT SELECT ON public.organization_member_invitations TO authenticated;
GRANT UPDATE ON public.organization_member_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_member_invitations TO service_role;

GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE ON public.notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  target_user_id uuid;
  requested_role public.user_role;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  requested_role := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.role
    ELSE NEW.role
  END;

  IF auth.uid() IS NOT NULL AND target_user_id = auth.uid() THEN
    IF current_setting('app.accepting_org_invitation', true) = 'on' THEN
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

  SELECT lower(email) INTO v_user_email FROM auth.users WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Your signed-in account does not have an email address.';
  END IF;

  SELECT * INTO v_invitation
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
    UPDATE public.organization_member_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RAISE EXCEPTION 'This invitation has expired.';
  END IF;

  IF v_invitation.email <> v_user_email THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address.';
  END IF;

  INSERT INTO public.profiles (id, full_name, status)
  VALUES (v_user_id, split_part(v_user_email, '@', 1), 'active')
  ON CONFLICT (id) DO UPDATE SET status = CASE WHEN public.profiles.status = 'pending_verification' THEN 'active' ELSE public.profiles.status END;

  PERFORM set_config('app.accepting_org_invitation', 'on', true);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'event_coordinator')
  ON CONFLICT ON CONSTRAINT user_roles_one_role_per_user DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO public.organization_members (
    organization_id, user_id, role, permissions, invited_at, invited_by, status, suspended_at, revoked_at
  ) VALUES (
    v_invitation.organization_id, v_user_id, v_invitation.role, v_invitation.permissions, now(), v_invitation.invited_by, 'active', NULL, NULL
  ) ON CONFLICT ON CONSTRAINT organization_members_pkey DO UPDATE
    SET role = EXCLUDED.role, permissions = EXCLUDED.permissions, invited_by = EXCLUDED.invited_by, status = 'active', suspended_at = NULL, revoked_at = NULL;

  INSERT INTO public.venue_coordinator_assignments (organization_id, venue_id, user_id, assigned_by)
  SELECT v_invitation.organization_id, venue_id, v_user_id, v_invitation.invited_by
  FROM unnest(v_invitation.venue_ids) AS venue_id
  ON CONFLICT ON CONSTRAINT venue_coordinator_assignments_unique DO NOTHING;

  UPDATE public.organization_member_invitations
  SET status = 'accepted', accepted_by = v_user_id, accepted_at = now()
  WHERE id = v_invitation.id;

  PERFORM set_config('app.accepting_org_invitation', 'off', true);

  organization_id := v_invitation.organization_id;
  user_id := v_user_id;
  member_status := 'active';
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_organization_member_invitation_by_id(p_invitation_id uuid, p_accept boolean)
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
    RAISE EXCEPTION 'You must be signed in to respond to this invitation.';
  END IF;

  SELECT lower(email) INTO v_user_email FROM auth.users WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Your signed-in account does not have an email address.';
  END IF;

  SELECT * INTO v_invitation
  FROM public.organization_member_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invitation could not be found.';
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'This invitation is no longer pending.';
  END IF;

  IF v_invitation.expires_at < now() THEN
    UPDATE public.organization_member_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RAISE EXCEPTION 'This invitation has expired.';
  END IF;

  IF v_invitation.email <> v_user_email THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address.';
  END IF;

  IF NOT p_accept THEN
    UPDATE public.organization_member_invitations SET status = 'revoked' WHERE id = v_invitation.id;
    organization_id := v_invitation.organization_id;
    user_id := v_user_id;
    member_status := 'revoked';
    RETURN NEXT;
    RETURN;
  END IF;

  PERFORM set_config('app.accepting_org_invitation', 'on', true);

  INSERT INTO public.profiles (id, full_name, status)
  VALUES (v_user_id, split_part(v_user_email, '@', 1), 'active')
  ON CONFLICT (id) DO UPDATE SET status = CASE WHEN public.profiles.status = 'pending_verification' THEN 'active' ELSE public.profiles.status END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'event_coordinator')
  ON CONFLICT ON CONSTRAINT user_roles_one_role_per_user DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO public.organization_members (
    organization_id, user_id, role, permissions, invited_at, invited_by, status, suspended_at, revoked_at
  ) VALUES (
    v_invitation.organization_id, v_user_id, v_invitation.role, v_invitation.permissions, now(), v_invitation.invited_by, 'active', NULL, NULL
  ) ON CONFLICT ON CONSTRAINT organization_members_pkey DO UPDATE
    SET role = EXCLUDED.role, permissions = EXCLUDED.permissions, invited_by = EXCLUDED.invited_by, status = 'active', suspended_at = NULL, revoked_at = NULL;

  INSERT INTO public.venue_coordinator_assignments (organization_id, venue_id, user_id, assigned_by)
  SELECT v_invitation.organization_id, venue_id, v_user_id, v_invitation.invited_by
  FROM unnest(v_invitation.venue_ids) AS venue_id
  ON CONFLICT ON CONSTRAINT venue_coordinator_assignments_unique DO NOTHING;

  UPDATE public.organization_member_invitations
  SET status = 'accepted', accepted_by = v_user_id, accepted_at = now()
  WHERE id = v_invitation.id;

  PERFORM set_config('app.accepting_org_invitation', 'off', true);

  organization_id := v_invitation.organization_id;
  user_id := v_user_id;
  member_status := 'active';
  RETURN NEXT;
END;
$$;

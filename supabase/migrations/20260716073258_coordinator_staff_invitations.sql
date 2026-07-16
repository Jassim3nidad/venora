CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'org_member_status'
  ) THEN
    CREATE TYPE public.org_member_status AS ENUM (
      'active',
      'suspended',
      'revoked'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'organization_invitation_status'
  ) THEN
    CREATE TYPE public.organization_invitation_status AS ENUM (
      'pending',
      'accepted',
      'revoked',
      'expired'
    );
  END IF;
END $$;

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS status public.org_member_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'organization_members_updated_at'
  ) THEN
    CREATE TRIGGER organization_members_updated_at
      BEFORE UPDATE ON public.organization_members
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DROP POLICY IF EXISTS "org_members.update.org_owner" ON public.organization_members;
CREATE POLICY "org_members.update.org_owner"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING (public.is_org_owner(organization_id))
  WITH CHECK (public.is_org_owner(organization_id));

CREATE TABLE IF NOT EXISTS public.organization_member_invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email           text NOT NULL,
  token_hash      text NOT NULL UNIQUE,
  role            public.org_member_role NOT NULL DEFAULT 'coordinator',
  status          public.organization_invitation_status NOT NULL DEFAULT 'pending',
  invited_by      uuid NOT NULL REFERENCES public.profiles(id),
  accepted_by     uuid REFERENCES public.profiles(id),
  accepted_at     timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_member_invitations_email_lower
    CHECK (email = lower(email)),
  CONSTRAINT organization_member_invitations_email_not_blank
    CHECK (length(trim(email)) > 3)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'organization_member_invitations_updated_at'
  ) THEN
    CREATE TRIGGER organization_member_invitations_updated_at
      BEFORE UPDATE ON public.organization_member_invitations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS organization_member_invitations_pending_email_idx
  ON public.organization_member_invitations (organization_id, email)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS organization_member_invitations_org_status_idx
  ON public.organization_member_invitations (organization_id, status, created_at DESC);

ALTER TABLE public.organization_member_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_member_invites.select.owner" ON public.organization_member_invitations;
CREATE POLICY "org_member_invites.select.owner"
  ON public.organization_member_invitations FOR SELECT
  TO authenticated
  USING (
    public.is_org_owner(organization_id)
    OR public.is_admin()
    OR accepted_by = (select auth.uid())
  );

DROP POLICY IF EXISTS "org_member_invites.insert.owner" ON public.organization_member_invitations;
CREATE POLICY "org_member_invites.insert.owner"
  ON public.organization_member_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_owner(organization_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "org_member_invites.update.owner" ON public.organization_member_invitations;
CREATE POLICY "org_member_invites.update.owner"
  ON public.organization_member_invitations FOR UPDATE
  TO authenticated
  USING (
    public.is_org_owner(organization_id)
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_org_owner(organization_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "org_member_invites.all.admin" ON public.organization_member_invitations;
CREATE POLICY "org_member_invites.all.admin"
  ON public.organization_member_invitations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'event_coordinator')
  ON CONFLICT DO NOTHING;

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

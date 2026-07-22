-- Venue-specific coordinator assignments.
-- Owners/admins keep organization-wide access. Coordinator organization
-- members only get venue access when assigned here.

ALTER TABLE public.organization_member_invitations
  ADD COLUMN IF NOT EXISTS venue_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE TABLE IF NOT EXISTS public.venue_coordinator_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_coordinator_assignments_unique
    UNIQUE (organization_id, venue_id, user_id)
);

CREATE INDEX IF NOT EXISTS venue_coordinator_assignments_user_idx
  ON public.venue_coordinator_assignments (user_id, organization_id);

CREATE INDEX IF NOT EXISTS venue_coordinator_assignments_venue_idx
  ON public.venue_coordinator_assignments (venue_id);

CREATE OR REPLACE FUNCTION public.validate_venue_coordinator_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.venues v
    WHERE v.id = NEW.venue_id
      AND v.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Venue does not belong to this organization.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = NEW.organization_id
      AND om.user_id = NEW.user_id
      AND om.role = 'coordinator'
      AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active coordinators can be assigned to venues.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_venue_coordinator_assignment()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS venue_coordinator_assignments_validate
  ON public.venue_coordinator_assignments;

CREATE TRIGGER venue_coordinator_assignments_validate
  BEFORE INSERT OR UPDATE ON public.venue_coordinator_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_venue_coordinator_assignment();

ALTER TABLE public.venue_coordinator_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venue_coord_assignments.select.owner_or_self"
  ON public.venue_coordinator_assignments;
CREATE POLICY "venue_coord_assignments.select.owner_or_self"
  ON public.venue_coordinator_assignments FOR SELECT
  TO authenticated
  USING (
    public.is_org_owner(organization_id)
    OR public.is_admin()
    OR user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "venue_coord_assignments.insert.owner"
  ON public.venue_coordinator_assignments;
CREATE POLICY "venue_coord_assignments.insert.owner"
  ON public.venue_coordinator_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_owner(organization_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "venue_coord_assignments.delete.owner"
  ON public.venue_coordinator_assignments;
CREATE POLICY "venue_coord_assignments.delete.owner"
  ON public.venue_coordinator_assignments FOR DELETE
  TO authenticated
  USING (
    public.is_org_owner(organization_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "venue_coord_assignments.all.admin"
  ON public.venue_coordinator_assignments;
CREATE POLICY "venue_coord_assignments.all.admin"
  ON public.venue_coordinator_assignments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, DELETE ON public.venue_coordinator_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_coordinator_assignments TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.organization_member_invitations TO authenticated;

-- Existing accepted coordinators keep their current venue visibility until
-- owners narrow it in Staff Management.
INSERT INTO public.venue_coordinator_assignments (
  organization_id,
  venue_id,
  user_id,
  assigned_by
)
SELECT
  om.organization_id,
  v.id,
  om.user_id,
  om.invited_by
FROM public.organization_members om
JOIN public.venues v ON v.organization_id = om.organization_id
WHERE om.role = 'coordinator'
  AND om.status = 'active'
ON CONFLICT ON CONSTRAINT venue_coordinator_assignments_unique DO NOTHING;

UPDATE public.organization_member_invitations invitation
SET venue_ids = COALESCE(
  (
    SELECT array_agg(v.id)
    FROM public.venues v
    WHERE v.organization_id = invitation.organization_id
  ),
  '{}'::uuid[]
)
WHERE invitation.role = 'coordinator'
  AND invitation.status = 'pending'
  AND cardinality(invitation.venue_ids) = 0;

CREATE OR REPLACE FUNCTION public.is_org_member_for_venue(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venues v
    WHERE v.id = p_venue_id
      AND (
        public.is_admin()
        OR public.is_org_owner(v.organization_id)
        OR EXISTS (
          SELECT 1
          FROM public.organization_members om
          WHERE om.organization_id = v.organization_id
            AND om.user_id = auth.uid()
            AND om.status = 'active'
            AND (
              om.role <> 'coordinator'
              OR EXISTS (
                SELECT 1
                FROM public.venue_coordinator_assignments vca
                WHERE vca.organization_id = v.organization_id
                  AND vca.venue_id = v.id
                  AND vca.user_id = om.user_id
              )
            )
        )
      )
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

  INSERT INTO public.venue_coordinator_assignments (
    organization_id,
    venue_id,
    user_id,
    assigned_by
  )
  SELECT
    v_invitation.organization_id,
    venue_id,
    v_user_id,
    v_invitation.invited_by
  FROM unnest(v_invitation.venue_ids) AS venue_id
  ON CONFLICT ON CONSTRAINT venue_coordinator_assignments_unique DO NOTHING;

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

NOTIFY pgrst, 'reload schema';

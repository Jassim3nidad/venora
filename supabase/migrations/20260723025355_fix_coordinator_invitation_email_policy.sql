-- Fix coordinator invitation pending-email lookup policy.
-- The previous policy queried auth.users directly inside the RLS expression,
-- which runs as the authenticated role and can raise:
-- "permission denied for table users".

CREATE OR REPLACE FUNCTION public.current_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public, pg_catalog
AS $$
  SELECT lower(u.email)
  FROM auth.users u
  WHERE u.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_auth_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_auth_email() TO authenticated;

DROP POLICY IF EXISTS "org_member_invites.select.pending_by_email"
  ON public.organization_member_invitations;

CREATE POLICY "org_member_invites.select.pending_by_email"
  ON public.organization_member_invitations FOR SELECT
  TO authenticated
  USING (
    status = 'pending'
    AND email = public.current_auth_email()
  );

COMMENT ON FUNCTION public.current_auth_email() IS
  'Returns the signed-in user email for invitation RLS without exposing auth.users directly to authenticated queries.';

-- Keep application routing in sync with accepted coordinator memberships.
-- Some invitation RPC versions add the organization member but leave an
-- existing one-role account as "customer", which blocks /dashboard/coordinator.
CREATE OR REPLACE FUNCTION public.sync_coordinator_user_role_from_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  IF NEW.role = 'coordinator'::public.org_member_role
     AND NEW.status = 'active'::public.org_member_status THEN
    PERFORM set_config('app.accepting_org_invitation', 'on', true);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'event_coordinator'::public.user_role)
    ON CONFLICT ON CONSTRAINT user_roles_one_role_per_user DO UPDATE
      SET role = EXCLUDED.role;

    PERFORM set_config('app.accepting_org_invitation', 'off', true);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_coordinator_user_role_from_membership()
  FROM PUBLIC;

DROP TRIGGER IF EXISTS sync_coordinator_user_role_from_membership
  ON public.organization_members;

CREATE TRIGGER sync_coordinator_user_role_from_membership
  AFTER INSERT OR UPDATE OF role, status
  ON public.organization_members
  FOR EACH ROW
  WHEN (
    NEW.role = 'coordinator'::public.org_member_role
    AND NEW.status = 'active'::public.org_member_status
  )
  EXECUTE FUNCTION public.sync_coordinator_user_role_from_membership();

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT member.user_id, 'event_coordinator'::public.user_role
FROM public.organization_members member
WHERE member.role = 'coordinator'::public.org_member_role
  AND member.status = 'active'::public.org_member_status
ON CONFLICT ON CONSTRAINT user_roles_one_role_per_user DO UPDATE
  SET role = EXCLUDED.role;

COMMENT ON FUNCTION public.sync_coordinator_user_role_from_membership() IS
  'Promotes accepted coordinator organization members to the event_coordinator app role for dashboard routing.';

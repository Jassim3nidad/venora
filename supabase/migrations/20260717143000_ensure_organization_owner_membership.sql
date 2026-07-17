-- Keep organization owners represented as active organization members.
-- Venue-media Storage policies intentionally remain unchanged: migration 0711
-- already binds writes to {organization_id}/{venue_id} and active membership.

CREATE OR REPLACE FUNCTION public.add_organization_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    status
  )
  VALUES (
    NEW.id,
    NEW.owner_id,
    'owner',
    'active'
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = 'owner',
        status = 'active',
        suspended_at = NULL,
        revoked_at = NULL;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.add_organization_owner_membership()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS organizations_add_owner_membership
  ON public.organizations;

CREATE TRIGGER organizations_add_owner_membership
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.add_organization_owner_membership();

INSERT INTO public.organization_members (
  organization_id,
  user_id,
  role,
  status
)
SELECT
  organization.id,
  organization.owner_id,
  'owner'::public.org_member_role,
  'active'::public.org_member_status
FROM public.organizations AS organization
ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = 'owner',
      status = 'active',
      suspended_at = NULL,
      revoked_at = NULL;

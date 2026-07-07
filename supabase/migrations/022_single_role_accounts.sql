-- ============================================================
-- Migration 022 - Single-role user accounts
-- ============================================================
-- Venora accounts now have exactly one public.user_role assignment.
-- Admin accounts are not created through public registration; they are
-- provisioned manually by an existing administrator or directly in the DB.

-- Keep the highest-privilege existing assignment for users that previously
-- held multiple roles, then enforce one row per user_id.
WITH ranked_roles AS (
  SELECT
    user_id,
    role,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY CASE role
        WHEN 'admin' THEN 1
        WHEN 'venue_owner' THEN 2
        WHEN 'event_coordinator' THEN 3
        WHEN 'supplier' THEN 4
        WHEN 'customer' THEN 5
        ELSE 99
      END
    ) AS role_rank
  FROM public.user_roles
)
DELETE FROM public.user_roles ur
USING ranked_roles rr
WHERE ur.user_id = rr.user_id
  AND ur.role = rr.role
  AND rr.role_rank > 1;

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_one_role_per_user;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_one_role_per_user UNIQUE (user_id);

COMMENT ON TABLE public.user_roles IS
  'One-to-one account role assignment. Each user can hold exactly one role.';

-- Public signup may request only non-admin account types. Invalid or missing
-- metadata falls back to customer.
CREATE OR REPLACE FUNCTION public.public_signup_role(raw_role text)
RETURNS public.user_role
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT CASE raw_role
    WHEN 'customer' THEN 'customer'::public.user_role
    WHEN 'venue_owner' THEN 'venue_owner'::public.user_role
    WHEN 'event_coordinator' THEN 'event_coordinator'::public.user_role
    WHEN 'supplier' THEN 'supplier'::public.user_role
    ELSE 'customer'::public.user_role
  END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    public.public_signup_role(NEW.raw_user_meta_data->>'role')
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "user_roles.all.admin" ON public.user_roles;

CREATE POLICY "user_roles.all.admin"
  ON public.user_roles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);

  IF auth.uid() IS NOT NULL AND target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot change their own role.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_role_change ON public.user_roles;

CREATE TRIGGER prevent_self_role_change
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

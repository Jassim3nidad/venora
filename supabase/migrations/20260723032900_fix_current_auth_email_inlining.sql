-- Fix current_auth_email security definer boundary.
-- Postgres can inline `LANGUAGE sql` functions into the outer query's execution plan,
-- causing SECURITY DEFINER to effectively be bypassed and raising:
-- "permission denied for table users" when called by the authenticated role.
-- Using LANGUAGE plpgsql prevents inlining and enforces the SECURITY DEFINER boundary.

CREATE OR REPLACE FUNCTION public.current_auth_email()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = auth, public, pg_catalog
AS $$
DECLARE
  _email text;
BEGIN
  SELECT lower(u.email) INTO _email
  FROM auth.users u
  WHERE u.id = auth.uid();
  
  RETURN _email;
END;
$$;

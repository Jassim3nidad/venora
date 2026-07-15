-- ============================================================
-- Migration 072 - Harden public auth role assignment
-- ============================================================
-- Public Supabase Auth signup can be called directly with the anon key, so
-- raw_user_meta_data must never grant trusted partner/admin roles. All public
-- signups become customers. Partner elevation remains the admin-approved
-- partner_applications -> admin_approve_partner_application() flow.

CREATE OR REPLACE FUNCTION public.public_signup_role(raw_role text)
RETURNS public.user_role
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT 'customer'::public.user_role;
$$;

COMMENT ON FUNCTION public.public_signup_role(text) IS
  'Public signup role resolver. Ignores client-supplied metadata and always returns customer; partner/admin roles must be granted by trusted admin workflows.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, public.public_signup_role(NEW.raw_user_meta_data->>'role'))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates profile and customer role for new auth.users rows. Does not trust raw_user_meta_data.role for privileged authorization.';

-- Keep app-level profile status aligned with Supabase Auth email confirmation.

CREATE OR REPLACE FUNCTION public.sync_profile_status_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at THEN
    UPDATE public.profiles
       SET status = 'active'
     WHERE id = NEW.id
       AND status = 'pending_verification';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_status_from_auth();

UPDATE public.profiles p
   SET status = 'active'
  FROM auth.users u
 WHERE p.id = u.id
   AND p.status = 'pending_verification'
   AND u.email_confirmed_at IS NOT NULL;

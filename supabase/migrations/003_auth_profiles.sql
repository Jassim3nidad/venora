-- ============================================================
-- Migration 003 — Identity & Access
-- (profiles, user_roles, organizations, organization_members)
-- ============================================================

-- ── Utility: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── profiles ─────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          uuid         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text         NOT NULL,
  avatar_url  text,
  phone       text,
  status      public.account_status NOT NULL DEFAULT 'pending_verification',
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE  public.profiles        IS 'App-level user profile. auth.users is the source of truth for credentials.';
COMMENT ON COLUMN public.profiles.status IS 'Account status of the user profile.';

-- ── user_roles ────────────────────────────────────────────────
CREATE TABLE public.user_roles (
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       public.user_role NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

COMMENT ON TABLE public.user_roles IS
  'Many-to-many: a user can hold multiple roles (e.g. customer + supplier).';

-- ── organizations ─────────────────────────────────────────────
CREATE TABLE public.organizations (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                 uuid        NOT NULL REFERENCES public.profiles(id),
  name                     text        NOT NULL,
  business_registration_no text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.organizations IS
  'A business entity: venue owner company, or multi-venue group.';

-- ── organization_members ──────────────────────────────────────
CREATE TABLE public.organization_members (
  organization_id uuid                   NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid                   NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  role            public.org_member_role NOT NULL DEFAULT 'staff',
  invited_at      timestamptz            NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

COMMENT ON TABLE public.organization_members IS
  'Staff / event coordinators attached to an organization.';

-- ── Auto-create profile & role on signup ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
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
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'customer'::public.user_role
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── RLS helper functions (SECURITY DEFINER) ──────────────────

CREATE OR REPLACE FUNCTION public.has_role(check_role public.user_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = check_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.has_role('admin');
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = org_id AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member_for_venue(p_venue_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = p_venue_id AND public.is_org_member(v.organization_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_booking_customer(p_booking_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = p_booking_id AND customer_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member_for_booking(p_booking_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = p_booking_id AND public.is_org_member_for_venue(b.venue_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_supplier_owner(p_supplier_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.supplier_profiles
    WHERE id = p_supplier_id AND profile_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE id = p_conversation_id AND user_id = auth.uid()
  );
END;
$$;

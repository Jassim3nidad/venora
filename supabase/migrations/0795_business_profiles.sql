-- ============================================================================
-- Migration 0795_business_profiles.sql
-- Description: Business Profile schema, publications, portfolio, and RLS.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.business_visibility_level AS ENUM ('exact', 'city_province', 'province', 'hidden');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.business_publication_status AS ENUM ('incomplete', 'draft', 'published', 'changes_pending', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. business_profile_publications (Needs to exist first for FK)
CREATE TABLE public.business_profile_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid NOT NULL, -- FK added later
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  moderation_status text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz
);

-- 2. business_profiles
CREATE TABLE public.business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  legal_name text,
  tagline text,
  short_description text,
  about text,
  primary_category text,
  year_established integer,
  logo_path text,
  cover_image_path text,
  city text,
  province text,
  country_code text,
  private_address text,
  address_visibility public.business_visibility_level NOT NULL DEFAULT 'hidden',
  public_email text,
  email_visibility boolean NOT NULL DEFAULT false,
  public_phone text,
  phone_visibility boolean NOT NULL DEFAULT false,
  website_url text,
  publication_status public.business_publication_status NOT NULL DEFAULT 'incomplete',
  verification_status text NOT NULL DEFAULT 'unverified',
  current_publication_id uuid REFERENCES public.business_profile_publications(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add the missing FK for publications -> profiles
ALTER TABLE public.business_profile_publications
  ADD CONSTRAINT fk_publication_business_profile
  FOREIGN KEY (business_profile_id) REFERENCES public.business_profiles(id) ON DELETE CASCADE;

CREATE TRIGGER business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. business_profile_venues
CREATE TABLE public.business_profile_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  is_featured boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_profile_id, venue_id)
);

CREATE TRIGGER business_profile_venues_updated_at
  BEFORE UPDATE ON public.business_profile_venues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. business_portfolio_items
CREATE TABLE public.business_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type text,
  description text,
  event_year integer,
  cover_image_path text,
  associated_venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  is_featured boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER business_portfolio_items_updated_at
  BEFORE UPDATE ON public.business_portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. business_team_members
CREATE TABLE public.business_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  position text,
  biography text,
  photo_path text,
  associated_venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  years_of_experience integer,
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER business_team_members_updated_at
  BEFORE UPDATE ON public.business_team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. business_social_links
CREATE TABLE public.business_social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  url text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER business_social_links_updated_at
  BEFORE UPDATE ON public.business_social_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. business_profile_policies
CREATE TABLE public.business_profile_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  policy_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER business_profile_policies_updated_at
  BEFORE UPDATE ON public.business_profile_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Function to check if a user can manage a business profile
CREATE OR REPLACE FUNCTION public.can_manage_business_profile(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = p_id AND public.is_org_member(bp.organization_id)
  ) OR public.is_admin();
$$;

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profile_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profile_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profile_policies ENABLE ROW LEVEL SECURITY;

-- business_profiles
CREATE POLICY "business_profiles.select.owner" ON public.business_profiles FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.is_admin());
CREATE POLICY "business_profiles.insert.owner" ON public.business_profiles FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) OR public.is_admin());
CREATE POLICY "business_profiles.update.owner" ON public.business_profiles FOR UPDATE TO authenticated USING (public.is_org_member(organization_id) OR public.is_admin());
CREATE POLICY "business_profiles.delete.owner" ON public.business_profiles FOR DELETE TO authenticated USING (public.is_org_member(organization_id) OR public.is_admin());

-- business_profile_publications (Publicly readable)
CREATE POLICY "business_profile_publications.select.public" ON public.business_profile_publications FOR SELECT USING (true);
CREATE POLICY "business_profile_publications.insert.owner" ON public.business_profile_publications FOR INSERT TO authenticated WITH CHECK (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_profile_publications.update.admin" ON public.business_profile_publications FOR UPDATE TO authenticated USING (public.is_admin());

-- other dependent tables
CREATE POLICY "business_profile_venues.select.owner" ON public.business_profile_venues FOR SELECT TO authenticated USING (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_profile_venues.insert.owner" ON public.business_profile_venues FOR INSERT TO authenticated WITH CHECK (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_profile_venues.update.owner" ON public.business_profile_venues FOR UPDATE TO authenticated USING (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_profile_venues.delete.owner" ON public.business_profile_venues FOR DELETE TO authenticated USING (public.can_manage_business_profile(business_profile_id));

CREATE POLICY "business_portfolio_items.select.owner" ON public.business_portfolio_items FOR SELECT TO authenticated USING (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_portfolio_items.insert.owner" ON public.business_portfolio_items FOR INSERT TO authenticated WITH CHECK (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_portfolio_items.update.owner" ON public.business_portfolio_items FOR UPDATE TO authenticated USING (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_portfolio_items.delete.owner" ON public.business_portfolio_items FOR DELETE TO authenticated USING (public.can_manage_business_profile(business_profile_id));

CREATE POLICY "business_team_members.select.owner" ON public.business_team_members FOR SELECT TO authenticated USING (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_team_members.insert.owner" ON public.business_team_members FOR INSERT TO authenticated WITH CHECK (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_team_members.update.owner" ON public.business_team_members FOR UPDATE TO authenticated USING (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_team_members.delete.owner" ON public.business_team_members FOR DELETE TO authenticated USING (public.can_manage_business_profile(business_profile_id));

CREATE POLICY "business_social_links.select.owner" ON public.business_social_links FOR SELECT TO authenticated USING (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_social_links.insert.owner" ON public.business_social_links FOR INSERT TO authenticated WITH CHECK (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_social_links.update.owner" ON public.business_social_links FOR UPDATE TO authenticated USING (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_social_links.delete.owner" ON public.business_social_links FOR DELETE TO authenticated USING (public.can_manage_business_profile(business_profile_id));

CREATE POLICY "business_profile_policies.select.owner" ON public.business_profile_policies FOR SELECT TO authenticated USING (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_profile_policies.insert.owner" ON public.business_profile_policies FOR INSERT TO authenticated WITH CHECK (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_profile_policies.update.owner" ON public.business_profile_policies FOR UPDATE TO authenticated USING (public.can_manage_business_profile(business_profile_id));
CREATE POLICY "business_profile_policies.delete.owner" ON public.business_profile_policies FOR DELETE TO authenticated USING (public.can_manage_business_profile(business_profile_id));

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-profiles',
  'business-profiles',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public reads, Org Member writes (first folder is organization_id)
CREATE POLICY "business-profiles.select.public" ON storage.objects FOR SELECT USING (bucket_id = 'business-profiles');
CREATE POLICY "business-profiles.insert.owner" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business-profiles' AND (public.is_org_member((storage.foldername(name))[1]::uuid) OR public.is_admin()));
CREATE POLICY "business-profiles.update.owner" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'business-profiles' AND (public.is_org_member((storage.foldername(name))[1]::uuid) OR public.is_admin()));
CREATE POLICY "business-profiles.delete.owner" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'business-profiles' AND (public.is_org_member((storage.foldername(name))[1]::uuid) OR public.is_admin()));

-- Seed existing organizations into business_profiles
INSERT INTO public.business_profiles (organization_id, slug, display_name, legal_name, publication_status, verification_status)
SELECT
  o.id,
  o.slug,
  o.name,
  o.name,
  'incomplete',
  CASE WHEN (o.business_registration_no IS NOT NULL AND trim(o.business_registration_no) <> '') THEN 'verified' ELSE 'unverified' END
FROM public.organizations o
ON CONFLICT DO NOTHING;

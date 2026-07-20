-- Public venue owner profiles.
--
-- Organizations contain private ownership fields, so we do not make the
-- organizations table publicly readable. Public pages use these safe RPCs.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.owner_profile_slug_base(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    NULLIF(
      regexp_replace(
        regexp_replace(lower(trim(COALESCE(value, ''))), '[^a-z0-9]+', '-', 'g'),
        '(^-|-$)',
        '',
        'g'
      ),
      ''
    ),
    'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_organization_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix integer := 1;
BEGIN
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    base_slug := public.owner_profile_slug_base(NEW.name);
  ELSE
    base_slug := public.owner_profile_slug_base(NEW.slug);
  END IF;

  candidate := base_slug;
  WHILE EXISTS (
    SELECT 1
    FROM public.organizations AS organization
    WHERE organization.slug = candidate
      AND (NEW.id IS NULL OR organization.id <> NEW.id)
  ) LOOP
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

WITH organization_slugs AS (
  SELECT
    id,
    base_slug,
    row_number() OVER (PARTITION BY base_slug ORDER BY created_at, id) AS slug_index
  FROM (
    SELECT
      id,
      public.owner_profile_slug_base(name) AS base_slug,
      created_at
    FROM public.organizations
    WHERE slug IS NULL OR trim(slug) = ''
  ) AS base
)
UPDATE public.organizations AS organization
SET slug = CASE
  WHEN organization_slugs.slug_index = 1 THEN organization_slugs.base_slug
  ELSE organization_slugs.base_slug || '-' || organization_slugs.slug_index::text
END
FROM organization_slugs
WHERE organization.id = organization_slugs.id;

ALTER TABLE public.organizations
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_key
  ON public.organizations(slug);

DROP TRIGGER IF EXISTS organizations_ensure_slug ON public.organizations;
CREATE TRIGGER organizations_ensure_slug
  BEFORE INSERT OR UPDATE OF name, slug ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_organization_slug();

COMMENT ON COLUMN public.organizations.slug IS
  'Public URL slug used by /owners/[slug]. Organization rows remain private; public profile data is exposed through safe RPCs only.';

CREATE OR REPLACE FUNCTION public.get_public_owner_profile(p_slug text)
RETURNS TABLE (
  slug text,
  name text,
  created_at timestamptz,
  is_verified boolean,
  venue_count bigint,
  completed_booking_count bigint,
  avg_rating numeric,
  review_count bigint,
  service_area text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH owner_org AS (
    SELECT
      o.id,
      o.slug,
      o.name,
      o.created_at,
      (o.business_registration_no IS NOT NULL AND trim(o.business_registration_no) <> '') AS is_verified
    FROM public.organizations AS o
    WHERE o.slug = p_slug
      AND EXISTS (
        SELECT 1
        FROM public.venues AS v
        WHERE v.organization_id = o.id
          AND v.status = 'published'
      )
  ),
  owner_venues AS (
    SELECT v.*
    FROM public.venues AS v
    JOIN owner_org AS o ON o.id = v.organization_id
    WHERE v.status = 'published'
  ),
  venue_stats AS (
    SELECT
      COUNT(*)::bigint AS venue_count,
      CASE
        WHEN COALESCE(SUM(review_count), 0) > 0 THEN
          ROUND(
            (SUM((avg_rating::numeric) * review_count)::numeric / SUM(review_count)::numeric),
            2
          )
        ELSE 0
      END AS avg_rating,
      COALESCE(SUM(review_count), 0)::bigint AS review_count,
      string_agg(
        DISTINCT concat_ws(', ', NULLIF(city, ''), NULLIF(province, '')),
        ' | '
      ) AS service_area
    FROM owner_venues
  ),
  booking_stats AS (
    SELECT COUNT(DISTINCT b.id)::bigint AS completed_booking_count
    FROM owner_venues AS v
    JOIN public.bookings AS b
      ON b.venue_id = v.id
     AND b.status = 'completed'
  )
  SELECT
    o.slug,
    o.name,
    o.created_at,
    o.is_verified,
    vs.venue_count,
    bs.completed_booking_count,
    vs.avg_rating,
    vs.review_count,
    vs.service_area
  FROM owner_org AS o
  CROSS JOIN venue_stats AS vs
  CROSS JOIN booking_stats AS bs;
$$;

CREATE OR REPLACE FUNCTION public.get_public_owner_venues(p_slug text)
RETURNS TABLE (
  slug text,
  name text,
  description text,
  province text,
  city text,
  municipality text,
  capacity_min integer,
  capacity_max integer,
  base_price numeric,
  price_unit text,
  avg_rating numeric,
  review_count integer,
  featured_image_path text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    v.slug,
    v.name,
    v.description,
    v.province,
    v.city,
    v.municipality,
    v.capacity_min,
    v.capacity_max,
    v.base_price,
    v.price_unit::text,
    v.avg_rating,
    v.review_count,
    image.storage_path AS featured_image_path
  FROM public.organizations AS o
  JOIN public.venues AS v
    ON v.organization_id = o.id
   AND v.status = 'published'
  LEFT JOIN LATERAL (
    SELECT vi.storage_path
    FROM public.venue_images AS vi
    WHERE vi.venue_id = v.id
    ORDER BY vi.is_featured DESC, vi.display_order ASC, vi.created_at ASC
    LIMIT 1
  ) AS image ON true
  WHERE o.slug = p_slug
  ORDER BY v.is_featured DESC, v.review_count DESC, v.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_owner_profile_by_venue(p_venue_slug text)
RETURNS TABLE (
  slug text,
  name text,
  created_at timestamptz,
  is_verified boolean,
  venue_count bigint,
  completed_booking_count bigint,
  avg_rating numeric,
  review_count bigint,
  service_area text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT profile.*
  FROM public.venues AS v
  JOIN public.organizations AS o
    ON o.id = v.organization_id
  CROSS JOIN LATERAL public.get_public_owner_profile(o.slug) AS profile
  WHERE v.slug = p_venue_slug
    AND v.status = 'published'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_owner_reviews(
  p_slug text,
  p_limit integer DEFAULT 6
)
RETURNS TABLE (
  review_id uuid,
  venue_name text,
  venue_slug text,
  customer_name text,
  customer_avatar_url text,
  overall_rating smallint,
  comment text,
  owner_reply text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    r.id AS review_id,
    v.name AS venue_name,
    v.slug AS venue_slug,
    p.full_name AS customer_name,
    p.avatar_url AS customer_avatar_url,
    r.overall_rating,
    r.comment,
    r.owner_reply,
    r.created_at
  FROM public.organizations AS o
  JOIN public.venues AS v
    ON v.organization_id = o.id
   AND v.status = 'published'
  JOIN public.reviews AS r
    ON r.venue_id = v.id
   AND r.status = 'published'
  LEFT JOIN public.profiles AS p
    ON p.id = r.customer_id
  WHERE o.slug = p_slug
  ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 6), 1), 12);
$$;

REVOKE ALL ON FUNCTION public.get_public_owner_profile(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_owner_venues(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_owner_profile_by_venue(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_owner_reviews(text, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_owner_profile(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_owner_venues(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_owner_profile_by_venue(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_owner_reviews(text, integer) TO anon, authenticated;

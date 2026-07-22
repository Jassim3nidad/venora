-- Feed sanitized published business profile fields into the public owner
-- profile RPCs used by /owners/[slug]. Draft-only profile data remains private.

DROP FUNCTION IF EXISTS public.get_public_owner_profile_by_venue(text);
DROP FUNCTION IF EXISTS public.get_public_owner_profile(text);

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
  service_area text,
  display_name text,
  tagline text,
  short_description text,
  about text,
  year_established integer,
  logo_path text,
  cover_image_path text,
  city text,
  province text,
  country_code text,
  public_email text,
  public_phone text,
  website_url text,
  verification_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH owner_org AS (
    SELECT
      o.id,
      COALESCE(NULLIF(pub.snapshot ->> 'slug', ''), bp.slug, o.slug) AS public_slug,
      o.name,
      o.created_at,
      (o.business_registration_no IS NOT NULL AND trim(o.business_registration_no) <> '') AS is_verified,
      pub.snapshot
    FROM public.organizations AS o
    LEFT JOIN public.business_profiles AS bp
      ON bp.organization_id = o.id
    LEFT JOIN public.business_profile_publications AS pub
      ON pub.id = bp.current_publication_id
     AND bp.publication_status = 'published'
    WHERE (
        o.slug = p_slug
        OR (
          bp.publication_status = 'published'
          AND bp.slug = p_slug
        )
      )
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
    o.public_slug AS slug,
    o.name,
    o.created_at,
    o.is_verified,
    vs.venue_count,
    bs.completed_booking_count,
    vs.avg_rating,
    vs.review_count,
    vs.service_area,
    NULLIF(o.snapshot ->> 'displayName', '') AS display_name,
    NULLIF(o.snapshot ->> 'tagline', '') AS tagline,
    NULLIF(o.snapshot ->> 'shortDescription', '') AS short_description,
    NULLIF(o.snapshot ->> 'about', '') AS about,
    CASE
      WHEN (o.snapshot ->> 'yearEstablished') ~ '^[0-9]+$'
      THEN (o.snapshot ->> 'yearEstablished')::integer
      ELSE NULL
    END AS year_established,
    NULLIF(o.snapshot ->> 'logoPath', '') AS logo_path,
    NULLIF(o.snapshot ->> 'coverImagePath', '') AS cover_image_path,
    NULLIF(o.snapshot ->> 'city', '') AS city,
    NULLIF(o.snapshot ->> 'province', '') AS province,
    NULLIF(o.snapshot ->> 'countryCode', '') AS country_code,
    NULLIF(o.snapshot ->> 'publicEmail', '') AS public_email,
    NULLIF(o.snapshot ->> 'publicPhone', '') AS public_phone,
    NULLIF(o.snapshot ->> 'websiteUrl', '') AS website_url,
    NULLIF(o.snapshot ->> 'verificationStatus', '') AS verification_status
  FROM owner_org AS o
  CROSS JOIN venue_stats AS vs
  CROSS JOIN booking_stats AS bs
  LIMIT 1;
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
  service_area text,
  display_name text,
  tagline text,
  short_description text,
  about text,
  year_established integer,
  logo_path text,
  cover_image_path text,
  city text,
  province text,
  country_code text,
  public_email text,
  public_phone text,
  website_url text,
  verification_status text
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

REVOKE ALL ON FUNCTION public.get_public_owner_profile(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_owner_profile_by_venue(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_owner_profile(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_owner_profile_by_venue(text) TO anon, authenticated;

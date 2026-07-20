-- ============================================================
-- Fix: Smart Search Venues Location & Price Filtering
-- ============================================================
-- Allows location filters to match across province, city, and municipality
-- fields (handling cases where AI misclassifies a city as a province).
-- Also incorporates venue_packages pricing for max price filters.

CREATE OR REPLACE FUNCTION public.search_venues(
  query_embedding vector(1536) DEFAULT NULL,
  keyword text DEFAULT NULL,
  filter_province text DEFAULT NULL,
  filter_city text DEFAULT NULL,
  filter_municipality text DEFAULT NULL,
  filter_min_price numeric DEFAULT NULL,
  filter_max_price numeric DEFAULT NULL,
  filter_guests int DEFAULT NULL,
  filter_venue_types text[] DEFAULT NULL,
  filter_indoor_outdoor text DEFAULT NULL,
  filter_parking boolean DEFAULT NULL,
  filter_pet_friendly boolean DEFAULT NULL,
  filter_wheelchair_accessible boolean DEFAULT NULL,
  match_count int DEFAULT 24,
  sort_by text DEFAULT 'relevance'
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  city text,
  province text,
  municipality text,
  base_price numeric,
  capacity_min int,
  capacity_max int,
  indoor_outdoor text,
  parking_available boolean,
  pet_friendly boolean,
  wheelchair_accessible boolean,
  avg_rating numeric,
  similarity float,
  relevance_score float,
  categories text[],
  amenities text[],
  event_types text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH search_input AS (
    SELECT nullif(lower(unaccent(trim(coalesce(keyword, '')))), '') AS norm_keyword
  ),
  venue_rows AS (
    SELECT
      v.id,
      v.name,
      v.slug,
      v.city,
      v.province,
      v.municipality,
      v.base_price,
      v.capacity_min,
      v.capacity_max,
      v.indoor_outdoor::text AS indoor_outdoor,
      v.parking_available,
      v.pet_friendly,
      v.wheelchair_accessible,
      v.avg_rating,
      coalesce(cats.categories, '{}'::text[]) AS categories,
      coalesce(cats.category_slugs, '{}'::text[]) AS category_slugs,
      coalesce(amenities.amenities, '{}'::text[]) AS amenities,
      coalesce(events.event_types, '{}'::text[]) AS event_types,
      CASE
        WHEN query_embedding IS NULL OR ve.embedding IS NULL THEN 0::float
        ELSE (1 - (ve.embedding <=> query_embedding))::float
      END AS similarity,
      CASE
        WHEN si.norm_keyword IS NULL THEN 0::float
        WHEN lower(unaccent(v.name)) LIKE '%' || si.norm_keyword || '%' THEN 0.28
        WHEN lower(unaccent(coalesce(v.city, ''))) LIKE '%' || si.norm_keyword || '%' THEN 0.18
        WHEN lower(unaccent(coalesce(v.municipality, ''))) LIKE '%' || si.norm_keyword || '%' THEN 0.18
        WHEN lower(unaccent(coalesce(v.province, ''))) LIKE '%' || si.norm_keyword || '%' THEN 0.16
        WHEN lower(unaccent(array_to_string(coalesce(cats.categories, '{}'::text[]), ' '))) LIKE '%' || si.norm_keyword || '%' THEN 0.16
        WHEN lower(unaccent(array_to_string(coalesce(amenities.amenities, '{}'::text[]), ' '))) LIKE '%' || si.norm_keyword || '%' THEN 0.12
        WHEN lower(unaccent(coalesce(v.description, v.ai_generated_description, ''))) LIKE '%' || si.norm_keyword || '%' THEN 0.10
        ELSE 0::float
      END AS keyword_score
    FROM search_input si
    JOIN public.venues v ON true
    LEFT JOIN public.venue_embeddings ve ON ve.venue_id = v.id
    LEFT JOIN LATERAL (
      SELECT
        array_agg(DISTINCT vc.name ORDER BY vc.name) AS categories,
        array_agg(DISTINCT vc.slug ORDER BY vc.slug) AS category_slugs
      FROM public.venue_category_assignments vca
      JOIN public.venue_categories vc ON vc.id = vca.category_id
      WHERE vca.venue_id = v.id
    ) cats ON true
    LEFT JOIN LATERAL (
      SELECT array_agg(DISTINCT a.name ORDER BY a.name) AS amenities
      FROM public.venue_amenities va
      JOIN public.amenities a ON a.id = va.amenity_id
      WHERE va.venue_id = v.id
    ) amenities ON true
    LEFT JOIN LATERAL (
      SELECT array_agg(DISTINCT et.name ORDER BY et.name) AS event_types
      FROM public.venue_event_types vet
      JOIN public.event_types et ON et.id = vet.event_type_id
      WHERE vet.venue_id = v.id
    ) events ON true
    WHERE v.status = 'published'
      AND (
        filter_province IS NULL
        OR lower(unaccent(v.province)) = lower(unaccent(filter_province))
        OR lower(unaccent(v.city)) = lower(unaccent(filter_province))
        OR lower(unaccent(coalesce(v.municipality, ''))) = lower(unaccent(filter_province))
      )
      AND (
        filter_city IS NULL
        OR lower(unaccent(v.city)) = lower(unaccent(filter_city))
        OR lower(unaccent(v.province)) = lower(unaccent(filter_city))
        OR lower(unaccent(coalesce(v.municipality, ''))) = lower(unaccent(filter_city))
      )
      AND (
        filter_municipality IS NULL
        OR lower(unaccent(coalesce(v.municipality, ''))) = lower(unaccent(filter_municipality))
        OR lower(unaccent(v.province)) = lower(unaccent(filter_municipality))
        OR lower(unaccent(v.city)) = lower(unaccent(filter_municipality))
      )
      AND (filter_min_price IS NULL OR v.base_price >= filter_min_price)
      AND (
        filter_max_price IS NULL 
        OR v.base_price <= filter_max_price
        OR EXISTS (
          SELECT 1 
          FROM public.venue_packages vp 
          WHERE vp.venue_id = v.id 
            AND vp.is_active = true 
            AND vp.price <= filter_max_price
        )
      )
      AND (filter_guests IS NULL OR v.capacity_max >= filter_guests)
      AND (filter_parking IS NULL OR filter_parking = false OR v.parking_available)
      AND (filter_pet_friendly IS NULL OR filter_pet_friendly = false OR v.pet_friendly)
      AND (
        filter_wheelchair_accessible IS NULL
        OR filter_wheelchair_accessible = false
        OR v.wheelchair_accessible
      )
      AND (
        filter_indoor_outdoor IS NULL
        OR filter_indoor_outdoor = ''
        OR v.indoor_outdoor::text = filter_indoor_outdoor
        OR (
          filter_indoor_outdoor IN ('indoor', 'outdoor')
          AND v.indoor_outdoor = 'both'::public.indoor_outdoor
        )
      )
      AND (
        coalesce(array_length(filter_venue_types, 1), 0) = 0
        OR EXISTS (
          SELECT 1
          FROM unnest(filter_venue_types) requested(value)
          WHERE lower(unaccent(requested.value)) = ANY (
            SELECT lower(unaccent(item))
            FROM unnest(
              coalesce(cats.categories, '{}'::text[]) ||
              coalesce(cats.category_slugs, '{}'::text[]) ||
              ARRAY[v.name, coalesce(v.description, '')]
            ) item
          )
          OR lower(unaccent(array_to_string(coalesce(cats.categories, '{}'::text[]), ' '))) LIKE '%' || lower(unaccent(requested.value)) || '%'
          OR lower(unaccent(v.name)) LIKE '%' || lower(unaccent(requested.value)) || '%'
        )
      )
      AND (
        si.norm_keyword IS NULL
        OR query_embedding IS NOT NULL
        OR lower(unaccent(concat_ws(
          ' ',
          v.name,
          v.description,
          v.ai_generated_description,
          v.city,
          v.municipality,
          v.province,
          array_to_string(coalesce(cats.categories, '{}'::text[]), ' '),
          array_to_string(coalesce(amenities.amenities, '{}'::text[]), ' '),
          array_to_string(coalesce(events.event_types, '{}'::text[]), ' ')
        ))) LIKE '%' || si.norm_keyword || '%'
      )
  )
  SELECT
    venue_rows.id,
    venue_rows.name,
    venue_rows.slug,
    venue_rows.city,
    venue_rows.province,
    venue_rows.municipality,
    venue_rows.base_price,
    venue_rows.capacity_min,
    venue_rows.capacity_max,
    venue_rows.indoor_outdoor,
    venue_rows.parking_available,
    venue_rows.pet_friendly,
    venue_rows.wheelchair_accessible,
    venue_rows.avg_rating,
    venue_rows.similarity,
    (
      venue_rows.similarity +
      venue_rows.keyword_score +
      least(coalesce(venue_rows.avg_rating, 0)::float / 100, 0.05)
    )::float AS relevance_score,
    venue_rows.categories,
    venue_rows.amenities,
    venue_rows.event_types
  FROM venue_rows
  ORDER BY
    CASE WHEN sort_by = 'price_asc' THEN venue_rows.base_price END ASC NULLS LAST,
    CASE WHEN sort_by = 'price_desc' THEN venue_rows.base_price END DESC NULLS LAST,
    CASE WHEN sort_by = 'rating' THEN venue_rows.avg_rating END DESC NULLS LAST,
    CASE WHEN sort_by = 'capacity' THEN venue_rows.capacity_max END DESC NULLS LAST,
    relevance_score DESC,
    venue_rows.avg_rating DESC,
    venue_rows.name ASC
  LIMIT greatest(1, least(coalesce(match_count, 24), 50));
$$;

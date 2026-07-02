-- ============================================================
-- Migration 013 — Venue Creation Transaction
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_venue_transaction(
  p_organization_id uuid,
  p_name text,
  p_description text,
  p_province text,
  p_city text,
  p_address text,
  p_capacity_min int,
  p_capacity_max int,
  p_base_price numeric,
  p_price_unit public.price_unit,
  p_indoor_outdoor public.indoor_outdoor,
  p_air_conditioned boolean DEFAULT false,
  p_parking_available boolean DEFAULT false,
  p_overnight_accommodation boolean DEFAULT false,
  p_pet_friendly boolean DEFAULT false,
  p_wheelchair_accessible boolean DEFAULT false,
  p_has_pool boolean DEFAULT false,
  p_ceremony_venue boolean DEFAULT false,
  p_reception_venue boolean DEFAULT false,
  p_packages jsonb DEFAULT '[]'::jsonb, -- Array of package objects
  p_amenities text[] DEFAULT '{}'::text[], -- Array of amenity names
  p_simulate_error boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_venue_id uuid;
  v_venue_slug text;
  v_base_slug text;
  v_counter int := 1;
  v_package_item jsonb;
  v_amenity_name text;
  v_amenity_id uuid;
  v_result jsonb;
BEGIN
  -- 1. Authentication & Authorization check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: You must be logged in to create a venue';
  END IF;

  -- Verify organization exists and user is owner or member
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = p_organization_id
    AND (o.owner_id = auth.uid() OR public.is_org_member(p_organization_id))
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: You do not have permission to manage this organization';
  END IF;

  -- 2. Input validation
  IF p_name IS NULL OR length(trim(p_name)) < 3 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Venue name must be at least 3 characters';
  END IF;

  IF p_address IS NULL OR length(trim(p_address)) < 5 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Address is required';
  END IF;

  IF p_city IS NULL OR length(trim(p_city)) < 2 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: City is required';
  END IF;

  IF p_province IS NULL OR length(trim(p_province)) < 2 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Province is required';
  END IF;

  IF p_capacity_max IS NULL OR p_capacity_max < 1 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Max capacity must be at least 1';
  END IF;

  IF p_capacity_min IS NOT NULL AND p_capacity_max < p_capacity_min THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Max capacity must be greater than or equal to min capacity';
  END IF;

  IF p_base_price IS NULL OR p_base_price <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Base price must be greater than 0';
  END IF;

  -- Generate unique slug
  v_base_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9\s]+', '', 'g'));
  v_base_slug := regexp_replace(v_base_slug, '\s+', '-', 'g');
  v_venue_slug := v_base_slug;

  WHILE EXISTS (SELECT 1 FROM public.venues WHERE slug = v_venue_slug) LOOP
    v_venue_slug := v_base_slug || '-' || v_counter;
    v_counter := v_counter + 1;
  END LOOP;

  -- 3. Insert into public.venues
  INSERT INTO public.venues (
    organization_id,
    name,
    slug,
    description,
    province,
    city,
    address,
    capacity_min,
    capacity_max,
    base_price,
    price_unit,
    indoor_outdoor,
    air_conditioned,
    parking_available,
    overnight_accommodation,
    pet_friendly,
    wheelchair_accessible,
    has_pool,
    ceremony_venue,
    reception_venue,
    status
  )
  VALUES (
    p_organization_id,
    p_name,
    v_venue_slug,
    p_description,
    p_province,
    p_city,
    p_address,
    p_capacity_min,
    p_capacity_max,
    p_base_price,
    p_price_unit,
    p_indoor_outdoor,
    p_air_conditioned,
    p_parking_available,
    p_overnight_accommodation,
    p_pet_friendly,
    p_wheelchair_accessible,
    p_has_pool,
    p_ceremony_venue,
    p_reception_venue,
    'draft'
  )
  RETURNING id INTO v_venue_id;

  -- 4. Insert into public.venue_packages
  IF p_packages IS NOT NULL AND jsonb_array_length(p_packages) > 0 THEN
    FOR v_package_item IN SELECT * FROM jsonb_array_elements(p_packages) LOOP
      DECLARE
        v_inclusions text[] := '{}'::text[];
      BEGIN
        IF v_package_item ? 'inclusions' AND jsonb_typeof(v_package_item->'inclusions') = 'array' THEN
          SELECT COALESCE(ARRAY_AGG(val), '{}'::text[]) INTO v_inclusions 
          FROM (SELECT jsonb_array_elements_text(v_package_item->'inclusions') AS val) t;
        END IF;

        INSERT INTO public.venue_packages (
          venue_id,
          name,
          description,
          price,
          price_unit,
          min_guests,
          max_guests,
          inclusions,
          is_active
        )
        VALUES (
          v_venue_id,
          v_package_item->>'name',
          v_package_item->>'description',
          (v_package_item->>'price')::numeric,
          COALESCE((v_package_item->>'price_unit')::public.price_unit, 'per_event'::public.price_unit),
          (v_package_item->>'min_guests')::int,
          (v_package_item->>'max_guests')::int,
          v_inclusions,
          COALESCE((v_package_item->>'is_active')::boolean, true)
        );
      END;
    END LOOP;
  END IF;

  -- 5. Insert / Link Amenities
  IF p_amenities IS NOT NULL AND array_length(p_amenities, 1) > 0 THEN
    FOREACH v_amenity_name IN ARRAY p_amenities LOOP
      v_amenity_name := trim(v_amenity_name);
      IF length(v_amenity_name) > 0 THEN
        INSERT INTO public.amenities (name)
        VALUES (v_amenity_name)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_amenity_id;

        INSERT INTO public.venue_amenities (venue_id, amenity_id)
        VALUES (v_venue_id, v_amenity_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- 6. Intentional Error simulation
  IF p_simulate_error THEN
    RAISE EXCEPTION 'INTENTIONAL_ERROR: Simulating transaction rollback as requested';
  END IF;

  v_result := jsonb_build_object(
    'venue_id', v_venue_id,
    'slug', v_venue_slug,
    'name', p_name,
    'packages_inserted', jsonb_array_length(p_packages),
    'amenities_inserted', array_length(p_amenities, 1)
  );

  RETURN v_result;
END;
$$;

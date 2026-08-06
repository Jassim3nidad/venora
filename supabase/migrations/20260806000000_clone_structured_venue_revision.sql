-- Migration: clone_structured_venue_revision
-- Description: RPC to clone an existing published revision into a new draft revision

CREATE OR REPLACE FUNCTION public.clone_structured_venue_revision(
  p_venue_id uuid,
  p_source_revision_id uuid,
  p_new_revision_number integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_revision_id uuid;
  v_space_map jsonb := '{}'::jsonb;
  v_collection_map jsonb := '{}'::jsonb;
  v_new_space_id uuid;
  v_new_col_id uuid;
  v_space record;
  v_col record;
BEGIN
  -- 1. Create the new revision
  INSERT INTO venue_profile_revisions (
    venue_id, status, revision_number, created_from_revision_id
  ) VALUES (
    p_venue_id, 'draft', p_new_revision_number, p_source_revision_id
  ) RETURNING id INTO v_new_revision_id;

  -- 2. Clone Spaces
  FOR v_space IN 
    SELECT * FROM venue_spaces WHERE revision_id = p_source_revision_id AND venue_id = p_venue_id AND status != 'archived'
  LOOP
    INSERT INTO venue_spaces (
      revision_id, venue_id, name, slug, space_type, setting, short_description,
      description, capacity_min, capacity_max, accessibility_summary,
      restrictions, operating_notes, display_order, status
    ) VALUES (
      v_new_revision_id, p_venue_id, v_space.name, v_space.slug, v_space.space_type, v_space.setting, v_space.short_description,
      v_space.description, v_space.capacity_min, v_space.capacity_max, v_space.accessibility_summary,
      v_space.restrictions, v_space.operating_notes, v_space.display_order, 'draft'
    ) RETURNING id INTO v_new_space_id;
    
    v_space_map := jsonb_set(v_space_map, ARRAY[v_space.id::text], to_jsonb(v_new_space_id::text));

    -- Clone capacity layouts for this space
    INSERT INTO venue_space_capacity_layouts (
      space_id, venue_id, layout, custom_layout_label, capacity, notes, display_order
    )
    SELECT
      v_new_space_id, p_venue_id, layout, custom_layout_label, capacity, notes, display_order
    FROM venue_space_capacity_layouts
    WHERE space_id = v_space.id;

    -- Clone amenities for this space
    INSERT INTO venue_space_amenities (
      space_id, amenity_id, notes
    )
    SELECT
      v_new_space_id, amenity_id, notes
    FROM venue_space_amenities
    WHERE space_id = v_space.id;

    -- Clone event types for this space
    INSERT INTO venue_space_event_types (
      space_id, event_type_id, notes
    )
    SELECT
      v_new_space_id, event_type_id, notes
    FROM venue_space_event_types
    WHERE space_id = v_space.id;

    -- Clone package venue spaces for this space
    INSERT INTO package_venue_spaces (
      package_id, space_id, venue_id, inclusion_type, inclusion_notes, display_order
    )
    SELECT
      package_id, v_new_space_id, p_venue_id, inclusion_type, inclusion_notes, display_order
    FROM package_venue_spaces
    WHERE space_id = v_space.id;
  END LOOP;

  -- 3. Clone Media Collections
  FOR v_col IN 
    SELECT * FROM venue_media_collections WHERE revision_id = p_source_revision_id AND venue_id = p_venue_id AND status != 'archived'
  LOOP
    v_new_space_id := NULL;
    IF v_col.space_id IS NOT NULL THEN
      v_new_space_id := (v_space_map->>(v_col.space_id::text))::uuid;
    END IF;

    INSERT INTO venue_media_collections (
      revision_id, venue_id, space_id, collection_type, title, description, display_order, is_cover, status
    ) VALUES (
      v_new_revision_id, p_venue_id, v_new_space_id, v_col.collection_type, v_col.title, v_col.description, v_col.display_order, v_col.is_cover, 'draft'
    ) RETURNING id INTO v_new_col_id;

    v_collection_map := jsonb_set(v_collection_map, ARRAY[v_col.id::text], to_jsonb(v_new_col_id::text));

    -- Clone media items for this collection
    INSERT INTO venue_media_items (
      collection_id, venue_id, space_id, storage_path, legacy_venue_image_id, media_type, mime_type, alt_text, caption, transcript, width, height, duration_seconds, display_order, is_featured, status, moderation_status
    )
    SELECT
      v_new_col_id, p_venue_id, v_new_space_id, storage_path, legacy_venue_image_id, media_type, mime_type, alt_text, caption, transcript, width, height, duration_seconds, display_order, is_featured, 'draft', moderation_status
    FROM venue_media_items
    WHERE collection_id = v_col.id AND status != 'archived' AND deleted_at IS NULL;
  END LOOP;

  -- 4. Clone Logistics
  INSERT INTO venue_logistics (
    revision_id, venue_id, prep_time_hours, cleanup_time_hours, curfew_time, parking_capacity,
    parking_type, parking_notes, catering_policy, outside_catering_allowed, 
    preferred_caterers_only, catering_notes, alcohol_policy, alcohol_notes,
    noise_restrictions, sound_system_included, music_end_time, security_required,
    security_notes, insurance_required, minimum_age, pet_policy, status
  )
  SELECT
    v_new_revision_id, p_venue_id, prep_time_hours, cleanup_time_hours, curfew_time, parking_capacity,
    parking_type, parking_notes, catering_policy, outside_catering_allowed, 
    preferred_caterers_only, catering_notes, alcohol_policy, alcohol_notes,
    noise_restrictions, sound_system_included, music_end_time, security_required,
    security_notes, insurance_required, minimum_age, pet_policy, 'draft'
  FROM venue_logistics
  WHERE revision_id = p_source_revision_id AND venue_id = p_venue_id;

  -- 5. Clone FAQs
  INSERT INTO venue_faqs (
    revision_id, venue_id, category, question, answer, display_order, status
  )
  SELECT
    v_new_revision_id, p_venue_id, category, question, answer, display_order, 'draft'
  FROM venue_faqs
  WHERE revision_id = p_source_revision_id AND venue_id = p_venue_id AND status != 'archived';

  RETURN v_new_revision_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clone_structured_venue_revision(uuid, uuid, integer) TO authenticated;

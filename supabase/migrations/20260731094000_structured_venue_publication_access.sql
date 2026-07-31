-- Structured venue foundation: public reads for published revisions only.

CREATE POLICY venue_profile_revisions_public_read
  ON public.venue_profile_revisions
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY venue_spaces_public_read
  ON public.venue_spaces
  FOR SELECT
  TO anon, authenticated
  USING (
    venue_spaces.status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.venue_profile_revisions published_revision
      WHERE published_revision.id = venue_spaces.revision_id
        AND published_revision.venue_id = venue_spaces.venue_id
        AND published_revision.status = 'published'
    )
  );

CREATE POLICY venue_space_capacity_layouts_public_read
  ON public.venue_space_capacity_layouts
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_spaces published_space
      JOIN public.venue_profile_revisions published_revision
        ON published_revision.id = published_space.revision_id
       AND published_revision.venue_id = published_space.venue_id
      WHERE published_space.id = venue_space_capacity_layouts.space_id
        AND published_space.status = 'published'
        AND published_revision.status = 'published'
    )
  );

CREATE POLICY venue_space_amenities_public_read
  ON public.venue_space_amenities
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_spaces published_space
      JOIN public.venue_profile_revisions published_revision
        ON published_revision.id = published_space.revision_id
       AND published_revision.venue_id = published_space.venue_id
      WHERE published_space.id = venue_space_amenities.space_id
        AND published_space.status = 'published'
        AND published_revision.status = 'published'
    )
  );

CREATE POLICY venue_space_event_types_public_read
  ON public.venue_space_event_types
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_spaces published_space
      JOIN public.venue_profile_revisions published_revision
        ON published_revision.id = published_space.revision_id
       AND published_revision.venue_id = published_space.venue_id
      WHERE published_space.id = venue_space_event_types.space_id
        AND published_space.status = 'published'
        AND published_revision.status = 'published'
    )
  );

CREATE POLICY venue_media_collections_public_read
  ON public.venue_media_collections
  FOR SELECT
  TO anon, authenticated
  USING (
    venue_media_collections.status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.venue_profile_revisions published_revision
      WHERE published_revision.id = venue_media_collections.revision_id
        AND published_revision.venue_id = venue_media_collections.venue_id
        AND published_revision.status = 'published'
    )
  );

CREATE POLICY venue_media_items_public_read
  ON public.venue_media_items
  FOR SELECT
  TO anon, authenticated
  USING (
    venue_media_items.status = 'published'
    AND venue_media_items.deleted_at IS NULL
    AND venue_media_items.moderation_status = 'approved'
    AND EXISTS (
      SELECT 1
      FROM public.venue_media_collections collection
      JOIN public.venue_profile_revisions published_revision
        ON published_revision.id = collection.revision_id
       AND published_revision.venue_id = collection.venue_id
      WHERE collection.id = venue_media_items.collection_id
        AND collection.venue_id = venue_media_items.venue_id
        AND collection.status = 'published'
        AND published_revision.status = 'published'
    )
  );

CREATE POLICY venue_logistics_public_read
  ON public.venue_logistics
  FOR SELECT
  TO anon, authenticated
  USING (
    venue_logistics.status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.venue_profile_revisions published_revision
      WHERE published_revision.id = venue_logistics.revision_id
        AND published_revision.venue_id = venue_logistics.venue_id
        AND published_revision.status = 'published'
    )
  );

CREATE POLICY venue_faqs_public_read
  ON public.venue_faqs
  FOR SELECT
  TO anon, authenticated
  USING (
    venue_faqs.status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.venue_profile_revisions published_revision
      WHERE published_revision.id = venue_faqs.revision_id
        AND published_revision.venue_id = venue_faqs.venue_id
        AND published_revision.status = 'published'
    )
  );

-- Structured venue foundation: draft write access for owners and assigned coordinators.

CREATE OR REPLACE FUNCTION public.can_manage_venue_structured_content(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venues venue
    WHERE venue.id = p_venue_id
      AND (
        public.is_admin()
        OR public.is_org_owner(venue.organization_id)
        OR EXISTS (
          SELECT 1
          FROM public.organization_members member
          JOIN public.venue_coordinator_assignments assignment
            ON assignment.organization_id = member.organization_id
           AND assignment.venue_id = venue.id
           AND assignment.user_id = member.user_id
          WHERE member.organization_id = venue.organization_id
            AND member.user_id = auth.uid()
            AND member.role = 'coordinator'
            AND member.status = 'active'
            AND 'manage_assigned_venue_listings' = ANY(member.permissions)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_preview_venue_structured_content(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venues venue
    WHERE venue.id = p_venue_id
      AND (
        public.is_admin()
        OR public.is_org_owner(venue.organization_id)
        OR EXISTS (
          SELECT 1
          FROM public.organization_members member
          JOIN public.venue_coordinator_assignments assignment
            ON assignment.organization_id = member.organization_id
           AND assignment.venue_id = venue.id
           AND assignment.user_id = member.user_id
          WHERE member.organization_id = venue.organization_id
            AND member.user_id = auth.uid()
            AND member.role = 'coordinator'
            AND member.status = 'active'
            AND (
              'view_assigned_venues' = ANY(member.permissions)
              OR 'manage_assigned_venue_listings' = ANY(member.permissions)
            )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_publish_venue_structured_content(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venues venue
    WHERE venue.id = p_venue_id
      AND (
        public.is_admin()
        OR public.is_org_owner(venue.organization_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.structured_revision_allows_draft_write(
  p_revision_id uuid,
  p_venue_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venue_profile_revisions revision
    WHERE revision.id = p_revision_id
      AND revision.venue_id = p_venue_id
      AND revision.status = 'draft'
      AND public.can_manage_venue_structured_content(revision.venue_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.structured_revision_allows_publish(
  p_revision_id uuid,
  p_venue_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venue_profile_revisions revision
    WHERE revision.id = p_revision_id
      AND revision.venue_id = p_venue_id
      AND revision.status = 'published'
      AND public.can_publish_venue_structured_content(revision.venue_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.structured_space_allows_draft_write(p_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venue_spaces space
    JOIN public.venue_profile_revisions revision
      ON revision.id = space.revision_id
     AND revision.venue_id = space.venue_id
    WHERE space.id = p_space_id
      AND space.status = 'draft'
      AND revision.status = 'draft'
      AND public.can_manage_venue_structured_content(space.venue_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.structured_space_allows_preview(p_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venue_spaces space
    WHERE space.id = p_space_id
      AND public.can_preview_venue_structured_content(space.venue_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.structured_media_collection_allows_draft_write(
  p_collection_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venue_media_collections collection
    JOIN public.venue_profile_revisions revision
      ON revision.id = collection.revision_id
     AND revision.venue_id = collection.venue_id
    WHERE collection.id = p_collection_id
      AND collection.status = 'draft'
      AND revision.status = 'draft'
      AND public.can_manage_venue_structured_content(collection.venue_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.structured_media_collection_allows_preview(
  p_collection_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venue_media_collections collection
    WHERE collection.id = p_collection_id
      AND public.can_preview_venue_structured_content(collection.venue_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.structured_media_path_belongs_to_venue(
  p_venue_id uuid,
  p_storage_path text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venues venue
    WHERE venue.id = p_venue_id
      AND p_storage_path LIKE venue.organization_id::text || '/' || p_venue_id::text || '/%'
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_venue_structured_content(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_preview_venue_structured_content(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_publish_venue_structured_content(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.structured_revision_allows_draft_write(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.structured_revision_allows_publish(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.structured_space_allows_draft_write(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.structured_space_allows_preview(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.structured_media_collection_allows_draft_write(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.structured_media_collection_allows_preview(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.structured_media_path_belongs_to_venue(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_manage_venue_structured_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_preview_venue_structured_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_publish_venue_structured_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.structured_revision_allows_draft_write(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.structured_revision_allows_publish(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.structured_space_allows_draft_write(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.structured_space_allows_preview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.structured_media_collection_allows_draft_write(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.structured_media_collection_allows_preview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.structured_media_path_belongs_to_venue(uuid, text) TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.venue_profile_revisions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_spaces TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_space_capacity_layouts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_space_amenities TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_space_event_types TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_media_collections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_media_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_logistics TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_faqs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.package_venue_spaces TO authenticated;

CREATE POLICY venue_profile_revisions_manager_preview
  ON public.venue_profile_revisions
  FOR SELECT
  TO authenticated
  USING (public.can_preview_venue_structured_content(venue_id));

CREATE POLICY venue_profile_revisions_manager_insert
  ON public.venue_profile_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'draft'
    AND public.can_manage_venue_structured_content(venue_id)
  );

CREATE POLICY venue_profile_revisions_manager_update
  ON public.venue_profile_revisions
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_venue_structured_content(venue_id)
    OR public.can_publish_venue_structured_content(venue_id)
  )
  WITH CHECK (
    (
      status IN ('draft', 'archived')
      AND public.can_manage_venue_structured_content(venue_id)
    )
    OR (
      status = 'published'
      AND public.can_publish_venue_structured_content(venue_id)
    )
  );

CREATE POLICY venue_profile_revisions_manager_delete
  ON public.venue_profile_revisions
  FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND public.can_manage_venue_structured_content(venue_id)
  );

CREATE POLICY venue_spaces_manager_preview
  ON public.venue_spaces
  FOR SELECT
  TO authenticated
  USING (public.can_preview_venue_structured_content(venue_id));

CREATE POLICY venue_spaces_manager_insert
  ON public.venue_spaces
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'draft'
    AND public.structured_revision_allows_draft_write(revision_id, venue_id)
  );

CREATE POLICY venue_spaces_manager_update
  ON public.venue_spaces
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_venue_structured_content(venue_id)
    OR public.can_publish_venue_structured_content(venue_id)
  )
  WITH CHECK (
    (
      status IN ('draft', 'archived')
      AND public.structured_revision_allows_draft_write(revision_id, venue_id)
    )
    OR (
      status = 'published'
      AND public.structured_revision_allows_publish(revision_id, venue_id)
    )
  );

CREATE POLICY venue_spaces_manager_delete
  ON public.venue_spaces
  FOR DELETE
  TO authenticated
  USING (public.structured_space_allows_draft_write(id));

CREATE POLICY venue_space_capacity_layouts_manager_preview
  ON public.venue_space_capacity_layouts
  FOR SELECT
  TO authenticated
  USING (public.structured_space_allows_preview(space_id));

CREATE POLICY venue_space_capacity_layouts_manager_insert
  ON public.venue_space_capacity_layouts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.structured_space_allows_draft_write(space_id));

CREATE POLICY venue_space_capacity_layouts_manager_update
  ON public.venue_space_capacity_layouts
  FOR UPDATE
  TO authenticated
  USING (public.structured_space_allows_draft_write(space_id))
  WITH CHECK (public.structured_space_allows_draft_write(space_id));

CREATE POLICY venue_space_capacity_layouts_manager_delete
  ON public.venue_space_capacity_layouts
  FOR DELETE
  TO authenticated
  USING (public.structured_space_allows_draft_write(space_id));

CREATE POLICY venue_space_amenities_manager_preview
  ON public.venue_space_amenities
  FOR SELECT
  TO authenticated
  USING (public.structured_space_allows_preview(space_id));

CREATE POLICY venue_space_amenities_manager_insert
  ON public.venue_space_amenities
  FOR INSERT
  TO authenticated
  WITH CHECK (public.structured_space_allows_draft_write(space_id));

CREATE POLICY venue_space_amenities_manager_update
  ON public.venue_space_amenities
  FOR UPDATE
  TO authenticated
  USING (public.structured_space_allows_draft_write(space_id))
  WITH CHECK (public.structured_space_allows_draft_write(space_id));

CREATE POLICY venue_space_amenities_manager_delete
  ON public.venue_space_amenities
  FOR DELETE
  TO authenticated
  USING (public.structured_space_allows_draft_write(space_id));

CREATE POLICY venue_space_event_types_manager_preview
  ON public.venue_space_event_types
  FOR SELECT
  TO authenticated
  USING (public.structured_space_allows_preview(space_id));

CREATE POLICY venue_space_event_types_manager_insert
  ON public.venue_space_event_types
  FOR INSERT
  TO authenticated
  WITH CHECK (public.structured_space_allows_draft_write(space_id));

CREATE POLICY venue_space_event_types_manager_update
  ON public.venue_space_event_types
  FOR UPDATE
  TO authenticated
  USING (public.structured_space_allows_draft_write(space_id))
  WITH CHECK (public.structured_space_allows_draft_write(space_id));

CREATE POLICY venue_space_event_types_manager_delete
  ON public.venue_space_event_types
  FOR DELETE
  TO authenticated
  USING (public.structured_space_allows_draft_write(space_id));

CREATE POLICY venue_media_collections_manager_preview
  ON public.venue_media_collections
  FOR SELECT
  TO authenticated
  USING (public.can_preview_venue_structured_content(venue_id));

CREATE POLICY venue_media_collections_manager_insert
  ON public.venue_media_collections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'draft'
    AND public.structured_revision_allows_draft_write(revision_id, venue_id)
  );

CREATE POLICY venue_media_collections_manager_update
  ON public.venue_media_collections
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_venue_structured_content(venue_id)
    OR public.can_publish_venue_structured_content(venue_id)
  )
  WITH CHECK (
    (
      status IN ('draft', 'archived')
      AND public.structured_revision_allows_draft_write(revision_id, venue_id)
    )
    OR (
      status = 'published'
      AND public.structured_revision_allows_publish(revision_id, venue_id)
    )
  );

CREATE POLICY venue_media_collections_manager_delete
  ON public.venue_media_collections
  FOR DELETE
  TO authenticated
  USING (public.structured_media_collection_allows_draft_write(id));

CREATE POLICY venue_media_items_manager_preview
  ON public.venue_media_items
  FOR SELECT
  TO authenticated
  USING (public.can_preview_venue_structured_content(venue_id));

CREATE POLICY venue_media_items_manager_insert
  ON public.venue_media_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'draft'
    AND public.structured_media_collection_allows_draft_write(collection_id)
    AND public.structured_media_path_belongs_to_venue(venue_id, storage_path)
  );

CREATE POLICY venue_media_items_manager_update
  ON public.venue_media_items
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_venue_structured_content(venue_id)
    OR public.can_publish_venue_structured_content(venue_id)
  )
  WITH CHECK (
    (
      status IN ('draft', 'archived')
      AND public.structured_media_collection_allows_draft_write(collection_id)
      AND public.structured_media_path_belongs_to_venue(venue_id, storage_path)
    )
    OR (
      status = 'published'
      AND public.can_publish_venue_structured_content(venue_id)
      AND public.structured_media_path_belongs_to_venue(venue_id, storage_path)
    )
  );

CREATE POLICY venue_media_items_manager_delete
  ON public.venue_media_items
  FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND public.structured_media_collection_allows_draft_write(collection_id)
  );

CREATE POLICY venue_logistics_manager_preview
  ON public.venue_logistics
  FOR SELECT
  TO authenticated
  USING (public.can_preview_venue_structured_content(venue_id));

CREATE POLICY venue_logistics_manager_insert
  ON public.venue_logistics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'draft'
    AND public.structured_revision_allows_draft_write(revision_id, venue_id)
  );

CREATE POLICY venue_logistics_manager_update
  ON public.venue_logistics
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_venue_structured_content(venue_id)
    OR public.can_publish_venue_structured_content(venue_id)
  )
  WITH CHECK (
    (
      status IN ('draft', 'archived')
      AND public.structured_revision_allows_draft_write(revision_id, venue_id)
    )
    OR (
      status = 'published'
      AND public.structured_revision_allows_publish(revision_id, venue_id)
    )
  );

CREATE POLICY venue_logistics_manager_delete
  ON public.venue_logistics
  FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND public.structured_revision_allows_draft_write(revision_id, venue_id)
  );

CREATE POLICY venue_faqs_manager_preview
  ON public.venue_faqs
  FOR SELECT
  TO authenticated
  USING (public.can_preview_venue_structured_content(venue_id));

CREATE POLICY venue_faqs_manager_insert
  ON public.venue_faqs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'draft'
    AND public.structured_revision_allows_draft_write(revision_id, venue_id)
  );

CREATE POLICY venue_faqs_manager_update
  ON public.venue_faqs
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_venue_structured_content(venue_id)
    OR public.can_publish_venue_structured_content(venue_id)
  )
  WITH CHECK (
    (
      status IN ('draft', 'archived')
      AND public.structured_revision_allows_draft_write(revision_id, venue_id)
    )
    OR (
      status = 'published'
      AND public.structured_revision_allows_publish(revision_id, venue_id)
    )
  );

CREATE POLICY venue_faqs_manager_delete
  ON public.venue_faqs
  FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND public.structured_revision_allows_draft_write(revision_id, venue_id)
  );

CREATE POLICY package_venue_spaces_manager_preview
  ON public.package_venue_spaces
  FOR SELECT
  TO authenticated
  USING (public.can_preview_venue_structured_content(venue_id));

CREATE POLICY package_venue_spaces_manager_insert
  ON public.package_venue_spaces
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.structured_space_allows_draft_write(space_id)
    AND EXISTS (
      SELECT 1
      FROM public.venue_packages package
      WHERE package.id = package_venue_spaces.package_id
        AND package.venue_id = package_venue_spaces.venue_id
    )
  );

CREATE POLICY package_venue_spaces_manager_update
  ON public.package_venue_spaces
  FOR UPDATE
  TO authenticated
  USING (public.structured_space_allows_draft_write(space_id))
  WITH CHECK (
    public.structured_space_allows_draft_write(space_id)
    AND EXISTS (
      SELECT 1
      FROM public.venue_packages package
      WHERE package.id = package_venue_spaces.package_id
        AND package.venue_id = package_venue_spaces.venue_id
    )
  );

CREATE POLICY package_venue_spaces_manager_delete
  ON public.package_venue_spaces
  FOR DELETE
  TO authenticated
  USING (public.structured_space_allows_draft_write(space_id));

-- Restore the venue-aware storage policies after the legacy 0790 migration
-- replaced them with organization-folder-only checks.

DROP POLICY IF EXISTS "venue-images.insert.owner" ON storage.objects;
DROP POLICY IF EXISTS "venue-images.update.owner" ON storage.objects;
DROP POLICY IF EXISTS "venue-images.delete.owner" ON storage.objects;
DROP POLICY IF EXISTS "venue-images.insert.venue-owner" ON storage.objects;
DROP POLICY IF EXISTS "venue-images.update.venue-owner" ON storage.objects;
DROP POLICY IF EXISTS "venue-images.delete.venue-owner" ON storage.objects;

CREATE POLICY "venue-images.insert.venue-owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'venue-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.venues v
        WHERE v.id::text = (storage.foldername(name))[2]
          AND v.organization_id::text = (storage.foldername(name))[1]
          AND public.is_org_member(v.organization_id)
      )
    )
  );

CREATE POLICY "venue-images.update.venue-owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'venue-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.venues v
        WHERE v.id::text = (storage.foldername(name))[2]
          AND v.organization_id::text = (storage.foldername(name))[1]
          AND public.is_org_member(v.organization_id)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'venue-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.venues v
        WHERE v.id::text = (storage.foldername(name))[2]
          AND v.organization_id::text = (storage.foldername(name))[1]
          AND public.is_org_member(v.organization_id)
      )
    )
  );

CREATE POLICY "venue-images.delete.venue-owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'venue-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.venues v
        WHERE v.id::text = (storage.foldername(name))[2]
          AND v.organization_id::text = (storage.foldername(name))[1]
          AND public.is_org_member(v.organization_id)
      )
    )
  );

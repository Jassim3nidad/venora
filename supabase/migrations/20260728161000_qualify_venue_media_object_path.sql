-- Qualify the outer storage object path so the nested venue query cannot bind
-- `name` to public.venues.name.

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
        WHERE v.id::text = (storage.foldername(storage.objects.name))[2]
          AND v.organization_id::text = (storage.foldername(storage.objects.name))[1]
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
        WHERE v.id::text = (storage.foldername(storage.objects.name))[2]
          AND v.organization_id::text = (storage.foldername(storage.objects.name))[1]
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
        WHERE v.id::text = (storage.foldername(storage.objects.name))[2]
          AND v.organization_id::text = (storage.foldername(storage.objects.name))[1]
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
        WHERE v.id::text = (storage.foldername(storage.objects.name))[2]
          AND v.organization_id::text = (storage.foldername(storage.objects.name))[1]
          AND public.is_org_member(v.organization_id)
      )
    )
  );

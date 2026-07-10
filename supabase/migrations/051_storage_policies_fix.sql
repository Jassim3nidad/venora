-- Migration 051 - Storage Policies Fix (Verification Docs Upload RLS)

-- Drop any potentially conflicting or malformed policies for verification-docs
DROP POLICY IF EXISTS "verification-docs.insert.owner" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs.select.owner-or-admin" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs.update.owner" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs.delete.owner-or-admin" ON storage.objects;

-- Also drop duplicate bucket policies created in 017 to avoid ambiguity
DROP POLICY IF EXISTS "Users can upload their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all verification documents" ON storage.objects;

-- Recreate strictly-scoped policies for verification-docs using `TO authenticated` and safe paths

CREATE POLICY "verification-docs.insert.owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "verification-docs.select.owner-or-admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "verification-docs.update.owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "verification-docs.delete.owner-or-admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- Fix venue-images insert policy operator precedence bug
DROP POLICY IF EXISTS "venue-images.insert.venue-owner" ON storage.objects;

CREATE POLICY "venue-images.insert.venue-owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'venue-images'
    AND (
      public.has_role('venue_owner') 
      OR public.has_role('event_coordinator') 
      OR public.is_admin()
    )
  );

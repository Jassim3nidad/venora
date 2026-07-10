-- Fix RLS policy for uploading verification documents
-- Drops the flawed policy that required 'venue_owner' or 'supplier' roles
-- Replaces it with a path-bound insert policy for any authenticated user.

DROP POLICY IF EXISTS "verification-docs.insert.owner" ON storage.objects;

CREATE POLICY "verification-docs.insert.owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

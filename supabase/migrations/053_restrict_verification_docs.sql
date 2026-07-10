-- Migration 053 - Restrict Verification Docs Uploads

-- 1. Configure the bucket maximum size and allowed MIME types
UPDATE storage.buckets
SET file_size_limit = 20971520, -- 20 MB
    allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg']
WHERE id = 'verification-docs';

-- 2. Drop existing broad and strict policies
DROP POLICY IF EXISTS "verification-docs-owner-full-access" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs.insert.owner" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs.select.owner-or-admin" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs.update.owner" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs.delete.owner-or-admin" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all verification documents" ON storage.objects;

-- 3. Replace with separate operation policies restricted by application status

-- INSERT
-- Allow an authenticated applicant to create a new object only when:
-- The first folder segment equals auth.uid()::text
-- The user does not have a submitted (pending/approved/etc) application blocking uploads
CREATE POLICY "verification-docs.insert.strict"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1 FROM partner_applications pa 
      WHERE pa.user_id = auth.uid() 
        AND pa.status IN ('pending', 'under_review', 'approved', 'rejected')
    )
  );

-- SELECT
-- Applicant to read their own documents
-- Authorized admins or application reviewers to read documents
CREATE POLICY "verification-docs.select.strict"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- UPDATE
-- Only allow replacement while the application is editable
CREATE POLICY "verification-docs.update.strict"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1 FROM partner_applications pa 
      WHERE pa.user_id = auth.uid() 
        AND pa.status IN ('pending', 'under_review', 'approved', 'rejected')
    )
  )
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1 FROM partner_applications pa 
      WHERE pa.user_id = auth.uid() 
        AND pa.status IN ('pending', 'under_review', 'approved', 'rejected')
    )
  );

-- DELETE
-- Only allow deletion when application is editable
CREATE POLICY "verification-docs.delete.strict"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1 FROM partner_applications pa 
      WHERE pa.user_id = auth.uid() 
        AND pa.status IN ('pending', 'under_review', 'approved', 'rejected')
    )
  );

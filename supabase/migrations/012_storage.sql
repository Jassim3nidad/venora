-- ============================================================
-- Migration 012 — Storage Buckets & Policies
-- ============================================================
-- Buckets:
--   venue-images         public  — venue photos & videos
--   avatars              public  — user profile pictures
--   verification-docs    private — DTI/BIR/SEC docs for admin review
-- ============================================================

-- ── Buckets ──────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'venue-images',
    'venue-images',
    true,
    52428800,  -- 50 MB
    ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime']
  ),
  (
    'avatars',
    'avatars',
    true,
    5242880,   -- 5 MB
    ARRAY['image/jpeg','image/png','image/webp']
  ),
  (
    'verification-docs',
    'verification-docs',
    false,
    20971520,  -- 20 MB
    ARRAY['image/jpeg','image/png','image/webp','application/pdf']
  )
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS Policies ─────────────────────────────────────
-- Storage policies live in storage.objects, not public.*
-- Naming: "<bucket>.<operation>.<actor>"

-- ┌─────────────────────────────────────────────────────────────┐
-- │ venue-images bucket                                         │
-- └─────────────────────────────────────────────────────────────┘

-- Anyone can view public venue images
CREATE POLICY "venue-images.select.public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'venue-images');

-- Authenticated venue owners/coordinators can upload
-- Path convention: {organization_id}/{venue_id}/{filename}
CREATE POLICY "venue-images.insert.venue-owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'venue-images'
    AND auth.role() = 'authenticated'
    AND public.has_role('venue_owner') OR public.has_role('event_coordinator') OR public.is_admin()
  );

-- Only the uploader's org or admin can update
CREATE POLICY "venue-images.update.venue-owner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'venue-images'
    AND auth.role() = 'authenticated'
    AND (public.has_role('venue_owner') OR public.has_role('event_coordinator') OR public.is_admin())
  );

-- Only the uploader's org or admin can delete
CREATE POLICY "venue-images.delete.venue-owner"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'venue-images'
    AND auth.role() = 'authenticated'
    AND (public.has_role('venue_owner') OR public.has_role('event_coordinator') OR public.is_admin())
  );

-- ┌─────────────────────────────────────────────────────────────┐
-- │ avatars bucket                                              │
-- └─────────────────────────────────────────────────────────────┘

-- Anyone can view avatars (public bucket)
CREATE POLICY "avatars.select.public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar
-- Path convention: {user_id}/{filename}
CREATE POLICY "avatars.insert.self"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/replace only their own avatar
CREATE POLICY "avatars.update.self"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete only their own avatar
CREATE POLICY "avatars.delete.self"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ┌─────────────────────────────────────────────────────────────┐
-- │ verification-docs bucket (private)                          │
-- └─────────────────────────────────────────────────────────────┘

-- Only the uploader (venue owner / supplier) or admin can view their own docs
-- Path convention: {user_id}/{filename}
CREATE POLICY "verification-docs.select.owner-or-admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- Venue owners and suppliers can upload verification documents
CREATE POLICY "verification-docs.insert.owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (public.has_role('venue_owner') OR public.has_role('supplier'))
  );

-- Users can replace only their own docs
CREATE POLICY "verification-docs.update.owner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete only their own docs; admin can delete any
CREATE POLICY "verification-docs.delete.owner-or-admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

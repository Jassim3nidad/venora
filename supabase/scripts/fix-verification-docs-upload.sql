-- Fix partner application document uploads (venue owner / supplier / coordinator).
-- Run in Supabase Dashboard → SQL Editor.
--
-- Problem: storage policy "verification-docs.insert.owner" required venue_owner
-- or supplier role, but applicants are still customers until admin approval.
-- Error: "new row violates row-level security policy"

-- Ensure bucket exists (safe if already created by migration 012)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-docs',
  'verification-docs',
  false,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "verification-docs.insert.owner" ON storage.objects;

CREATE POLICY "verification-docs.insert.owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

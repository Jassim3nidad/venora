-- ============================================================
-- Migration: Enforce limits on canonical verification-docs bucket
-- ============================================================
-- Purpose: Ensures the 'verification-docs' bucket strictly adheres to
-- a 20MB file size limit and allows only image and PDF uploads, matching
-- the frontend validation requirements in VerificationUpload.tsx.
-- This operation is idempotent and does not modify objects or policies.

UPDATE storage.buckets
SET
  file_size_limit = 20971520, -- 20 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
WHERE id = 'verification-docs';

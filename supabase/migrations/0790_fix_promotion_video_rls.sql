-- Migration 0790_fix_promotion_video_rls.sql
-- Fixes RLS policies for promotional video uploads (storage.objects and venue_images)

-- 1. Fix storage.objects policies for venue-images bucket
DROP POLICY IF EXISTS "venue-images.insert.venue-owner" ON storage.objects;
DROP POLICY IF EXISTS "venue-images.update.venue-owner" ON storage.objects;
DROP POLICY IF EXISTS "venue-images.delete.venue-owner" ON storage.objects;
DROP POLICY IF EXISTS "venue-images.insert.owner" ON storage.objects;
DROP POLICY IF EXISTS "venue-images.update.owner" ON storage.objects;
DROP POLICY IF EXISTS "venue-images.delete.owner" ON storage.objects;

-- We use public.is_org_member on the first part of the storage path (org id)
CREATE POLICY "venue-images.insert.owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'venue-images'
    AND (
      public.is_org_member((storage.foldername(name))[1]::uuid)
      OR public.is_admin()
    )
  );

CREATE POLICY "venue-images.update.owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'venue-images'
    AND (
      public.is_org_member((storage.foldername(name))[1]::uuid)
      OR public.is_admin()
    )
  );

CREATE POLICY "venue-images.delete.owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'venue-images'
    AND (
      public.is_org_member((storage.foldername(name))[1]::uuid)
      OR public.is_admin()
    )
  );

-- 2. Explictly separate venue_images policies to ensure INSERT works without ambiguity
DROP POLICY IF EXISTS "venue_img.all.owner" ON public.venue_images;
DROP POLICY IF EXISTS "venue_img.all.admin" ON public.venue_images;
DROP POLICY IF EXISTS "venue_img.insert.owner" ON public.venue_images;
DROP POLICY IF EXISTS "venue_img.update.owner" ON public.venue_images;
DROP POLICY IF EXISTS "venue_img.delete.owner" ON public.venue_images;
DROP POLICY IF EXISTS "venue_img.insert.admin" ON public.venue_images;
DROP POLICY IF EXISTS "venue_img.update.admin" ON public.venue_images;
DROP POLICY IF EXISTS "venue_img.delete.admin" ON public.venue_images;

CREATE POLICY "venue_img.insert.owner" ON public.venue_images FOR INSERT WITH CHECK (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_img.update.owner" ON public.venue_images FOR UPDATE USING (public.is_org_member_for_venue(venue_id)) WITH CHECK (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_img.delete.owner" ON public.venue_images FOR DELETE USING (public.is_org_member_for_venue(venue_id));

CREATE POLICY "venue_img.insert.admin" ON public.venue_images FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "venue_img.update.admin" ON public.venue_images FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "venue_img.delete.admin" ON public.venue_images FOR DELETE USING (public.is_admin());

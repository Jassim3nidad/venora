-- ============================================================
-- Migration 025 — Verified Reviews Enhancements
-- ============================================================
-- Additive only. Does not modify check_review_eligibility,
-- update_venue_stats, update_supplier_stats, mark_booking_reviewed,
-- or existing RLS policies on reviews/supplier_reviews.
--
-- Adds: review photos, owner-reply timestamp, helpful votes,
-- review flags (reports), and a review-photos storage bucket.
-- ============================================================

-- ── review_photos ─────────────────────────────────────────────
-- Customer-uploaded photos attached to a review. Max 5 enforced
-- at the application layer (Server Action), not the DB.
CREATE TABLE public.review_photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid        NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  url          text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_photos_review ON public.review_photos(review_id);

COMMENT ON TABLE  public.review_photos               IS 'Customer-uploaded photos attached to a review. Max 5 enforced at application layer.';
COMMENT ON COLUMN public.review_photos.storage_path   IS 'Path within review-photos bucket: {customer_id}/{review_id}/{filename}.';
COMMENT ON COLUMN public.review_photos.url            IS 'Public URL (bucket is public) cached at insert time.';

ALTER TABLE public.review_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_photos.select.published" ON public.review_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.status = 'published'));
CREATE POLICY "review_photos.select.self" ON public.review_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.customer_id = auth.uid()));
CREATE POLICY "review_photos.insert.self" ON public.review_photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.customer_id = auth.uid()));
CREATE POLICY "review_photos.delete.self" ON public.review_photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.customer_id = auth.uid()));
CREATE POLICY "review_photos.all.admin" ON public.review_photos FOR ALL USING (public.is_admin());

-- ── review_helpful_votes ─────────────────────────────────────
-- One row per (review, voter). Presence = voted helpful.
-- Toggle via insert/delete, never update. Composite PK mirrors
-- the `favorites` join-table convention (005_bookings.sql).
CREATE TABLE public.review_helpful_votes (
  review_id  uuid        NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  voter_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, voter_id)
);

COMMENT ON TABLE public.review_helpful_votes IS 'One row per (review, voter). Presence = voted helpful. Toggle via insert/delete.';

ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_helpful_votes.select.all"  ON public.review_helpful_votes FOR SELECT USING (true);
CREATE POLICY "review_helpful_votes.insert.self" ON public.review_helpful_votes FOR INSERT WITH CHECK (voter_id = auth.uid());
CREATE POLICY "review_helpful_votes.delete.self" ON public.review_helpful_votes FOR DELETE USING (voter_id = auth.uid());
CREATE POLICY "review_helpful_votes.all.admin"   ON public.review_helpful_votes FOR ALL USING (public.is_admin());

-- ── review_flags ──────────────────────────────────────────────
-- Customer-submitted reports against a review. Does NOT change
-- review status automatically — surfaces in the admin moderation
-- queue for manual action (see decision: "stay visible, admin
-- queue only").
CREATE TABLE public.review_flags (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   uuid        NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason      text        NOT NULL,
  details     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, reporter_id)
);

CREATE INDEX idx_review_flags_review ON public.review_flags(review_id);

COMMENT ON TABLE  public.review_flags        IS 'Customer-submitted reports against a review. Does not change review status automatically — surfaces in the admin moderation queue for manual action.';
COMMENT ON COLUMN public.review_flags.reason IS 'Short reason code: spam|offensive|fake|other.';

ALTER TABLE public.review_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_flags.select.admin" ON public.review_flags FOR SELECT USING (public.is_admin());
CREATE POLICY "review_flags.insert.self"  ON public.review_flags FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "review_flags.all.admin"    ON public.review_flags FOR ALL USING (public.is_admin());

-- ── reviews: new columns ─────────────────────────────────────
ALTER TABLE public.reviews
  ADD COLUMN owner_reply_at timestamptz,
  ADD COLUMN helpful_count  integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.reviews.owner_reply_at IS 'Timestamp of the most recent owner_reply edit. NULL until first reply.';
COMMENT ON COLUMN public.reviews.helpful_count  IS 'Denormalized count of review_helpful_votes, kept in sync by review_helpful_votes_sync_count trigger.';

-- ── Trigger: denormalize helpful_count (mirrors update_venue_stats) ──
CREATE OR REPLACE FUNCTION public.sync_review_helpful_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_review_id uuid;
BEGIN
  v_review_id := COALESCE(NEW.review_id, OLD.review_id);
  UPDATE public.reviews
  SET helpful_count = (SELECT COUNT(*) FROM public.review_helpful_votes WHERE review_id = v_review_id)
  WHERE id = v_review_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER review_helpful_votes_sync_count
  AFTER INSERT OR DELETE ON public.review_helpful_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_review_helpful_count();

-- ── Storage: review-photos bucket ────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-photos',
  'review-photos',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {customer_id}/{review_id}/{filename}
CREATE POLICY "review-photos.select.public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-photos');

CREATE POLICY "review-photos.insert.self"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'review-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "review-photos.delete.self"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'review-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "review-photos.delete.admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'review-photos' AND public.is_admin());

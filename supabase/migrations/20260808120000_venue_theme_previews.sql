-- ============================================================
-- 20260808120000 — AI venue theme previews
-- ============================================================
-- Caches AI re-renders of a venue photo under a visual theme — either one
-- of the eight built-in themes (horror, winter_wonderland, ...) or the
-- 'custom' sentinel carrying customer-written text. One row per
-- (source photo, theme, prompt hash), so the expensive image-edit call
-- happens exactly once per combination and every later viewer is served
-- from Storage.
--
-- Note on naming: the spec for this feature called the source table
-- `venue_photos`; this schema's photo table is `public.venue_images`
-- (see 0045_venues_core.sql), so `source_image_id` references that.
--
-- Writes are service-role only — the Edge Function `generate-theme-preview`
-- is the sole writer. Customers only ever read `ready` rows.

CREATE TABLE public.venue_theme_previews (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            uuid          NOT NULL REFERENCES public.venues(id)       ON DELETE CASCADE,
  source_image_id     uuid          NOT NULL REFERENCES public.venue_images(id) ON DELETE CASCADE,
  theme               text          NOT NULL,
  -- Customer-written theme text, only ever set when theme = 'custom'.
  -- Stored sanitised (see sanitizeCustomPrompt in packages/lib).
  custom_prompt       text,
  -- Hash of the normalised custom_prompt; '' for the built-in themes so the
  -- uniqueness rule below is one constraint covering both cases.
  prompt_hash         text          NOT NULL DEFAULT '',
  status              text          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'ready', 'failed')),
  output_storage_path text,         -- path inside the public "theme-previews" bucket
  model_used          text,
  generation_cost_usd numeric(10,5),
  error_message       text,
  -- Abuse tracing / rate limiting. Nullable: anonymous visitors may
  -- generate previews, and we only ever store a salted hash of the IP.
  requested_by        uuid                   REFERENCES public.profiles(id) ON DELETE SET NULL,
  requester_ip_hash   text,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (source_image_id, theme, prompt_hash),
  -- custom_prompt and the 'custom' theme imply each other, in both
  -- directions: a built-in theme can never carry freeform text.
  CONSTRAINT venue_theme_previews_custom_prompt_ck
    CHECK ((theme = 'custom') = (custom_prompt IS NOT NULL)),
  CONSTRAINT venue_theme_previews_prompt_hash_ck
    CHECK ((theme = 'custom') = (prompt_hash <> ''))
);

CREATE INDEX idx_venue_theme_previews_venue ON public.venue_theme_previews(venue_id);

-- Supports the sliding-window rate-limit count in the Edge Function.
CREATE INDEX idx_venue_theme_previews_rate_limit
  ON public.venue_theme_previews(requester_ip_hash, created_at DESC)
  WHERE requester_ip_hash IS NOT NULL;

COMMENT ON TABLE public.venue_theme_previews IS
  'Cache of AI-themed re-renders of venue photos. One row per (source_image_id, theme, prompt_hash). Written only by the generate-theme-preview Edge Function via the service role.';

COMMENT ON COLUMN public.venue_theme_previews.custom_prompt IS
  'Sanitised customer-written theme text; NULL for the eight built-in themes. Free text from the public, so treat as untrusted when surfacing it in any admin UI.';

COMMENT ON COLUMN public.venue_theme_previews.output_storage_path IS
  'Relative path in Supabase Storage bucket "theme-previews" ({venue_id}/{image_id}/{theme}.jpg). Use supabase.storage.from("theme-previews").getPublicUrl(path).';

COMMENT ON COLUMN public.venue_theme_previews.generation_cost_usd IS
  'Estimated USD cost of the single image-edit call that produced this row. Populated for cost reporting; NULL when the provider returned no usage data.';

CREATE TRIGGER venue_theme_previews_updated_at
  BEFORE UPDATE ON public.venue_theme_previews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
-- No INSERT/UPDATE/DELETE policies by design: the service role bypasses
-- RLS, so omitting them makes the Edge Function the only possible writer.

ALTER TABLE public.venue_theme_previews ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) may read finished previews only.
-- Pending/failed rows stay hidden so a failure degrades to the original photo.
CREATE POLICY "venue_theme_previews.select.public" ON public.venue_theme_previews
  FOR SELECT USING (status = 'ready');

-- Admins can read every row, including failures, for cost and quality review.
CREATE POLICY "venue_theme_previews.select.admin" ON public.venue_theme_previews
  FOR SELECT USING (public.is_admin());

-- ── Storage bucket ───────────────────────────────────────────
-- Public read like "venue-images"; no write policies, so only the
-- service-role Edge Function can upload generated previews.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'theme-previews',
  'theme-previews',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "theme-previews.select.public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'theme-previews');

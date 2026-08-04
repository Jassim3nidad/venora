-- Structured venue foundation: grouped venue media.

CREATE TABLE public.venue_media_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES public.venue_profile_revisions(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  space_id uuid,
  collection_type text NOT NULL,
  title text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_media_collections_revision_venue_fk
    FOREIGN KEY (revision_id, venue_id)
    REFERENCES public.venue_profile_revisions(id, venue_id)
    ON DELETE CASCADE,
  CONSTRAINT venue_media_collections_space_revision_venue_fk
    FOREIGN KEY (space_id, revision_id, venue_id)
    REFERENCES public.venue_spaces(id, revision_id, venue_id)
    ON DELETE CASCADE,
  CONSTRAINT venue_media_collections_collection_type_check
    CHECK (collection_type IN ('hero', 'gallery', 'space_gallery', 'video', 'logistics')),
  CONSTRAINT venue_media_collections_title_check
    CHECK (title IS NULL OR length(title) <= 120),
  CONSTRAINT venue_media_collections_description_check
    CHECK (description IS NULL OR length(description) <= 500),
  CONSTRAINT venue_media_collections_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT venue_media_collections_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT venue_media_collections_id_venue_id_unique
    UNIQUE (id, venue_id)
);

CREATE UNIQUE INDEX venue_media_collections_cover_unique
  ON public.venue_media_collections (revision_id)
  WHERE is_cover AND status = 'published';

CREATE INDEX idx_venue_media_collections_revision
  ON public.venue_media_collections (revision_id, display_order);

CREATE INDEX idx_venue_media_collections_venue_status
  ON public.venue_media_collections (venue_id, status);

CREATE INDEX idx_venue_media_collections_space
  ON public.venue_media_collections (space_id)
  WHERE space_id IS NOT NULL;

CREATE TRIGGER venue_media_collections_updated_at
  BEFORE UPDATE ON public.venue_media_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.venue_media_collections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.venue_media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.venue_media_collections(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  space_id uuid,
  storage_path text NOT NULL,
  legacy_venue_image_id uuid REFERENCES public.venue_images(id) ON DELETE SET NULL,
  media_type text NOT NULL,
  mime_type text,
  alt_text text,
  caption text,
  transcript text,
  width integer,
  height integer,
  duration_seconds integer,
  display_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  moderation_status text NOT NULL DEFAULT 'approved',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_media_items_collection_venue_fk
    FOREIGN KEY (collection_id, venue_id)
    REFERENCES public.venue_media_collections(id, venue_id)
    ON DELETE CASCADE,
  CONSTRAINT venue_media_items_space_venue_fk
    FOREIGN KEY (space_id, venue_id)
    REFERENCES public.venue_spaces(id, venue_id)
    ON DELETE CASCADE,
  CONSTRAINT venue_media_items_storage_path_check
    CHECK (length(btrim(storage_path)) > 0 AND length(storage_path) <= 1000),
  CONSTRAINT venue_media_items_media_type_check
    CHECK (media_type IN ('image', 'video')),
  CONSTRAINT venue_media_items_mime_type_check
    CHECK (
      mime_type IS NULL
      OR mime_type IN (
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/quicktime'
      )
    ),
  CONSTRAINT venue_media_items_alt_text_check
    CHECK (alt_text IS NULL OR length(alt_text) <= 300),
  CONSTRAINT venue_media_items_caption_check
    CHECK (caption IS NULL OR length(caption) <= 500),
  CONSTRAINT venue_media_items_transcript_check
    CHECK (transcript IS NULL OR length(transcript) <= 10000),
  CONSTRAINT venue_media_items_dimensions_check
    CHECK (
      (width IS NULL OR width > 0)
      AND (height IS NULL OR height > 0)
      AND (duration_seconds IS NULL OR duration_seconds > 0)
    ),
  CONSTRAINT venue_media_items_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT venue_media_items_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT venue_media_items_moderation_status_check
    CHECK (moderation_status IN ('approved', 'flagged', 'hidden'))
);

CREATE UNIQUE INDEX venue_media_items_legacy_unique
  ON public.venue_media_items (legacy_venue_image_id)
  WHERE legacy_venue_image_id IS NOT NULL;

CREATE UNIQUE INDEX venue_media_items_featured_unique
  ON public.venue_media_items (collection_id)
  WHERE is_featured AND status = 'published' AND deleted_at IS NULL;

CREATE INDEX idx_venue_media_items_collection
  ON public.venue_media_items (collection_id, display_order);

CREATE INDEX idx_venue_media_items_venue_status
  ON public.venue_media_items (venue_id, status);

CREATE INDEX idx_venue_media_items_space
  ON public.venue_media_items (space_id)
  WHERE space_id IS NOT NULL;

CREATE TRIGGER venue_media_items_updated_at
  BEFORE UPDATE ON public.venue_media_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.venue_media_items ENABLE ROW LEVEL SECURITY;

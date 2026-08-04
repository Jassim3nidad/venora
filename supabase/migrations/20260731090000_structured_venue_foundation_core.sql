-- Structured venue foundation: profile revisions and venue spaces.

CREATE TABLE public.venue_profile_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  revision_number integer NOT NULL DEFAULT 1,
  created_from_revision_id uuid REFERENCES public.venue_profile_revisions(id) ON DELETE SET NULL,
  published_at timestamptz,
  published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_profile_revisions_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT venue_profile_revisions_revision_number_check
    CHECK (revision_number >= 1),
  CONSTRAINT venue_profile_revisions_published_at_check
    CHECK (status <> 'published' OR published_at IS NOT NULL),
  CONSTRAINT venue_profile_revisions_archived_at_check
    CHECK (status <> 'archived' OR archived_at IS NOT NULL),
  CONSTRAINT venue_profile_revisions_venue_revision_number_unique
    UNIQUE (venue_id, revision_number),
  CONSTRAINT venue_profile_revisions_id_venue_id_unique
    UNIQUE (id, venue_id)
);

CREATE UNIQUE INDEX venue_profile_revisions_one_draft_per_venue
  ON public.venue_profile_revisions (venue_id)
  WHERE status = 'draft';

CREATE UNIQUE INDEX venue_profile_revisions_one_published_per_venue
  ON public.venue_profile_revisions (venue_id)
  WHERE status = 'published';

CREATE INDEX idx_venue_profile_revisions_venue_status
  ON public.venue_profile_revisions (venue_id, status);

CREATE INDEX idx_venue_profile_revisions_venue_revision
  ON public.venue_profile_revisions (venue_id, revision_number DESC);

CREATE TRIGGER venue_profile_revisions_updated_at
  BEFORE UPDATE ON public.venue_profile_revisions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.venue_profile_revisions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.venue_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES public.venue_profile_revisions(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  space_key uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  space_type text,
  setting text NOT NULL,
  short_description text,
  description text,
  capacity_min integer,
  capacity_max integer NOT NULL,
  accessibility_summary text,
  restrictions text,
  operating_notes text,
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_spaces_revision_venue_fk
    FOREIGN KEY (revision_id, venue_id)
    REFERENCES public.venue_profile_revisions(id, venue_id)
    ON DELETE CASCADE,
  CONSTRAINT venue_spaces_name_check
    CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  CONSTRAINT venue_spaces_slug_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT venue_spaces_space_type_check
    CHECK (
      space_type IS NULL
      OR space_type IN (
        'ballroom',
        'garden',
        'pavilion',
        'ceremony_area',
        'reception_area',
        'preparation_suite',
        'custom'
      )
    ),
  CONSTRAINT venue_spaces_setting_check
    CHECK (setting IN ('indoor', 'outdoor', 'mixed')),
  CONSTRAINT venue_spaces_capacity_check
    CHECK (
      capacity_max BETWEEN 0 AND 100000
      AND coalesce(capacity_min, 0) <= capacity_max
      AND (capacity_min IS NULL OR capacity_min BETWEEN 0 AND 100000)
    ),
  CONSTRAINT venue_spaces_short_description_check
    CHECK (short_description IS NULL OR length(short_description) <= 220),
  CONSTRAINT venue_spaces_description_check
    CHECK (description IS NULL OR length(description) <= 4000),
  CONSTRAINT venue_spaces_accessibility_summary_check
    CHECK (accessibility_summary IS NULL OR length(accessibility_summary) <= 1000),
  CONSTRAINT venue_spaces_restrictions_check
    CHECK (restrictions IS NULL OR length(restrictions) <= 2000),
  CONSTRAINT venue_spaces_operating_notes_check
    CHECK (operating_notes IS NULL OR length(operating_notes) <= 2000),
  CONSTRAINT venue_spaces_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT venue_spaces_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT venue_spaces_revision_slug_unique
    UNIQUE (revision_id, slug),
  CONSTRAINT venue_spaces_revision_space_key_unique
    UNIQUE (revision_id, space_key),
  CONSTRAINT venue_spaces_id_venue_id_unique
    UNIQUE (id, venue_id),
  CONSTRAINT venue_spaces_id_revision_venue_unique
    UNIQUE (id, revision_id, venue_id)
);

CREATE INDEX idx_venue_spaces_revision_order
  ON public.venue_spaces (revision_id, display_order, name);

CREATE INDEX idx_venue_spaces_venue_status
  ON public.venue_spaces (venue_id, status);

CREATE INDEX idx_venue_spaces_setting
  ON public.venue_spaces (setting);

CREATE INDEX idx_venue_spaces_capacity_max
  ON public.venue_spaces (capacity_max);

CREATE TRIGGER venue_spaces_updated_at
  BEFORE UPDATE ON public.venue_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.venue_spaces ENABLE ROW LEVEL SECURITY;

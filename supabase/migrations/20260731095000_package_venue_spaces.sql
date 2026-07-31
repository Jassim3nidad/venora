-- Structured venue foundation: package-to-space relationships.

ALTER TABLE public.venue_packages
  ADD CONSTRAINT venue_packages_id_venue_id_unique UNIQUE (id, venue_id);

CREATE TABLE public.package_venue_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL,
  space_id uuid NOT NULL,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  inclusion_type text NOT NULL DEFAULT 'included',
  inclusion_notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_venue_spaces_package_venue_fk
    FOREIGN KEY (package_id, venue_id)
    REFERENCES public.venue_packages(id, venue_id)
    ON DELETE CASCADE,
  CONSTRAINT package_venue_spaces_space_venue_fk
    FOREIGN KEY (space_id, venue_id)
    REFERENCES public.venue_spaces(id, venue_id)
    ON DELETE CASCADE,
  CONSTRAINT package_venue_spaces_inclusion_type_check
    CHECK (inclusion_type IN ('included', 'optional', 'upgrade')),
  CONSTRAINT package_venue_spaces_inclusion_notes_check
    CHECK (inclusion_notes IS NULL OR length(inclusion_notes) <= 1000),
  CONSTRAINT package_venue_spaces_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT package_venue_spaces_package_space_unique
    UNIQUE (package_id, space_id)
);

CREATE INDEX idx_package_venue_spaces_package
  ON public.package_venue_spaces (package_id, display_order);

CREATE INDEX idx_package_venue_spaces_space
  ON public.package_venue_spaces (space_id);

CREATE INDEX idx_package_venue_spaces_venue
  ON public.package_venue_spaces (venue_id);

CREATE TRIGGER package_venue_spaces_updated_at
  BEFORE UPDATE ON public.package_venue_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.package_venue_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY package_venue_spaces_public_read
  ON public.package_venue_spaces
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_packages package
      JOIN public.venue_spaces published_space
        ON published_space.id = package_venue_spaces.space_id
       AND published_space.venue_id = package_venue_spaces.venue_id
      JOIN public.venue_profile_revisions published_revision
        ON published_revision.id = published_space.revision_id
       AND published_revision.venue_id = published_space.venue_id
      WHERE package.id = package_venue_spaces.package_id
        AND package.venue_id = package_venue_spaces.venue_id
        AND package.is_active IS TRUE
        AND published_space.status = 'published'
        AND published_revision.status = 'published'
    )
  );

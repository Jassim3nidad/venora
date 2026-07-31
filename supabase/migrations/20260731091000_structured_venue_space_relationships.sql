-- Structured venue foundation: space capacity layouts and taxonomy links.

CREATE TABLE public.venue_space_capacity_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.venue_spaces(id) ON DELETE CASCADE,
  layout text NOT NULL,
  custom_layout_label text,
  capacity integer NOT NULL,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_space_capacity_layouts_layout_check
    CHECK (
      layout IN (
        'banquet',
        'theatre',
        'classroom',
        'cocktail',
        'u_shape',
        'boardroom',
        'standing',
        'ceremony',
        'custom'
      )
    ),
  CONSTRAINT venue_space_capacity_layouts_capacity_check
    CHECK (capacity BETWEEN 0 AND 100000),
  CONSTRAINT venue_space_capacity_layouts_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT venue_space_capacity_layouts_notes_check
    CHECK (notes IS NULL OR length(notes) <= 1000),
  CONSTRAINT venue_space_capacity_layouts_custom_label_check
    CHECK (
      (
        layout = 'custom'
        AND custom_layout_label IS NOT NULL
        AND length(btrim(custom_layout_label)) BETWEEN 2 AND 120
      )
      OR (
        layout <> 'custom'
        AND custom_layout_label IS NULL
      )
    )
);

CREATE UNIQUE INDEX venue_space_capacity_layouts_standard_unique
  ON public.venue_space_capacity_layouts (space_id, layout)
  WHERE layout <> 'custom';

CREATE UNIQUE INDEX venue_space_capacity_layouts_custom_unique
  ON public.venue_space_capacity_layouts (space_id, lower(custom_layout_label))
  WHERE layout = 'custom';

CREATE INDEX idx_venue_space_capacity_layouts_space
  ON public.venue_space_capacity_layouts (space_id, display_order);

CREATE INDEX idx_venue_space_capacity_layouts_layout_capacity
  ON public.venue_space_capacity_layouts (layout, capacity);

CREATE TRIGGER venue_space_capacity_layouts_updated_at
  BEFORE UPDATE ON public.venue_space_capacity_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.venue_space_capacity_layouts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.venue_space_amenities (
  space_id uuid NOT NULL REFERENCES public.venue_spaces(id) ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES public.amenities(id) ON DELETE RESTRICT,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, amenity_id),
  CONSTRAINT venue_space_amenities_notes_check
    CHECK (notes IS NULL OR length(notes) <= 500)
);

CREATE INDEX idx_venue_space_amenities_amenity
  ON public.venue_space_amenities (amenity_id);

ALTER TABLE public.venue_space_amenities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.venue_space_event_types (
  space_id uuid NOT NULL REFERENCES public.venue_spaces(id) ON DELETE CASCADE,
  event_type_id uuid NOT NULL REFERENCES public.event_types(id) ON DELETE RESTRICT,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, event_type_id),
  CONSTRAINT venue_space_event_types_notes_check
    CHECK (notes IS NULL OR length(notes) <= 500)
);

CREATE INDEX idx_venue_space_event_types_event_type
  ON public.venue_space_event_types (event_type_id);

ALTER TABLE public.venue_space_event_types ENABLE ROW LEVEL SECURITY;

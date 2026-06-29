-- ============================================================
-- Migration 004 — Venue Lookup Tables
-- (venue_categories, event_types, amenities)
-- ============================================================

-- ── venue_categories ──────────────────────────────────────────
-- Garden, Beach, Resort, Hotel, Restaurant, Function Hall, Church...
CREATE TABLE public.venue_categories (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE
);

COMMENT ON TABLE public.venue_categories IS
  'Venue type taxonomy (Garden, Beach, Resort, Hotel, Function Hall, Church...). Many-to-many with venues.';

-- ── event_types ───────────────────────────────────────────────
-- Wedding, Birthday, Corporate, Conference, Debut...
CREATE TABLE public.event_types (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE
);

COMMENT ON TABLE public.event_types IS
  'Event type taxonomy (Wedding, Birthday, Corporate, Debut...). Used for filtering and AI cost estimation.';

-- ── amenities ─────────────────────────────────────────────────
-- Flexible long-tail amenities without schema changes.
-- Examples: Kids Area, Backup Generator, Bridal Suite, Parking Lot
CREATE TABLE public.amenities (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

COMMENT ON TABLE public.amenities IS
  'Flexible amenity taxonomy. Venue owners select from this list; new amenities can be added without schema changes.';

-- ── Seed lookup data ──────────────────────────────────────────

INSERT INTO public.venue_categories (name, slug) VALUES
  ('Garden',         'garden'),
  ('Beach',          'beach'),
  ('Resort',         'resort'),
  ('Hotel Ballroom', 'hotel-ballroom'),
  ('Restaurant',     'restaurant'),
  ('Function Hall',  'function-hall'),
  ('Church',         'church'),
  ('Events Space',   'events-space'),
  ('Rooftop',        'rooftop'),
  ('Farm',           'farm');

INSERT INTO public.event_types (name, slug) VALUES
  ('Wedding',          'wedding'),
  ('Birthday',         'birthday'),
  ('Corporate',        'corporate'),
  ('Debut',            'debut'),
  ('Graduation',       'graduation'),
  ('Reunion',          'reunion'),
  ('Conference',       'conference'),
  ('Seminar',          'seminar'),
  ('Product Launch',   'product-launch'),
  ('Other',            'other');

INSERT INTO public.amenities (name) VALUES
  ('Air Conditioning'),
  ('Parking'),
  ('Backup Generator'),
  ('Bridal Suite'),
  ('Groom Suite'),
  ('Swimming Pool'),
  ('Kids Area'),
  ('Sound System'),
  ('LED Wall'),
  ('Projector'),
  ('Catering Kitchen'),
  ('Bar Area'),
  ('Garden Area'),
  ('Stage'),
  ('Dance Floor'),
  ('Overnight Accommodation'),
  ('Wheelchair Ramp'),
  ('Pet Friendly Area'),
  ('Wi-Fi'),
  ('CCTV');

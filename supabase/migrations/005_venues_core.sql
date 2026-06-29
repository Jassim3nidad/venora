-- ============================================================
-- Migration 005 — Venue Domain
-- (venues, junction tables, images, packages)
-- ============================================================

-- ── venues ───────────────────────────────────────────────────
CREATE TABLE public.venues (
  id                       uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          uuid                    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                     text                    NOT NULL,
  slug                     text                    NOT NULL UNIQUE,
  description              text,
  ai_generated_description text,

  -- Location
  province                 text                    NOT NULL,
  city                     text                    NOT NULL,
  municipality             text,
  address                  text                    NOT NULL,
  latitude                 double precision,
  longitude                double precision,

  -- Capacity & pricing
  capacity_min             int,
  capacity_max             int                     NOT NULL,
  base_price               numeric(12,2)           NOT NULL,
  price_unit               public.price_unit       NOT NULL DEFAULT 'per_event',
  indoor_outdoor           public.indoor_outdoor   NOT NULL DEFAULT 'indoor',

  -- High-frequency filter flags — kept as indexed booleans for search performance
  -- (avoids JOIN to venue_amenities for the most common filter operations)
  air_conditioned          boolean                 NOT NULL DEFAULT false,
  parking_available        boolean                 NOT NULL DEFAULT false,
  overnight_accommodation  boolean                 NOT NULL DEFAULT false,
  pet_friendly             boolean                 NOT NULL DEFAULT false,
  wheelchair_accessible    boolean                 NOT NULL DEFAULT false,
  has_pool                 boolean                 NOT NULL DEFAULT false,
  ceremony_venue           boolean                 NOT NULL DEFAULT false,
  reception_venue          boolean                 NOT NULL DEFAULT false,

  -- Operational
  operating_hours          jsonb,                  -- { "mon": ["08:00","22:00"], "sun": null, ... }
  cancellation_policy      text,
  venue_rules              text,

  -- Lifecycle
  status                   public.venue_status     NOT NULL DEFAULT 'draft',
  is_featured              boolean                 NOT NULL DEFAULT false,
  featured_until           timestamptz,

  -- Denormalized stats (updated by triggers / cron — never aggregate live from reviews)
  avg_rating               numeric(3,2)            NOT NULL DEFAULT 0,
  review_count             int                     NOT NULL DEFAULT 0,

  created_at               timestamptz             NOT NULL DEFAULT now(),
  updated_at               timestamptz             NOT NULL DEFAULT now(),

  CONSTRAINT venues_capacity_valid CHECK (capacity_max >= COALESCE(capacity_min, 1) AND capacity_max >= 1),
  CONSTRAINT venues_price_positive  CHECK (base_price > 0)
);

-- Composite index for the core search query: filter by location + status + capacity + price
CREATE INDEX idx_venues_search   ON public.venues (province, city, status, capacity_max, base_price);
-- GiST index for proximity search (distance from a lat/lng point)
CREATE INDEX idx_venues_location ON public.venues USING gist (ll_to_earth(latitude, longitude))
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
-- Trigram indexes for fuzzy name / city search
CREATE INDEX idx_venues_name_trgm ON public.venues USING gin (name gin_trgm_ops);
CREATE INDEX idx_venues_city_trgm ON public.venues USING gin (city gin_trgm_ops);

CREATE TRIGGER venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE  public.venues                        IS 'Core venue listings. Only published venues are publicly visible (enforced by RLS).';
COMMENT ON COLUMN public.venues.organization_id        IS 'Venues are owned by organizations (not directly by profiles). Supports multi-venue groups.';
COMMENT ON COLUMN public.venues.slug                   IS 'URL-safe unique identifier. Immutable after first publication.';
COMMENT ON COLUMN public.venues.operating_hours        IS 'JSONB: { "mon": ["08:00","22:00"], "tue": ["08:00","22:00"], "sun": null } — null means closed.';
COMMENT ON COLUMN public.venues.ai_generated_description IS 'AI-drafted description. Shown to owner for review/edit before publishing.';
COMMENT ON COLUMN public.venues.avg_rating             IS 'Denormalized from reviews. Updated by update_venue_stats() trigger on review insert/update.';

-- ── Junction: venue ↔ category ───────────────────────────────
CREATE TABLE public.venue_category_assignments (
  venue_id    uuid NOT NULL REFERENCES public.venues(id)           ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.venue_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (venue_id, category_id)
);

-- ── Junction: venue ↔ event_type ─────────────────────────────
CREATE TABLE public.venue_event_types (
  venue_id      uuid NOT NULL REFERENCES public.venues(id)      ON DELETE CASCADE,
  event_type_id uuid NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
  PRIMARY KEY (venue_id, event_type_id)
);

-- ── Junction: venue ↔ amenity ─────────────────────────────────
CREATE TABLE public.venue_amenities (
  venue_id   uuid NOT NULL REFERENCES public.venues(id)    ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (venue_id, amenity_id)
);

-- ── venue_images ──────────────────────────────────────────────
CREATE TABLE public.venue_images (
  id            uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      uuid              NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  storage_path  text              NOT NULL,   -- Supabase Storage object path
  media_type    public.media_type NOT NULL DEFAULT 'image',
  alt_text      text,
  display_order int               NOT NULL DEFAULT 0,
  is_featured   boolean           NOT NULL DEFAULT false,
  created_at    timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_images_venue ON public.venue_images(venue_id, display_order);

COMMENT ON COLUMN public.venue_images.storage_path IS
  'Relative path in Supabase Storage bucket "venue-images". Use supabase.storage.from("venue-images").getPublicUrl(path) on client.';

-- ── venue_packages ────────────────────────────────────────────
CREATE TABLE public.venue_packages (
  id          uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid             NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name        text             NOT NULL,
  description text,
  price       numeric(12,2)   NOT NULL CHECK (price > 0),
  price_unit  public.price_unit NOT NULL DEFAULT 'per_event',
  min_guests  int,
  max_guests  int,
  inclusions  text[]           NOT NULL DEFAULT '{}',
  is_active   boolean          NOT NULL DEFAULT true,
  created_at  timestamptz      NOT NULL DEFAULT now(),
  updated_at  timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_packages_venue ON public.venue_packages(venue_id);

CREATE TRIGGER venue_packages_updated_at
  BEFORE UPDATE ON public.venue_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON COLUMN public.venue_packages.inclusions IS
  'Array of inclusion strings shown to customers, e.g. ["Use of venue for 8 hours", "50 tables", "Sound system"].';

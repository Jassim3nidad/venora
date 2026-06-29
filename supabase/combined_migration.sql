-- ============================================================
-- Migration 001 â€” PostgreSQL Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vector similarity search (AI semantic search)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Full-text trigram search (venue name / city fuzzy match)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Cube + earthdistance: enables ll_to_earth() GiST index on venues
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- Scheduled jobs (analytics refresh, auto-complete bookings)
CREATE EXTENSION IF NOT EXISTS "pg_cron";
-- ============================================================
-- Migration 002 â€” Enums (Complete Unified Set)
-- ============================================================

-- â”€â”€ Identity & Access â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TYPE public.user_role AS ENUM (
  'customer',
  'venue_owner',
  'event_coordinator',
  'supplier',
  'admin'
);

CREATE TYPE public.org_member_role AS ENUM (
  'owner',
  'coordinator',
  'staff'
);

CREATE TYPE public.account_status AS ENUM (
  'active',
  'pending_verification',
  'suspended',
  'banned'
);

-- â”€â”€ Venue Domain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TYPE public.venue_status AS ENUM (
  'draft',
  'pending_approval',
  'published',
  'suspended',
  'archived'
);

CREATE TYPE public.price_unit AS ENUM (
  'per_event',
  'per_hour',
  'per_pax',
  'per_day'
);

CREATE TYPE public.indoor_outdoor AS ENUM (
  'indoor',
  'outdoor',
  'both'
);

CREATE TYPE public.media_type AS ENUM (
  'image',
  'video'
);

-- â”€â”€ Calendar & Booking Domain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TYPE public.availability_status AS ENUM (
  'available',
  'reserved',
  'tentative',
  'maintenance',
  'blackout'
);

CREATE TYPE public.booking_status AS ENUM (
  'pending',
  'approved',
  'declined',
  'cancelled',
  'completed',
  'expired'
);

CREATE TYPE public.inquiry_status AS ENUM (
  'new',
  'responded',
  'closed'
);

-- â”€â”€ Supplier Domain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TYPE public.accreditation_status AS ENUM (
  'pending',
  'accredited',
  'rejected',
  'suspended'
);

-- â”€â”€ Reviews Domain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TYPE public.review_status AS ENUM (
  'published',
  'flagged',
  'removed'
);

-- â”€â”€ Payments & Admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TYPE public.payment_provider AS ENUM (
  'paymongo',
  'maya',
  'stripe'
);

CREATE TYPE public.transaction_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded'
);

CREATE TYPE public.verification_type AS ENUM (
  'venue_owner',
  'supplier',
  'venue'
);

CREATE TYPE public.verification_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TYPE public.notification_channel AS ENUM (
  'email',
  'sms',
  'push',
  'in_app'
);
-- ============================================================
-- Migration 003 â€” Identity & Access
-- (profiles, user_roles, organizations, organization_members)
-- ============================================================

-- â”€â”€ Utility: auto-update updated_at â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- â”€â”€ profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.profiles (
  id          uuid         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text         NOT NULL,
  avatar_url  text,
  phone       text,
  status      public.account_status NOT NULL DEFAULT 'pending_verification',
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE  public.profiles        IS 'App-level user profile. auth.users is the source of truth for credentials.';
COMMENT ON COLUMN public.profiles.status IS 'Account status of the user profile.';

-- â”€â”€ user_roles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.user_roles (
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       public.user_role NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

COMMENT ON TABLE public.user_roles IS
  'Many-to-many: a user can hold multiple roles (e.g. customer + supplier).';

-- â”€â”€ organizations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.organizations (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                 uuid        NOT NULL REFERENCES public.profiles(id),
  name                     text        NOT NULL,
  business_registration_no text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.organizations IS
  'A business entity: venue owner company, or multi-venue group.';

-- â”€â”€ organization_members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.organization_members (
  organization_id uuid                   NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid                   NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  role            public.org_member_role NOT NULL DEFAULT 'staff',
  invited_at      timestamptz            NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

COMMENT ON TABLE public.organization_members IS
  'Staff / event coordinators attached to an organization.';

-- â”€â”€ Auto-create profile & role on signup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'customer'::public.user_role
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- â”€â”€ RLS helper functions (SECURITY DEFINER) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.has_role(check_role public.user_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = check_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.has_role('admin');
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = org_id AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member_for_venue(p_venue_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = p_venue_id AND public.is_org_member(v.organization_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_booking_customer(p_booking_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = p_booking_id AND customer_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member_for_booking(p_booking_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = p_booking_id AND public.is_org_member_for_venue(b.venue_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_supplier_owner(p_supplier_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.supplier_profiles
    WHERE id = p_supplier_id AND profile_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE id = p_conversation_id AND user_id = auth.uid()
  );
END;
$$;
-- ============================================================
-- Migration 004 â€” Venue Lookup Tables
-- (venue_categories, event_types, amenities)
-- ============================================================

-- â”€â”€ venue_categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Garden, Beach, Resort, Hotel, Restaurant, Function Hall, Church...
CREATE TABLE public.venue_categories (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE
);

COMMENT ON TABLE public.venue_categories IS
  'Venue type taxonomy (Garden, Beach, Resort, Hotel, Function Hall, Church...). Many-to-many with venues.';

-- â”€â”€ event_types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Wedding, Birthday, Corporate, Conference, Debut...
CREATE TABLE public.event_types (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE
);

COMMENT ON TABLE public.event_types IS
  'Event type taxonomy (Wedding, Birthday, Corporate, Debut...). Used for filtering and AI cost estimation.';

-- â”€â”€ amenities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Flexible long-tail amenities without schema changes.
-- Examples: Kids Area, Backup Generator, Bridal Suite, Parking Lot
CREATE TABLE public.amenities (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

COMMENT ON TABLE public.amenities IS
  'Flexible amenity taxonomy. Venue owners select from this list; new amenities can be added without schema changes.';

-- â”€â”€ Seed lookup data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
-- ============================================================
-- Migration 005 â€” Venue Domain
-- (venues, junction tables, images, packages)
-- ============================================================

-- â”€â”€ venues â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  -- High-frequency filter flags â€” kept as indexed booleans for search performance
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

  -- Denormalized stats (updated by triggers / cron â€” never aggregate live from reviews)
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
COMMENT ON COLUMN public.venues.operating_hours        IS 'JSONB: { "mon": ["08:00","22:00"], "tue": ["08:00","22:00"], "sun": null } â€” null means closed.';
COMMENT ON COLUMN public.venues.ai_generated_description IS 'AI-drafted description. Shown to owner for review/edit before publishing.';
COMMENT ON COLUMN public.venues.avg_rating             IS 'Denormalized from reviews. Updated by update_venue_stats() trigger on review insert/update.';

-- â”€â”€ Junction: venue â†” category â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.venue_category_assignments (
  venue_id    uuid NOT NULL REFERENCES public.venues(id)           ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.venue_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (venue_id, category_id)
);

-- â”€â”€ Junction: venue â†” event_type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.venue_event_types (
  venue_id      uuid NOT NULL REFERENCES public.venues(id)      ON DELETE CASCADE,
  event_type_id uuid NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
  PRIMARY KEY (venue_id, event_type_id)
);

-- â”€â”€ Junction: venue â†” amenity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.venue_amenities (
  venue_id   uuid NOT NULL REFERENCES public.venues(id)    ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (venue_id, amenity_id)
);

-- â”€â”€ venue_images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ venue_packages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
-- ============================================================
-- Migration 006 â€” Calendar & Booking Domain
-- ============================================================

-- â”€â”€ venue_availability â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- One row per venue per date. Venue owners manage this calendar.
-- Customers check it before booking.
CREATE TABLE public.venue_availability (
  id                     uuid                       PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id               uuid                       NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  date                   date                       NOT NULL,
  status                 public.availability_status NOT NULL DEFAULT 'available',
  seasonal_price_override numeric(12,2),            -- overrides venue.base_price for this date
  note                   text,
  UNIQUE (venue_id, date)
);

CREATE INDEX idx_availability_lookup ON public.venue_availability (venue_id, date);

COMMENT ON TABLE  public.venue_availability                          IS 'Per-date availability calendar. Venue owners manage; customers see before booking.';
COMMENT ON COLUMN public.venue_availability.seasonal_price_override  IS 'If set, overrides venues.base_price for this specific date (e.g. peak season surcharge).';

-- â”€â”€ inquiries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Pre-booking contact from a customer to a venue.
CREATE TABLE public.inquiries (
  id          uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid                   NOT NULL REFERENCES public.venues(id),
  customer_id uuid                   NOT NULL REFERENCES public.profiles(id),
  message     text                   NOT NULL,
  status      public.inquiry_status  NOT NULL DEFAULT 'new',
  created_at  timestamptz            NOT NULL DEFAULT now()
);

CREATE INDEX idx_inquiries_venue    ON public.inquiries(venue_id);
CREATE INDEX idx_inquiries_customer ON public.inquiries(customer_id);

-- â”€â”€ bookings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.bookings (
  id               uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id         uuid                   NOT NULL REFERENCES public.venues(id),
  customer_id      uuid                   NOT NULL REFERENCES public.profiles(id),
  package_id       uuid                            REFERENCES public.venue_packages(id),
  event_date       date                   NOT NULL,
  event_type_id    uuid                            REFERENCES public.event_types(id),
  guest_count      int                    NOT NULL CHECK (guest_count >= 1),
  status           public.booking_status  NOT NULL DEFAULT 'pending',
  total_amount     numeric(12,2),
  deposit_amount   numeric(12,2),
  special_requests text,
  decline_reason   text,
  created_at       timestamptz            NOT NULL DEFAULT now(),
  updated_at       timestamptz            NOT NULL DEFAULT now(),
  confirmed_at     timestamptz,
  cancelled_at     timestamptz
);

CREATE INDEX idx_bookings_venue_date ON public.bookings (venue_id, event_date);
CREATE INDEX idx_bookings_customer   ON public.bookings (customer_id);
CREATE INDEX idx_bookings_status     ON public.bookings (status);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable Realtime so customers and venue owners get live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

COMMENT ON TABLE  public.bookings                IS 'Core booking records. Status transitions logged in booking_status_history.';
COMMENT ON COLUMN public.bookings.package_id     IS 'NULL = enquiry without package. Set to a venue_package when customer selects one.';
COMMENT ON COLUMN public.bookings.total_amount   IS 'Calculated at approval time (package price or base_price). NULL until venue owner approves.';
COMMENT ON COLUMN public.bookings.deposit_amount IS 'Partial deposit collected upfront. Remainder due on event day.';

-- â”€â”€ booking_status_history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Append-only audit trail of all booking status changes.
CREATE TABLE public.booking_status_history (
  id         uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid                  NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status     public.booking_status NOT NULL,
  changed_by uuid                           REFERENCES public.profiles(id),
  note       text,
  created_at timestamptz           NOT NULL DEFAULT now()
);

CREATE INDEX idx_bsh_booking ON public.booking_status_history(booking_id);

COMMENT ON TABLE public.booking_status_history IS
  'Append-only log of every booking status transition. Never delete rows. Used for dispute resolution and analytics.';

-- â”€â”€ Trigger: auto-append status history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_status_history
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();

-- â”€â”€ Trigger: mark venue_availability as reserved on booking approve â”€â”€
CREATE OR REPLACE FUNCTION public.sync_availability_on_booking()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    INSERT INTO public.venue_availability (venue_id, date, status)
    VALUES (NEW.venue_id, NEW.event_date, 'reserved')
    ON CONFLICT (venue_id, date) DO UPDATE
      SET status = 'reserved';
  END IF;

  -- Release the date if booking is cancelled/declined
  IF NEW.status IN ('cancelled', 'declined', 'expired') AND OLD.status = 'approved' THEN
    UPDATE public.venue_availability
    SET status = 'available'
    WHERE venue_id = NEW.venue_id AND date = NEW.event_date AND status = 'reserved';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_sync_availability
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_availability_on_booking();

-- â”€â”€ favorites â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.favorites (
  customer_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id    uuid        NOT NULL REFERENCES public.venues(id)    ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, venue_id)
);

CREATE INDEX idx_favorites_customer ON public.favorites(customer_id);
-- ============================================================
-- Migration 007 â€” Supplier Domain
-- ============================================================

-- â”€â”€ supplier_categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Catering, Photography, Videography, Floral, Lights & Sounds...
CREATE TABLE public.supplier_categories (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE
);

INSERT INTO public.supplier_categories (name, slug) VALUES
  ('Catering',             'catering'),
  ('Photography',          'photography'),
  ('Videography',          'videography'),
  ('Floral & Styling',     'floral-styling'),
  ('Lights & Sounds',      'lights-sounds'),
  ('Event Coordination',   'event-coordination'),
  ('Cake & Desserts',      'cake-desserts'),
  ('Hair & Makeup',        'hair-makeup'),
  ('Transportation',       'transportation'),
  ('Entertainment',        'entertainment'),
  ('Photo Booth',          'photo-booth'),
  ('Other',                'other');

-- â”€â”€ supplier_profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.supplier_profiles (
  id                   uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           uuid                        NOT NULL REFERENCES public.profiles(id),
  business_name        text                        NOT NULL,
  category_id          uuid                                 REFERENCES public.supplier_categories(id),
  description          text,
  base_price           numeric(12,2),
  price_unit           public.price_unit,
  accreditation_status public.accreditation_status NOT NULL DEFAULT 'pending',
  -- Denormalized stats (updated by trigger)
  avg_rating           numeric(3,2)                NOT NULL DEFAULT 0,
  review_count         int                         NOT NULL DEFAULT 0,
  created_at           timestamptz                 NOT NULL DEFAULT now(),
  updated_at           timestamptz                 NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_profiles_category     ON public.supplier_profiles(category_id);
CREATE INDEX idx_supplier_profiles_accreditation ON public.supplier_profiles(accreditation_status);

CREATE TRIGGER supplier_profiles_updated_at
  BEFORE UPDATE ON public.supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE  public.supplier_profiles                      IS 'Supplier / vendor business profiles. Only accredited suppliers appear in public listings.';
COMMENT ON COLUMN public.supplier_profiles.accreditation_status IS 'Set by admin after reviewing verification_requests. accredited = visible in search.';

-- â”€â”€ supplier_services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.supplier_services (
  id          uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid             NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  name        text             NOT NULL,
  description text,
  price       numeric(12,2),
  price_unit  public.price_unit,
  created_at  timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_services_supplier ON public.supplier_services(supplier_id);

COMMENT ON TABLE public.supplier_services IS
  'Individual services offered by a supplier (e.g. "Full Coverage Photography Package", "Cocktail Reception Package").';

-- â”€â”€ venue_suppliers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Accredited suppliers a venue chooses to associate with its listing
-- (shown on the venue's "Recommended Suppliers" section).
CREATE TABLE public.venue_suppliers (
  venue_id     uuid    NOT NULL REFERENCES public.venues(id)            ON DELETE CASCADE,
  supplier_id  uuid    NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  is_preferred boolean NOT NULL DEFAULT false,
  PRIMARY KEY (venue_id, supplier_id)
);

COMMENT ON TABLE public.venue_suppliers IS
  'Suppliers endorsed by the venue. is_preferred = shown first in supplier recommendations.';

-- â”€â”€ booking_suppliers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Suppliers attached to a specific confirmed booking.
-- Phase 2 feature â€” schema ready now to avoid migration overhead later.
CREATE TABLE public.booking_suppliers (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid          NOT NULL REFERENCES public.bookings(id)           ON DELETE CASCADE,
  supplier_id  uuid          NOT NULL REFERENCES public.supplier_profiles(id),
  service_id   uuid                   REFERENCES public.supplier_services(id),
  agreed_price numeric(12,2),
  status       text          NOT NULL DEFAULT 'pending',  -- pending | confirmed | cancelled
  UNIQUE (booking_id, supplier_id)
);

CREATE INDEX idx_booking_suppliers_booking  ON public.booking_suppliers(booking_id);
CREATE INDEX idx_booking_suppliers_supplier ON public.booking_suppliers(supplier_id);

COMMENT ON TABLE public.booking_suppliers IS
  'Suppliers attached to a booking. Status lifecycle: pending â†’ confirmed â†’ cancelled. Managed by venue owner.';
-- ============================================================
-- Migration 008 â€” Reviews Domain
-- ============================================================

-- â”€â”€ reviews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- One review per completed booking (enforced by UNIQUE on booking_id).
-- Multi-dimensional rating for rich filtering and analytics.
CREATE TABLE public.reviews (
  id              uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid                 NOT NULL UNIQUE REFERENCES public.bookings(id),
  customer_id     uuid                 NOT NULL REFERENCES public.profiles(id),
  venue_id        uuid                 NOT NULL REFERENCES public.venues(id),

  -- Rating dimensions (1â€“5)
  overall_rating  smallint             NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  venue_quality   smallint                      CHECK (venue_quality  BETWEEN 1 AND 5),
  cleanliness     smallint                      CHECK (cleanliness    BETWEEN 1 AND 5),
  staff_service   smallint                      CHECK (staff_service  BETWEEN 1 AND 5),
  facilities      smallint                      CHECK (facilities     BETWEEN 1 AND 5),
  accessibility   smallint                      CHECK (accessibility  BETWEEN 1 AND 5),
  value_for_money smallint                      CHECK (value_for_money BETWEEN 1 AND 5),
  food_quality    smallint                      CHECK (food_quality   BETWEEN 1 AND 5),
  ambience        smallint                      CHECK (ambience       BETWEEN 1 AND 5),

  comment         text,
  owner_reply     text,
  status          public.review_status NOT NULL DEFAULT 'published',
  created_at      timestamptz          NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_venue    ON public.reviews(venue_id, status);
CREATE INDEX idx_reviews_customer ON public.reviews(customer_id);

COMMENT ON TABLE  public.reviews               IS '1 review per completed booking. booking.status must be completed (enforced by RLS + trigger).';
COMMENT ON COLUMN public.reviews.owner_reply   IS 'Venue owner public response to the review. NULL until owner replies.';
COMMENT ON COLUMN public.reviews.overall_rating IS 'Required star rating 1â€“5. Drives avg_rating on venues table (via trigger).';

-- â”€â”€ Trigger: enforce booking must be completed before review â”€â”€
CREATE OR REPLACE FUNCTION public.check_review_eligibility()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_status public.booking_status;
  v_customer_id uuid;
BEGIN
  SELECT status, customer_id
  INTO   v_status, v_customer_id
  FROM   public.bookings
  WHERE  id = NEW.booking_id;

  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'Cannot review a booking that is not completed (current status: %)', v_status;
  END IF;

  IF v_customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the booking customer can submit a review';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_check_eligibility
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.check_review_eligibility();

-- â”€â”€ Trigger: update denormalized venue stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.update_venue_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.venues
  SET
    avg_rating   = (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM public.reviews WHERE venue_id = NEW.venue_id AND status = 'published'),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE venue_id = NEW.venue_id AND status = 'published')
  WHERE id = NEW.venue_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_update_venue_stats
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_venue_stats();

-- â”€â”€ supplier_reviews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.supplier_reviews (
  id                  uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_supplier_id uuid                 NOT NULL UNIQUE REFERENCES public.booking_suppliers(id),
  customer_id         uuid                 NOT NULL REFERENCES public.profiles(id),
  supplier_id         uuid                 NOT NULL REFERENCES public.supplier_profiles(id),
  overall_rating      smallint             NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  comment             text,
  status              public.review_status NOT NULL DEFAULT 'published',
  created_at          timestamptz          NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_reviews_supplier ON public.supplier_reviews(supplier_id, status);

-- â”€â”€ Trigger: update denormalized supplier stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.update_supplier_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.supplier_profiles
  SET
    avg_rating   = (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM public.supplier_reviews WHERE supplier_id = NEW.supplier_id AND status = 'published'),
    review_count = (SELECT COUNT(*) FROM public.supplier_reviews WHERE supplier_id = NEW.supplier_id AND status = 'published')
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER supplier_reviews_update_stats
  AFTER INSERT OR UPDATE ON public.supplier_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_supplier_stats();
-- ============================================================
-- Migration 010 â€” Admin, Commission, Payments, Verification
-- ============================================================

-- â”€â”€ commission_rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Flexible tiered commission model.
-- scope = 'global'   â†’ applies to all bookings
-- scope = 'category' â†’ reference_id = venue_categories.id
-- scope = 'venue'    â†’ reference_id = venues.id (overrides global/category)
CREATE TABLE public.commission_rules (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope          text        NOT NULL CHECK (scope IN ('global', 'category', 'venue')),
  reference_id   uuid,       -- NULL for 'global', category/venue id otherwise
  percentage     numeric(5,2), -- e.g. 10.00 = 10%
  flat_fee       numeric(12,2),
  effective_from date        NOT NULL,
  effective_to   date,       -- NULL = indefinite
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_rules_scope ON public.commission_rules(scope, reference_id, effective_from);

COMMENT ON TABLE  public.commission_rules          IS 'Tiered commission rules. Most specific rule wins (venue > category > global).';
COMMENT ON COLUMN public.commission_rules.percentage IS 'Mutually exclusive with flat_fee (use one or both â€” handled in commission-calculator edge function).';

-- â”€â”€ transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.transactions (
  id                 uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         uuid                      NOT NULL REFERENCES public.bookings(id),
  amount             numeric(12,2)             NOT NULL,
  commission_amount  numeric(12,2)             NOT NULL DEFAULT 0,
  payment_provider   public.payment_provider   NOT NULL,
  provider_reference text,                     -- PayMongo/Maya transaction ID
  status             public.transaction_status NOT NULL DEFAULT 'pending',
  created_at         timestamptz               NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_booking ON public.transactions(booking_id);
CREATE INDEX idx_transactions_status  ON public.transactions(status, created_at);

COMMENT ON TABLE  public.transactions                  IS 'Payment transactions. One booking can have multiple (deposit + final payment).';
COMMENT ON COLUMN public.transactions.provider_reference IS 'External payment gateway transaction reference for reconciliation.';

-- â”€â”€ payouts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.payouts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid                 REFERENCES public.organizations(id),
  supplier_id     uuid                 REFERENCES public.supplier_profiles(id),
  amount          numeric(12,2)        NOT NULL,
  status          text        NOT NULL DEFAULT 'scheduled',  -- scheduled | processing | paid | failed
  scheduled_at    timestamptz,
  paid_at         timestamptz,

  CONSTRAINT payouts_recipient CHECK (
    (organization_id IS NOT NULL) <> (supplier_id IS NOT NULL) -- exactly one recipient
  )
);

CREATE INDEX idx_payouts_organization ON public.payouts(organization_id, status);
CREATE INDEX idx_payouts_supplier     ON public.payouts(supplier_id,     status);

COMMENT ON TABLE public.payouts IS
  'Scheduled payouts to venue owners (via organization) or suppliers. Triggered after booking completes.';

-- â”€â”€ verification_requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Admin reviews documents submitted by venue owners and suppliers.
CREATE TABLE public.verification_requests (
  id                    uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            uuid                                 REFERENCES public.profiles(id),
  organization_id       uuid                                 REFERENCES public.organizations(id),
  type                  public.verification_type    NOT NULL,
  submitted_documents   jsonb,   -- [{ "type": "DTI", "storage_path": "..." }, ...]
  status                public.verification_status  NOT NULL DEFAULT 'pending',
  reviewed_by           uuid                                 REFERENCES public.profiles(id),
  reviewed_at           timestamptz,
  notes                 text,
  created_at            timestamptz                 NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_status ON public.verification_requests(status, created_at);

COMMENT ON TABLE public.verification_requests IS
  'Document submissions for venue owner / supplier / venue verification. Reviewed by admin.';

-- â”€â”€ Materialized view: venue monthly stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Referenced in analytics dashboards. Never aggregate from raw tables in production.
CREATE MATERIALIZED VIEW public.mv_venue_monthly_stats AS
SELECT
  b.venue_id,
  date_trunc('month', b.event_date::timestamptz) AS month,
  count(*)                                         AS booking_count,
  sum(t.amount)                                    AS revenue,
  sum(t.commission_amount)                         AS commission,
  avg(r.overall_rating)::numeric(3,2)              AS avg_rating,
  count(r.id)                                      AS review_count
FROM   public.bookings b
LEFT   JOIN public.transactions t ON t.booking_id = b.id AND t.status = 'paid'
LEFT   JOIN public.reviews      r ON r.booking_id = b.id AND r.status = 'published'
WHERE  b.status IN ('approved', 'completed')
GROUP  BY b.venue_id, date_trunc('month', b.event_date::timestamptz);

CREATE UNIQUE INDEX mv_venue_monthly_stats_pk
  ON public.mv_venue_monthly_stats(venue_id, month);

COMMENT ON MATERIALIZED VIEW public.mv_venue_monthly_stats IS
  'Pre-aggregated monthly venue stats. Refreshed nightly at 02:00 PHT via pg_cron. Use for dashboards.';

-- Nightly refresh at 02:00 PHT = 18:00 UTC
SELECT cron.schedule(
  'refresh-venue-monthly-stats',
  '0 18 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_venue_monthly_stats$$
);

-- Auto-expire pending bookings after 48 hours
SELECT cron.schedule(
  'expire-pending-bookings',
  '*/30 * * * *',  -- every 30 minutes
  $$
    UPDATE public.bookings
    SET    status = 'expired', updated_at = now()
    WHERE  status = 'pending'
      AND  created_at < now() - INTERVAL '48 hours';
  $$
);
-- ============================================================
-- Migration 009 â€” AI Domain
-- ============================================================

-- â”€â”€ venue_embeddings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.venue_embeddings (
  venue_id   uuid        PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  embedding  vector(1536),  -- OpenAI text-embedding-3-small (1536-dim)
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- IVFFlat index â€” faster build/insert than HNSW at expense of slight recall loss.
-- Switch to HNSW (see 009b comment) once index is stable and recall matters more.
-- lists = 100 â†’ good for up to ~1M rows (rule of thumb: sqrt(rows))
CREATE INDEX idx_venue_embeddings_ivfflat
  ON public.venue_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON TABLE  public.venue_embeddings           IS 'OpenAI text-embedding-3-small vectors for semantic venue search.';
COMMENT ON COLUMN public.venue_embeddings.embedding IS '1536-dim vector. Cosine similarity via <=> operator. NULL until ai-search edge function runs.';

-- â”€â”€ match_venues() RPC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Called by ai-search Edge Function after generating the query embedding.
-- Hybrid: semantic similarity + keyword tsvector (re-ranked in Edge Function).
CREATE OR REPLACE FUNCTION public.match_venues(
  query_embedding  vector(1536),
  match_threshold  float    DEFAULT 0.70,
  match_count      int      DEFAULT 20,
  filter_province  text     DEFAULT NULL,
  filter_city      text     DEFAULT NULL,
  filter_capacity  int      DEFAULT NULL,
  filter_max_price numeric  DEFAULT NULL
)
RETURNS TABLE (
  id         uuid,
  name       text,
  slug       text,
  city       text,
  base_price numeric,
  avg_rating numeric,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    v.id,
    v.name,
    v.slug,
    v.city,
    v.base_price,
    v.avg_rating,
    (1 - (ve.embedding <=> query_embedding))::float AS similarity
  FROM   public.venue_embeddings ve
  JOIN   public.venues v ON v.id = ve.venue_id
  WHERE  v.status = 'published'
    AND  (filter_province IS NULL OR lower(v.province) = lower(filter_province))
    AND  (filter_city     IS NULL OR lower(v.city)     = lower(filter_city))
    AND  (filter_capacity IS NULL OR v.capacity_max   >= filter_capacity)
    AND  (filter_max_price IS NULL OR v.base_price    <= filter_max_price)
    AND  (1 - (ve.embedding <=> query_embedding)) >= match_threshold
  ORDER  BY ve.embedding <=> query_embedding
  LIMIT  match_count;
$$;

COMMENT ON FUNCTION public.match_venues IS
  'Semantic venue search. Called from ai-search Edge Function after query is embedded. Returns published venues above similarity threshold. Re-rank with keyword tsvector in Edge Function.';

-- â”€â”€ Trigger: invalidate embedding on venue content change â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.invalidate_venue_embedding()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.name        IS DISTINCT FROM NEW.name        OR
      OLD.description IS DISTINCT FROM NEW.description OR
      OLD.city        IS DISTINCT FROM NEW.city        OR
      OLD.province    IS DISTINCT FROM NEW.province)
  THEN
    -- Set embedding to NULL to signal the ai-search Edge Function to re-embed
    UPDATE public.venue_embeddings
    SET    embedding = NULL, updated_at = now()
    WHERE  venue_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER venues_invalidate_embedding
  AFTER UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_venue_embedding();

-- â”€â”€ ai_search_logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.ai_search_logs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid                 REFERENCES public.profiles(id),
  query_text     text        NOT NULL,
  parsed_filters jsonb,       -- { "city": "Quezon City", "capacity": 200, ... }
  results_count  int,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_search_logs_user ON public.ai_search_logs(user_id);

COMMENT ON TABLE public.ai_search_logs IS
  'Logs every AI search query. Used to train recommendation engine and improve search quality.';

-- â”€â”€ ai_recommendation_events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.ai_recommendation_events (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid                 REFERENCES public.profiles(id),
  venue_id  uuid                 REFERENCES public.venues(id),
  reason    jsonb,               -- { "matched": ["budget","location","event_type"] }
  shown_at  timestamptz NOT NULL DEFAULT now(),
  clicked   boolean     NOT NULL DEFAULT false
);

CREATE INDEX idx_ai_rec_user    ON public.ai_recommendation_events(user_id);
CREATE INDEX idx_ai_rec_clicked ON public.ai_recommendation_events(clicked, shown_at);

COMMENT ON TABLE public.ai_recommendation_events IS
  'Impression + click tracking for AI-recommended venues. Clicked=true CTR signals feed recommendation quality monitoring.';

-- â”€â”€ ai_generated_content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.ai_generated_content (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id       uuid                 REFERENCES public.venues(id),
  content_type   text        NOT NULL, -- 'description' | 'seo_meta' | 'package_description'
  prompt         text,
  generated_text text,
  status         text        NOT NULL DEFAULT 'draft', -- 'draft' | 'approved' | 'rejected'
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_content_venue ON public.ai_generated_content(venue_id, content_type);

-- â”€â”€ ai_conversations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.ai_conversations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid                 REFERENCES public.profiles(id),
  session_id text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id);

CREATE TABLE public.ai_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);
-- ============================================================
-- Migration 011 â€” Notifications & Audit
-- ============================================================

-- â”€â”€ notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.notifications (
  id         uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid                        NOT NULL REFERENCES public.profiles(id),
  channel    public.notification_channel NOT NULL DEFAULT 'in_app',
  title      text                        NOT NULL,
  body       text,
  link       text,
  is_read    boolean                     NOT NULL DEFAULT false,
  created_at timestamptz                 NOT NULL DEFAULT now()
);

-- Partial index: unread-first query is the most common access pattern
CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- Enable Realtime for in-app notification badge updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

COMMENT ON TABLE public.notifications IS
  'In-app notifications. Channel drives delivery logic in booking-notifications Edge Function. All channels write a row here for the notification history feed.';

-- â”€â”€ audit_logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Append-only. Records every significant action for compliance and debugging.
CREATE TABLE public.audit_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid                 REFERENCES public.profiles(id),
  action      text        NOT NULL,      -- e.g. 'venue.approved', 'booking.cancelled'
  entity_type text        NOT NULL,      -- e.g. 'venue', 'booking', 'user'
  entity_id   uuid,
  metadata    jsonb,                     -- { "old_status": "pending", "new_status": "approved" }
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor  ON public.audit_logs(actor_id, created_at DESC);

COMMENT ON TABLE public.audit_logs IS
  'Append-only audit trail. Never update or delete rows. Used for compliance, dispute resolution, and debugging.';

-- â”€â”€ Generic audit logging function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Call from application layer: SELECT log_audit('venue.approved', 'venue', venue_id, '{"old": "pending"}');
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid    DEFAULT NULL,
  p_metadata    jsonb   DEFAULT NULL
)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
$$;
-- ============================================================
-- Migration 012 â€” Row Level Security (Complete)
-- ============================================================
-- Role access is determined by public.user_roles (many-to-many).
-- Role checks go through security definer helper functions.
-- Ownership is resolved through organization_members.
-- Admins get an explicit bypass policy per table.
-- Policy naming: "<table>.<operation>.<actor>"
-- ============================================================

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- PROFILES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles.select.public"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles.update.self"
  ON public.profiles FOR UPDATE
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles.all.admin"
  ON public.profiles FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- USER_ROLES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles.select.self"
  ON public.user_roles FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_roles.insert.self"
  ON public.user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid() AND role <> 'admin');

CREATE POLICY "user_roles.all.admin"
  ON public.user_roles FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- ORGANIZATIONS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations.select.member"
  ON public.organizations FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.is_org_member(id)
  );

CREATE POLICY "organizations.insert.venue_owner"
  ON public.organizations FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND public.has_role('venue_owner')
  );

CREATE POLICY "organizations.update.owner"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "organizations.all.admin"
  ON public.organizations FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- ORGANIZATION_MEMBERS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members.select.member"
  ON public.organization_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_org_owner(organization_id)
  );

CREATE POLICY "org_members.insert.org_owner"
  ON public.organization_members FOR INSERT
  WITH CHECK (public.is_org_owner(organization_id));

CREATE POLICY "org_members.delete.org_owner"
  ON public.organization_members FOR DELETE
  USING (public.is_org_owner(organization_id));

CREATE POLICY "org_members.all.admin"
  ON public.organization_members FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- VENUE LOOKUP TABLES (public read-only)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.venue_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_categories.select.all" ON public.venue_categories FOR SELECT USING (true);
CREATE POLICY "venue_categories.all.admin"  ON public.venue_categories FOR ALL  USING (public.is_admin());

ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_types.select.all" ON public.event_types FOR SELECT USING (true);
CREATE POLICY "event_types.all.admin"  ON public.event_types FOR ALL  USING (public.is_admin());

ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amenities.select.all" ON public.amenities FOR SELECT USING (true);
CREATE POLICY "amenities.all.admin"  ON public.amenities FOR ALL  USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- VENUES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_published_venues"
  ON public.venues FOR SELECT USING (status = 'published');

CREATE POLICY "org_members_manage_own_venues"
  ON public.venues FOR ALL
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "admin_full_access_venues"
  ON public.venues FOR ALL USING (public.is_admin());

-- Junction tables inherit venue access
ALTER TABLE public.venue_category_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_cat.select.all"   ON public.venue_category_assignments FOR SELECT USING (true);
CREATE POLICY "venue_cat.all.owner"    ON public.venue_category_assignments FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_cat.all.admin"    ON public.venue_category_assignments FOR ALL USING (public.is_admin());

ALTER TABLE public.venue_event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_et.select.all"   ON public.venue_event_types FOR SELECT USING (true);
CREATE POLICY "venue_et.all.owner"    ON public.venue_event_types FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_et.all.admin"    ON public.venue_event_types FOR ALL USING (public.is_admin());

ALTER TABLE public.venue_amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_am.select.all"   ON public.venue_amenities FOR SELECT USING (true);
CREATE POLICY "venue_am.all.owner"    ON public.venue_amenities FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_am.all.admin"    ON public.venue_amenities FOR ALL USING (public.is_admin());

ALTER TABLE public.venue_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_img.select.all"   ON public.venue_images FOR SELECT USING (true);
CREATE POLICY "venue_img.all.owner"    ON public.venue_images FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_img.all.admin"    ON public.venue_images FOR ALL USING (public.is_admin());

ALTER TABLE public.venue_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_pkg.select.all"   ON public.venue_packages FOR SELECT USING (true);
CREATE POLICY "venue_pkg.all.owner"    ON public.venue_packages FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_pkg.all.admin"    ON public.venue_packages FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- VENUE_AVAILABILITY
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.venue_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avail.select.all"   ON public.venue_availability FOR SELECT USING (true);
CREATE POLICY "avail.all.owner"    ON public.venue_availability FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "avail.all.admin"    ON public.venue_availability FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- INQUIRIES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inquiries.select.customer" ON public.inquiries FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "inquiries.select.owner"    ON public.inquiries FOR SELECT USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "inquiries.insert.customer" ON public.inquiries FOR INSERT WITH CHECK (customer_id = auth.uid() AND public.has_role('customer'));
CREATE POLICY "inquiries.update.owner"    ON public.inquiries FOR UPDATE USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "inquiries.all.admin"       ON public.inquiries FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- BOOKINGS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_view_own_bookings"
  ON public.bookings FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "customers_create_bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (customer_id = auth.uid() AND public.has_role('customer'));

-- Customer: cancel own pending booking
CREATE POLICY "customers_cancel_own_booking"
  ON public.bookings FOR UPDATE
  USING (customer_id = auth.uid() AND status = 'pending')
  WITH CHECK (customer_id = auth.uid() AND status = 'cancelled');

CREATE POLICY "venue_org_manages_bookings"
  ON public.bookings FOR ALL
  USING (public.is_org_member_for_venue(venue_id));

CREATE POLICY "admin_full_access_bookings"
  ON public.bookings FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- BOOKING_STATUS_HISTORY
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bsh.select.customer" ON public.booking_status_history FOR SELECT USING (public.is_booking_customer(booking_id));
CREATE POLICY "bsh.select.owner"    ON public.booking_status_history FOR SELECT USING (public.is_org_member_for_booking(booking_id));
CREATE POLICY "bsh.all.admin"       ON public.booking_status_history FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- FAVORITES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites.all.customer"
  ON public.favorites FOR ALL
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SUPPLIERS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_cat.select.all" ON public.supplier_categories FOR SELECT USING (true);
CREATE POLICY "sup_cat.all.admin"  ON public.supplier_categories FOR ALL USING (public.is_admin());

ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_profiles.select.accredited" ON public.supplier_profiles FOR SELECT USING (accreditation_status = 'accredited');
CREATE POLICY "sup_profiles.select.self"       ON public.supplier_profiles FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "sup_profiles.insert.supplier"   ON public.supplier_profiles FOR INSERT WITH CHECK (profile_id = auth.uid() AND public.has_role('supplier'));
CREATE POLICY "sup_profiles.update.self"       ON public.supplier_profiles FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "sup_profiles.all.admin"         ON public.supplier_profiles FOR ALL USING (public.is_admin());

ALTER TABLE public.supplier_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_services.select.all"   ON public.supplier_services FOR SELECT USING (true);
CREATE POLICY "sup_services.all.self"     ON public.supplier_services FOR ALL USING (public.is_supplier_owner(supplier_id));
CREATE POLICY "sup_services.all.admin"    ON public.supplier_services FOR ALL USING (public.is_admin());

ALTER TABLE public.venue_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_sup.select.all"   ON public.venue_suppliers FOR SELECT USING (true);
CREATE POLICY "venue_sup.all.owner"    ON public.venue_suppliers FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_sup.all.admin"    ON public.venue_suppliers FOR ALL USING (public.is_admin());

ALTER TABLE public.booking_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_sup.select.customer" ON public.booking_suppliers FOR SELECT USING (public.is_booking_customer(booking_id));
CREATE POLICY "booking_sup.select.owner"    ON public.booking_suppliers FOR SELECT USING (public.is_org_member_for_booking(booking_id));
CREATE POLICY "booking_sup.select.supplier" ON public.booking_suppliers FOR SELECT USING (public.is_supplier_owner(supplier_id));
CREATE POLICY "booking_sup.all.owner"       ON public.booking_suppliers FOR ALL USING (public.is_org_member_for_booking(booking_id));
CREATE POLICY "booking_sup.all.admin"       ON public.booking_suppliers FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- REVIEWS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews.select.published" ON public.reviews FOR SELECT USING (status = 'published');
CREATE POLICY "reviews.select.self"      ON public.reviews FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "reviews.insert.customer"  ON public.reviews FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "reviews.update.self"      ON public.reviews FOR UPDATE USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
CREATE POLICY "reviews.update.owner_reply" ON public.reviews FOR UPDATE USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "reviews.all.admin"        ON public.reviews FOR ALL USING (public.is_admin());

ALTER TABLE public.supplier_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_reviews.select.published" ON public.supplier_reviews FOR SELECT USING (status = 'published');
CREATE POLICY "sup_reviews.select.self"      ON public.supplier_reviews FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "sup_reviews.insert.customer"  ON public.supplier_reviews FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "sup_reviews.all.admin"        ON public.supplier_reviews FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- AI TABLES (service_role / Edge Functions only)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.venue_embeddings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_content     ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_content.select.owner" ON public.ai_generated_content FOR SELECT USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "ai_content.all.admin"    ON public.ai_generated_content FOR ALL USING (public.is_admin());

ALTER TABLE public.ai_search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_logs.select.self"  ON public.ai_search_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ai_logs.all.admin"    ON public.ai_search_logs FOR ALL USING (public.is_admin());

ALTER TABLE public.ai_recommendation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_rec.select.self" ON public.ai_recommendation_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ai_rec.all.admin"   ON public.ai_recommendation_events FOR ALL USING (public.is_admin());

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_conv.all.self"  ON public.ai_conversations FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ai_conv.all.admin" ON public.ai_conversations FOR ALL USING (public.is_admin());

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_msg.all.participant" ON public.ai_messages FOR ALL USING (public.is_conversation_participant(conversation_id));

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- ADMIN / PAYMENTS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.commission_rules     ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission.select.owner" ON public.commission_rules FOR SELECT USING (scope = 'venue' AND public.is_org_member_for_venue(reference_id));
CREATE POLICY "commission.all.admin"    ON public.commission_rules FOR ALL USING (public.is_admin());

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions.select.customer" ON public.transactions FOR SELECT USING (public.is_booking_customer(booking_id));
CREATE POLICY "transactions.select.owner"    ON public.transactions FOR SELECT USING (public.is_org_member_for_booking(booking_id));
CREATE POLICY "transactions.all.admin"       ON public.transactions FOR ALL USING (public.is_admin());

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts.select.org_owner" ON public.payouts FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "payouts.select.supplier"  ON public.payouts FOR SELECT USING (public.is_supplier_owner(supplier_id));
CREATE POLICY "payouts.all.admin"        ON public.payouts FOR ALL USING (public.is_admin());

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verif.select.self"  ON public.verification_requests FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "verif.insert.self"  ON public.verification_requests FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "verif.all.admin"    ON public.verification_requests FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- NOTIFICATIONS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif.all.self"  ON public.notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif.all.admin" ON public.notifications FOR ALL USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- AUDIT_LOGS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit.select.admin" ON public.audit_logs FOR SELECT USING (public.is_admin());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- VENUE_ANALYTICS (materialized view access control function)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.get_venue_analytics(
  p_venue_id    uuid,
  p_from        date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_to          date DEFAULT CURRENT_DATE,
  p_granularity text DEFAULT 'day'
)
RETURNS TABLE (
  period         timestamptz,
  booking_count  bigint,
  revenue        numeric,
  commission     numeric,
  avg_rating     numeric
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    date_trunc(p_granularity, vad.month) AS period,
    sum(vad.booking_count)::bigint         AS booking_count,
    sum(vad.revenue)                       AS revenue,
    sum(vad.commission)                    AS commission,
    avg(vad.avg_rating)::numeric(3,1)      AS avg_rating
  FROM   public.mv_venue_monthly_stats vad
  WHERE  vad.venue_id = p_venue_id
    AND  vad.month::date BETWEEN p_from AND p_to
    AND  (
      public.is_org_member_for_venue(p_venue_id) OR public.is_admin()
    )
  GROUP  BY date_trunc(p_granularity, vad.month)
  ORDER  BY 1;
$$;
-- ============================================================
-- Migration 012 â€” Storage Buckets & Policies
-- ============================================================
-- Buckets:
--   venue-images         public  â€” venue photos & videos
--   avatars              public  â€” user profile pictures
--   verification-docs    private â€” DTI/BIR/SEC docs for admin review
-- ============================================================

-- â”€â”€ Buckets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'venue-images',
    'venue-images',
    true,
    52428800,  -- 50 MB
    ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime']
  ),
  (
    'avatars',
    'avatars',
    true,
    5242880,   -- 5 MB
    ARRAY['image/jpeg','image/png','image/webp']
  ),
  (
    'verification-docs',
    'verification-docs',
    false,
    20971520,  -- 20 MB
    ARRAY['image/jpeg','image/png','image/webp','application/pdf']
  )
ON CONFLICT (id) DO NOTHING;

-- â”€â”€ Storage RLS Policies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Storage policies live in storage.objects, not public.*
-- Naming: "<bucket>.<operation>.<actor>"

-- â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
-- â”‚ venue-images bucket                                         â”‚
-- â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

-- Anyone can view public venue images
CREATE POLICY "venue-images.select.public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'venue-images');

-- Authenticated venue owners/coordinators can upload
-- Path convention: {organization_id}/{venue_id}/{filename}
CREATE POLICY "venue-images.insert.venue-owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'venue-images'
    AND auth.role() = 'authenticated'
    AND public.has_role('venue_owner') OR public.has_role('event_coordinator') OR public.is_admin()
  );

-- Only the uploader's org or admin can update
CREATE POLICY "venue-images.update.venue-owner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'venue-images'
    AND auth.role() = 'authenticated'
    AND (public.has_role('venue_owner') OR public.has_role('event_coordinator') OR public.is_admin())
  );

-- Only the uploader's org or admin can delete
CREATE POLICY "venue-images.delete.venue-owner"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'venue-images'
    AND auth.role() = 'authenticated'
    AND (public.has_role('venue_owner') OR public.has_role('event_coordinator') OR public.is_admin())
  );

-- â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
-- â”‚ avatars bucket                                              â”‚
-- â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

-- Anyone can view avatars (public bucket)
CREATE POLICY "avatars.select.public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar
-- Path convention: {user_id}/{filename}
CREATE POLICY "avatars.insert.self"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/replace only their own avatar
CREATE POLICY "avatars.update.self"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete only their own avatar
CREATE POLICY "avatars.delete.self"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
-- â”‚ verification-docs bucket (private)                          â”‚
-- â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

-- Only the uploader (venue owner / supplier) or admin can view their own docs
-- Path convention: {user_id}/{filename}
CREATE POLICY "verification-docs.select.owner-or-admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- Venue owners and suppliers can upload verification documents
CREATE POLICY "verification-docs.insert.owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (public.has_role('venue_owner') OR public.has_role('supplier'))
  );

-- Users can replace only their own docs
CREATE POLICY "verification-docs.update.owner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete only their own docs; admin can delete any
CREATE POLICY "verification-docs.delete.owner-or-admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

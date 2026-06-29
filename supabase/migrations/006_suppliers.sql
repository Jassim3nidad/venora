-- ============================================================
-- Migration 007 — Supplier Domain
-- ============================================================

-- ── supplier_categories ────────────────────────────────────────
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

-- ── supplier_profiles ─────────────────────────────────────────
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

-- ── supplier_services ─────────────────────────────────────────
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

-- ── venue_suppliers ────────────────────────────────────────────
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

-- ── booking_suppliers ─────────────────────────────────────────
-- Suppliers attached to a specific confirmed booking.
-- Phase 2 feature — schema ready now to avoid migration overhead later.
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
  'Suppliers attached to a booking. Status lifecycle: pending → confirmed → cancelled. Managed by venue owner.';

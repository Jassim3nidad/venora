-- ============================================================
-- Migration 023 - Supplier Marketplace Expansion
-- ============================================================
-- Adds public marketplace metadata, portfolio assets, richer packages,
-- and contact-request workflow for accredited supplier discovery.

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS service_areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coverage_radius_km int,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS response_time_hours int NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS years_in_business int,
  ADD COLUMN IF NOT EXISTS team_size int,
  ADD COLUMN IF NOT EXISTS minimum_booking_notice_days int NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

UPDATE public.supplier_profiles
SET slug = concat(
  lower(regexp_replace(regexp_replace(business_name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')),
  '-',
  left(id::text, 8)
)
WHERE slug IS NULL;

ALTER TABLE public.supplier_profiles
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_profiles_slug
  ON public.supplier_profiles(slug);

CREATE INDEX IF NOT EXISTS idx_supplier_profiles_featured
  ON public.supplier_profiles(is_featured, accreditation_status);

CREATE INDEX IF NOT EXISTS idx_supplier_profiles_service_areas
  ON public.supplier_profiles USING gin(service_areas);

ALTER TABLE public.supplier_profiles
  ADD CONSTRAINT supplier_profiles_response_time_nonnegative
  CHECK (response_time_hours >= 0),
  ADD CONSTRAINT supplier_profiles_years_nonnegative
  CHECK (years_in_business IS NULL OR years_in_business >= 0),
  ADD CONSTRAINT supplier_profiles_team_size_positive
  CHECK (team_size IS NULL OR team_size > 0),
  ADD CONSTRAINT supplier_profiles_booking_notice_nonnegative
  CHECK (minimum_booking_notice_days >= 0),
  ADD CONSTRAINT supplier_profiles_coverage_radius_nonnegative
  CHECK (coverage_radius_km IS NULL OR coverage_radius_km >= 0);

COMMENT ON COLUMN public.supplier_profiles.slug IS 'Public URL slug for /suppliers/[slug].';
COMMENT ON COLUMN public.supplier_profiles.service_areas IS 'Human-readable cities, provinces, or regions served by the supplier.';
COMMENT ON COLUMN public.supplier_profiles.is_featured IS 'Editorial/admin boost for marketplace sorting.';

ALTER TABLE public.supplier_services
  ADD COLUMN IF NOT EXISTS package_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS inclusions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_guests int,
  ADD COLUMN IF NOT EXISTS max_guests int,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER supplier_services_updated_at
  BEFORE UPDATE ON public.supplier_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_supplier_services_active
  ON public.supplier_services(supplier_id, is_active, sort_order);

ALTER TABLE public.supplier_services
  ADD CONSTRAINT supplier_services_min_guests_positive
  CHECK (min_guests IS NULL OR min_guests > 0),
  ADD CONSTRAINT supplier_services_max_guests_positive
  CHECK (max_guests IS NULL OR max_guests > 0),
  ADD CONSTRAINT supplier_services_guest_range_valid
  CHECK (min_guests IS NULL OR max_guests IS NULL OR max_guests >= min_guests);

COMMENT ON COLUMN public.supplier_services.package_type IS
  'Package positioning such as standard, premium, full_service, add_on.';
COMMENT ON COLUMN public.supplier_services.inclusions IS
  'Package inclusions shown in marketplace pricing cards.';

CREATE TABLE IF NOT EXISTS public.supplier_portfolio_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid        NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  image_url   text        NOT NULL,
  event_type  text,
  city        text,
  province    text,
  event_date  date,
  is_featured boolean     NOT NULL DEFAULT false,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_portfolio_supplier
  ON public.supplier_portfolio_items(supplier_id, is_featured, sort_order);

CREATE TRIGGER supplier_portfolio_items_updated_at
  BEFORE UPDATE ON public.supplier_portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.supplier_portfolio_items IS
  'Public supplier work samples shown on supplier profile pages.';

CREATE TABLE IF NOT EXISTS public.supplier_contact_requests (
  id             uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id    uuid                  NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  service_id     uuid                           REFERENCES public.supplier_services(id) ON DELETE SET NULL,
  customer_id    uuid                           REFERENCES public.profiles(id),
  contact_name   text                  NOT NULL,
  contact_email  text                  NOT NULL,
  contact_phone  text,
  event_date     date,
  event_location text,
  guest_count    int,
  message        text                  NOT NULL,
  status         public.inquiry_status NOT NULL DEFAULT 'new',
  created_at     timestamptz           NOT NULL DEFAULT now(),
  updated_at     timestamptz           NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_contact_requests_supplier
  ON public.supplier_contact_requests(supplier_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_contact_requests_customer
  ON public.supplier_contact_requests(customer_id, created_at DESC);

CREATE TRIGGER supplier_contact_requests_updated_at
  BEFORE UPDATE ON public.supplier_contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.supplier_contact_requests
  ADD CONSTRAINT supplier_contact_requests_guest_count_positive
  CHECK (guest_count IS NULL OR guest_count > 0);

COMMENT ON TABLE public.supplier_contact_requests IS
  'Customer inquiry workflow for contacting accredited suppliers directly from marketplace pages.';

ALTER TABLE public.supplier_portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sup_portfolio.select.accredited"
  ON public.supplier_portfolio_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.supplier_profiles sp
      WHERE sp.id = supplier_id
        AND sp.accreditation_status = 'accredited'
    )
  );

CREATE POLICY "sup_portfolio.all.self"
  ON public.supplier_portfolio_items FOR ALL
  USING (public.is_supplier_owner(supplier_id))
  WITH CHECK (public.is_supplier_owner(supplier_id));

CREATE POLICY "sup_portfolio.all.admin"
  ON public.supplier_portfolio_items FOR ALL
  USING (public.is_admin());

ALTER TABLE public.supplier_contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sup_contact.select.customer"
  ON public.supplier_contact_requests FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "sup_contact.select.supplier"
  ON public.supplier_contact_requests FOR SELECT
  USING (public.is_supplier_owner(supplier_id));

CREATE POLICY "sup_contact.insert.customer"
  ON public.supplier_contact_requests FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND public.has_role('customer')
    AND EXISTS (
      SELECT 1
      FROM public.supplier_profiles sp
      WHERE sp.id = supplier_id
        AND sp.accreditation_status = 'accredited'
    )
  );

CREATE POLICY "sup_contact.update.supplier"
  ON public.supplier_contact_requests FOR UPDATE
  USING (public.is_supplier_owner(supplier_id))
  WITH CHECK (public.is_supplier_owner(supplier_id));

CREATE POLICY "sup_contact.all.admin"
  ON public.supplier_contact_requests FOR ALL
  USING (public.is_admin());

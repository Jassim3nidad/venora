-- Migration: 20260724_venue_package_enhancements.sql
-- Description: Extend venue_packages with event type, deposit, availability,
--              amenities, venue rules; and add package_suppliers junction table.

BEGIN;

-- 1. Extend venue_packages
ALTER TABLE public.venue_packages
  ADD COLUMN IF NOT EXISTS event_type_id     UUID REFERENCES public.event_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deposit_percentage NUMERIC(5,2)   CHECK (deposit_percentage BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS deposit_flat_amount NUMERIC(12,2) CHECK (deposit_flat_amount >= 0),
  ADD COLUMN IF NOT EXISTS valid_from        DATE,
  ADD COLUMN IF NOT EXISTS valid_until       DATE,
  ADD COLUMN IF NOT EXISTS amenity_ids       UUID[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS venue_rules       TEXT;

COMMENT ON COLUMN public.venue_packages.event_type_id      IS 'Primary event type this package is designed for.';
COMMENT ON COLUMN public.venue_packages.deposit_percentage IS 'Deposit required as a percentage of total price (0-100). Mutually exclusive with flat.';
COMMENT ON COLUMN public.venue_packages.deposit_flat_amount IS 'Alternative flat deposit amount.';
COMMENT ON COLUMN public.venue_packages.valid_from         IS 'Earliest date this package can be booked for.';
COMMENT ON COLUMN public.venue_packages.valid_until        IS 'Latest date this package can be booked for.';
COMMENT ON COLUMN public.venue_packages.amenity_ids        IS 'Denormalized IDs of amenities included in this package.';
COMMENT ON COLUMN public.venue_packages.venue_rules        IS 'Package-specific rules shown to customers during booking.';

-- 2. package_suppliers junction table
CREATE TABLE IF NOT EXISTS public.package_suppliers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id   UUID NOT NULL REFERENCES public.venue_packages(id)        ON DELETE CASCADE,
  supplier_id  UUID NOT NULL REFERENCES public.supplier_profiles(id)     ON DELETE CASCADE,
  agreement_id UUID          REFERENCES public.venue_supplier_agreements(id) ON DELETE SET NULL,
  -- Snapshot of agreed pricing at package creation time
  included_price NUMERIC(12,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (package_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_package_suppliers_package  ON public.package_suppliers(package_id);
CREATE INDEX IF NOT EXISTS idx_package_suppliers_supplier ON public.package_suppliers(supplier_id);

COMMENT ON TABLE public.package_suppliers IS
  'Suppliers included in a venue package. Priced from their active commercial agreement at package creation time.';

-- 3. RLS for package_suppliers
ALTER TABLE public.package_suppliers ENABLE ROW LEVEL SECURITY;

-- Venue owners can manage their package's suppliers
DROP POLICY IF EXISTS "Venue owners can manage package suppliers" ON public.package_suppliers;
CREATE POLICY "Venue owners can manage package suppliers"
  ON public.package_suppliers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_packages vp
      JOIN public.venues v ON v.id = vp.venue_id
      JOIN public.organization_members om ON om.organization_id = v.organization_id
      WHERE vp.id = package_suppliers.package_id
        AND om.user_id = auth.uid()
    )
  );

-- Suppliers can view packages they're included in
DROP POLICY IF EXISTS "Suppliers can view their package inclusions" ON public.package_suppliers;
CREATE POLICY "Suppliers can view their package inclusions"
  ON public.package_suppliers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles sp
      WHERE sp.id = package_suppliers.supplier_id
        AND sp.profile_id = auth.uid()
    )
  );

-- Public can view package suppliers (for customer-facing package pages)
DROP POLICY IF EXISTS "Public can view package suppliers" ON public.package_suppliers;
CREATE POLICY "Public can view package suppliers"
  ON public.package_suppliers FOR SELECT
  USING (true);

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage all package suppliers" ON public.package_suppliers;
CREATE POLICY "Admins can manage all package suppliers"
  ON public.package_suppliers FOR ALL TO authenticated
  USING (public.is_admin());

COMMIT;

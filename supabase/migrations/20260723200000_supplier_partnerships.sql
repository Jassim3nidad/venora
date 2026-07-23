-- Migration: 20260723200000_supplier_partnerships.sql
-- Description: Expand venue_suppliers to support supplier-initiated workflow

BEGIN;

-- 1. Create Partnership Status Enum
DO $$ BEGIN
  CREATE TYPE public.partnership_status AS ENUM (
    'invited',
    'application_submitted',
    'under_review',
    'active',
    'paused',
    'ended',
    'suspended'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Alter venue_suppliers
-- Since the table only had (venue_id, supplier_id, is_preferred) as PK,
-- we'll add an 'id' column, drop the old PK, add 'id' as PK, and recreate the unique constraint.
ALTER TABLE public.venue_suppliers DROP CONSTRAINT IF EXISTS venue_suppliers_pkey;
ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.venue_suppliers ADD PRIMARY KEY (id);
ALTER TABLE public.venue_suppliers ADD CONSTRAINT unique_venue_supplier_assoc UNIQUE (venue_id, supplier_id);

ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS status public.partnership_status NOT NULL DEFAULT 'application_submitted';
-- Backfill existing rows to active (they were immediate partnerships)
UPDATE public.venue_suppliers SET status = 'active' WHERE status = 'application_submitted';

ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS approved_services UUID[] DEFAULT '{}'::UUID[];
ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS service_categories TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS service_areas TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS commercial_terms TEXT;
ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Add Updated At Trigger
DROP TRIGGER IF EXISTS venue_suppliers_updated_at ON public.venue_suppliers;
CREATE TRIGGER venue_suppliers_updated_at
  BEFORE UPDATE ON public.venue_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. RLS Policies
-- venue_suppliers already has ROW LEVEL SECURITY enabled from 010_rls.sql (venue_sup.all.owner, etc).
-- Wait, let's drop the existing overly permissive policies and recreate explicit ones for the new flow.
DROP POLICY IF EXISTS "venue_sup.select.all" ON public.venue_suppliers;
DROP POLICY IF EXISTS "venue_sup.all.owner" ON public.venue_suppliers;
DROP POLICY IF EXISTS "venue_sup.all.admin" ON public.venue_suppliers;
DROP POLICY IF EXISTS "Public can view active venue supplier associations" ON public.venue_suppliers;
DROP POLICY IF EXISTS "Venue owners and coordinators can manage venue suppliers" ON public.venue_suppliers;

-- Public can view active partnerships
CREATE POLICY "Public can view active partnerships"
  ON public.venue_suppliers FOR SELECT
  USING (status = 'active');

-- Suppliers can view their own requests and partnerships
CREATE POLICY "Suppliers can view their own partnerships"
  ON public.venue_suppliers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = venue_suppliers.supplier_id AND s.user_id = auth.uid()
    )
  );

-- Suppliers can insert partnership requests
CREATE POLICY "Suppliers can insert partnership requests"
  ON public.venue_suppliers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = venue_suppliers.supplier_id AND s.user_id = auth.uid()
    )
  );

-- Suppliers can update their own partnerships (e.g. accepting invites, updating commercial terms during negotiations)
CREATE POLICY "Suppliers can update their own partnerships"
  ON public.venue_suppliers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = venue_suppliers.supplier_id AND s.user_id = auth.uid()
    )
  );

-- Venue Coordinators/Owners can manage venue_suppliers
CREATE POLICY "Venue owners can manage their venues' partnerships"
  ON public.venue_suppliers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      JOIN public.organization_members om ON om.organization_id = v.organization_id
      WHERE v.id = venue_suppliers.venue_id AND om.user_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all venue_suppliers"
  ON public.venue_suppliers FOR ALL TO authenticated
  USING (public.is_admin());

COMMIT;

-- Migration: 20260723300000_supplier_agreements.sql
-- Description: Create venue_supplier_agreements table for structured commercial terms

BEGIN;

DO $$ BEGIN
  CREATE TYPE public.agreement_status AS ENUM (
    'draft',
    'proposed',
    'active',
    'rejected',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.venue_supplier_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.supplier_services(id) ON DELETE SET NULL,
  custom_service_name TEXT,
  
  -- Financial Terms
  supplier_base_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  venue_markup_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_rate NUMERIC(12,2),
  travel_fees NUMERIC(12,2),
  
  -- Operational Terms
  max_guest_count INT,
  required_lead_time_days INT,
  setup_requirements TEXT,
  cancellation_terms TEXT,
  rescheduling_terms TEXT,
  commission_treatment TEXT,
  
  -- Lifecycle
  valid_from DATE,
  valid_until DATE,
  status public.agreement_status NOT NULL DEFAULT 'proposed',
  proposed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint to ensure we have either a service_id or a custom_service_name
ALTER TABLE public.venue_supplier_agreements 
  ADD CONSTRAINT has_service_identifier 
  CHECK (service_id IS NOT NULL OR custom_service_name IS NOT NULL);

-- Add Updated At Trigger
DROP TRIGGER IF EXISTS venue_supplier_agreements_updated_at ON public.venue_supplier_agreements;
CREATE TRIGGER venue_supplier_agreements_updated_at
  BEFORE UPDATE ON public.venue_supplier_agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
ALTER TABLE public.venue_supplier_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Venue owners can manage their agreements" ON public.venue_supplier_agreements;
CREATE POLICY "Venue owners can manage their agreements"
  ON public.venue_supplier_agreements FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      JOIN public.organization_members om ON om.organization_id = v.organization_id
      WHERE v.id = venue_supplier_agreements.venue_id AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Suppliers can view and update their agreements" ON public.venue_supplier_agreements;
CREATE POLICY "Suppliers can view and update their agreements"
  ON public.venue_supplier_agreements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = venue_supplier_agreements.supplier_id AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can update agreement status"
  ON public.venue_supplier_agreements FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = venue_supplier_agreements.supplier_id AND s.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = venue_supplier_agreements.supplier_id AND s.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all agreements" ON public.venue_supplier_agreements;
CREATE POLICY "Admins can manage all agreements"
  ON public.venue_supplier_agreements FOR ALL TO authenticated
  USING (public.is_admin());

COMMIT;

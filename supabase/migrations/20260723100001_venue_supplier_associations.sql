-- Migration: 20260723100001_venue_supplier_associations.sql
-- Description: Venue-to-Supplier associations table and RLS policies

BEGIN;

CREATE TABLE IF NOT EXISTS public.venue_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'declined', 'suspended', 'removed')) DEFAULT 'pending',
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_venue_supplier_assoc UNIQUE (venue_id, supplier_id)
);

ALTER TABLE public.venue_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active venue supplier associations"
  ON public.venue_suppliers FOR SELECT
  USING (status = 'active' OR auth.uid() IS NOT NULL);

CREATE POLICY "Venue owners and coordinators can manage venue suppliers"
  ON public.venue_suppliers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      JOIN public.organization_members om ON om.organization_id = v.organization_id
      WHERE v.id = venue_suppliers.venue_id AND om.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = venue_suppliers.supplier_id AND s.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

COMMIT;

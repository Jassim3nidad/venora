-- Migration: 20260723100002_booking_supplier_assignments.sql
-- Description: Booking supplier assignments table and RLS policies

BEGIN;

CREATE TABLE IF NOT EXISTS public.booking_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  service_category TEXT,
  agreed_price NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL CHECK (status IN ('proposed', 'requested', 'quoted', 'selected', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'proposed',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_booking_supplier_assignment UNIQUE (booking_id, supplier_id)
);

ALTER TABLE public.booking_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized participants can view booking suppliers"
  ON public.booking_suppliers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_suppliers.booking_id AND (
        b.customer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = b.organization_id AND om.user_id = auth.uid()
        )
      )
    ) OR
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = booking_suppliers.supplier_id AND s.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.user_role
    )
  );

CREATE POLICY "Venue staff and assigned suppliers can update booking suppliers"
  ON public.booking_suppliers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.organization_members om ON om.organization_id = b.organization_id
      WHERE b.id = booking_suppliers.booking_id AND om.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = booking_suppliers.supplier_id AND s.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.user_role
    )
  );

COMMIT;

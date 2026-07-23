-- ============================================================
-- Migration 080 — Supplier Coordination (Coordinating Accredited Suppliers)
-- ============================================================

CREATE TYPE public.supplier_coordination_status AS ENUM (
  'planned',
  'awaiting_supplier_confirmation',
  'confirmed',
  'arrival_scheduled',
  'supplier_arrived',
  'setup_in_progress',
  'ready',
  'service_in_progress',
  'completed',
  'cancelled',
  'issue_reported'
);

CREATE TABLE public.booking_supplier_coordinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.supplier_services(id) ON DELETE RESTRICT,
  inquiry_id uuid REFERENCES public.supplier_contact_requests(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.supplier_quotes(id) ON DELETE SET NULL,
  
  coordination_status public.supplier_coordination_status NOT NULL DEFAULT 'planned',
  
  -- Schedule
  arrival_at timestamptz,
  setup_start_at timestamptz,
  setup_deadline_at timestamptz,
  service_start_at timestamptz,
  service_end_at timestamptz,
  teardown_at timestamptz,
  
  -- Instructions & Notes
  venue_access_instructions text CHECK (char_length(venue_access_instructions) <= 1500),
  loading_area text CHECK (char_length(loading_area) <= 500),
  internal_notes text CHECK (char_length(internal_notes) <= 3000),
  issue_summary text CHECK (char_length(issue_summary) <= 1000),
  requires_attention boolean NOT NULL DEFAULT false,
  
  -- Audit
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  updated_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure only one active coordination per booking and service
  CONSTRAINT booking_supplier_coordinations_unique_service UNIQUE (booking_id, service_id)
);

CREATE INDEX idx_bsc_booking_id ON public.booking_supplier_coordinations(booking_id);
CREATE INDEX idx_bsc_venue_id ON public.booking_supplier_coordinations(venue_id);
CREATE INDEX idx_bsc_supplier_id ON public.booking_supplier_coordinations(supplier_id);
CREATE INDEX idx_bsc_status ON public.booking_supplier_coordinations(coordination_status);

CREATE TRIGGER booking_supplier_coordinations_updated_at
  BEFORE UPDATE ON public.booking_supplier_coordinations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.booking_supplier_coordinations ENABLE ROW LEVEL SECURITY;

-- Select policies
-- Venue owners can view for their venues
CREATE POLICY "bsc.select.owner" 
  ON public.booking_supplier_coordinations FOR SELECT
  USING (public.is_org_member_for_venue(venue_id));

-- Suppliers can view for their own supplier account
CREATE POLICY "bsc.select.supplier"
  ON public.booking_supplier_coordinations FOR SELECT
  USING (public.is_supplier_owner(supplier_id));

-- Customers can view for their own bookings
CREATE POLICY "bsc.select.customer"
  ON public.booking_supplier_coordinations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.customer_id = auth.uid()
    )
  );

-- Admins can view all
CREATE POLICY "bsc.all.admin"
  ON public.booking_supplier_coordinations FOR ALL
  USING (public.is_admin());

-- Insert policies
-- Coordinators/venue owners can insert if they manage the venue
CREATE POLICY "bsc.insert.org_member"
  ON public.booking_supplier_coordinations FOR INSERT
  WITH CHECK (public.is_org_member_for_venue(venue_id));

-- Update policies
CREATE POLICY "bsc.update.org_member"
  ON public.booking_supplier_coordinations FOR UPDATE
  USING (public.is_org_member_for_venue(venue_id));

-- Delete policies
CREATE POLICY "bsc.delete.org_member"
  ON public.booking_supplier_coordinations FOR DELETE
  USING (public.is_org_member_for_venue(venue_id));

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_supplier_coordinations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_supplier_coordinations TO service_role;

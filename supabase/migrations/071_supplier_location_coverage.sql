-- ============================================================
-- Migration 071 - Supplier Location & Service Coverage
-- ============================================================

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS business_location_type text NOT NULL DEFAULT 'mobile',
  ADD COLUMN IF NOT EXISTS location_visibility text NOT NULL DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS business_address text,
  ADD COLUMN IF NOT EXISTS public_location_label text,
  ADD COLUMN IF NOT EXISTS travel_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS travel_fee_note text;

-- Add constraints
ALTER TABLE public.supplier_profiles
  ADD CONSTRAINT supplier_profiles_location_visibility_check 
  CHECK (location_visibility IN ('exact', 'approximate', 'service_area_only')),
  
  ADD CONSTRAINT supplier_profiles_business_location_type_check
  CHECK (business_location_type IN ('mobile', 'home_based', 'studio', 'storefront'));

-- Comments for documentation
COMMENT ON COLUMN public.supplier_profiles.business_location_type IS 'Type of location: mobile, home_based, studio, storefront';
COMMENT ON COLUMN public.supplier_profiles.location_visibility IS 'Privacy setting: exact, approximate, service_area_only';
COMMENT ON COLUMN public.supplier_profiles.travel_available IS 'Whether the supplier travels to the event location';
COMMENT ON COLUMN public.supplier_profiles.travel_fee_note IS 'Details about travel fees, if applicable';

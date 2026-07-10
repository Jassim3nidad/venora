-- Migration 050 - Supplier Inquiry Event Location Improvement

-- Add references to existing approved venue booking
ALTER TABLE public.supplier_contact_requests
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL;

-- Add immutable event snapshot fields
-- (Note: event_date, guest_count, and event_location already exist. 
-- We treat those as the immutable snapshots for those specific fields to preserve backwards compatibility).
ALTER TABLE public.supplier_contact_requests
  ADD COLUMN IF NOT EXISTS venue_name_snapshot text,
  ADD COLUMN IF NOT EXISTS event_start_time_snapshot time,
  ADD COLUMN IF NOT EXISTS location_snapshot text;

-- Add indexes for lookup by booking/venue
CREATE INDEX IF NOT EXISTS idx_supplier_contact_requests_booking
  ON public.supplier_contact_requests(booking_id);

CREATE INDEX IF NOT EXISTS idx_supplier_contact_requests_venue
  ON public.supplier_contact_requests(venue_id);

COMMENT ON COLUMN public.supplier_contact_requests.booking_id IS 'Link to the customer''s approved venue booking, if applicable.';
COMMENT ON COLUMN public.supplier_contact_requests.venue_name_snapshot IS 'Immutable snapshot of the venue name at inquiry submission time.';
COMMENT ON COLUMN public.supplier_contact_requests.event_start_time_snapshot IS 'Immutable snapshot of the event start time from the booking.';
COMMENT ON COLUMN public.supplier_contact_requests.location_snapshot IS 'Immutable snapshot of the venue location at inquiry submission time.';

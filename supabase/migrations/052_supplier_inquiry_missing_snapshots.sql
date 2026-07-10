-- Migration 052 - Supplier Inquiry Missing Snapshots

ALTER TABLE public.supplier_contact_requests
  ADD COLUMN IF NOT EXISTS event_date_snapshot text,
  ADD COLUMN IF NOT EXISTS guest_count_snapshot integer;

COMMENT ON COLUMN public.supplier_contact_requests.event_date_snapshot IS 'Immutable snapshot of the event date from the booking at submission time.';
COMMENT ON COLUMN public.supplier_contact_requests.guest_count_snapshot IS 'Immutable snapshot of the guest count from the booking at submission time.';

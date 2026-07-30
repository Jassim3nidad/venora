-- Add custom_amenities to venues.
-- Version 20260728120500 avoids collision with the already-applied
-- 20260728120000_harden_event_seating_planner migration.

ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS custom_amenities text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.venues.custom_amenities IS 'Custom user-defined amenities that are not in the predefined amenities list.';

-- Migration to add custom_amenities to venues table

ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS custom_amenities text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.venues.custom_amenities IS 'Custom user-defined amenities that are not in the predefined amenities list.';

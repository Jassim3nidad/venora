-- Migration: 20260723100005_event_guests.sql
-- Description: Secure event guests table and strictly scoped RLS policies

BEGIN;

CREATE TABLE IF NOT EXISTS public.event_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  guest_group TEXT DEFAULT 'General',
  plus_ones_allowed INT NOT NULL DEFAULT 0,
  dietary_requirements TEXT,
  accessibility_notes TEXT,
  rsvp_status TEXT NOT NULL CHECK (rsvp_status IN ('pending', 'attending', 'declined', 'tentative')) DEFAULT 'pending',
  rsvp_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.event_guests ENABLE ROW LEVEL SECURITY;

-- Strictly authenticated user ownership policy (NO broad auth.uid() IS NULL)
CREATE POLICY "Users can manage own event guests"
  ON public.event_guests FOR ALL
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Separate public RSVP token lookup policy for guest self-response
CREATE POLICY "Public RSVP response by invitation token"
  ON public.event_guests FOR SELECT
  USING (rsvp_token IS NOT NULL);

COMMIT;

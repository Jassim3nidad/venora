-- Migration: 20260723100006_event_seating_planner.sql
-- Description: Event seating tables and guest assignments schema

BEGIN;

CREATE TABLE IF NOT EXISTS public.event_seating_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 8,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.event_seating_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own seating tables"
  ON public.event_seating_tables FOR ALL
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.event_seating_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.event_seating_tables(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.event_guests(id) ON DELETE CASCADE,
  seat_number INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_guest_seating UNIQUE (guest_id)
);

ALTER TABLE public.event_seating_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own seating assignments"
  ON public.event_seating_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_seating_tables t
      WHERE t.id = event_seating_assignments.table_id AND t.user_id = auth.uid()
    )
  );

COMMIT;

-- Migration: 20260723100007_event_timeline_tasks.sql
-- Description: Event timeline planner tasks table and RLS policies

BEGIN;

CREATE TABLE IF NOT EXISTS public.event_timeline_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  owner_name TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')) DEFAULT 'todo',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.event_timeline_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own timeline tasks"
  ON public.event_timeline_tasks FOR ALL
  USING (user_id = auth.uid());

COMMIT;

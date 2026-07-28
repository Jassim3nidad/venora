-- Harden seating planner ownership and input invariants.

BEGIN;

ALTER TABLE public.event_seating_tables
  ADD CONSTRAINT event_seating_tables_capacity_bounds
  CHECK (capacity BETWEEN 1 AND 100) NOT VALID;

ALTER TABLE public.event_seating_assignments
  ADD CONSTRAINT event_seating_assignments_seat_bounds
  CHECK (seat_number IS NULL OR seat_number BETWEEN 1 AND 100) NOT VALID;

DROP POLICY IF EXISTS "Users can manage own seating tables"
  ON public.event_seating_tables;

CREATE POLICY "Users can manage own seating tables"
  ON public.event_seating_tables
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage own seating assignments"
  ON public.event_seating_assignments;

CREATE POLICY "Users can manage own seating assignments"
  ON public.event_seating_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.event_seating_tables AS seating_table
      WHERE seating_table.id = event_seating_assignments.table_id
        AND seating_table.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.event_seating_tables AS seating_table
      JOIN public.event_guests AS guest
        ON guest.id = event_seating_assignments.guest_id
      WHERE seating_table.id = event_seating_assignments.table_id
        AND seating_table.user_id = (SELECT auth.uid())
        AND guest.user_id = (SELECT auth.uid())
        AND (
          seating_table.booking_id IS NULL
          OR guest.booking_id = seating_table.booking_id
        )
    )
  );

COMMIT;

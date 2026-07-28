-- Add task dependencies and enforce authenticated timeline ownership.

BEGIN;

ALTER TABLE public.event_timeline_tasks
  ADD COLUMN IF NOT EXISTS depends_on_task_id UUID
  REFERENCES public.event_timeline_tasks(id) ON DELETE SET NULL;

ALTER TABLE public.event_timeline_tasks
  ADD CONSTRAINT event_timeline_tasks_not_self_dependent
  CHECK (depends_on_task_id IS NULL OR depends_on_task_id <> id) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_event_timeline_tasks_dependency
  ON public.event_timeline_tasks(depends_on_task_id)
  WHERE depends_on_task_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_timeline_task_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.booking_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.bookings AS booking
    WHERE booking.id = NEW.booking_id
      AND booking.customer_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Timeline booking access denied';
  END IF;

  IF NEW.depends_on_task_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.event_timeline_tasks AS dependency
    WHERE dependency.id = NEW.depends_on_task_id
      AND dependency.user_id = NEW.user_id
      AND (
        NEW.booking_id IS NULL
        OR dependency.booking_id IS NULL
        OR dependency.booking_id = NEW.booking_id
      )
  ) THEN
    RAISE EXCEPTION 'Timeline dependency access denied';
  END IF;

  IF NEW.depends_on_task_id IS NOT NULL AND EXISTS (
    WITH RECURSIVE dependency_chain AS (
      SELECT task.id, task.depends_on_task_id
      FROM public.event_timeline_tasks AS task
      WHERE task.id = NEW.depends_on_task_id
      UNION ALL
      SELECT task.id, task.depends_on_task_id
      FROM public.event_timeline_tasks AS task
      JOIN dependency_chain AS chain
        ON task.id = chain.depends_on_task_id
    )
    SELECT 1 FROM dependency_chain WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Timeline dependency cycle detected';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_timeline_task_links() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_timeline_task_links() FROM anon;
REVOKE ALL ON FUNCTION public.validate_timeline_task_links() FROM authenticated;

DROP TRIGGER IF EXISTS validate_event_timeline_task_links
  ON public.event_timeline_tasks;

CREATE TRIGGER validate_event_timeline_task_links
  BEFORE INSERT OR UPDATE OF user_id, booking_id, depends_on_task_id
  ON public.event_timeline_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_timeline_task_links();

DROP POLICY IF EXISTS "Users can manage own timeline tasks"
  ON public.event_timeline_tasks;

CREATE POLICY "Users can manage own timeline tasks"
  ON public.event_timeline_tasks
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

COMMIT;

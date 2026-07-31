-- Enforce date-shape requirements for persisted customer event plans.
-- Server validation already enforces these; the database must match it.

ALTER TABLE public.event_plans
  ADD CONSTRAINT event_plans_date_preference_required_fields_check
  CHECK (
    (
      date_preference_type <> 'exact'
      OR exact_event_date IS NOT NULL
    )
    AND (
      date_preference_type <> 'range'
      OR (
        date_range_start IS NOT NULL
        AND date_range_end IS NOT NULL
      )
    )
    AND (
      date_preference_type <> 'month'
      OR (
        preferred_month IS NOT NULL
        AND preferred_year IS NOT NULL
      )
    )
  );

-- Track guest RSVP invitation and reminder delivery without exposing guest data.

BEGIN;

ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS rsvp_invitation_delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_delivery_error text;

CREATE INDEX IF NOT EXISTS event_guests_pending_rsvp_reminders_idx
  ON public.event_guests(rsvp_deadline)
  WHERE
    rsvp_status = 'pending'
    AND invitation_sent_at IS NOT NULL
    AND rsvp_responded_at IS NULL
    AND rsvp_revoked_at IS NULL
    AND rsvp_reminder_sent_at IS NULL;

COMMIT;

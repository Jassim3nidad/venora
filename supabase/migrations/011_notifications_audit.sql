-- ============================================================
-- Migration 011 — Notifications & Audit
-- ============================================================

-- ── notifications ─────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid                        NOT NULL REFERENCES public.profiles(id),
  channel    public.notification_channel NOT NULL DEFAULT 'in_app',
  title      text                        NOT NULL,
  body       text,
  link       text,
  is_read    boolean                     NOT NULL DEFAULT false,
  created_at timestamptz                 NOT NULL DEFAULT now()
);

-- Partial index: unread-first query is the most common access pattern
CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- Enable Realtime for in-app notification badge updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

COMMENT ON TABLE public.notifications IS
  'In-app notifications. Channel drives delivery logic in booking-notifications Edge Function. All channels write a row here for the notification history feed.';

-- ── audit_logs ────────────────────────────────────────────────
-- Append-only. Records every significant action for compliance and debugging.
CREATE TABLE public.audit_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid                 REFERENCES public.profiles(id),
  action      text        NOT NULL,      -- e.g. 'venue.approved', 'booking.cancelled'
  entity_type text        NOT NULL,      -- e.g. 'venue', 'booking', 'user'
  entity_id   uuid,
  metadata    jsonb,                     -- { "old_status": "pending", "new_status": "approved" }
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor  ON public.audit_logs(actor_id, created_at DESC);

COMMENT ON TABLE public.audit_logs IS
  'Append-only audit trail. Never update or delete rows. Used for compliance, dispute resolution, and debugging.';

-- ── Generic audit logging function ───────────────────────────
-- Call from application layer: SELECT log_audit('venue.approved', 'venue', venue_id, '{"old": "pending"}');
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid    DEFAULT NULL,
  p_metadata    jsonb   DEFAULT NULL
)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
$$;

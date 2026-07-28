-- Persist confirmation-gated AI Concierge mutation requests.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL
    REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  tool_name text NOT NULL CHECK (tool_name IN ('cancel_booking')),
  arguments jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'confirmed', 'executed', 'rejected', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  executed_at timestamptz
);

CREATE INDEX IF NOT EXISTS ai_action_requests_user_created_idx
  ON public.ai_action_requests(user_id, created_at DESC);

ALTER TABLE public.ai_action_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_action_requests FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.ai_action_requests IS
  'Service-only AI Concierge mutation proposals and confirmation/execution evidence.';

COMMIT;

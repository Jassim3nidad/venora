-- Venue inquiry message threads (replyable conversations on public.inquiries)

CREATE TABLE IF NOT EXISTS public.venue_inquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_inquiry_messages_inquiry_created
  ON public.venue_inquiry_messages (inquiry_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_venue_inquiry_messages_sender
  ON public.venue_inquiry_messages (sender_id);

ALTER TABLE public.venue_inquiry_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_venue_inquiry_participant(p_inquiry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.inquiries inquiry
    WHERE inquiry.id = p_inquiry_id
      AND (
        inquiry.customer_id = auth.uid()
        OR public.is_org_member_for_venue(inquiry.venue_id)
        OR public.is_admin()
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_venue_inquiry_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_venue_inquiry_participant(uuid) TO authenticated;

DROP POLICY IF EXISTS "venue_inquiry_messages.select.participant"
  ON public.venue_inquiry_messages;
CREATE POLICY "venue_inquiry_messages.select.participant"
  ON public.venue_inquiry_messages FOR SELECT
  USING (public.is_venue_inquiry_participant(inquiry_id));

DROP POLICY IF EXISTS "venue_inquiry_messages.insert.participant"
  ON public.venue_inquiry_messages;
CREATE POLICY "venue_inquiry_messages.insert.participant"
  ON public.venue_inquiry_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_venue_inquiry_participant(inquiry_id)
  );

DROP POLICY IF EXISTS "venue_inquiry_messages.all.admin"
  ON public.venue_inquiry_messages;
CREATE POLICY "venue_inquiry_messages.all.admin"
  ON public.venue_inquiry_messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT ON public.venue_inquiry_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_inquiry_messages TO service_role;

-- Backfill first customer message for existing one-shot inquiries
INSERT INTO public.venue_inquiry_messages (inquiry_id, sender_id, message, created_at)
SELECT
  inquiry.id,
  inquiry.customer_id,
  inquiry.message,
  inquiry.created_at
FROM public.inquiries inquiry
WHERE NOT EXISTS (
  SELECT 1
  FROM public.venue_inquiry_messages existing
  WHERE existing.inquiry_id = inquiry.id
)
AND char_length(btrim(inquiry.message)) BETWEEN 1 AND 2000;

COMMENT ON TABLE public.venue_inquiry_messages IS
  'Threaded replies for venue pre-booking inquiries. Initial customer message is also stored here.';

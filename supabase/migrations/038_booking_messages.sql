-- ============================================================
-- Migration 038 — Booking Messages
-- ============================================================
-- Adds a booking_messages table for per-booking conversations
-- between customers and venue owners.
-- ============================================================

-- ── Table ────────────────────────────────────────────────────
CREATE TABLE public.booking_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  sender_role text        NOT NULL,
  message     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT booking_messages_sender_role_check
    CHECK (sender_role IN ('customer', 'venue_owner')),

  CONSTRAINT booking_messages_message_check
    CHECK (
      char_length(trim(message)) > 0
      AND char_length(message) <= 2000
    )
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_booking_messages_booking_created
  ON public.booking_messages (booking_id, created_at ASC);

CREATE INDEX idx_booking_messages_sender
  ON public.booking_messages (sender_id);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- Customer: view messages for their own bookings
CREATE POLICY "bm.select.customer"
  ON public.booking_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
    )
  );

-- Venue org member: view messages for bookings on their venues
CREATE POLICY "bm.select.owner"
  ON public.booking_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.venues v        ON v.id = b.venue_id
      JOIN public.organization_members om ON om.organization_id = v.organization_id
      WHERE b.id = booking_id
        AND om.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.venues v        ON v.id = b.venue_id
      JOIN public.organizations o ON o.id = v.organization_id
      WHERE b.id = booking_id
        AND o.owner_id = auth.uid()
    )
  );

-- Customer: insert messages for their own bookings
CREATE POLICY "bm.insert.customer"
  ON public.booking_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'customer'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
    )
  );

-- Venue org member: insert messages for bookings on their venues
CREATE POLICY "bm.insert.owner"
  ON public.booking_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'venue_owner'
    AND (
      EXISTS (
        SELECT 1
        FROM public.bookings b
        JOIN public.venues v        ON v.id = b.venue_id
        JOIN public.organization_members om ON om.organization_id = v.organization_id
        WHERE b.id = booking_id
          AND om.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.bookings b
        JOIN public.venues v        ON v.id = b.venue_id
        JOIN public.organizations o ON o.id = v.organization_id
        WHERE b.id = booking_id
          AND o.owner_id = auth.uid()
      )
    )
  );

-- Admin: full access
CREATE POLICY "bm.all.admin"
  ON public.booking_messages FOR ALL
  USING (public.is_admin());

-- ── Comment ──────────────────────────────────────────────────
COMMENT ON TABLE public.booking_messages IS
  'Per-booking message thread between customer and venue owner. '
  'sender_role is constrained to customer or venue_owner. '
  'Cascade deletes when a booking is deleted.';

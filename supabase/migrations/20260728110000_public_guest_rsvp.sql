-- Public guest RSVP lifecycle without anonymous event_guests table access.

BEGIN;

ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS plus_ones_attending integer NOT NULL DEFAULT 0;

ALTER TABLE public.event_guests
  DROP CONSTRAINT IF EXISTS event_guests_plus_ones_attending_check;
ALTER TABLE public.event_guests
  ADD CONSTRAINT event_guests_plus_ones_attending_check
  CHECK (
    plus_ones_attending >= 0
    AND plus_ones_attending <= plus_ones_allowed
  );

CREATE UNIQUE INDEX IF NOT EXISTS event_guests_rsvp_token_unique
  ON public.event_guests(rsvp_token)
  WHERE rsvp_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_guest_rsvp_invitation(p_token uuid)
RETURNS TABLE (
  guest_name text,
  event_date date,
  venue_name text,
  rsvp_status text,
  plus_ones_allowed integer,
  plus_ones_attending integer,
  rsvp_deadline timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    concat_ws(' ', guest.first_name, guest.last_name),
    booking.event_date,
    venue.name,
    guest.rsvp_status,
    guest.plus_ones_allowed,
    guest.plus_ones_attending,
    guest.rsvp_deadline
  FROM public.event_guests AS guest
  LEFT JOIN public.bookings AS booking ON booking.id = guest.booking_id
  LEFT JOIN public.venues AS venue ON venue.id = booking.venue_id
  WHERE guest.rsvp_token = p_token
    AND guest.invitation_sent_at IS NOT NULL
    AND guest.rsvp_revoked_at IS NULL
    AND (
      guest.rsvp_deadline IS NULL
      OR guest.rsvp_deadline >= now()
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_guest_rsvp(
  p_token uuid,
  p_status text,
  p_plus_ones integer DEFAULT 0
)
RETURNS TABLE (
  rsvp_status text,
  plus_ones_attending integer,
  rsvp_responded_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest public.event_guests%ROWTYPE;
BEGIN
  IF p_status NOT IN ('attending', 'declined', 'tentative') THEN
    RAISE EXCEPTION 'Invalid RSVP response.';
  END IF;

  SELECT *
  INTO v_guest
  FROM public.event_guests
  WHERE rsvp_token = p_token
    AND invitation_sent_at IS NOT NULL
    AND rsvp_revoked_at IS NULL
    AND (rsvp_deadline IS NULL OR rsvp_deadline >= now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invitation is invalid, expired, or revoked.';
  END IF;

  IF p_plus_ones < 0 OR p_plus_ones > v_guest.plus_ones_allowed THEN
    RAISE EXCEPTION 'Invalid plus-one count.';
  END IF;

  UPDATE public.event_guests
  SET
    rsvp_status = p_status,
    plus_ones_attending = CASE
      WHEN p_status = 'attending' THEN p_plus_ones
      ELSE 0
    END,
    rsvp_responded_at = now()
  WHERE id = v_guest.id
  RETURNING
    event_guests.rsvp_status,
    event_guests.plus_ones_attending,
    event_guests.rsvp_responded_at
  INTO rsvp_status, plus_ones_attending, rsvp_responded_at;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_guest_rsvp_invitation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_guest_rsvp(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_rsvp_invitation(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_guest_rsvp(uuid, text, integer) TO anon, authenticated;

COMMIT;

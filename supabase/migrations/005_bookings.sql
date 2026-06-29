-- ============================================================
-- Migration 006 — Calendar & Booking Domain
-- ============================================================

-- ── venue_availability ────────────────────────────────────────
-- One row per venue per date. Venue owners manage this calendar.
-- Customers check it before booking.
CREATE TABLE public.venue_availability (
  id                     uuid                       PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id               uuid                       NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  date                   date                       NOT NULL,
  status                 public.availability_status NOT NULL DEFAULT 'available',
  seasonal_price_override numeric(12,2),            -- overrides venue.base_price for this date
  note                   text,
  UNIQUE (venue_id, date)
);

CREATE INDEX idx_availability_lookup ON public.venue_availability (venue_id, date);

COMMENT ON TABLE  public.venue_availability                          IS 'Per-date availability calendar. Venue owners manage; customers see before booking.';
COMMENT ON COLUMN public.venue_availability.seasonal_price_override  IS 'If set, overrides venues.base_price for this specific date (e.g. peak season surcharge).';

-- ── inquiries ─────────────────────────────────────────────────
-- Pre-booking contact from a customer to a venue.
CREATE TABLE public.inquiries (
  id          uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid                   NOT NULL REFERENCES public.venues(id),
  customer_id uuid                   NOT NULL REFERENCES public.profiles(id),
  message     text                   NOT NULL,
  status      public.inquiry_status  NOT NULL DEFAULT 'new',
  created_at  timestamptz            NOT NULL DEFAULT now()
);

CREATE INDEX idx_inquiries_venue    ON public.inquiries(venue_id);
CREATE INDEX idx_inquiries_customer ON public.inquiries(customer_id);

-- ── bookings ──────────────────────────────────────────────────
CREATE TABLE public.bookings (
  id               uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id         uuid                   NOT NULL REFERENCES public.venues(id),
  customer_id      uuid                   NOT NULL REFERENCES public.profiles(id),
  package_id       uuid                            REFERENCES public.venue_packages(id),
  event_date       date                   NOT NULL,
  event_type_id    uuid                            REFERENCES public.event_types(id),
  guest_count      int                    NOT NULL CHECK (guest_count >= 1),
  status           public.booking_status  NOT NULL DEFAULT 'pending',
  total_amount     numeric(12,2),
  deposit_amount   numeric(12,2),
  special_requests text,
  decline_reason   text,
  created_at       timestamptz            NOT NULL DEFAULT now(),
  updated_at       timestamptz            NOT NULL DEFAULT now(),
  confirmed_at     timestamptz,
  cancelled_at     timestamptz
);

CREATE INDEX idx_bookings_venue_date ON public.bookings (venue_id, event_date);
CREATE INDEX idx_bookings_customer   ON public.bookings (customer_id);
CREATE INDEX idx_bookings_status     ON public.bookings (status);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable Realtime so customers and venue owners get live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

COMMENT ON TABLE  public.bookings                IS 'Core booking records. Status transitions logged in booking_status_history.';
COMMENT ON COLUMN public.bookings.package_id     IS 'NULL = enquiry without package. Set to a venue_package when customer selects one.';
COMMENT ON COLUMN public.bookings.total_amount   IS 'Calculated at approval time (package price or base_price). NULL until venue owner approves.';
COMMENT ON COLUMN public.bookings.deposit_amount IS 'Partial deposit collected upfront. Remainder due on event day.';

-- ── booking_status_history ────────────────────────────────────
-- Append-only audit trail of all booking status changes.
CREATE TABLE public.booking_status_history (
  id         uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid                  NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status     public.booking_status NOT NULL,
  changed_by uuid                           REFERENCES public.profiles(id),
  note       text,
  created_at timestamptz           NOT NULL DEFAULT now()
);

CREATE INDEX idx_bsh_booking ON public.booking_status_history(booking_id);

COMMENT ON TABLE public.booking_status_history IS
  'Append-only log of every booking status transition. Never delete rows. Used for dispute resolution and analytics.';

-- ── Trigger: auto-append status history ──────────────────────
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_status_history
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();

-- ── Trigger: mark venue_availability as reserved on booking approve ──
CREATE OR REPLACE FUNCTION public.sync_availability_on_booking()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    INSERT INTO public.venue_availability (venue_id, date, status)
    VALUES (NEW.venue_id, NEW.event_date, 'reserved')
    ON CONFLICT (venue_id, date) DO UPDATE
      SET status = 'reserved';
  END IF;

  -- Release the date if booking is cancelled/declined
  IF NEW.status IN ('cancelled', 'declined', 'expired') AND OLD.status = 'approved' THEN
    UPDATE public.venue_availability
    SET status = 'available'
    WHERE venue_id = NEW.venue_id AND date = NEW.event_date AND status = 'reserved';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_sync_availability
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_availability_on_booking();

-- ── favorites ─────────────────────────────────────────────────
CREATE TABLE public.favorites (
  customer_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id    uuid        NOT NULL REFERENCES public.venues(id)    ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, venue_id)
);

CREATE INDEX idx_favorites_customer ON public.favorites(customer_id);

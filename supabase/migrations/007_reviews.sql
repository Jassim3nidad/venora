-- ============================================================
-- Migration 008 — Reviews Domain
-- ============================================================

-- ── reviews ───────────────────────────────────────────────────
-- One review per completed booking (enforced by UNIQUE on booking_id).
-- Multi-dimensional rating for rich filtering and analytics.
CREATE TABLE public.reviews (
  id              uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid                 NOT NULL UNIQUE REFERENCES public.bookings(id),
  customer_id     uuid                 NOT NULL REFERENCES public.profiles(id),
  venue_id        uuid                 NOT NULL REFERENCES public.venues(id),

  -- Rating dimensions (1–5)
  overall_rating  smallint             NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  venue_quality   smallint                      CHECK (venue_quality  BETWEEN 1 AND 5),
  cleanliness     smallint                      CHECK (cleanliness    BETWEEN 1 AND 5),
  staff_service   smallint                      CHECK (staff_service  BETWEEN 1 AND 5),
  facilities      smallint                      CHECK (facilities     BETWEEN 1 AND 5),
  accessibility   smallint                      CHECK (accessibility  BETWEEN 1 AND 5),
  value_for_money smallint                      CHECK (value_for_money BETWEEN 1 AND 5),
  food_quality    smallint                      CHECK (food_quality   BETWEEN 1 AND 5),
  ambience        smallint                      CHECK (ambience       BETWEEN 1 AND 5),

  comment         text,
  owner_reply     text,
  status          public.review_status NOT NULL DEFAULT 'published',
  created_at      timestamptz          NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_venue    ON public.reviews(venue_id, status);
CREATE INDEX idx_reviews_customer ON public.reviews(customer_id);

COMMENT ON TABLE  public.reviews               IS '1 review per completed booking. booking.status must be completed (enforced by RLS + trigger).';
COMMENT ON COLUMN public.reviews.owner_reply   IS 'Venue owner public response to the review. NULL until owner replies.';
COMMENT ON COLUMN public.reviews.overall_rating IS 'Required star rating 1–5. Drives avg_rating on venues table (via trigger).';

-- ── Trigger: enforce booking must be completed before review ──
CREATE OR REPLACE FUNCTION public.check_review_eligibility()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_status public.booking_status;
  v_customer_id uuid;
BEGIN
  SELECT status, customer_id
  INTO   v_status, v_customer_id
  FROM   public.bookings
  WHERE  id = NEW.booking_id;

  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'Cannot review a booking that is not completed (current status: %)', v_status;
  END IF;

  IF v_customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the booking customer can submit a review';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_check_eligibility
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.check_review_eligibility();

-- ── Trigger: update denormalized venue stats ──────────────────
CREATE OR REPLACE FUNCTION public.update_venue_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.venues
  SET
    avg_rating   = (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM public.reviews WHERE venue_id = NEW.venue_id AND status = 'published'),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE venue_id = NEW.venue_id AND status = 'published')
  WHERE id = NEW.venue_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_update_venue_stats
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_venue_stats();

-- ── supplier_reviews ──────────────────────────────────────────
CREATE TABLE public.supplier_reviews (
  id                  uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_supplier_id uuid                 NOT NULL UNIQUE REFERENCES public.booking_suppliers(id),
  customer_id         uuid                 NOT NULL REFERENCES public.profiles(id),
  supplier_id         uuid                 NOT NULL REFERENCES public.supplier_profiles(id),
  overall_rating      smallint             NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  comment             text,
  status              public.review_status NOT NULL DEFAULT 'published',
  created_at          timestamptz          NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_reviews_supplier ON public.supplier_reviews(supplier_id, status);

-- ── Trigger: update denormalized supplier stats ────────────────
CREATE OR REPLACE FUNCTION public.update_supplier_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.supplier_profiles
  SET
    avg_rating   = (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM public.supplier_reviews WHERE supplier_id = NEW.supplier_id AND status = 'published'),
    review_count = (SELECT COUNT(*) FROM public.supplier_reviews WHERE supplier_id = NEW.supplier_id AND status = 'published')
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER supplier_reviews_update_stats
  AFTER INSERT OR UPDATE ON public.supplier_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_supplier_stats();

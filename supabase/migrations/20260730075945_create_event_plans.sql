-- Guided customer event planning saved drafts.
-- Customers own these records; they are not public marketplace content.

CREATE TABLE public.event_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type_id uuid REFERENCES public.event_types(id) ON DELETE SET NULL,
  title text,
  event_name text,
  event_type_key text NOT NULL,
  custom_event_type text,
  date_preference_type text NOT NULL DEFAULT 'flexible',
  exact_event_date date,
  date_range_start date,
  date_range_end date,
  preferred_month int,
  preferred_year int,
  preferred_day_of_week text,
  preferred_time_of_day text,
  province text,
  city text,
  nearby_locations_allowed boolean,
  expected_guest_count int,
  guest_count_range text,
  guest_count_min int,
  guest_count_max int,
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  budget_preference text,
  currency text NOT NULL DEFAULT 'PHP',
  venue_styles text[] NOT NULL DEFAULT '{}'::text[],
  setting_preference text,
  ranked_priorities text[] NOT NULL DEFAULT '{}'::text[],
  required_amenities text[] NOT NULL DEFAULT '{}'::text[],
  additional_requirements text,
  services_needed text[] NOT NULL DEFAULT '{}'::text[],
  custom_service text,
  service_selection_mode text NOT NULL DEFAULT 'needs-services',
  package_preference text,
  accredited_supplier_preference text,
  payment_preference text,
  booking_urgency text,
  decision_maker_type text,
  status text NOT NULL DEFAULT 'draft',
  completion_step text NOT NULL DEFAULT 'event-basics',
  source_draft_fingerprint text,
  converted_inquiry_id uuid REFERENCES public.inquiries(id) ON DELETE SET NULL,
  converted_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  converted_at timestamptz,

  CONSTRAINT event_plans_status_check
    CHECK (
      status IN (
        'draft',
        'completed',
        'archived',
        'converted_to_inquiry',
        'converted_to_booking'
      )
    ),
  CONSTRAINT event_plans_completion_step_check
    CHECK (
      completion_step IN (
        'event-basics',
        'date-location',
        'guests-budget',
        'venue-style',
        'requirements',
        'services',
        'booking-preferences',
        'summary'
      )
    ),
  CONSTRAINT event_plans_event_type_key_check
    CHECK (
      event_type_key IN (
        'wedding',
        'birthday',
        'corporate',
        'debut',
        'graduation',
        'reunion',
        'conference',
        'seminar',
        'product-launch',
        'other'
      )
    ),
  CONSTRAINT event_plans_date_preference_type_check
    CHECK (
      date_preference_type IN (
        'exact',
        'range',
        'month',
        'flexible',
        'not-sure'
      )
    ),
  CONSTRAINT event_plans_date_range_check
    CHECK (
      date_range_start IS NULL
      OR date_range_end IS NULL
      OR date_range_start <= date_range_end
    ),
  CONSTRAINT event_plans_preferred_month_check
    CHECK (preferred_month IS NULL OR preferred_month BETWEEN 1 AND 12),
  CONSTRAINT event_plans_preferred_year_check
    CHECK (preferred_year IS NULL OR preferred_year >= 2026),
  CONSTRAINT event_plans_preferred_day_of_week_check
    CHECK (
      preferred_day_of_week IS NULL
      OR preferred_day_of_week IN (
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
      )
    ),
  CONSTRAINT event_plans_preferred_time_of_day_check
    CHECK (
      preferred_time_of_day IS NULL
      OR preferred_time_of_day IN (
        'morning',
        'afternoon',
        'evening',
        'whole-day'
      )
    ),
  CONSTRAINT event_plans_guest_range_check
    CHECK (
      (expected_guest_count IS NULL OR expected_guest_count >= 1)
      AND (guest_count_min IS NULL OR guest_count_min >= 1)
      AND (guest_count_max IS NULL OR guest_count_max >= 1)
      AND (
        guest_count_min IS NULL
        OR guest_count_max IS NULL
        OR guest_count_min <= guest_count_max
      )
    ),
  CONSTRAINT event_plans_guest_count_range_check
    CHECK (
      guest_count_range IS NULL
      OR guest_count_range IN (
        'under-50',
        '50-100',
        '101-150',
        '151-200',
        '201-300',
        'over-300',
        'not-sure'
      )
    ),
  CONSTRAINT event_plans_budget_range_check
    CHECK (
      (budget_min IS NULL OR budget_min >= 0)
      AND (budget_max IS NULL OR budget_max >= 0)
      AND (
        budget_min IS NULL
        OR budget_max IS NULL
        OR budget_min <= budget_max
      )
    ),
  CONSTRAINT event_plans_currency_check
    CHECK (currency = 'PHP'),
  CONSTRAINT event_plans_budget_preference_check
    CHECK (
      budget_preference IS NULL
      OR budget_preference IN (
        'under-50000',
        '50000-100000',
        '100001-250000',
        '250001-500000',
        'above-500000',
        'not-sure',
        'prefer-not-to-say',
        'custom'
      )
    ),
  CONSTRAINT event_plans_venue_styles_check
    CHECK (
      venue_styles <@ ARRAY[
        'elegant',
        'romantic',
        'modern',
        'minimalist',
        'rustic',
        'garden',
        'beach',
        'intimate',
        'luxurious',
        'traditional',
        'industrial',
        'family-friendly',
        'corporate-professional',
        'resort',
        'hotel-ballroom',
        'restaurant',
        'function-hall',
        'church',
        'events-space',
        'rooftop',
        'farm',
        'no-preference'
      ]::text[]
    ),
  CONSTRAINT event_plans_setting_preference_check
    CHECK (
      setting_preference IS NULL
      OR setting_preference IN (
        'indoor',
        'outdoor',
        'both',
        'no-preference'
      )
    ),
  CONSTRAINT event_plans_ranked_priorities_check
    CHECK (
      cardinality(ranked_priorities) <= 3
      AND ranked_priorities <@ ARRAY[
        'location',
        'budget',
        'appearance',
        'capacity',
        'complete-package',
        'accessibility',
        'parking',
        'accredited-suppliers',
        'reviews',
        'flexible-payment',
        'accommodation',
        'privacy'
      ]::text[]
    ),
  CONSTRAINT event_plans_required_amenities_check
    CHECK (
      required_amenities <@ ARRAY[
        'parking',
        'air-conditioning',
        'accessible-entrance',
        'accessible-restroom',
        'preparation-room',
        'stage',
        'sound-system',
        'lighting',
        'kitchen',
        'catering-prep',
        'accommodation',
        'ceremony-area',
        'reception-area',
        'backup-indoor-space',
        'wifi',
        'generator',
        'pet-friendly',
        'none'
      ]::text[]
      AND NOT (
        'none' = ANY(required_amenities)
        AND cardinality(required_amenities) > 1
      )
    ),
  CONSTRAINT event_plans_services_needed_check
    CHECK (
      services_needed <@ ARRAY[
        'catering',
        'photography',
        'videography',
        'event-coordination',
        'styling',
        'lights-sounds',
        'host-emcee',
        'entertainment',
        'cake-desserts',
        'hair-makeup',
        'transportation',
        'photo-booth',
        'other',
        'already-have-all'
      ]::text[]
      AND NOT (
        'already-have-all' = ANY(services_needed)
        AND cardinality(services_needed) > 1
      )
    ),
  CONSTRAINT event_plans_service_selection_mode_check
    CHECK (
      service_selection_mode IN (
        'needs-services',
        'already-complete'
      )
    ),
  CONSTRAINT event_plans_package_preference_check
    CHECK (
      package_preference IS NULL
      OR package_preference IN (
        'complete-package',
        'individual-services',
        'compare-both',
        'not-sure'
      )
    ),
  CONSTRAINT event_plans_accredited_supplier_preference_check
    CHECK (
      accredited_supplier_preference IS NULL
      OR accredited_supplier_preference IN (
        'yes',
        'no',
        'maybe',
        'already-have-preferred'
      )
    ),
  CONSTRAINT event_plans_payment_preference_check
    CHECK (
      payment_preference IS NULL
      OR payment_preference IN (
        'deposit-balance',
        'full-payment',
        'no-preference'
      )
    ),
  CONSTRAINT event_plans_booking_urgency_check
    CHECK (
      booking_urgency IS NULL
      OR booking_urgency IN (
        'asap',
        'within-1-month',
        'within-1-3-months',
        'over-3-months',
        'exploring'
      )
    ),
  CONSTRAINT event_plans_decision_maker_type_check
    CHECK (
      decision_maker_type IS NULL
      OR decision_maker_type IN (
        'self',
        'partner-family',
        'company-organization',
        'event-coordinator',
        'other'
      )
    )
);

CREATE TRIGGER event_plans_updated_at
  BEFORE UPDATE ON public.event_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_event_plans_customer
  ON public.event_plans (customer_id, updated_at DESC);

CREATE INDEX idx_event_plans_customer_status
  ON public.event_plans (customer_id, status, updated_at DESC);

CREATE INDEX idx_event_plans_event_type
  ON public.event_plans (event_type_id);

CREATE INDEX idx_event_plans_location
  ON public.event_plans (province, city);

CREATE INDEX idx_event_plans_exact_date
  ON public.event_plans (exact_event_date)
  WHERE exact_event_date IS NOT NULL;

CREATE UNIQUE INDEX idx_event_plans_customer_fingerprint
  ON public.event_plans (customer_id, source_draft_fingerprint)
  WHERE source_draft_fingerprint IS NOT NULL;

COMMENT ON TABLE public.event_plans IS
  'Customer-owned guided event planning drafts for future venue and supplier recommendations.';

COMMENT ON COLUMN public.event_plans.source_draft_fingerprint IS
  'Optional client-side idempotency fingerprint used to prevent duplicate post-login draft saves.';

ALTER TABLE public.event_plans ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.event_plans FROM PUBLIC;
REVOKE ALL ON TABLE public.event_plans FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.event_plans TO authenticated;

CREATE POLICY "event_plans.select.own"
  ON public.event_plans
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = customer_id);

CREATE POLICY "event_plans.insert.own"
  ON public.event_plans
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = customer_id);

CREATE POLICY "event_plans.update.own"
  ON public.event_plans
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = customer_id)
  WITH CHECK ((select auth.uid()) = customer_id);

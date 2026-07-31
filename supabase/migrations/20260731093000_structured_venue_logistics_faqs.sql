-- Structured venue foundation: logistics and public FAQ content.

CREATE TABLE public.venue_logistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES public.venue_profile_revisions(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  parking_summary text,
  parking_capacity integer,
  accessibility_summary text,
  loading_area_notes text,
  load_in_notes text,
  catering_policy text,
  outside_supplier_policy text,
  alcohol_policy text,
  noise_policy text,
  curfew_time time,
  security_notes text,
  restroom_notes text,
  weather_contingency text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_logistics_revision_venue_fk
    FOREIGN KEY (revision_id, venue_id)
    REFERENCES public.venue_profile_revisions(id, venue_id)
    ON DELETE CASCADE,
  CONSTRAINT venue_logistics_revision_unique
    UNIQUE (revision_id),
  CONSTRAINT venue_logistics_parking_summary_check
    CHECK (parking_summary IS NULL OR length(parking_summary) <= 1000),
  CONSTRAINT venue_logistics_parking_capacity_check
    CHECK (parking_capacity IS NULL OR parking_capacity >= 0),
  CONSTRAINT venue_logistics_accessibility_summary_check
    CHECK (accessibility_summary IS NULL OR length(accessibility_summary) <= 1500),
  CONSTRAINT venue_logistics_loading_area_notes_check
    CHECK (loading_area_notes IS NULL OR length(loading_area_notes) <= 1000),
  CONSTRAINT venue_logistics_load_in_notes_check
    CHECK (load_in_notes IS NULL OR length(load_in_notes) <= 1000),
  CONSTRAINT venue_logistics_catering_policy_check
    CHECK (catering_policy IS NULL OR length(catering_policy) <= 1500),
  CONSTRAINT venue_logistics_outside_supplier_policy_check
    CHECK (outside_supplier_policy IS NULL OR length(outside_supplier_policy) <= 1500),
  CONSTRAINT venue_logistics_alcohol_policy_check
    CHECK (alcohol_policy IS NULL OR length(alcohol_policy) <= 1500),
  CONSTRAINT venue_logistics_noise_policy_check
    CHECK (noise_policy IS NULL OR length(noise_policy) <= 1500),
  CONSTRAINT venue_logistics_security_notes_check
    CHECK (security_notes IS NULL OR length(security_notes) <= 1000),
  CONSTRAINT venue_logistics_restroom_notes_check
    CHECK (restroom_notes IS NULL OR length(restroom_notes) <= 1000),
  CONSTRAINT venue_logistics_weather_contingency_check
    CHECK (weather_contingency IS NULL OR length(weather_contingency) <= 1500),
  CONSTRAINT venue_logistics_status_check
    CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX idx_venue_logistics_venue
  ON public.venue_logistics (venue_id);

CREATE TRIGGER venue_logistics_updated_at
  BEFORE UPDATE ON public.venue_logistics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.venue_logistics ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.venue_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES public.venue_profile_revisions(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_faqs_revision_venue_fk
    FOREIGN KEY (revision_id, venue_id)
    REFERENCES public.venue_profile_revisions(id, venue_id)
    ON DELETE CASCADE,
  CONSTRAINT venue_faqs_question_check
    CHECK (length(btrim(question)) BETWEEN 5 AND 200),
  CONSTRAINT venue_faqs_answer_check
    CHECK (length(btrim(answer)) BETWEEN 5 AND 2000),
  CONSTRAINT venue_faqs_plain_text_check
    CHECK (question !~ '<[[:alpha:]]' AND answer !~ '<[[:alpha:]]'),
  CONSTRAINT venue_faqs_category_check
    CHECK (
      category IS NULL
      OR category IN (
        'pricing',
        'booking',
        'logistics',
        'suppliers',
        'accessibility',
        'policies',
        'other'
      )
    ),
  CONSTRAINT venue_faqs_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT venue_faqs_status_check
    CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE UNIQUE INDEX venue_faqs_revision_question_unique
  ON public.venue_faqs (revision_id, lower(question));

CREATE INDEX idx_venue_faqs_revision_order
  ON public.venue_faqs (revision_id, display_order);

CREATE INDEX idx_venue_faqs_category
  ON public.venue_faqs (category)
  WHERE category IS NOT NULL;

CREATE TRIGGER venue_faqs_updated_at
  BEFORE UPDATE ON public.venue_faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.venue_faqs ENABLE ROW LEVEL SECURITY;

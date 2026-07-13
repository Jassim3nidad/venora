-- ============================================================
-- Migration 058 — System Settings & AI Configuration
-- ============================================================
--
-- Two independent features bundled in one migration since both are new,
-- additive, and small.
--
-- IMPORTANT SCOPE NOTE on AI configuration: today every ai-* Edge Function
-- (supabase/functions/ai-assistant, ai-search, ai-recommendation,
-- ai-venue-description, ai-cost-estimator, ai-package-comparison) reads its
-- provider/model/key straight from Deno.env (OPENROUTER_API_KEY,
-- OPENROUTER_API_KEY + per-function *_MODEL env vars, falling back to
-- DEFAULT_CHAT_MODEL in _shared/openrouter.ts). ai_configurations below
-- stores the desired configuration an admin sets, but the Edge Functions do
-- NOT read from this table yet — wiring that up means changing six
-- already-live functions I have no way to test end-to-end from this
-- environment, so it's deliberately left as a flagged follow-up rather than
-- silently pretended to be complete. ai_usage_logs is real schema but will
-- stay empty until those functions are instrumented to write to it.
--
-- No AI provider API key is ever stored here — those remain in Supabase
-- Edge Function secrets / Vercel env vars exclusively, per the "never
-- store raw AI API keys in a client-readable table" requirement.

-- ================================================================
-- system_settings — typed keys only, not a free-form key/value store
-- ================================================================
CREATE TABLE public.system_settings (
  key         text PRIMARY KEY,
  category    text NOT NULL CHECK (category IN ('general', 'marketplace', 'security', 'maintenance')),
  value       jsonb NOT NULL,
  description text NOT NULL,
  is_dangerous boolean NOT NULL DEFAULT false,
  updated_by  uuid REFERENCES public.profiles(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.system_settings IS
  'Typed platform configuration. Keys are fixed by application code (see admin-settings feature) — this is not an arbitrary key/value store. Write only via admin_update_system_setting().';

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_settings.select.admin"
  ON public.system_settings FOR SELECT
  USING (public.has_admin_permission('system_settings.view'));

-- ── system_setting_history — append-only ─────────────────────
CREATE TABLE public.system_setting_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key     text NOT NULL,
  previous_value  jsonb,
  new_value       jsonb NOT NULL,
  reason          text,
  actor_id        uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_setting_history_key ON public.system_setting_history (setting_key, created_at DESC);

ALTER TABLE public.system_setting_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_setting_history.select.admin"
  ON public.system_setting_history FOR SELECT
  USING (public.has_admin_permission('system_settings.view'));

-- ── admin_update_system_setting() ────────────────────────────
-- Dangerous settings (maintenance_mode, read-only-style toggles) require
-- an explicit reason regardless of permission level, as a lightweight
-- confirmation trail beyond the UI's own confirm dialog.
CREATE OR REPLACE FUNCTION public.admin_update_system_setting(
  p_key    text,
  p_value  jsonb,
  p_reason text DEFAULT NULL
)
RETURNS public.system_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_setting  public.system_settings%ROWTYPE;
  v_previous jsonb;
BEGIN
  IF NOT public.has_admin_permission('system_settings.manage') THEN
    RAISE EXCEPTION 'You do not have permission to change system settings';
  END IF;

  SELECT * INTO v_setting FROM public.system_settings WHERE key = p_key FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown setting key: %', p_key;
  END IF;

  IF v_setting.is_dangerous AND btrim(coalesce(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required to change this setting';
  END IF;

  v_previous := v_setting.value;

  UPDATE public.system_settings
  SET value = p_value, updated_by = auth.uid(), updated_at = now()
  WHERE key = p_key
  RETURNING * INTO v_setting;

  INSERT INTO public.system_setting_history (setting_key, previous_value, new_value, reason, actor_id)
  VALUES (p_key, v_previous, p_value, p_reason, auth.uid());

  PERFORM public.log_admin_action(
    'system_setting.updated', 'system_setting', NULL, p_reason,
    jsonb_build_object('key', p_key), jsonb_build_object('value', v_previous), jsonb_build_object('value', p_value)
  );

  RETURN v_setting;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_system_setting(text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_system_setting(text, jsonb, text) TO authenticated;

-- ── Seed defaults ─────────────────────────────────────────────
INSERT INTO public.system_settings (key, category, value, description, is_dangerous) VALUES
  ('platform_name',              'general',     '"Venora"',   'Displayed platform name.', false),
  ('support_email',               'general',     '"support@venora.app"', 'Customer-facing support contact.', false),
  ('default_timezone',            'general',     '"Asia/Manila"', 'Default timezone for scheduling and reports.', false),
  ('default_currency',            'general',     '"PHP"',      'Default currency for pricing and reports.', false),
  ('maintenance_message',         'general',     '""',         'Message shown to users during maintenance mode.', false),

  ('max_listing_photos',          'marketplace', '20',         'Maximum photos per venue/supplier listing.', false),
  ('require_documents_for_approval', 'marketplace', 'true',    'Whether venues/suppliers must have documents on file before approval.', false),
  ('max_booking_advance_days',    'marketplace', '365',        'How far in advance a booking can be made.', false),
  ('min_cancellation_notice_hours', 'marketplace', '48',       'Minimum notice required for a customer-initiated cancellation.', false),

  ('max_upload_size_mb',          'security',    '20',         'Maximum file size for document/photo uploads.', false),
  ('allowed_upload_file_types',   'security',    '["image/jpeg","image/png","image/webp","application/pdf"]', 'Allowed MIME types for uploads.', false),
  ('session_timeout_minutes',     'security',    '10080',      'Idle session timeout (default 7 days).', false),
  ('max_login_attempts',          'security',    '5',          'Failed login attempts before lockout guidance is shown.', false),

  ('maintenance_mode',            'maintenance', 'false',      'When true, the platform shows the maintenance message to non-admin users.', true),
  ('read_only_mode',              'maintenance', 'false',      'When true, blocks new bookings/listings platform-wide.', true)
ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- ai_configurations — desired config per AI feature (no secrets)
-- ================================================================
CREATE TABLE public.ai_configurations (
  feature              text PRIMARY KEY CHECK (feature IN (
                         'assistant', 'search', 'recommendation',
                         'venue_description', 'cost_estimator',
                         'package_comparison', 'embeddings'
                       )),
  enabled              boolean NOT NULL DEFAULT true,
  provider             text NOT NULL DEFAULT 'openrouter',
  model                text NOT NULL,
  fallback_provider    text,
  fallback_model       text,
  system_instruction    text,
  max_tokens           int NOT NULL DEFAULT 1024 CHECK (max_tokens > 0),
  timeout_seconds      int NOT NULL DEFAULT 30 CHECK (timeout_seconds > 0),
  temperature          numeric(3,2) CHECK (temperature IS NULL OR (temperature >= 0 AND temperature <= 2)),
  moderation_enabled   boolean NOT NULL DEFAULT true,
  rate_limit_per_minute int CHECK (rate_limit_per_minute IS NULL OR rate_limit_per_minute > 0),
  daily_usage_limit    int CHECK (daily_usage_limit IS NULL OR daily_usage_limit > 0),
  spending_limit_cents int CHECK (spending_limit_cents IS NULL OR spending_limit_cents >= 0),
  updated_by           uuid REFERENCES public.profiles(id),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_configurations IS
  'Desired AI feature configuration set by admins. Does NOT store API keys (those stay in Edge Function secrets). NOT YET read by the ai-* Edge Functions — see migration header note.';

ALTER TABLE public.ai_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_configurations.select.admin"
  ON public.ai_configurations FOR SELECT
  USING (public.has_admin_permission('ai_config.view'));

CREATE OR REPLACE FUNCTION public.admin_upsert_ai_configuration(
  p_feature               text,
  p_enabled               boolean,
  p_provider              text,
  p_model                 text,
  p_fallback_provider     text,
  p_fallback_model        text,
  p_system_instruction    text,
  p_max_tokens            int,
  p_timeout_seconds       int,
  p_temperature           numeric,
  p_moderation_enabled    boolean,
  p_rate_limit_per_minute int,
  p_daily_usage_limit     int,
  p_spending_limit_cents  int,
  p_reason                text DEFAULT NULL
)
RETURNS public.ai_configurations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_config public.ai_configurations%ROWTYPE;
BEGIN
  IF NOT public.has_admin_permission('ai_config.manage') THEN
    RAISE EXCEPTION 'You do not have permission to change AI configuration';
  END IF;

  INSERT INTO public.ai_configurations (
    feature, enabled, provider, model, fallback_provider, fallback_model,
    system_instruction, max_tokens, timeout_seconds, temperature,
    moderation_enabled, rate_limit_per_minute, daily_usage_limit, spending_limit_cents,
    updated_by
  ) VALUES (
    p_feature, p_enabled, p_provider, p_model, p_fallback_provider, p_fallback_model,
    p_system_instruction, p_max_tokens, p_timeout_seconds, p_temperature,
    p_moderation_enabled, p_rate_limit_per_minute, p_daily_usage_limit, p_spending_limit_cents,
    auth.uid()
  )
  ON CONFLICT (feature) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    provider = EXCLUDED.provider,
    model = EXCLUDED.model,
    fallback_provider = EXCLUDED.fallback_provider,
    fallback_model = EXCLUDED.fallback_model,
    system_instruction = EXCLUDED.system_instruction,
    max_tokens = EXCLUDED.max_tokens,
    timeout_seconds = EXCLUDED.timeout_seconds,
    temperature = EXCLUDED.temperature,
    moderation_enabled = EXCLUDED.moderation_enabled,
    rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
    daily_usage_limit = EXCLUDED.daily_usage_limit,
    spending_limit_cents = EXCLUDED.spending_limit_cents,
    updated_by = EXCLUDED.updated_by,
    updated_at = now()
  RETURNING * INTO v_config;

  PERFORM public.log_admin_action(
    'ai_configuration.updated', 'ai_configuration', NULL, p_reason, jsonb_build_object('feature', p_feature), NULL, to_jsonb(v_config)
  );

  RETURN v_config;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_ai_configuration(
  text, boolean, text, text, text, text, text, int, int, numeric, boolean, int, int, int, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_ai_configuration(
  text, boolean, text, text, text, text, text, int, int, numeric, boolean, int, int, int, text
) TO authenticated;

INSERT INTO public.ai_configurations (feature, model, provider) VALUES
  ('assistant',           'tencent/hy3:free', 'openrouter'),
  ('search',               'tencent/hy3:free', 'openrouter'),
  ('recommendation',       'tencent/hy3:free', 'openrouter'),
  ('venue_description',    'tencent/hy3:free', 'openrouter'),
  ('cost_estimator',       'tencent/hy3:free', 'openrouter'),
  ('package_comparison',   'tencent/hy3:free', 'openrouter'),
  ('embeddings',           'text-embedding-3-small', 'openai')
ON CONFLICT (feature) DO NOTHING;

-- ================================================================
-- ai_usage_logs — real schema, unpopulated until Edge Functions are
-- instrumented to write to it (flagged follow-up, see migration header)
-- ================================================================
CREATE TABLE public.ai_usage_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature           text NOT NULL,
  provider          text NOT NULL,
  model             text NOT NULL,
  actor_id          uuid REFERENCES public.profiles(id),
  input_tokens      int,
  output_tokens     int,
  estimated_cost_cents int,
  duration_ms       int,
  success           boolean NOT NULL,
  error_category    text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_logs_feature_created ON public.ai_usage_logs (feature, created_at DESC);

COMMENT ON TABLE public.ai_usage_logs IS
  'AI request metadata (never prompt content). Populated by ai-* Edge Functions once instrumented — empty today.';

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_logs.select.admin"
  ON public.ai_usage_logs FOR SELECT
  USING (public.has_admin_permission('ai_config.view'));

-- Edge Functions run with the service role, which bypasses RLS entirely,
-- so no INSERT policy is needed for them; no other role should ever write
-- here, which the absence of an INSERT policy for authenticated/anon
-- already guarantees.

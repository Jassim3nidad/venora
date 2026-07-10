-- ============================================================
-- Migration 030 — AI package comparison log
-- ============================================================
-- Package comparisons span 2-4 venue_packages, possibly across
-- different venues, so they don't fit ai_generated_content (which is
-- venue-scoped 1:1). This is an analytics/cache log, not editorial
-- content — no approval workflow needed.

CREATE TABLE public.ai_package_comparisons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid                 REFERENCES public.profiles(id),
  package_ids uuid[]      NOT NULL CHECK (array_length(package_ids, 1) BETWEEN 2 AND 4),
  summary     jsonb       NOT NULL, -- { highlights: [...], tradeoffs: [...], bestFor: {...} }
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_pkg_cmp_user ON public.ai_package_comparisons(user_id);

COMMENT ON TABLE public.ai_package_comparisons IS
  'Logs AI-narrated package comparisons (2-4 packages). Analytics only — the comparison table itself is computed deterministically in the Edge Function, not stored here.';

ALTER TABLE public.ai_package_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_pkg_cmp.select.self" ON public.ai_package_comparisons
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "ai_pkg_cmp.all.admin" ON public.ai_package_comparisons
  FOR ALL USING (public.is_admin());

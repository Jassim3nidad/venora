-- Lock the AI runtime to the approved OpenRouter architecture. Direct provider
-- fallbacks and the former provider-specific embeddings path are intentionally
-- disabled; database search remains the source of venue facts and ranking.

UPDATE public.ai_configurations
SET provider = 'openrouter',
    model = 'tencent/hy3:free',
    fallback_provider = NULL,
    fallback_model = NULL,
    enabled = CASE WHEN feature = 'embeddings' THEN false ELSE enabled END,
    updated_at = now();

ALTER TABLE public.ai_configurations
  DROP CONSTRAINT IF EXISTS ai_configurations_approved_provider_model;

ALTER TABLE public.ai_configurations
  ADD CONSTRAINT ai_configurations_approved_provider_model
  CHECK (
    provider = 'openrouter'
    AND model = 'tencent/hy3:free'
    AND fallback_provider IS NULL
    AND fallback_model IS NULL
    AND (feature <> 'embeddings' OR enabled = false)
  );

COMMENT ON CONSTRAINT ai_configurations_approved_provider_model
  ON public.ai_configurations IS
  'Enforces OpenRouter with tencent/hy3:free and prevents unapproved provider/model fallback; legacy embeddings configuration remains disabled.';

-- Transition the existing approved-model constraint before the Qwen runtime
-- lock migration updates rows. This prerequisite keeps fresh and hosted
-- migration sequences valid without rewriting applied migration history.

BEGIN;

ALTER TABLE public.ai_configurations
  DROP CONSTRAINT IF EXISTS ai_configurations_approved_provider_model;

UPDATE public.ai_configurations
SET provider = 'openrouter',
    model = 'qwen/qwen3.7-flash',
    fallback_provider = NULL,
    fallback_model = NULL,
    enabled = CASE WHEN feature = 'embeddings' THEN false ELSE enabled END,
    updated_at = now();

ALTER TABLE public.ai_configurations
  ADD CONSTRAINT ai_configurations_approved_provider_model
  CHECK (
    provider = 'openrouter'
    AND model = 'qwen/qwen3.7-flash'
    AND fallback_provider IS NULL
    AND fallback_model IS NULL
    AND (feature <> 'embeddings' OR enabled = false)
  );

COMMENT ON CONSTRAINT ai_configurations_approved_provider_model
  ON public.ai_configurations IS
  'Enforces OpenRouter with qwen/qwen3.7-flash and prevents unapproved provider/model fallback; legacy embeddings configuration remains disabled.';

COMMIT;

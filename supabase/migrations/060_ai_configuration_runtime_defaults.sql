-- ============================================================
-- Migration 060 — AI Configuration Runtime Defaults
-- ============================================================
--
-- migration 058 seeded every ai_configurations row with the table's
-- generic defaults (max_tokens=1024, temperature=NULL) before the Edge
-- Functions were inspected. Now that they're being wired to actually READ
-- this table (see supabase/functions/_shared/ai-config.ts), enforcing
-- those generic defaults as hard limits would REGRESS working behavior —
-- every function today calls OpenRouter with max_tokens=4000 (2000 for
-- ai-search) and a per-function tuned temperature, and structured JSON
-- output (cost estimator, package comparison, search, venue description)
-- needs that headroom to avoid truncation.
--
-- This migration sets each feature's stored config to match its CURRENT
-- hardcoded behavior exactly, so turning on enforcement is a no-op for
-- existing behavior. Admins can lower these from the AI Configuration
-- page afterward if they want tighter limits.

UPDATE public.ai_configurations SET max_tokens = 4000, temperature = 0.40 WHERE feature = 'assistant';
UPDATE public.ai_configurations SET max_tokens = 4000, temperature = 0.20 WHERE feature = 'cost_estimator';
UPDATE public.ai_configurations SET max_tokens = 4000, temperature = 0.30 WHERE feature = 'package_comparison';
UPDATE public.ai_configurations SET max_tokens = 4000, temperature = 0.30 WHERE feature = 'recommendation';
UPDATE public.ai_configurations SET max_tokens = 2000, temperature = 0.00 WHERE feature = 'search';
UPDATE public.ai_configurations SET max_tokens = 4000, temperature = 0.60 WHERE feature = 'venue_description';
-- embeddings has no temperature/max_tokens concept (it's an embeddings
-- call, not a chat completion) — left at the table defaults, unused by
-- the embeddings code path.

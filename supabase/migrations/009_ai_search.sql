-- ============================================================
-- Migration 009 — AI Domain
-- ============================================================

-- ── venue_embeddings ─────────────────────────────────────────
CREATE TABLE public.venue_embeddings (
  venue_id   uuid        PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  embedding  vector(1536),  -- OpenAI text-embedding-3-small (1536-dim)
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- IVFFlat index — faster build/insert than HNSW at expense of slight recall loss.
-- Switch to HNSW (see 009b comment) once index is stable and recall matters more.
-- lists = 100 → good for up to ~1M rows (rule of thumb: sqrt(rows))
CREATE INDEX idx_venue_embeddings_ivfflat
  ON public.venue_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON TABLE  public.venue_embeddings           IS 'OpenAI text-embedding-3-small vectors for semantic venue search.';
COMMENT ON COLUMN public.venue_embeddings.embedding IS '1536-dim vector. Cosine similarity via <=> operator. NULL until ai-search edge function runs.';

-- ── match_venues() RPC ────────────────────────────────────────
-- Called by ai-search Edge Function after generating the query embedding.
-- Hybrid: semantic similarity + keyword tsvector (re-ranked in Edge Function).
CREATE OR REPLACE FUNCTION public.match_venues(
  query_embedding  vector(1536),
  match_threshold  float    DEFAULT 0.70,
  match_count      int      DEFAULT 20,
  filter_province  text     DEFAULT NULL,
  filter_city      text     DEFAULT NULL,
  filter_capacity  int      DEFAULT NULL,
  filter_max_price numeric  DEFAULT NULL
)
RETURNS TABLE (
  id         uuid,
  name       text,
  slug       text,
  city       text,
  base_price numeric,
  avg_rating numeric,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    v.id,
    v.name,
    v.slug,
    v.city,
    v.base_price,
    v.avg_rating,
    (1 - (ve.embedding <=> query_embedding))::float AS similarity
  FROM   public.venue_embeddings ve
  JOIN   public.venues v ON v.id = ve.venue_id
  WHERE  v.status = 'published'
    AND  (filter_province IS NULL OR lower(v.province) = lower(filter_province))
    AND  (filter_city     IS NULL OR lower(v.city)     = lower(filter_city))
    AND  (filter_capacity IS NULL OR v.capacity_max   >= filter_capacity)
    AND  (filter_max_price IS NULL OR v.base_price    <= filter_max_price)
    AND  (1 - (ve.embedding <=> query_embedding)) >= match_threshold
  ORDER  BY ve.embedding <=> query_embedding
  LIMIT  match_count;
$$;

COMMENT ON FUNCTION public.match_venues IS
  'Semantic venue search. Called from ai-search Edge Function after query is embedded. Returns published venues above similarity threshold. Re-rank with keyword tsvector in Edge Function.';

-- ── Trigger: invalidate embedding on venue content change ─────
CREATE OR REPLACE FUNCTION public.invalidate_venue_embedding()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.name        IS DISTINCT FROM NEW.name        OR
      OLD.description IS DISTINCT FROM NEW.description OR
      OLD.city        IS DISTINCT FROM NEW.city        OR
      OLD.province    IS DISTINCT FROM NEW.province)
  THEN
    -- Set embedding to NULL to signal the ai-search Edge Function to re-embed
    UPDATE public.venue_embeddings
    SET    embedding = NULL, updated_at = now()
    WHERE  venue_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER venues_invalidate_embedding
  AFTER UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_venue_embedding();

-- ── ai_search_logs ────────────────────────────────────────────
CREATE TABLE public.ai_search_logs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid                 REFERENCES public.profiles(id),
  query_text     text        NOT NULL,
  parsed_filters jsonb,       -- { "city": "Quezon City", "capacity": 200, ... }
  results_count  int,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_search_logs_user ON public.ai_search_logs(user_id);

COMMENT ON TABLE public.ai_search_logs IS
  'Logs every AI search query. Used to train recommendation engine and improve search quality.';

-- ── ai_recommendation_events ──────────────────────────────────
CREATE TABLE public.ai_recommendation_events (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid                 REFERENCES public.profiles(id),
  venue_id  uuid                 REFERENCES public.venues(id),
  reason    jsonb,               -- { "matched": ["budget","location","event_type"] }
  shown_at  timestamptz NOT NULL DEFAULT now(),
  clicked   boolean     NOT NULL DEFAULT false
);

CREATE INDEX idx_ai_rec_user    ON public.ai_recommendation_events(user_id);
CREATE INDEX idx_ai_rec_clicked ON public.ai_recommendation_events(clicked, shown_at);

COMMENT ON TABLE public.ai_recommendation_events IS
  'Impression + click tracking for AI-recommended venues. Clicked=true CTR signals feed recommendation quality monitoring.';

-- ── ai_generated_content ──────────────────────────────────────
CREATE TABLE public.ai_generated_content (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id       uuid                 REFERENCES public.venues(id),
  content_type   text        NOT NULL, -- 'description' | 'seo_meta' | 'package_description'
  prompt         text,
  generated_text text,
  status         text        NOT NULL DEFAULT 'draft', -- 'draft' | 'approved' | 'rejected'
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_content_venue ON public.ai_generated_content(venue_id, content_type);

-- ── ai_conversations ──────────────────────────────────────────
CREATE TABLE public.ai_conversations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid                 REFERENCES public.profiles(id),
  session_id text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id);

CREATE TABLE public.ai_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);

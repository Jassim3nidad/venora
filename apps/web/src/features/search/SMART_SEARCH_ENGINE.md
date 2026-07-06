# Venora Smart Search Engine

## Folder Structure

```text
apps/web/src/features/search/
  api/ai-search.client.ts          Browser client for Supabase Edge Function calls
  hooks/use-smart-venue-search.ts  TanStack mutation hook for AI search
  schemas/search.schema.ts         Zod request, filter, intent, and response schemas
  types/search.types.ts            Public feature types and API envelope
  SMART_SEARCH_ENGINE.md           Feature implementation notes

supabase/functions/ai-search/
  index.ts                         OpenAI intent parsing, embeddings, RPC orchestration

supabase/migrations/
  015_smart_search_engine.sql      Search RPC, indexes, embedding payload function
```

## Database Schema

- `venue_embeddings`
  - Existing pgvector table storing `text-embedding-3-small` vectors per venue.
  - `embedding` is nullable so edited venues can be marked for regeneration.
- `ai_search_logs`
  - Stores `user_id`, `query_text`, `parsed_filters`, and `results_count`.
  - Written by the Edge Function with the service role key.
- `public.venues_for_embedding(refresh_limit int)`
  - Returns published venues with missing or null embeddings.
  - Builds deterministic text from name, description, location, capacity, price, venue type, amenities, and accessibility flags.
- `public.search_venues(...)`
  - Hybrid search RPC for filters plus semantic relevance.
  - Supports province, city, municipality, min/max budget, guests, venue types, indoor/outdoor, parking, pet friendly, wheelchair accessible, keyword, sort, and result limit.
- Indexes
  - Trigram index on `venues.municipality`.
  - B-tree index on `venues.indoor_outdoor`.
  - Composite boolean index for `parking_available`, `pet_friendly`, and `wheelchair_accessible`.

## API Design

- Client entry point: `searchVenuesWithAi(input)`.
- Edge Function: `POST /functions/v1/ai-search`.
- Required Edge Function secrets:
  - `OPENAI_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
- Optional Edge Function configuration:
  - `OPENAI_SEARCH_MODEL`, default `gpt-5.4-mini`
  - `OPENAI_EMBEDDING_MODEL`, default `text-embedding-3-small`
  - `AI_SEARCH_EMBED_REFRESH_LIMIT`, default `8`, max `25`
- Local Edge Function env example: `supabase/.env.example`.
- Deployed Supabase secret setup:

```bash
supabase secrets set OPENAI_API_KEY=your-rotated-key
supabase secrets set OPENAI_SEARCH_MODEL=gpt-5.4-mini
supabase secrets set OPENAI_EMBEDDING_MODEL=text-embedding-3-small
supabase secrets set AI_SEARCH_EMBED_REFRESH_LIMIT=8
```

- Request:

```ts
{
  query?: string;
  filters?: {
    q?: string;
    keyword?: string;
    province?: string;
    city?: string;
    municipality?: string;
    min_budget?: number;
    max_budget?: number;
    guests?: number;
    venue_types?: ("garden" | "beach" | "resort" | "hotel" | "restaurant" | "church")[];
    indoor_outdoor?: "indoor" | "outdoor" | "both";
    parking?: boolean;
    pet_friendly?: boolean;
    wheelchair_accessible?: boolean;
    per_page?: number;
    sort_by?: "relevance" | "price_asc" | "price_desc" | "rating" | "capacity";
  };
}
```

- Response envelope:

```ts
{
  data: {
    venues: SmartVenueSearchVenue[];
    parsedFilters: SmartVenueSearchIntent;
    fallbackReason?: string | null;
    embeddedVenueCount?: number;
  };
  error: null;
}
```

## UI Pages

- Primary page: `app/(customer)/venues/page.tsx`.
- Client experience: `src/features/venues/ui/VenuesClient.tsx`.
- Filter shell: `src/components/layout/Sidebar.tsx`.

## Components

- Keyword search input filters the loaded venue list instantly.
- Natural language search form calls the Edge Function and ranks local cards by returned venue IDs.
- Sidebar filters include:
  - Province, city, municipality.
  - Budget preset plus exact min/max budget.
  - Guest capacity.
  - Venue type: garden, beach, resort, hotel, restaurant, church.
  - Indoor, outdoor, both.
  - Parking, pet friendly, wheelchair accessible, plus existing amenities.

## Validation

- Browser request and response validation uses Zod in `search.schema.ts`.
- The Edge Function sanitizes strings, caps query length, normalizes numbers, maps venue type enums, and merges explicit UI filters over AI-inferred filters.
- The SQL function clamps `match_count` to 1..50.

## Error Handling

- Client errors throw `SmartSearchClientError` with stable codes.
- Edge Function errors return `{ data: null, error: { code, message } }`.
- OpenAI parsing failures fall back to deterministic parsing.
- Embedding failures fall back to keyword and structured filter search.
- Search logs are best-effort and do not fail the customer request.

## Loading States

- `useSmartVenueSearch()` exposes `isPending`.
- The AI search button shows a `Loader2` spinner while the Edge Function is running.
- Favorite toggles keep their existing optimistic state and pending disable behavior.

## Empty States

- If filters or AI search return no matching local cards, the marketplace shows the existing empty result panel with a clear-filters action.
- AI result chips can be cleared independently with `Clear AI`.

## Security Considerations

- `OPENAI_API_KEY` is only read inside the Supabase Edge Function.
- Browser code calls Supabase Functions through the anon client and never receives provider credentials.
- The Edge Function uses the service role key only server-side for RPC calls, embedding upserts, and logs.
- Public venue visibility remains constrained to `status = 'published'` in the search RPC.
- AI logs store parsed filters and query text, not raw OpenAI responses.

## Responsive Behavior

- Desktop keeps the persistent filter sidebar.
- Mobile uses the existing bottom-sheet filter dialog.
- Search and sort controls collapse into a single-column layout before widening into split controls.
- Chips wrap instead of overflowing.

## Future Scalability

- Move embedding refresh to a scheduled Supabase cron job when venue volume grows.
- Add cursor pagination once the marketplace stops preloading all published venues.
- Add analytics dashboards over `ai_search_logs` for zero-result searches and popular filters.
- Add click-through events to `ai_recommendation_events` from result cards.
- Upgrade `venue_embeddings` from IVFFlat to HNSW when recall is more important than faster bulk indexing.

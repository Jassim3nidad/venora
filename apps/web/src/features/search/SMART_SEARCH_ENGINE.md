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
  index.ts                         OpenRouter intent parsing and RPC orchestration

supabase/functions/_shared/
  text.ts                          normalizeText/cleanString/looksVenueRelated (shared with ai-assistant)
  venues.ts                        toVenuePayload row mapper (shared with ai-recommendation, ai-assistant)

supabase/migrations/
  015_smart_search_engine.sql      Search RPC, indexes, embedding payload function
```

See `docs/modules/ai-features.md` for the other five AI features
(Cost Estimator, Recommendation, Description Generator, Package
Comparison, Customer Assistant), which reuse the `_shared/` modules
above.

## Database Schema

- `venue_embeddings`
  - Legacy pgvector table retained for migration compatibility; the approved
    runtime does not populate or query provider-specific embeddings.
- `ai_search_logs`
  - Stores `user_id`, `query_text`, `parsed_filters`, and `results_count`.
  - Written by the Edge Function with the service role key.
- `public.venues_for_embedding(refresh_limit int)`
  - Legacy helper retained for schema compatibility; unused by the current
    OpenRouter-only runtime.
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
  - `OPENROUTER_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
- Provider/model configuration is constrained to OpenRouter with
  `tencent/hy3:free` by migration 072 and runtime validation.
- Local Edge Function env example: `supabase/.env.example`.
- Deployed Supabase secret setup:

```bash
supabase secrets set OPENROUTER_API_KEY=your-rotated-key
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
- OpenRouter parsing failures return a safe provider error; when AI parsing is
  disabled or rate-limited, deterministic parsing remains available.
- Search ranking uses database keyword, structured filter, rating, and
  relevance signals without a direct embedding-provider call.
- Search logs are best-effort and do not fail the customer request.

## Loading States

- `useSmartVenueSearch()` exposes `isPending`.
- The AI search button shows a `Loader2` spinner while the Edge Function is running.
- Favorite toggles keep their existing optimistic state and pending disable behavior.

## Empty States

- If filters or AI search return no matching local cards, the marketplace shows the existing empty result panel with a clear-filters action.
- AI result chips can be cleared independently with `Clear AI`.

## Security Considerations

- `OPENROUTER_API_KEY` is only read inside the Supabase Edge Function.
- Browser code calls Supabase Functions through the anon client and never receives provider credentials.
- The Edge Function uses the service role key only server-side for RPC calls and logs.
- Public venue visibility remains constrained to `status = 'published'` in the search RPC.
- AI logs store parsed filters and query text, not raw OpenRouter responses.

## Responsive Behavior

- Desktop keeps the persistent filter sidebar.
- Mobile uses the existing bottom-sheet filter dialog.
- Search and sort controls collapse into a single-column layout before widening into split controls.
- Chips wrap instead of overflowing.

## Future Scalability

- Add cursor pagination once the marketplace stops preloading all published venues.
- Add analytics dashboards over `ai_search_logs` for zero-result searches and popular filters.
- Remove the legacy embedding table/functions only through an approved forward
  migration after hosted schema compatibility is verified.

Click-through tracking into `ai_recommendation_events` is implemented (see
`docs/modules/ai-features.md` → Venue Recommendation) — no longer a future item.

# AI Feature Suite

Covers the five AI features implemented/fixed alongside Natural Language
Search (already documented in
`apps/web/src/features/search/SMART_SEARCH_ENGINE.md`): Cost Estimator,
Venue Recommendation, Venue Description Generator, Package Comparison,
and the Customer Assistant.

## Shared Architecture

- **All LLM calls run in Supabase Edge Functions** (`supabase/functions/*`),
  never in Next.js route handlers or Server Actions — `OPENAI_API_KEY`
  lives only in Edge Function secrets (`supabase secrets set ...`), never
  in `apps/web/.env*`.
- **Response envelope**: `{ data: T, error: null } | { data: null, error: { code, message, details? } }`
  for every function except `ai-assistant`, which streams raw OpenAI SSE
  (a single JSON envelope can't stream — its error paths before the
  stream starts still use the standard envelope).
- **Shared Deno modules** (`supabase/functions/_shared/`):
  - `text.ts` — `normalizeText`, `cleanString`, `looksVenueRelated` (used by `ai-search` and `ai-assistant`).
  - `embeddings.ts` — `createEmbeddings`, `embedQuery`, `warmVenueEmbeddings`, `toVectorLiteral` (used by `ai-search` and `ai-recommendation`).
  - `venues.ts` — `toVenuePayload`, the row → API shape mapper for `public.search_venues()` results (used by `ai-search`, `ai-recommendation`, `ai-assistant`).
- **Client pattern**: one `*.client.ts` per feature under `features/ai/api/` or `features/venues/api/`, double-validating request and response with Zod, throwing a feature-specific typed error class (mirrors `SmartSearchClientError`), then a thin TanStack Query hook.
- **Query keys**: `queryKeys.ai.*` in `apps/web/src/lib/query-keys.ts`.
- **Validation discipline**: every function that returns model-generated JSON validates the parsed shape server-side before persisting or responding — arithmetic is re-checked (cost estimator), enum/id membership is re-checked (package comparison `bestFor`), length/placeholder-token checks apply to free text (description generator). The model is never trusted for facts it wasn't given (venue/package facts, prices, booking data are always injected as structured context).

### A note on embeddings

`venue_embeddings` / `match_venues()` / `venues_for_embedding()` existed
in the schema since migration 009/015 but nothing ever called the OpenAI
embeddings API — `ai-search` always passed `query_embedding: null`. This
was fixed as part of this work: `ai-search` and `ai-recommendation` now
both call `warmVenueEmbeddings()` (bounded batch, `AI_SEARCH_EMBED_REFRESH_LIMIT`,
default 8) before searching, and `embedQuery()` to embed the user's
query/preference text. `public.search_venues()` blends semantic
similarity with keyword/rating scoring, so results are still useful
before a venue's embedding has been warmed — semantic quality just
improves as more venues get embedded over successive searches. There is
still no scheduled backfill job; see Future Scalability.

---

## Cost Estimator

**Structure**: `supabase/functions/ai-cost-estimator/index.ts` · `features/ai/{schemas/ai.schema.ts, api/ai-cost-estimator.client.ts, hooks/use-cost-estimator.ts, ui/CostEstimator{Form,Result,Panel}.tsx}` · mounted as a dialog on `app/(customer)/venues/[slug]/page.tsx` via `VenueDetails.tsx`.

**DB**: No new tables. Logs to `ai_generated_content` with `content_type: 'cost_estimate'`, `status: 'approved'` (no approval workflow needed — it's a system-generated log, not editorial content).

**API / Prompt**: `POST /functions/v1/ai-cost-estimator` — `{ venueId, guestCount, eventType, durationHours, includesCatering, includesAv }`. OpenAI call uses `response_format: json_schema` (`strict: true`) for `{ baseVenue, packages, catering, av, total, breakdown[] }`. System prompt: *"You are a venue event cost estimator for the Philippine events market... `total` must equal the sum of baseVenue + packages + catering + av... `breakdown` is 3-6 short line items explaining the total in plain English."* The Edge Function re-validates `total === sum(parts)` (±4 peso rounding tolerance) and retries once on failure before giving up.

**Error handling**: 404 if venue not found/unpublished, 502 `ESTIMATE_FAILED` after one retry, standard envelope throughout.

**Security**: Auth optional (works for anonymous browsing); writes go through the service-role client, same as every other logging table here.

**Responsive**: Dialog-based, works down to mobile widths; form is a 2-column grid collapsing implicitly via dialog max-width.

**Scalability / Future**: Estimates aren't cached/deduped yet — repeat identical requests re-call OpenAI. Add a short-TTL cache keyed on `(venueId, guestCount, eventType, durationHours, catering, av)` reading from `ai_generated_content` before calling OpenAI again.

---

## Venue Recommendation

**Structure**: `supabase/functions/ai-recommendation/index.ts` · `features/ai/{schemas/recommendation.schema.ts, api/ai-recommendation.client.ts, hooks/use-venue-recommendations.ts, ui/RecommendedVenues.tsx}` · mounted at the bottom of `VenueDetails.tsx`. Click-tracking RPC in `supabase/migrations/028_recommendation_click_rpc.sql`.

**DB**: Reuses `ai_recommendation_events` (`user_id, venue_id, reason jsonb, shown_at, clicked`). New `public.record_recommendation_click(event_id)` RPC (`SECURITY DEFINER`, scoped to `user_id = auth.uid()`) lets the browser mark a click without service-role access.

**API / Prompt**: `POST /functions/v1/ai-recommendation` (auth required — 401 otherwise). Pulls the user's last 10 completed bookings + favorites. If both empty → cold-start (top-rated published venues via `search_venues(sort_by: 'rating')`, `reason: { cold_start: true }`). Otherwise, OpenAI summarizes preferences into one search-query sentence — prompt: *"Given a user's past booked and favorited venues, write one sentence... describing the kind of venue they'd likely want next — style, setting, price tier."* — that sentence is embedded and passed to `search_venues()` alongside itself as a keyword fallback. Booked/favorited venues are excluded from results. Impressions are batch-inserted into `ai_recommendation_events`; the response includes `recommendationEventIds` keyed by venue id so the frontend can call the click RPC on navigation.

**Error handling**: 401 unauthenticated, 500 `RECOMMENDATION_FAILED` on RPC failure; embedding failures degrade silently to keyword/rating ranking (never surfaced as an error, since `search_venues` still returns useful results without a vector).

**Security**: `ai_recommendation_events` RLS already scoped `SELECT` to `user_id = auth.uid()`; the new click RPC adds the equivalent scoped write path.

**Responsive**: 4-column → 2-column → 1-column card grid.

**Scalability / Future**: Preference summarization is one OpenAI call per request; consider caching per-user for a few hours. CTR from `ai_recommendation_events.clicked` is now actually populated — worth an admin analytics view.

---

## Venue Description Generator

**Structure**: `supabase/functions/ai-venue-description/index.ts` · `features/venues/{schemas/ai-description.schema.ts, api/ai-description.client.ts, hooks/use-generate-venue-description.ts, ui/DescriptionGeneratorPanel.tsx}` · approve/reject in `features/venues/application/actions.ts` · mounted on `app/(venue-owner)/dashboard/venues/[id]/edit/page.tsx`.

**DB**: Reuses `ai_generated_content` (`content_type: 'description' | 'seo_meta' | 'package_description'`) and `venues.ai_generated_description`. New migration `029_ai_generated_content_owner_update.sql` adds an `UPDATE` RLS policy (`ai_content.update.owner`, scoped via `is_org_member_for_venue`) — previously only admins could ever move a draft to approved/rejected.

**API / Prompt**: `POST /functions/v1/ai-venue-description` (auth required; the function self-checks `organization_members` + `user_roles` since it runs with the service-role key and bypasses RLS). Three prompt variants by `contentType`:
- `description`: *"Write a warm, specific, 2-3 paragraph venue description from the structured facts given. Never invent amenities, prices, or capacity numbers not present in the input..."*
- `seo_meta`: single sentence, ≤160 chars, no markdown.
- `package_description`: 2-4 sentences that must reference the package's actual `inclusions` array.

Output is validated for length (per-type max) and placeholder tokens (`[bracket]`, `{{mustache}}`) before being saved as `status: 'draft'`. Approval is a separate **Server Action** (`approveGeneratedContentAction`) — pure DB write, no LLM call — that also copies `generated_text` into `venues.ai_generated_description` when `content_type === 'description'`. RLS (not a manual role check) is what actually enforces who can approve: an `UPDATE` the policy denies matches zero rows rather than erroring, which the action detects via `.select().maybeSingle()` and reports as `ForbiddenError`.

**Error handling**: 403 `FORBIDDEN` (not an org member/admin), 404 venue/package not found, 502 on length/placeholder validation failure.

**Security**: Generation requires org membership or admin (self-enforced in the function); approval requires the same via RLS.

**Responsive**: Panel sits in the venue edit page's right column, stacks below the photo uploader on narrow viewports (existing `xl:grid-cols-[...]` breakpoint).

**Scalability / Future**: No diff view between the current and AI description yet (shown side-by-side, not diffed). No batch-generate-for-all-venues admin tool.

---

## Package Comparison

**Structure**: `supabase/functions/ai-package-comparison/index.ts` · `features/venues/{schemas/comparison.schema.ts, api/ai-package-comparison.client.ts, hooks/use-package-comparison.ts, ui/{PackageComparisonTable,PackageComparePicker}.tsx}` · entry point on `VenueDetails.tsx` (checkbox picker → dialog).

**DB**: New table `ai_package_comparisons` (migration `030_ai_package_comparisons.sql`) — `user_id, package_ids uuid[2..4], summary jsonb`. Analytics/cache only, no approval workflow (comparisons aren't editorial content, and unlike `ai_generated_content` they aren't scoped to a single venue).

**API / Prompt**: `POST /functions/v1/ai-package-comparison` — `{ packageIds: string[] }` (2-4 uuids). The comparison table itself (price, guest range, inclusion diff) is **computed deterministically in code** — the model is never asked to do arithmetic or set-diffs. The LLM call is narrative-only: prompt *"You compare event venue packages for a customer... never invent facts not given. Return... highlights (3-5 bullets), tradeoffs (2-4 bullets), and bestFor (one entry per package)."* — `response_format: json_schema, strict: true`, with `bestFor` as an array of `{ packageId, note }` (not a keyed object, since strict JSON Schema can't express a dynamic key set for 2-4 variable package ids). Every `bestFor.packageId` is re-validated against the actual input ids before being trusted.

**Error handling**: If the AI summary call or validation fails, `aiSummary` is `null` and the deterministic table is still returned — the UI renders the table regardless and simply omits the AI card. This is deliberate graceful degradation, not a bug.

**Security**: Auth optional; packages compared must belong to `published` venues.

**Responsive**: Comparison table scrolls horizontally on narrow viewports (`overflow-x-auto`); picker grid is 1-column on mobile, 2-column on larger screens.

**Scalability / Future**: No cross-venue comparison UI polish yet (works functionally — packages can be from different venues — but the picker entry point today only surfaces one venue's packages at a time).

---

## Customer Assistant

**Structure**: `supabase/functions/ai-assistant/index.ts` · `features/ai/{api/ai-assistant.client.ts, hooks/use-assistant-conversation.ts, ui/{AssistantWidget,AssistantWidgetGate}.tsx}` · mounted globally in `src/components/providers.tsx`, gated off `/dashboard`, `/admin`, and auth pages by pathname.

**DB**: Reuses `ai_conversations` (`user_id` nullable, `session_id`) and `ai_messages` (`role`, `content`). No schema changes.

**API / Prompt**: `POST /functions/v1/ai-assistant` — `{ conversationId?, sessionId, message }`, streamed response. System prompt: *"You are Venora's customer assistant... Use only the venue/booking facts provided in the context message — never invent prices, availability, or booking details... Keep answers under 120 words unless asked for detail."* Retrieval context is injected as a second system message only when relevant:
- If the message looks venue-related (`looksVenueRelated()` keyword heuristic), the top 5 matches from `search_venues(keyword: message)` are included.
- If the caller is authenticated, their 5 most recent bookings (venue name, date, status) are included.

The user's message is persisted immediately (survives a failed completion call); the assistant's full response is accumulated server-side while being forwarded to the client chunk-by-chunk, then persisted once the stream ends. The very first SSE frame is a synthetic `{ conversationId }` event (distinguishable from OpenAI's `{ choices: [...] }` frames) so the client learns the conversation id to continue on the next message.

**Error handling**: Standard `{data,error}` envelope for pre-stream failures (auth not required, but validation/config/OpenAI-unreachable errors return normal JSON with the right status). Once streaming starts, errors are logged server-side and the stream simply ends — the client's `for await` loop exits and `isStreaming` clears without a special "stream broke" message today (see Future Scalability).

**Security**: A hard cap of 60 messages per conversation (`CONVERSATION_LIMIT_REACHED`, 429) is the first line of defense against unauthenticated abuse; per-IP rate limiting is not implemented yet. The assistant is explicitly instructed to never fabricate booking/payment details — retrieval context is the only source of truth.

**Responsive**: Floating widget is `360px` wide capped at `calc(100vw - 2.5rem)`, so it fits mobile viewports without overflow.

**Scalability / Future**:
- No message-history restore across page reloads yet — `sessionId` and `conversationId` persist in `localStorage` so a new message continues the *same* server-side conversation/context, but the visible transcript resets on reload. Restoring it needs a read path for `ai_messages` that works for anonymous sessions too (current RLS ties reads to `auth.uid()` via `is_conversation_participant`).
- Per-IP rate limiting (Edge Function or upstream) for anonymous chat.
- A distinguishable "connection lost" state mid-stream, rather than a silently-truncated reply.

---

## Environment Variables (Edge Function secrets only)

```bash
supabase secrets set OPENAI_API_KEY=...
supabase secrets set OPENAI_SEARCH_MODEL=gpt-4o-mini
supabase secrets set OPENAI_EMBEDDING_MODEL=text-embedding-3-small
supabase secrets set OPENAI_ESTIMATOR_MODEL=gpt-4o-mini
supabase secrets set OPENAI_RECOMMENDATION_MODEL=gpt-4o-mini
supabase secrets set OPENAI_COPY_MODEL=gpt-4o-mini
supabase secrets set OPENAI_COMPARISON_MODEL=gpt-4o-mini
supabase secrets set OPENAI_ASSISTANT_MODEL=gpt-4o-mini
supabase secrets set AI_SEARCH_EMBED_REFRESH_LIMIT=8
```

All model env vars are optional and default to `gpt-4o-mini` — set them individually to use a different model per feature without redeploying code.

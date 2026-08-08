# AI Venue Theme Preview

Lets a customer on a venue detail page restyle the venue's featured photo
under a fixed set of visual themes (Horror, Winter Wonderland, Beach
Sunset, …). The venue's architecture, layout, and proportions must stay
recognisably the same — only atmosphere, lighting, decor, and background
change.

Follows the shared conventions in `docs/modules/ai-features.md` (Edge
Function owns the model call and the API key, `{ data, error }` envelope,
Zod-validated `*.client.ts` + TanStack Query hook).

## Structure

| Layer | Path |
| --- | --- |
| Migration | `supabase/migrations/034_venue_theme_previews.sql` |
| Shared config | `packages/lib/src/venue-themes.ts` |
| Deno re-export | `supabase/functions/_shared/venue-themes.ts` |
| Edge Function | `supabase/functions/generate-theme-preview/index.ts` |
| Schema / client / hook | `features/venues/{schemas/theme-preview.schema.ts, api/theme-preview.client.ts, hooks/use-theme-preview.ts}` |
| UI | `features/venues/ui/ThemePreviewSection.tsx`, mounted from `VenueDetails.tsx` |

## Shared theme config

`packages/lib/src/venue-themes.ts` is the single source of truth for the
theme enum, chip labels/icons, the per-theme `themeDescription`, and
`buildThemePrompt()`. The web app imports it via `@venora/lib`; the Edge
Function imports the same file through
`supabase/functions/_shared/venue-themes.ts`, which re-exports it by
relative path. The file is deliberately dependency-free so Deno can load
it as-is — **do not add imports to it**.

Built-in themes: `horror`, `winter_wonderland`, `beach_sunset`,
`fairytale_garden`, `rustic_vintage`, `modern_minimalist`, `tropical`,
`christmas`. Plus the `custom` sentinel (`CUSTOM_THEME`) carrying
customer-written text — see [Custom themes](#custom-themes).

`themeDescription` is the main dial for output quality. Tune wording there
rather than editing the prompt template, so both stay aligned.

## Custom themes

The original spec listed freeform customer text as a non-goal, on two
grounds: prompt safety and cost predictability. It was added afterwards by
request, so both grounds are handled explicitly rather than assumed away.

**Prompt safety.** `sanitizeCustomPrompt()` strips control characters and
line breaks — the thing that lets `…\n\nIgnore the above and …` read as a
fresh instruction block — collapses whitespace, and caps at 200 characters.
Text shorter than 3 characters is a validation failure, never a silent
fallback to an empty theme. The Edge Function re-sanitises server-side; the
client's own call is a UX nicety, not a control. `buildCustomThemePrompt()`
then wraps the text with the structural constraints **both before and
after** it, so anything trying to countermand the opening constraints is
itself followed by them again. Beyond that the provider's own safety
filters apply, and a blocked generation lands in the normal `failed` path.

**Cost.** Custom renders are cached by hash exactly like built-in themes,
so the same words in any casing reuse one render. But a phrase one person
typed will rarely be typed again, so each is close to pure marginal cost —
hence a separate, tighter hourly budget
(`THEME_PREVIEW_CUSTOM_RATE_LIMIT_PER_HOUR`, default 3) counted only
against `theme = 'custom'` rows. Exhausting it leaves the eight built-in
themes usable, and the UI says so rather than showing a generic failure.

`custom_prompt` is public free text. Treat it as untrusted in any admin or
reporting UI that displays it.

## DB

`public.venue_theme_previews` — one row per
`(source_image_id, theme, prompt_hash)`, enforced by a UNIQUE constraint
that doubles as the cache key. `prompt_hash` is `''` for built-in themes
and a truncated SHA-256 of the lower-cased custom text otherwise; two CHECK
constraints keep `theme = 'custom'`, a non-null `custom_prompt`, and a
non-empty `prompt_hash` implying one another in both directions.

> **Naming note**: the feature spec called the source table `venue_photos`;
> this schema's photo table is `public.venue_images` (`0045_venues_core.sql`),
> so the column is `source_image_id`. The Edge Function's wire contract
> still uses `photoId` as the spec described.

Beyond the spec'd columns the table carries `requested_by` and
`requester_ip_hash` (salted SHA-256, never a raw IP) so rate limiting and
abuse tracing don't need a second table.

**RLS**: public `SELECT` on `status = 'ready'` only, plus an admin-only
`SELECT` for cost/quality review. There are deliberately **no**
INSERT/UPDATE/DELETE policies — the service role bypasses RLS, so their
absence makes the Edge Function the only possible writer.

**Storage**: public bucket `theme-previews`, path
`{venue_id}/{image_id}/{theme}.jpg`. Public read policy only; no write
policies, same reasoning as above.

## Edge Function

`POST /functions/v1/generate-theme-preview` —
`{ venueId, photoId, theme, customPrompt }` →
`{ preview: { status, theme, url, cached } }`. `customPrompt` is required
when `theme === 'custom'` and must be null otherwise.

Order of operations, chosen so nothing is spent before it has to be:

1. **Cache lookup** on `(source_image_id, theme)`. A `ready` row returns
   its Storage URL immediately — the model is never called twice for the
   same pair.
2. **Concurrency guard**: a `pending` row younger than 2 min returns
   `status: 'pending'` instead of starting a duplicate generation.
3. **Failure cool-down**: a `failed` row younger than 10 min returns
   `status: 'failed'` without retrying. Retries reuse the existing row, so
   without this they would sidestep the rate limit (which counts newly
   created rows) and let one bad photo burn budget in a loop.
4. **Ownership checks** — venue must be `published`, the photo must belong
   to it and be an image. The function holds the service-role key, so it
   self-enforces what RLS would otherwise do.
5. **Rate limit** — `THEME_PREVIEW_RATE_LIMIT_PER_HOUR` (default 10) new
   rows per hashed IP per rolling hour.
6. Claim the pair (`upsert` on the unique constraint) → download source →
   call the model → upload to Storage → mark `ready` with
   `model_used` and `generation_cost_usd`.
7. Any throw marks the row `failed` with `error_message` and returns a 502
   so the client can fall back to the original photo.

### Models

Selected by the `THEME_PREVIEW_PROVIDER` flag; both take image + prompt and
return an image, so the cache and the caller are unaffected by the choice.

- **`gemini`** (default) — `gemini-3.1-flash-image-preview` via
  `generativelanguage.googleapis.com` `:generateContent`. Cost is derived
  from `usageMetadata` token counts at env-configurable rates.
- **`openrouter`** — same call shape through OpenRouter, requesting
  `usage: { include: true }` so OpenRouter's reported USD charge is
  recorded directly rather than estimated.

> **Qwen-Image-Edit is not available.** The spec named it as the
> cost-comparison model, but OpenRouter lists no Qwen image-editing model —
> as of 2026-08-08 its only image-*output* models are Google's Gemini
> image family and OpenAI's `gpt-5-image*`. `qwen/qwen-image-edit` returns
> `400 not a valid model ID`. The OpenRouter path therefore defaults to
> `google/gemini-3.1-flash-image-preview`, which still gives a genuine
> billing and latency comparison against calling Google directly. Point
> `THEME_PREVIEW_OPENROUTER_MODEL` at anything else OpenRouter exposes to
> A/B it. `THEME_PREVIEW_PROVIDER=qwen` is kept as an alias for
> `openrouter` so existing deployments keep working.

**Free-tier OpenRouter accounts cannot run this.** An image-edit request
costs roughly 58k tokens (the input photo dominates), while a free-tier
balance affords ~12k, so every call fails with HTTP 402. Lowering
`max_tokens` does not close the gap. Either add OpenRouter credits or set
`GEMINI_API_KEY` and switch `THEME_PREVIEW_PROVIDER` back to `gemini`.

### Source photos

`venue_images.storage_path` holds either a bucket-relative path or, for
seeded venues, the venue's own public image URL. Both are handled, but the
external hosts reject requests with no `User-Agent`, so the fetch sends
one. Some hosts still 403 server-side fetches regardless — those venues
fail closed and fall back to the original photo, which is correct
behaviour rather than something to work around.

### Environment

Set as Edge Function secrets (`supabase secrets set …`), never in
`apps/web/.env*`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | — | required when provider is `gemini` |
| `OPENROUTER_API_KEY` | — | required when provider is `openrouter` |
| `THEME_PREVIEW_PROVIDER` | `gemini` | `gemini` \| `openrouter` (`qwen` = alias for `openrouter`) |
| `THEME_PREVIEW_GEMINI_MODEL` | `gemini-3.1-flash-image-preview` | model override |
| `THEME_PREVIEW_OPENROUTER_MODEL` | `google/gemini-3.1-flash-image-preview` | model override |
| `THEME_PREVIEW_RATE_LIMIT_PER_HOUR` | `10` | new generations per hashed IP |
| `THEME_PREVIEW_CUSTOM_RATE_LIMIT_PER_HOUR` | `3` | custom-prompt generations per hashed IP |
| `THEME_PREVIEW_IP_SALT` | `venora-theme-preview` | salt for the IP hash — set a real secret |
| `THEME_PREVIEW_GEMINI_INPUT_USD_PER_MTOK` | `0.30` | cost model, USD / 1M input tokens |
| `THEME_PREVIEW_GEMINI_OUTPUT_USD_PER_MTOK` | `30` | cost model, USD / 1M output tokens |

The two Gemini rate variables exist so provider price changes are a secret
update, not a redeploy. **Verify them against current Gemini pricing before
trusting `generation_cost_usd` for reporting.**

## Frontend

`ThemePreviewSection` renders below the gallery in the venue detail
column: an "Original" chip plus one chip per theme, a free-text field for
describing your own theme, and a before/after comparison viewport. The themed render sits underneath and the original is
clipped over it with `clip-path`; a full-bleed transparent
`<input type="range">` drives the divider, which gives drag *and* keyboard
control for free.

The section **returns `null`** unless the featured photo has a real UUID
id. Dataset/research fallback venues (`features/venues/data/research-venues.ts`)
have no `venue_images` rows, and `source_image_id` is a foreign key.

**Session cache**: `useThemePreview` is a `useQuery` keyed on
`queryKeys.ai.themePreview(photoId, theme, promptKey)` with
`staleTime`/`gcTime` of `Infinity` and `retry: false`. Returning to an
already-viewed theme — including a custom one typed earlier in the session
— re-renders from React Query's cache without re-invoking the function. A
`pending` response polls every 4s, capped at 5 attempts.

**Graceful degradation**: any error, `failed`, or exhausted `pending`
state leaves the original photo on screen with a small "Preview
unavailable, showing original" note. Nothing about this feature can block
the page — it is client-only and fires solely on user selection.

## Non-goals (v1)

- Featured photo only, not the whole gallery.
- No precomputation across venues — generate on first request, cache after.

## Future

- Precompute the two or three most-selected themes for featured venues off
  a scheduled job, so the common paths are warm.
- Roll the cool-down/rate-limit counters into a shared `_shared/rate-limit.ts`
  once a second Edge Function needs them.
- `generation_cost_usd` is per-row; an admin cost report over
  `sum(generation_cost_usd) group by model_used` is the natural next step
  for deciding the Gemini-vs-Qwen question.

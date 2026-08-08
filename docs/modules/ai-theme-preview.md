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

| Layer                  | Path                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Migration              | `supabase/migrations/034_venue_theme_previews.sql`                                                           |
| Shared config          | `packages/lib/src/venue-themes.ts`                                                                           |
| Deno re-export         | `supabase/functions/_shared/venue-themes.ts`                                                                 |
| Edge Function          | `supabase/functions/generate-theme-preview/index.ts`                                                         |
| Schema / client / hook | `features/venues/{schemas/theme-preview.schema.ts, api/theme-preview.client.ts, hooks/use-theme-preview.ts}` |
| UI                     | `features/venues/ui/ThemePreviewSection.tsx`, mounted from `VenueDetails.tsx`                                |

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

### Model and the provider seam

**`Qwen/Qwen-Image-Edit-2511`** via Hugging Face Inference Providers, routed
to the **`fal-ai`** provider, using the official `@huggingface/inference`
SDK. Imported from esm.sh rather than with an `npm:` specifier, because Deno
resolves `npm:` against node_modules and this monorepo's package.json makes
that ambiguous inside the functions directory.

`generateThemedImage(prompt, source, supabase)` is the **only** place a
provider is contacted, and it is also what decides mock vs live — so no
caller can reach a paid provider by accident. Swapping providers means
replacing that one function body.

Deno adaptation of the Node reference snippet: there is no `fs.readFileSync`.
The source photo is pulled from Supabase Storage into memory by
`loadSourceImage()` and handed over as a `Blob`; `imageToImage` returns a
`Blob`, which is read to bytes and uploaded. The SDK ships no timeout of its
own, so the call is wrapped in a `Promise.race` against
`THEME_PREVIEW_LIVE_TIMEOUT_MS` (default 90s; real calls land around 20s).

### Cost control: mock by default

A generation costs ~$0.03 against a ~$0.10/month credit — roughly three real
calls a month. Real calls are therefore demo content only, enforced in code
rather than by discipline. Four independent layers:

1. **`THEME_PREVIEW_MODE` defaults to `mock`.** Mock skips the provider
   entirely and returns a bundled placeholder after
   `THEME_PREVIEW_MOCK_DELAY_MS` (default 2000ms), so loading states,
   polling and the cache are all exercised for free. Live requires the env
   var to be exactly `live`.
2. **CI/test refusal.** Even with the flag set, live is downgraded to mock
   if any of `CI`, `GITHUB_ACTIONS`, `VERCEL_ENV`, `VITEST`,
   `JEST_WORKER_ID`, `PLAYWRIGHT_TEST_BASE_URL` (and similar) is set, or if
   `NODE_ENV=test`. The downgrade is logged.
3. **Cache first, always.** The cache check runs before the provider seam is
   reached, so a combination that already exists is never regenerated.
4. **Spend cap.** Before any live call, cumulative `estimated_cost_cents`
   for `feature = 'theme_preview'` this calendar month is summed; if adding
   this call would exceed `THEME_PREVIEW_SPEND_CAP_CENTS` (default 8c,
   headroom under the 10c credit) the call is refused _before_ it fires and
   falls through to the normal graceful-degradation path. It **fails
   closed**: if the total cannot be read, the live call does not happen.

Mock rows are logged at 0c so they never consume the live budget.

> **Mock renders are cache-tagged.** A row generated in mock mode stores
> `model_used = 'mock/static-fixture'`. In mock mode that is a normal cache
> hit, but a **live** run treats it as a miss and regenerates over it —
> otherwise the first real demo run would silently serve placeholders from
> cache, and nothing would look wrong until someone examined the images.

### Going live for demo content

One command, then generate, then turn it straight back off:

```bash
supabase secrets set THEME_PREVIEW_MODE=live
```

`HF_TOKEN` must already be set. Revert with
`supabase secrets set THEME_PREVIEW_MODE=mock`.

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

| Variable                                   | Default                     | Purpose                                                                    |
| ------------------------------------------ | --------------------------- | -------------------------------------------------------------------------- |
| `HF_TOKEN`                                 | —                           | **required for live only.** Hugging Face token, read via env, never logged |
| `THEME_PREVIEW_MODE`                       | `mock`                      | `mock` or `live`. Live is also refused in CI/test                          |
| `THEME_PREVIEW_HF_MODEL`                   | `Qwen/Qwen-Image-Edit-2511` | model override                                                             |
| `THEME_PREVIEW_HF_PROVIDER`                | `fal-ai`                    | Inference Provider override                                                |
| `THEME_PREVIEW_MOCK_DELAY_MS`              | `2000`                      | fake latency in mock mode                                                  |
| `THEME_PREVIEW_LIVE_TIMEOUT_MS`            | `90000`                     | live provider timeout                                                      |
| `THEME_PREVIEW_SPEND_CAP_CENTS`            | `8`                         | hard cap; live refused past this                                           |
| `THEME_PREVIEW_COST_PER_CALL_CENTS`        | `3`                         | assumed cost per live generation                                           |
| `THEME_PREVIEW_RATE_LIMIT_PER_HOUR`        | `10`                        | new generations per hashed IP                                              |
| `THEME_PREVIEW_CUSTOM_RATE_LIMIT_PER_HOUR` | `3`                         | custom-prompt generations per hashed IP                                    |
| `THEME_PREVIEW_IP_SALT`                    | `venora-theme-preview`      | salt for the IP hash — set a real secret                                   |

The two Gemini rate variables exist so provider price changes are a secret
update, not a redeploy. **Verify them against current Gemini pricing before
trusting `generation_cost_usd` for reporting.**

## Frontend

`ThemePreviewSection` renders below the gallery in the venue detail
column: an "Original" chip plus one chip per theme, a free-text field for
describing your own theme, and a before/after comparison viewport. The themed render sits underneath and the original is
clipped over it with `clip-path`; a full-bleed transparent
`<input type="range">` drives the divider, which gives drag _and_ keyboard
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

/**
 * Supabase Edge Function: generate-theme-preview
 *
 * Re-renders a venue photo under a fixed visual theme (horror, christmas, ...)
 * while preserving the venue's architecture, and caches the result so each
 * (photo, theme) pair costs exactly one image-edit call for all time.
 *
 * Contract: { venueId, photoId, theme } -> { preview: { status, url, ... } }.
 * `photoId` is a public.venue_images row id (this schema's photo table).
 *
 * Runs with the service-role key because it is the only writer of
 * venue_theme_previews and the theme-previews bucket — so it self-enforces
 * everything RLS would otherwise do: the venue must be published and the
 * photo must belong to it.
 *
 * Image generation goes through generateThemedImage(), the single provider
 * seam, which also decides mock vs live. THEME_PREVIEW_MODE defaults to
 * "mock" everywhere: real Hugging Face calls cost ~$0.03 against a ~$0.10
 * monthly credit, so they are opt-in, refused in CI, and further bounded by
 * a spend cap checked before the provider is contacted.
 *
 * This function does NOT use _shared/openrouter.ts or _shared/ai-config.ts.
 * The qwen/qwen3.7-flash *chat* model those provide powers the other ai-*
 * functions and is a separate feature, deliberately untouched here.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// esm.sh, not npm:, to match the supabase-js import above — Deno resolves
// npm: specifiers against node_modules, which this monorepo's package.json
// makes ambiguous inside the functions directory.
//
// TODO(theme-preview): this resolves from the esm.sh CDN at deploy time, so
// esm.sh is in the deploy path. Version-pinned and consistent with the rest
// of the codebase, so fine for now — vendor the SDK if esm.sh availability
// ever blocks a deploy.
import { InferenceClient } from "https://esm.sh/@huggingface/inference@4.13.25";
import { MOCK_IMAGE_BASE64, MOCK_IMAGE_MIME } from "./mock-image.ts";
import {
  buildCustomThemePrompt,
  buildThemePrompt,
  CUSTOM_THEME,
  customPromptCacheKey,
  isThemeSelection,
  isVenueTheme,
  sanitizeCustomPrompt,
  type ThemeSelection,
} from "../_shared/venue-themes.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PREVIEW_BUCKET = "theme-previews";
const SOURCE_BUCKET = "venue-images";

/** A pending row older than this is treated as abandoned and retried. */
const STALE_PENDING_MS = 2 * 60 * 1000;

/**
 * Cool-down before a failed pair is retried. Retries reuse the existing row,
 * so without this they would sidestep the per-visitor rate limit (which counts
 * newly created rows) and let one bad photo burn budget in a loop.
 *
 * TODO(theme-preview): these two mechanisms are coupled. The per-IP limiter
 * counts row *creation*, not requests, so a retry against an existing row is
 * invisible to it — this cool-down is what closes that hole. Do not weaken or
 * remove either one without replacing the other; a request-level counter
 * would decouple them properly.
 */
const FAILED_RETRY_COOLDOWN_MS = 10 * 60 * 1000;

const HF_PROVIDER = Deno.env.get("THEME_PREVIEW_HF_PROVIDER") ?? "fal-ai";
const HF_MODEL = Deno.env.get("THEME_PREVIEW_HF_MODEL") ??
  "Qwen/Qwen-Image-Edit-2511";

/** Mock latency, so loading states are exercised without provider cost. */
const MOCK_DELAY_MS = Number(
  Deno.env.get("THEME_PREVIEW_MOCK_DELAY_MS") ?? "2000",
);

/** Live provider timeout — real calls land around 20s. */
const LIVE_TIMEOUT_MS = Number(
  Deno.env.get("THEME_PREVIEW_LIVE_TIMEOUT_MS") ?? "90000",
);

/**
 * Budget, in integer cents to match ai_usage_logs.estimated_cost_cents.
 * ~$0.03 per generation against a $0.10/month credit, so the cap is set to
 * 8c to leave headroom rather than racing the account limit.
 */
const LIVE_COST_PER_CALL_CENTS = Number(
  Deno.env.get("THEME_PREVIEW_COST_PER_CALL_CENTS") ?? "3",
);
const SPEND_CAP_CENTS = Number(
  Deno.env.get("THEME_PREVIEW_SPEND_CAP_CENTS") ?? "8",
);

/**
 * Salt for the per-visitor IP hash. Deliberately has NO default.
 *
 * The privacy claim this feature makes is "we rate-limit per visitor without
 * ever storing a raw IP". With a hardcoded fallback salt that claim is false:
 * the salt would be public knowledge, so the stored hashes become a trivially
 * reversible lookup over the IPv4 space. Throwing at module load makes a
 * missing secret impossible to deploy quietly — the function fails to boot
 * and says why, instead of silently degrading to fake anonymisation.
 */
const IP_HASH_SALT = Deno.env.get("THEME_PREVIEW_IP_SALT");
if (!IP_HASH_SALT) {
  throw new Error(
    "THEME_PREVIEW_IP_SALT is not set. Refusing to start: without it, hashed " +
      "requester IPs would use a public constant salt and would not be anonymous. " +
      "Set it with `supabase secrets set THEME_PREVIEW_IP_SALT=<random value>`.",
  );
}

/** Marks rows whose stored image is the placeholder, not a real render. */
const MOCK_MODEL_ID = "mock/static-fixture";

/** Feature label used in ai_usage_logs rows written by this function. */
const USAGE_FEATURE = "theme_preview";

const RATE_LIMIT_PER_HOUR = Number(
  Deno.env.get("THEME_PREVIEW_RATE_LIMIT_PER_HOUR") ?? "10",
);

/**
 * Custom prompts get a tighter budget than the built-in themes. A built-in
 * theme is generated once per photo and then serves every future visitor;
 * a one-off phrase someone typed will almost never be reused, so each one is
 * close to pure marginal cost.
 */
const CUSTOM_RATE_LIMIT_PER_HOUR = Number(
  Deno.env.get("THEME_PREVIEW_CUSTOM_RATE_LIMIT_PER_HOUR") ?? "3",
);

type GenerateInput = {
  venueId: string;
  photoId: string;
  theme: ThemeSelection;
  /** Sanitised text, non-null only when `theme === CUSTOM_THEME`. */
  customPrompt: string | null;
};

type GeneratedImage = {
  bytes: Uint8Array;
  contentType: string;
  modelUsed: string;
  costUsd: number | null;
  /** Integer cents, fed to the spend guard via ai_usage_logs. */
  costCents: number;
  /** True when no provider was contacted and nothing was billed. */
  mocked: boolean;
};

/**
 * Belt-and-braces scrub before any provider error text is thrown, logged, or
 * written to error_message. Providers echo request details in some error
 * bodies, and error_message is readable by admins.
 */
function redactSecrets(text: string): string {
  let safe = text.slice(0, 800);
  for (const name of ["HF_TOKEN", "OPENROUTER_API_KEY"]) {
    const value = Deno.env.get(name);
    if (value) safe = safe.split(value).join("[redacted]");
  }
  return safe.replace(/\bhf_[A-Za-z0-9]{10,}\b/g, "[redacted]");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 500) {
  return jsonResponse({ data: null, error: { code, message } }, status);
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseInput(body: any): GenerateInput | null {
  const venueId = body?.venueId ?? body?.venue_id;
  const photoId = body?.photoId ?? body?.photo_id ?? body?.imageId;
  const theme = body?.theme;

  if (typeof venueId !== "string" || !uuidPattern.test(venueId)) return null;
  if (typeof photoId !== "string" || !uuidPattern.test(photoId)) return null;
  if (!isThemeSelection(theme)) return null;

  if (theme === CUSTOM_THEME) {
    // Re-sanitised server-side — the client's own sanitising is a UX nicety,
    // not a control. Unusable text is a validation failure, never a silent
    // fallback to an empty theme.
    const customPrompt = sanitizeCustomPrompt(
      body?.customPrompt ?? body?.custom_prompt,
    );
    if (!customPrompt) return null;
    return { venueId, photoId, theme, customPrompt };
  }

  return { venueId, photoId, theme, customPrompt: null };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** '' for built-in themes; a stable digest of the normalised custom text. */
async function promptHashFor(input: GenerateInput): Promise<string> {
  if (!input.customPrompt) return "";
  const hash = await sha256Hex(customPromptCacheKey(input.customPrompt));
  return hash.slice(0, 32);
}

/**
 * Records one generation in the existing ai_usage_logs table (the same place
 * the ai-* functions report to, so admin reporting picks this up for free)
 * and logs cumulative spend for the billing period.
 *
 * `estimated_cost_cents` is what the spend guard reads back, so it is the
 * one field that must be right: mock renders are always 0c, and a call
 * refused by the guard is 0c because it never reached the provider.
 *
 * Best-effort: a metrics hiccup must never fail a generation the visitor is
 * waiting on. ai_usage_logs has no column for prompt content, so
 * customer-written theme text cannot leak in here even by accident.
 */
async function recordImageRequest(
  supabase: any,
  entry: {
    model: string;
    success: boolean;
    durationMs: number;
    costCents: number;
    mocked?: boolean;
    errorCategory?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("ai_usage_logs").insert({
      feature: USAGE_FEATURE,
      provider: entry.mocked ? "mock" : HF_PROVIDER,
      model: entry.model,
      estimated_cost_cents: entry.costCents,
      duration_ms: entry.durationMs,
      success: entry.success,
      error_category: entry.errorCategory ?? null,
    });

    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("ai_usage_logs")
      .select("estimated_cost_cents")
      .eq("feature", USAGE_FEATURE)
      .gte("created_at", periodStart.toISOString());

    const spent = (data ?? []).reduce(
      (sum: number, row: { estimated_cost_cents: number | null }) =>
        sum + (row.estimated_cost_cents ?? 0),
      0,
    );
    const line =
      `[generate-theme-preview] billing period spend: ${spent}c/${SPEND_CAP_CENTS}c cap (model=${entry.model}, mocked=${
        Boolean(entry.mocked)
      }, success=${entry.success})`;
    if (spent >= SPEND_CAP_CENTS) {
      console.error(`${line} — SPEND CAP REACHED, live calls now refused`);
    } else if (spent >= SPEND_CAP_CENTS * 0.6) {
      console.warn(`${line} — approaching spend cap`);
    } else {
      console.log(line);
    }
  } catch (error) {
    console.error(
      "[generate-theme-preview] usage logging failed (non-fatal):",
      error,
    );
  }
}

function publicUrl(supabaseUrl: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${PREVIEW_BUCKET}/${path}`;
}

function storagePathFor(input: GenerateInput, promptHash: string) {
  const leaf = promptHash ? `${input.theme}-${promptHash}` : input.theme;
  return `${input.venueId}/${input.photoId}/${leaf}.jpg`;
}

/** Salted hash — we rate-limit per visitor without storing raw IPs. */
async function hashRequester(req: Request): Promise<string | null> {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim();
  if (!ip) return null;

  return await sha256Hex(`${IP_HASH_SALT}:${ip}`);
}

function toBase64(bytes: Uint8Array): string {
  // Chunked — String.fromCharCode(...bytes) blows the stack on photo-sized input.
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Source photos are usually bucket-relative, but seeded rows may hold a URL. */
async function loadSourceImage(
  supabase: any,
  storagePath: string,
): Promise<{ base64: string; mimeType: string }> {
  let blob: Blob;

  if (/^https?:\/\//i.test(storagePath)) {
    // Seeded venues store the venue's own public image URL here rather than
    // a bucket path. Several of those hosts reject requests with no
    // User-Agent, which is what a bare fetch() sends.
    const response = await fetch(storagePath, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; VenoraThemePreview/1.0; +https://venora-web.vercel.app)",
        Accept: "image/avif,image/webp,image/jpeg,image/png,*/*",
      },
    });
    if (!response.ok) {
      throw new Error(`Could not fetch source photo (${response.status}).`);
    }
    blob = await response.blob();
  } else {
    const { data, error } = await supabase.storage
      .from(SOURCE_BUCKET)
      .download(storagePath);
    if (error || !data) {
      throw new Error(`Could not download source photo: ${error?.message}`);
    }
    blob = data;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {
    base64: toBase64(bytes),
    mimeType: blob.type || "image/jpeg",
  };
}

/**
 * Resolves the run mode. Defaults to "mock" everywhere; "live" has to be
 * asked for explicitly and is refused outright in anything that smells like
 * an automated context, because a live call costs real money against a very
 * small credit balance.
 */
function resolveMode(): { mode: "mock" | "live"; refusal?: string } {
  const raw = (Deno.env.get("THEME_PREVIEW_MODE") ?? "mock").trim()
    .toLowerCase();

  if (raw !== "live") return { mode: "mock" };

  // Belt and braces: even with the flag set, never bill an automated run.
  const ciSignals = [
    "CI",
    "CONTINUOUS_INTEGRATION",
    "GITHUB_ACTIONS",
    "GITLAB_CI",
    "BUILDKITE",
    "CIRCLECI",
    "VERCEL_ENV",
    "DENO_TESTING",
    "VITEST",
    "JEST_WORKER_ID",
    "PLAYWRIGHT_TEST_BASE_URL",
  ];
  const trippedBy = ciSignals.find((name) => {
    const value = Deno.env.get(name);
    return value !== undefined && value !== "" &&
      value.toLowerCase() !== "false";
  });
  if (trippedBy) {
    return {
      mode: "mock",
      refusal:
        `live mode refused: automated context detected (${trippedBy} is set)`,
    };
  }

  if ((Deno.env.get("NODE_ENV") ?? "").toLowerCase() === "test") {
    return { mode: "mock", refusal: "live mode refused: NODE_ENV=test" };
  }

  return { mode: "live" };
}

/** Thrown when the spend guard blocks a live call before it fires. */
class SpendCapExceededError extends Error {}

/**
 * Hard budget guard. The credit balance behind this feature is ~$0.10/month
 * and one generation costs ~$0.03, so "a few extra calls" is the difference
 * between working and a billing surprise. Sums what this billing period has
 * already cost from ai_usage_logs and refuses *before* the provider is
 * contacted if this call would push the total past the cap.
 *
 * Fails closed: if the spend total cannot be read, the live call does not
 * happen. An unknown balance is not a safe balance.
 */
async function assertLiveSpendAllowed(supabase: any): Promise<void> {
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("estimated_cost_cents")
    .eq("feature", USAGE_FEATURE)
    .gte("created_at", periodStart.toISOString());

  if (error) {
    throw new SpendCapExceededError(
      "Spend guard could not read usage totals; refusing the live call.",
    );
  }

  const spentCents = (data ?? []).reduce(
    (sum: number, row: { estimated_cost_cents: number | null }) =>
      sum + (row.estimated_cost_cents ?? 0),
    0,
  );
  const projected = spentCents + LIVE_COST_PER_CALL_CENTS;

  if (projected > SPEND_CAP_CENTS) {
    throw new SpendCapExceededError(
      `Spend cap reached: ${spentCents}c already used this period, this call would make ${projected}c against a ${SPEND_CAP_CENTS}c cap.`,
    );
  }

  console.log(
    `[generate-theme-preview] spend guard ok: ${spentCents}c used this period, cap ${SPEND_CAP_CENTS}c`,
  );
}

/**
 * The single provider seam for this feature.
 *
 * Everything either side of it is provider-agnostic: the caller hands over a
 * prompt plus the source photo and gets bytes back, so swapping providers
 * means replacing this function body only. It also decides mock vs live, so
 * no caller can reach a paid provider by accident.
 *
 * Scope: this function never touches _shared/openrouter.ts or
 * _shared/ai-config.ts — the qwen/qwen3.7-flash *chat* model those serve to
 * the ai-* functions is a separate feature and is deliberately untouched.
 */
async function generateThemedImage(
  prompt: string,
  source: { base64: string; mimeType: string },
  supabase: any,
): Promise<GeneratedImage> {
  const { mode, refusal } = resolveMode();
  if (refusal) console.warn(`[generate-theme-preview] ${refusal}`);

  if (mode === "mock") {
    // Mimics provider latency so loading states, polling and the cache can
    // be exercised for free, as often as we like.
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    console.log(
      `[generate-theme-preview] MOCK render (no provider call, no cost); delay ${MOCK_DELAY_MS}ms`,
    );
    return {
      bytes: fromBase64(MOCK_IMAGE_BASE64),
      contentType: MOCK_IMAGE_MIME,
      modelUsed: MOCK_MODEL_ID,
      costUsd: 0,
      costCents: 0,
      mocked: true,
    };
  }

  // ── live ──────────────────────────────────────────────────
  // Reached only when THEME_PREVIEW_MODE=live, outside CI, and only after
  // the cache miss earlier in the request — never for a cached combination.
  const hfToken = Deno.env.get("HF_TOKEN");
  if (!hfToken) {
    throw new Error(
      "HF_TOKEN is not configured; cannot run a live generation.",
    );
  }

  await assertLiveSpendAllowed(supabase);

  const client = new InferenceClient(hfToken);
  const inputBytes = fromBase64(source.base64);
  const inputBlob = new Blob([inputBytes.buffer as ArrayBuffer], {
    type: source.mimeType,
  });

  console.warn(
    `[generate-theme-preview] LIVE provider call to ${HF_MODEL} via ${HF_PROVIDER} — this costs real credit`,
  );

  // The SDK has no timeout of its own; without this a stalled provider would
  // hold the Edge Function open until the platform kills it.
  const result = (await Promise.race([
    client.imageToImage({
      // Cast against the SDK's own provider union so the env override stays
      // configurable without widening it to a bare string.
      provider: HF_PROVIDER as Parameters<
        InferenceClient["imageToImage"]
      >[0]["provider"],
      model: HF_MODEL,
      inputs: inputBlob,
      parameters: { prompt },
    }),
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(new Error(`Provider timed out after ${LIVE_TIMEOUT_MS}ms`)),
        LIVE_TIMEOUT_MS,
      )
    ),
  ])) as Blob;

  const bytes = new Uint8Array(await result.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error("Provider returned an empty image.");
  }

  return {
    bytes,
    contentType: result.type || "image/jpeg",
    modelUsed: HF_MODEL,
    costUsd: LIVE_COST_PER_CALL_CENTS / 100,
    costCents: LIVE_COST_PER_CALL_CENTS,
    mocked: false,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(
      "METHOD_NOT_ALLOWED",
      "Use POST to generate a theme preview.",
      405,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return errorResponse(
      "CONFIGURATION_ERROR",
      "Missing Supabase configuration.",
      500,
    );
  }

  // HF_TOKEN is read from the environment inside the provider seam only —
  // never hardcoded, never logged, never echoed in a response. It is not
  // required up front because mock mode never touches a provider, and mock
  // is the default: a missing token must not break local development.

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  let previewRowId: string | null = null;

  try {
    const input = parseInput(await req.json().catch(() => null));
    if (!input) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Provide a valid venueId, photoId, and either a supported theme or custom theme text (3-200 characters).",
        400,
      );
    }

    const promptHash = await promptHashFor(input);
    // Resolved once per request so the cache decision and the generator
    // agree on which mode we're in.
    const { mode: currentMode } = resolveMode();

    // ── 1. Cache hit: never call the model twice for the same pair ──
    // Two people typing the same words (in any casing) hash the same, so
    // custom prompts are cached exactly like the built-in themes are.
    const { data: existing, error: existingError } = await supabase
      .from("venue_theme_previews")
      .select(
        "id, status, output_storage_path, model_used, created_at, updated_at",
      )
      .eq("source_image_id", input.photoId)
      .eq("theme", input.theme)
      .eq("prompt_hash", promptHash)
      .maybeSingle();

    if (existingError) {
      console.error(
        "[generate-theme-preview] Cache lookup failed:",
        existingError,
      );
      return errorResponse(
        "CACHE_LOOKUP_FAILED",
        "Could not look up existing previews.",
        500,
      );
    }

    // A row generated in mock mode holds the placeholder fixture, not a real
    // render. It is a perfectly good cache hit while we're in mock mode, but
    // a live run must ignore it and regenerate — otherwise the first real
    // demo run would silently serve placeholders from cache and we'd only
    // find out by looking at the images.
    const cachedIsMock = existing?.model_used === MOCK_MODEL_ID;
    const cacheUsable = existing?.status === "ready" &&
      existing.output_storage_path &&
      (currentMode === "mock" || !cachedIsMock);

    if (cacheUsable) {
      return jsonResponse({
        data: {
          preview: {
            status: "ready",
            theme: input.theme,
            url: publicUrl(supabaseUrl, existing.output_storage_path),
            cached: true,
          },
        },
        error: null,
      });
    }

    if (existing?.status === "ready" && cachedIsMock) {
      console.warn(
        `[generate-theme-preview] live run replacing a mock-cached render for ${input.theme}`,
      );
    }

    // Another request is already generating this exact pair — don't duplicate
    // the spend. The client keeps showing the original photo.
    if (
      existing?.status === "pending" &&
      Date.now() - new Date(existing.created_at).getTime() < STALE_PENDING_MS
    ) {
      return jsonResponse({
        data: {
          preview: {
            status: "pending",
            theme: input.theme,
            url: null,
            cached: false,
          },
        },
        error: null,
      });
    }

    if (
      existing?.status === "failed" &&
      Date.now() - new Date(existing.updated_at).getTime() <
        FAILED_RETRY_COOLDOWN_MS
    ) {
      return jsonResponse({
        data: {
          preview: {
            status: "failed",
            theme: input.theme,
            url: null,
            cached: false,
          },
        },
        error: null,
      });
    }

    // ── 2. Validate the venue/photo pair before spending anything ──
    const [{ data: venue }, { data: photo }] = await Promise.all([
      supabase
        .from("venues")
        .select("id, status")
        .eq("id", input.venueId)
        .maybeSingle(),
      supabase
        .from("venue_images")
        .select("id, venue_id, storage_path, media_type")
        .eq("id", input.photoId)
        .maybeSingle(),
    ]);

    if (!venue || venue.status !== "published") {
      return errorResponse("VENUE_NOT_FOUND", "Venue not found.", 404);
    }
    if (!photo || photo.venue_id !== input.venueId) {
      return errorResponse(
        "PHOTO_NOT_FOUND",
        "Photo not found for this venue.",
        404,
      );
    }
    if (photo.media_type !== "image") {
      return errorResponse(
        "UNSUPPORTED_MEDIA",
        "Theme previews can only be generated from photos.",
        400,
      );
    }

    // ── 3. Rate limit uncached generations ──
    const isCustom = input.theme === CUSTOM_THEME;
    const requesterHash = await hashRequester(req);
    if (requesterHash) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      let query = supabase
        .from("venue_theme_previews")
        .select("id", { count: "exact", head: true })
        .eq("requester_ip_hash", requesterHash)
        .gte("created_at", since);

      // Custom prompts are counted on their own tighter budget, so someone
      // can still browse the built-in themes after exhausting it.
      if (isCustom) query = query.eq("theme", CUSTOM_THEME);

      const { count } = await query;
      const limit = isCustom ? CUSTOM_RATE_LIMIT_PER_HOUR : RATE_LIMIT_PER_HOUR;

      if ((count ?? 0) >= limit) {
        return errorResponse(
          "RATE_LIMITED",
          isCustom
            ? "You've used up your custom theme previews for now. Try one of the ready-made themes, or come back in an hour."
            : "Too many theme previews generated recently. Please try again later.",
          429,
        );
      }
    }

    // Attribute the request when the visitor happens to be signed in.
    let requestedBy: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await userClient.auth.getUser();
      requestedBy = user?.id ?? null;
    }

    // ── 4. Claim the (photo, theme) pair ──
    const { data: claimed, error: claimError } = await supabase
      .from("venue_theme_previews")
      .upsert(
        {
          venue_id: input.venueId,
          source_image_id: input.photoId,
          theme: input.theme,
          custom_prompt: input.customPrompt,
          prompt_hash: promptHash,
          status: "pending",
          error_message: null,
          requested_by: requestedBy,
          requester_ip_hash: requesterHash,
        },
        { onConflict: "source_image_id,theme,prompt_hash" },
      )
      .select("id")
      .single();

    if (claimError || !claimed) {
      console.error(
        "[generate-theme-preview] Could not claim row:",
        claimError,
      );
      return errorResponse(
        "CLAIM_FAILED",
        "Could not start theme preview generation.",
        500,
      );
    }
    previewRowId = claimed.id;

    // ── 5. Generate ──
    const source = await loadSourceImage(supabase, photo.storage_path);
    const prompt = input.customPrompt && !isVenueTheme(input.theme)
      ? buildCustomThemePrompt(input.customPrompt)
      : buildThemePrompt(input.theme as Exclude<ThemeSelection, "custom">);
    // Every generation is metered, success or failure, so spend is visible
    // before the account limit is the thing that tells us. Mock rows are
    // logged at 0c so they never consume the live budget.
    const startedAt = Date.now();
    let generated: GeneratedImage;
    try {
      generated = await generateThemedImage(prompt, source, supabase);
    } catch (generationError) {
      const blockedBySpendCap = generationError instanceof
        SpendCapExceededError;
      await recordImageRequest(supabase, {
        model: HF_MODEL,
        success: false,
        durationMs: Date.now() - startedAt,
        // A refused call never reached the provider, so it cost nothing.
        costCents: 0,
        errorCategory: blockedBySpendCap ? "spend_cap" : "generation_failed",
      });
      throw generationError;
    }

    await recordImageRequest(supabase, {
      model: generated.modelUsed,
      success: true,
      durationMs: Date.now() - startedAt,
      costCents: generated.costCents,
      mocked: generated.mocked,
    });

    // ── 6. Store and mark ready ──
    const outputPath = storagePathFor(input, promptHash);
    const { error: uploadError } = await supabase.storage
      .from(PREVIEW_BUCKET)
      .upload(outputPath, generated.bytes, {
        contentType: generated.contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(
        `Could not store the themed image: ${uploadError.message}`,
      );
    }

    const { error: readyError } = await supabase
      .from("venue_theme_previews")
      .update({
        status: "ready",
        output_storage_path: outputPath,
        model_used: generated.modelUsed,
        generation_cost_usd: generated.costUsd,
        error_message: null,
      })
      .eq("id", previewRowId);

    if (readyError) {
      throw new Error(
        `Could not save the preview record: ${readyError.message}`,
      );
    }

    return jsonResponse({
      data: {
        preview: {
          status: "ready",
          theme: input.theme,
          url: publicUrl(supabaseUrl, outputPath),
          cached: false,
        },
      },
      error: null,
    });
  } catch (error) {
    const message = redactSecrets(
      error instanceof Error
        ? error.message
        : "Theme preview generation failed.",
    );
    console.error("[generate-theme-preview] Generation failed:", message);

    // TODO(theme-preview): failed and abandoned-pending rows are never
    // cleaned up — they accumulate indefinitely, holding an error_message
    // each. Add a TTL sweep (scheduled function or cron) that deletes
    // failed/pending rows older than a few days; ready rows must be kept,
    // they are the cache.
    if (previewRowId) {
      await supabase
        .from("venue_theme_previews")
        .update({ status: "failed", error_message: message.slice(0, 1000) })
        .eq("id", previewRowId);
    }

    return errorResponse(
      "GENERATION_FAILED",
      "Theme preview is temporarily unavailable.",
      502,
    );
  }
});

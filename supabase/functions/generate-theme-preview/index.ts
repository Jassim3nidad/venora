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
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
 */
const FAILED_RETRY_COOLDOWN_MS = 10 * 60 * 1000;

const GEMINI_MODEL =
  Deno.env.get("THEME_PREVIEW_GEMINI_MODEL") ?? "gemini-3.1-flash-image-preview";

/**
 * OpenRouter model id. Qwen-Image-Edit was the intended cost-comparison
 * model, but OpenRouter does not list any Qwen image-editing model — the
 * only image-output models it offers are Google's and OpenAI's. So this
 * path defaults to the same Gemini model routed through OpenRouter, which
 * still gives a real billing/latency comparison against calling Google
 * directly. Override to A/B anything else OpenRouter exposes.
 */
const OPENROUTER_MODEL =
  Deno.env.get("THEME_PREVIEW_OPENROUTER_MODEL") ??
  "google/gemini-3.1-flash-image-preview";

/**
 * Feature flag for the cost/quality A/B: "gemini" (direct Google API,
 * default) or "openrouter". Both take image + prompt and return an image,
 * so the caller and the cache are unaffected by which one is active.
 */
type Provider = "gemini" | "openrouter";

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

/**
 * Gemini bills image output as tokens; rates are env-overridable so pricing
 * changes don't need a redeploy. USD per 1M tokens.
 */
const GEMINI_INPUT_USD_PER_MTOK = Number(
  Deno.env.get("THEME_PREVIEW_GEMINI_INPUT_USD_PER_MTOK") ?? "0.30",
);
const GEMINI_OUTPUT_USD_PER_MTOK = Number(
  Deno.env.get("THEME_PREVIEW_GEMINI_OUTPUT_USD_PER_MTOK") ?? "30",
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
};

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

function resolveProvider(): Provider {
  const flag = (Deno.env.get("THEME_PREVIEW_PROVIDER") ?? "gemini").toLowerCase();
  // "qwen" kept as an alias so existing deployments keep routing to
  // OpenRouter after the model swap described above.
  return flag === "openrouter" || flag === "qwen" ? "openrouter" : "gemini";
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

  const salt = Deno.env.get("THEME_PREVIEW_IP_SALT") ?? "venora-theme-preview";
  return await sha256Hex(`${salt}:${ip}`);
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

async function generateWithGemini(
  apiKey: string,
  prompt: string,
  source: { base64: string; mimeType: string },
): Promise<GeneratedImage> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: source.mimeType,
                  data: source.base64,
                },
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini image edit failed: ${await response.text()}`);
  }

  const payload = await response.json();
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part: any) => part?.inlineData ?? part?.inline_data);
  const inline = imagePart?.inlineData ?? imagePart?.inline_data;

  if (!inline?.data) {
    // Usually a safety block — surface the reason so failures are debuggable.
    const reason =
      payload?.candidates?.[0]?.finishReason ??
      payload?.promptFeedback?.blockReason ??
      "no image returned";
    throw new Error(`Gemini returned no image (${reason}).`);
  }

  const usage = payload?.usageMetadata;
  const costUsd =
    usage && Number.isFinite(usage.promptTokenCount)
      ? (usage.promptTokenCount * GEMINI_INPUT_USD_PER_MTOK +
          (usage.candidatesTokenCount ?? 0) * GEMINI_OUTPUT_USD_PER_MTOK) /
        1_000_000
      : null;

  return {
    bytes: fromBase64(inline.data),
    contentType: inline.mimeType ?? inline.mime_type ?? "image/jpeg",
    modelUsed: GEMINI_MODEL,
    costUsd,
  };
}

async function generateWithOpenRouter(
  apiKey: string,
  prompt: string,
  source: { base64: string; mimeType: string },
): Promise<GeneratedImage> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      modalities: ["image", "text"],
      // OpenRouter reports the real USD charge back on the response, which is
      // the whole point of running this provider side-by-side with Gemini.
      usage: { include: true },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${source.mimeType};base64,${source.base64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter image edit failed: ${await response.text()}`);
  }

  const payload = await response.json();
  const dataUrl = payload?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (typeof dataUrl !== "string") {
    throw new Error("OpenRouter returned no image.");
  }

  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) {
    throw new Error("OpenRouter returned an unreadable image payload.");
  }

  const cost = payload?.usage?.cost;

  return {
    bytes: fromBase64(match[2]!),
    contentType: match[1] ?? "image/jpeg",
    modelUsed: OPENROUTER_MODEL,
    costUsd: Number.isFinite(cost) ? Number(cost) : null,
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

  const provider = resolveProvider();
  const providerKey =
    provider === "openrouter"
      ? Deno.env.get("OPENROUTER_API_KEY")
      : Deno.env.get("GEMINI_API_KEY");

  if (!providerKey) {
    return errorResponse(
      "MODEL_NOT_CONFIGURED",
      `No API key configured for the "${provider}" theme preview provider.`,
      500,
    );
  }

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

    // ── 1. Cache hit: never call the model twice for the same pair ──
    // Two people typing the same words (in any casing) hash the same, so
    // custom prompts are cached exactly like the built-in themes are.
    const { data: existing, error: existingError } = await supabase
      .from("venue_theme_previews")
      .select("id, status, output_storage_path, created_at, updated_at")
      .eq("source_image_id", input.photoId)
      .eq("theme", input.theme)
      .eq("prompt_hash", promptHash)
      .maybeSingle();

    if (existingError) {
      console.error("[generate-theme-preview] Cache lookup failed:", existingError);
      return errorResponse(
        "CACHE_LOOKUP_FAILED",
        "Could not look up existing previews.",
        500,
      );
    }

    if (existing?.status === "ready" && existing.output_storage_path) {
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

    // Another request is already generating this exact pair — don't duplicate
    // the spend. The client keeps showing the original photo.
    if (
      existing?.status === "pending" &&
      Date.now() - new Date(existing.created_at).getTime() < STALE_PENDING_MS
    ) {
      return jsonResponse({
        data: {
          preview: { status: "pending", theme: input.theme, url: null, cached: false },
        },
        error: null,
      });
    }

    if (
      existing?.status === "failed" &&
      Date.now() - new Date(existing.updated_at).getTime() < FAILED_RETRY_COOLDOWN_MS
    ) {
      return jsonResponse({
        data: {
          preview: { status: "failed", theme: input.theme, url: null, cached: false },
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
      console.error("[generate-theme-preview] Could not claim row:", claimError);
      return errorResponse(
        "CLAIM_FAILED",
        "Could not start theme preview generation.",
        500,
      );
    }
    previewRowId = claimed.id;

    // ── 5. Generate ──
    const source = await loadSourceImage(supabase, photo.storage_path);
    const prompt =
      input.customPrompt && !isVenueTheme(input.theme)
        ? buildCustomThemePrompt(input.customPrompt)
        : buildThemePrompt(input.theme as Exclude<ThemeSelection, "custom">);
    const generated =
      provider === "openrouter"
        ? await generateWithOpenRouter(providerKey, prompt, source)
        : await generateWithGemini(providerKey, prompt, source);

    // ── 6. Store and mark ready ──
    const outputPath = storagePathFor(input, promptHash);
    const { error: uploadError } = await supabase.storage
      .from(PREVIEW_BUCKET)
      .upload(outputPath, generated.bytes, {
        contentType: generated.contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Could not store the themed image: ${uploadError.message}`);
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
      throw new Error(`Could not save the preview record: ${readyError.message}`);
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
    const message =
      error instanceof Error ? error.message : "Theme preview generation failed.";
    console.error("[generate-theme-preview] Generation failed:", message);

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

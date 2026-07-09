/**
 * Shared OpenAI embeddings helpers for Edge Functions.
 *
 * `venue_embeddings` / `venues_for_embedding()` / `match_venues()` were added
 * in migrations 009 and 015 to back semantic venue search, but nothing ever
 * called the OpenAI embeddings API to populate them — ai-search always
 * passed `query_embedding: null`. These helpers close that gap and are
 * shared by ai-search and ai-recommendation.
 */

const openAiBaseUrl = "https://api.openai.com/v1";
const defaultEmbeddingModel = "text-embedding-3-small";

export type SupabaseLike = {
  rpc: (fn: string, args?: Record<string, unknown>) => any;
  from: (table: string) => any;
};

/** Formats a float vector as the Postgres `vector` text literal, e.g. "[0.1,0.2]". */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function createEmbeddings(
  openAiApiKey: string,
  inputs: string[],
  model?: string,
): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const response = await fetch(`${openAiBaseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model ?? Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? defaultEmbeddingModel,
      input: inputs,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI embeddings request failed: ${errorText}`);
  }

  const payload = await response.json();
  const data = Array.isArray(payload?.data) ? payload.data : [];
  return data.map((item: any) => item.embedding as number[]);
}

/** Embeds a single query string. Returns null on failure (callers should degrade gracefully, not throw). */
export async function embedQuery(
  openAiApiKey: string,
  query: string,
): Promise<number[] | null> {
  try {
    const [vector] = await createEmbeddings(openAiApiKey, [query]);
    return vector ?? null;
  } catch (error) {
    console.error("[embeddings] Failed to embed query:", error);
    return null;
  }
}

/**
 * Backfills embeddings for up to `limit` published venues missing one,
 * via the `venues_for_embedding` RPC. Best-effort — failures are logged
 * and swallowed so callers (search/recommendation) still work off keyword
 * fallback if OpenAI or the upsert fails.
 */
export async function warmVenueEmbeddings(
  supabase: SupabaseLike,
  openAiApiKey: string,
  limit = 8,
): Promise<number> {
  try {
    const { data: candidates, error } = await supabase.rpc("venues_for_embedding", {
      refresh_limit: limit,
    });

    if (error || !candidates || candidates.length === 0) {
      if (error) console.error("[embeddings] venues_for_embedding failed:", error);
      return 0;
    }

    const vectors = await createEmbeddings(
      openAiApiKey,
      candidates.map((row: any) => row.embedding_text as string),
    );

    const rows = candidates
      .map((row: any, index: number) => {
        const vector = vectors[index];
        if (!vector) return null;
        return {
          venue_id: row.id,
          embedding: toVectorLiteral(vector),
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    if (rows.length === 0) return 0;

    const { error: upsertError } = await supabase
      .from("venue_embeddings")
      .upsert(rows, { onConflict: "venue_id" });

    if (upsertError) {
      console.error("[embeddings] Failed to upsert venue embeddings:", upsertError);
      return 0;
    }

    return rows.length;
  } catch (error) {
    console.error("[embeddings] warmVenueEmbeddings failed:", error);
    return 0;
  }
}

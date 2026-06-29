/**
 * Supabase Edge Function: ai-search
 *
 * Performs semantic search over venues using pgvector + OpenAI embeddings.
 * Invoked from the client via supabase.functions.invoke('ai-search', { body: { query } })
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, filters } = await req.json() as {
      query: string;
      filters?: { province?: string; city?: string; capacity?: number; maxPrice?: number };
    };

    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Generate embedding from OpenAI
    const openaiRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query }),
    });
    const { data: embedData } = await openaiRes.json();
    const embedding = embedData[0].embedding as number[];

    // 2. Search venues via pgvector RPC
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: venues, error } = await supabase.rpc("match_venues", {
      query_embedding: embedding,
      match_threshold: 0.70,
      match_count: 20,
      filter_province: filters?.province ?? null,
      filter_city: filters?.city ?? null,
      filter_capacity: filters?.capacity ?? null,
      filter_max_price: filters?.maxPrice ?? null,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ venues }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

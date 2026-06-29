/**
 * Supabase Edge Function: ai-recommendation
 *
 * Returns personalised venue recommendations based on a customer's
 * booking history and favourites using collaborative filtering + OpenAI.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    const [bookingsRes, favsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("venue_id, venues(name, city)")
        .eq("customer_id", user.id)
        .eq("status", "completed")
        .limit(10),
      supabase
        .from("favorites")
        .select("venue_id, venues(name, city)")
        .eq("customer_id", user.id)
        .limit(10),
    ]);

    // Build context for OpenAI
    const context = [
      ...(bookingsRes.data ?? []),
      ...(favsRes.data ?? []),
    ].map((r) => (r as { venues: { name: string } }).venues?.name).filter(Boolean).join(", ");

    // Ask OpenAI for a preference summary
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a venue recommendation engine. Given a user's past venues, summarize their preferences as a short search query for pgvector.",
          },
          {
            role: "user",
            content: `Past venues: ${context || "none yet"}. Return only the search query string.`,
          },
        ],
        max_tokens: 100,
      }),
    });

    const { choices } = await openaiRes.json();
    const preferenceQuery: string = choices?.[0]?.message?.content ?? "elegant event venue";

    // Reuse ai-search logic via internal fetch
    const searchRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: preferenceQuery }),
    });

    const { venues } = await searchRes.json();
    return new Response(JSON.stringify({ venues, preferenceQuery }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

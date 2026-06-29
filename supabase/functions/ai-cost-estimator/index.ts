/**
 * Supabase Edge Function: ai-cost-estimator
 *
 * Given event details, estimates total cost including venue base price,
 * optional packages, catering, and AV using AI.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EstimatorInput {
  venueId: string;
  guestCount: number;
  eventType: string;
  durationHours: number;
  includesCatering?: boolean;
  includesAV?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: EstimatorInput = await req.json();
    const { venueId, guestCount, eventType, durationHours } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: venue } = await supabase
      .from("venues")
      .select("name, base_price, venue_packages(name, price, inclusions)")
      .eq("id", venueId)
      .single();

    if (!venue) {
      return new Response(JSON.stringify({ error: "Venue not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const venueInfo = JSON.stringify(venue);

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
            content: `You are a venue cost estimator for the Philippines. Return a JSON object with: { baseVenue: number, packages: number, catering: number, av: number, total: number, breakdown: string[] }. All amounts in PHP.`,
          },
          {
            role: "user",
            content: `Venue: ${venueInfo}. Event: ${eventType}, ${guestCount} guests, ${durationHours}h. Catering: ${body.includesCatering}. AV: ${body.includesAV}.`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 400,
      }),
    });

    const { choices } = await openaiRes.json();
    const estimate = JSON.parse(choices[0].message.content);

    return new Response(JSON.stringify({ estimate, venue: { name: (venue as { name: string }).name } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

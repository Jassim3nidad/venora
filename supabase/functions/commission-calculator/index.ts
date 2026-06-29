/**
 * Supabase Edge Function: commission-calculator
 *
 * Calculates platform commission for a booking using tiered commission rules.
 * Called after a booking is approved and payment is captured.
 *
 * Scopes (precedence: venue > category > global):
 *   - scope = 'venue': reference_id = venue_id
 *   - scope = 'category': reference_id = category_id
 *   - scope = 'global': reference_id = null
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingData {
  id: string;
  total_amount: number;
  venue_id: string;
  venues: {
    id: string;
    venue_category_assignments: Array<{ category_id: string }>;
  } | null;
}

interface CommissionRule {
  id: string;
  scope: "global" | "category" | "venue";
  reference_id: string | null;
  percentage: number | null;
  flat_fee: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json() as { bookingId: string };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch booking with venue and its category assignments
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        id,
        total_amount,
        venue_id,
        venues (
          id,
          venue_category_assignments (
            category_id
          )
        )
      `)
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bookingData = booking as unknown as BookingData;
    const totalAmount = bookingData.total_amount ?? 0;
    const venueId = bookingData.venue_id;
    const categoryIds = bookingData.venues?.venue_category_assignments?.map((c) => c.category_id) ?? [];

    // Fetch active commission rules
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: rules } = await supabase
      .from("commission_rules")
      .select("id, scope, reference_id, percentage, flat_fee")
      .lte("effective_from", todayStr)
      .or(`effective_to.is.null,effective_to.gte.${todayStr}`);

    const activeRules = (rules ?? []) as CommissionRule[];

    // Match rules by precedence: venue > category > global
    let matchedRule = activeRules.find(
      (r) => r.scope === "venue" && r.reference_id === venueId
    );

    if (!matchedRule && categoryIds.length > 0) {
      matchedRule = activeRules.find(
        (r) => r.scope === "category" && r.reference_id && categoryIds.includes(r.reference_id)
      );
    }

    if (!matchedRule) {
      matchedRule = activeRules.find((r) => r.scope === "global");
    }

    // Default fallback: 10% global rate
    const percentage = matchedRule ? (matchedRule.percentage ?? 0) : 10;
    const flatFee = matchedRule ? (matchedRule.flat_fee ?? 0) : 0;

    const commission = Math.round((totalAmount * (percentage / 100)) + flatFee);

    // Update booking record with computed commission
    await supabase
      .from("bookings")
      .update({ commission_amount: commission })
      .eq("id", bookingId);

    return new Response(
      JSON.stringify({
        bookingId,
        totalAmount,
        matchedRuleScope: matchedRule?.scope ?? "default-fallback",
        commissionPercentage: percentage,
        commissionFlatFee: flatFee,
        commissionAmount: commission,
        netToVenue: totalAmount - commission,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

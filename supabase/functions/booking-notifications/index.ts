/**
 * Supabase Edge Function: booking-notifications
 *
 * Sends email/SMS notifications for booking lifecycle events.
 * Triggered by Supabase Database Webhooks on the bookings table.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BookingStatus = "pending" | "approved" | "declined" | "cancelled" | "completed" | "expired";

const SUBJECT_MAP: Record<BookingStatus, string> = {
  pending:   "Booking Request Received — Venora",
  approved:  "Your Booking is Approved! 🎉 — Venora",
  declined:  "Booking Request Declined — Venora",
  cancelled: "Booking Cancelled — Venora",
  completed: "Thank you for choosing Venora! 🌟",
  expired:   "Booking Request Expired — Venora",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload.record as {
      id: string;
      customer_id: string;
      venue_id: string;
      status: BookingStatus;
      event_date: string;
      total_amount: number;
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch customer email + venue name
    const [profileRes, venueRes] = await Promise.all([
      supabase.auth.admin.getUserById(record.customer_id),
      supabase.from("venues").select("name").eq("id", record.venue_id).single(),
    ]);

    const email = profileRes.data.user?.email;
    const venueName = (venueRes.data as { name: string } | null)?.name ?? "the venue";

    if (!email) throw new Error("Customer email not found");

    // Send via Resend (or swap for your email provider)
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Venora <noreply@venora.ph>",
        to: [email],
        subject: SUBJECT_MAP[record.status],
        html: `
          <h2>${SUBJECT_MAP[record.status]}</h2>
          <p>Booking ID: <strong>${record.id}</strong></p>
          <p>Venue: <strong>${venueName}</strong></p>
          <p>Event Date: <strong>${record.event_date}</strong></p>
          <p>Status: <strong>${record.status.toUpperCase()}</strong></p>
        `,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

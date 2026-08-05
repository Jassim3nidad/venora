import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSmtpEmail } from "../_shared/smtp-mailer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-rsvp-reminder-secret",
};

type GuestInvitation = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  rsvp_token: string | null;
  rsvp_deadline: string | null;
};

type DeliveryResult = {
  status: "sent" | "skipped" | "failed";
  error?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function constantTimeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function applicationOrigin() {
  const configured = Deno.env.get("APP_URL") ??
    Deno.env.get("NEXT_PUBLIC_APP_URL") ??
    "https://venora.ph";
  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("APP_URL must use HTTP or HTTPS");
  }
  return url.origin;
}

function invitationUrl(token: string) {
  return new URL(`/rsvp/${encodeURIComponent(token)}`, applicationOrigin())
    .toString();
}

function deadlineText(deadline: string | null) {
  if (!deadline) return "";
  const formatted = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(deadline));
  return ` Please respond by ${formatted}.`;
}

async function sendEmail(
  guest: GuestInvitation,
  kind: "invitation" | "reminder",
): Promise<DeliveryResult> {
  if (!guest.email) return { status: "skipped" };
  if (!guest.rsvp_token) {
    return { status: "failed", error: "Guest RSVP token is missing" };
  }

  const guestName = `${guest.first_name} ${guest.last_name}`.trim();
  const title = kind === "reminder"
    ? "Reminder: please respond to your Venora invitation"
    : "You are invited through Venora";
  const message = kind === "reminder"
    ? `This is a reminder to submit your RSVP.${
      deadlineText(guest.rsvp_deadline)
    }`
    : `Please confirm whether you can attend.${
      deadlineText(guest.rsvp_deadline)
    }`;
  const link = invitationUrl(guest.rsvp_token);

  try {
    await sendSmtpEmail({
      to: guest.email,
      subject: title,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.6">
          <h2>${escapeHtml(title)}</h2>
          <p>Hello ${escapeHtml(guestName || "guest")},</p>
          <p>${escapeHtml(message)}</p>
          <p><a href="${
        escapeHtml(link)
      }" style="color:#2563eb;font-weight:700">Respond to invitation</a></p>
          <p style="color:#64748b;font-size:13px">This personal link can submit your RSVP. Do not forward it.</p>
        </div>
      `,
      text: [
        title,
        "",
        `Hello ${guestName || "guest"},`,
        "",
        message,
        "",
        `Respond to invitation: ${link}`,
        "",
        "This personal link can submit your RSVP. Do not forward it.",
      ].join("\n"),
    });
    return { status: "sent" };
  } catch (error) {
    return {
      status: "failed",
      error: (error instanceof Error ? error.message : "SMTP delivery failed")
        .slice(0, 500),
    };
  }
}

async function recordDelivery(
  serviceClient: ReturnType<typeof createClient<any>>,
  guestId: string,
  kind: "invitation" | "reminder",
  result: DeliveryResult,
) {
  const now = new Date().toISOString();
  const update = kind === "invitation"
    ? {
      rsvp_invitation_delivered_at: result.status === "sent" ? now : null,
      rsvp_delivery_error: result.error ?? null,
    }
    : {
      rsvp_reminder_sent_at: result.status === "sent" ? now : null,
      rsvp_delivery_error: result.error ?? null,
    };

  const { error } = await serviceClient
    .from("event_guests")
    .update(update)
    .eq("id", guestId);
  if (error) throw error;
}

async function claimReminder(
  serviceClient: ReturnType<typeof createClient<any>>,
  guestId: string,
) {
  const { data, error } = await serviceClient
    .from("event_guests")
    .update({ rsvp_reminder_sent_at: new Date().toISOString() })
    .eq("id", guestId)
    .is("rsvp_reminder_sent_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  return Boolean(data);
}

async function deliverInvitation(
  authorization: string,
  guestId: string,
  serviceClient: ReturnType<typeof createClient<any>>,
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient
    .from("event_guests")
    .select(
      "id,first_name,last_name,email,rsvp_token,rsvp_deadline",
    )
    .eq("id", guestId)
    .single<GuestInvitation>();

  if (error || !data) return json({ error: "Guest not found" }, 404);
  const result = await sendEmail(data, "invitation");
  await recordDelivery(serviceClient, data.id, "invitation", result);
  return json({ success: result.status !== "failed", delivery: result.status });
}

async function deliverReminders(
  serviceClient: ReturnType<typeof createClient<any>>,
  limit: number,
  guestId?: string,
) {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  let query = serviceClient
    .from("event_guests")
    .select(
      "id,first_name,last_name,email,rsvp_token,rsvp_deadline",
    )
    .eq("rsvp_status", "pending")
    .not("invitation_sent_at", "is", null)
    .is("rsvp_responded_at", null)
    .is("rsvp_revoked_at", null)
    .is("rsvp_reminder_sent_at", null)
    .not("email", "is", null)
    .gte("rsvp_deadline", now.toISOString())
    .lte("rsvp_deadline", reminderWindow.toISOString());
  if (guestId) query = query.eq("id", guestId);

  const { data, error } = await query
    .order("rsvp_deadline", { ascending: true })
    .limit(limit)
    .returns<GuestInvitation[]>();
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const guest of data ?? []) {
    if (!(await claimReminder(serviceClient, guest.id))) continue;
    const result = await sendEmail(guest, "reminder");
    await recordDelivery(serviceClient, guest.id, "reminder", result);
    if (result.status === "sent") sent += 1;
    if (result.status === "failed") failed += 1;
  }

  return json({
    success: failed === 0,
    processed: data?.length ?? 0,
    sent,
    failed,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "RSVP delivery is not configured" }, 503);
    }

    const payload = await req.json().catch(() => ({}));
    const mode = payload?.mode;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    if (mode === "invitation") {
      const authorization = req.headers.get("Authorization") ?? "";
      if (!authorization.startsWith("Bearer ")) {
        return json({ error: "Unauthorized" }, 401);
      }
      const guestId = typeof payload?.guestId === "string"
        ? payload.guestId
        : "";
      if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(guestId)) {
        return json({ error: "Invalid guest ID" }, 400);
      }
      return await deliverInvitation(authorization, guestId, serviceClient);
    }

    if (mode === "reminders") {
      const configuredSecret = Deno.env.get("RSVP_REMINDER_SECRET") ?? "";
      const suppliedSecret = req.headers.get("x-rsvp-reminder-secret") ?? "";
      if (
        !configuredSecret ||
        !constantTimeEqual(suppliedSecret, configuredSecret)
      ) {
        return json({ error: "Unauthorized" }, 401);
      }
      const requestedLimit = Number(payload?.limit ?? 100);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(100, Math.max(1, Math.trunc(requestedLimit)))
        : 100;
      const guestId = typeof payload?.guestId === "string"
        ? payload.guestId
        : undefined;
      if (guestId && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(guestId)) {
        return json({ error: "Invalid guest ID" }, 400);
      }
      return await deliverReminders(serviceClient, limit, guestId);
    }

    return json({ error: "Invalid delivery mode" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

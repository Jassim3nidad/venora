/**
 * Supabase Edge Function: booking-notifications
 *
 * Dispatches queued notification_deliveries rows for email, push,
 * and in-app audit status. Configure a Database Webhook on
 * public.notification_deliveries INSERT events to call this function.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sendNotification,
  setVapidDetails,
} from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ServiceClient = ReturnType<typeof createClient<any>>;

type NotificationChannel = "email" | "sms" | "push" | "in_app";
type DeliveryStatus = "sent" | "failed" | "skipped";

type DeliveryRecord = {
  id: string;
  notification_id: string;
  user_id: string;
  channel: NotificationChannel;
};

type NotificationPayload = {
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
};

type LoadedDelivery = DeliveryRecord & {
  status: "queued" | "sent" | "failed" | "skipped";
  attempt_count: number;
  notifications: NotificationPayload | NotificationPayload[] | null;
};

type DispatchResult = {
  status: DeliveryStatus;
  provider?: string;
  providerMessageId?: string;
  errorMessage?: string;
};

function appUrl() {
  return (
    Deno.env.get("APP_URL") ??
      Deno.env.get("NEXT_PUBLIC_APP_URL") ??
      "https://venora.ph"
  );
}

function absoluteUrl(link: string | null) {
  const base = new URL(appUrl());
  const fallback = new URL("/notifications", base).toString();
  if (!link) return fallback;

  try {
    const target = new URL(link, base);
    return target.origin === base.origin ? target.toString() : fallback;
  } catch {
    return fallback;
  }
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown delivery error";
}

function resendErrorMessage(payload: { message?: string; error?: string }) {
  const message = payload?.message ?? payload?.error ?? "Resend request failed";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("domain is not verified") ||
    normalized.includes("sender")
  ) {
    return `Resend sender is not verified: ${message}`;
  }

  return message;
}

async function sendEmail(
  email: string | undefined,
  notification: NotificationPayload,
): Promise<DispatchResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return {
      status: "failed",
      provider: "resend",
      errorMessage: "RESEND_API_KEY is not configured",
    };
  }

  const from = Deno.env.get("RESEND_FROM");
  if (!from) {
    return {
      status: "failed",
      provider: "resend",
      errorMessage: "RESEND_FROM is not configured with a verified sender",
    };
  }

  if (!email) {
    return {
      status: "failed",
      provider: "resend",
      errorMessage: "Recipient email not found",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: notification.title,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.6">
          <h2>${escapeHtml(notification.title)}</h2>
          ${notification.body ? `<p>${escapeHtml(notification.body)}</p>` : ""}
          <p><a href="${
        escapeHtml(
          absoluteUrl(notification.link),
        )
      }" style="color:#2563eb;font-weight:700">Open in Venora</a></p>
        </div>
      `,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      status: "failed",
      provider: "resend",
      errorMessage: resendErrorMessage(payload),
    };
  }

  return {
    status: "sent",
    provider: "resend",
    providerMessageId: payload?.id,
  };
}

async function sendPush(
  supabase: ServiceClient,
  userId: string,
  notification: NotificationPayload,
): Promise<DispatchResult> {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");

  if (!publicKey || !privateKey || !subject) {
    return {
      status: "skipped",
      provider: "web-push",
      errorMessage: "VAPID keys are not configured",
    };
  }

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .is("disabled_at", null);

  if (error) throw error;

  if (!subscriptions?.length) {
    return {
      status: "skipped",
      provider: "web-push",
      errorMessage: "No active push subscriptions",
    };
  }

  setVapidDetails(subject, publicKey, privateKey);

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    link: notification.link ?? "/notifications",
    metadata: notification.metadata ?? {},
  });

  const results = await Promise.allSettled(
    subscriptions.map(
      (subscription: {
        id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
      }) =>
        sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        ).catch(async (error: { statusCode?: number; message?: string }) => {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .update({ disabled_at: new Date().toISOString() })
              .eq("id", subscription.id);
          }

          throw error;
        }),
    ),
  );

  const sentCount = results.filter(
    (result) => result.status === "fulfilled",
  ).length;
  if (sentCount === 0) {
    const firstError = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    return {
      status: "failed",
      provider: "web-push",
      errorMessage: firstError?.reason?.message ?? "All push sends failed",
    };
  }

  return {
    status: "sent",
    provider: "web-push",
    providerMessageId: `${sentCount}/${subscriptions.length}`,
  };
}

async function updateDelivery(
  supabase: ServiceClient,
  deliveryId: string,
  result: DispatchResult,
  attemptCount: number,
) {
  const now = new Date().toISOString();
  const nextAttemptAt = result.status === "failed" && attemptCount + 1 < 3
    ? new Date(
      Date.now() + Math.min(60, 5 * 2 ** attemptCount) * 60_000,
    ).toISOString()
    : null;

  await supabase
    .from("notification_deliveries")
    .update({
      status: result.status,
      provider: result.provider ?? null,
      provider_message_id: result.providerMessageId ?? null,
      error_message: result.errorMessage ?? null,
      attempt_count: attemptCount + 1,
      next_attempt_at: nextAttemptAt,
      attempted_at: now,
      sent_at: result.status === "sent" ? now : null,
    })
    .eq("id", deliveryId);
}

async function processDelivery(record: DeliveryRecord) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: delivery, error } = await supabase
    .from("notification_deliveries")
    .select(
      `
        id,
        notification_id,
        user_id,
        channel,
        status,
        attempt_count,
        notifications (
          title,
          body,
          link,
          metadata
        )
      `,
    )
    .eq("id", record.id)
    .single<LoadedDelivery>();

  if (error) throw error;

  if (!["queued", "failed"].includes(delivery.status)) {
    return;
  }

  if (delivery.status === "failed") {
    await supabase.rpc("retry_failed_notification_deliveries", { p_limit: 1 });
  }

  const notification = Array.isArray(delivery.notifications)
    ? delivery.notifications[0]
    : delivery.notifications;

  if (!notification) {
    await updateDelivery(
      supabase,
      record.id,
      {
        status: "failed",
        errorMessage: "Notification row not found",
      },
      delivery.attempt_count ?? 0,
    );
    return;
  }

  let result: DispatchResult;

  try {
    if (delivery.channel === "in_app") {
      result = { status: "sent", provider: "supabase-realtime" };
    } else if (delivery.channel === "email") {
      const userResponse = await supabase.auth.admin.getUserById(
        delivery.user_id,
      );
      result = await sendEmail(userResponse.data.user?.email, notification);
    } else if (delivery.channel === "sms") {
      result = {
        status: "skipped",
        provider: "sms-disabled",
        errorMessage: "SMS delivery is disabled for this phase",
      };
    } else {
      result = await sendPush(supabase, delivery.user_id, notification);
    }
  } catch (error) {
    result = {
      status: "failed",
      provider: delivery.channel === "email" ? "resend" : "web-push",
      errorMessage: errorMessage(error),
    };
  }

  await updateDelivery(
    supabase,
    record.id,
    result,
    delivery.attempt_count ?? 0,
  );
}

async function processQueuedDeliveries(limit = 25) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  await supabase.rpc("retry_failed_notification_deliveries", {
    p_limit: limit,
  });

  const { data, error } = await supabase
    .from("notification_deliveries")
    .select("id, notification_id, user_id, channel")
    .eq("status", "queued")
    .neq("channel", "sms")
    .or(
      `next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`,
    )
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const results = await Promise.allSettled(
    (data ?? []).map((record) => processDelivery(record as DeliveryRecord)),
  );
  const failedCount = results.filter(
    (result) => result.status === "rejected",
  ).length;

  const { data: smsRows } = await supabase
    .from("notification_deliveries")
    .select("id")
    .eq("status", "queued")
    .eq("channel", "sms")
    .limit(limit);

  await Promise.all(
    (smsRows ?? []).map((row: { id: string }) =>
      updateDelivery(
        supabase,
        row.id,
        {
          status: "skipped",
          provider: "sms-disabled",
          errorMessage: "SMS delivery is disabled for this phase",
        },
        0,
      )
    ),
  );

  return {
    processedCount: data?.length ?? 0,
    failedProcessCount: failedCount,
    skippedSmsCount: smsRows?.length ?? 0,
  };
}

function isDeliveryRecord(record: unknown): record is DeliveryRecord {
  if (!record || typeof record !== "object") return false;
  const value = record as Partial<DeliveryRecord>;
  return Boolean(
    value.id &&
      value.notification_id &&
      value.user_id &&
      ["email", "sms", "push", "in_app"].includes(String(value.channel)),
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Notification dispatcher is not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const suppliedAuthorization = req.headers.get("Authorization") ?? "";
    if (!constantTimeEqual(suppliedAuthorization, `Bearer ${serviceRoleKey}`)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const record = payload.record ?? payload;

    if (!isDeliveryRecord(record)) {
      const requestedLimit = Number(payload.limit ?? 25);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(100, Math.max(1, Math.trunc(requestedLimit)))
        : 25;
      const result = await processQueuedDeliveries(limit);
      return new Response(
        JSON.stringify({
          success: true,
          batch: true,
          ...result,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await processDelivery(record);

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

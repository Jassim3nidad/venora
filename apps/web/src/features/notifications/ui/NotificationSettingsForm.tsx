"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Mail,
  MonitorSmartphone,
  Save,
  ShieldAlert,
  Star,
} from "lucide-react";
import { cn } from "@venora/lib";
import {
  useNotificationPreferences,
  useRegisterPushSubscription,
  useUpdateNotificationPreferences,
} from "../hooks/use-notifications";
import type { NotificationPreferences } from "../types/notification.types";

type PreferenceState = Omit<NotificationPreferences, "userId">;

const DEFAULT_STATE: PreferenceState = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
  inAppEnabled: true,
  bookingUpdates: true,
  paymentUpdates: true,
  reviewRequests: true,
  adminAlerts: true,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: "Asia/Manila",
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/50 transition hover:border-[#BFDBFE] hover:bg-[#F8FAFC]">
      <span className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">
            {title}
          </span>
          <span className="mt-1 block text-sm font-medium leading-6 text-slate-500">
            {description}
          </span>
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "relative mt-1 h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-[#2563EB]" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "left-6" : "left-1",
          )}
        />
      </span>
    </label>
  );
}

export function NotificationSettingsForm() {
  const preferencesQuery = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const registerPush = useRegisterPushSubscription();
  const [state, setState] = useState<PreferenceState>(DEFAULT_STATE);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!preferencesQuery.data) return;
    const { userId: _userId, ...preferences } = preferencesQuery.data;
    setState(preferences);
  }, [preferencesQuery.data]);

  const pushSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window,
    [],
  );

  const setValue = <TKey extends keyof PreferenceState>(
    key: TKey,
    value: PreferenceState[TKey],
  ) => {
    setState((current) => ({ ...current, [key]: value }));
    setStatusMessage(null);
  };

  const save = async () => {
    setStatusMessage(null);
    try {
      await updatePreferences.mutateAsync(state);
      setStatusMessage("Notification preferences saved.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Could not save notification preferences.",
      );
    }
  };

  const enablePushForDevice = async () => {
    setStatusMessage(null);

    if (!pushSupported) {
      setStatusMessage("Push is not supported in this browser.");
      return;
    }

    const keyResponse = await fetch("/api/notifications/push-public-key");
    const keyPayload = await keyResponse.json().catch(() => null);

    if (!keyResponse.ok || !keyPayload?.data?.publicKey) {
      setStatusMessage("Web Push is not configured for this environment.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatusMessage("Browser push permission was not granted.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const readyRegistration = await navigator.serviceWorker.ready;
    const subscription =
      (await readyRegistration.pushManager.getSubscription()) ??
      (await readyRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyPayload.data.publicKey),
      }));

    await registerPush.mutateAsync(subscription);
    setState((current) => ({ ...current, pushEnabled: true }));
    setStatusMessage("Push notifications enabled for this device.");

    if (registration.active) {
      registration.active.postMessage({ type: "VENORA_PUSH_READY" });
    }
  };

  if (preferencesQuery.isLoading) {
    return (
      <div className="grid gap-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (preferencesQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
        Could not load notification preferences.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
            Channels
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">
            Delivery methods
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            icon={Bell}
            title="In-app"
            description="Show realtime alerts inside Venora."
            checked={state.inAppEnabled}
            onChange={(checked) => setValue("inAppEnabled", checked)}
          />
          <ToggleRow
            icon={Mail}
            title="Email"
            description="Send important booking and payment updates by email."
            checked={state.emailEnabled}
            onChange={(checked) => setValue("emailEnabled", checked)}
          />
          <ToggleRow
            icon={MonitorSmartphone}
            title="Push"
            description="Send device alerts when your browser allows them."
            checked={state.pushEnabled}
            onChange={(checked) => setValue("pushEnabled", checked)}
          />
        </div>

        <button
          type="button"
          onClick={enablePushForDevice}
          disabled={registerPush.isPending}
          className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {registerPush.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MonitorSmartphone className="h-4 w-4" />
          )}
          Enable device push
        </button>
      </section>

      <section className="grid gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
            Categories
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">
            Notification types
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            icon={CalendarCheck2}
            title="Booking updates"
            description="Inquiry, approval, cancellation, completion, and expiry."
            checked={state.bookingUpdates}
            onChange={(checked) => setValue("bookingUpdates", checked)}
          />
          <ToggleRow
            icon={CreditCard}
            title="Payment updates"
            description="Payment started, received, failed, refunded, or pending."
            checked={state.paymentUpdates}
            onChange={(checked) => setValue("paymentUpdates", checked)}
          />
          <ToggleRow
            icon={Star}
            title="Review requests"
            description="Post-event review prompts and submitted review alerts."
            checked={state.reviewRequests}
            onChange={(checked) => setValue("reviewRequests", checked)}
          />
          <ToggleRow
            icon={ShieldAlert}
            title="Admin alerts"
            description="Verification, moderation, and platform operations."
            checked={state.adminAlerts}
            onChange={(checked) => setValue("adminAlerts", checked)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/50">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-slate-950">Quiet hours</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                Start
                <input
                  type="time"
                  value={state.quietHoursStart ?? ""}
                  onChange={(event) =>
                    setValue("quietHoursStart", event.target.value || null)
                  }
                  className="h-10 rounded-xl border border-[#E5E7EB] px-3 text-sm font-bold text-slate-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                End
                <input
                  type="time"
                  value={state.quietHoursEnd ?? ""}
                  onChange={(event) =>
                    setValue("quietHoursEnd", event.target.value || null)
                  }
                  className="h-10 rounded-xl border border-[#E5E7EB] px-3 text-sm font-bold text-slate-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                Timezone
                <input
                  type="text"
                  value={state.timezone}
                  onChange={(event) => setValue("timezone", event.target.value)}
                  className="h-10 rounded-xl border border-[#E5E7EB] px-3 text-sm font-bold text-slate-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {statusMessage ? (
          <div
            role="status"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold",
              statusMessage.includes("saved") ||
                statusMessage.includes("enabled")
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {statusMessage}
          </div>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={save}
          disabled={updatePreferences.isPending}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updatePreferences.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save preferences
        </button>
      </div>
    </div>
  );
}

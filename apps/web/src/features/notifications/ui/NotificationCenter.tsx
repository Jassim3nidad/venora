"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarCheck2,
  Check,
  CheckCheck,
  CreditCard,
  Loader2,
  ShieldAlert,
  Star,
} from "lucide-react";
import { cn } from "@venora/lib";
import {
  NOTIFICATION_KIND_LABELS,
  type NotificationKind,
  type NotificationReadFilter,
  type NotificationRecord,
} from "../types/notification.types";
import {
  useNotificationActions,
  useNotifications,
} from "../hooks/use-notifications";

const FILTERS: Array<{ label: string; read: NotificationReadFilter }> = [
  { label: "All", read: "all" },
  { label: "Unread", read: "unread" },
  { label: "Read", read: "read" },
];

const KINDS: Array<{ label: string; value: NotificationKind | "all" }> = [
  { label: "All types", value: "all" },
  { label: NOTIFICATION_KIND_LABELS.booking_update, value: "booking_update" },
  { label: NOTIFICATION_KIND_LABELS.payment_update, value: "payment_update" },
  { label: NOTIFICATION_KIND_LABELS.review_request, value: "review_request" },
  { label: NOTIFICATION_KIND_LABELS.admin_alert, value: "admin_alert" },
];

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  booking_update: CalendarCheck2,
  payment_update: CreditCard,
  review_request: Star,
  admin_alert: ShieldAlert,
  supplier_inquiry: Bell,
  system: Bell,
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: NotificationRecord;
  onRead: (id: string) => void;
}) {
  const Icon = KIND_ICON[notification.kind] ?? Bell;
  const content = (
    <>
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          notification.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-[#EFF6FF] text-[#2563EB]",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {!notification.isRead ? (
                <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
              ) : null}
              <p className="text-sm font-bold text-slate-950">
                {notification.title}
              </p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                {NOTIFICATION_KIND_LABELS[notification.kind]}
              </span>
            </div>
            {notification.body ? (
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                {notification.body}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 text-xs font-bold text-slate-400">
            {formatDate(notification.createdAt)}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/60 sm:flex-row sm:items-start">
      {notification.link ? (
        <Link
          href={notification.link}
          onClick={() => {
            if (!notification.isRead) onRead(notification.id);
          }}
          className="flex min-w-0 flex-1 gap-4 rounded-xl transition hover:bg-[#F8FAFC]"
        >
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 gap-4">{content}</div>
      )}

      {!notification.isRead ? (
        <button
          type="button"
          onClick={() => onRead(notification.id)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-xs font-extrabold text-slate-600 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
        >
          <Check className="h-4 w-4" />
          Mark read
        </button>
      ) : null}
    </article>
  );
}

export function NotificationCenter() {
  const [readFilter, setReadFilter] = useState<NotificationReadFilter>("all");
  const [kindFilter, setKindFilter] = useState<NotificationKind | "all">("all");
  const { data, isLoading, isError } = useNotifications({
    limit: 50,
    read: readFilter,
    kind: kindFilter === "all" ? undefined : kindFilter,
  });
  const { markRead, markAllRead } = useNotificationActions();
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.read}
                type="button"
                onClick={() => setReadFilter(filter.read)}
                className={cn(
                  "h-10 rounded-full px-4 text-sm font-extrabold transition",
                  readFilter === filter.read
                    ? "bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/25"
                    : "bg-[#F9FAFB] text-slate-600 hover:bg-[#EFF6FF] hover:text-[#1D4ED8]",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={kindFilter}
              onChange={(event) =>
                setKindFilter(event.target.value as NotificationKind | "all")
              }
              className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold text-slate-700 shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              aria-label="Filter notification type"
            >
              {KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={unreadCount === 0 || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] px-4 text-sm font-extrabold text-slate-600 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markAllRead.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all read
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          Notifications unavailable. Please refresh and try again.
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-8 text-center shadow-sm shadow-slate-200/70">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
            <Bell className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-[-0.03em] text-slate-950">
            Nothing here yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
            Booking updates, payment changes, review requests, admin alerts, and
            realtime messages will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onRead={(id) => markRead.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  Bell,
  CalendarCheck2,
  CheckCheck,
  CreditCard,
  Loader2,
  ShieldAlert,
  Star,
} from "lucide-react";
import { cn } from "@venora/lib";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@venora/ui";
import {
  useNotificationActions,
  useNotifications,
} from "../hooks/use-notifications";
import type {
  NotificationKind,
  NotificationRecord,
} from "../types/notification.types";

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  booking_update: CalendarCheck2,
  payment_update: CreditCard,
  review_request: Star,
  admin_alert: ShieldAlert,
  supplier_inquiry: Bell,
  system: Bell,
};

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = minute * 60;
  const day = hour * 24;

  if (Number.isNaN(date.getTime())) return "";
  if (diffMs < minute) return "Now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function NotificationPreviewItem({
  notification,
  onRead,
}: {
  notification: NotificationRecord;
  onRead: (id: string) => void;
}) {
  const Icon = KIND_ICON[notification.kind] ?? Bell;
  const href = notification.link ?? "/notifications";

  return (
    <DropdownMenuItem asChild>
      <Link
        href={href}
        onClick={() => {
          if (!notification.isRead) onRead(notification.id);
        }}
        className="grid cursor-pointer grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-xl p-3 focus:bg-[#EFF6FF]"
      >
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl",
            notification.isRead
              ? "bg-slate-100 text-slate-400"
              : "bg-[#EFF6FF] text-[#2563EB]",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="flex items-start justify-between gap-3">
            <span
              className={cn(
                "line-clamp-1 text-sm font-extrabold",
                notification.isRead ? "text-slate-600" : "text-slate-950",
              )}
            >
              {notification.title}
            </span>
            <span className="shrink-0 text-[11px] font-bold text-slate-400">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </span>
          {notification.body ? (
            <span className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
              {notification.body}
            </span>
          ) : null}
        </span>
      </Link>
    </DropdownMenuItem>
  );
}

export function NotificationBell({ className }: { className?: string }) {
  const { data, isLoading, isError } = useNotifications({ limit: 6 });
  const { markRead, markAllRead } = useNotificationActions();
  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30",
            className,
          )}
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-[min(92vw,380px)] rounded-2xl border-[#E5E7EB] bg-white p-2 shadow-xl shadow-slate-200/70"
      >
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <div>
            <p className="text-sm font-black text-slate-950">Notifications</p>
            <p className="text-xs font-semibold text-slate-500">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0 || markAllRead.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-xs font-extrabold text-slate-600 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markAllRead.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Read
          </button>
        </div>

        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="grid gap-2 p-2">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="p-4 text-sm font-semibold text-red-600">
            Notifications unavailable.
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <Bell className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-black text-slate-950">
              No notifications yet
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
              Booking, payment, review, and admin updates will appear here.
            </p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto py-1">
            {notifications.map((notification) => (
              <NotificationPreviewItem
                key={notification.id}
                notification={notification}
                onRead={(id) => markRead.mutate(id)}
              />
            ))}
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href="/notifications"
            className="justify-center rounded-xl px-3 py-2 text-sm font-extrabold text-[#2563EB] focus:bg-[#EFF6FF]"
          >
            View notification center
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import type {
  NotificationKind,
  NotificationListResponse,
  NotificationPreferences,
  NotificationReadFilter,
} from "../types/notification.types";

type UseNotificationsOptions = {
  limit?: number | undefined;
  read?: NotificationReadFilter | undefined;
  kind?: NotificationKind | undefined;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ?? payload?.message ?? "Request failed.";
    throw new Error(message);
  }

  return payload.data as T;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const queryClient = useQueryClient();
  const filters = useMemo(
    () => ({
      limit: options.limit ?? 20,
      read: options.read ?? "all",
      kind: options.kind,
    }),
    [options.kind, options.limit, options.read],
  );

  const query = useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(filters.limit),
        read: filters.read,
      });

      if (filters.kind) params.set("kind", filters.kind);

      return requestJson<NotificationListResponse>(
        `/api/notifications?${params.toString()}`,
      );
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    void supabase.auth.getUser().then(({ data }) => {
      if (!isMounted || !data.user) return;

      const channelName = `notifications:${data.user.id}:${Math.random()
        .toString(36)
        .slice(2)}`;

      channel = supabase.channel(channelName);
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${data.user.id}`,
          },
          () => {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.notifications.all,
            });
          },
        )
        .subscribe();
    });

    return () => {
      isMounted = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent<{ type?: string }>) => {
      if (
        event.data?.type === "VENORA_NOTIFICATION_RECEIVED" ||
        event.data?.type === "VENORA_NOTIFICATION_CLICKED"
      ) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all,
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [queryClient]);

  useEffect(() => {
    const unreadCount = query.data?.unreadCount;
    if (typeof navigator === "undefined" || unreadCount === undefined) {
      return;
    }

    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };

    if (unreadCount > 0) {
      void badgeNavigator.setAppBadge?.(unreadCount);
    } else {
      void badgeNavigator.clearAppBadge?.();
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: "VENORA_BADGE_COUNT",
        count: unreadCount,
      });
    }
  }, [query.data?.unreadCount]);

  return query;
}

export function useNotificationActions() {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

  const markRead = useMutation({
    mutationFn: (notificationId: string) =>
      requestJson<{ id: string }>(
        `/api/notifications/${notificationId}/read`,
        { method: "POST" },
      ),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () =>
      requestJson<{ markedCount: number }>("/api/notifications/read-all", {
        method: "POST",
      }),
    onSuccess: invalidate,
  });

  return { markRead, markAllRead };
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: () =>
      requestJson<NotificationPreferences>("/api/notification-preferences"),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: Omit<NotificationPreferences, "userId">) =>
      requestJson<NotificationPreferences>("/api/notification-preferences", {
        method: "PATCH",
        body: JSON.stringify(preferences),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.preferences,
      });
    },
  });
}

export function useRegisterPushSubscription() {
  return useMutation({
    mutationFn: (subscription: PushSubscription) =>
      requestJson<{ subscriptionId: string }>(
        "/api/notifications/push-subscriptions",
        {
          method: "POST",
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: subscription.toJSON().keys,
            userAgent:
              typeof navigator === "undefined" ? undefined : navigator.userAgent,
          }),
        },
      ),
  });
}

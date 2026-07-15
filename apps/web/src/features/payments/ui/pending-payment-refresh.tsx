"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the current route while a payment is awaiting webhook
 * confirmation, so the page flips to "confirmed" without a manual
 * reload. Stops after ~2 minutes; the notification bell covers the
 * rare slower settlement.
 */
export function PendingPaymentRefresh({
  intervalMs = 5000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt > 120_000) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [router, intervalMs]);

  return null;
}

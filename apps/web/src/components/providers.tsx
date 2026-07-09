"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ToastProvider, ToastViewport } from "@venora/ui";
import { Toaster } from "sonner";
import { useState, type ReactNode } from "react";
import AssistantWidgetGate from "@/features/ai/ui/AssistantWidgetGate";

/**
 * Global providers wrapper.
 * Add theme providers, toast providers, etc. here as the app grows.
 */
function HashAuthCatcher() {
  if (typeof window !== "undefined") {
    const hash = window.location.hash;
    if (hash && hash.includes("error=access_denied")) {
      const params = new URLSearchParams(hash.substring(1));
      const errorDesc = params.get("error_description") || "Your link is invalid or has expired.";
      // Redirect to login with the error
      window.location.href = `/login?error=${encodeURIComponent(errorDesc)}`;
    } else if (hash && hash.includes("access_token=")) {
      // In case they somehow get an implicit flow token on the root
      window.location.href = `/auth/callback${hash}`;
    }
  }
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <HashAuthCatcher />
      <ToastProvider>
        {children}
        <ToastViewport />
      </ToastProvider>
      <AssistantWidgetGate />
      <Toaster richColors position="top-center" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

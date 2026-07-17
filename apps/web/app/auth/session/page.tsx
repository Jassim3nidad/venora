"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSafeInternalRedirect } from "@/lib/profile-setup";

function AuthSessionFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          Venora
        </p>
        <h1 className="mt-3 text-2xl font-bold">Finishing sign in</h1>
        <p className="mt-2 text-sm text-slate-500">
          Please wait while we secure your session.
        </p>
      </div>
    </main>
  );
}

function AuthSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState(
    "Please wait while we secure your session.",
  );
  const next = useMemo(() => {
    const value = searchParams.get("next");
    return isSafeInternalRedirect(value) ? value! : "/dashboard";
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    async function finishSession() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const error = hash.get("error_description") || hash.get("error");

      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error)}`);
        return;
      }

      if (!accessToken || !refreshToken) {
        router.replace("/login?error=oauth_callback_failed");
        return;
      }

      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        router.replace("/login?error=oauth_callback_failed");
        return;
      }

      if (isMounted) setMessage("Session ready. Redirecting...");
      window.location.replace(next);
    }

    void finishSession();

    return () => {
      isMounted = false;
    };
  }, [next, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          Venora
        </p>
        <h1 className="mt-3 text-2xl font-bold">Finishing sign in</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
    </main>
  );
}

export default function AuthSessionPage() {
  return (
    <Suspense fallback={<AuthSessionFallback />}>
      <AuthSessionContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Mail, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { verifyOtpAction } from "@/features/auth/actions/auth.actions";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | "email" | null;
  const next = searchParams.get("next") || "/login";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleVerify = () => {
    if (!tokenHash || !type) {
      setError("Missing verification token or type. Please use the exact link from your email.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await verifyOtpAction(tokenHash, type);
      
      if (response.success) {
        // Redirect to login with success parameter
        router.push(`/login?verified=true&next=${encodeURIComponent(next)}`);
      } else {
        setError(response.error ?? "Failed to verify email. The link may be expired.");
      }
    });
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#F9FAFB] px-4 py-8 sm:px-6">
      <div className="w-full max-w-[460px]">
        <div className="mb-8 flex items-center justify-center">
          <Link
            href="/"
            className="text-2xl font-black tracking-[-0.04em] text-[#2563EB]"
          >
            Venora
          </Link>
        </div>

        <div className="rounded-[28px] border border-[#E5E7EB]/80 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
              <Mail className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-black leading-tight tracking-[-0.04em] text-[#111827]">
              Verify your email
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280]">
              You are almost there! Click the button below to securely confirm your email address and activate your account.
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {!tokenHash || !type ? (
            <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 mb-6">
              <p className="text-sm text-amber-800 font-medium text-center">
                We couldn't find a valid token in the URL. If you copied and pasted the link, make sure you included the entire URL.
              </p>
            </div>
          ) : (
            <button
              onClick={handleVerify}
              disabled={isPending}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 text-base font-extrabold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563EB]/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Confirm my email address
                </>
              )}
            </button>
          )}

          <div className="mt-7 text-center">
             <Link
                href="/login"
                className="text-sm font-bold text-[#6B7280] transition hover:text-[#111827]"
              >
                Return to login
              </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  );
}

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@venora/ui";
import {
  type AuthPromptKind,
  authPromptKindForHref,
} from "@/components/layout/marketplace-navigation";
import { createClient } from "@/lib/supabase/client";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

const PROMPT_COPY: Record<
  AuthPromptKind,
  { title: string; description: string }
> = {
  bookings: {
    title: "Login to see Bookings",
    description:
      "Sign in or create an account to track your venue bookings and supplier inquiries.",
  },
  favorites: {
    title: "Login to see Favorites",
    description:
      "Sign in or create an account to save venues and suppliers you like.",
  },
  host: {
    title: "Login to host a venue",
    description:
      "Sign in or create an account to apply as a venue partner on Venora.",
  },
  generic: {
    title: "Sign in to continue",
    description: "Sign in or create an account to use this part of Venora.",
  },
};

type AuthRequiredPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo: string;
  kind?: AuthPromptKind;
};

export function AuthRequiredPrompt({
  open,
  onOpenChange,
  redirectTo,
  kind,
}: AuthRequiredPromptProps) {
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const resolvedKind =
    kind ?? authPromptKindForHref(redirectTo) ?? ("generic" as const);
  const copy = PROMPT_COPY[resolvedKind];

  const loginHref = `/login?${new URLSearchParams({
    redirectTo,
    ...(kind === "favorites" || kind === "bookings" || kind === "host"
      ? { prompt: kind }
      : {}),
  }).toString()}`;
  const registerHref = `/register?${new URLSearchParams({
    redirectTo,
  }).toString()}`;

  const handleGoogleSignIn = () => {
    if (isGoogleLoading) return;

    setGoogleError(null);
    setIsGoogleLoading(true);

    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", redirectTo);

    supabase.auth
      .signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          scopes: "openid email profile",
        },
      })
      .then(({ error }) => {
        if (error) {
          setGoogleError(
            "We could not sign you in with Google. Please try again.",
          );
          setIsGoogleLoading(false);
        }
      })
      .catch(() => {
        setGoogleError(
          "We could not sign you in with Google. Please try again.",
        );
        setIsGoogleLoading(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] gap-5 border-[#E5E7EB] bg-white p-6 sm:p-7">
        <DialogHeader className="space-y-2 text-center sm:text-center">
          <p className="mx-auto inline-flex rounded-full border border-[#E5E7EB] bg-[#EFF6FF] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1D4ED8]">
            Account required
          </p>
          <DialogTitle className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-sm font-medium leading-6 text-[#6B7280]">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        {googleError ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {googleError}
          </p>
        ) : null}

        <div className="grid gap-3">
          <Link
            href={loginHref}
            onClick={() => onOpenChange(false)}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563EB] text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
          >
            Log In
          </Link>
          <Link
            href={registerHref}
            onClick={() => onOpenChange(false)}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-sm font-extrabold text-[#1D4ED8] transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF]"
          >
            Register
          </Link>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white text-sm font-extrabold text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <GoogleLogo />
            {isGoogleLoading ? "Connecting…" : "Continue with Google"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useAuthRequiredPrompt(
  defaultRedirectTo = "/favorites",
  kind: AuthPromptKind = "favorites",
) {
  const [open, setOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState(defaultRedirectTo);

  const openAuthPrompt = useCallback(
    (nextRedirectTo = defaultRedirectTo) => {
      setRedirectTo(nextRedirectTo);
      setOpen(true);
    },
    [defaultRedirectTo],
  );

  const authPrompt = (
    <AuthRequiredPrompt
      open={open}
      onOpenChange={setOpen}
      redirectTo={redirectTo}
      kind={kind}
    />
  );

  return { openAuthPrompt, authPrompt };
}

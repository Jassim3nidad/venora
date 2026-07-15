"use client";

import { Suspense, type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Check, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
import {
  loginAction,
  resendVerificationEmailAction,
} from "@/features/auth/actions/auth.actions";
import { loginSchema } from "@/features/auth/schemas/auth.schema";
import { researchVenues } from "@/src/features/venues/data/research-venues";
import { createClient } from "@/lib/supabase/client";

const brandPoints = [
  "Curated, high-quality spaces.",
  "Transparent, upfront pricing.",
  "Seamless booking management.",
];
const heroVenue = researchVenues[0]!;

// Official Google "G" logomark — required by Google's brand guidelines for
// sign-in buttons (a generic browser icon does not satisfy them).
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

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_cancelled: "Google sign-in was cancelled. Please try again.",
  oauth_provider_error:
    "Google sign-in is temporarily unavailable. Please try again.",
  account_restricted: "Your account cannot access Venora at this time.",
  oauth_callback_failed:
    "We could not sign you in with Google. Please try again.",
};

function toOAuthErrorMessage(code: string) {
  return OAUTH_ERROR_MESSAGES[code] ?? code;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const didReset = searchParams.get("reset") === "true";
  const didRegister = searchParams.get("registered") === "true";
  const didVerify = searchParams.get("verified") === "true";
  const redirectTo =
    searchParams.get("redirectTo") || searchParams.get("next") || undefined;
  const promptParam = searchParams.get("prompt");
  const gatePrompt =
    promptParam === "bookings" ||
    redirectTo === "/bookings" ||
    redirectTo?.startsWith("/bookings")
      ? "Login to see Bookings"
      : promptParam === "favorites" ||
          redirectTo === "/favorites" ||
          redirectTo?.startsWith("/favorites")
        ? "Login to see Favorites"
        : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(() => {
    const errorParam = searchParams.get("error");
    return errorParam ? toOAuthErrorMessage(errorParam) : null;
  });
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = () => {
    if (isPending || isGoogleLoading) return; // guard against duplicate clicks

    setGeneralError(null);
    setShowResendVerification(false);
    setResendMessage(null);
    setIsGoogleLoading(true);

    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (redirectTo) callbackUrl.searchParams.set("next", redirectTo);

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
          setGeneralError(
            "We could not sign you in with Google. Please try again.",
          );
          setIsGoogleLoading(false);
        }
        // On success the SDK navigates the browser to Google — nothing left
        // to update here, and this component is about to unmount.
      })
      .catch(() => {
        setGeneralError(
          "We could not sign you in with Google. Please try again.",
        );
        setIsGoogleLoading(false);
      });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setFieldErrors({});
    setGeneralError(null);
    setShowResendVerification(false);
    setResendMessage(null);

    const result = loginSchema.safeParse({
      email,
      password,
    });

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await loginAction({
        email,
        password,
        redirectTo,
      });

      if (response && !response.success) {
        setGeneralError(response.error);
        const data = response.data as
          { reason?: string; email?: string } | undefined;
        setShowResendVerification(data?.reason === "email_unverified");

        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
      }
    });
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#F9FAFB] text-[#111827]">
      <section className="relative hidden h-screen w-1/2 overflow-hidden bg-[#111827] lg:flex">
        <img
          src={
            heroVenue.photos.cover_image_url ?? heroVenue.photos.image_urls?.[0]
          }
          alt={`${heroVenue.name} venue`}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#111827]/95 via-[#1D4ED8]/88 to-[#2563EB]/78" />

        <div className="relative z-10 flex w-full flex-col justify-between px-12 py-12 xl:px-16">
          <Link
            href="/"
            className="text-2xl font-black tracking-[-0.04em] text-white transition hover:text-[#EFF6FF]"
          >
            Venora
          </Link>

          <div className="max-w-xl">
            <h1 className="text-5xl font-black leading-tight tracking-[-0.05em] text-white xl:text-6xl">
              Where extraordinary events begin.
            </h1>

            <p className="mt-5 max-w-md text-base font-medium leading-7 text-white/82">
              Sign in to manage bookings, compare favorites, and continue
              planning with Venora&apos;s curated venue marketplace.
            </p>

            <ul className="mt-9 space-y-4">
              {brandPoints.map((item) => (
                <li key={item} className="flex items-center gap-3 text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="text-base font-semibold leading-6">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/20 bg-white/15 p-5 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/70">
              Trusted marketplace
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/85">
              Browse verified venues, confirm availability, and keep event
              details organized from one polished workspace.
            </p>
          </div>
        </div>
      </section>

      <section className="flex h-full w-full flex-col overflow-y-auto bg-[#F9FAFB] px-4 py-8 sm:px-6 lg:w-1/2 lg:px-12 xl:px-16">
        <div className="my-auto w-full max-w-[460px] self-center">
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <Link
              href="/"
              className="text-2xl font-black tracking-[-0.04em] text-[#2563EB]"
            >
              Venora
            </Link>
          </div>

          <div className="rounded-[28px] border border-[#E5E7EB]/80 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="mb-7 text-center">
              <p className="mb-3 inline-flex rounded-full border border-[#E5E7EB] bg-[#EFF6FF] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1D4ED8]">
                Welcome back
              </p>
              <h2 className="text-3xl font-black leading-tight tracking-[-0.04em] text-[#111827]">
                Sign in to Venora
              </h2>
              {gatePrompt ? (
                <p
                  role="status"
                  className="mt-3 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm font-extrabold leading-6 text-[#1D4ED8]"
                >
                  {gatePrompt}
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280]">
                  Enter your details to continue planning.
                </p>
              )}
            </div>

            {didReset ? (
              <div
                role="status"
                className="mb-4 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Your password has been reset successfully. Please sign in
                  below.
                </span>
              </div>
            ) : null}

            {didVerify ? (
              <div
                role="status"
                className="mb-4 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Your email has been verified! Please sign in to continue.
                </span>
              </div>
            ) : null}

            {didRegister ? (
              <div
                role="status"
                className="mb-4 flex gap-3 rounded-2xl border border-[#E5E7EB] bg-[#EFF6FF] px-4 py-3 text-sm font-semibold leading-6 text-[#1D4ED8]"
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Registration successful. Please check your email to verify
                  your account.
                </span>
              </div>
            ) : null}

            {generalError ? (
              <div
                role="alert"
                className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700"
              >
                {generalError}
                {showResendVerification ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setResendMessage(null);

                      startTransition(async () => {
                        const response = await resendVerificationEmailAction({
                          email,
                        });

                        if (response.success) {
                          setResendMessage(
                            "We sent a fresh verification link. Please check your inbox.",
                          );
                          return;
                        }

                        setGeneralError(response.error);
                      });
                    }}
                    className="mt-3 block rounded-xl bg-red-700 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isPending ? "Sending..." : "Resend verification email"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {resendMessage ? (
              <div
                role="status"
                className="mb-4 flex gap-3 rounded-2xl border border-[#E5E7EB] bg-[#EFF6FF] px-4 py-3 text-sm font-semibold leading-6 text-[#1D4ED8]"
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{resendMessage}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="login-email"
                  className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#111827]"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    autoComplete="email"
                    disabled={isPending}
                    className={[
                      "h-12 w-full rounded-2xl border bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold text-[#111827] shadow-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
                      fieldErrors.email
                        ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : "border-[#E5E7EB] hover:border-[#2563EB]/60 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10",
                    ].join(" ")}
                  />
                </div>

                {fieldErrors.email?.[0] ? (
                  <p className="text-xs font-semibold text-red-600">
                    {fieldErrors.email[0]}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#111827]"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-bold text-[#2563EB] transition hover:text-[#1D4ED8]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isPending}
                    className={[
                      "h-12 w-full rounded-2xl border bg-[#F9FAFB] pl-11 pr-12 text-sm font-semibold text-[#111827] shadow-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
                      fieldErrors.password
                        ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : "border-[#E5E7EB] hover:border-[#2563EB]/60 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10",
                    ].join(" ")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#EFF6FF] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {fieldErrors.password?.[0] ? (
                  <p className="text-xs font-semibold text-red-600">
                    {fieldErrors.password[0]}
                  </p>
                ) : null}
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isPending}
                className="h-12 w-full rounded-2xl bg-[#2563EB] text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563EB]/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Signing in..." : "Continue"}
              </button>
            </form>

            <div className="flex items-center py-6">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span className="mx-4 text-sm font-semibold text-[#6B7280]">
                or
              </span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            <button
              id="google-signin-btn"
              type="button"
              disabled={isPending || isGoogleLoading}
              aria-label="Continue with Google"
              aria-busy={isGoogleLoading}
              onClick={handleGoogleSignIn}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white text-sm font-extrabold text-[#111827] shadow-sm transition hover:border-[#2563EB]/60 hover:bg-[#EFF6FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563EB]/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGoogleLoading ? (
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#2563EB]"
                  aria-hidden="true"
                />
              ) : (
                <GoogleLogo />
              )}
              {isGoogleLoading
                ? "Connecting to Google..."
                : "Continue with Google"}
            </button>
          </div>

          <div className="mt-7 text-center">
            <p className="text-sm font-semibold leading-6 text-[#6B7280]">
              New to Venora?{" "}
              <Link
                href="/register"
                className="font-extrabold text-[#2563EB] transition hover:text-[#1D4ED8]"
              >
                Create an account.
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

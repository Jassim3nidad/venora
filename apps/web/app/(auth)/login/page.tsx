"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { Check, DraftingCompass, LockKeyhole, Mail } from "lucide-react";
import {
  loginAction,
  signInWithOAuthAction,
} from "@/features/auth/actions/auth.actions";
import { loginSchema } from "@/features/auth/schemas/auth.schema";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setFieldErrors({});
    setGeneralError(null);

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
      });

      if (response && !response.success) {
        setGeneralError(response.error);

        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
      }
    });
  };

  return (
    <main className="flex min-h-screen w-full overflow-hidden bg-white">
      {/* Left Branding Panel */}
      <section className="relative hidden min-h-screen w-1/2 overflow-hidden bg-[#0F172A] lg:flex">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-[0.18]">
          <div className="absolute left-[18%] top-[10%] h-[360px] w-[260px] rounded-[28px] border border-white/10 bg-white/5 shadow-2xl" />
          <div className="absolute bottom-[10%] right-[12%] h-[340px] w-[260px] rounded-[28px] border border-white/10 bg-white/5 shadow-2xl" />
          <div className="absolute left-[42%] top-[13%] h-[220px] w-[220px] rotate-45 bg-white/5" />
          <div className="absolute bottom-[20%] right-[24%] h-[220px] w-[220px] rotate-45 bg-white/5" />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-[#0F172A]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,rgba(255,255,255,0.10),transparent_35%)]" />

        <div className="relative z-10 mx-auto flex w-full max-w-[560px] translate-x-[40px] flex-col justify-center px-[64px]">
          {/* Brand */}
          <div className="mb-[58px] flex items-center gap-[12px]">
            <DraftingCompass className="h-[32px] w-[32px] text-[#F4C7B8]" />
            <span className="text-[24px] font-extrabold leading-[32px] tracking-[-0.02em] text-white">
              Venora
            </span>
          </div>

          {/* Value Prop */}
          <div>
            <h1 className="max-w-[560px] text-[50px] font-bold leading-[65px] tracking-[-0.05em] text-white">
              Where Extraordinary Events Begin.
            </h1>

            <ul className="mt-[54px] flex translate-y-[20px] flex-col gap-[24px]">
              <li className="flex items-center gap-[18px] text-white">
                <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#FFDACE]">
                  <Check
                    className="h-[14px] w-[14px] text-[#0F172A]"
                    strokeWidth={3}
                  />
                </span>

                <span className="text-[18px] leading-[28px]">
                  Curated, high-quality spaces.
                </span>
              </li>

              <li className="flex items-center gap-[18px] text-white">
                <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#FFDACE]">
                  <Check
                    className="h-[14px] w-[14px] text-[#0F172A]"
                    strokeWidth={3}
                  />
                </span>

                <span className="text-[18px] leading-[28px]">
                  Transparent, upfront pricing.
                </span>
              </li>

              <li className="flex items-center gap-[18px] text-white">
                <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#FFDACE]">
                  <Check
                    className="h-[14px] w-[14px] text-[#0F172A]"
                    strokeWidth={3}
                  />
                </span>

                <span className="text-[18px] leading-[28px]">
                  Seamless booking management.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Right Login Panel */}
      <section className="flex min-h-screen w-full items-center justify-center bg-white px-[24px] py-[40px] lg:w-1/2 lg:px-[64px]">
        <div className="w-full max-w-[430px]">
          {/* Mobile Logo */}
          <div className="mb-[48px] flex items-center justify-center gap-[10px] lg:hidden">
            <DraftingCompass className="h-[32px] w-[32px] text-[#E07A5F]" />
            <span className="text-[24px] font-extrabold text-slate-950">
              Venora
            </span>
          </div>

          {/* Header */}
          <div className="mb-[32px] text-center">
            <h2 className="translate-y-[-20px] text-[34px] font-semibold leading-[42px] tracking-[-0.04em] text-slate-950">
              Sign in to Venora
            </h2>
            <p className="mt-[8px] translate-y-[-20px] text-[16px] font-medium leading-[24px] text-[#55423E]">
              Welcome back. Enter your details below.
            </p>
          </div>

          {/* Error */}
          {generalError ? (
            <div
              role="alert"
              className="mb-[18px] rounded-[12px] border border-red-200 bg-red-50 px-[14px] py-[12px] text-[14px] font-medium text-red-700"
            >
              {generalError}
            </div>
          ) : null}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
            {/* Email */}
            <div className="flex flex-col gap-[6px]">
              <label
                htmlFor="login-email"
                className="text-[12px] font-bold uppercase leading-[16px] tracking-[0.08em] text-slate-950"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-[10px] top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#55423E]" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  autoComplete="email"
                  disabled={isPending}
                  className={`h-[46px] w-full rounded-[6px] border bg-white !pl-[40px] pr-[20px] text-[16px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#E07A5F] focus:ring-4 focus:ring-[#E07A5F]/10 disabled:cursor-not-allowed disabled:opacity-60 ${
                    fieldErrors.email
                      ? "border-red-500"
                      : "border-[#E2E8F0]"
                  }`}
                />
              </div>

              {fieldErrors.email?.[0] ? (
                <p className="text-[13px] font-medium text-red-600">
                  {fieldErrors.email[0]}
                </p>
              ) : null}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-[6px]">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-[12px] font-bold uppercase leading-[16px] tracking-[0.08em] text-slate-950"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-[14px] font-semibold text-[#E07A5F] transition hover:text-[#9A442D] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-[14px] top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#55423E]" />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isPending}
                  className={`h-[46px] w-full rounded-[6px] border bg-white !pl-[42px] pr-[16px] text-[16px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#E07A5F] focus:ring-4 focus:ring-[#E07A5F]/10 disabled:cursor-not-allowed disabled:opacity-60 ${
                    fieldErrors.password
                      ? "border-red-500"
                      : "border-[#E2E8F0]"
                  }`}
                />
              </div>

              {fieldErrors.password?.[0] ? (
                <p className="text-[13px] font-medium text-red-600">
                  {fieldErrors.password[0]}
                </p>
              ) : (
                <p className="mt-[2px] text-[14px] font-medium leading-[20px] text-[#55423E]">
                  Must be at least 8 characters.
                </p>
              )}
            </div>

            {/* Continue Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isPending}
              className="mt-[8px] h-[46px] w-full rounded-[6px] bg-[#E07A5F] text-[15px] font-extrabold text-white transition hover:bg-[#9A442D] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Signing in..." : "Continue"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center py-[24px]">
            <div className="h-px flex-1 bg-[#E2E8F0]" />
            <span className="mx-[16px] text-[14px] font-medium text-[#55423E]">
              or
            </span>
            <div className="h-px flex-1 bg-[#E2E8F0]" />
          </div>

          {/* Google Button */}
          <button
            id="google-signin-btn"
            type="button"
            disabled={isPending}
            onClick={() => {
              setGeneralError(null);

              startTransition(async () => {
                const res = await signInWithOAuthAction("google");

                if (res && !res.success) {
                  setGeneralError(res.error);
                }
              });
            }}
            className="flex h-[46px] w-full items-center justify-center gap-[10px] rounded-[6px] border border-[#E2E8F0] bg-white text-[15px] font-extrabold text-slate-950 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <svg
              className="h-[18px] w-[18px]"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          {/* Footer */}
          <div className="mt-[30px] text-center">
            <p className="translate-y-[15px] text-[16px] font-medium leading-[24px] text-[#55423E]">
              New to Venora?{" "}
              <Link
                href="/register"
                className="font-extrabold text-[#E07A5F] transition hover:text-[#9A442D] hover:underline"
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
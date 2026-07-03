"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, Mail, Sparkles } from "lucide-react";
import { forgotPasswordAction } from "@/features/auth/actions/auth.actions";
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schema";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSuccess(false);

    const result = forgotPasswordSchema.safeParse({ email });

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await forgotPasswordAction({ email });

      if (response && response.success) {
        setSuccess(true);
      } else {
        setFieldErrors({
          email: [
            "Unable to send reset link. Please check your network and try again.",
          ],
        });
      }
    });
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#F9FAFB_0%,#F8FAFC_100%)] px-4 py-10 text-[#111827] sm:px-6">
      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#2563EB] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center text-2xl font-black tracking-[-0.04em] text-white"
            >
              Venora
            </Link>

            <div className="mt-16 inline-flex items-center gap-2 !translate-x-5 rounded-full border border-white/25 bg-white/15 px-10 py-2 text-xs font-bold uppercase tracking-[0.14em] backdrop-blur-md">
              Secure account recovery
            </div>

            <h1 className="mt-6 max-w-sm text-4xl font-black leading-tight tracking-[-0.04em]">
              Get back to planning extraordinary events.
            </h1>

            <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-white/80">
              Enter your email and we&apos;ll help you reset your password so
              you can continue browsing venues, bookings, and event tools.
            </p>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/15 p-5 backdrop-blur-md">
            <p className="text-sm font-semibold leading-6 text-white/85">
              For your security, password reset links are sent only to the email
              connected to your Venora account.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mb-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-extrabold text-[#6B7280] transition hover:text-[#2563EB]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>

          <div className="mx-auto max-w-md">
            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] shadow-sm">
                <Mail className="h-6 w-6" />
              </div>

              <p className="mb-3 inline-flex rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
                Password reset
              </p>

              <h1 className="text-3xl font-black tracking-[-0.04em] text-[#111827] sm:text-4xl">
                Forgot your password?
              </h1>

              <p className="mt-3 text-sm font-medium leading-6 text-slate-500 sm:text-base">
                Enter your email address and we&apos;ll send you a secure reset
                link.
              </p>
            </div>

            {success ? (
              <div
                role="status"
                className="rounded-2xl border border-[#E5E7EB] bg-[#EFF6FF] p-5 text-sm font-semibold leading-6 text-[#1D4ED8]"
              >
                If your email is registered, you will receive a password reset
                link shortly. Please check your spam/junk folder if you do not
                see it in your inbox.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={isPending}
                      className={[
                        "h-12 w-full rounded-2xl border bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70",
                        fieldErrors.email
                          ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                          : "border-slate-200 hover:border-[#E5E7EB] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10",
                      ].join(" ")}
                    />
                  </div>

                  {fieldErrors.email && (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      {fieldErrors.email[0]}
                    </p>
                  )}
                </div>

                <button
                  id="forgot-submit-btn"
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563EB]/25 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPending ? "Sending reset link..." : "Send Reset Link"}
                </button>
              </form>
            )}

            <p className="mt-8 text-center text-sm font-medium text-slate-500">
              Remembered your password?{" "}
              <Link
                href="/login"
                className="font-extrabold text-[#2563EB] transition hover:text-[#1D4ED8]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

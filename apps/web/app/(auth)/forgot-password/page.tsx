"use client";

import Link from "next/link";
import { Suspense, useState, useTransition, type FormEvent } from "react";
import { ArrowLeft, Mail, AlertCircle, Lock } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { forgotPasswordAction } from "@/features/auth/actions/auth.actions";
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schema";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams?.get("error");

  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSuccess(false);

    const result = forgotPasswordSchema.safeParse({ email });

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      try {
        const response = await forgotPasswordAction({ email });

        if (response && response.success) {
          setSuccess(true);
        } else if (response && response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        } else {
          setFieldErrors({
            email: ["Password recovery is temporarily unavailable. Please try again later."],
          });
        }
      } catch (error) {
        setFieldErrors({
          email: ["We couldn't send the reset request. Check your connection and try again."],
        });
      }
    });
  };

  return (
    <main className="flex min-h-screen flex-col bg-white lg:items-center lg:justify-center lg:bg-[#F9FAFB] lg:px-6 lg:py-10">
      <section className="flex w-full max-w-[1080px] flex-col bg-white lg:min-h-[600px] lg:flex-row lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-slate-200 lg:shadow-xl lg:shadow-slate-200/50">
        
        {/* LEFT BRANDING PANEL */}
        <div className="hidden flex-col justify-between bg-[#1D4ED8] p-12 text-white lg:flex lg:w-[42%]">
          <div>
            <Link
              href="/"
              className="inline-flex items-center text-2xl font-black tracking-[-0.04em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm"
            >
              Venora
            </Link>
            
            <h1 className="mt-16 max-w-sm text-3xl font-bold leading-tight tracking-[-0.02em]">
              Return to your Venora account
            </h1>
            
            <p className="mt-4 max-w-sm text-base font-medium leading-7 text-white/80">
              Reset your password securely and continue managing your venues,
              bookings, suppliers, and event plans.
            </p>
          </div>
          
          <div className="flex items-center gap-3 text-sm font-medium text-white/80">
            <Lock className="h-5 w-5 shrink-0" />
            <p>Reset links expire after a limited time and can only be used once.</p>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="flex w-full flex-col px-6 py-8 sm:px-10 lg:w-[58%] lg:p-12">
          
          <div className="mb-10 flex items-center lg:hidden">
            <Link href="/" className="text-2xl font-black tracking-[-0.04em] text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-sm">
              Venora
            </Link>
          </div>

          <div className="mb-10 lg:mb-12">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md text-[15px] font-medium text-slate-500 transition-colors hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>

          <div className="mx-auto w-full max-w-[460px] lg:ml-0">
            <div className="mb-8">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#2563EB]">
                Account Recovery
              </p>
              
              <h1 className="text-[30px] font-bold leading-tight tracking-[-0.04em] text-[#0F172A] lg:text-[38px]">
                Reset your password
              </h1>
              
              <p className="mt-3 text-[16px] leading-7 text-slate-500">
                Enter the email associated with your Venora account. We&apos;ll send you a secure password-reset link.
              </p>
            </div>

            {urlError && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="font-bold text-red-900">Reset link expired or invalid</p>
                  <p className="mt-1 opacity-90">{urlError}</p>
                </div>
              </div>
            )}

            {success ? (
              <div className="flex flex-col gap-6" aria-live="polite">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-2 text-xl font-bold text-[#0F172A]">Check your email</h2>
                  <p className="text-[15px] leading-6 text-slate-600">
                    If an account exists for the email you entered, we&apos;ve sent password-reset instructions.
                  </p>
                  <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-500">
                    <li>Check your spam or junk folder</li>
                    <li>The link expires after a limited time</li>
                    <li>Wait for the resend cooldown before requesting another link</li>
                  </ul>
                </div>
                
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2563EB] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563EB]/25"
                  >
                    Back to sign in
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setSuccess(false);
                      setEmail("");
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                  >
                    Send another link
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="mb-2 block text-[14px] font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      disabled={isPending}
                      aria-invalid={!!fieldErrors.email}
                      aria-describedby={fieldErrors.email ? "email-error" : undefined}
                      className={[
                        "h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-[16px] text-[#0F172A] outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70",
                        fieldErrors.email
                          ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                          : "border-slate-300 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10",
                      ].join(" ")}
                    />
                  </div>

                  {fieldErrors.email && (
                    <p id="email-error" className="mt-2 text-sm font-medium text-red-600">
                      {fieldErrors.email[0]}
                    </p>
                  )}
                </div>

                <button
                  id="forgot-submit-btn"
                  type="submit"
                  disabled={isPending}
                  aria-busy={isPending}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#2563EB] px-5 text-[15px] font-semibold text-white transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563EB]/25 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPending ? "Sending reset link..." : "Send reset link"}
                </button>

                <div className="mt-2 flex items-center gap-2 text-[13px] text-slate-500">
                  <Lock className="h-4 w-4 shrink-0" />
                  <p>For your security, the reset link will expire after a limited time.</p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFB]" />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

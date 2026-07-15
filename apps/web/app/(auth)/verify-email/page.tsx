import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { ResendVerificationForm } from "./resend-verification-form";

export const metadata: Metadata = {
  title: "Verify Email | Venora",
};

export default function VerifyEmailPage() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#F9FAFB] px-4 py-10 text-[#111827] sm:px-6">
      <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-[#2563EB]/15 blur-3xl" />
      <div className="absolute bottom-[-140px] right-[-120px] h-[360px] w-[360px] rounded-full bg-[#37BCF1]/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#EFF6FF_0%,transparent_38%)]" />

      <section className="relative z-10 w-full max-w-[520px]">
        <div className="mb-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-3xl font-black tracking-[-0.05em] text-[#2563EB] transition hover:text-[#1D4ED8]"
          >
            Venora
          </Link>
        </div>

        <div className="rounded-[32px] border border-[#E5E7EB] bg-white/90 p-6 text-center shadow-2xl shadow-slate-200/70 backdrop-blur-xl sm:p-9">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#EFF6FF] text-[#2563EB] shadow-lg shadow-[#2563EB]/15">
            <Mail className="h-10 w-10" strokeWidth={2.4} />
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1D4ED8]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Email verification
          </div>

          <h1 className="text-3xl font-black leading-tight tracking-[-0.05em] text-[#111827] sm:text-4xl">
            Check your inbox
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-sm font-medium leading-7 text-[#6B7280]">
            We&apos;ve sent a verification link to your email address. Click the
            link to activate your Venora account and continue planning your
            event.
          </p>

          <div className="mt-8 rounded-3xl border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-left">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#374151]">
              What to do next
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-xs font-black text-white">
                  1
                </span>
                <p className="text-sm font-semibold leading-6 text-[#4B5563]">
                  Open your email inbox.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-xs font-black text-white">
                  2
                </span>
                <p className="text-sm font-semibold leading-6 text-[#4B5563]">
                  Click the verification link from Venora.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-xs font-black text-white">
                  3
                </span>
                <p className="text-sm font-semibold leading-6 text-[#4B5563]">
                  Return to Venora and sign in.
                </p>
              </div>
            </div>
          </div>

          <Suspense fallback={null}>
            <ResendVerificationForm />
          </Suspense>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563EB]/25"
            >
              Go to login
            </Link>

            <Link
              href="/register"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#111827] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
            >
              Try again
            </Link>
          </div>

          <p className="mt-6 text-xs font-medium leading-6 text-[#6B7280]">
            Didn&apos;t get it? Check your spam folder, or return to the
            registration page to use a different email address.
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#6B7280] transition hover:text-[#2563EB]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}

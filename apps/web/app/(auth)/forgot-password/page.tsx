"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, Sparkles, KeyRound } from "lucide-react";
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
          email: ["Unable to send reset link. Please check your connection and try again."],
        });
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC] px-[16px] py-[48px]">
      <div className="w-full max-w-[420px] rounded-[12px] border border-[#E2E8F0] bg-white p-[32px] shadow-sm">
        {/* Header Branding */}
        <div className="mb-[28px] flex flex-col items-center text-center">
          <Link
            href="/"
            className="mb-[16px] flex items-center gap-[6px] text-[20px] font-extrabold tracking-tight text-[#E07A5F]"
          >
            Venora
            <Sparkles className="h-[16px] w-[16px] fill-[#E07A5F] text-[#E07A5F]" />
          </Link>

          <div className="mb-[14px] flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#FFF4F1] text-[#E07A5F]">
            <KeyRound className="h-[22px] w-[22px]" />
          </div>

          <h1 className="text-[26px] font-black tracking-[-0.03em] text-slate-950">
            Forgot Password?
          </h1>
          <p className="mt-[6px] text-[14px] font-medium leading-[20px] text-slate-500">
            Enter your email to receive a password reset link.
          </p>
        </div>

        {success ? (
          <div
            role="status"
            className="rounded-[6px] border border-[#F0A090] bg-[#FFF4F1] p-[16px] text-center text-[14px] font-semibold leading-[20px] text-[#E07A5F]"
          >
            If that email is registered, a password reset link has been sent to it. Please check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
            {/* Email Input */}
            <div className="flex flex-col gap-[6px]">
              <label
                htmlFor="forgot-email"
                className="text-[12px] font-bold uppercase leading-[16px] tracking-[0.08em] text-slate-950"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-[14px] top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#55423E]" />
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isPending}
                  className={`h-[46px] w-full rounded-[6px] border bg-white !pl-[42px] pr-[16px] text-[16px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#E07A5F] focus:ring-4 focus:ring-[#E07A5F]/10 disabled:cursor-not-allowed disabled:opacity-60 ${
                    fieldErrors.email ? "border-red-500" : "border-[#E2E8F0]"
                  }`}
                />
              </div>

              {fieldErrors.email?.[0] && (
                <p className="text-[13px] font-medium text-red-600">
                  {fieldErrors.email[0]}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="forgot-submit-btn"
              type="submit"
              disabled={isPending}
              className="mt-[4px] h-[46px] w-full rounded-[6px] bg-[#E07A5F] text-[15px] font-extrabold text-white transition hover:bg-[#9A442D] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-[24px] text-center text-[14px] font-medium text-[#55423E]">
          <Link
            href="/login"
            className="font-bold text-[#E07A5F] transition hover:text-[#9A442D] hover:underline"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

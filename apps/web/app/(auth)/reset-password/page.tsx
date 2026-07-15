"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { LockKeyhole, Sparkles, KeyRound } from "lucide-react";
import { resetPasswordAction } from "@/features/auth/actions/auth.actions";
import { resetPasswordSchema } from "@/features/auth/schemas/auth.schema";
import { createClient } from "@/lib/supabase/client";
import { PasswordRequirements } from "@/features/auth/ui/password-requirements";

// --- Invalid / Expired Link view ----------------------------------------------

function ExpiredLinkView() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC] px-[16px] py-[48px]">
      <div className="w-full max-w-[420px] rounded-[12px] border border-[#E2E8F0] bg-white p-[32px] shadow-sm text-center">
        {/* Logo */}
        <Link
          href="/"
          className="mb-[16px] flex items-center justify-center gap-[6px] text-[20px] font-extrabold tracking-tight text-[#2563EB]"
        >
          Venora
          <Sparkles className="h-[16px] w-[16px] fill-[#2563EB] text-[#2563EB]" />
        </Link>

        <div className="mb-[14px] mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-full bg-red-50 text-red-500">
          <KeyRound className="h-[22px] w-[22px]" />
        </div>

        <h1 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
          Link invalid or expired
        </h1>

        <p className="mt-[8px] text-[14px] font-medium leading-[22px] text-slate-500 mb-[24px]">
          This password reset link has already been used or has expired. Please
          request a fresh link to reset your password.
        </p>

        <Link
          href="/forgot-password"
          id="request-new-link-btn"
          className="flex h-[46px] w-full items-center justify-center rounded-[6px] bg-[#2563EB] text-[15px] font-extrabold text-white transition hover:bg-[#1D4ED8] shadow-sm"
        >
          Request a new link
        </Link>

        <p className="mt-[20px] text-center text-[14px] font-medium text-[#4B5563]">
          <Link
            href="/login"
            className="font-bold text-[#2563EB] transition hover:text-[#1D4ED8] hover:underline"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// --- Reset Password form -------------------------------------------------------

export default function ResetPasswordPage() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Check for a valid recovery session on mount.
  // Supabase exchanges the reset token for a session via the /auth/callback route.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setSessionChecked(true);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await resetPasswordAction({ password, confirmPassword });
      if (response && !response.success) {
        setGeneralError(response.error);
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
      }
    });
  };

  // Show a clean modern spinner while we verify the session
  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC]">
        <div className="h-[32px] w-[32px] animate-spin rounded-full border-[3px] border-slate-200 border-t-[#2563EB]" />
      </div>
    );
  }

  if (!hasSession) {
    return <ExpiredLinkView />;
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC] px-[16px] py-[48px]">
      <div className="w-full max-w-[420px] rounded-[12px] border border-[#E2E8F0] bg-white p-[32px] shadow-sm">
        {/* Header */}
        <div className="mb-[28px] flex flex-col items-center text-center">
          <Link
            href="/"
            className="mb-[16px] flex items-center gap-[6px] text-[20px] font-extrabold tracking-tight text-[#2563EB]"
          >
            Venora
            <Sparkles className="h-[16px] w-[16px] fill-[#2563EB] text-[#2563EB]" />
          </Link>

          <div className="mb-[14px] flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
            <LockKeyhole className="h-[22px] w-[22px]" />
          </div>

          <h1 className="text-[26px] font-black tracking-[-0.03em] text-slate-950">
            Set New Password
          </h1>
          <p className="mt-[6px] text-[14px] font-medium leading-[20px] text-slate-500">
            Enter your new secure password below.
          </p>
        </div>

        {generalError && (
          <div
            role="alert"
            className="mb-[18px] rounded-[6px] border border-red-200 bg-red-50 p-[12px] text-[14px] font-semibold text-red-600"
          >
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
          {/* New Password */}
          <div className="flex flex-col gap-[6px]">
            <label
              htmlFor="new-password"
              className="text-[12px] font-bold leading-[16px] text-slate-950"
            >
              New password
            </label>

            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-[14px] top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#4B5563]" />
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password"
                autoComplete="new-password"
                disabled={isPending}
                className={`h-[46px] w-full rounded-[6px] border bg-white !pl-[42px] pr-[16px] text-[16px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 disabled:cursor-not-allowed disabled:opacity-60 ${
                  fieldErrors.password ? "border-red-500" : "border-[#E2E8F0]"
                }`}
              />
            </div>

            {fieldErrors.password?.[0] ? (
              <p className="text-[13px] font-medium text-red-600">
                {fieldErrors.password[0]}
              </p>
            ) : null}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-[6px]">
            <label
              htmlFor="confirm-new-password"
              className="text-[12px] font-bold leading-[16px] text-slate-950"
            >
              Confirm new password
            </label>

            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-[14px] top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#4B5563]" />
              <input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                disabled={isPending}
                className={`h-[46px] w-full rounded-[6px] border bg-white !pl-[42px] pr-[16px] text-[16px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 disabled:cursor-not-allowed disabled:opacity-60 ${
                  fieldErrors.confirmPassword
                    ? "border-red-500"
                    : "border-[#E2E8F0]"
                }`}
              />
            </div>

            {fieldErrors.confirmPassword?.[0] && (
              <p className="text-[13px] font-medium text-red-600">
                {fieldErrors.confirmPassword[0]}
              </p>
            )}
          </div>

          <div className="mb-[8px]">
            <PasswordRequirements
              password={password}
              confirmPassword={confirmPassword}
            />
          </div>

          {/* Submit Button */}
          <button
            id="reset-submit-btn"
            type="submit"
            disabled={isPending}
            className="mt-[8px] h-[46px] w-full rounded-[6px] bg-[#2563EB] text-[15px] font-extrabold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Setting Password..." : "Update Password"}
          </button>
        </form>

        <p className="mt-[24px] text-center text-[14px] font-medium text-[#4B5563]">
          <Link
            href="/login"
            className="font-bold text-[#2563EB] transition hover:text-[#1D4ED8] hover:underline"
          >
            Cancel and return to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

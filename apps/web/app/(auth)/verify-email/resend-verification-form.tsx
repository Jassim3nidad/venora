"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { resendVerificationEmailAction } from "@/features/auth/actions/auth.actions";

export function ResendVerificationForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const resendAvailable = searchParams.get("resend") === "available";

  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState(
    resendAvailable
      ? "That email is already registered but still needs verification."
      : "",
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    startTransition(async () => {
      const response = await resendVerificationEmailAction({ email });

      if (response.success) {
        setMessage("We sent a fresh verification link. Please check your inbox.");
        return;
      }

      setError(response.error);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-3xl border border-[#DBEAFE] bg-[#EFF6FF] p-4 text-left"
    >
      <label
        htmlFor="resend-verification-email"
        className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#1D4ED8]"
      >
        Resend verification email
      </label>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            id="resend-verification-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isPending}
            className="h-12 w-full rounded-2xl border border-[#BFDBFE] bg-white pl-11 pr-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="h-12 rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563EB]/25 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Sending..." : "Resend"}
        </button>
      </div>

      {message ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-[#1D4ED8]">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}

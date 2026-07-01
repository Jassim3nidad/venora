"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarCheck,
  Check,
  ClipboardCheck,
  DraftingCompass,
  LockKeyhole,
  Mail,
  Truck,
  User,
} from "lucide-react";
import {
  registerAction,
  signInWithOAuthAction,
} from "@/features/auth/actions/auth.actions";
import { registerSchema } from "@/features/auth/schemas/auth.schema";

const ROLES = [
  { value: "customer", label: "Book a Venue", icon: CalendarCheck },
  { value: "venue_owner", label: "Venue Owner", icon: Building2 },
  { value: "supplier", label: "Supplier", icon: Truck },
  { value: "event_coordinator", label: "Coordinator", icon: ClipboardCheck },
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<string>("customer");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const result = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
      role,
    });

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await registerAction({
        fullName,
        email,
        password,
        confirmPassword,
        role,
      });

      if (response && !response.success) {
        setGeneralError(response.error || "Unable to create account.");
        if (response.fieldErrors) setFieldErrors(response.fieldErrors);
      }
    });
  };

  return (
    <main className="flex min-h-screen w-full overflow-hidden bg-white">
      {/* Left Branding Panel */}
      <section className="relative hidden min-h-screen w-1/2 overflow-hidden bg-[#0F172A] lg:flex">
        <div className="absolute inset-0 opacity-[0.18]">
          <div className="absolute left-[18%] top-[10%] h-[360px] w-[260px] rounded-[28px] border border-white/10 bg-white/5 shadow-2xl" />
          <div className="absolute bottom-[10%] right-[12%] h-[340px] w-[260px] rounded-[28px] border border-white/10 bg-white/5 shadow-2xl" />
          <div className="absolute left-[42%] top-[13%] h-[220px] w-[220px] rotate-45 bg-white/5" />
          <div className="absolute bottom-[20%] right-[24%] h-[220px] w-[220px] rotate-45 bg-white/5" />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-[#0F172A]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,rgba(255,255,255,0.10),transparent_35%)]" />

        <div className="relative z-10 mx-auto flex w-full max-w-[560px] translate-x-[40px] flex-col justify-center px-[64px]">
          <div className="mb-[58px] flex items-center gap-[12px]">
            <DraftingCompass className="h-[32px] w-[32px] text-[#F4C7B8]" />
            <span className="text-[24px] font-extrabold leading-[32px] tracking-[-0.02em] text-white">
              Venora
            </span>
          </div>

          <div>
            <h1 className="max-w-[560px] text-[50px] font-bold leading-[65px] tracking-[-0.05em] text-white">
              Where Extraordinary Events Begin.
            </h1>

            <ul className="mt-[54px] flex translate-y-[20px] flex-col gap-[24px]">
              {[
                "Curated, high-quality spaces.",
                "Transparent, upfront pricing.",
                "Seamless booking management.",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-[18px] text-white"
                >
                  <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#FFDACE]">
                    <Check
                      className="h-[14px] w-[14px] text-[#0F172A]"
                      strokeWidth={3}
                    />
                  </span>
                  <span className="text-[18px] leading-[28px]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Register Form */}
      <section className="flex min-h-screen w-full items-center justify-center overflow-y-auto bg-white px-[24px] py-[20px] lg:w-1/2 lg:px-[64px]">
        <div className="w-full max-w-[400px]">
          <div className="mb-[18px] text-center">
            <h2 className="mb-[4px] text-[28px] font-semibold leading-[36px] tracking-[-0.01em] text-[#191C1E]">
              Create your Venora account
            </h2>
            <p className="text-[15px] font-normal leading-[22px] text-[#55423E]">
              Enter your details to get started.
            </p>
          </div>

          {generalError ? (
            <div
              role="alert"
              className="mb-[12px] rounded-[8px] border border-red-200 bg-red-50 px-[14px] py-[10px] text-[14px] font-medium text-red-700"
            >
              {generalError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-[10px]">
            {/* Full Name */}
            <div className="flex flex-col gap-[4px]">
              <label
                htmlFor="fullName"
                className="!pl-[2px] text-[11px] font-bold uppercase leading-[16px] tracking-[0.08em] text-[#191C1E]"
              >
                Full Name
              </label>

              <div className="relative">
                <User className="pointer-events-none absolute left-[10px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#55423E]" />

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  disabled={isPending}
                  className={`h-[42px] w-full rounded-[6px] border bg-white !pl-[40px] pr-[16px] text-[15px] font-normal leading-[22px] text-[#191C1E] outline-none transition-shadow placeholder:text-[#55423E]/60 focus:border-[#E07A5F] focus:ring-2 focus:ring-[#E07A5F]/10 disabled:cursor-not-allowed disabled:opacity-60 ${
                    fieldErrors.fullName
                      ? "border-red-500"
                      : "border-[#E2E8F0]"
                  }`}
                />
              </div>

              {fieldErrors.fullName?.[0] ? (
                <p className="text-[13px] font-medium text-red-600">
                  {fieldErrors.fullName[0]}
                </p>
              ) : null}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-[4px]">
              <label
                htmlFor="email"
                className="!pl-[2px] text-[11px] font-bold uppercase leading-[16px] tracking-[0.08em] text-[#191C1E]"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-[10px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#55423E]" />

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  autoComplete="email"
                  disabled={isPending}
                  className={`h-[42px] w-full rounded-[6px] border bg-white !pl-[40px] pr-[16px] text-[15px] font-normal leading-[22px] text-[#191C1E] outline-none transition-shadow placeholder:text-[#55423E]/60 focus:border-[#E07A5F] focus:ring-2 focus:ring-[#E07A5F]/10 disabled:cursor-not-allowed disabled:opacity-60 ${
                    fieldErrors.email ? "border-red-500" : "border-[#E2E8F0]"
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
            <div className="flex flex-col gap-[4px]">
              <label
                htmlFor="password"
                className="!pl-[2px] text-[11px] font-bold uppercase leading-[16px] tracking-[0.08em] text-[#191C1E]"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-[10px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#55423E]" />

                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isPending}
                  className={`h-[42px] w-full rounded-[6px] border bg-white !pl-[40px] pr-[16px] text-[15px] font-normal leading-[22px] text-[#191C1E] outline-none transition-shadow placeholder:text-[#55423E]/60 focus:border-[#E07A5F] focus:ring-2 focus:ring-[#E07A5F]/10 disabled:cursor-not-allowed disabled:opacity-60 ${
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
                <p className="mt-[2px] text-[13px] font-normal leading-[18px] text-[#55423E]">
                  Must be at least 8 characters.
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-[4px]">
              <label
                htmlFor="confirmPassword"
                className="!pl-[2px] text-[11px] font-bold uppercase leading-[16px] tracking-[0.08em] text-[#191C1E]"
              >
                Confirm Password
              </label>

              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-[10px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#55423E]" />

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isPending}
                  className={`h-[42px] w-full rounded-[6px] border bg-white !pl-[40px] pr-[16px] text-[15px] font-normal leading-[22px] text-[#191C1E] outline-none transition-shadow placeholder:text-[#55423E]/60 focus:border-[#E07A5F] focus:ring-2 focus:ring-[#E07A5F]/10 disabled:cursor-not-allowed disabled:opacity-60 ${
                    fieldErrors.confirmPassword
                      ? "border-red-500"
                      : "border-[#E2E8F0]"
                  }`}
                />
              </div>

              {fieldErrors.confirmPassword?.[0] ? (
                <p className="text-[13px] font-medium text-red-600">
                  {fieldErrors.confirmPassword[0]}
                </p>
              ) : null}
            </div>

            {/* Account Type */}
            <fieldset className="border-0 p-0">
              <legend className="mb-[8px] text-[11px] font-bold uppercase leading-[16px] tracking-[0.08em] text-[#191C1E]">
                Account Type
              </legend>

              <div className="grid grid-cols-2 gap-[10px]">
                {ROLES.map((roleOption) => {
                  const isSelected = role === roleOption.value;
                  const Icon = roleOption.icon;

                  return (
                    <label
                      key={roleOption.value}
                      htmlFor={`role-${roleOption.value}`}
                      className={`flex h-[60px] cursor-pointer flex-col items-center justify-center rounded-[8px] border transition-all ${
                        isSelected
                          ? "border-[#E07A5F] bg-[#FFF4F0]"
                          : "border-[#E2E8F0] bg-white hover:border-[#E07A5F]/60"
                      }`}
                    >
                      <input
                        id={`role-${roleOption.value}`}
                        type="radio"
                        name="role"
                        value={roleOption.value}
                        checked={isSelected}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={isPending}
                        className="sr-only"
                      />

                      <Icon
                        className={`mb-[8px] h-[22px] w-[22px] ${
                          isSelected ? "text-[#E07A5F]" : "text-[#5B463F]"
                        }`}
                        strokeWidth={2.3}
                      />

                      <span
                        className={`text-center text-[14px] font-bold leading-[18px] ${
                          isSelected ? "text-[#E07A5F]" : "text-[#3F2F2A]"
                        }`}
                      >
                        {roleOption.label}
                      </span>
                    </label>
                  );
                })}
              </div>

              {fieldErrors.role?.[0] ? (
                <p className="mt-[6px] text-[13px] font-medium text-red-600">
                  {fieldErrors.role[0]}
                </p>
              ) : null}
            </fieldset>

            {/* Submit Button */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isPending}
              className="mt-[4px] h-[40px] w-full rounded-[4px] bg-[#E07A5F] text-[14px] font-semibold leading-[20px] text-white transition-colors duration-200 hover:bg-[#9A442D] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Creating Account..." : "Create Account"}
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-[4px]">
              <div className="flex-grow border-t border-[#E2E8F0]" />
              <span className="mx-[16px] flex-shrink-0 text-[14px] font-normal leading-[20px] text-[#55423E]">
                or
              </span>
              <div className="flex-grow border-t border-[#E2E8F0]" />
            </div>

            {/* Google Button */}
            <button
              id="google-register-btn"
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
              className="flex h-[40px] w-full items-center justify-center gap-[8px] rounded-[4px] border border-[#E2E8F0] bg-white text-[14px] font-extrabold leading-[20px] text-[#191C1E] transition-colors duration-200 hover:border-[#88726D] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <svg
                className="h-[16px] w-[16px]"
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
          </form>

          <div className="!mt-[10px] text-center">
            <p className="text-[15px] font-bold leading-[22px] text-[#55423E]">
              Already have an account?{" "}
              <Link
                className="font-bold text-[#E07A5F] hover:underline"
                href="/login"
              >
                Log in.
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
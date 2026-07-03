"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarCheck,
  Check,
  Chrome,
  ClipboardCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
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

const brandPoints = [
  "Discover venues for weddings, parties, and corporate events.",
  "Manage bookings, favorites, and event details in one place.",
  "Create a workspace tailored to your Venora role.",
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<string>("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <main className="flex min-h-screen w-full overflow-hidden bg-[#F9FAFB] text-[#111827]">
      <section className="relative hidden min-h-screen w-1/2 overflow-hidden bg-[#111827] lg:flex">
        <img
          src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80"
          alt="Elegant banquet venue prepared for a premium event."
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
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-white backdrop-blur-md">
              Join the marketplace
            </div>

            <h1 className="text-5xl font-black leading-tight tracking-[-0.05em] text-white xl:text-6xl">
              Create your event workspace.
            </h1>

            <p className="mt-5 max-w-md text-base font-medium leading-7 text-white/82">
              Venora brings customers, venues, suppliers, and coordinators into
              one polished planning experience.
            </p>

            <ul className="mt-9 space-y-4">
              {brandPoints.map((item) => (
                <li key={item} className="flex items-start gap-3 text-white">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="text-base font-semibold leading-6">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className=" -translate-y-20 rounded-[28px] border border-white/20 bg-white/15 p-5 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/70">
              Designed for every role
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/85">
              Choose the account type that matches how you plan, host, supply,
              or coordinate unforgettable events.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen w-full items-center justify-center overflow-y-auto bg-[#F9FAFB] px-4 py-8 sm:px-6 lg:w-1/2 lg:px-12 xl:px-16">
        <div className="w-full max-w-[500px]">
          <div className="mb-6 flex items-center justify-center lg:hidden">
            <Link
              href="/"
              className="text-2xl font-black tracking-[-0.04em] text-[#2563EB]"
            >
              Venora
            </Link>
          </div>

          <div className="rounded-[28px] border border-[#E5E7EB]/80 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="mb-6 text-center">
              <p className="mb-3 inline-flex rounded-full border border-[#E5E7EB] bg-[#EFF6FF] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1D4ED8]">
                Start planning
              </p>
              <h2 className="text-3xl font-black leading-tight tracking-[-0.04em] text-[#111827]">
                Create your Venora account
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280]">
                Enter your details and choose your workspace type.
              </p>
            </div>

            {generalError ? (
              <div
                role="alert"
                className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700"
              >
                {generalError}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="fullName"
                  className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#111827]"
                >
                  Full name
                </label>

                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    disabled={isPending}
                    className={[
                      "h-11 w-full rounded-2xl border bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold text-[#111827] shadow-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
                      fieldErrors.fullName
                        ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : "border-[#E5E7EB] hover:border-[#2563EB]/60 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10",
                    ].join(" ")}
                  />
                </div>

                {fieldErrors.fullName?.[0] ? (
                  <p className="text-xs font-semibold text-red-600">
                    {fieldErrors.fullName[0]}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#111827]"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    autoComplete="email"
                    disabled={isPending}
                    className={[
                      "h-11 w-full rounded-2xl border bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold text-[#111827] shadow-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="password"
                    className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#111827]"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create password"
                      autoComplete="new-password"
                      disabled={isPending}
                      className={[
                        "h-11 w-full rounded-2xl border bg-[#F9FAFB] pl-11 pr-11 text-sm font-semibold text-[#111827] shadow-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
                        fieldErrors.password
                          ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                          : "border-[#E5E7EB] hover:border-[#2563EB]/60 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10",
                      ].join(" ")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#EFF6FF] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
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
                  ) : (
                    <p className="text-xs font-medium text-[#6B7280]">
                      At least 8 characters.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#111827]"
                  >
                    Confirm password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />

                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      disabled={isPending}
                      className={[
                        "h-11 w-full rounded-2xl border bg-[#F9FAFB] pl-11 pr-11 text-sm font-semibold text-[#111827] shadow-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
                        fieldErrors.confirmPassword
                          ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                          : "border-[#E5E7EB] hover:border-[#2563EB]/60 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10",
                      ].join(" ")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#EFF6FF] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {fieldErrors.confirmPassword?.[0] ? (
                    <p className="text-xs font-semibold text-red-600">
                      {fieldErrors.confirmPassword[0]}
                    </p>
                  ) : null}
                </div>
              </div>

              <fieldset className="border-0 p-0">
                <legend className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#111827]">
                  Account type
                </legend>

                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map((roleOption) => {
                    const isSelected = role === roleOption.value;
                    const Icon = roleOption.icon;

                    return (
                      <label
                        key={roleOption.value}
                        htmlFor={`role-${roleOption.value}`}
                        className={[
                          "flex min-h-[78px] cursor-pointer flex-col items-center justify-center rounded-2xl border px-3 py-3 text-center shadow-sm transition-all",
                          isSelected
                            ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] shadow-[#2563EB]/10"
                            : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#2563EB]/60 hover:bg-[#F9FAFB] hover:text-[#1D4ED8]",
                        ].join(" ")}
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

                        <Icon className="mb-2 h-5 w-5" strokeWidth={2.3} />

                        <span className="text-xs font-extrabold leading-4">
                          {roleOption.label}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {fieldErrors.role?.[0] ? (
                  <p className="mt-2 text-xs font-semibold text-red-600">
                    {fieldErrors.role[0]}
                  </p>
                ) : null}
              </fieldset>

              <button
                id="register-submit-btn"
                type="submit"
                disabled={isPending}
                className="h-12 w-full rounded-2xl bg-[#2563EB] text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563EB]/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Creating account..." : "Create account"}
              </button>

              <div className="relative flex items-center py-1">
                <div className="h-px flex-grow bg-[#E5E7EB]" />
                <span className="mx-4 flex-shrink-0 text-sm font-semibold text-[#6B7280]">
                  or
                </span>
                <div className="h-px flex-grow bg-[#E5E7EB]" />
              </div>

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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white text-sm font-extrabold text-[#111827] shadow-sm transition hover:border-[#2563EB]/60 hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Chrome className="h-4 w-4 text-[#2563EB]" />
                Continue with Google
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm font-semibold leading-6 text-[#6B7280]">
              Already have an account?{" "}
              <Link
                className="font-extrabold text-[#2563EB] transition hover:text-[#1D4ED8]"
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

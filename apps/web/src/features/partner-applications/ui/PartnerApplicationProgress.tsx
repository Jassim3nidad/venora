import Link from "next/link";
import { AlertCircle, CheckCircle2, Circle, Clock3, Minus } from "lucide-react";
import {
  getPartnerApplicationProgressSteps,
  getPartnerRoleLabel,
  PARTNER_DASHBOARD_ROUTES,
  type UserPartnerApplication,
} from "../constants/application-progress";

type PartnerApplicationProgressProps = {
  application: UserPartnerApplication;
};

function StepIcon({ state }: { state: string }) {
  if (state === "complete") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-5 w-5" />
      </div>
    );
  }

  if (state === "current") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25">
        <Clock3 className="h-5 w-5" />
      </div>
    );
  }

  if (state === "declined") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertCircle className="h-5 w-5" />
      </div>
    );
  }

  if (state === "skipped") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-300">
        <Minus className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <Circle className="h-4 w-4" />
    </div>
  );
}

function statusBadge(status: UserPartnerApplication["status"]) {
  if (status === "pending") {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
        Under Review
      </span>
    );
  }

  if (status === "approved") {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
        Approved
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
      Declined
    </span>
  );
}

export function PartnerApplicationProgress({
  application,
}: PartnerApplicationProgressProps) {
  const steps = getPartnerApplicationProgressSteps(application);
  const roleLabel = getPartnerRoleLabel(application.role_applied_for);
  const dashboardHref = PARTNER_DASHBOARD_ROUTES[application.role_applied_for];

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Application Status
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {roleLabel} Partner Application
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Submitted{" "}
            {new Date(application.created_at).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            . Check your notifications for updates.
          </p>
        </div>
        {statusBadge(application.status)}
      </div>

      <ol className="grid gap-4 rounded-2xl border border-[#E5E7EB]/80 bg-[#F8FAFC] p-5 sm:grid-cols-4 sm:gap-3 sm:p-6">
        {steps.map((step, index) => (
          <li key={step.id} className="relative flex gap-3 sm:block sm:gap-0">
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute left-[1.125rem] top-9 hidden h-[calc(100%-2.25rem)] w-px bg-slate-200 sm:left-[1.125rem] sm:top-9 sm:block sm:h-px sm:w-[calc(100%-2.25rem)] sm:translate-x-9"
              />
            ) : null}

            <div className="flex items-start gap-3 sm:flex-col sm:items-start">
              <StepIcon state={step.state} />
              <div className="min-w-0 pt-0.5">
                <p
                  className={[
                    "text-sm font-extrabold",
                    step.state === "current"
                      ? "text-[#2563EB]"
                      : step.state === "declined"
                        ? "text-red-700"
                        : step.state === "complete"
                          ? "text-slate-900"
                          : "text-slate-400",
                  ].join(" ")}
                >
                  {step.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {step.description}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {application.status === "approved" ? (
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            Your workspace is ready. Open your partner dashboard to get started.
          </p>
          <Link
            href={dashboardHref}
            className="inline-flex items-center justify-center rounded-full bg-[#2563EB] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#1D4ED8]"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : null}

      {application.status === "pending" ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          We&apos;ll send a notification when your application has been
          reviewed.
        </div>
      ) : null}
    </div>
  );
}

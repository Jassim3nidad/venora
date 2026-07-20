import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import Link from "next/link";

type Tone = "primary" | "secondary" | "danger";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const buttonTones: Record<Tone, string> = {
  primary:
    "bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/20 hover:bg-[#1D4ED8]",
  secondary:
    "border border-[#E5E7EB] bg-white text-[#111827] shadow-sm hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]",
  danger:
    "border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50",
};

export function CustomerCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/60",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CustomerStatusBadge({
  icon: Icon,
  children,
  className,
}: {
  icon?: ElementType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex w-fit items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]",
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

export function CustomerPageHeader({
  eyebrow,
  title,
  description,
  icon,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: ElementType;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <CustomerCard className={cx("p-5 sm:p-7", className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <CustomerStatusBadge {...(icon ? { icon } : {})} className="mb-4">
              {eyebrow}
            </CustomerStatusBadge>
          ) : null}

          <h1 className="max-w-3xl break-words text-3xl font-bold leading-9 tracking-[-0.04em] text-slate-950 sm:text-4xl sm:leading-tight">
            {title}
          </h1>

          {description ? (
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#6B7280] sm:text-base">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </CustomerCard>
  );
}

export function CustomerButton({
  tone = "primary",
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"button"> & { tone?: Tone }) {
  return (
    <button
      className={cx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 disabled:cursor-not-allowed disabled:opacity-70",
        buttonTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CustomerLinkButton({
  tone = "primary",
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof Link> & { tone?: Tone }) {
  return (
    <Link
      className={cx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30",
        buttonTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function CustomerEmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
}: {
  icon?: ElementType;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <CustomerCard className="px-6 py-14 text-center sm:px-10">
      {Icon ? (
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}

      {eyebrow ? (
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
          {eyebrow}
        </p>
      ) : null}

      <h2 className="mx-auto mt-2 max-w-xl text-2xl font-bold tracking-[-0.04em] text-[#111827]">
        {title}
      </h2>

      {description ? (
        <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#6B7280]">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </CustomerCard>
  );
}

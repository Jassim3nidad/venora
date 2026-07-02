import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@venora/lib";
import { MaterialIcon } from "./MaterialIcon";

/* ─── Layout ─────────────────────────────────────────────────────────────── */

export function DashboardPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1320px] space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardSubPage({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <DashboardPage>
      <PageHeader title={title} description={description} actions={action} />
      {children}
    </DashboardPage>
  );
}

/* ─── Headers ────────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  eyebrow?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a442d]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[#191c1e] sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#565e74] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/* ─── Cards & panels ─────────────────────────────────────────────────────── */

export function Panel({
  children,
  className,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#e8deda] bg-white shadow-[0_1px_2px_rgba(25,28,30,0.04)]",
        padding && "p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-[#f0ebe8] pb-5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>
        <h2 className="font-display text-lg font-semibold text-[#191c1e]">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-[#565e74]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  trend,
  trendMuted,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  trend?: string;
  trendMuted?: boolean;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <Panel className="p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#565e74]">
          {label}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fdf4f1] text-[#9a442d]">
          <MaterialIcon name={icon} className="text-[20px]" />
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn(
            "font-display text-3xl font-bold tracking-tight sm:text-4xl",
            accent ? "text-[#9a442d]" : "text-[#191c1e]",
          )}
        >
          {value}
        </span>
        {suffix ? (
          <span className="text-sm text-[#565e74]">{suffix}</span>
        ) : trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold",
              trendMuted
                ? "bg-[#f2f4f6] text-[#5c647a]"
                : "bg-emerald-50 text-emerald-700",
            )}
          >
            {!trendMuted ? (
              <MaterialIcon name="trending_up" className="text-sm" />
            ) : null}
            {trend}
          </span>
        ) : null}
      </div>
    </Panel>
  );
}

/* ─── Tables ─────────────────────────────────────────────────────────────── */

export function DataTable({
  columns,
  children,
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="-mx-6 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-[#f0ebe8] bg-[#fafbfc]">
            {columns.map((col) => (
              <th
                key={col}
                className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#565e74]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0ebe8]">{children}</tbody>
      </table>
    </div>
  );
}

export function TableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("transition-colors hover:bg-[#fafbfc]", className)}>
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-6 py-4 align-middle text-sm text-[#191c1e]", className)}>
      {children}
    </td>
  );
}

/* ─── Badges & buttons ───────────────────────────────────────────────────── */

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/60",
  confirmed: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60",
  approved: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60",
  declined: "bg-red-50 text-red-800 ring-1 ring-red-200/60",
  cancelled: "bg-red-50 text-red-800 ring-1 ring-red-200/60",
  completed: "bg-blue-50 text-blue-800 ring-1 ring-blue-200/60",
  default: "bg-[#fdf4f1] text-[#9a442d] ring-1 ring-[#e8deda]",
} as const;

export function StatusBadge({
  status,
  label,
}: {
  status?: keyof typeof STATUS_STYLES | string;
  label?: string;
}) {
  const key = (status?.toLowerCase() ?? "default") as keyof typeof STATUS_STYLES;
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.default;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        style,
      )}
    >
      {label ?? status}
    </span>
  );
}

export function DashButton({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
        variant === "primary" &&
          "bg-[#9a442d] text-white shadow-sm hover:bg-[#7c351f]",
        variant === "secondary" &&
          "border border-[#e8deda] bg-white text-[#191c1e] hover:border-[#9a442d]/30 hover:bg-[#fdf4f1]",
        variant === "ghost" &&
          "text-[#565e74] hover:bg-[#f2f4f6] hover:text-[#9a442d]",
        variant === "danger" &&
          "border border-[#e8deda] text-[#565e74] hover:border-red-200 hover:bg-red-50 hover:text-red-700",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DashLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-semibold text-[#9a442d] transition hover:text-[#7c351f] hover:underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function IconButton({
  icon,
  label,
  className,
}: {
  icon: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label ?? icon}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl border border-[#e8deda] bg-white text-[#565e74] transition hover:border-[#9a442d]/20 hover:bg-[#fdf4f1] hover:text-[#9a442d]",
        className,
      )}
    >
      <MaterialIcon name={icon} className="text-[20px]" />
    </button>
  );
}

export function AvatarChip({
  initials,
  color,
}: {
  initials: string;
  color?: string | undefined;
}) {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#191c1e]"
      style={{ background: color ?? "#dae2fd" }}
    >
      {initials}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Panel className="py-12 text-center">
      <p className="font-display text-lg font-semibold text-[#191c1e]">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-[#565e74]">{description}</p>
      ) : null}
    </Panel>
  );
}

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[#f0ebe8]", className)}>
      <div
        className="h-full rounded-full bg-[#9a442d] transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#e8deda] bg-white p-3">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#565e74]">
        {label}
      </span>
      <span className="font-display text-xl font-semibold text-[#191c1e]">{value}</span>
    </div>
  );
}

export function ChartBars({
  values,
  highlightIndex,
}: {
  values: number[];
  highlightIndex?: number;
}) {
  return (
    <div className="flex h-32 items-end justify-between gap-1.5 px-1">
      {values.map((h, i) => (
        <div
          key={i}
          className={cn(
            "min-h-[4px] flex-1 rounded-t-md transition-colors",
            i === highlightIndex ? "bg-[#9a442d]" : "bg-[#9a442d]/20",
          )}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function Toast({
  show,
  message,
}: {
  show: boolean;
  message: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-6 right-6 z-[100] flex translate-y-24 items-center gap-3 rounded-2xl bg-[#2d3133] px-5 py-3.5 text-sm text-white shadow-xl transition-transform duration-300",
        show && "translate-y-0",
      )}
    >
      <MaterialIcon name="check_circle" className="text-green-400" />
      {message}
    </div>
  );
}

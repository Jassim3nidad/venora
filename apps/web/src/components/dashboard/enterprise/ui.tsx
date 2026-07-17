import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@venora/lib";
import { MaterialIcon } from "./MaterialIcon";

/* --- Layout --------------------------------------------------------------- */

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
        "mx-auto w-full max-w-[1320px] space-y-7 px-4 py-5 sm:px-6 lg:px-8 lg:py-7",
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
      <PageHeader
        title={title}
        {...(description ? { description } : {})}
        {...(action ? { action } : {})}
      />
      {children}
    </DashboardPage>
  );
}

export function PageHeader({
  title,
  description,
  action,
  badge,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  badge?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#dbeafe] bg-gradient-to-br from-white via-[#f8fbff] to-[#eff6ff] p-5 shadow-sm shadow-slate-200/70 sm:p-6">
      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-[#bfdbfe]/30 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {badge ? (
            <span className="mb-3 inline-flex rounded-full border border-[#bfdbfe] bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1d4ed8] shadow-sm">
              {badge}
            </span>
          ) : null}
          <h1 className="font-display text-2xl font-black tracking-tight text-[#0f172a] sm:text-[2rem] sm:leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#475569]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 sm:pt-1">{action}</div> : null}
      </div>
    </div>
  );
}

/* --- Panels & Cards ------------------------------------------------------- */

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
        "rounded-[24px] border border-[#e5e7eb] bg-white shadow-sm shadow-slate-200/60",
        padding && "p-5 sm:p-6",
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
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-display text-lg font-black tracking-tight text-[#0f172a]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#64748b]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  change,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  change?: string | undefined;
  icon?: string | undefined;
  highlight?: boolean | undefined;
}) {
  return (
    <Panel className="flex min-h-[150px] flex-col gap-4 transition hover:-translate-y-0.5 hover:border-[#bfdbfe] hover:shadow-md hover:shadow-blue-100/60">
      <div className="flex items-start justify-between">
        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#dbeafe]">
            <MaterialIcon name={icon} className="text-xl" />
          </div>
        ) : null}
        {change ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
            {change}
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
          {label}
        </p>
        <p
          className={cn(
            "font-display mt-2 text-3xl font-black tracking-tight",
            highlight ? "text-[#1d4ed8]" : "text-[#111827]",
          )}
        >
          {value}
        </p>
      </div>
    </Panel>
  );
}

/* --- Table ---------------------------------------------------------------- */

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  keyFn,
  emptyMessage = "No records found.",
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyFn: (row: T) => string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-6 py-12 text-center text-sm font-medium text-[#64748b]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#e5e7eb] bg-white">
      <div
        className="overflow-x-auto"
        role="region"
        aria-label="Table data, scroll horizontally to see more columns"
        tabIndex={0}
      >
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead className="bg-[#f8fafc]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-xs font-black uppercase tracking-wider text-[#2563eb]",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={keyFn(row)}
                className="border-t border-[#e5e7eb] bg-white transition hover:bg-[#f8fbff]"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-4 text-sm text-[#475569]",
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- Badges & Buttons ----------------------------------------------------- */

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/60",
  approved: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60",
  payment_pending: "bg-orange-50 text-orange-800 ring-1 ring-orange-200/60",
  confirmed: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60",
  declined: "bg-red-50 text-red-800 ring-1 ring-red-200/60",
  cancelled: "bg-gray-50 text-gray-700 ring-1 ring-gray-200/60",
  completed: "bg-blue-50 text-blue-800 ring-1 ring-blue-200/60",
  reviewed: "bg-teal-50 text-teal-800 ring-1 ring-teal-200/60",
  expired: "bg-gray-50 text-gray-600 ring-1 ring-gray-200/60",
  new: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/60",
  responded: "bg-blue-50 text-blue-800 ring-1 ring-blue-200/60",
  closed: "bg-slate-50 text-slate-700 ring-1 ring-slate-200/60",
  draft: "bg-slate-50 text-slate-700 ring-1 ring-slate-200/60",
  sent: "bg-blue-50 text-blue-800 ring-1 ring-blue-200/60",
  accepted: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60",
  withdrawn: "bg-gray-50 text-gray-600 ring-1 ring-gray-200/60",
  blocked: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  unavailable: "bg-red-50 text-red-800 ring-1 ring-red-200/60",
  active: "bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#e5e7eb]",
  suspended: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/60",
  revoked: "bg-red-50 text-red-800 ring-1 ring-red-200/60",
  inactive: "bg-slate-50 text-slate-600 ring-1 ring-slate-200/70",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const normalized = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize",
        STATUS_STYLES[normalized] ?? STATUS_STYLES.active,
      )}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

type DashButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function DashButton({
  children,
  variant = "primary",
  className,
  icon,
  href,
  ...props
}: {
  children: ReactNode;
  variant?: DashButtonVariant;
  className?: string;
  icon?: string;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-[#dbeafe]",
    variant === "primary" &&
      "bg-[#1d4ed8] text-white shadow-sm shadow-blue-200/70 hover:bg-[#1e40af] disabled:opacity-60",
    variant === "secondary" &&
      "border border-[#dbe3ef] bg-white text-[#0f172a] shadow-sm shadow-slate-200/60 hover:border-[#93c5fd] hover:text-[#1d4ed8]",
    variant === "ghost" &&
      "text-[#4b5563] hover:bg-[#eff6ff] hover:text-[#1d4ed8]",
    variant === "danger" &&
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    className,
  );

  const content = (
    <>
      {icon ? <MaterialIcon name={icon} className="text-lg" /> : null}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={styles}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={styles} {...props}>
      {content}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="flex flex-col items-center border-dashed bg-gradient-to-br from-white to-[#f8fbff] py-12 text-center">
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#dbeafe]">
          <MaterialIcon name={icon} className="text-3xl" />
        </div>
      ) : null}
      <h3 className="font-display text-lg font-black text-[#0f172a]">
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[#64748b]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Panel>
  );
}

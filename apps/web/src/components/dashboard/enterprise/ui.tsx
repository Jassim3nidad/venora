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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {badge ? (
          <span className="mb-2 inline-flex rounded-full bg-[#fff4f0] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#9a442d]">
            {badge}
          </span>
        ) : null}
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#191c1e] sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#55423e] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ─── Panels & Cards ─────────────────────────────────────────────────────── */

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
        "rounded-2xl border border-[#e8deda] bg-white shadow-sm",
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
        <h2 className="font-display text-lg font-bold text-[#191c1e]">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-[#55423e]">{description}</p>
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
  change?: string;
  icon?: string;
  highlight?: boolean;
}) {
  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4f0] text-[#9a442d]">
            <MaterialIcon name={icon} className="text-xl" />
          </div>
        ) : null}
        {change ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            {change}
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#88726d]">
          {label}
        </p>
        <p
          className={cn(
            "font-display mt-1 text-3xl font-bold",
            highlight ? "text-[#9a442d]" : "text-[#191c1e]",
          )}
        >
          {value}
        </p>
      </div>
    </Panel>
  );
}

/* ─── Table ──────────────────────────────────────────────────────────────── */

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
      <div className="rounded-xl border border-dashed border-[#e8deda] px-6 py-12 text-center text-sm text-[#55423e]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e8deda]">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead className="bg-[#fff4f0]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#9a442d]",
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
            <tr key={keyFn(row)} className="border-t border-[#e8deda] bg-white">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn("px-4 py-3.5 text-sm text-[#55423e]", col.className)}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Badges & Buttons ───────────────────────────────────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/60",
  approved: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60",
  confirmed: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60",
  declined: "bg-red-50 text-red-800 ring-1 ring-red-200/60",
  cancelled: "bg-gray-50 text-gray-700 ring-1 ring-gray-200/60",
  completed: "bg-blue-50 text-blue-800 ring-1 ring-blue-200/60",
  expired: "bg-gray-50 text-gray-600 ring-1 ring-gray-200/60",
  active: "bg-[#fff4f0] text-[#9a442d] ring-1 ring-[#e8deda]",
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
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
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
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition",
    variant === "primary" &&
      "bg-[#9a442d] text-white hover:bg-[#7a3624] disabled:opacity-60",
    variant === "secondary" &&
      "border border-[#e8deda] bg-white text-[#191c1e] hover:border-[#9a442d] hover:text-[#9a442d]",
    variant === "ghost" &&
      "text-[#55423e] hover:bg-[#fff4f0] hover:text-[#9a442d]",
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
    <Panel className="flex flex-col items-center py-12 text-center">
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff4f0] text-[#9a442d]">
          <MaterialIcon name={icon} className="text-3xl" />
        </div>
      ) : null}
      <h3 className="font-display text-lg font-bold text-[#191c1e]">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-[#55423e]">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Panel>
  );
}

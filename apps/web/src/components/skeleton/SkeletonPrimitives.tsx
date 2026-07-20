import type { ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx("skeleton bg-slate-100", className)}
    />
  );
}

export function SkeletonBadge({ className }: { className?: string }) {
  return <SkeletonBlock className={cx("h-6 rounded-full", className)} />;
}

export function SkeletonButton({ className }: { className?: string }) {
  return <SkeletonBlock className={cx("h-11 rounded-2xl", className)} />;
}

export function SkeletonTextLines({
  lines = 3,
  widths = ["w-full", "w-11/12", "w-4/5"],
  className,
}: {
  lines?: number;
  widths?: string[];
  className?: string;
}) {
  return (
    <div className={cx("space-y-2.5", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={index}
          className={cx("h-4", widths[index] ?? widths[widths.length - 1])}
        />
      ))}
    </div>
  );
}

export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@venora/lib";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-brand-50 text-brand-700 ring-brand-300/30 dark:bg-brand-950/30 dark:text-brand-300 dark:ring-brand-800/40",
        success:
          "bg-[var(--color-success-bg)] text-[var(--color-success)] ring-[var(--color-success)]/20",
        warning:
          "bg-[var(--color-warning-bg)] text-[var(--color-warning)] ring-[var(--color-warning)]/20",
        destructive:
          "bg-[var(--color-danger-bg)] text-[var(--color-danger)] ring-[var(--color-danger)]/20",
        outline:
          "bg-transparent text-[var(--text-primary)] ring-[var(--border-strong)]",
        secondary:
          "bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-[var(--border-default)]",
        info:
          "bg-[var(--color-info-bg)] text-[var(--color-info)] ring-[var(--color-info)]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

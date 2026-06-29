import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@venora/lib";

const alertVariants = cva(
  "relative w-full rounded-2xl border p-4 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-default)]",
        destructive:
          "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]/20 [&>svg]:text-[var(--color-danger)]",
        success:
          "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/20 [&>svg]:text-[var(--color-success)]",
        warning:
          "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]/20 [&>svg]:text-[var(--color-warning)]",
        info:
          "bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info)]/20 [&>svg]:text-[var(--color-info)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight text-current", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs opacity-90 [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };

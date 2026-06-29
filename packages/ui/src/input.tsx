import * as React from "react";
import { cn } from "@venora/lib";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  error?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, error, label, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <span className="pointer-events-none absolute left-3 flex h-4 w-4 items-center text-[var(--text-muted)]">
              {startIcon}
            </span>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              "flex h-10 w-full rounded-xl border bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]",
              "border-[var(--border-default)] placeholder:text-[var(--text-muted)]",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]",
              startIcon && "pl-9",
              endIcon && "pr-9",
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          {endIcon && (
            <span className="pointer-events-none absolute right-3 flex h-4 w-4 items-center text-[var(--text-muted)]">
              {endIcon}
            </span>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-[var(--color-danger)]"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };

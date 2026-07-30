"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

type Option<T extends string> = {
  value: T;
  label: string;
};

export function FieldError({
  id,
  errors,
}: {
  id: string;
  errors?: string[] | undefined;
}) {
  if (!errors?.[0]) return null;

  return (
    <p id={id} className="mt-2 text-sm font-semibold text-red-600">
      {errors[0]}
    </p>
  );
}

export function TextInput({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  inputMode,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string[] | undefined;
  type?: string | undefined;
  inputMode?: "numeric" | "decimal" | undefined;
  placeholder?: string | undefined;
  autoComplete?: string | undefined;
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-slate-800">
        {label}
      </label>
      <input
        id={id}
        name={id}
        data-field-name={id}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error?.length)}
        aria-describedby={error?.length ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
      <FieldError id={errorId} errors={error} />
    </div>
  );
}

export function SelectInput({
  id,
  label,
  value,
  onChange,
  options,
  error,
  placeholder = "Select an option",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly Option<string>[];
  error?: string[] | undefined;
  placeholder?: string | undefined;
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-slate-800">
        {label}
      </label>
      <select
        id={id}
        name={id}
        data-field-name={id}
        value={value}
        aria-invalid={Boolean(error?.length)}
        aria-describedby={error?.length ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={errorId} errors={error} />
    </div>
  );
}

export function RadioCardGroup<T extends string>({
  legend,
  description,
  name,
  value,
  options,
  onChange,
  error,
  columns = "md:grid-cols-2",
}: {
  legend: string;
  description?: string | undefined;
  name: string;
  value: T | null;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  error?: string[] | undefined;
  columns?: string | undefined;
}) {
  const errorId = `${name}-error`;

  return (
    <fieldset aria-describedby={error?.length ? errorId : undefined}>
      <legend className="text-base font-bold text-slate-950">{legend}</legend>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
      <div className={`mt-4 grid grid-cols-1 gap-3 ${columns}`}>
        {options.map((option) => {
          const checked = value === option.value;
          const id = `${name}-${option.value}`;

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={[
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-bold transition",
                checked
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300",
              ].join(" ")}
            >
              <input
                id={id}
                name={name}
                data-field-name={name}
                type="radio"
                checked={checked}
                value={option.value}
                onChange={() => onChange(option.value)}
                className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-200"
              />
              <span className="flex-1">{option.label}</span>
              {checked ? <Check className="h-4 w-4 shrink-0" /> : null}
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} errors={error} />
    </fieldset>
  );
}

export function CheckboxCardGroup<T extends string>({
  legend,
  description,
  name,
  values,
  options,
  onToggle,
  error,
  columns = "md:grid-cols-2",
}: {
  legend: string;
  description?: string | undefined;
  name: string;
  values: readonly T[];
  options: readonly Option<T>[];
  onToggle: (value: T) => void;
  error?: string[] | undefined;
  columns?: string | undefined;
}) {
  const errorId = `${name}-error`;

  return (
    <fieldset aria-describedby={error?.length ? errorId : undefined}>
      <legend className="text-base font-bold text-slate-950">{legend}</legend>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
      <div className={`mt-4 grid grid-cols-1 gap-3 ${columns}`}>
        {options.map((option) => {
          const checked = values.includes(option.value);
          const id = `${name}-${option.value}`;

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={[
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-bold transition",
                checked
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300",
              ].join(" ")}
            >
              <input
                id={id}
                name={name}
                data-field-name={name}
                type="checkbox"
                checked={checked}
                value={option.value}
                onChange={() => onToggle(option.value)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
              />
              <span className="flex-1">{option.label}</span>
              {checked ? <Check className="h-4 w-4 shrink-0" /> : null}
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} errors={error} />
    </fieldset>
  );
}

export function OptionalGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-slate-200 pt-6">
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

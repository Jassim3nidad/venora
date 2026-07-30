"use client";

import { useEffect, useRef } from "react";

export function StartOverDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      const firstButton = cancelRef.current;
      const lastButton = confirmRef.current;
      if (!firstButton || !lastButton) return;

      if (event.shiftKey && document.activeElement === firstButton) {
        event.preventDefault();
        lastButton.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault();
        firstButton.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-over-title"
        aria-describedby="start-over-description"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg shadow-slate-950/10"
      >
        <h2 id="start-over-title" className="text-xl font-bold text-slate-950">
          Start over?
        </h2>
        <p
          id="start-over-description"
          className="mt-3 text-sm leading-6 text-slate-600"
        >
          This clears the current planning answers stored on this device. It
          will not affect your Venora account.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            Keep planning
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-100"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}

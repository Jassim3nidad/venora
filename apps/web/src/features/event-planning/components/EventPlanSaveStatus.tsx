"use client";

import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react";

export type EventPlanSaveState =
  | "idle"
  | "saving"
  | "saved"
  | "account-saved"
  | "restored"
  | "error";

export function EventPlanSaveStatus({ state }: { state: EventPlanSaveState }) {
  const content =
    state === "saving"
      ? {
          icon: <Clock3 className="h-4 w-4" />,
          text: "Saving on this device...",
          className: "text-slate-600",
        }
      : state === "account-saved"
        ? {
            icon: <CheckCircle2 className="h-4 w-4" />,
            text: "Saved to your Venora account",
            className: "text-emerald-700",
          }
        : state === "error"
        ? {
            icon: <AlertCircle className="h-4 w-4" />,
            text: "Unable to save on this device",
            className: "text-red-600",
          }
        : state === "restored"
          ? {
              icon: <CheckCircle2 className="h-4 w-4" />,
              text: "Planning session restored",
              className: "text-emerald-700",
            }
          : state === "saved"
            ? {
                icon: <CheckCircle2 className="h-4 w-4" />,
                text: "Saved on this device",
                className: "text-emerald-700",
              }
            : {
                icon: <Clock3 className="h-4 w-4" />,
                text: "Answers stay on this device",
                className: "text-slate-600",
              };

  return (
    <p
      aria-live="polite"
      className={`inline-flex items-center gap-2 text-sm font-semibold ${content.className}`}
    >
      {content.icon}
      {content.text}
    </p>
  );
}

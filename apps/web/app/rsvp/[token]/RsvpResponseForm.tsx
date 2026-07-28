"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { respondToGuestRsvpAction } from "@/features/guests/application/rsvp-actions";

type Props = {
  token: string;
  initialStatus: string;
  plusOnesAllowed: number;
  initialPlusOnes: number;
};

export function RsvpResponseForm({
  token,
  initialStatus,
  plusOnesAllowed,
  initialPlusOnes,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [plusOnes, setPlusOnes] = useState(initialPlusOnes);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await respondToGuestRsvpAction({
        token,
        status,
        plusOnes,
      });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setMessage("Your RSVP response has been saved.");
    });
  }

  return (
    <div className="mt-7 space-y-5">
      <fieldset>
        <legend className="text-sm font-bold text-slate-900">
          Will you attend?
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(
            [
              ["attending", "Attending"],
              ["tentative", "Maybe"],
              ["declined", "Cannot attend"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold"
            >
              <input
                type="radio"
                name="rsvp-status"
                value={value}
                checked={status === value}
                onChange={() => setStatus(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {status === "attending" && plusOnesAllowed > 0 ? (
        <label className="block text-sm font-bold text-slate-900">
          Plus-ones attending
          <select
            value={plusOnes}
            onChange={(event) => setPlusOnes(Number(event.target.value))}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
          >
            {Array.from({ length: plusOnesAllowed + 1 }, (_, count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        <CheckCircle2 className="h-4 w-4" />
        {isPending ? "Saving..." : "Save RSVP"}
      </button>

      {message ? (
        <p
          className="text-center text-sm font-semibold text-slate-700"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

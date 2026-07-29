"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { raiseDisputeAction } from "../application/actions";

const CATEGORIES = [
  { value: "refund_request", label: "Refund request" },
  { value: "service_not_rendered", label: "Service not rendered" },
  { value: "damage_claim", label: "Damage claim" },
  { value: "other", label: "Other" },
] as const;

export function RaiseDisputeForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]["value"]>("refund_request");
  const [reason, setReason] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState(["", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await raiseDisputeAction({
            bookingId,
            category,
            reason,
            evidenceUrls: evidenceUrls.map((url) => url.trim()).filter(Boolean),
          });

          if (result.error) {
            setError(result.error.message);
            toast.error(result.error.message);
            return;
          }

          toast.success("Dispute submitted. An admin will review it.");
          setReason("");
          setEvidenceUrls(["", "", ""]);
          router.push("/account/disputes");
          router.refresh();
        });
      }}
    >
      <div>
        <h3 className="text-lg font-black text-[#0f172a]">Raise a dispute</h3>
        <p className="mt-1 text-sm font-semibold text-[#64748b]">
          Use this for refund or service issues that need platform review.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <label className="flex flex-col gap-2 text-sm font-bold text-[#0f172a]">
        Category
        <select
          value={category}
          onChange={(event) =>
            setCategory(
              event.target.value as (typeof CATEGORIES)[number]["value"],
            )
          }
          className="h-11 rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm font-semibold"
        >
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm font-bold text-[#0f172a]">
        Describe the issue
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          minLength={10}
          rows={4}
          className="rounded-xl border border-[#dbe3ef] bg-white p-3 text-sm font-semibold"
          placeholder="What happened, and what outcome are you requesting?"
        />
      </label>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-bold text-[#0f172a]">
          Evidence links (optional)
        </legend>
        <p className="text-xs font-semibold text-[#64748b]">
          Add up to 3 public https links (photos, receipts, docs). File upload
          storage is not required for this case path.
        </p>
        {evidenceUrls.map((url, index) => (
          <label
            key={index}
            className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-[#64748b]"
          >
            Link {index + 1}
            <input
              type="url"
              inputMode="url"
              placeholder="https://"
              value={url}
              onChange={(event) => {
                const next = [...evidenceUrls];
                next[index] = event.target.value;
                setEvidenceUrls(next);
              }}
              className="h-11 rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm font-semibold normal-case text-[#0f172a]"
            />
          </label>
        ))}
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1d4ed8] px-5 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Submitting..." : "Submit dispute"}
      </button>
    </form>
  );
}

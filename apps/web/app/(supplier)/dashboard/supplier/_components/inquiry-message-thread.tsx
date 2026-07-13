"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendSupplierInquiryMessageAction } from "@/features/suppliers/application/dashboard-actions";

type Message = {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

export function InquiryMessageThread({
  inquiryId,
  messages,
  supplierUserId,
}: {
  inquiryId: string;
  messages: Message[];
  supplierUserId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await sendSupplierInquiryMessageAction({ inquiryId, message });
      if (result.error) return setError(result.error.message);
      setMessage("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-[#f8fafc] p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-[#64748b]">No replies yet. Start the conversation below.</p>
        ) : (
          messages.map((item) => {
            const own = item.sender_id === supplierUserId;
            return (
              <div key={item.id} className={own ? "ml-auto max-w-[85%]" : "mr-auto max-w-[85%]"}>
                <div className={own ? "rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm text-white" : "rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#334155]"}>
                  {item.message}
                </div>
                <p className="mt-1 px-1 text-[11px] text-[#94a3b8]">
                  {own ? "You" : "Customer"} · {new Date(item.created_at).toLocaleString("en-PH")}
                </p>
              </div>
            );
          })
        )}
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Reply to this inquiry"
        maxLength={2000}
        rows={4}
        className="w-full rounded-2xl border border-[#dbe3ef] px-4 py-3 text-sm outline-none focus:border-[#60a5fa] focus:ring-4 focus:ring-[#dbeafe]"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : <span />}
        <button
          type="button"
          onClick={submit}
          disabled={isPending || message.trim().length === 0}
          className="min-h-11 rounded-2xl bg-[#1d4ed8] px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Sending..." : "Send reply"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sendSupplierQuoteAction,
  upsertSupplierQuoteAction,
  withdrawSupplierQuoteAction,
} from "@/features/suppliers/application/dashboard-actions";

type Item = { description: string; quantity: number; unitPrice: number };
type InitialQuote = {
  id: string;
  inquiryId: string;
  title: string;
  serviceDescription: string;
  additionalFees: number;
  validUntil: string;
  terms: string;
  status: string;
  items: Item[];
};

export function QuoteEditor({ inquiryId, initial }: { inquiryId: string; initial?: InitialQuote }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.serviceDescription ?? "");
  const [fees, setFees] = useState(initial?.additionalFees ?? 0);
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [terms, setTerms] = useState(initial?.terms ?? "");
  const [items, setItems] = useState<Item[]>(initial?.items ?? [{ description: "", quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const editable = !initial || initial.status === "draft";
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0), [items]);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await upsertSupplierQuoteAction({
        id: initial?.id,
        inquiryId,
        title,
        serviceDescription: description,
        items,
        additionalFees: Number(fees),
        validUntil: validUntil || undefined,
        terms,
      });
      if (result.error) return setError(result.error.message);
      router.push(`/dashboard/supplier/quotes/${result.data?.quoteId}`);
      router.refresh();
    });
  }

  function transition(kind: "send" | "withdraw") {
    if (!initial) return;
    setError(null);
    startTransition(async () => {
      const action = kind === "send" ? sendSupplierQuoteAction : withdrawSupplierQuoteAction;
      const result = await action({ quoteId: initial.id });
      if (result.error) return setError(result.error.message);
      router.refresh();
    });
  }

  const inputClass = "w-full rounded-2xl border border-[#dbe3ef] px-4 py-3 text-sm outline-none focus:border-[#60a5fa] focus:ring-4 focus:ring-[#dbeafe] disabled:bg-[#f8fafc]";
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm font-bold text-[#334155]">Quote title<input className={`${inputClass} mt-2`} value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} /></label>
        <label className="sm:col-span-2 text-sm font-bold text-[#334155]">Service description<textarea className={`${inputClass} mt-2`} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!editable} /></label>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><h3 className="font-black text-[#0f172a]">Line items</h3>{editable ? <button type="button" onClick={() => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }])} className="text-sm font-bold text-[#1d4ed8]">Add item</button> : null}</div>
        {items.map((item, index) => (
          <div key={index} className="grid gap-3 rounded-2xl bg-[#f8fafc] p-4 sm:grid-cols-[minmax(0,1fr)_110px_150px_auto]">
            <input aria-label={`Item ${index + 1} description`} className={inputClass} value={item.description} disabled={!editable} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, description: e.target.value } : row))} placeholder="Service or fee" />
            <input aria-label="Quantity" type="number" min="0.01" step="0.01" className={inputClass} value={item.quantity} disabled={!editable} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, quantity: Number(e.target.value) } : row))} />
            <input aria-label="Unit price" type="number" min="0" step="0.01" className={inputClass} value={item.unitPrice} disabled={!editable} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, unitPrice: Number(e.target.value) } : row))} />
            {editable && items.length > 1 ? <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="px-3 text-sm font-bold text-red-600">Remove</button> : null}
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-[#334155]">Additional fees<input type="number" min="0" className={`${inputClass} mt-2`} value={fees} onChange={(e) => setFees(Number(e.target.value))} disabled={!editable} /></label>
        <label className="text-sm font-bold text-[#334155]">Valid until<input type="date" className={`${inputClass} mt-2`} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} disabled={!editable} /></label>
        <label className="sm:col-span-2 text-sm font-bold text-[#334155]">Terms and notes<textarea className={`${inputClass} mt-2`} rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} disabled={!editable} /></label>
      </div>
      <div className="rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-5 text-right">
        <p className="text-sm text-[#475569]">Subtotal: ₱{subtotal.toLocaleString("en-PH")}</p>
        <p className="mt-1 text-2xl font-black text-[#0f172a]">Total: ₱{(subtotal + Number(fees)).toLocaleString("en-PH")}</p>
      </div>
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
        {editable ? <button type="button" onClick={save} disabled={isPending} className="min-h-11 rounded-2xl border border-[#dbe3ef] bg-white px-5 text-sm font-bold">{isPending ? "Saving..." : "Save draft"}</button> : null}
        {initial?.status === "draft" ? <button type="button" onClick={() => transition("send")} disabled={isPending} className="min-h-11 rounded-2xl bg-[#1d4ed8] px-5 text-sm font-bold text-white">Send quote</button> : null}
        {initial?.status === "sent" ? <button type="button" onClick={() => transition("withdraw")} disabled={isPending} className="min-h-11 rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700">Withdraw quote</button> : null}
      </div>
    </div>
  );
}

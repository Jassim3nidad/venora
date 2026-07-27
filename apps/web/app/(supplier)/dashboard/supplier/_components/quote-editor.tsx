"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Eye, Send, FileText } from "lucide-react";
import {
  sendSupplierQuoteAction,
  upsertSupplierQuoteAction,
  withdrawSupplierQuoteAction,
} from "@/features/suppliers/application/dashboard-actions";
import { Panel, PanelHeader } from "@/components/dashboard/enterprise";
import { CustomerInquiryDetail } from "@/features/suppliers/ui/CustomerInquiryDetail"; // For preview

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

export function QuoteEditor({
  inquiry,
  initial,
}: {
  inquiry: any;
  initial?: InitialQuote;
}) {
  const router = useRouter();
  const serviceName = inquiry?.supplier_services?.name ?? "Service";
  const customerName = inquiry?.contact_name ?? "Customer";
  const eventDateRaw =
    inquiry?.event_date_snapshot ||
    inquiry?.event_date ||
    inquiry?.bookings?.event_date;
  const minValidUntil = eventDateRaw ? eventDateRaw.split("T")[0] : undefined;
  const inquiredService = inquiry?.supplier_services;

  const generatedTitle = `${serviceName} Proposal for ${customerName}`;

  const [title, setTitle] = useState(initial?.title || generatedTitle);
  const [description, setDescription] = useState(
    initial?.serviceDescription ?? "",
  );
  const [fees, setFees] = useState(initial?.additionalFees ?? 0);
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [terms, setTerms] = useState(initial?.terms ?? "");
  const [items, setItems] = useState<Item[]>(
    initial?.items ?? [{ description: "", quantity: 1, unitPrice: 0 }],
  );

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  const editable = !initial || initial.status === "draft";
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
        0,
      ),
    [items],
  );
  const total = subtotal + Number(fees);

  const isFormValid =
    title.trim() !== "" &&
    items.length > 0 &&
    items.every(
      (i) => i.description.trim() !== "" && i.quantity > 0 && i.unitPrice >= 0,
    );

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await upsertSupplierQuoteAction({
        id: initial?.id,
        inquiryId: inquiry.id,
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
      const action =
        kind === "send" ? sendSupplierQuoteAction : withdrawSupplierQuoteAction;
      const result = await action({ quoteId: initial.id });
      if (result.error) return setError(result.error.message);
      setShowSendConfirm(false);
      router.refresh();
    });
  }

  const inputClass =
    "w-full rounded-2xl border border-[#e5e7eb] px-4 py-3 text-sm outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff] disabled:bg-[#f8fafc] disabled:text-[#64748b]";
  const labelClass = "mb-2 block text-sm font-bold text-[#334155]";

  const previewQuote = {
    title,
    service_description: description,
    additional_fees: fees,
    valid_until: validUntil,
    terms,
    subtotal,
    total,
    status: initial?.status ?? "draft",
    supplier_quote_items: items.map((i, idx) => ({
      ...i,
      unit_price: i.unitPrice,
      sort_order: idx,
    })),
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* Left Column: Form Fields */}
      <div className="space-y-6">
        <Panel>
          <PanelHeader title="Proposal Details" />
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Proposal title</label>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!editable}
                placeholder={generatedTitle}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-bold text-[#334155]">
                  Service description
                </label>
                <span className="text-xs font-semibold text-[#94a3b8]">
                  {description.length}/500
                </span>
              </div>
              <textarea
                className={inputClass}
                rows={4}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!editable}
                placeholder="Summarize the service, package, key inclusions, and important details."
              />
            </div>
            <div>
              <label className={labelClass}>Valid until</label>
              <input
                type="date"
                className={inputClass}
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                disabled={!editable}
                min={minValidUntil}
              />
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <PanelHeader title="Line Items" />
            {editable && (
              <div className="flex flex-wrap items-center gap-2">
                {inquiredService && (
                  <button
                    type="button"
                    disabled={items.some(
                      (i) => i.description === inquiredService.name,
                    )}
                    onClick={() => {
                      const newItem = {
                        description: inquiredService.name,
                        quantity: 1,
                        unitPrice: Number(inquiredService.price || 0),
                      };
                      if (
                        items.length === 1 &&
                        items[0]?.description === "" &&
                        items[0]?.unitPrice === 0
                      ) {
                        setItems([newItem]);
                      } else {
                        setItems([...items, newItem]);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Plus className="h-4 w-4" /> {inquiredService.name} (
                    {formatCurrency(Number(inquiredService.price || 0))})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setItems([
                      ...items,
                      { description: "", quantity: 1, unitPrice: 0 },
                    ])
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f8fafc] px-3 py-2 text-sm font-bold text-[#2563eb] transition hover:bg-[#eff6ff]"
                >
                  <Plus className="h-4 w-4" /> Add Line Item
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Desktop Table Header */}
            <div className="hidden grid-cols-[minmax(0,1fr)_100px_140px_120px_auto] gap-3 px-2 text-xs font-extrabold uppercase tracking-wide text-[#64748b] sm:grid">
              <span>Service or item</span>
              <span>Quantity</span>
              <span>Unit price</span>
              <span>Amount</span>
              <span className="w-10"></span>
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4 sm:grid-cols-[minmax(0,1fr)_100px_140px_120px_auto] sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#64748b] sm:hidden">
                    Service or item
                  </label>
                  <input
                    aria-label={`Item ${index + 1} description`}
                    className={inputClass}
                    value={item.description}
                    disabled={!editable}
                    onChange={(e) =>
                      setItems(
                        items.map((row, i) =>
                          i === index
                            ? { ...row, description: e.target.value }
                            : row,
                        ),
                      )
                    }
                    placeholder="E.g. Buffet package"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#64748b] sm:hidden">
                    Quantity
                  </label>
                  <input
                    aria-label="Quantity"
                    type="number"
                    min="1"
                    step="1"
                    className={inputClass}
                    value={item.quantity || ""}
                    disabled={!editable}
                    onChange={(e) =>
                      setItems(
                        items.map((row, i) =>
                          i === index
                            ? { ...row, quantity: Number(e.target.value) }
                            : row,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#64748b] sm:hidden">
                    Unit price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-sm text-[#94a3b8]">
                      ₱
                    </span>
                    <input
                      aria-label="Unit price"
                      type="number"
                      min="0"
                      step="0.01"
                      className={`${inputClass} pl-8`}
                      value={item.unitPrice || ""}
                      disabled={!editable}
                      onChange={(e) =>
                        setItems(
                          items.map((row, i) =>
                            i === index
                              ? { ...row, unitPrice: Number(e.target.value) }
                              : row,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#64748b] sm:hidden">
                    Amount
                  </label>
                  <div className="flex h-[46px] w-full items-center rounded-2xl bg-[#f1f5f9] px-4 text-sm font-semibold text-[#0f172a]">
                    {formatCurrency(
                      Number(item.quantity) * Number(item.unitPrice),
                    )}
                  </div>
                </div>
                <div className="flex justify-end sm:block">
                  {editable && items.length > 1 ? (
                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() =>
                        setItems(items.filter((_, i) => i !== index))
                      }
                      className="flex h-[46px] w-[46px] items-center justify-center rounded-xl text-[#94a3b8] transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="h-[46px] w-[46px]"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Pricing Adjustments" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Additional fee amount</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-sm text-[#94a3b8]">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${inputClass} pl-8`}
                  value={fees || ""}
                  onChange={(e) => setFees(Number(e.target.value))}
                  disabled={!editable}
                />
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Terms and Conditions"
            description="Add payment schedules, cancellation conditions, inclusions, exclusions, and other important service terms."
          />
          <textarea
            className={`${inputClass} mt-4`}
            rows={5}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            disabled={!editable}
            placeholder={
              "• A 50% deposit is required to confirm the service.\n• Final guest count must be submitted seven days before the event."
            }
          />
        </Panel>
      </div>

      {/* Right Column: Sticky Summary & Actions */}
      <div className="space-y-6 lg:sticky lg:top-24">
        <Panel padding={false}>
          <div className="border-b border-[#e5e7eb] p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#0f172a]">
              Proposal Summary
            </h3>
            <div className="mt-4 space-y-1 text-sm text-[#475569]">
              <p className="font-bold text-[#0f172a]">{customerName}</p>
              <p>{serviceName}</p>
              <p>
                {inquiry.event_date_snapshot ?? inquiry.event_date} ·{" "}
                {inquiry.venue_name_snapshot ||
                  inquiry.location_snapshot ||
                  inquiry.event_location}
              </p>
              {inquiry.guest_count && <p>{inquiry.guest_count} guests</p>}
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-[#475569]">
                <span>
                  Subtotal ({items.length} item{items.length !== 1 && "s"})
                </span>
                <span className="font-semibold text-[#0f172a]">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {Number(fees) > 0 && (
                <div className="flex justify-between text-[#475569]">
                  <span>Additional fee</span>
                  <span className="font-semibold text-[#0f172a]">
                    {formatCurrency(Number(fees))}
                  </span>
                </div>
              )}
            </div>

            <div className="my-5 h-px w-full border-t border-dashed border-[#cbd5e1]"></div>

            <div className="flex items-end justify-between">
              <span className="text-base font-black text-[#0f172a]">Total</span>
              <span className="text-2xl font-black text-[#2563eb]">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </Panel>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid gap-3">
          {editable ? (
            <>
              {initial?.status === "draft" && (
                <button
                  type="button"
                  onClick={() => setShowSendConfirm(true)}
                  disabled={isPending || !isFormValid}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Send Proposal
                </button>
              )}
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#e5e7eb] bg-white px-5 text-sm font-bold text-[#334155] transition hover:bg-[#f8fafc] hover:border-[#cbd5e1] disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                {isPending ? "Saving..." : "Save Draft"}
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            <Eye className="h-4 w-4" />
            Preview Proposal
          </button>

          {initial?.status === "sent" && (
            <button
              type="button"
              onClick={() => transition("withdraw")}
              disabled={isPending}
              className="mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Withdraw Proposal
            </button>
          )}

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-2 text-sm font-bold text-[#64748b] hover:text-[#0f172a]"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Modals & Dialogs */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-[#0f172a]">
                Customer Preview
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-full bg-[#f1f5f9] p-2 text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]"
              >
                ✕
              </button>
            </div>
            {/* Embedded Customer View for Preview */}
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-2">
              <CustomerInquiryDetail
                inquiry={inquiry}
                messages={[]}
                quote={previewQuote}
                isPreviewMode={true}
              />
            </div>
          </div>
        </div>
      )}

      {showSendConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-[#0f172a]">
              Send this service proposal?
            </h2>
            <div className="mt-4 rounded-2xl bg-[#f8fafc] p-4 text-sm text-[#475569]">
              <p className="font-bold text-[#0f172a]">{customerName}</p>
              <p>{serviceName}</p>
              <div className="mt-3 flex justify-between font-black text-[#2563eb]">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium leading-relaxed text-[#64748b]">
              {customerName} will receive this proposal and can review, accept,
              or decline it.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowSendConfirm(false)}
                className="flex-1 rounded-2xl border border-[#e5e7eb] px-5 py-3 text-sm font-bold text-[#475569] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                onClick={() => transition("send")}
                disabled={isPending}
                className="flex-1 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
              >
                {isPending ? "Sending..." : "Send Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { FileText, ReceiptText, RotateCcw } from "lucide-react";
import { formatMoney } from "../domain/value-objects/money.vo";
import type { InvoiceRow, ReceiptRow, RefundRow } from "../types/payment.types";

/**
 * Server-renderable cards for a booking's billing documents:
 * invoice, receipts, and refunds. Amounts come straight from RLS-scoped
 * queries in the page's server component.
 */

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

const INVOICE_STATUS_STYLES: Record<string, string> = {
  issued: "border-[#DBEAFE] bg-[#EFF6FF] text-[#2563EB]",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  void: "border-slate-200 bg-slate-50 text-slate-500",
  refunded: "border-amber-200 bg-amber-50 text-amber-700",
};

const REFUND_STATUS_STYLES: Record<string, string> = {
  pending: "border-[#DBEAFE] bg-[#EFF6FF] text-[#2563EB]",
  processing: "border-[#DBEAFE] bg-[#EFF6FF] text-[#2563EB]",
  succeeded: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-slate-200 bg-slate-50 text-slate-500",
};

function StatusPill({
  status,
  styles,
}: {
  status: string;
  styles: Record<string, string>;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] ${styles[status] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function InvoiceCard({ invoice }: { invoice: InvoiceRow }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-950">
          <FileText className="h-4 w-4 text-[#2563EB]" />
          <p className="text-sm font-black">{invoice.invoice_number}</p>
        </div>
        <StatusPill status={invoice.status} styles={INVOICE_STATUS_STYLES} />
      </div>

      <dl className="mt-3 grid gap-1 text-sm font-semibold text-slate-600">
        {invoice.line_items.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3 min-w-0 w-full"
          >
            <dt className="truncate flex-1">{item.description}</dt>
            <dd className="shrink-0 text-slate-950">
              {formatMoney(item.amount, invoice.currency)}
            </dd>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-dashed border-[#E5E7EB] pt-2">
          <dt className="font-extrabold text-slate-800">Amount due</dt>
          <dd className="font-black text-slate-950">
            {formatMoney(invoice.amount_due, invoice.currency)}
          </dd>
        </div>
      </dl>

      <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
        Issued {formatDate(invoice.issued_at)}
        {invoice.due_at && invoice.status === "issued"
          ? ` · Due ${formatDate(invoice.due_at)}`
          : null}
        {invoice.paid_at ? ` · Paid ${formatDate(invoice.paid_at)}` : null}
      </p>
    </div>
  );
}

export function ReceiptCard({ receipt }: { receipt: ReceiptRow }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-950">
          <ReceiptText className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-black">{receipt.receipt_number}</p>
        </div>
        <p className="text-sm font-black text-slate-950">
          {formatMoney(receipt.amount, receipt.currency)}
        </p>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-500">
        Paid via {receipt.payment_provider.toUpperCase()} on{" "}
        {formatDate(receipt.issued_at)}
      </p>
    </div>
  );
}

export function RefundList({ refunds }: { refunds: RefundRow[] }) {
  if (refunds.length === 0) return null;

  return (
    <div className="grid gap-3">
      {refunds.map((refund) => (
        <div
          key={refund.id}
          className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-950">
              <RotateCcw className="h-4 w-4 text-[#2563EB]" />
              <p className="text-sm font-black">
                {formatMoney(refund.amount, refund.currency)}
              </p>
            </div>
            <StatusPill status={refund.status} styles={REFUND_STATUS_STYLES} />
          </div>
          {refund.reason ? (
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {refund.reason}
            </p>
          ) : null}
          {refund.failure_reason ? (
            <p className="mt-2 text-sm font-semibold text-red-600">
              {refund.failure_reason}
            </p>
          ) : null}
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
            Requested {formatDate(refund.created_at)}
            {refund.processed_at
              ? ` · Settled ${formatDate(refund.processed_at)}`
              : null}
          </p>
        </div>
      ))}
    </div>
  );
}

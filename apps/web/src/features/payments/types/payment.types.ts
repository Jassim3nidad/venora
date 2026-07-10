/**
 * Shared payment types mirroring the database schema
 * (migration 038_payments_platform.sql).
 */

export const PAYMENT_PROVIDERS = ["paymongo", "maya", "stripe"] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number];

export type TransactionStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type RefundStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export type InvoiceStatus = "issued" | "paid" | "void" | "refunded";

export interface TransactionRow {
  id: string;
  booking_id: string;
  amount: number;
  commission_amount: number;
  payment_provider: PaymentProviderId;
  provider_reference: string | null;
  status: TransactionStatus;
  currency: string;
  payment_kind: string;
  checkout_url: string | null;
  paid_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RefundRow {
  id: string;
  booking_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string | null;
  requested_by: string | null;
  payment_provider: PaymentProviderId;
  provider_reference: string | null;
  failure_reason: string | null;
  processed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_amount: number;
  amount: number;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  booking_id: string;
  customer_id: string;
  organization_id: string | null;
  status: InvoiceStatus;
  currency: string;
  line_items: InvoiceLineItem[];
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  created_at: string;
}

export interface ReceiptRow {
  id: string;
  receipt_number: string;
  invoice_id: string | null;
  transaction_id: string;
  booking_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  payment_provider: PaymentProviderId;
  provider_reference: string | null;
  issued_at: string;
  created_at: string;
}

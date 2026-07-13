export type SupplierQuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "withdrawn";

export type SupplierAvailabilityStatus =
  | "available"
  | "unavailable"
  | "blocked";

export type SupplierQuoteItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
};

export type SupplierQuote = {
  id: string;
  inquiryId: string;
  supplierId: string;
  customerId: string;
  title: string;
  serviceDescription: string | null;
  subtotal: number;
  additionalFees: number;
  total: number;
  validUntil: string | null;
  terms: string | null;
  status: SupplierQuoteStatus;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: SupplierQuoteItem[];
};

export type SupplierInquiryMessage = {
  id: string;
  inquiryId: string;
  senderId: string;
  message: string;
  createdAt: string;
};

export type SupplierAvailabilityEntry = {
  id: string;
  supplierId: string;
  date: string;
  status: SupplierAvailabilityStatus;
  reason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};


export type MarketplaceFlag = {
  id: string;
  entityType: string;
  entityId: string;
  flagType: string;
  severity: "low" | "medium" | "high";
  status: "open" | "investigating" | "escalated" | "resolved" | "dismissed";
  notes: string | null;
  assignedToName: string | null;
  createdByName: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type RepeatedRejectionSignal = {
  entityType: "venue" | "supplier";
  entityId: string;
  label: string;
  rejectionCount: number;
};

export type CancellationSignal = {
  venueId: string;
  venueName: string;
  cancellationCount: number;
};

export type TransactionSignal = {
  id: string;
  bookingId: string;
  venueName: string | null;
  amount: number;
  status: string;
  createdAt: string;
};

export type PriceOutlierSignal = {
  venueId: string;
  venueName: string;
  basePrice: number;
  meanPrice: number;
  deviation: number;
};

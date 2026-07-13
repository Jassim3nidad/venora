// Kept out of admin-actions.ts because that file has a top-level "use
// server" directive — Next.js requires every export from such a file to be
// an async function, so plain constants/types can't live there.
export const SUPPLIER_REVIEW_ACTIONS = [
  "begin_review",
  "approve",
  "reject",
  "request_info",
  "suspend",
  "restore",
  "note",
] as const;

export type SupplierReviewAction = (typeof SUPPLIER_REVIEW_ACTIONS)[number];

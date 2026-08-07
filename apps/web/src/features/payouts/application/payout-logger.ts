import crypto from "crypto";

/**
 * Structured logging for the money-out path.
 *
 * Two rules, both enforced by construction rather than by reviewer
 * discipline:
 *
 *   1. Every entry carries the correlation id, withdrawal id and transfer
 *      id, so one payout can be traced end to end across the dispatch, the
 *      callback and the reconciliation sweep — three different processes.
 *
 *   2. Nothing sensitive reaches the output. Values are passed through a
 *      redactor that masks account numbers and drops anything whose key
 *      looks like a credential, so a careless `details` object cannot leak
 *      a secret.
 */

export type PayoutLogLevel = "info" | "warn" | "error";

export interface PayoutLogContext {
  /** Ties together every log line for one payout attempt. */
  correlationId: string;
  withdrawalId: string;
  transferId?: string | null;
}

/** Keys whose values are never safe to emit, matched case-insensitively. */
const FORBIDDEN_KEY = /(secret|token|key|authorization|password|cipher|bic)/i;

/** Keys holding an account identifier: masked rather than dropped. */
const ACCOUNT_KEY = /(account_?number|accountnumber|identifier|iban|msisdn)/i;

/** Leaves the last 4 digits so entries stay diagnosable. */
export function maskAccountNumber(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length <= 4) return "****";
  return `****${digits.slice(-4)}`;
}

/**
 * Recursively redacts a value before it is logged. Depth-limited so a
 * cyclic or pathological object cannot hang the logger.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth-limit]";
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    // A long bare digit run is an account number wherever it appears.
    return value.replace(/\b\d{10,}\b/g, (match) => maskAccountNumber(match));
  }

  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redact(item, depth + 1));
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEY.test(key)) {
      output[key] = "[redacted]";
    } else if (ACCOUNT_KEY.test(key) && typeof item === "string") {
      output[key] = maskAccountNumber(item);
    } else {
      output[key] = redact(item, depth + 1);
    }
  }
  return output;
}

export function newCorrelationId(): string {
  return `pay_${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * Emits one structured line. JSON so a log aggregator can filter on
 * `correlationId` or `withdrawalId` without parsing prose.
 */
export function payoutLog(
  level: PayoutLogLevel,
  context: PayoutLogContext,
  event: string,
  details?: Record<string, unknown>,
): void {
  const entry = {
    scope: "payouts",
    event,
    correlationId: context.correlationId,
    withdrawalId: context.withdrawalId,
    transferId: context.transferId ?? null,
    ...(details ? { details: redact(details) } : {}),
  };

  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

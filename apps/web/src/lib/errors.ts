import { AppError } from "@venora/lib";

/**
 * Typed application error classes extending the shared AppError.
 *
 * All errors thrown from domain/ and application/ layers MUST be a
 * VenoraError subclass. This lets the Server Action wrapper and Route
 * Handler catch blocks map errors to consistent HTTP responses.
 *
 * @see docs/conventions/error-handling.md
 */
export abstract class VenoraError extends AppError {
  abstract readonly httpStatus: number;

  constructor(code: string, message: string) {
    super(code, message);
    this.name = this.constructor.name;
    // Maintains proper prototype chain in transpiled output
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── 404 ──────────────────────────────────────────────────────

export class NotFoundError extends VenoraError {
  readonly httpStatus = 404;

  constructor(resource = "Resource") {
    super("NOT_FOUND", `${resource} not found`);
  }
}

// ── 401 ──────────────────────────────────────────────────────

export class UnauthorizedError extends VenoraError {
  readonly httpStatus = 401;

  constructor(message = "You must be signed in to perform this action") {
    super("UNAUTHORIZED", message);
  }
}

export class AuthError extends VenoraError {
  readonly httpStatus = 401;

  constructor(message = "Authentication failed") {
    super("AUTH_ERROR", message);
  }
}

// ── 403 ──────────────────────────────────────────────────────

export class ForbiddenError extends VenoraError {
  readonly httpStatus = 403;

  constructor(message = "You do not have permission to perform this action") {
    super("FORBIDDEN", message);
  }
}

// ── 400 ──────────────────────────────────────────────────────

export class ValidationError extends VenoraError {
  readonly httpStatus = 400;
  readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message);
    this.details = details;
  }
}

// ── 409 ──────────────────────────────────────────────────────

export class ConflictError extends VenoraError {
  readonly httpStatus = 409;

  constructor(message: string) {
    super("CONFLICT", message);
  }
}

export class BookingConflictError extends VenoraError {
  readonly httpStatus = 409;

  constructor() {
    super("BOOKING_CONFLICT", "This venue is already booked for that date and time. Please choose a different slot.");
  }
}

export class ReviewAlreadyExistsError extends VenoraError {
  readonly httpStatus = 409;

  constructor() {
    super("REVIEW_ALREADY_EXISTS", "You have already reviewed this booking.");
  }
}

// ── 402 ──────────────────────────────────────────────────────

export class PaymentError extends VenoraError {
  readonly httpStatus = 402;

  constructor(code: string, message: string) {
    super(code, message);
  }
}

export class PaymentCaptureError extends VenoraError {
  readonly httpStatus = 402;

  constructor(gateway: string) {
    super("PAYMENT_CAPTURE_FAILED", `Payment capture failed via ${gateway}. Please try again or use a different payment method.`);
  }
}

export class RefundError extends VenoraError {
  readonly httpStatus = 402;

  constructor() {
    super("REFUND_FAILED", "Refund could not be processed. Please contact support.");
  }
}

// ── Domain-specific ───────────────────────────────────────────

export class BookingInvalidStatusError extends VenoraError {
  readonly httpStatus = 400;

  constructor(from: string, to: string) {
    super("BOOKING_INVALID_STATUS", `Cannot transition booking from "${from}" to "${to}".`);
  }
}

export class VenueNotApprovedError extends VenoraError {
  readonly httpStatus = 403;

  constructor() {
    super("VENUE_NOT_APPROVED", "This venue is not available for booking.");
  }
}

export class ReviewBookingNotCompletedError extends VenoraError {
  readonly httpStatus = 400;

  constructor() {
    super("REVIEW_BOOKING_NOT_COMPLETED", "You can only review a venue after your event has been completed.");
  }
}

// ── User-facing message map ───────────────────────────────────

export const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND:                     "The requested resource was not found.",
  UNAUTHORIZED:                  "Please sign in to continue.",
  FORBIDDEN:                     "You don't have permission to do that.",
  VALIDATION_ERROR:              "Please check the form for errors.",
  BOOKING_CONFLICT:              "This venue is already booked for that time slot. Please choose another.",
  BOOKING_INVALID_STATUS:        "This booking action is not currently available.",
  VENUE_NOT_APPROVED:            "This venue is not available for booking.",
  REVIEW_BOOKING_NOT_COMPLETED:  "You can review this venue once your event has taken place.",
  REVIEW_ALREADY_EXISTS:         "You've already submitted a review for this booking.",
  PAYMENT_CAPTURE_FAILED:        "Payment could not be processed. Please try a different card or payment method.",
  REFUND_FAILED:                 "Refund could not be processed. Please contact our support team.",
  INTERNAL_ERROR:                "Something went wrong on our end. Our team has been notified.",
};

export function toErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

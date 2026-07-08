/**
 * Booking Entity
 *
 * Core domain object. Contains business logic and invariants.
 * No framework or DB dependencies.
 */

export type BookingStatus =
  | "pending"
  | "approved"
  | "payment_pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "completed"
  | "reviewed"
  | "expired";

export interface BookingProps {
  id: string;
  venueId: string;
  customerId: string;
  packageId: string | null;
  eventDate: Date;
  eventStartTime: string | null;
  eventEndTime: string | null;
  eventTypeId: string | null;
  guestCount: number;
  status: BookingStatus;
  totalAmount: number | null;
  depositAmount: number | null;
  specialRequests: string | null;

  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  paymentDueAt: Date | null;
  paymentStartedAt: Date | null;
  paidAt: Date | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  reviewedAt: Date | null;
}

export class BookingEntity {
  private constructor(private readonly props: BookingProps) {}

  static create(props: BookingProps): BookingEntity {
    // Invariants
    if (props.guestCount < 1) {
      throw new Error("Guest count must be at least 1");
    }
    if (props.totalAmount !== null && props.totalAmount < 0) {
      throw new Error("Total amount cannot be negative");
    }
    if (props.depositAmount !== null && props.depositAmount < 0) {
      throw new Error("Deposit amount cannot be negative");
    }
    return new BookingEntity(props);
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get id(): string                        { return this.props.id; }
  get venueId(): string                   { return this.props.venueId; }
  get customerId(): string                { return this.props.customerId; }
  get packageId(): string | null          { return this.props.packageId; }
  get eventDate(): Date                   { return this.props.eventDate; }
  get eventStartTime(): string | null     { return this.props.eventStartTime; }
  get eventEndTime(): string | null       { return this.props.eventEndTime; }
  get eventTypeId(): string | null        { return this.props.eventTypeId; }
  get guestCount(): number                { return this.props.guestCount; }
  get status(): BookingStatus             { return this.props.status; }
  get totalAmount(): number | null        { return this.props.totalAmount; }
  get depositAmount(): number | null      { return this.props.depositAmount; }
  get specialRequests(): string | null    { return this.props.specialRequests; }

  get createdAt(): Date                   { return this.props.createdAt; }
  get updatedAt(): Date                   { return this.props.updatedAt; }
  get approvedAt(): Date | null           { return this.props.approvedAt; }
  get paymentDueAt(): Date | null         { return this.props.paymentDueAt; }
  get paymentStartedAt(): Date | null     { return this.props.paymentStartedAt; }
  get paidAt(): Date | null               { return this.props.paidAt; }
  get confirmedAt(): Date | null          { return this.props.confirmedAt; }
  get cancelledAt(): Date | null          { return this.props.cancelledAt; }
  get completedAt(): Date | null          { return this.props.completedAt; }
  get reviewedAt(): Date | null           { return this.props.reviewedAt; }

  // ── Domain logic ─────────────────────────────────────────────────────────

  canBeApproved(): boolean {
    return this.props.status === "pending";
  }

  canBeCancelled(): boolean {
    return (
      this.props.status === "pending" ||
      this.props.status === "approved" ||
      this.props.status === "payment_pending" ||
      this.props.status === "confirmed"
    );
  }

  isUpcoming(): boolean {
    return this.props.eventDate > new Date() && this.props.status === "confirmed";
  }

  approve(totalAmount: number, depositAmount: number): BookingEntity {
    if (!this.canBeApproved()) {
      throw new Error(`Cannot approve a booking with status: ${this.props.status}`);
    }
    return new BookingEntity({
      ...this.props,
      status: "approved",
      totalAmount,
      depositAmount,
      approvedAt: new Date(),
      paymentDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });
  }

  markPaymentPending(): BookingEntity {
    if (this.props.status !== "approved") {
      throw new Error(`Cannot start payment for a booking with status: ${this.props.status}`);
    }
    return new BookingEntity({
      ...this.props,
      status: "payment_pending",
      paymentStartedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  confirmPayment(): BookingEntity {
    if (this.props.status !== "approved" && this.props.status !== "payment_pending") {
      throw new Error(`Cannot confirm payment for a booking with status: ${this.props.status}`);
    }
    const now = new Date();
    return new BookingEntity({
      ...this.props,
      status: "confirmed",
      paidAt: now,
      confirmedAt: now,
      updatedAt: now,
    });
  }

  complete(): BookingEntity {
    if (this.props.status !== "confirmed") {
      throw new Error(`Cannot complete a booking with status: ${this.props.status}`);
    }
    return new BookingEntity({
      ...this.props,
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  decline(reason: string): BookingEntity {
    if (this.props.status !== "pending") {
      throw new Error(`Cannot decline a booking with status: ${this.props.status}`);
    }
    return new BookingEntity({
      ...this.props,
      status: "declined",
      updatedAt: new Date(),
    });
  }

  cancel(): BookingEntity {
    if (!this.canBeCancelled()) {
      throw new Error(`Cannot cancel a booking with status: ${this.props.status}`);
    }
    return new BookingEntity({
      ...this.props,
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    });
  }

  toPlainObject(): BookingProps {
    return { ...this.props };
  }
}

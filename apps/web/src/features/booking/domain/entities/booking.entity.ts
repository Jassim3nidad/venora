/**
 * Booking Entity
 *
 * Core domain object. Contains business logic and invariants.
 * No framework or DB dependencies.
 */

export type BookingStatus =
  | "pending"
  | "approved"
  | "declined"
  | "cancelled"
  | "completed"
  | "expired";

export interface BookingProps {
  id: string;
  venueId: string;
  customerId: string;
  packageId: string | null;
  eventDate: Date;
  eventTypeId: string | null;
  guestCount: number;
  status: BookingStatus;
  totalAmount: number | null;
  depositAmount: number | null;
  specialRequests: string | null;
  declineReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
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
  get eventTypeId(): string | null        { return this.props.eventTypeId; }
  get guestCount(): number                { return this.props.guestCount; }
  get status(): BookingStatus             { return this.props.status; }
  get totalAmount(): number | null        { return this.props.totalAmount; }
  get depositAmount(): number | null      { return this.props.depositAmount; }
  get specialRequests(): string | null    { return this.props.specialRequests; }
  get declineReason(): string | null      { return this.props.declineReason; }
  get createdAt(): Date                   { return this.props.createdAt; }
  get updatedAt(): Date                   { return this.props.updatedAt; }
  get confirmedAt(): Date | null          { return this.props.confirmedAt; }
  get cancelledAt(): Date | null          { return this.props.cancelledAt; }

  // ── Domain logic ─────────────────────────────────────────────────────────

  canBeApproved(): boolean {
    return this.props.status === "pending";
  }

  canBeCancelled(): boolean {
    return this.props.status === "pending" || this.props.status === "approved";
  }

  isUpcoming(): boolean {
    return this.props.eventDate > new Date() && this.props.status === "approved";
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
      confirmedAt: new Date(),
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
      declineReason: reason,
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

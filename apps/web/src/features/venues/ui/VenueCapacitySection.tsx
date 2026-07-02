import type { ReactNode } from "react";
import { Users, Home, ParkingCircle, Accessibility } from "lucide-react";
import type { VenueProfileData } from "../types/venue.types";

interface VenueCapacitySectionProps {
  venue: Pick<
    VenueProfileData,
    | "capacity_min"
    | "capacity_max"
    | "indoor_outdoor"
    | "parking_available"
    | "wheelchair_accessible"
  >;
}

interface CapacityItem {
  icon: ReactNode;
  label: string;
  value: string;
}

export default function VenueCapacitySection({ venue }: VenueCapacitySectionProps) {
  const minGuests = venue.capacity_min ?? 1;
  const maxGuests = venue.capacity_max;

  const items: CapacityItem[] = [
    {
      icon: <Users className="h-5 w-5" />,
      label: "Guest capacity",
      value:
        minGuests === maxGuests
          ? `${maxGuests} guests`
          : `${minGuests}–${maxGuests} guests`,
    },
    {
      icon: <Home className="h-5 w-5" />,
      label: "Space type",
      value: venue.indoor_outdoor ?? "Flexible layout",
    },
    {
      icon: <ParkingCircle className="h-5 w-5" />,
      label: "Parking",
      value: venue.parking_available ? "On-site parking" : "Street parking nearby",
    },
    {
      icon: <Accessibility className="h-5 w-5" />,
      label: "Accessibility",
      value: venue.wheelchair_accessible ? "Wheelchair accessible" : "Limited accessibility",
    },
  ];

  return (
    <section className="space-y-4 border-b border-[var(--border-default)] pb-8">
      <h2 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
        Capacity & space
      </h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4"
          >
            <div className="mb-3 text-[var(--color-brand-600)]">{item.icon}</div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {item.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

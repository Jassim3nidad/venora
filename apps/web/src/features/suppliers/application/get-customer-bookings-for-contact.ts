import { createClient } from "@/lib/supabase/server";

export type CustomerBookingOption = {
  id: string;
  eventDate: string | null;
  guestCount: number | null;
  status: string;
  venueName: string;
  locationLabel: string;
  label: string;
};

type VenueRecord = {
  name?: string | null;
  city?: string | null;
  province?: string | null;
};

function getVenueLocation(venue?: VenueRecord | null) {
  if (!venue) return "Location unavailable";
  if (venue.city && venue.province) return `${venue.city}, ${venue.province}`;
  return venue.city || venue.province || "Location unavailable";
}

function formatBookingLabel(
  venueName: string,
  locationLabel: string,
  eventDate: string | null,
) {
  const dateLabel = eventDate
    ? new Date(`${eventDate}T00:00:00`).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date TBD";

  return `${venueName} — ${locationLabel} — ${dateLabel}`;
}

const excludedStatuses = new Set(["cancelled", "declined"]);

export async function getCustomerBookingsForContact(
  userId: string,
): Promise<CustomerBookingOption[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase.from("bookings") as any)
    .select(
      `
        id,
        status,
        event_date,
        guest_count,
        venues (
          name,
          city,
          province
        )
      `,
    )
    .eq("customer_id", userId)
    .order("event_date", { ascending: false });

  if (error) {
    console.error(
      "[suppliers] customer bookings for contact failed:",
      error.message,
    );
    return [];
  }

  return ((data ?? []) as any[])
    .filter((row) => !excludedStatuses.has(String(row.status)))
    .map((row) => {
      const venue = row.venues as VenueRecord | null;
      const venueName = venue?.name ?? "Venue booking";
      const locationLabel = getVenueLocation(venue);

      return {
        id: String(row.id),
        eventDate: row.event_date ?? null,
        guestCount:
          typeof row.guest_count === "number" ? row.guest_count : null,
        status: String(row.status),
        venueName,
        locationLabel,
        label: formatBookingLabel(venueName, locationLabel, row.event_date),
      };
    });
}

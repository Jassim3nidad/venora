import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Edit Venue" };

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();

  const { data: venue } = await supabase
    .from("venues")
    .select("*")
    .eq("id", id)
    .single();

  if (!venue) notFound();

  return (
    <main className="container" style={{ paddingBlock: "2rem", maxWidth: 700 }}>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.75rem", fontWeight: 700, marginBottom: "2rem" }}>
        Edit Venue
      </h1>
      <form id="edit-venue-form" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {[
          { id: "edit-venue-name", label: "Venue name", type: "text", name: "name", defaultValue: venue.name },
          { id: "edit-venue-address", label: "Address", type: "text", name: "address", defaultValue: venue.address },
          { id: "edit-venue-city", label: "City", type: "text", name: "city", defaultValue: venue.city },
          { id: "edit-venue-price", label: "Base price (₱)", type: "number", name: "base_price", defaultValue: venue.base_price },
          { id: "edit-venue-capacity-min", label: "Min capacity", type: "number", name: "capacity_min", defaultValue: venue.capacity_min },
          { id: "edit-venue-capacity-max", label: "Max capacity", type: "number", name: "capacity_max", defaultValue: venue.capacity_max },
        ].map((field) => (
          <div key={field.id} style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor={field.id} style={{ fontSize: "0.875rem", fontWeight: 500 }}>{field.label}</label>
            <input id={field.id} type={field.type} name={field.name} defaultValue={String(field.defaultValue ?? "")}
              style={{ height: "2.75rem", borderRadius: "0.625rem", border: "1px solid var(--border-default)", padding: "0 0.875rem", background: "var(--bg-subtle)", fontSize: "0.9375rem", outline: "none" }} />
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="edit-venue-description" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Description</label>
          <textarea id="edit-venue-description" name="description" rows={5} defaultValue={venue.description ?? ""}
            style={{ borderRadius: "0.625rem", border: "1px solid var(--border-default)", padding: "0.75rem 0.875rem", background: "var(--bg-subtle)", fontSize: "0.9375rem", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <button id="edit-venue-save-btn" type="submit"
          style={{ height: "3rem", borderRadius: "0.75rem", background: "hsl(217 70% 47%)", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
          Save Changes
        </button>
      </form>
    </main>
  );
}

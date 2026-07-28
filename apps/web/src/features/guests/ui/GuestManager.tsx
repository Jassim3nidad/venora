"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileUp,
  Pencil,
  Plus,
  Link2,
  Ban,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@venora/database";
import {
  deleteGuestAction,
  importGuestsAction,
  issueGuestRsvpAction,
  revokeGuestRsvpAction,
  saveGuestAction,
} from "../application/actions";
import { buildGuestCsv, parseGuestCsv } from "../application/csv";
import { GUEST_RSVP_STATUSES } from "../schemas/guest.schema";

type EventGuest = Tables<"event_guests">;

export type GuestBookingOption = {
  id: string;
  label: string;
};

type GuestDraft = {
  id?: string;
  bookingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  guestGroup: string;
  plusOnesAllowed: string;
  dietaryRequirements: string;
  accessibilityNotes: string;
  rsvpStatus: EventGuest["rsvp_status"];
};

const EMPTY_DRAFT: GuestDraft = {
  bookingId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  guestGroup: "General",
  plusOnesAllowed: "0",
  dietaryRequirements: "",
  accessibilityNotes: "",
  rsvpStatus: "pending",
};

const STATUS_STYLES: Record<EventGuest["rsvp_status"], string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  attending: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  declined: "bg-rose-50 text-rose-700 ring-rose-200",
  tentative: "bg-blue-50 text-blue-700 ring-blue-200",
};

function guestToDraft(guest: EventGuest): GuestDraft {
  return {
    id: guest.id,
    bookingId: guest.booking_id ?? "",
    firstName: guest.first_name,
    lastName: guest.last_name,
    email: guest.email ?? "",
    phone: guest.phone ?? "",
    guestGroup: guest.guest_group ?? "General",
    plusOnesAllowed: String(guest.plus_ones_allowed),
    dietaryRequirements: guest.dietary_requirements ?? "",
    accessibilityNotes: guest.accessibility_notes ?? "",
    rsvpStatus: guest.rsvp_status,
  };
}

function downloadCsv(contents: string) {
  const url = URL.createObjectURL(
    new Blob([contents], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `venora-guests-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function GuestManager({
  guests,
  bookings,
}: {
  guests: EventGuest[];
  bookings: GuestBookingOption[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<GuestDraft>(EMPTY_DRAFT);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [includeSensitive, setIncludeSensitive] = useState(false);

  const filteredGuests = guests.filter((guest) => {
    const text =
      `${guest.first_name} ${guest.last_name} ${guest.guest_group ?? ""}`.toLowerCase();
    const matchesSearch = text.includes(search.trim().toLowerCase());
    const matchesStatus =
      statusFilter === "all" || guest.rsvp_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const attending = guests.filter(
    (guest) => guest.rsvp_status === "attending",
  ).length;
  const pending = guests.filter(
    (guest) => guest.rsvp_status === "pending",
  ).length;

  function openCreate() {
    setDraft(EMPTY_DRAFT);
    setDialogOpen(true);
  }

  function openEdit(guest: EventGuest) {
    setDraft(guestToDraft(guest));
    setDialogOpen(true);
  }

  function updateDraft<Key extends keyof GuestDraft>(
    key: Key,
    value: GuestDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveGuest() {
    startTransition(async () => {
      const result = await saveGuestAction({
        id: draft.id,
        bookingId: draft.bookingId || null,
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        phone: draft.phone,
        guestGroup: draft.guestGroup,
        plusOnesAllowed: Number(draft.plusOnesAllowed),
        dietaryRequirements: draft.dietaryRequirements,
        accessibilityNotes: draft.accessibilityNotes,
        rsvpStatus: draft.rsvpStatus,
      });

      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      toast.success(draft.id ? "Guest updated." : "Guest added.");
      setDialogOpen(false);
      router.refresh();
    });
  }

  function deleteGuest(guest: EventGuest) {
    if (
      !window.confirm(
        `Permanently delete ${guest.first_name} ${guest.last_name}?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteGuestAction({ id: guest.id });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Guest deleted.");
      router.refresh();
    });
  }

  function copyRsvpUrl(token: string) {
    const url = `${window.location.origin}/rsvp/${token}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("RSVP link copied."),
      () => toast.error("Could not copy the RSVP link."),
    );
  }

  function issueRsvp(guest: EventGuest) {
    const deadlineInput = window.prompt(
      "RSVP deadline (YYYY-MM-DD). Leave blank for no deadline.",
      "",
    );
    if (deadlineInput === null) return;
    const parsedDeadline = deadlineInput.trim()
      ? new Date(`${deadlineInput.trim()}T23:59:59`)
      : null;
    if (parsedDeadline && Number.isNaN(parsedDeadline.getTime())) {
      toast.error("Enter the deadline as YYYY-MM-DD.");
      return;
    }
    const deadline = parsedDeadline?.toISOString() ?? null;

    startTransition(async () => {
      const result = await issueGuestRsvpAction({
        id: guest.id,
        deadline,
      });
      if (result.error || !result.data.rsvp_token) {
        toast.error(result.error?.message ?? "Could not create RSVP link.");
        return;
      }
      copyRsvpUrl(result.data.rsvp_token);
      if (result.data.delivery === "sent") {
        toast.success("RSVP invitation email sent.");
      } else if (result.data.delivery === "skipped") {
        toast.info("No guest email is stored; share the copied RSVP link.");
      } else {
        toast.warning(
          "RSVP link created, but email delivery is unavailable. Share the copied link.",
        );
      }
      router.refresh();
    });
  }

  function revokeRsvp(guest: EventGuest) {
    if (!window.confirm(`Revoke the RSVP link for ${guest.first_name}?`))
      return;
    startTransition(async () => {
      const result = await revokeGuestRsvpAction({ id: guest.id });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success("RSVP link revoked.");
      router.refresh();
    });
  }

  async function importCsv(file: File) {
    try {
      const parsed = parseGuestCsv(await file.text());
      startTransition(async () => {
        const result = await importGuestsAction({ guests: parsed });
        if (result.error) {
          toast.error(result.error.message);
          return;
        }
        toast.success(`${result.data.imported} guests imported.`);
        router.refresh();
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to read CSV file.",
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Guest list
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Track guests, groups, responses, and private requirements.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importCsv(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FileUp className="h-4 w-4" />
              Import CSV
            </button>
            <button
              type="button"
              onClick={() =>
                downloadCsv(buildGuestCsv(guests, { includeSensitive }))
              }
              disabled={guests.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add guest
            </button>
          </div>
        </div>

        <label className="mt-5 flex max-w-xl items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeSensitive}
            onChange={(event) => setIncludeSensitive(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          <span>
            <span className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Include private details in export
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Off by default. Enabling includes contact, dietary, and
              accessibility information. Store exported files securely.
            </span>
          </span>
        </label>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total guests", value: guests.length },
          { label: "Attending", value: attending },
          { label: "Awaiting response", value: pending },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search guests</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guest or group"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label>
            <span className="sr-only">Filter by RSVP status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 sm:w-48"
            >
              <option value="all">All responses</option>
              {GUEST_RSVP_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredGuests.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-800">
              {guests.length === 0 ? "No guests yet" : "No matching guests"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {guests.length === 0
                ? "Add one guest or import a CSV to begin."
                : "Change search or response filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredGuests.map((guest) => (
              <article
                key={guest.id}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-950">
                      {guest.first_name} {guest.last_name}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${STATUS_STYLES[guest.rsvp_status]}`}
                    >
                      {guest.rsvp_status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {guest.guest_group || "General"}
                    {guest.plus_ones_allowed > 0
                      ? ` · ${guest.plus_ones_allowed} plus-one${guest.plus_ones_allowed === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {guest.email || guest.phone || "No contact details stored"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {guest.invitation_sent_at &&
                  guest.rsvp_token &&
                  !guest.rsvp_revoked_at ? (
                    <>
                      <button
                        type="button"
                        onClick={() => copyRsvpUrl(guest.rsvp_token!)}
                        disabled={isPending}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 px-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        <Link2 className="h-4 w-4" />
                        Copy RSVP
                      </button>
                      <button
                        type="button"
                        onClick={() => revokeRsvp(guest)}
                        disabled={isPending}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-amber-200 px-3 text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                      >
                        <Ban className="h-4 w-4" />
                        Revoke
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => issueRsvp(guest)}
                      disabled={isPending}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 px-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      <Link2 className="h-4 w-4" />
                      Create RSVP
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(guest)}
                    disabled={isPending}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteGuest(guest)}
                    disabled={isPending}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <GuestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        draft={draft}
        updateDraft={updateDraft}
        bookings={bookings}
        isPending={isPending}
        onSave={saveGuest}
      />
    </div>
  );
}

function GuestDialog({
  open,
  onOpenChange,
  draft,
  updateDraft,
  bookings,
  isPending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: GuestDraft;
  updateDraft: <Key extends keyof GuestDraft>(
    key: Key,
    value: GuestDraft[Key],
  ) => void;
  bookings: GuestBookingOption[];
  isPending: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-950">
                {draft.id ? "Edit guest" : "Add guest"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Contact and requirement fields remain private to your account.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close guest form"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <input
                value={draft.firstName}
                onChange={(event) =>
                  updateDraft("firstName", event.target.value)
                }
                required
                maxLength={100}
                className="guest-input"
              />
            </Field>
            <Field label="Last name" required>
              <input
                value={draft.lastName}
                onChange={(event) =>
                  updateDraft("lastName", event.target.value)
                }
                required
                maxLength={100}
                className="guest-input"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={draft.email}
                onChange={(event) => updateDraft("email", event.target.value)}
                maxLength={320}
                className="guest-input"
              />
            </Field>
            <Field label="Phone">
              <input
                value={draft.phone}
                onChange={(event) => updateDraft("phone", event.target.value)}
                maxLength={40}
                className="guest-input"
              />
            </Field>
            <Field label="Group">
              <input
                value={draft.guestGroup}
                onChange={(event) =>
                  updateDraft("guestGroup", event.target.value)
                }
                maxLength={100}
                className="guest-input"
              />
            </Field>
            <Field label="Plus-ones allowed">
              <input
                type="number"
                min={0}
                max={20}
                value={draft.plusOnesAllowed}
                onChange={(event) =>
                  updateDraft("plusOnesAllowed", event.target.value)
                }
                className="guest-input"
              />
            </Field>
            <Field label="RSVP status">
              <select
                value={draft.rsvpStatus}
                onChange={(event) =>
                  updateDraft(
                    "rsvpStatus",
                    event.target.value as EventGuest["rsvp_status"],
                  )
                }
                className="guest-input"
              >
                {GUEST_RSVP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Linked booking">
              <select
                value={draft.bookingId}
                onChange={(event) =>
                  updateDraft("bookingId", event.target.value)
                }
                className="guest-input"
              >
                <option value="">Not linked</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Dietary requirements">
                <textarea
                  value={draft.dietaryRequirements}
                  onChange={(event) =>
                    updateDraft("dietaryRequirements", event.target.value)
                  }
                  rows={3}
                  maxLength={1000}
                  className="guest-input min-h-24 py-2.5"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Accessibility notes">
                <textarea
                  value={draft.accessibilityNotes}
                  onChange={(event) =>
                    updateDraft("accessibilityNotes", event.target.value)
                  }
                  rows={3}
                  maxLength={1000}
                  className="guest-input min-h-24 py-2.5"
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onSave}
              disabled={
                isPending || !draft.firstName.trim() || !draft.lastName.trim()
              }
              className="h-10 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save guest"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Armchair, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@venora/database";
import {
  assignGuestSeatAction,
  deleteSeatingTableAction,
  removeGuestSeatAction,
  saveSeatingTableAction,
} from "../application/actions";

type SeatingTable = Tables<"event_seating_tables">;
type Assignment = Tables<"event_seating_assignments">;
type Guest = Tables<"event_guests">;

export type SeatingBookingOption = {
  id: string;
  label: string;
};

type TableDraft = {
  id?: string;
  bookingId: string;
  tableName: string;
  capacity: string;
  notes: string;
};

const EMPTY_TABLE: TableDraft = {
  bookingId: "",
  tableName: "",
  capacity: "8",
  notes: "",
};

export function SeatingPlanner({
  tables,
  assignments,
  guests,
  bookings,
}: {
  tables: SeatingTable[];
  assignments: Assignment[];
  guests: Guest[];
  bookings: SeatingBookingOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<TableDraft>(EMPTY_TABLE);
  const [tableRows, setTableRows] = useState(tables);
  const [assignmentRows, setAssignmentRows] = useState(assignments);
  const assignedGuestIds = new Set(assignmentRows.map((item) => item.guest_id));
  const totalCapacity = tableRows.reduce(
    (sum, table) => sum + table.capacity,
    0,
  );

  useEffect(() => {
    setTableRows(tables);
  }, [tables]);

  useEffect(() => {
    setAssignmentRows(assignments);
  }, [assignments]);

  function openCreate() {
    setDraft(EMPTY_TABLE);
    setDialogOpen(true);
  }

  function openEdit(table: SeatingTable) {
    setDraft({
      id: table.id,
      bookingId: table.booking_id ?? "",
      tableName: table.table_name,
      capacity: String(table.capacity),
      notes: table.notes ?? "",
    });
    setDialogOpen(true);
  }

  function saveTable() {
    startTransition(async () => {
      const result = await saveSeatingTableAction({
        id: draft.id,
        bookingId: draft.bookingId || null,
        tableName: draft.tableName,
        capacity: Number(draft.capacity),
        notes: draft.notes,
      });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      const savedTable = result.data.table as SeatingTable;
      setTableRows((current) =>
        draft.id
          ? current.map((table) =>
              table.id === savedTable.id ? savedTable : table,
            )
          : [savedTable, ...current],
      );
      toast.success(draft.id ? "Table updated." : "Table added.");
      setDialogOpen(false);
      router.refresh();
    });
  }

  function deleteTable(table: SeatingTable) {
    if (!window.confirm(`Delete ${table.table_name} and its assignments?`))
      return;
    startTransition(async () => {
      const result = await deleteSeatingTableAction({ id: table.id });
      if (result.error) toast.error(result.error.message);
      else {
        setTableRows((current) =>
          current.filter((item) => item.id !== table.id),
        );
        setAssignmentRows((current) =>
          current.filter((item) => item.table_id !== table.id),
        );
        toast.success("Table deleted.");
        router.refresh();
      }
    });
  }

  function assignGuest(tableId: string, guestId: string) {
    if (!guestId) return;
    startTransition(async () => {
      const result = await assignGuestSeatAction({ tableId, guestId });
      if (result.error) toast.error(result.error.message);
      else {
        setAssignmentRows((current) => [
          result.data.assignment as Assignment,
          ...current,
        ]);
        toast.success("Guest assigned.");
        router.refresh();
      }
    });
  }

  function removeGuest(id: string) {
    startTransition(async () => {
      const result = await removeGuestSeatAction({ id });
      if (result.error) toast.error(result.error.message);
      else {
        setAssignmentRows((current) =>
          current.filter((item) => item.id !== id),
        );
        toast.success("Guest removed from table.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Armchair className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Seating planner
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Create tables and assign guests without exposing private notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add table
          </button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Tables", value: tableRows.length },
          { label: "Assigned guests", value: assignmentRows.length },
          {
            label: "Open seats",
            value: Math.max(0, totalCapacity - assignmentRows.length),
          },
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

      {tableRows.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Armchair className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 font-bold text-slate-900">No tables yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Add a table to start arranging your guest list.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {tableRows.map((table) => {
            const tableAssignments = assignmentRows.filter(
              (item) => item.table_id === table.id,
            );
            const availableGuests = guests.filter(
              (guest) =>
                !assignedGuestIds.has(guest.id) &&
                (!table.booking_id || guest.booking_id === table.booking_id),
            );
            return (
              <section
                key={table.id}
                aria-labelledby={`table-${table.id}`}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3
                      id={`table-${table.id}`}
                      className="font-bold text-slate-950"
                    >
                      {table.table_name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {tableAssignments.length} of {table.capacity} seats filled
                    </p>
                    {table.notes ? (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {table.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(table)}
                      aria-label={`Edit ${table.table_name}`}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTable(table)}
                      aria-label={`Delete ${table.table_name}`}
                      className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100">
                  {tableAssignments.length === 0 ? (
                    <li className="p-4 text-sm text-slate-500">
                      No guests assigned.
                    </li>
                  ) : (
                    tableAssignments.map((assignment) => {
                      const guest = guests.find(
                        (item) => item.id === assignment.guest_id,
                      );
                      return (
                        <li
                          key={assignment.id}
                          className="flex items-center justify-between gap-3 p-3"
                        >
                          <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                            {guest
                              ? `${guest.first_name} ${guest.last_name}`
                              : "Guest unavailable"}
                            {assignment.seat_number
                              ? ` · Seat ${assignment.seat_number}`
                              : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeGuest(assignment.id)}
                            disabled={isPending}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-700">
                    Assign an unseated guest
                  </span>
                  <select
                    value=""
                    onChange={(event) =>
                      assignGuest(table.id, event.target.value)
                    }
                    disabled={
                      isPending ||
                      tableAssignments.length >= table.capacity ||
                      availableGuests.length === 0
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 disabled:bg-slate-50"
                  >
                    <option value="">
                      {tableAssignments.length >= table.capacity
                        ? "Table is full"
                        : availableGuests.length === 0
                          ? "No eligible guests"
                          : "Choose guest"}
                    </option>
                    {availableGuests.map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.first_name} {guest.last_name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
            );
          })}
        </div>
      )}

      <TableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        draft={draft}
        setDraft={setDraft}
        bookings={bookings}
        isPending={isPending}
        onSave={saveTable}
      />
    </div>
  );
}

function TableDialog({
  open,
  onOpenChange,
  draft,
  setDraft,
  bookings,
  isPending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: TableDraft;
  setDraft: React.Dispatch<React.SetStateAction<TableDraft>>;
  bookings: SeatingBookingOption[];
  isPending: boolean;
  onSave: () => void;
}) {
  const update = (patch: Partial<TableDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-950">
                {draft.id ? "Edit table" : "Add table"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Set capacity and optionally scope this table to one booking.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close table form"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-6 space-y-4">
            <Field label="Table name">
              <input
                value={draft.tableName}
                onChange={(event) => update({ tableName: event.target.value })}
                maxLength={100}
                required
                className="guest-input"
              />
            </Field>
            <Field label="Capacity">
              <input
                type="number"
                min={1}
                max={100}
                value={draft.capacity}
                onChange={(event) => update({ capacity: event.target.value })}
                className="guest-input"
              />
            </Field>
            <Field label="Linked booking">
              <select
                value={draft.bookingId}
                onChange={(event) => update({ bookingId: event.target.value })}
                className="guest-input"
              >
                <option value="">All unlinked guests</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <textarea
                value={draft.notes}
                onChange={(event) => update({ notes: event.target.value })}
                maxLength={1000}
                rows={3}
                className="guest-input min-h-24 py-2.5"
              />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onSave}
              disabled={
                isPending ||
                !draft.tableName.trim() ||
                Number(draft.capacity) < 1
              }
              className="h-10 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save table"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

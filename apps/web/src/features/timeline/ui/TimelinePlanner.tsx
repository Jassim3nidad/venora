"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@venora/database";
import {
  deleteTimelineTaskAction,
  saveTimelineTaskAction,
} from "../application/actions";
import {
  TIMELINE_PRIORITIES,
  TIMELINE_STATUSES,
} from "../schemas/timeline.schema";

type TimelineTask = Tables<"event_timeline_tasks">;

export type TimelineBookingOption = { id: string; label: string };

type TaskDraft = {
  id?: string;
  bookingId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  ownerName: string;
  status: TimelineTask["status"];
  priority: TimelineTask["priority"];
  dependsOnTaskId: string;
};

const EMPTY_TASK: TaskDraft = {
  bookingId: "",
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  ownerName: "",
  status: "todo",
  priority: "medium",
  dependsOnTaskId: "",
};

const STATUS_LABELS: Record<TimelineTask["status"], string> = {
  todo: "To do",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<TimelineTask["status"], string> = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function taskToDraft(task: TimelineTask): TaskDraft {
  return {
    id: task.id,
    bookingId: task.booking_id ?? "",
    title: task.title,
    description: task.description ?? "",
    startTime: toLocalInput(task.start_time),
    endTime: toLocalInput(task.end_time),
    ownerName: task.owner_name ?? "",
    status: task.status,
    priority: task.priority,
    dependsOnTaskId: task.depends_on_task_id ?? "",
  };
}

export function TimelinePlanner({
  tasks,
  bookings,
}: {
  tasks: TimelineTask[];
  bookings: TimelineBookingOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_TASK);
  const [statusFilter, setStatusFilter] = useState("all");

  const visibleTasks = useMemo(
    () =>
      tasks
        .filter(
          (task) => statusFilter === "all" || task.status === statusFilter,
        )
        .sort((a, b) =>
          (a.start_time ?? a.created_at).localeCompare(
            b.start_time ?? b.created_at,
          ),
        ),
    [statusFilter, tasks],
  );

  function openCreate() {
    setDraft(EMPTY_TASK);
    setDialogOpen(true);
  }

  function openEdit(task: TimelineTask) {
    setDraft(taskToDraft(task));
    setDialogOpen(true);
  }

  function saveTask() {
    startTransition(async () => {
      const result = await saveTimelineTaskAction({
        id: draft.id,
        bookingId: draft.bookingId || null,
        title: draft.title,
        description: draft.description,
        startTime: toIso(draft.startTime),
        endTime: toIso(draft.endTime),
        ownerName: draft.ownerName,
        status: draft.status,
        priority: draft.priority,
        dependsOnTaskId: draft.dependsOnTaskId || null,
      });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success(draft.id ? "Task updated." : "Task added.");
      setDialogOpen(false);
      router.refresh();
    });
  }

  function deleteTask(task: TimelineTask) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    startTransition(async () => {
      const result = await deleteTimelineTaskAction({ id: task.id });
      if (result.error) toast.error(result.error.message);
      else {
        toast.success("Task deleted.");
        router.refresh();
      }
    });
  }

  const completed = tasks.filter((task) => task.status === "completed").length;
  const blocked = tasks.filter(
    (task) =>
      task.depends_on_task_id &&
      tasks.find((item) => item.id === task.depends_on_task_id)?.status !==
        "completed",
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Event timeline
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Schedule tasks, owners, priorities, and dependencies.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add task
          </button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Tasks", value: tasks.length },
          { label: "Completed", value: completed },
          { label: "Waiting on dependency", value: blocked },
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
        <div className="border-b border-slate-100 p-4">
          <label className="block sm:w-52">
            <span className="sr-only">Filter timeline status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              <option value="all">All statuses</option>
              {TIMELINE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {visibleTasks.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <CalendarClock className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 font-bold text-slate-900">No timeline tasks</h3>
            <p className="mt-1 text-sm text-slate-500">
              Add a task or change the status filter.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-slate-100">
            {visibleTasks.map((task) => {
              const dependency = tasks.find(
                (item) => item.id === task.depends_on_task_id,
              );
              return (
                <li
                  key={task.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-950">{task.title}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[task.status]}`}
                      >
                        {STATUS_LABELS[task.status]}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold capitalize text-amber-700">
                        {task.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {task.start_time
                        ? new Intl.DateTimeFormat("en-PH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(task.start_time))
                        : "No scheduled time"}
                      {task.owner_name ? ` · ${task.owner_name}` : ""}
                    </p>
                    {dependency ? (
                      <p className="mt-1 text-xs font-semibold text-blue-700">
                        Depends on: {dependency.title} (
                        {STATUS_LABELS[dependency.status]})
                      </p>
                    ) : null}
                    {task.description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {task.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      aria-label={`Edit ${task.title}`}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(task)}
                      disabled={isPending}
                      aria-label={`Delete ${task.title}`}
                      className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        draft={draft}
        setDraft={setDraft}
        tasks={tasks}
        bookings={bookings}
        isPending={isPending}
        onSave={saveTask}
      />
    </div>
  );
}

function TaskDialog({
  open,
  onOpenChange,
  draft,
  setDraft,
  tasks,
  bookings,
  isPending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: TaskDraft;
  setDraft: React.Dispatch<React.SetStateAction<TaskDraft>>;
  tasks: TimelineTask[];
  bookings: TimelineBookingOption[];
  isPending: boolean;
  onSave: () => void;
}) {
  const update = (patch: Partial<TaskDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const dependencies = tasks.filter(
    (task) =>
      task.id !== draft.id &&
      (!draft.bookingId ||
        !task.booking_id ||
        task.booking_id === draft.bookingId),
  );
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-950">
                {draft.id ? "Edit timeline task" : "Add timeline task"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Dependencies must belong to your timeline and compatible
                booking.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close task form"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Task title">
                <input
                  value={draft.title}
                  onChange={(event) => update({ title: event.target.value })}
                  maxLength={160}
                  required
                  className="guest-input"
                />
              </Field>
            </div>
            <Field label="Status">
              <select
                value={draft.status}
                onChange={(event) =>
                  update({
                    status: event.target.value as TimelineTask["status"],
                  })
                }
                className="guest-input"
              >
                {TIMELINE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={draft.priority}
                onChange={(event) =>
                  update({
                    priority: event.target.value as TimelineTask["priority"],
                  })
                }
                className="guest-input"
              >
                {TIMELINE_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start">
              <input
                type="datetime-local"
                value={draft.startTime}
                onChange={(event) => update({ startTime: event.target.value })}
                className="guest-input"
              />
            </Field>
            <Field label="End">
              <input
                type="datetime-local"
                value={draft.endTime}
                onChange={(event) => update({ endTime: event.target.value })}
                className="guest-input"
              />
            </Field>
            <Field label="Owner">
              <input
                value={draft.ownerName}
                onChange={(event) => update({ ownerName: event.target.value })}
                maxLength={120}
                className="guest-input"
              />
            </Field>
            <Field label="Linked booking">
              <select
                value={draft.bookingId}
                onChange={(event) =>
                  update({
                    bookingId: event.target.value,
                    dependsOnTaskId: "",
                  })
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
              <Field label="Depends on">
                <select
                  value={draft.dependsOnTaskId}
                  onChange={(event) =>
                    update({ dependsOnTaskId: event.target.value })
                  }
                  className="guest-input"
                >
                  <option value="">No dependency</option>
                  {dependencies.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    update({ description: event.target.value })
                  }
                  maxLength={2000}
                  rows={4}
                  className="guest-input min-h-24 py-2.5"
                />
              </Field>
            </div>
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
              disabled={isPending || !draft.title.trim()}
              className="h-10 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save task"}
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

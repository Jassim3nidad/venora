"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@venora/lib";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export type AutoAcceptSettingsState = {
  enabled: boolean;
  minimumNoticeHours: number;
  maximumGuestCount: number | "";
  allowedWeekdays: number[];
  allowedStartTime: string;
  allowedEndTime: string;
  minimumDurationMinutes: number | "";
  maximumDurationMinutes: number | "";
  minimumBookingAmount: number | "";
  requireStandardPackage: boolean;
  requireDeposit: boolean;
  requireVerifiedCustomer: boolean;
  allowedEventTypeIds: string[] | null;
  confidenceThreshold: number;
  reviewWindowMinutes: number;
};

export type VenueOption = {
  id: string;
  name: string;
  location: string;
  settings: AutoAcceptSettingsState;
};

type EventTypeOption = { id: string; name: string };

function Toggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4">
      <span>
        <span className="block text-sm font-extrabold text-slate-950">
          {title}
        </span>
        <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600"
      />
    </label>
  );
}

export function VenueAutoAcceptSettingsForm({
  venues,
  eventTypes,
}: {
  venues: VenueOption[];
  eventTypes: EventTypeOption[];
}) {
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === venueId) ?? venues[0],
    [venueId, venues],
  );
  const [settingsByVenue, setSettingsByVenue] = useState<
    Record<string, AutoAcceptSettingsState>
  >(() =>
    Object.fromEntries(venues.map((venue) => [venue.id, venue.settings])),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!selectedVenue) {
    return (
      <p className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-600">
        Add a venue before configuring smart booking automation.
      </p>
    );
  }

  const settings = settingsByVenue[selectedVenue.id] ?? selectedVenue.settings;
  const update = <TKey extends keyof AutoAcceptSettingsState>(
    key: TKey,
    value: AutoAcceptSettingsState[TKey],
  ) => {
    setSettingsByVenue((current) => ({
      ...current,
      [selectedVenue.id]: {
        ...(current[selectedVenue.id] ?? selectedVenue.settings),
        [key]: value,
      },
    }));
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/venues/${selectedVenue.id}/auto-accept-settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error?.message ?? "Could not save auto-accept settings.",
        );
      }
      setMessage("Auto-accept settings saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save auto-accept settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <label
          htmlFor="auto-accept-venue"
          className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600"
        >
          Venue
        </label>
        <select
          id="auto-accept-venue"
          value={selectedVenue.id}
          onChange={(event) => {
            setVenueId(event.target.value);
            setMessage(null);
          }}
          className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
        >
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
              {venue.location ? ` — ${venue.location}` : ""}
            </option>
          ))}
        </select>
      </div>

      <Toggle
        checked={settings.enabled}
        onChange={(value) => update("enabled", value)}
        title="Enable smart booking automation"
        description="Eligible standard-package requests can be approved automatically. Ambiguous requests stay pending for review."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <NumberField
          label="Minimum notice (hours)"
          value={settings.minimumNoticeHours}
          min={0}
          onChange={(value) => update("minimumNoticeHours", value || 0)}
        />
        <NumberField
          label="Maximum guests"
          value={settings.maximumGuestCount}
          min={1}
          optional
          onChange={(value) => update("maximumGuestCount", value)}
        />
        <NumberField
          label="Minimum amount (PHP)"
          value={settings.minimumBookingAmount}
          min={1}
          optional
          onChange={(value) => update("minimumBookingAmount", value)}
        />
      </div>

      <fieldset className="grid gap-3 rounded-2xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-extrabold text-slate-950">
          Allowed booking days
        </legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const checked = settings.allowedWeekdays.includes(day.value);
            return (
              <label
                key={day.value}
                className={cn(
                  "cursor-pointer rounded-xl border px-3 py-2 text-xs font-extrabold",
                  checked
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-500",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    update(
                      "allowedWeekdays",
                      checked
                        ? settings.allowedWeekdays.filter(
                            (value) => value !== day.value,
                          )
                        : [...settings.allowedWeekdays, day.value].sort(),
                    )
                  }
                  className="sr-only"
                />
                {day.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-4">
        <TimeField
          label="Earliest start"
          value={settings.allowedStartTime}
          onChange={(value) => update("allowedStartTime", value)}
        />
        <TimeField
          label="Latest end"
          value={settings.allowedEndTime}
          onChange={(value) => update("allowedEndTime", value)}
        />
        <NumberField
          label="Minimum duration (minutes)"
          value={settings.minimumDurationMinutes}
          min={1}
          optional
          onChange={(value) => update("minimumDurationMinutes", value)}
        />
        <NumberField
          label="Maximum duration (minutes)"
          value={settings.maximumDurationMinutes}
          min={1}
          optional
          onChange={(value) => update("maximumDurationMinutes", value)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Toggle
          checked={settings.requireDeposit}
          onChange={(value) => update("requireDeposit", value)}
          title="Require deposit terms"
          description="Package must define a valid deposit before auto-approval."
        />
        <Toggle
          checked={settings.requireVerifiedCustomer}
          onChange={(value) => update("requireVerifiedCustomer", value)}
          title="Verified customers only"
          description="Unverified accounts remain under manual review."
        />
      </div>

      {eventTypes.length > 0 ? (
        <fieldset className="grid gap-3 rounded-2xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-extrabold text-slate-950">
            Eligible event types
          </legend>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={settings.allowedEventTypeIds === null}
              onChange={(event) =>
                update("allowedEventTypeIds", event.target.checked ? null : [])
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            Allow all event types
          </label>
          {settings.allowedEventTypeIds !== null ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {eventTypes.map((eventType) => {
                const checked =
                  settings.allowedEventTypeIds?.includes(eventType.id) ?? false;
                return (
                  <label
                    key={eventType.id}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        update(
                          "allowedEventTypeIds",
                          checked
                            ? (settings.allowedEventTypeIds ?? []).filter(
                                (id) => id !== eventType.id,
                              )
                            : [
                                ...(settings.allowedEventTypeIds ?? []),
                                eventType.id,
                              ],
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    {eventType.name}
                  </label>
                );
              })}
            </div>
          ) : null}
        </fieldset>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-extrabold text-slate-800">
          AI confidence threshold (
          {Math.round(settings.confidenceThreshold * 100)}
          %)
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.01}
            value={settings.confidenceThreshold}
            onChange={(event) =>
              update("confidenceThreshold", Number(event.target.value))
            }
            className="accent-blue-600"
          />
        </label>
        <NumberField
          label="Supplier review window (minutes)"
          value={settings.reviewWindowMinutes}
          min={0}
          onChange={(value) => update("reviewWindowMinutes", value || 0)}
        />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium leading-6 text-blue-900">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Database rules remain final authority. AI only interprets notes.
            Approval creates deposit invoice; customer payment still follows
            existing secure payment flow.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {message ? (
          <div
            role="status"
            className={cn(
              "inline-flex items-center gap-2 text-sm font-bold",
              message.includes("saved") ? "text-emerald-700" : "text-amber-700",
            )}
          >
            {message.includes("saved") ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Clock3 className="h-4 w-4" />
            )}
            {message}
          </div>
        ) : (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <Bot className="h-4 w-4" />
            Changes affect new booking requests only.
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || settings.allowedWeekdays.length === 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save automation rules
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  optional,
  onChange,
}: {
  label: string;
  value: number | "";
  min: number;
  optional?: boolean;
  onChange: (value: number | "") => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-extrabold text-slate-800">
      {label}
      <input
        type="number"
        min={min}
        value={value}
        placeholder={optional ? "No limit" : undefined}
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : Number(event.target.value))
        }
        className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold"
      />
    </label>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-extrabold text-slate-800">
      {label}
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold"
      />
    </label>
  );
}

"use client";

import {
  getCitiesForProvince,
  getMunicipalitiesForProvince,
  LUZON_PROVINCE_NAMES,
} from "@/data/luzon-locations";
import {
  DATE_PREFERENCE_OPTIONS,
} from "../domain/event-plan.constants";
import type {
  DayOfWeekPreference,
  EventPlanDraft,
  TimeOfDayPreference,
} from "../domain/event-plan.types";
import type { EventPlanFieldErrors } from "../utils/event-plan-wizard";
import {
  CheckboxCardGroup,
  RadioCardGroup,
  SelectInput,
  TextInput,
} from "./EventPlanningFields";

type StepProps = {
  draft: EventPlanDraft;
  errors: EventPlanFieldErrors;
  onChange: (patch: Partial<EventPlanDraft>) => void;
};

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, index) => ({ value: String(index + 1), label }));

const DAY_OPTIONS: { value: DayOfWeekPreference; label: string }[] = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const TIME_OPTIONS: { value: TimeOfDayPreference; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "whole-day", label: "Whole day" },
];

function yearOptions() {
  const current = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, index) => {
    const year = current + index;
    return { value: String(year), label: String(year) };
  });
}

function clearDateFieldsForMode(
  draft: EventPlanDraft,
  mode: EventPlanDraft["datePreferenceType"],
): Partial<EventPlanDraft> {
  return {
    exactDate: mode === "exact" ? draft.exactDate : null,
    preferredDateStart: mode === "range" ? draft.preferredDateStart : null,
    preferredDateEnd: mode === "range" ? draft.preferredDateEnd : null,
    preferredMonth:
      mode === "month" || mode === "flexible" ? draft.preferredMonth : null,
    preferredYear:
      mode === "month" || mode === "flexible" ? draft.preferredYear : null,
    preferredDayOfWeek:
      mode === "flexible" ? draft.preferredDayOfWeek : null,
    preferredTimeOfDay:
      mode === "flexible" ? draft.preferredTimeOfDay : null,
  };
}

export function DateLocationStep({ draft, errors, onChange }: StepProps) {
  const cityOptions = draft.preferredProvince
    ? [
        ...getCitiesForProvince(draft.preferredProvince),
        ...getMunicipalitiesForProvince(draft.preferredProvince),
      ].map((city) => ({ value: city, label: city }))
    : [];

  return (
    <div className="space-y-8">
      <RadioCardGroup
        legend="When would you like to hold the event?"
        name="datePreferenceType"
        value={draft.datePreferenceType}
        options={DATE_PREFERENCE_OPTIONS}
        error={errors.datePreferenceType}
        onChange={(datePreferenceType) =>
          onChange({
            ...clearDateFieldsForMode(draft, datePreferenceType),
            datePreferenceType,
          })
        }
      />

      {draft.datePreferenceType === "exact" ? (
        <TextInput
          id="exactDate"
          type="date"
          label="Event date"
          value={draft.exactDate ?? ""}
          error={errors.exactDate}
          onChange={(exactDate) => onChange({ exactDate })}
        />
      ) : null}

      {draft.datePreferenceType === "range" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            id="preferredDateStart"
            type="date"
            label="Earliest preferred date"
            value={draft.preferredDateStart ?? ""}
            error={errors.preferredDateStart}
            onChange={(preferredDateStart) => onChange({ preferredDateStart })}
          />
          <TextInput
            id="preferredDateEnd"
            type="date"
            label="Latest preferred date"
            value={draft.preferredDateEnd ?? ""}
            error={errors.preferredDateEnd}
            onChange={(preferredDateEnd) => onChange({ preferredDateEnd })}
          />
        </div>
      ) : null}

      {draft.datePreferenceType === "month" ||
      draft.datePreferenceType === "flexible" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SelectInput
            id="preferredMonth"
            label={
              draft.datePreferenceType === "month"
                ? "Preferred month"
                : "Preferred month (optional)"
            }
            value={draft.preferredMonth ? String(draft.preferredMonth) : ""}
            options={MONTH_OPTIONS}
            error={errors.preferredMonth}
            onChange={(value) =>
              onChange({ preferredMonth: value ? Number(value) : null })
            }
          />
          <SelectInput
            id="preferredYear"
            label={
              draft.datePreferenceType === "month"
                ? "Preferred year"
                : "Preferred year (optional)"
            }
            value={draft.preferredYear ? String(draft.preferredYear) : ""}
            options={yearOptions()}
            error={errors.preferredYear}
            onChange={(value) =>
              onChange({ preferredYear: value ? Number(value) : null })
            }
          />
        </div>
      ) : null}

      {draft.datePreferenceType === "flexible" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SelectInput
            id="preferredDayOfWeek"
            label="Preferred day of week (optional)"
            value={draft.preferredDayOfWeek ?? ""}
            options={DAY_OPTIONS}
            error={errors.preferredDayOfWeek}
            onChange={(value) =>
              onChange({
                preferredDayOfWeek: value
                  ? (value as DayOfWeekPreference)
                  : null,
              })
            }
          />
          <SelectInput
            id="preferredTimeOfDay"
            label="Preferred time of day (optional)"
            value={draft.preferredTimeOfDay ?? ""}
            options={TIME_OPTIONS}
            error={errors.preferredTimeOfDay}
            onChange={(value) =>
              onChange({
                preferredTimeOfDay: value
                  ? (value as TimeOfDayPreference)
                  : null,
              })
            }
          />
        </div>
      ) : null}

      <section className="space-y-4 border-t border-slate-200 pt-6">
        <div>
          <h2 className="text-base font-bold text-slate-950">
            Where would you like to hold the event?
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Choose a province and city if you already have a preferred area.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SelectInput
            id="preferredProvince"
            label="Province"
            value={draft.preferredProvince ?? ""}
            options={LUZON_PROVINCE_NAMES.map((province) => ({
              value: province,
              label: province,
            }))}
            error={errors.preferredProvince}
            placeholder="Not sure yet"
            onChange={(preferredProvince) =>
              onChange({
                preferredProvince: preferredProvince || null,
                preferredCity: null,
              })
            }
          />
          <SelectInput
            id="preferredCity"
            label="City or municipality"
            value={draft.preferredCity ?? ""}
            options={cityOptions}
            error={errors.preferredCity}
            placeholder={
              draft.preferredProvince ? "Not sure yet" : "Choose a province first"
            }
            onChange={(preferredCity) =>
              onChange({ preferredCity: preferredCity || null })
            }
          />
        </div>

        <CheckboxCardGroup
          legend="Location flexibility"
          name="nearbyLocationsAllowed"
          values={draft.nearbyLocationsAllowed ? ["nearby"] : []}
          options={[{ value: "nearby", label: "I am open to nearby locations" }]}
          columns="md:grid-cols-1"
          onToggle={() =>
            onChange({
              nearbyLocationsAllowed: !draft.nearbyLocationsAllowed,
            })
          }
        />
      </section>
    </div>
  );
}

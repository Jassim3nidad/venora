"use client";

import {
  SERVICE_CATEGORY_OPTIONS,
} from "../domain/event-plan.constants";
import type {
  EventPlanDraft,
  ServiceCategory,
} from "../domain/event-plan.types";
import type { EventPlanFieldErrors } from "../utils/event-plan-wizard";
import {
  CheckboxCardGroup,
  TextInput,
} from "./EventPlanningFields";

type StepProps = {
  draft: EventPlanDraft;
  errors: EventPlanFieldErrors;
  onChange: (patch: Partial<EventPlanDraft>) => void;
};

function toggleService(
  values: ServiceCategory[],
  value: ServiceCategory,
): ServiceCategory[] {
  if (value === "already-have-all") {
    return values.includes("already-have-all") ? [] : ["already-have-all"];
  }

  const withoutAllSet = values.filter((item) => item !== "already-have-all");
  return withoutAllSet.includes(value)
    ? withoutAllSet.filter((item) => item !== value)
    : [...withoutAllSet, value];
}

export function ServicesStep({ draft, errors, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <CheckboxCardGroup
        legend="Which services do you still need?"
        description="These answers are planning requirements only. They do not create supplier records."
        name="servicesNeeded"
        values={draft.servicesNeeded}
        options={SERVICE_CATEGORY_OPTIONS}
        error={errors.servicesNeeded}
        onToggle={(value) => {
          const servicesNeeded = toggleService(draft.servicesNeeded, value);
          const alreadyComplete = servicesNeeded.includes("already-have-all");
          onChange({
            servicesNeeded,
            serviceSelectionMode: alreadyComplete
              ? "already-complete"
              : "needs-services",
            customService: servicesNeeded.includes("other")
              ? draft.customService
              : null,
          });
        }}
      />

      {draft.servicesNeeded.includes("other") ? (
        <TextInput
          id="customService"
          label="Describe the other service"
          value={draft.customService ?? ""}
          error={errors.customService}
          placeholder="Live painter, valet, cultural performers..."
          onChange={(customService) => onChange({ customService })}
        />
      ) : null}
    </div>
  );
}

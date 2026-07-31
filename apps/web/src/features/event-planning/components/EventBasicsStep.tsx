"use client";

import {
  EVENT_TYPE_OPTIONS,
} from "../domain/event-plan.constants";
import type { EventPlanDraft } from "../domain/event-plan.types";
import type { EventPlanFieldErrors } from "../utils/event-plan-wizard";
import { RadioCardGroup, TextInput } from "./EventPlanningFields";

type StepProps = {
  draft: EventPlanDraft;
  errors: EventPlanFieldErrors;
  onChange: (patch: Partial<EventPlanDraft>) => void;
};

export function EventBasicsStep({ draft, errors, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <RadioCardGroup
        legend="What type of event are you planning?"
        description="This helps Venora understand which spaces, facilities, and services may suit your event."
        name="eventType"
        value={draft.eventType}
        options={EVENT_TYPE_OPTIONS}
        error={errors.eventType}
        onChange={(eventType) =>
          onChange({
            eventType,
            customEventType:
              eventType === "other" ? draft.customEventType : null,
          })
        }
      />

      {draft.eventType === "other" ? (
        <TextInput
          id="customEventType"
          label="Tell us what kind of event you are planning"
          value={draft.customEventType ?? ""}
          error={errors.customEventType}
          placeholder="Awards night, retreat, private dinner..."
          onChange={(customEventType) => onChange({ customEventType })}
        />
      ) : null}
    </div>
  );
}

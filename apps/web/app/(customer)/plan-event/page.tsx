import { EventPlanningWizard } from "@/features/event-planning/components/EventPlanningWizard";

export const metadata = {
  title: "Plan your event | Venora",
  description:
    "Create a local event planning summary before saving to your Venora account.",
};

export default function PlanEventPage() {
  return <EventPlanningWizard />;
}

import { EventPlanningWizard } from "@/features/event-planning/components/EventPlanningWizard";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Plan your event | Venora",
  description:
    "Create a local event planning summary before saving to your Venora account.",
};

export default async function PlanEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <EventPlanningWizard isAuthenticated={Boolean(user)} />;
}

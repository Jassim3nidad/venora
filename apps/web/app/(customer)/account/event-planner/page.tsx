import type { Metadata } from "next";
import EventPlanner from "@/features/ai/ui/EventPlanner";

export const metadata: Metadata = { title: "AI Event Planner" };

export default function EventPlannerPage() {
  return <EventPlanner />;
}

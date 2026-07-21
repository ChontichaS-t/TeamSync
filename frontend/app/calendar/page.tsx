import type { Metadata } from "next";

import CalendarPage from "@/components/calendar/CalendarPage";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Plan project milestones, reviews, and team sessions.",
};

export default function CalendarRoute() {
  return <CalendarPage />;
}

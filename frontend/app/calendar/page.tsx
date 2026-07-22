import type { Metadata } from "next";

import CalendarPage from "@/components/calendar/CalendarPage";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Plan project milestones, reviews, and team sessions.",
};

export default function CalendarRoute() {
  return <Suspense fallback={null}><CalendarPage /></Suspense>;
}

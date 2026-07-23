import type { Metadata } from "next";
import CalendarPage from "@/components/calendar/CalendarPage";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Plan project milestones, reviews, and team sessions.",
};

function PageSkeleton() {
  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      <div style={{ height: "60px", background: "#f1f5f9", borderRadius: "12px", marginBottom: "24px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <div style={{ width: "240px", height: "34px", background: "#e2e8f0", borderRadius: "8px" }} />
        <div style={{ width: "140px", height: "34px", background: "#e2e8f0", borderRadius: "8px" }} />
      </div>
      <div style={{ height: "400px", background: "#e2e8f0", borderRadius: "20px" }} />
    </div>
  );
}

export default function CalendarRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CalendarPage />
    </Suspense>
  );
}

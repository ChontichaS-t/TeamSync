import ProjectPage from "@/components/project/ProjectPage";
import { Suspense } from "react";

function PageSkeleton() {
  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      <div style={{ height: "60px", background: "#f1f5f9", borderRadius: "12px", marginBottom: "24px" }} />
      <div style={{ height: "240px", background: "#e2e8f0", borderRadius: "24px", marginBottom: "24px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <div style={{ width: "320px", height: "38px", background: "#e2e8f0", borderRadius: "8px" }} />
        <div style={{ width: "200px", height: "38px", background: "#e2e8f0", borderRadius: "8px" }} />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectPage />
    </Suspense>
  );
}

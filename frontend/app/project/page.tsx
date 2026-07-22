import ProjectPage from "@/components/project/ProjectPage";
import { Suspense } from "react";

export default function Page() {
  return <Suspense fallback={null}><ProjectPage /></Suspense>;
}

// frontend/src/pages/jobs/JobsPage.tsx
import React from "react";
import JobsAllPage from "./pages/all/JobsAllPage";
import JobOverviewPage from "./pages/overview/JobOverviewPage";
import UpcomingPlanningPage from "../dashboard/upcoming-jobs/UpcomingPlanningPage";

type JobsRoute =
  | { page: "all" }
  | { page: "overview"; jobId: string }
  | { page: "upcoming-planning" };

type Props = {
  route: JobsRoute;
  onOpenAll: () => void;
  onOpenOverview: (jobId: string) => void;
};

export default function JobsPage({ route, onOpenAll, onOpenOverview }: Props) {
  if (route.page === "overview") {
    return <JobOverviewPage jobId={route.jobId} onBack={onOpenAll} />;
  }

  if (route.page === "upcoming-planning") {
    return <UpcomingPlanningPage onBack={onOpenAll} />;
  }

  return <JobsAllPage onOpenOverview={onOpenOverview} />;
}
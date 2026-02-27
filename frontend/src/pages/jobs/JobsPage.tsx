import React from "react";
import JobsAllPage from "./pages/all/JobsAllPage";
import JobOverviewPage from "./pages/overview/JobOverviewPage";

type JobsRoute =
  | { page: "all" }
  | { page: "overview"; jobId: string };

type Props = {
  route: JobsRoute;
  onOpenAll: () => void;
  onOpenOverview: (jobId: string) => void;
};

export default function JobsPage({ route, onOpenAll, onOpenOverview }: Props) {
  if (route.page === "overview") {
    return <JobOverviewPage jobId={route.jobId} onBack={onOpenAll} />;
  }

  return <JobsAllPage onOpenOverview={onOpenOverview} />;
}
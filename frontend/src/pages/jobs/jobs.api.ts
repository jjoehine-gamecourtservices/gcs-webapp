import type { MondayUpcomingJobsResponse, MondayUpcomingJob } from "./jobs.types";

export async function fetchUpcomingJobsBasic(): Promise<MondayUpcomingJob[]> {
  const r = await fetch("/api/monday/upcoming-jobs", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status}${text ? `: ${text}` : ""}`);
  }

  const data = (await r.json()) as MondayUpcomingJobsResponse;
  return Array.isArray(data.jobs) ? data.jobs : [];
}
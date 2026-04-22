// frontend/src/pages/jobs/jobs.api.ts
import type {
  MondayUpcomingJobsResponse,
  MondayUpcomingJob,
  UpcomingPlanningJobsResponse,
  UpcomingPlanningJob,
  UpcomingPlanningNote,
} from "./jobs.types";

export type UpcomingJobsMeta = {
  cacheKey: string;
  updatedAt: string;
  refreshStartedAt: string | null;
  refreshFinishedAt: string | null;
  refreshError: string | null;
  count: number;
};

export type UpcomingPlanningMeta = {
  cacheKey: string;
  updatedAt: string;
  refreshStartedAt: string | null;
  refreshFinishedAt: string | null;
  refreshError: string | null;
  count: number;
};

async function parseJsonOrThrow<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status}${text ? `: ${text}` : ""}`);
  }

  return (await r.json()) as T;
}

export async function fetchUpcomingJobsBasic(): Promise<MondayUpcomingJob[]> {
  const r = await fetch("/api/monday/upcoming-jobs", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await parseJsonOrThrow<MondayUpcomingJobsResponse>(r);
  return Array.isArray(data.jobs) ? data.jobs : [];
}

export async function fetchUpcomingJobsMeta(): Promise<UpcomingJobsMeta> {
  const r = await fetch("/api/monday/upcoming-jobs/meta", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  return parseJsonOrThrow<UpcomingJobsMeta>(r);
}

export async function refreshUpcomingJobsBasic(): Promise<MondayUpcomingJob[]> {
  const r = await fetch("/api/monday/upcoming-jobs/refresh", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await parseJsonOrThrow<MondayUpcomingJobsResponse>(r);
  return Array.isArray(data.jobs) ? data.jobs : [];
}

export async function fetchUpcomingPlanningJobs(): Promise<UpcomingPlanningJob[]> {
  const r = await fetch("/api/upcoming-planning/jobs", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await parseJsonOrThrow<UpcomingPlanningJobsResponse>(r);
  return Array.isArray(data.jobs) ? data.jobs : [];
}

export async function fetchUpcomingPlanningMeta(): Promise<UpcomingPlanningMeta> {
  const r = await fetch("/api/upcoming-planning/jobs/meta", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  return parseJsonOrThrow<UpcomingPlanningMeta>(r);
}

export async function refreshUpcomingPlanningJobs(): Promise<UpcomingPlanningJob[]> {
  const r = await fetch("/api/upcoming-planning/jobs/refresh", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await parseJsonOrThrow<UpcomingPlanningJobsResponse>(r);
  return Array.isArray(data.jobs) ? data.jobs : [];
}

export async function fetchUpcomingPlanningNote(itemId: string): Promise<UpcomingPlanningNote> {
  const r = await fetch(`/api/upcoming-planning/notes/${encodeURIComponent(itemId)}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  return parseJsonOrThrow<UpcomingPlanningNote>(r);
}

export async function saveUpcomingPlanningNote(
  itemId: string,
  noteText: string
): Promise<UpcomingPlanningNote> {
  const r = await fetch(`/api/upcoming-planning/notes/${encodeURIComponent(itemId)}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ noteText }),
  });

  return parseJsonOrThrow<UpcomingPlanningNote>(r);
}
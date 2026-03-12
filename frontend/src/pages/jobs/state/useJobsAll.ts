import { useCallback, useEffect, useState } from "react";
import { apiJson } from "../../../api/api";

export type JobListItem = {
  jobNumber: string;
  jobName: string;
  address: string;

  gc: string;
  gcpm: string;
  gcpmContact: string;

  super: string;
  superContact: string;

  pm: string;

  pssInstallDate: string;

  contractAmount: string;
  scopeLines: string[];
};

type ApiJob = {
  jobNumber: string;
  jobName: string;
  address: string;

  generalContractor: string;
  gcpm: string;
  gcpmContact: string;

  super: string;
  superContact: string;

  pm: string;

  startDate: string;
  contractAmount: string;
};

const CACHE_KEY = "gcs_jobs_all_cache_v1";
const CACHE_DATE_KEY = "gcs_jobs_all_cache_date_v1";

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function mapApiJobs(apiJobs: ApiJob[]): JobListItem[] {
  return apiJobs.map((j) => ({
    jobNumber: j.jobNumber ?? "",
    jobName: j.jobName ?? "",
    address: j.address ?? "",

    gc: j.generalContractor ?? "",
    gcpm: j.gcpm ?? "",
    gcpmContact: j.gcpmContact ?? "",

    super: j.super ?? "",
    superContact: j.superContact ?? "",

    pm: j.pm ?? "",

    pssInstallDate: j.startDate ?? "",

    contractAmount: j.contractAmount ?? "",
    scopeLines: [],
  }));
}

function readCache(): JobListItem[] | null {
  try {
    const cachedDate = localStorage.getItem(CACHE_DATE_KEY);
    if (cachedDate !== todayKey()) return null;

    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as JobListItem[];
    if (!Array.isArray(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeCache(jobs: JobListItem[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(jobs));
    localStorage.setItem(CACHE_DATE_KEY, todayKey());
  } catch {
    // ignore storage failures
  }
}

export default function useJobsAll() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = readCache();
      if (cached) {
        setJobs(cached);
        setLoading(false);
        return;
      }
    }

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const r = await apiJson<{ jobs: ApiJob[] }>("/api/jobs", {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!r.ok || !r.data || !Array.isArray(r.data.jobs)) {
        console.warn("[jobs] failed", r.status);
        setJobs([]);
        return;
      }

      const mapped = mapApiJobs(r.data.jobs);
      setJobs(mapped);
      writeCache(mapped);
    } catch (e) {
      console.warn("[jobs] exception", e);
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const reload = useCallback(async () => {
    await load(true);
  }, [load]);

  return { jobs, loading, refreshing, reload };
}
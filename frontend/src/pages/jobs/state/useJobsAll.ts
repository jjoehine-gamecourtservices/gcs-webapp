import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type JobsMetaResponse = {
  cacheKey: string;
  updatedAt: string;
  refreshStartedAt: string | null;
  refreshFinishedAt: string | null;
  refreshError: string | null;
  count: number;
};

const META_POLL_MS = 30_000;

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

async function fetchAllJobsCached(): Promise<JobListItem[]> {
  const r = await apiJson<{ jobs: ApiJob[]; count: number }>("/api/jobs", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!r.ok || !r.data || !Array.isArray(r.data.jobs)) {
    throw new Error(`HTTP ${r.status}${r.text ? `: ${r.text}` : ""}`);
  }

  return mapApiJobs(r.data.jobs);
}

async function fetchAllJobsMeta(): Promise<JobsMetaResponse> {
  const r = await apiJson<JobsMetaResponse>("/api/jobs/meta", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!r.ok || !r.data) {
    throw new Error(`HTTP ${r.status}${r.text ? `: ${r.text}` : ""}`);
  }

  return r.data;
}

async function refreshAllJobsCached(): Promise<JobListItem[]> {
  const r = await apiJson<{ jobs: ApiJob[]; count: number }>("/api/jobs/refresh", {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!r.ok || !r.data || !Array.isArray(r.data.jobs)) {
    throw new Error(`HTTP ${r.status}${r.text ? `: ${r.text}` : ""}`);
  }

  return mapApiJobs(r.data.jobs);
}

export default function useJobsAll() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestUpdatedAtRef = useRef<string>("");

  const loadFromCache = useCallback(async () => {
    const nextJobs = await fetchAllJobsCached();
    setJobs(nextJobs);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const runInitialLoad = async () => {
      setLoading(true);
      setError(null);

      try {
        const meta = await fetchAllJobsMeta();
        if (cancelled) return;

        latestUpdatedAtRef.current = meta.updatedAt || "";

        await loadFromCache();
        if (cancelled) return;

        if (meta.refreshError) {
          setError(meta.refreshError);
        }
      } catch (e: any) {
        if (!cancelled) {
          setJobs([]);
          setError(e?.message ? String(e.message) : "Failed to load jobs");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void runInitialLoad();

    return () => {
      cancelled = true;
    };
  }, [loadFromCache]);

  useEffect(() => {
    let cancelled = false;

    const pollMeta = async () => {
      try {
        const meta = await fetchAllJobsMeta();
        if (cancelled) return;

        const nextUpdatedAt = meta.updatedAt || "";
        const prevUpdatedAt = latestUpdatedAtRef.current;

        if (!prevUpdatedAt && nextUpdatedAt) {
          latestUpdatedAtRef.current = nextUpdatedAt;
          await loadFromCache();
          if (meta.refreshError) setError(meta.refreshError);
          return;
        }

        if (nextUpdatedAt && nextUpdatedAt !== prevUpdatedAt) {
          latestUpdatedAtRef.current = nextUpdatedAt;
          await loadFromCache();
        }

        if (meta.refreshError) {
          setError(meta.refreshError);
        } else {
          setError(null);
        }
      } catch {
        // polling failures should not clear current page state
      }
    };

    const timer = window.setInterval(() => {
      void pollMeta();
    }, META_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadFromCache]);

  const reload = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const nextJobs = await refreshAllJobsCached();
      setJobs(nextJobs);

      try {
        const meta = await fetchAllJobsMeta();
        latestUpdatedAtRef.current = meta.updatedAt || "";
      } catch {
        // ignore meta failure after successful refresh
      }
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Failed to refresh jobs");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  return useMemo(
    () => ({ jobs, loading, refreshing, reload, error }),
    [jobs, loading, refreshing, reload, error]
  );
}